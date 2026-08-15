import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { supabase } from '../src/config/supabase';

/**
 * Migration unique → modèle « groupes de famille ».
 *
 * Avant : liens pair-à-pair (family_members.owner_user_id → member_email),
 * données (meals / meal_plans / grocery_items) globales sans propriétaire.
 *
 * Après : entité families, profiles.family_id, colonne family_id sur les
 * 3 tables métier, family_members rattaché à une famille.
 *
 * Étapes :
 *  1. Création idempotente des tables/colonnes (nullable dans un 1er temps).
 *  2. Composantes connexes de l'ancien graphe pair-à-pair → 1 famille chacune.
 *  3. Backfill : les données existantes vont à la famille du profil le plus
 *     ancien (le « premier utilisateur »).
 *  4. Colonnes passées en NOT NULL + contraintes/index.
 *
 * À exécuter UNE fois :  npx tsx scripts/migrate-families.ts
 * puis :                 npx prisma db push && npx prisma generate
 */

const prisma = new PrismaClient();

// ── Étape 1 : structures (idempotent) ────────────────────────

async function ensureStructure() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS families (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // profiles.family_id (nullable pour l'instant)
  await addColumn('profiles', 'family_id', 'text');
  // Colonnes métier
  await addColumn('meals', 'family_id', 'text');
  await addColumn('meal_plans', 'family_id', 'text');
  await addColumn('grocery_items', 'family_id', 'text');
  // Nouvelles colonnes de family_members
  await addColumn('family_members', 'family_id', 'text');
  await addColumn('family_members', 'invited_by_id', 'text');
}

async function addColumn(table: string, column: string, type: string) {
  const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT 1 AS ok FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`  + ${table}.${column}`);
  }
}

// ── Étape 2 : liens pair-à-pair → familles ───────────────────

interface OldLink {
  id: string;
  ownerUserId: string;
  memberEmail: string;
  memberUserId: string | null;
  status: string;
}

/** Union-find minimal (clés = userId ou email selon ce qui est connu). */
class UnionFind {
  private parent = new Map<string, string>();
  find(k: string): string {
    if (!this.parent.has(k)) this.parent.set(k, k);
    let root = k;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Compression de chemin.
    let cur = k;
    while (this.parent.get(cur) !== cur) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

async function migrateLinks() {
  const links: OldLink[] = await prisma.$queryRawUnsafe(`
    SELECT id, owner_user_id AS "ownerUserId", member_email AS "memberEmail",
           member_user_id AS "memberUserId", status
    FROM family_members
    WHERE family_id IS NULL
  `);
  if (links.length === 0) {
    console.log('  (aucun lien pair-à-pair à migrer)');
    return;
  }

  // Un noeud par utilisateur connu ; les emails servent de pont quand le
  // membre n'a pas encore de compte.
  const uf = new UnionFind();
  for (const l of links) {
    uf.union(`user:${l.ownerUserId}`, l.memberUserId ? `user:${l.memberUserId}` : `email:${l.memberEmail}`);
  }

  // Regroupe les liens par composante connexe.
  const byRoot = new Map<string, OldLink[]>();
  for (const l of links) {
    const root = uf.find(`user:${l.ownerUserId}`);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root)!.push(l);
  }

  for (const [, groupLinks] of byRoot) {
    // Crée la famille et rattache chaque lien.
    const familyId = await createFamily();
    const members = new Set<string>([groupLinks[0].ownerUserId]);

    for (const l of groupLinks) {
      await prisma.$executeRawUnsafe(
        `UPDATE family_members
         SET family_id = $1, invited_by_id = $2
         WHERE id = $3`,
        familyId, l.ownerUserId, l.id,
      );
      if (l.memberUserId) members.add(l.memberUserId);
    }

    // Positionne profiles.family_id pour tous les membres connus du groupe.
    for (const userId of members) {
      await prisma.$executeRawUnsafe(
        `UPDATE profiles SET family_id = $1 WHERE user_id = $2 AND family_id IS NULL`,
        familyId, userId,
      );
    }

    // Les membres qui n'apparaissent qu'en tant qu'inviteur (aucune ligne
    // « invité ») reçoivent une ligne d'adhésion, sinon ils seraient
    // invisibles dans la liste de famille des autres membres.
    const invitedUserIds = new Set(
      groupLinks.filter((l) => l.memberUserId).map((l) => l.memberUserId as string),
    );
    for (const userId of members) {
      if (invitedUserIds.has(userId)) continue;
      const email = await findEmailById(userId);
      await prisma.$executeRawUnsafe(
        `INSERT INTO family_members (family_id, invited_by_id, member_email, member_user_id, status)
         VALUES ($1, $2, $3, $4, 'accepted')`,
        familyId, userId, email ?? '', userId,
      );
    }

    console.log(`  + famille ${familyId} (${members.size} membre(s) connus, ${groupLinks.length} lien(s))`);
  }
}

/** Courriel Supabase d'un utilisateur (null si introuvable). */
async function findEmailById(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email?.toLowerCase() ?? null;
}

async function createFamily(): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO families DEFAULT VALUES RETURNING id`,
  );
  return rows[0].id;
}

// ── Étape 3 : backfill des données métier ────────────────────

async function backfillBusinessData() {
  // Famille cible = celle du profil le plus ancien (le premier utilisateur),
  // sinon la première famille existante, sinon une nouvelle famille.
  let target = (
    await prisma.$queryRawUnsafe<{ family_id: string | null }[]>(
      `SELECT family_id FROM profiles WHERE family_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`,
    )
  )[0]?.family_id ?? null;
  if (!target) {
    target = (
      await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM families ORDER BY created_at ASC LIMIT 1`)
    )[0]?.id ?? null;
  }
  if (!target) {
    target = await createFamily();
    console.log('  + famille par défaut créée (aucun profil existant)');
  }

  for (const table of ['meals', 'meal_plans', 'grocery_items']) {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE ${table} SET family_id = $1 WHERE family_id IS NULL`,
      target,
    );
    console.log(`  + ${table}: ${res} ligne(s) → famille ${target}`);
  }
}

// ── Étape 4 : contraintes ────────────────────────────────────

async function ensureConstraints() {
  // FK profiles → families
  await addFk('profiles', 'family_id', 'families(id)', 'ON DELETE SET NULL');
  // family_members : FKs + not null sur les nouvelles colonnes
  await addFk('family_members', 'family_id', 'families(id)', 'ON DELETE CASCADE');
  await addFk('family_members', 'invited_by_id', 'profiles(user_id)', 'ON DELETE CASCADE');
  await prisma.$executeRawUnsafe(`ALTER TABLE family_members ALTER COLUMN family_id SET NOT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE family_members ALTER COLUMN invited_by_id SET NOT NULL`);
  await createUniqueIfMissing('family_members', 'family_members_family_id_member_email_key', '(family_id, member_email)');

  // Tables métier : NOT NULL + FK + index (pas de cascade : une famille ne
  // devrait pas disparaître avec des données — au pire SET NULL + famille
  // orpheline à nettoyer manuellement).
  for (const table of ['meals', 'meal_plans', 'grocery_items']) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN family_id SET NOT NULL`);
    await addFk(table, 'family_id', 'families(id)', 'ON DELETE RESTRICT');
    await createIndexIfMissing(table, `${table}_family_id_idx`, 'family_id');
  }
}

async function addFk(table: string, column: string, ref: string, onDelete: string) {
  const name = `${table}_${column}_fkey_tmp`;
  const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT 1 AS ok FROM information_schema.table_constraints
    WHERE table_name = ${table} AND constraint_type = 'FOREIGN KEY'
      AND constraint_name IN (${`${table}_${column}_fkey`}, ${name})
  `;
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${ref} ${onDelete}`,
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} RENAME CONSTRAINT ${name} TO ${table}_${column}_fkey`);
    console.log(`  + FK ${table}.${column} → ${ref}`);
  }
}

async function createUniqueIfMissing(table: string, name: string, cols: string) {
  const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT 1 AS ok FROM pg_indexes WHERE indexname = ${name}
  `;
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE ${cols}`);
    console.log(`  + UNIQUE ${table}${cols}`);
  }
}

async function createIndexIfMissing(table: string, name: string, col: string) {
  const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT 1 AS ok FROM pg_indexes WHERE indexname = ${name}
  `;
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE INDEX ${name} ON ${table} (${col})`);
    console.log(`  + INDEX ${name}`);
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('Migration → familles…');
  await ensureStructure();
  await migrateLinks();
  await backfillBusinessData();
  await ensureConstraints();
  console.log('✅ Migration terminée.');
  console.log('Prochaine étape : npx prisma db push && npx prisma generate');
}

main()
  .catch((e) => {
    console.error('❌ Migration échouée :', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
