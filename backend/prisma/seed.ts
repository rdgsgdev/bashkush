import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Rayons par défaut (ordre d'affichage en magasin) ─────────
const DEFAULT_AISLES = [
  { name: 'fruits_legumes', label: 'Fruits & légumes', sortOrder: 0 },
  { name: 'proteines', label: 'Protéines', sortOrder: 1 },
  { name: 'feculents', label: 'Féculents', sortOrder: 2 },
  { name: 'cremerie', label: 'Crèmerie', sortOrder: 3 },
  { name: 'epicerie_seche', label: 'Épicerie sèche', sortOrder: 4 },
  { name: 'conserves', label: 'Conserves', sortOrder: 5 },
  { name: 'surgelas', label: 'Surgelés', sortOrder: 6 },
  { name: 'boissons', label: 'Boissons', sortOrder: 7 },
  { name: 'epices_condiments', label: 'Épices & condiments', sortOrder: 8 },
];

// ── Plats d'exemple ──────────────────────────────────────────

const bolMediterraneen = {
  id: 'bol-mediterraneen-polenta-sardines',
  name: 'Bol méditerranéen polenta, sardines et légumes rôtis',
  description:
    "Bol complet et protéiné avec polenta crémeuse, sardines à l'huile, tomates séchées, hummus et légumes méditerranéens rôtis au four.",
  servings: 2,
  prepTime: 20,
  cookTime: 30,
  totalTime: 50,
  difficulty: 'facile',
  category: 'soir',
  isFavorite: true,
  nutrition: { calories: 520, protein: 28, carbs: 48, fat: 24, fiber: 9 },
  notes: "Les légumes peuvent être rôtis à l'avance et conservés 2-3 jours au frigo. La polenta se réchauffe bien avec un peu d'eau ou de lait. Les sardines apportent des omega-3 excellents pour la récupération.",
  ingredients: [
    { id: 'polenta', name: 'Polenta (semoule de maïs)', quantity: 100, unit: 'g', aisle: 'feculents', notes: 'polenta précuite' },
    { id: 'eau', name: 'Eau ou bouillon', quantity: 500, unit: 'ml', aisle: 'boissons', notes: 'pour la cuisson' },
    { id: 'sardines', name: "Sardines à l'huile d'olive", quantity: 240, unit: 'g', aisle: 'conserves', notes: '2 boîtes de 120g' },
    { id: 'tomates_sechees', name: 'Tomates séchées à l\'huile', quantity: 30, unit: 'g', aisle: 'conserves', notes: 'coupées en lanières' },
    { id: 'hummus', name: 'Hummus', quantity: 120, unit: 'g', aisle: 'cremerie', notes: '60g par portion' },
    { id: 'courgettes', name: 'Courgettes', quantity: 120, unit: 'g', aisle: 'fruits_legumes', notes: 'en demi-rondelles' },
    { id: 'poivrons', name: 'Poivrons rouges', quantity: 120, unit: 'g', aisle: 'fruits_legumes', notes: 'en dés' },
    { id: 'aubergines', name: 'Aubergines', quantity: 120, unit: 'g', aisle: 'fruits_legumes', notes: 'en dés' },
    { id: 'oignons_rouges', name: 'Oignons rouges', quantity: 60, unit: 'g', aisle: 'fruits_legumes', notes: 'émincé' },
    { id: 'olives_noires', name: 'Olives noires', quantity: 20, unit: 'g', aisle: 'conserves', notes: '10-12 olives' },
    { id: 'concombre', name: 'Concombre', quantity: 80, unit: 'g', aisle: 'fruits_legumes', notes: 'en dés' },
    { id: 'ail', name: 'Ail frais', quantity: 2, unit: 'gousses', aisle: 'fruits_legumes', notes: 'haché' },
    { id: 'basilic', name: 'Basilic frais', quantity: 5, unit: 'g', aisle: 'fruits_legumes', notes: 'quelques feuilles' },
    { id: 'menthe', name: 'Menthe fraîche', quantity: 3, unit: 'g', aisle: 'fruits_legumes', optional: true, notes: 'quelques feuilles' },
    { id: 'origan', name: 'Origan', quantity: 0.5, unit: 'c. à café', aisle: 'epices_condiments', notes: 'séché ou frais' },
    { id: 'huile_olive', name: "Huile d'olive", quantity: 1.5, unit: 'c. à soupe', aisle: 'epicerie_seche', notes: "cuisson et assaisonnement" },
    { id: 'citron', name: 'Citron', quantity: 0.5, unit: 'pièce', aisle: 'fruits_legumes', notes: 'jus et zestes' },
    { id: 'sel', name: 'Sel', quantity: 0.5, unit: 'c. à café', aisle: 'epices_condiments' },
    { id: 'poivre', name: 'Poivre', quantity: 0.25, unit: 'c. à café', aisle: 'epices_condiments', notes: 'moulu' },
    { id: 'parmesan', name: 'Parmesan râpé', quantity: 20, unit: 'g', aisle: 'cremerie', optional: true, notes: 'pour la polenta' },
  ],
  steps: [
    { stepNumber: 1, instruction: 'Préchauffe le four à 220°C (425°F).', time: 5, ingredients: [] },
    { stepNumber: 2, instruction: 'Coupe les courgettes, poivrons, aubergines et oignons rouges en dés de 2-3 cm.', time: 10, ingredients: ['courgettes', 'poivrons', 'aubergines', 'oignons_rouges'] },
    { stepNumber: 3, instruction: "Dans un saladier, mélange les légumes avec 1 c. à soupe d'huile d'olive, sel, poivre, ail haché et origan.", time: 3, ingredients: ['courgettes', 'poivrons', 'aubergines', 'oignons_rouges', 'huile_olive', 'ail', 'sel', 'poivre', 'origan'] },
    { stepNumber: 4, instruction: 'Étale les légumes sur une plaque en une seule couche. Enfourne 25-30 min en remuant à mi-cuisson.', time: 30, ingredients: ['courgettes', 'poivrons', 'aubergines', 'oignons_rouges'] },
    { stepNumber: 5, instruction: "Porte l'eau à ébullition avec le sel. Verse la polenta en pluie tout en fouettant.", time: 5, ingredients: ['eau', 'polenta', 'sel'] },
    { stepNumber: 6, instruction: "Cuis la polenta à feu doux 15-20 min en remuant jusqu'à ce qu'elle se détache des bords.", time: 20, ingredients: ['polenta', 'eau'] },
    { stepNumber: 7, instruction: "Hors du feu, ajoute le parmesan (optionnel) et 1 c. à soupe d'huile des sardines. Mélange.", time: 2, ingredients: ['parmesan', 'sardines', 'huile_olive'] },
    { stepNumber: 8, instruction: 'Coupe les tomates séchées en lanières et le concombre en dés.', time: 3, ingredients: ['tomates_sechees', 'concombre'] },
    { stepNumber: 9, instruction: 'Cisèle le basilic et la menthe.', time: 2, ingredients: ['basilic', 'menthe'] },
    { stepNumber: 10, instruction: 'Assemble les bols : polenta crémeuse, sardines, tomates séchées, hummus, légumes rôtis, concombre, olives.', time: 5, ingredients: ['polenta', 'sardines', 'tomates_sechees', 'hummus', 'courgettes', 'poivrons', 'aubergines', 'oignons_rouges', 'concombre', 'olives_noires'] },
    { stepNumber: 11, instruction: "Parseme de basilic, menthe, un filet d'huile d'olive et un peu de jus de citron. Sers immédiatement.", time: 2, ingredients: ['basilic', 'menthe', 'huile_olive', 'citron'] },
  ],
};

const porridgeAmande = {
  id: 'porridge-avoine-amande-banane',
  name: 'Porridge avoine, amande & banane',
  description: 'Porridge crémeux aux flocons d’avoine, lait d’amande, banane et garnitures croquantes.',
  servings: 1,
  prepTime: 5,
  cookTime: 8,
  totalTime: 13,
  difficulty: 'facile',
  category: 'midi',
  isFavorite: false,
  nutrition: { calories: 420, protein: 14, carbs: 62, fat: 13, fiber: 8 },
  ingredients: [
    { id: 'avoine', name: "Flocons d'avoine", quantity: 50, unit: 'g', aisle: 'epicerie_seche' },
    { id: 'lait_amande', name: "Lait d'amande", quantity: 250, unit: 'ml', aisle: 'boissons' },
    { id: 'banane', name: 'Banane', quantity: 1, unit: 'pièce', aisle: 'fruits_legumes' },
    { id: 'amandes', name: 'Amandes effilées', quantity: 15, unit: 'g', aisle: 'epicerie_seche' },
    { id: 'miel', name: 'Miel', quantity: 1, unit: 'c. à soupe', aisle: 'epicerie_seche', optional: true },
    { id: 'cannelle', name: 'Cannelle', quantity: 0.5, unit: 'c. à café', aisle: 'epices_condiments' },
  ],
  steps: [
    { stepNumber: 1, instruction: "Dans une casserole, porte le lait d'amande à ébullition.", time: 3, ingredients: ['lait_amande'] },
    { stepNumber: 2, instruction: "Ajoute les flocons d'avoine et la cannelle. Cuis à feu doux 5 min en remuant.", time: 5, ingredients: ['avoine', 'cannelle'] },
    { stepNumber: 3, instruction: 'Hors du feu, écrase la moitié de la banane à la fourchette et mélange.', time: 2, ingredients: ['banane'] },
    { stepNumber: 4, instruction: 'Sers dans un bol, garnis du reste de banane, des amandes et d’un filet de miel.', time: 1, ingredients: ['banane', 'amandes', 'miel'] },
  ],
};

const saladeQuinoa = {
  id: 'salade-quinoa-feta-agrumes',
  name: 'Salade de quinoa, feta & agrumes',
  description: 'Salade fraîche et complète au quinoa, feta, orange, avocat et vinaigrette citronnée.',
  servings: 2,
  prepTime: 15,
  cookTime: 15,
  totalTime: 30,
  difficulty: 'facile',
  category: 'midi',
  isFavorite: false,
  nutrition: { calories: 480, protein: 16, carbs: 52, fat: 22, fiber: 9 },
  ingredients: [
    { id: 'quinoa', name: 'Quinoa', quantity: 150, unit: 'g', aisle: 'epicerie_seche' },
    { id: 'feta', name: 'Feta', quantity: 100, unit: 'g', aisle: 'cremerie' },
    { id: 'orange', name: 'Orange', quantity: 1, unit: 'pièce', aisle: 'fruits_legumes' },
    { id: 'avocat', name: 'Avocat', quantity: 1, unit: 'pièce', aisle: 'fruits_legumes' },
    { id: 'roquette', name: 'Roquette', quantity: 60, unit: 'g', aisle: 'fruits_legumes' },
    { id: 'noisettes', name: 'Noisettes', quantity: 30, unit: 'g', aisle: 'epicerie_seche', optional: true },
    { id: 'citron_vert', name: 'Citron vert', quantity: 0.5, unit: 'pièce', aisle: 'fruits_legumes' },
    { id: 'huile', name: "Huile d'olive", quantity: 2, unit: 'c. à soupe', aisle: 'epicerie_seche' },
    { id: 'sel2', name: 'Sel', quantity: 0.25, unit: 'c. à café', aisle: 'epices_condiments' },
  ],
  steps: [
    { stepNumber: 1, instruction: 'Rince le quinoa et cuis-le 15 min dans l’eau salée. Égoutte et laisse tiédir.', time: 15, ingredients: ['quinoa', 'sel2'] },
    { stepNumber: 2, instruction: 'Pèle l’orange à vif et prélève les suprêmes. Coupe l’avocat en dés.', time: 5, ingredients: ['orange', 'avocat'] },
    { stepNumber: 3, instruction: 'Concasse les noisettes et les torréfier 2 min à la poêle.', time: 2, ingredients: ['noisettes'] },
    { stepNumber: 4, instruction: 'Prépare la vinaigrette : jus de citron vert, huile d’olive, sel.', time: 2, ingredients: ['citron_vert', 'huile', 'sel2'] },
    { stepNumber: 5, instruction: 'Mélange le quinoa, la roquette, les suprêmes, l’avocat et la feta émiettée. Assaisonne et parsème de noisettes.', time: 3, ingredients: ['quinoa', 'roquette', 'orange', 'avocat', 'feta', 'noisettes'] },
  ],
};

const SEED_MEALS = [bolMediterraneen, porridgeAmande, saladeQuinoa];

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Début du seed Bashkush…');

  // Rayons
  for (const a of DEFAULT_AISLES) {
    await prisma.groceryAisle.upsert({
      where: { name: a.name },
      update: { label: a.label, sortOrder: a.sortOrder, isDefault: true },
      create: { ...a, isDefault: true },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${DEFAULT_AISLES.length} rayons`);

  // Plats
  for (const meal of SEED_MEALS) {
    const { ingredients, steps, ...mealData } = meal as any;
    await prisma.meal.upsert({
      where: { id: mealData.id },
      update: {},
      create: {
        ...mealData,
        ingredients: { create: ingredients.map((i: any) => ({ ...i, optional: i.optional ?? false })) },
        steps: { create: steps.map((s: any) => ({ ...s, ingredients: s.ingredients ?? [] })) },
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${SEED_MEALS.length} plats`);
  // eslint-disable-next-line no-console
  console.log('✅ Seed terminé.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
