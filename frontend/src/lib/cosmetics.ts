// ─────────────────────────────────────────────────────────────
// Base locale des ingrédients cosmétiques INCI (données ouvertes).
//
// Sources : portail CosIng de la Commission européenne (statut
// réglementaire UE 1223/2009, restrictions), avis ANSES et ECHA,
// évaluations du CIR (Cosmetic Ingredient Review) et publications
// du CIRC. Consultées en août 2026.
//
// Couverture : ~130 ingrédients INCI courants + motifs génériques
// (PEG-x, *-paraben, *-EDTA, benzophénone-x, siloxanes). Un INCI
// absent de la base est considéré sans signalement connu (pas de
// pénalité) — l'inverse serait injuste : la plupart des INCI sont
// bénins et inconnus ≠ controversé.
//
// Classification en 3 niveaux comme les additifs :
// - sans risque : sûr en usage cosmétique topique ;
// - risque limité : irritant possible, allergène à déclaration
//   obligatoire (UE), ou suspicion débattue ;
// - à risque : restrictions UE, perturbation endocrinienne
//   documentée, libérateur de formaldéhyde, colorant goudron…
//
// Les allergènes à déclaration obligatoire portent le drapeau
// `allergen` (critère « Allergènes » de l'analyse).
// ─────────────────────────────────────────────────────────────

import type { AdditiveRisk } from './additives';

export type CosmeticRisk = AdditiveRisk;

/** Fiche complète d'un ingrédient INCI (forme alignée sur AdditiveInfo
    pour mutualiser l'UI : badges, groupes de risque, fiche détail). */
export interface CosmeticIngredientInfo {
  /** Slug INCI normalisé (« phenoxyethanol »). */
  code: string;
  /** Nom INCI usuel (+ nom FR courant). */
  name: string;
  /** Fonction principale (conservateur, tensioactif…). */
  func: string;
  risk: CosmeticRisk;
  description: string;
  /** Risques potentiels associés (points listés dans le détail). */
  risks: string[];
  /** Allergène parfum à déclaration obligatoire (UE). */
  allergen?: boolean;
}

type IngredientEntry = Omit<CosmeticIngredientInfo, 'code'>;

const INGREDIENT_LIST: CosmeticIngredientInfo[] = [
  // ── Conservateurs ──────────────────────────────────────────
  { code: 'phenoxyethanol', name: 'Phenoxyethanol', func: 'Conservateur', risk: 'risque_limite', allergen: false, description: 'Conservateur très répandu. L’ANSES recommande de ne pas l’appliquer sur la zone du couches des nourrissons de moins de 3 ans.', risks: ['Déconseillé sur le siège des nourrissons < 3 ans (ANSES)', 'Irritation possible chez les personnes sensibles'] },
  { code: 'methylisothiazolinone', name: 'Methylisothiazolinone (MIT)', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur puissant responsable d’épidémies d’eczéma de contact ; interdit dans les produits sans rinçage dans l’UE depuis 2017.', risks: ['Allergisant cutané fort (eczéma de contact)', 'Interdit sans rinçage dans l’UE'] },
  { code: 'methylchloroisothiazolinone', name: 'Methylchloroisothiazolinone (CMIT)', func: 'Conservateur', risk: 'a_risque', description: 'Associé à la MIT (mélange « Kathon CG ») : même profil d’allergisant cutané, réservé aux produits rincés.', risks: ['Allergisant cutané fort', 'Réservé aux produits rincés dans l’UE'] },
  { code: 'dmdm-hydantoin', name: 'DMDM hydantoin', func: 'Conservateur', risk: 'a_risque', description: 'Libère du formaldéhyde pour conserver le produit ; les libérateurs de formaldéhyde sont pointés par le CIRC.', risks: ['Libère du formaldéhyde (CIRC groupe 1)', 'Allergisant cutané'] },
  { code: 'imidazolidinyl-urea', name: 'Imidazolidinyl urea', func: 'Conservateur', risk: 'a_risque', description: 'Libérateur de formaldéhyde de seconde génération, présent dans de nombreux soins.', risks: ['Libère du formaldéhyde', 'Allergisant cutané possible'] },
  { code: 'diazolidinyl-urea', name: 'Diazolidinyl urea', func: 'Conservateur', risk: 'a_risque', description: 'Libérateur de formaldéhyde, fréquent dans les gels et sérums.', risks: ['Libère du formaldéhyde', 'Allergisant cutané possible'] },
  { code: 'quaternium-15', name: 'Quaternium-15', func: 'Conservateur', risk: 'a_risque', description: 'Libérateur de formaldéhyde retiré de la liste européenne des conservateurs en 2022.', risks: ['Libère du formaldéhyde', 'Retiré de la liste UE'] },
  { code: 'formaldehyde', name: 'Formaldéhyde', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur historique classé cancérogène certain par le CIRC ; interdit dans les cosmétiques UE (traces tolérées dans quelques durcisseurs d’ongles).', risks: ['Cancérogène (CIRC groupe 1)', 'Interdit dans les cosmétiques UE'] },
  { code: '2-bromo-2-nitropropane-1-3-diol', name: 'Bronopol (2-bromo-2-nitropropane-1,3-diol)', func: 'Conservateur', risk: 'a_risque', description: 'Libérateur de formaldéhyde pouvant en outre former des nitrosamines avec certains ingrédients aminés.', risks: ['Libère du formaldéhyde', 'Formation possible de nitrosamines'] },
  { code: 'sodium-hydroxymethylglycinate', name: 'Sodium hydroxymethylglycinate', func: 'Conservateur', risk: 'risque_limite', description: 'Libérateur discret de formaldéhyde, souvent présenté à tort comme « doux ».', risks: ['Libère de faibles quantités de formaldéhyde'] },
  { code: 'chlorphenesin', name: 'Chlorphenesin', func: 'Conservateur', risk: 'risque_limite', description: 'Conservateur autorisé à faible dose (0,3 %) dans l’UE.', risks: ['Concentration limitée par la réglementation UE'] },
  { code: 'sodium-benzoate', name: 'Benzoate de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Conservateur classique également utilisé en alimentaire, bien toléré en application cutanée.', risks: [] },
  { code: 'potassium-sorbate', name: 'Sorbate de potassium', func: 'Conservateur', risk: 'sans_risque', description: 'Conservateur doux issu de l’acide sorbique (baies de sorbier).', risks: [] },
  { code: 'dehydroacetic-acid', name: 'Acide déhydroacétique', func: 'Conservateur', risk: 'sans_risque', description: 'Conservateur autorisé en bio, souvent associé au benzoate de sodium.', risks: [] },
  { code: 'benzyl-alcohol', name: 'Alcool benzylique', func: 'Conservateur', risk: 'risque_limite', allergen: true, description: 'Conservateur et solvant naturel ; allergène parfum à déclaration obligatoire dans l’UE au-delà de 0,001 % (sans rinçage).', risks: ['Allergène à déclaration obligatoire (UE)'] },

  // ── Parabens (motif général : *-paraben) ───────────────────
  { code: 'methylparaben', name: 'Methylparaben', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben court encore autorisé dans l’UE (0,4 %) ; soupçons d’activité œstrogénique à forte dose.', risks: ['Suspicions de perturbation endocrinienne (débattues)'] },
  { code: 'ethylparaben', name: 'Ethylparaben', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben court autorisé, mêmes réserves que le methylparaben.', risks: ['Suspicions de perturbation endocrinienne (débattues)'] },
  { code: 'propylparaben', name: 'Propylparaben', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben long : concentration limitée à 0,14 % dans l’UE après avis sur les effets hormonaux.', risks: ['Effets hormonaux suspectés (SCCS)', 'Concentration limitée dans l’UE'] },
  { code: 'butylparaben', name: 'Butylparaben', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben long soumis à la même restriction UE que le propylparaben.', risks: ['Effets hormonaux suspectés (SCCS)', 'Concentration limitée dans l’UE'] },
  { code: 'isobutylparaben', name: 'Isobutylparaben', func: 'Conservateur', risk: 'a_risque', description: 'Paraben interdit dans l’UE depuis 2014 (avec 4 autres parabens longs) en raison d’effets hormonaux suspectés.', risks: ['Interdit dans l’UE (2014)', 'Effets endocriniens suspectés'] },

  // ── Tensioactifs ───────────────────────────────────────────
  { code: 'sodium-lauryl-sulfate', name: 'Sodium Lauryl Sulfate (SLS)', func: 'Tensioactif', risk: 'risque_limite', description: 'Tensioactif très lavant des shampoings et dentifrices ; irritant reconnu, surtout à forte concentration.', risks: ['Irritant cutané et oculaire', 'Altère le film hydrolipidique'] },
  { code: 'sodium-laureth-sulfate', name: 'Sodium Laureth Sulfate (SLES)', func: 'Tensioactif', risk: 'risque_limite', description: 'Version éthoxylée du SLS, mieux tolérée mais issue de la pétrochimie avec traces possibles de 1,4-dioxane.', risks: ['Traces possibles de 1,4-dioxane (éthoxylation)', 'Irritation modérée'] },
  { code: 'ammonium-lauryl-sulfate', name: 'Ammonium Lauryl Sulfate', func: 'Tensioactif', risk: 'risque_limite', description: 'Tensioactif moussant des shampoings économiques, irritant comme le SLS.', risks: ['Irritant cutané'] },
  { code: 'cocamide-dea', name: 'Cocamide DEA', func: 'Épaississant moussant', risk: 'risque_limite', description: 'Épaississant mousse dérivé de la noix de coco ; les diéthanolamines peuvent former des nitrosamines avec certains conservateurs.', risks: ['Formation possible de nitrosamines', 'Irritation possible'] },
  { code: 'cocamide-mea', name: 'Cocamide MEA', func: 'Épaississant moussant', risk: 'sans_risque', description: 'Épaississant mousse dérivé de la noix de coco, mieux noté que la version DEA.', risks: [] },
  { code: 'coco-glucoside', name: 'Coco Glucoside', func: 'Tensioactif doux', risk: 'sans_risque', description: 'Tensioactif non ionique doux issu du coco et du glucose, compatible peaux sensibles.', risks: [] },
  { code: 'decyl-glucoside', name: 'Decyl Glucoside', func: 'Tensioactif doux', risk: 'sans_risque', description: 'Tensioactif doux végétal très bien toléré (bébés, peaux réactives).', risks: [] },
  { code: 'lauryl-glucoside', name: 'Lauryl Glucoside', func: 'Tensioactif doux', risk: 'sans_risque', description: 'Tensioactif doux végétal, très utilisé dans les nettoyants pour peaux sensibles.', risks: [] },
  { code: 'sodium-cocoyl-isethionate', name: 'Sodium Cocoyl Isethionate', func: 'Tensioactif doux', risk: 'sans_risque', description: 'Tensioactif doux (« savon sans savon ») des barres nettoyantes.', risks: [] },
  { code: 'cocamidopropyl-betaine', name: 'Cocamidopropyl Betaine', func: 'Co-tensioactif', risk: 'risque_limite', description: 'Co-tensioactif amphotère très répandu ; quelques allergies de contact rapportées (impuretés de fabrication).', risks: ['Allergies de contact rapportées (impuretés)'] },
  { code: 'sodium-cocoyl-glutamate', name: 'Sodium Cocoyl Glutamate', func: 'Tensioactif doux', risk: 'sans_risque', description: 'Tensioactif doux à base d’acides aminés.', risks: [] },

  // ── Antimicrobiens controversés ────────────────────────────
  { code: 'triclosan', name: 'Triclosan', func: 'Antibactérien', risk: 'a_risque', description: 'Antibactérien restreint dans l’UE (dentifrices, savons) : perturbation endocrinienne suspectée et contribution à la résistance aux antibiotiques.', risks: ['Perturbation endocrinienne suspectée', 'Contribution à la résistance bactérienne', 'Usage très restreint dans l’UE'] },
  { code: 'triclocarban', name: 'Triclocarban', func: 'Antibactérien', risk: 'a_risque', description: 'Antibactérien des savons, même famille de préoccupations que le triclosan.', risks: ['Perturbation endocrinienne suspectée', 'Usage très restreint dans l’UE'] },

  // ── Filtres UV ─────────────────────────────────────────────
  { code: 'oxybenzone', name: 'Oxybenzone (Benzophenone-3)', func: 'Filtre UV', risk: 'a_risque', description: 'Filtre UV organique suspecté de perturbation endocrinienne ; interdit dans plusieurs zones marines (Hawaï, Palau) et limité dans l’UE.', risks: ['Perturbation endocrinienne suspectée', 'Toxique pour les coraux (interdictions locales)', 'Concentration limitée dans l’UE'] },
  { code: 'octinoxate', name: 'Octinoxate (Ethylhexyl Methoxycinnamate)', func: 'Filtre UV', risk: 'a_risque', description: 'Filtre UV très courant suspecté de perturbation endocrinienne et de toxicité corallienne.', risks: ['Perturbation endocrinienne suspectée', 'Toxique pour les coraux (interdictions locales)'] },
  { code: 'homosalate', name: 'Homosalate', func: 'Filtre UV', risk: 'a_risque', description: 'Filtre UV dont la concentration maximale a été ramenée à 0,5 % dans l’UE en 2022 (préoccupations endocriniennes).', risks: ['Perturbation endocrinienne suspectée', 'Concentration abaissée dans l’UE (2022)'] },
  { code: 'octocrylene', name: 'Octocrylene', func: 'Filtre UV', risk: 'risque_limite', description: 'Filtre UV photostable ; augmentation des allergies de contact signalée et dégradation possible en benzophénone.', risks: ['Allergies de contact en augmentation', 'Peut se dégrader en benzophénone'] },
  { code: 'avobenzone', name: 'Avobenzone (Butyl Methoxydibenzoylmethane)', func: 'Filtre UV', risk: 'risque_limite', description: 'Filtre UVA large spectre ; instable à la lumière (stabilisé par l’octocrylene), quelques allergies rapportées.', risks: ['Instabilité photochimique', 'Allergies rares rapportées'] },
  { code: '4-methylbenzylidene-camphor', name: 'Enzacamene (4-MBC)', func: 'Filtre UV', risk: 'a_risque', description: 'Filtre UV à préoccupations thyroïdiennes ; non approuvé aux États-Unis, en réévaluation européenne.', risks: ['Perturbation thyroïdienne suspectée', 'Non approuvé aux États-Unis'] },
  { code: 'titanium-dioxide', name: 'Dioxyde de titane (CI 77891)', func: 'Filtre UV / Pigment', risk: 'sans_risque', description: 'Filtre minéral (physique) sûr en application cutanée ; la préoccupation d’inhalation ne concerne que les poudres et sprays.', risks: [] },
  { code: 'zinc-oxide', name: 'Oxyde de zinc', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre minéral bien toléré (crèmes solaires enfant, écrans totaux).', risks: [] },
  { code: 'methylene-bis-benzotriazolyl-tetramethylbutylphenol', name: 'Bisoctrizole (Tinosorb M)', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre UV moderne hybride, photostable et bien évalué.', risks: [] },
  { code: 'diethylamino-hydroxybenzoyl-hexyl-benzoate', name: 'DHHB (Uvinul A Plus)', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre UVA photostable de nouvelle génération.', risks: [] },
  { code: 'ethylhexyl-triazone', name: 'Ethylhexyl Triazone', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre UVB photostable de nouvelle génération.', risks: [] },
  { code: 'phenylbenzimidazole-sulfonic-acid', name: 'Ensulizole (PBSA)', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre UVB hydrosoluble des textures légères.', risks: [] },
  { code: 'butyl-methoxydibenzoylmethane', name: 'Butyl Methoxydibenzoylmethane', func: 'Filtre UV', risk: 'risque_limite', description: 'Nom INCI exact de l’avobenzone (filtre UVA) ; instable à la lumière.', risks: ['Instabilité photochimique', 'Allergies rares rapportées'] },
  { code: 'bis-ethylhexyloxyphenol-methoxyphenyl-triazine', name: 'Bemotrizinol (Tinosorb S)', func: 'Filtre UV', risk: 'sans_risque', description: 'Filtre UV large spectre photostable, très bien évalué.', risks: [] },

  // ── Siloxanes et silicones ─────────────────────────────────
  { code: 'cyclotetrasiloxane', name: 'Cyclotetrasiloxane (D4)', func: 'Silicone volatil', risk: 'a_risque', description: 'Silicone cyclique restreint dans l’UE : toxicité pour la reproduction et persistance environnementale.', risks: ['Toxicité pour la reproduction (études animales)', 'Persistance environnementale', 'Restrictions UE'] },
  { code: 'cyclopentasiloxane', name: 'Cyclopentasiloxane (D5)', func: 'Silicone volatil', risk: 'a_risque', description: 'Silicone cyclique très répandu (soins capillaires) : restrictions UE pour la bioaccumulation et préoccupations environnementales.', risks: ['Bioaccumulation suspectée', 'Restrictions UE (produits rincés)'] },
  { code: 'cyclohexasiloxane', name: 'Cyclohexasiloxane (D6)', func: 'Silicone volatil', risk: 'a_risque', description: 'Silicone cyclique de la même famille que D4/D5, en cours de restriction européenne.', risks: ['Persistance environnementale', 'Restrictions UE en cours'] },
  { code: 'dimethicone', name: 'Dimethicone', func: 'Silicone', risk: 'sans_risque', description: 'Silicone linéaire inerte : film protecteur non comédogène, non absorbé par la peau.', risks: [] },
  { code: 'dimethiconol', name: 'Dimethiconol', func: 'Silicone', risk: 'sans_risque', description: 'Silicone linéaire épaississant (soins capillaires).', risks: [] },
  { code: 'silica-dimethyl-silylate', name: 'Silica dimethyl silylate', func: 'Silicone / Texture', risk: 'sans_risque', description: 'Silice modifiée, agent de texture inerte.', risks: [] },
  { code: 'amodimethicone', name: 'Amodimethicone', func: 'Silicone capillaire', risk: 'sans_risque', description: 'Silicone conditionneur des shampoings/soins, non accumulatif.', risks: [] },

  // ── Pétrochimie ────────────────────────────────────────────
  { code: 'paraffinum-liquidum', name: 'Huile minérale (Paraffinum liquidum)', func: 'Émollient', risk: 'risque_limite', description: 'Huile minérale raffinée ; occlusive et efficace mais d’origine pétrochimique — la pureté pharmaceutique est encadrée, les grades techniques posent question.', risks: ['Origine pétrochimique', 'Effet occlusif (peaux acnéiques)'] },
  { code: 'petrolatum', name: 'Pétrolatum (vaseline)', func: 'Émollient occlusif', risk: 'risque_limite', description: 'Vaseline : très occlusive ; sûre en grade pharmaceutique, mais origine pétrochimique et qualité variable selon les grades.', risks: ['Origine pétrochimique', 'Qualité variable hors grade pharmaceutique'] },
  { code: 'mineral-oil', name: 'Mineral Oil', func: 'Émollient', risk: 'risque_limite', description: 'Huile minérale (même substance que Paraffinum liquidum).', risks: ['Origine pétrochimique', 'Effet occlusif'] },
  { code: 'cera-microcristallina', name: 'Cire microcristalline', func: 'Cire', risk: 'risque_limite', description: 'Cire de pétrole des baumes et sticks.', risks: ['Origine pétrochimique'] },
  { code: 'paraffin', name: 'Paraffine', func: 'Cire', risk: 'risque_limite', description: 'Cire de paraffine (crayons, sticks).', risks: ['Origine pétrochimique'] },

  // ── Humectants et solvants ─────────────────────────────────
  { code: 'aqua', name: 'Aqua (eau)', func: 'Solvant', risk: 'sans_risque', description: 'Eau purifiée, base de la plupart des formules.', risks: [] },
  { code: 'glycerin', name: 'Glycérine', func: 'Humectant', risk: 'sans_risque', description: 'Humectant référence : attire et retient l’eau dans la peau.', risks: [] },
  { code: 'propylene-glycol', name: 'Propylène glycol', func: 'Humectant', risk: 'risque_limite', description: 'Humectant très répandu ; irritation possible chez les peaux sensibles, doses limitées pour les enfants dans l’UE.', risks: ['Irritation possible (peaux sensibles)', 'Concentrations encadrées pour l’enfant (UE)'] },
  { code: 'butylene-glycol', name: 'Butylene glycol', func: 'Humectant', risk: 'sans_risque', description: 'Humectant/solvant mieux toléré que le propylène glycol.', risks: [] },
  { code: 'pentylene-glycol', name: 'Pentylene glycol', risk: 'sans_risque', func: 'Humectant', description: 'Humectant doux, souvent en alternative aux conservateurs classiques.', risks: [] },
  { code: '1-2-hexanediol', name: '1,2-Hexanediol', func: 'Humectant', risk: 'sans_risque', description: 'Humectant-émollient, aussi booster de conservation.', risks: [] },
  { code: 'caprylyl-glycol', name: 'Caprylyl glycol', func: 'Humectant', risk: 'sans_risque', description: 'Humectant doux aux propriétés conservatrices.', risks: [] },
  { code: 'ethylhexylglycerin', name: 'Ethylhexylglycerin', func: 'Booster de conservation', risk: 'sans_risque', description: 'Co-conservateur courant, généralement bien toléré (irritation rare).', risks: [] },
  { code: 'alcohol-denat', name: 'Alcohol denat', func: 'Solvant', risk: 'risque_limite', description: 'Alcool dénaturé : asséchant et irritant à forte concentration, utile aux textures légères et aux formules sans conservateurs classiques.', risks: ['Assèchement cutané à forte dose', 'Irritation des peaux sensibles'] },
  { code: 'hydroxyacetophenone', name: 'Hydroxyacetophenone', func: 'Antioxydant', risk: 'sans_risque', description: 'Antioxydant/stabilisant fréquent, alternative au phenoxyethanol en association.', risks: [] },
  { code: 'sodium-hydroxide', name: 'Sodium hydroxide (soude)', func: 'Ajusteur de pH', risk: 'sans_risque', description: 'Ajuste le pH de la formule ; entièrement neutralisé dans le produit fini.', risks: [] },
  { code: 'citric-acid', name: 'Acide citrique', func: 'Ajusteur de pH', risk: 'sans_risque', description: 'Ajuste le pH et chélate les métaux ; présent dans le citron.', risks: [] },
  { code: 'sodium-chloride', name: 'Chlorure de sodium (sel)', func: 'Épaississant', risk: 'sans_risque', description: 'Sel : épaissit les tensioactifs, ajuste la viscosité.', risks: [] },
  { code: 'triethanolamine', name: 'Triéthanolamine (TEA)', func: 'Émulsifiant / pH', risk: 'risque_limite', description: 'Amine ajusteuse de pH ; peut former des nitrosamines au contact de certains conservateurs (formulations encadrées).', risks: ['Formation possible de nitrosamines'] },

  // ── Émulsifiants et corps gras ─────────────────────────────
  { code: 'cetearyl-alcohol', name: 'Alcool cétylstéarylique', func: 'Émulsifiant / Émollient', risk: 'sans_risque', description: 'Mélange d’alcools gras végétaux : épaissit et adoucit (pas d’alcool desséchant).', risks: [] },
  { code: 'cetyl-alcohol', name: 'Alcool cétylique', func: 'Émollient', risk: 'sans_risque', description: 'Alcool gras (cire de coco) émollient.', risks: [] },
  { code: 'stearyl-alcohol', name: 'Alcool stéarylique', func: 'Émollient', risk: 'sans_risque', description: 'Alcool gras émollient.', risks: [] },
  { code: 'glyceryl-stearate', name: 'Glyceryl stearate', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant doux (glycérine + acide stéarique).', risks: [] },
  { code: 'cetearyl-glucoside', name: 'Cetearyl glucoside', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant doux végétal (alcool gras + glucose).', risks: [] },
  { code: 'sorbitan-oleate', name: 'Sorbitan oleate', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant (sorbitol + acide oléique).', risks: [] },
  { code: 'polysorbate-20', name: 'Polysorbate 20', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé (dérivé PEG) des eaux de toilette et toniques.', risks: ['Famille PEG (éthoxylation)', 'Renforce le passage d’autres substances'] },
  { code: 'polysorbate-60', name: 'Polysorbate 60', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé (dérivé PEG).', risks: ['Famille PEG (éthoxylation)'] },
  { code: 'polysorbate-80', name: 'Polysorbate 80', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé répandu (dérivé PEG).', risks: ['Famille PEG (éthoxylation)', 'Renforce le passage d’autres substances'] },
  { code: 'glyceryl-caprylate', name: 'Glyceryl caprylate', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant/co-conservateur doux (glycérine + acide caprylique).', risks: [] },
  { code: 'butyrospermum-parkii-butter', name: 'Beurre de karité', func: 'Émollient', risk: 'sans_risque', description: 'Beurre végétal nourrissant, riche en insaponifiables.', risks: [] },
  { code: 'cocos-nucifera-oil', name: 'Huile de coco', func: 'Émollient', risk: 'sans_risque', description: 'Huile de coco nourrissante (peut être comédogène sur le visage).', risks: [] },
  { code: 'glycine-soja-oil', name: 'Huile de soja', func: 'Émollient', risk: 'sans_risque', description: 'Huile végétale émolliente, riche en vitamine E.', risks: [] },
  { code: 'helianthus-annuus-seed-oil', name: 'Huile de tournesol', func: 'Émollient', risk: 'sans_risque', description: 'Huile végétale riche en oméga-6.', risks: [] },
  { code: 'coco-glycerides', name: 'Cocoglycerides', func: 'Émollient', risk: 'sans_risque', description: 'Glycérides de coco, émollient végétal.', risks: [] },
  { code: 'hydrogenated-coco-glycerides', name: 'Glycérides de coco hydrogénés', func: 'Émollient', risk: 'sans_risque', description: 'Émollient végétal hydrogéné (texture baume).', risks: [] },
  { code: 'hydrogenated-rapeseed-oil', name: 'Huile de colza hydrogénée', func: 'Émollient', risk: 'sans_risque', description: 'Huile végétale hydrogénée (consistance).', risks: [] },
  { code: 'isopropyl-palmitate', name: 'Isopropyl palmitate', func: 'Émollient', risk: 'sans_risque', description: 'Ester d’acide palmitique, toucher sec.', risks: [] },
  { code: 'dibutyl-adipate', name: 'Dibutyl adipate', func: 'Émollient', risk: 'sans_risque', description: 'Diester émollient léger (émulsions solaires).', risks: [] },
  { code: 'butylene-glycol-dicaprylate', name: 'Butylene Glycol Dicaprylate', func: 'Émollient', risk: 'sans_risque', description: 'Diester émollient végétal au toucher sec.', risks: [] },
  { code: 'dicaprate', name: 'Dicaprate', func: 'Émollient', risk: 'sans_risque', description: 'Ester émollient (souvent fragment du butylene glycol dicaprylate).', risks: [] },
  { code: 'c12-15-alkyl-benzoate', name: 'C12-15 Alkyl Benzoate', func: 'Émollient', risk: 'sans_risque', description: 'Ester synthétique au toucher sec, bien évalué.', risks: [] },

  // ── Actifs et soins ────────────────────────────────────────
  { code: 'tocopherol', name: 'Tocophérol (vitamine E)', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine E naturelle : antioxydante, protège les huiles du rancissement.', risks: [] },
  { code: 'tocopheryl-acetate', name: 'Acétate de tocophéryle', func: 'Antioxydant', risk: 'sans_risque', description: 'Forme stabilisée de la vitamine E.', risks: [] },
  { code: 'panthenol', name: 'Panthenol (provitamine B5)', func: 'Actif apaisant', risk: 'sans_risque', description: 'Provitamine B5 : hydrate, apaise et répare.', risks: [] },
  { code: 'allantoin', name: 'Allantoïne', func: 'Actif apaisant', risk: 'sans_risque', description: 'Actif calmant et régénérant.', risks: [] },
  { code: 'aloe-barbadensis-extract', name: 'Extrait d’aloe vera', func: 'Actif apaisant', risk: 'sans_risque', description: 'Extrait de feuille d’aloe vera : hydratant et apaisant.', risks: [] },
  { code: 'aloe-barbadensis-leaf-juice', name: 'Jus de feuille d’aloe vera', func: 'Actif apaisant', risk: 'sans_risque', description: 'Jus d’aloe vera frais hydratant.', risks: [] },
  { code: 'glycyrrhiza-inflata-root-extract', name: 'Extrait de racine de réglisse', func: 'Actif apaisant', risk: 'sans_risque', description: 'Extrait de réglisse apaisant et antioxydant.', risks: [] },
  { code: 'sodium-hyaluronate', name: 'Hyaluronate de sodium', func: 'Actif hydratant', risk: 'sans_risque', description: 'Sel de l’acide hyaluronique : capte l’eau et comble les ridules.', risks: [] },
  { code: 'hyaluronic-acid', name: 'Acide hyaluronique', func: 'Actif hydratant', risk: 'sans_risque', description: 'Actif hydratant référence.', risks: [] },
  { code: 'sodium-pca', name: 'Sodium PCA', func: 'Humectant', risk: 'sans_risque', description: 'Humectant naturel du facteur naturel d’hydratation (NMF).', risks: [] },
  { code: 'betaine', name: 'Bétaïne', func: 'Humectant', risk: 'sans_risque', description: 'Humectant/apaisant dérivé de la betterave.', risks: [] },
  { code: 'retinol', name: 'Rétinol (vitamine A)', func: 'Actif anti-âge', risk: 'risque_limite', description: 'Actif anti-âge puissant : irritant au début d’utilisation et déconseillé pendant la grossesse ; photosensibilisant (usage le soir).', risks: ['Déconseillé pendant la grossesse', 'Irritation possible (phase d’adaptation)', 'Photosensibilisant'] },
  { code: 'retinyl-palmitate', name: 'Palmitate de rétinyle', func: 'Actif anti-âge', risk: 'risque_limite', description: 'Forme douce de vitamine A ; mêmes précautions que le rétinol à dose élevée.', risks: ['Précautions grossesse (vitamine A)'] },
  { code: 'niacinamide', name: 'Niacinamide (vitamine B3)', func: 'Actif uniformisant', risk: 'sans_risque', description: 'Vitamine B3 : unifie le teint, renforce la barrière cutanée.', risks: [] },
  { code: 'ascorbic-acid', name: 'Acide ascorbique (vitamine C)', func: 'Actif antioxydant', risk: 'sans_risque', description: 'Vitamine C pure : antioxydante et éclaircissante (instable en formule).', risks: [] },
  { code: 'caffeine', name: 'Caféine', func: 'Actif tonifiant', risk: 'sans_risque', description: 'Actif décongestionnant (cernes, cellulite).', risks: [] },

  // ── Agents de texture ──────────────────────────────────────
  { code: 'xanthan-gum', name: 'Gomme xanthane', func: 'Épaississant', risk: 'sans_risque', description: 'Gélifiant naturel par fermentation.', risks: [] },
  { code: 'carbomer', name: 'Carbomer', func: 'Gélifiant', risk: 'sans_risque', description: 'Polymère gélifiant des gels aqueux, inerte.', risks: [] },
  { code: 'hydroxyethyl-cellulose', name: 'Hydroxyéthylcellulose', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée épaississante.', risks: [] },
  { code: 'sclerotium-gum', name: 'Gomme de sclérotium', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme naturelle gélifiante.', risks: [] },
  { code: 'tapioca-starch', name: 'Amidon de tapioca', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon de manioc : matité et douceur.', risks: [] },
  { code: 'distarch-phosphate', name: 'Phosphate de distarch', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié absorbant.', risks: [] },
  { code: 'hydroxypropyl-starch-phosphate', name: 'Phosphate d’amidon hydroxypropylé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié épaississant.', risks: [] },
  { code: 'silica', name: 'Silice', func: 'Agent de texture', risk: 'sans_risque', description: 'Poudre de silice : matité, fluidité (préoccupation inhalation uniquement en poudre libre professionnelle).', risks: [] },
  { code: 'mica', name: 'Mica', func: 'Nacré / Poudre', risk: 'sans_risque', description: 'Minéral nacré des fards ; en amont, la traçabilité sociale des mines de mica reste un enjeu.', risks: ['Enjeux de traçabilité sociale (mica)'] },
  { code: 'talc', name: 'Talc', func: 'Poudre', risk: 'risque_limite', description: 'Poudre minérale douce ; les craintes historiques (contamination à l’amiante, ovarien) concernent des talcs impurs — le talc cosmétique est purifié et contrôlé.', risks: ['Qualité de purification à vérifier (amiante historique)', 'Inhalation à éviter (poudres)'] },
  { code: 'sodium-stearoyl-glutamate', name: 'Stéaroyl glutamate de sodium', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant doux à base d’acide aminé.', risks: [] },
  { code: 'glyceryl-oleate', name: 'Glyceryl oleate', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émollient/émulsifiant (glycérine + acide oléique).', risks: [] },
  { code: 'hydrogenated-polyisobutene', name: 'Polyisobutène hydrogéné', func: 'Émollient synthétique', risk: 'sans_risque', description: 'Polymère émollient inerte (remplace les huiles minérales).', risks: [] },

  // ── Chélateurs (motif : *edta) ─────────────────────────────
  { code: 'disodium-edta', name: 'Disodium EDTA', func: 'Chélateur', risk: 'risque_limite', description: 'Chélateur très répandu qui stabilise la formule ; faible pénétration cutanée mais persistance environnementale.', risks: ['Persistance environnementale', 'Renforce le passage d’autres substances'] },
  { code: 'tetrasodium-edta', name: 'Tetrasodium EDTA', func: 'Chélateur', risk: 'risque_limite', description: 'Chélateur de la même famille que le disodium EDTA.', risks: ['Persistance environnementale', 'Renforce le passage d’autres substances'] },
  { code: 'trisodium-edta', name: 'Trisodium EDTA', func: 'Chélateur', risk: 'risque_limite', description: 'Chélateur de la famille EDTA.', risks: ['Persistance environnementale'] },
  { code: 'sodium-phytate', name: 'Phytate de sodium', func: 'Chélateur', risk: 'sans_risque', description: 'Chélateur naturel (riz) alternatif à l’EDTA.', risks: [] },

  // ── Colorants ──────────────────────────────────────────────
  { code: 'ci-77491', name: 'Oxyde de fer (CI 77491)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment minéral rouge (oxyde de fer).', risks: [] },
  { code: 'ci-77492', name: 'Oxyde de fer (CI 77492)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment minéral jaune (oxyde de fer).', risks: [] },
  { code: 'ci-77499', name: 'Oxyde de fer (CI 77499)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment minéral noir (oxyde de fer).', risks: [] },
  { code: 'ci-77891', name: 'Dioxyde de titane (CI 77891)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment blanc minéral.', risks: [] },
  { code: 'ci-77266', name: 'Noir de goudron (CI 77266)', func: 'Colorant', risk: 'a_risque', description: 'Colorant noir dérivé du goudron de houille ; encadré et discuté (métaux lourds résiduels possibles).', risks: ['Dérivé du goudron de houille', 'Résidus possibles (métaux lourds)'] },
  { code: 'ci-77288', name: 'Vert chrome (CI 77288)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment vert minéral (oxyde de chrome).', risks: [] },
  { code: 'ci-15850', name: 'Rouge 7 (CI 15850)', func: 'Colorant', risk: 'sans_risque', description: 'Colorant organique des rouges à lèvres.', risks: [] },
  { code: 'ultramarines', name: 'Outremers (CI 77007)', func: 'Colorant', risk: 'sans_risque', description: 'Pigment minéral bleu.', risks: [] },

  // ── Actifs controversés / interdits ────────────────────────
  { code: 'hydroquinone', name: 'Hydroquinone', func: 'Dépigmentant', risk: 'a_risque', description: 'Dépigmentant puissant interdit dans les cosmétiques en vente libre dans l’UE (réservé à l’usage médical) : ochronose et préoccupations cancérogènes.', risks: ['Interdit en vente libre dans l’UE', 'Ochronose (décoloration définitive) à usage prolongé', 'Préoccupations cancérogènes'] },
  { code: 'p-phenylenediamine', name: 'P-Phénylènediamine (PPD)', func: 'Colorant capillaire', risk: 'a_risque', description: 'Colorant oxydatif des teintures noires : allergène fort, concentration limitée dans l’UE, tests cutanés recommandés 48 h avant usage.', risks: ['Allergène fort (tests cutanés recommandés)', 'Concentration limitée dans l’UE'] },
  { code: 'toluene-2-5-diamine', name: 'Toluène-2,5-diamine', func: 'Colorant capillaire', risk: 'a_risque', description: 'Colorant oxydatif des teintures ; mêmes préoccupations d’allergie que la PPD.', risks: ['Allergène fort', 'Concentration limitée dans l’UE'] },
  { code: 'phenylenediamine', name: 'Phénylènediamine', func: 'Colorant capillaire', risk: 'a_risque', description: 'Famille des colorants oxydatifs allergisants.', risks: ['Allergène fort'] },
  { code: 'resorcinol', name: 'Résorcinol', func: 'Colorant capillaire', risk: 'a_risque', description: 'Composant des teintures ; perturbation thyroïdienne suspectée, restrictions UE.', risks: ['Perturbation thyroïdienne suspectée', 'Restrictions UE'] },

  // ── Parfum et allergènes à déclaration obligatoire ────────
  { code: 'parfum', name: 'Parfum (fragrance)', func: 'Parfum', risk: 'risque_limite', allergen: true, description: 'Composition parfumante protégée (recette secrète) : peut contenir des allergènes à déclaration obligatoire.', risks: ['Allergènes parfum possibles (non détaillés)'] },
  { code: 'fragrance', name: 'Fragrance (parfum)', func: 'Parfum', risk: 'risque_limite', allergen: true, description: 'Composition parfumante (équivalent INCI de « parfum »).', risks: ['Allergènes parfum possibles (non détaillés)'] },
  { code: 'linalool', name: 'Linalool', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum naturel (lavande, coriandre) à déclaration obligatoire au-delà de 0,001 %.', risks: ['Allergène à déclaration obligatoire (UE)', 'S’oxyde en cas de vieillissement (plus allergisant)'] },
  { code: 'limonene', name: 'Limonene', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum des agrumes à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)', 'S’oxyde en cas de vieillissement (plus allergisant)'] },
  { code: 'citral', name: 'Citral', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (notes citronnées) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'citronellol', name: 'Citronellol', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (rose, géranium) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'geraniol', name: 'Geraniol', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (rose) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'eugenol', name: 'Eugenol', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (girofle) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'isoeugenol', name: 'Isoeugenol', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum à déclaration obligatoire, plus sensibilisant que l’eugénol.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'coumarin', name: 'Coumarin (coumarine)', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (fève tonka, foin coupé) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'benzyl-salicylate', name: 'Benzyl salicylate', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (douceur florale) très fréquent, à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'hexyl-cinnamal', name: 'Hexyl cinnamal', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (jasmin) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'hydroxycitronellal', name: 'Hydroxycitronellal', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum floral à déclaration obligatoire ; restrictions sur certains usages.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'butylphenyl-methylpropional', name: 'Butylphenyl methylpropional (Lilial)', func: 'Composant parfum', risk: 'a_risque', allergen: true, description: 'Allergène parfum « muguet » interdit dans les cosmétiques UE depuis mars 2022 (toxicité pour la reproduction).', risks: ['Interdit dans l’UE (2022)', 'Toxicité pour la reproduction'] },
  { code: 'alpha-isomethyl-ionone', name: 'Alpha-isomethyl ionone', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (violette) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'farnesol', name: 'Farnesol', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum à déclaration obligatoire (notes florales).', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'benzyl-benzoate', name: 'Benzyl benzoate', func: 'Composant parfum / Solvant', risk: 'risque_limite', allergen: true, description: 'Allergène parfum à déclaration obligatoire ; aussi traitement antiparasitaire en dermatologie.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'benzyl-cinnamate', name: 'Benzyl cinnamate', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène parfum (cannelle) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'evernia-prunastri', name: 'Evernia prunastri (mousse de chêne)', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène naturel (absolu de mousse de chêne) à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
  { code: 'evernia-furfuracea', name: 'Evernia furfuracea (mousse d’arbre)', func: 'Composant parfum', risk: 'risque_limite', allergen: true, description: 'Allergène naturel à déclaration obligatoire.', risks: ['Allergène à déclaration obligatoire (UE)'] },
];

// ── Motifs génériques ────────────────────────────────────────
// Les INCI forment des familles : PEG-40 Hydrogenated Castor Oil,
// Isopropylparaben, Calcium Disodium EDTA… On les couvre par regex.
interface IngredientPattern {
  re: RegExp;
  info: IngredientEntry;
}
const INGREDIENT_PATTERNS: IngredientPattern[] = [
  {
    re: /^peg-\d+/,
    info: { name: 'PEG (polyéthylène glycol)', func: 'Émulsifiant éthoxylé', risk: 'risque_limite', description: 'Famille des PEG : émulsifiants éthoxylés efficaces, issus de la pétrochimie, qui renforcent le passage des autres substances à travers la peau.', risks: ['Famille PEG (éthoxylation, traces possibles de 1,4-dioxane)', 'Renforce le passage d’autres substances'] },
  },
  {
    re: /paraben$/,
    info: { name: 'Paraben', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben (conservateur de la famille des p-hydroxybenzoates) ; les formes longues sont restreintes et cinq d’entre elles interdites dans l’UE. En INCI le nom s’écrit en un mot (ex : propylparaben).', risks: ['Suspicions de perturbation endocrinienne (débattues)', 'Certaines formes interdites dans l’UE'] },
  },
  {
    re: /-edta$/,
    info: { name: 'EDTA (chélateur)', func: 'Chélateur', risk: 'risque_limite', description: 'Chélateur de la famille EDTA : stabilise la formule mais persiste dans l’environnement.', risks: ['Persistance environnementale', 'Renforce le passage d’autres substances'] },
  },
  {
    re: /^benzophenone-\d/,
    info: { name: 'Benzophénone', func: 'Filtre UV / Stabilisant', risk: 'a_risque', description: 'Famille des benzophénones : perturbation endocrinienne suspectée (benzophénone-3 classée préoccupante par plusieurs autorités).', risks: ['Perturbation endocrinienne suspectée', 'Toxique pour les milieux marins'] },
  },
  {
    re: /^cyclo\w*siloxane$/,
    info: { name: 'Silicone cyclique (siloxane)', func: 'Silicone volatil', risk: 'a_risque', description: 'Siloxane cyclique (famille D4/D5/D6) : restrictions européennes pour la persistance environnementale et la toxicité reproductive.', risks: ['Restrictions UE', 'Persistance environnementale'] },
  },
  {
    re: /-nitropropane-|-nitro-|-formaldehyde$/,
    info: { name: 'Libérateur de formaldéhyde', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur libérateur de formaldéhyde, famille surveillée par le CIRC.', risks: ['Libère du formaldéhyde', 'Allergisant cutané'] },
  },
];

export const COSMETIC_INGREDIENTS: Readonly<Record<string, CosmeticIngredientInfo>> = Object.fromEntries(
  INGREDIENT_LIST.map((i) => [i.code, i]),
);

/**
 * Fiche d'un ingrédient INCI : correspondance exacte, puis motifs
 * génériques (PEG-x, *-paraben…). INCI inconnu → sans signalement
 * connu (pas de pénalité — inconnu ≠ controversé).
 */
export function getIngredientInfo(slug: string): CosmeticIngredientInfo {
  const code = slug.trim().toLowerCase();
  const exact = COSMETIC_INGREDIENTS[code];
  if (exact) return exact;
  for (const { re, info } of INGREDIENT_PATTERNS) {
    if (re.test(code)) return { ...info, code };
  }
  return {
    code,
    name: code
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    func: 'Ingrédient',
    risk: 'sans_risque',
    description:
      'Ingrédient non documenté dans notre base : aucun signalement connu pour cet INCI.',
    risks: [],
  };
}

/** Slugs → fiches, dédupliquées, ordre conservé. */
export function ingredientsInfos(slugs: string[]): CosmeticIngredientInfo[] {
  const seen = new Set<string>();
  const infos: CosmeticIngredientInfo[] = [];
  for (const slug of slugs) {
    const info = getIngredientInfo(slug);
    if (seen.has(info.code)) continue;
    seen.add(info.code);
    infos.push(info);
  }
  return infos;
}
