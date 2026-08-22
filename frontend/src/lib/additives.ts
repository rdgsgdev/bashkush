// ─────────────────────────────────────────────────────────────
// Base locale des additifs alimentaires (données ouvertes).
//
// Sources : taxonomie « additives » d’Open Food Facts (noms FR,
// familles d’usage) croisée avec les évaluations publiques EFSA,
// ANSES et CIRC (réévaluations, doses journalières admissibles,
// classifications de cancérogénicité), le règlement UE 1129/2011
// (liste communautaire des additifs autorisés) et la base publique
// « additives » de la Commission européenne. Consultées en août 2026.
//
// Couverture : quasi-exhaustive E100–E1520 (additifs autorisés UE +
// principaux retirés du marché, signalés comme interdits). Les
// variantes numérotées (E322i, E160ai…) sont résolues vers la fiche
// de base (voir getAdditiveInfo).
//
// Classification volontairement simple en 3 niveaux :
// - sans risque : aucun effet indésirable établi aux doses usuelles ;
// - risque limité : suspicions ou effets à forte dose (digestives,
//   allergiques, apport excessif en phosphore…) ;
// - à risque : préoccupations documentées (cancérogènes possibles,
//   hyperactivité, perturbation endocrinienne…).
//
// Le groupe « à risque » pilote la pénalité de score via
// getAdditiveInfo (lib/productAnalysis) : enrichir la base affine
// donc aussi la note des produits qui contiennent ces additifs
// (meilleure couverture = meilleurs scores). Additif absent de la
// base → repli prudent « risque limité ».
// ─────────────────────────────────────────────────────────────

/** Niveau de risque d’un additif. */
export type AdditiveRisk = 'sans_risque' | 'risque_limite' | 'a_risque';

/** Fiche complète d’un additif. */
export interface AdditiveInfo {
  /** Code normalisé (« e250 »). */
  code: string;
  /** Nom français usuel. */
  name: string;
  /** Fonction principale (colorant, conservateur…). */
  func: string;
  risk: AdditiveRisk;
  description: string;
  /** Risques potentiels associés (points listés dans le détail). */
  risks: string[];
}

const ADDITIVE_LIST: AdditiveInfo[] = [
  // ── Colorants ──────────────────────────────────────────────
  { code: 'e100', name: 'Curcumine', func: 'Colorant', risk: 'sans_risque', description: 'Pigment jaune naturel extrait du curcuma, utilisé depuis des siècles. Aucun effet indésirable établi aux doses alimentaires.', risks: [] },
  { code: 'e101', name: 'Riboflavine', func: 'Colorant', risk: 'sans_risque', description: 'Vitamine B2, naturellement présente dans le lait et les œufs, utilisée comme colorant jaune.', risks: [] },
  { code: 'e120', name: 'Carmin (acide carminique)', func: 'Colorant', risk: 'risque_limite', description: 'Colorant rouge naturel extrait de cochenilles (insectes). Rarement responsable de réactions allergiques.', risks: ['Réactions allergiques rares', 'Non compatible végétarien (origine animale)'] },
  { code: 'e102', name: 'Tartrazine', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque de synthèse (jaune). Associé à l’hyperactivité chez l’enfant par l’étude de Southampton (2007) ; mention obligatoire dans l’UE.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Réactions d’hypersensibilité (urticaire, asthme)'] },
  { code: 'e104', name: 'Jaune de quinoléine', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque de synthèse. Comme les autres colorants de l’étude de Southampton, suspecté d’agir sur l’attention des enfants.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Réactions cutanées rares'] },
  { code: 'e110', name: 'Jaune orangé S', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque de synthèse (orange). Visé par l’étude de Southampton sur l’hyperactivité infantile.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Réactions d’hypersensibilité'] },
  { code: 'e122', name: 'Azorubine (carmoisine)', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque rouge. Associé à l’hyperactivité dans l’étude de Southampton ; étiquetage d’avertissement obligatoire dans l’UE.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Réactions d’hypersensibilité'] },
  { code: 'e124', name: 'Rouge cochenille A (ponceau 4R)', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque rouge. Visé par l’étude de Southampton et restreint dans plusieurs pays hors UE.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Réactions allergiques rares', 'Restrictions hors UE'] },
  { code: 'e129', name: 'Rouge Allura AC', func: 'Colorant', risk: 'a_risque', description: 'Colorant azoïque rouge. Visé par l’étude de Southampton ; autorisé dans l’UE uniquement pour certaines boissons.', risks: ['Hyperactivité chez l’enfant (étude Southampton)', 'Restrictions hors UE'] },
  { code: 'e131', name: 'Bleu patenté V', func: 'Colorant', risk: 'a_risque', description: 'Colorant de synthèse. L’EFSA a revu sa dose journalière admissible à la baisse ; usage très restreint dans l’UE.', risks: ['Dose journalière abaissée par l’EFSA', 'Réactions d’hypersensibilité rares'] },
  { code: 'e133', name: 'Bleu brillant FCF', func: 'Colorant', risk: 'a_risque', description: 'Colorant de synthèse. Dose journalière revue à la baisse par l’EFSA, souvent associé aux autres colorants azoïques.', risks: ['Dose journalière abaissée par l’EFSA', 'Hyperactivité suspectée (colorant de synthèse)'] },
  { code: 'e142', name: 'Vert acide brillant BS', func: 'Colorant', risk: 'risque_limite', description: 'Colorant de synthèse autorisé dans l’UE mais restreint dans plusieurs pays ; données toxicologiques anciennes.', risks: ['Données toxicologiques anciennes', 'Restrictions hors UE'] },
  { code: 'e143', name: 'Vert solide FCF', func: 'Colorant', risk: 'a_risque', description: 'Colorant de synthèse non autorisé comme additif alimentaire dans l’UE (présent dans certains produits importés).', risks: ['Non autorisé dans l’UE', 'Effets comportementaux suspectés (colorant de synthèse)'] },
  { code: 'e150a', name: 'Caramel simple', func: 'Colorant', risk: 'sans_risque', description: 'Caramel obtenu par simple chauffage de sucres, sans agent chimique.', risks: [] },
  { code: 'e150b', name: 'Caramel au sulfite de caustique', func: 'Colorant', risk: 'sans_risque', description: 'Caramel produit en présence de sulfites (sans ammoniac) ; pas de préoccupation spécifique identifiée.', risks: [] },
  { code: 'e150c', name: 'Caramel à l’ammoniac', func: 'Colorant', risk: 'risque_limite', description: 'Caramel produit en présence d’ammoniac. Peut contenir des traces de 4-MÉI, composé formé à la cuisson et surveillé par l’EFSA.', risks: ['Traces possibles de 4-MÉI (suspecté cancérogène)'] },
  { code: 'e150d', name: 'Caramel au sulfite d’ammonium', func: 'Colorant', risk: 'risque_limite', description: 'Caramel le plus utilisé (boissons cola). Même préoccupation que les autres caramels à l’ammoniac concernant le 4-MÉI.', risks: ['Traces possibles de 4-MÉI (suspecté cancérogène)'] },
  { code: 'e151', name: 'Noir brillant BN', func: 'Colorant', risk: 'risque_limite', description: 'Colorant azoïque de synthèse (noir). Autorisé dans l’UE pour quelques usages seulement ; données toxicologiques anciennes.', risks: ['Données toxicologiques anciennes', 'Réactions d’hypersensibilité rares (colorant azoïque)'] },
  { code: 'e153', name: 'Charbon végétal', func: 'Colorant', risk: 'sans_risque', description: 'Charbon actif d’origine végétale, non absorbé par l’organisme.', risks: [] },
  { code: 'e155', name: 'Brun HT', func: 'Colorant', risk: 'risque_limite', description: 'Colorant azoïque brun réservé à quelques produits (gâteaux, céréales) ; données anciennes.', risks: ['Données toxicologiques anciennes'] },
  { code: 'e160a', name: 'Carotènes', func: 'Colorant', risk: 'sans_risque', description: 'Pigments orange naturels (provitamine A) extraits des carottes ou d’algues.', risks: [] },
  { code: 'e160b', name: 'Rocou (annatto)', func: 'Colorant', risk: 'risque_limite', description: 'Colorant naturel extrait des graines de rocou ; quelques cas d’allergie rapportés.', risks: ['Réactions allergiques rares rapportées'] },
  { code: 'e160c', name: 'Extrait de paprika', func: 'Colorant', risk: 'sans_risque', description: 'Pigments naturels du paprika (capsanthéine).', risks: [] },
  { code: 'e160d', name: 'Lycopène', func: 'Colorant', risk: 'sans_risque', description: 'Pigment rouge naturel de la tomate, antioxydant.', risks: [] },
  { code: 'e160e', name: 'Bêta-apo-8’-caroténal', func: 'Colorant', risk: 'sans_risque', description: 'Dérivé de synthèse du carotène (provitamine A).', risks: [] },
  { code: 'e160f', name: 'Éthyle ester de bêta-apo-8’-caroténoïque', func: 'Colorant', risk: 'sans_risque', description: 'Ester de synthèse du carotène, proche de la provitamine A.', risks: [] },
  { code: 'e161b', name: 'Lutéine', func: 'Colorant', risk: 'sans_risque', description: 'Pigment naturel présent dans les épinards et le jaune d’œuf, bénéfique pour la vision.', risks: [] },
  { code: 'e161g', name: 'Canthaxanthine', func: 'Colorant', risk: 'risque_limite', description: 'Pigment caroténoïde de synthèse. Des dépôts rétiniens ont été observés à forte dose : usage alimentaire strictement limité.', risks: ['Dépôts rétiniens à forte dose', 'Usage très limité dans l’UE'] },
  { code: 'e162', name: 'Rouge de betterave', func: 'Colorant', risk: 'sans_risque', description: 'Colorant naturel extrait des betteraves (bétanine).', risks: [] },
  { code: 'e163', name: 'Anthocyanes', func: 'Colorant', risk: 'sans_risque', description: 'Pigments naturels des fruits rouges et des légumes violets.', risks: [] },
  { code: 'e170', name: 'Carbonate de calcium', func: 'Colorant', risk: 'sans_risque', description: 'Chaux naturelle, source de calcium ; sert aussi d’antiagglomérant.', risks: [] },
  { code: 'e171', name: 'Dioxyde de titane', func: 'Colorant', risk: 'a_risque', description: 'Colorant blanc nanoparticulaire. L’EFSA n’a pas pu écarter un risque génotoxique : interdit comme additif alimentaire dans l’UE depuis 2022.', risks: ['Génotoxicité possible non écartée (EFSA)', 'Interdit dans l’UE depuis 2022 (nanoparticules)'] },
  { code: 'e172', name: 'Oxydes et hydroxydes de fer', func: 'Colorant', risk: 'sans_risque', description: 'Pigments minéraux naturels (fer).', risks: [] },
  { code: 'e173', name: 'Aluminium', func: 'Colorant', risk: 'risque_limite', description: 'Métal utilisé pour les décorations argentées. L’EFSA a fortement réduit sa dose hebdomadaire tolérable.', risks: ['Accumulation possible dans l’organisme', 'Dose tolérable abaissée par l’EFSA', 'Exclu du cahier des charges bio'] },
  { code: 'e174', name: 'Argent', func: 'Colorant', risk: 'risque_limite', description: 'Métal décoratif, usage très restreint dans l’UE.', risks: ['Accumulation possible à forte dose'] },
  { code: 'e175', name: 'Or', func: 'Colorant', risk: 'risque_limite', description: 'Feuilles d’or décoratives (pâtisserie, chocolaterie) ; usage restreint, métal inerte.', risks: ['Usage très restreint dans l’UE'] },
  { code: 'e180', name: 'Litholrubine BK', func: 'Colorant', risk: 'risque_limite', description: 'Colorant azoïque réservé en Europe au seul enrobage des croûtes de fromage.', risks: ['Données toxicologiques anciennes', 'Usage très restreint dans l’UE'] },

  // ── Conservateurs ──────────────────────────────────────────
  { code: 'e200', name: 'Acide sorbique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide issu des baies du sorbier ; inhibe moisissures et levures.', risks: [] },
  { code: 'e202', name: 'Sorbate de potassium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de potassium de l’acide sorbique, très répandu (yaourts, pâtisseries).', risks: [] },
  { code: 'e210', name: 'Acide benzoïque', func: 'Conservateur', risk: 'risque_limite', description: 'Conservateur des boissons gazeuses. Peut réagir avec la vitamine C pour former des traces de benzène.', risks: ['Formation possible de benzène en présence de vitamine C (E300)'] },
  { code: 'e211', name: 'Benzoate de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium de l’acide benzoïque, très courant dans les sodas et sauces.', risks: ['Formation possible de benzène en présence de vitamine C (E300)', 'Urticaire et asthme aggravés chez les personnes sensibles'] },
  { code: 'e212', name: 'Benzoate de potassium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de potassium de l’acide benzoïque, mêmes usages que le benzoate de sodium.', risks: ['Formation possible de benzène en présence de vitamine C (E300)'] },
  { code: 'e213', name: 'Benzoate de calcium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de calcium de l’acide benzoïque, mêmes usages que la famille E210-E213.', risks: ['Formation possible de benzène en présence de vitamine C (E300)'] },
  { code: 'e214', name: 'Parahydroxybenzoate d’éthyle', func: 'Conservateur', risk: 'risque_limite', description: 'Conservateur de la famille des parabens alimentaires (anti-levures et moisissures). Autorisé avec limites ; suspecté de faible activité hormonale.', risks: ['Suspicions de perturbation endocrinienne à forte dose (études animales)'] },
  { code: 'e215', name: 'Parahydroxybenzoate d’éthyle, sel de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium du paraben éthyle (E214).', risks: ['Suspicions de perturbation endocrinienne à forte dose (études animales)'] },
  { code: 'e216', name: 'Parahydroxybenzoate de propyle', func: 'Conservateur', risk: 'a_risque', description: 'Paraben alimentaire retiré de la liste européenne en 2006 après réévaluation défavorable.', risks: ['Retiré de la liste des additifs UE', 'Suspicions d’effets hormonaux (études animales)'] },
  { code: 'e217', name: 'Parahydroxybenzoate de propyle, sel de sodium', func: 'Conservateur', risk: 'a_risque', description: 'Sel de sodium du paraben de propyle, retiré de la liste européenne avec le E216.', risks: ['Retiré de la liste des additifs UE'] },
  { code: 'e218', name: 'Parahydroxybenzoate de méthyle', func: 'Conservateur', risk: 'risque_limite', description: 'Paraben alimentaire encore autorisé (seul ou avec E219), très surveillé.', risks: ['Suspicions de perturbation endocrinienne à forte dose (études animales)'] },
  { code: 'e219', name: 'Parahydroxybenzoate de méthyle, sel de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium du paraben de méthyle (E218).', risks: ['Suspicions de perturbation endocrinienne à forte dose (études animales)'] },
  { code: 'e220', name: 'Anhydride sulfureux', func: 'Conservateur', risk: 'risque_limite', description: 'Sulfite utilisé dans le vin et les fruits secs ; allergène à étiquetage obligatoire.', risks: ['Crises d’asthme chez les personnes sensibles', 'Destruction partielle de la vitamine B1', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e221', name: 'Sulfite de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium du sulfite, même famille que E220 (vins, fruits secs).', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e222', name: 'Bisulfite de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Hydrogénosulfite de sodium (famille des sulfites) : vin, fruits secs, légumes déshydratés.', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e223', name: 'Disulfite de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Métabisulfite de sodium (famille des sulfites) : vin, crustacés, pommes de terre transformées.', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e224', name: 'Métabisulfite de potassium', func: 'Conservateur', risk: 'risque_limite', description: 'Métabisulfite de potassium (famille des sulfites), surtout utilisé en vinification.', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e226', name: 'Sulfite de calcium', func: 'Conservateur', risk: 'risque_limite', description: 'Sulfite de calcium, réservé à quelques usages (fruits secs, légumes).', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e227', name: 'Hydrogénosulfite de calcium', func: 'Conservateur', risk: 'risque_limite', description: 'Bisulfite de calcium (famille des sulfites).', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e228', name: 'Hydrogénosulfite de potassium', func: 'Conservateur', risk: 'risque_limite', description: 'Bisulfite de potassium (famille des sulfites).', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e230', name: 'Biphényle (diphényle)', func: 'Conservateur', risk: 'risque_limite', description: 'Fongicide de surface réservé aux agrumes (traitement post-récolte).', risks: ['Résidus de surface sur les agrumes', 'Usage très restreint dans l’UE'] },
  { code: 'e231', name: 'Orthophénylphénol', func: 'Conservateur', risk: 'risque_limite', description: 'Fongicide de surface réservé aux agrumes, comme les E230-E233.', risks: ['Résidus de surface sur les agrumes'] },
  { code: 'e232', name: 'Orthophénylphénate de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium de l’orthophénylphénol (traitement de surface des agrumes).', risks: ['Résidus de surface sur les agrumes'] },
  { code: 'e233', name: 'Thiabendazole', func: 'Conservateur', risk: 'risque_limite', description: 'Antifongique réservé à la surface des agrumes et bananes ; également vermifuge en médecine vétérinaire.', risks: ['Résidus de surface', 'Usage très restreint dans l’UE'] },
  { code: 'e234', name: 'Nisine', func: 'Conservateur', risk: 'sans_risque', description: 'Peptide antibactérien produit par fermentation laitière, détruit par la digestion.', risks: [] },
  { code: 'e235', name: 'Natamycine', func: 'Conservateur', risk: 'sans_risque', description: 'Antifongique naturel appliqué en surface des fromages ; très peu absorbé par l’organisme.', risks: [] },
  { code: 'e236', name: 'Acide formique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide naturel (fourmis, orties), régulateur d’acidité des boissons.', risks: [] },
  { code: 'e237', name: 'Formiate de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de sodium de l’acide formique.', risks: [] },
  { code: 'e238', name: 'Formiate de calcium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de calcium de l’acide formique.', risks: [] },
  { code: 'e239', name: 'Hexaméthylènetétramine', func: 'Conservateur', risk: 'risque_limite', description: 'Conservateur réservé au fromage Provolone ; libère de faibles quantités de formaldéhyde.', risks: ['Libère du formaldéhyde (cancérogène connu) à faible dose', 'Usage limité à un seul fromage dans l’UE'] },
  { code: 'e242', name: 'Diméthyl dicarbonate', func: 'Conservateur', risk: 'sans_risque', description: 'Stérilisant des boissons : réagit intégralement juste après ajout (converti en méthanol et CO₂).', risks: [] },
  { code: 'e249', name: 'Nitrite de potassium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur de charcuterie : il bloque le botulisme mais forme des nitrosamines à la cuisson.', risks: ['Formation de nitrosamines cancérogènes à la cuisson', 'Lien établi avec les cancers colorectaux (CIRC/OMS)', 'Dose journalière abaissée par l’EFSA (2023)'] },
  { code: 'e250', name: 'Nitrite de sodium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur emblématique des charcuteries (jambon, saucisses). Même problématique que les autres nitrites.', risks: ['Formation de nitrosamines cancérogènes à la cuisson', 'Lien établi avec les cancers colorectaux (CIRC/OMS)', 'Dose journalière abaissée par l’EFSA (2023)'] },
  { code: 'e251', name: 'Nitrate de sodium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur converti en nitrites dans l’organisme (même problématique que E249-E250).', risks: ['Conversion en nitrites dans l’organisme', 'Formation possible de nitrosamines', 'Lien établi avec les cancers colorectaux (CIRC/OMS)'] },
  { code: 'e252', name: 'Nitrate de potassium', func: 'Conservateur', risk: 'a_risque', description: 'Sel de salpêtre traditionnel des charcuteries, converti en nitrites dans le corps.', risks: ['Conversion en nitrites dans l’organisme', 'Formation possible de nitrosamines'] },
  { code: 'e260', name: 'Acide acétique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide du vinaigre, obtenu par fermentation.', risks: [] },
  { code: 'e261', name: 'Acétate de potassium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de potassium de l’acide acétique.', risks: [] },
  { code: 'e262', name: 'Acétates de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Sels de sodium de l’acide acétique (vinaigre).', risks: [] },
  { code: 'e263', name: 'Acétate de calcium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de calcium de l’acide acétique (pain, conserves de légumes).', risks: [] },
  { code: 'e264', name: 'Acétate d’ammonium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel d’ammonium de l’acide acétique, usage limité.', risks: [] },
  { code: 'e270', name: 'Acide lactique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide naturel de la fermentation (yaourt, choucroute).', risks: [] },
  { code: 'e280', name: 'Acide propionique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide gras court produit par fermentation ; inhibe les moisissures du pain.', risks: [] },
  { code: 'e281', name: 'Propionate de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de sodium de l’acide propionique (pain industriel).', risks: [] },
  { code: 'e282', name: 'Propionate de calcium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de calcium de l’acide propionique, utilisé dans le pain et les pâtisseries.', risks: [] },
  { code: 'e283', name: 'Propionate de potassium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de potassium de l’acide propionique.', risks: [] },
  { code: 'e284', name: 'Acide borique', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur dérivé du bore, réservé au seul caviar dans l’UE. Toxique pour la reproduction à dose élevée.', risks: ['Toxicité pour la reproduction (études animales)', 'Usage limité au caviar dans l’UE'] },
  { code: 'e285', name: 'Tétraborate de sodium (borax)', func: 'Conservateur', risk: 'a_risque', description: 'Sel de bore réservé au caviar, comme l’acide borique ; mêmes préoccupations.', risks: ['Toxicité pour la reproduction (études animales)', 'Usage limité au caviar dans l’UE'] },
  { code: 'e290', name: 'Dioxyde de carbone', func: 'Conservateur', risk: 'sans_risque', description: 'Gaz des boissons pétillantes (pétillance).', risks: [] },
  { code: 'e296', name: 'Acide malique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide naturel de la pomme.', risks: [] },
  { code: 'e297', name: 'Acide fumarique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide organique de synthèse, proche de l’acide malique.', risks: [] },

  // ── Antioxydants et acides ─────────────────────────────────
  { code: 'e300', name: 'Acide ascorbique', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine C naturelle ou de synthèse ; antioxydant et conservateur de couleur.', risks: [] },
  { code: 'e301', name: 'Ascorbate de sodium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de sodium de la vitamine C.', risks: [] },
  { code: 'e302', name: 'Ascorbate de calcium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de calcium de la vitamine C.', risks: [] },
  { code: 'e303', name: 'Ascorbate de potassium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de potassium de la vitamine C.', risks: [] },
  { code: 'e304', name: 'Palmitate d’ascorbyle', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine C liposoluble, adaptée à la protection des graisses.', risks: [] },
  { code: 'e306', name: 'Tocophérols d’extraction', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine E naturelle extraite de tourteaux végétaux (soja, tournesol).', risks: [] },
  { code: 'e307', name: 'Alpha-tocophérol', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine E de synthèse (idem E308-E309 pour les autres formes).', risks: [] },
  { code: 'e308', name: 'Gamma-tocophérol', func: 'Antioxydant', risk: 'sans_risque', description: 'Forme gamma de la vitamine E de synthèse.', risks: [] },
  { code: 'e309', name: 'Delta-tocophérol', func: 'Antioxydant', risk: 'sans_risque', description: 'Forme delta de la vitamine E de synthèse.', risks: [] },
  { code: 'e310', name: 'Gallate de propyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses. L’EFSA a fixé sa dose journalière à partir d’effets thyroïdiens observés chez l’animal.', risks: ['Effets sur la thyroïde à forte dose (études animales)'] },
  { code: 'e311', name: 'Gallate d’octyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses, même famille que E310.', risks: ['Effets sur la thyroïde à forte dose (études animales)', 'Passage faible mais mesurable dans le sang'] },
  { code: 'e312', name: 'Gallate de dodécyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses, même famille que E310.', risks: ['Effets sur la thyroïde à forte dose (études animales)'] },
  { code: 'e315', name: 'Acide érythorbique', func: 'Antioxydant', risk: 'sans_risque', description: 'Isomère de la vitamine C : pouvoir antioxydant sans activité vitaminique.', risks: [] },
  { code: 'e316', name: 'Érythorbate de sodium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de sodium de l’acide érythorbique, très utilisé en charcuterie.', risks: [] },
  { code: 'e317', name: 'Érythorbate de potassium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de potassium de l’acide érythorbique.', risks: [] },
  { code: 'e318', name: 'Érythorbate de calcium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de calcium de l’acide érythorbique.', risks: [] },
  { code: 'e319', name: 'TBHQ (tert-butylhydroquinone)', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses. L’EFSA a fixé une dose journalière basée sur des effets hématologiques observés chez l’animal.', risks: ['Effets sur le sang à forte dose (études animales)', 'Dose journalière basse fixée par l’EFSA'] },
  { code: 'e320', name: 'BHA (hydroxyanisole butylé)', func: 'Antioxydant', risk: 'a_risque', description: 'Antioxydant de synthèse des graisses. Classé « peut-être cancérogène » par le CIRC ; perturbateur endocrinien suspecté.', risks: ['Cancérogène possible (CIRC, groupe 2B)', 'Perturbation endocrinienne suspectée', 'Effets sur le foie et les reins à forte dose'] },
  { code: 'e321', name: 'BHT (hydroxytoluène butylé)', func: 'Antioxydant', risk: 'a_risque', description: 'Antioxydant de synthèse proche du BHA ; dose journalière revue à la baisse, perturbation endocrinienne suspectée.', risks: ['Perturbation endocrinienne suspectée', 'Cancérogénicité débattue (études animales)', 'Effets hépatiques à forte dose'] },
  { code: 'e322', name: 'Lécithines', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant naturel extrait du soja ou du tournesol (lécithine). Allergène soja à étiquetage obligatoire le cas échéant.', risks: [] },
  { code: 'e325', name: 'Lactate de sodium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de sodium de l’acide lactique ; retient l’eau et régule l’acidité.', risks: [] },
  { code: 'e326', name: 'Lactate de potassium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de potassium de l’acide lactique.', risks: [] },
  { code: 'e327', name: 'Lactate de calcium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de calcium de l’acide lactique, aussi ferme les légumes.', risks: [] },
  { code: 'e329', name: 'Lactate de magnésium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de magnésium de l’acide lactique.', risks: [] },
  { code: 'e330', name: 'Acide citrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide du citron, l’acidifiant le plus répandu.', risks: [] },
  { code: 'e331', name: 'Citrates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide citrique (régulateurs d’acidité).', risks: [] },
  { code: 'e332', name: 'Citrates de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de potassium de l’acide citrique.', risks: [] },
  { code: 'e333', name: 'Citrates de calcium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de calcium de l’acide citrique, source de calcium.', risks: [] },
  { code: 'e334', name: 'Acide tartrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide du raisin, produit industriellement par fermentation.', risks: [] },
  { code: 'e335', name: 'Tartrates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide tartrique.', risks: [] },
  { code: 'e336', name: 'Tartrates de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de potassium de l’acide tartrique (crème de tartre).', risks: [] },
  { code: 'e337', name: 'Tartrate double de sodium et de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel double de l’acide tartrique, utilisé en pâtisserie.', risks: [] },
  { code: 'e338', name: 'Acide phosphorique', func: 'Acidifiant', risk: 'risque_limite', description: 'Acide des boissons cola. Les phosphates additifs sont pointés en cas d’excès pour la santé rénale et osseuse.', risks: ['Apport phosphoré excessif : os et reins', 'Érosion dentaire (boissons acides)'] },
  { code: 'e339', name: 'Phosphates de sodium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de sodium : texture des fromages fondus et viandes. Excès de phosphates additifs surveillé par l’ANSES.', risks: ['Apport phosphoré excessif : os et reins', 'Risque cardiovasculaire associé à l’excès (ANSES)'] },
  { code: 'e340', name: 'Phosphates de potassium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de potassium : fromages fondus, viandes, poudres à lever.', risks: ['Apport phosphoré excessif : os et reins', 'Risque cardiovasculaire associé à l’excès (ANSES)'] },
  { code: 'e341', name: 'Phosphates de calcium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de calcium : fromages fondus, panures. Même réserve que les autres phosphates additifs.', risks: ['Apport phosphoré excessif : os et reins'] },
  { code: 'e350', name: 'Malates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide malique (pomme).', risks: [] },
  { code: 'e351', name: 'Malate de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de potassium de l’acide malique.', risks: [] },
  { code: 'e352', name: 'Malates de calcium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de calcium de l’acide malique.', risks: [] },
  { code: 'e353', name: 'Acide métatartrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Polymère de l’acide tartrique, stabilisant des vins (prévient les dépôts).', risks: [] },
  { code: 'e354', name: 'Tartrate de calcium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de calcium de l’acide tartrique.', risks: [] },
  { code: 'e355', name: 'Acide adipique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide organique des bonbons acidulés et poudres à lever.', risks: [] },
  { code: 'e356', name: 'Adipates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide adipique.', risks: [] },
  { code: 'e357', name: 'Adipate de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de potassium de l’acide adipique.', risks: [] },
  { code: 'e363', name: 'Acide succinique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide naturel du métabolisme cellulaire, acidifiant des confiseries.', risks: [] },
  { code: 'e365', name: 'Fumarates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide fumarique.', risks: [] },
  { code: 'e366', name: 'Fumarate de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de potassium de l’acide fumarique.', risks: [] },
  { code: 'e367', name: 'Fumarate de calcium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de calcium de l’acide fumarique.', risks: [] },
  { code: 'e375', name: 'Niacine (vitamine B3)', func: 'Vitamine', risk: 'sans_risque', description: 'Vitamine B3 naturellement présente dans la viande et les céréales, utilisée comme colorant secondaire et complément.', risks: [] },
  { code: 'e380', name: 'Citrates d’ammonium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels d’ammonium de l’acide citrique.', risks: [] },
  { code: 'e381', name: 'Citrates d’ammonium ferrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels ferriques de l’acide citrique (anti-oxydation du fromage râpé).', risks: [] },
  { code: 'e385', name: 'Étodinate disodique de calcium (EDTA)', func: 'Séquestrant', risk: 'risque_limite', description: 'Chélateur de synthèse qui bloque les métaux (conserves, mayonnaises) ; mauvaise image et données limitées sur l’accumulation.', risks: ['Chélate les métaux, y compris utiles (fer, zinc) à forte dose'] },

  // ── Épaississants, gommes, émulsifiants ────────────────────
  { code: 'e400', name: 'Acide alginique', func: 'Épaississant', risk: 'sans_risque', description: 'Fibre extraite d’algues brunes, gélifiante et épaississante.', risks: [] },
  { code: 'e401', name: 'Alginate de sodium', func: 'Épaississant', risk: 'sans_risque', description: 'Sel de sodium de l’acide alginique, très répandu (glaces, sauces).', risks: [] },
  { code: 'e402', name: 'Alginate de potassium', func: 'Épaississant', risk: 'sans_risque', description: 'Sel de potassium de l’acide alginique.', risks: [] },
  { code: 'e403', name: 'Alginate d’ammonium', func: 'Épaississant', risk: 'sans_risque', description: 'Sel d’ammonium de l’acide alginique.', risks: [] },
  { code: 'e404', name: 'Alginate de calcium', func: 'Épaississant', risk: 'sans_risque', description: 'Sel de calcium de l’acide alginique (gélification, sphérification).', risks: [] },
  { code: 'e405', name: 'Alginate de propane-1,2-diol', func: 'Épaississant', risk: 'risque_limite', description: 'Alginate estérifié au propylène glycol (bières, sauces) ; la charge en propylène glycol est encadrée par une dose journalière.', risks: ['Apport en propylène glycol (dose journalière EFSA)'] },
  { code: 'e406', name: 'Agar-agar', func: 'Gélifiant', risk: 'sans_risque', description: 'Gélifiant extrait d’algues rouges, alternative végétale à la gélatine.', risks: [] },
  { code: 'e407', name: 'Carraghénanes', func: 'Épaississant', risk: 'risque_limite', description: 'Extraits d’algues rouges très utilisés (desserts lactés). Suspectés de favoriser l’inflammation intestinale ; réévaluation par l’EFSA en cours.', risks: ['Inflammation intestinale suspectée (études animales)', 'Effet laxatif à forte dose'] },
  { code: 'e407a', name: 'Algues Eucheuma traitées', func: 'Épaississant', risk: 'risque_limite', description: 'Semoule d’algues voisine des carraghénanes ; mêmes réserves que E407.', risks: ['Inflammation intestinale suspectée (études animales)'] },
  { code: 'e410', name: 'Gomme de caroube', func: 'Épaississant', risk: 'sans_risque', description: 'Farine de graines de caroube, épaississant naturel (glaces, compotes).', risks: [] },
  { code: 'e412', name: 'Gomme guar', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme de graines de guar, riche en fibres.', risks: [] },
  { code: 'e413', name: 'Gomme adragante', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme naturelle (astragale), épaississant et stabilisant.', risks: [] },
  { code: 'e414', name: 'Gomme arabique', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme d’acacia, fibre naturelle des sodas et confiseries.', risks: [] },
  { code: 'e415', name: 'Gomme xanthane', func: 'Épaississant', risk: 'sans_risque', description: 'Polysaccharide produit par fermentation ; très répandu (produits sans gluten).', risks: [] },
  { code: 'e416', name: 'Gomme karaya (sterculia)', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme naturelle exsudée d’un arbre indien, laxatif doux à forte dose.', risks: ['Effet laxatif à forte dose'] },
  { code: 'e417', name: 'Gomme de tara', func: 'Épaississant', risk: 'sans_risque', description: 'Farine de graines de tara (Pérou), proche de la gomme de caroube.', risks: [] },
  { code: 'e418', name: 'Gomme gellane', func: 'Épaississant', risk: 'sans_risque', description: 'Gélifiant obtenu par fermentation.', risks: [] },
  { code: 'e420', name: 'Sorbitol', func: 'Édulcorant et humectant', risk: 'risque_limite', description: 'Polyol (sucre-alcool) extrait du glucose, édulcorant et humectant.', risks: ['Effet laxatif à forte dose', 'Ballonnements et fermentation intestinale'] },
  { code: 'e421', name: 'Mannitol', func: 'Édulcorant et humectant', risk: 'risque_limite', description: 'Polyol extrait de fruits et algues, peu calorique.', risks: ['Effet laxatif à forte dose', 'Fermentation intestinale'] },
  { code: 'e422', name: 'Glycérol', func: 'Humectant', risk: 'sans_risque', description: 'Glycérine : retient l’humidité des pâtisseries.', risks: [] },
  { code: 'e428', name: 'Gélatine', func: 'Gélifiant', risk: 'sans_risque', description: 'Protéine obtenue par hydrolyse du collagène (porc, bœuf ou poisson).', risks: ['Non compatible végétarien (origine animale)', 'Allergène possible selon l’origine (poisson)'] },
  { code: 'e432', name: 'Polysorbate 20', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé (arômes, compléments). Des études récentes suggèrent un effet sur le microbiote intestinal.', risks: ['Altération possible du microbiote intestinal (études récentes)'] },
  { code: 'e433', name: 'Polysorbate 80', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé très répandu (crèmes glacées, sauces). Mêmes réserves que les autres polysorbates.', risks: ['Altération possible du microbiote intestinal (études récentes)', 'Inflammation intestinale suspectée'] },
  { code: 'e434', name: 'Polysorbate 40', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé de la même famille que le polysorbate 80.', risks: ['Altération possible du microbiote intestinal (études récentes)'] },
  { code: 'e435', name: 'Polysorbate 60', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé (pâtisseries, margarines).', risks: ['Altération possible du microbiote intestinal (études récentes)'] },
  { code: 'e436', name: 'Polysorbate 65', func: 'Émulsifiant', risk: 'risque_limite', description: 'Émulsifiant éthoxylé de la même famille.', risks: ['Altération possible du microbiote intestinal (études récentes)'] },
  { code: 'e440', name: 'Pectines', func: 'Gélifiant', risk: 'sans_risque', description: 'Fibres solubles des fruits, gélifiant des confitures.', risks: [] },
  { code: 'e442', name: 'Phosphatides d’ammonium', func: 'Émulsifiant', risk: 'risque_limite', description: 'Lécithine modifiée de colza, très utilisée en chocolaterie (famille des phosphates).', risks: ['Apport phosphoré (famille des phosphates additifs)'] },
  { code: 'e444', name: 'Acétate isobutyrate de saccharose', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster du saccharose utilisé comme agent trouble des boissons (émulsions d’arômes).', risks: [] },
  { code: 'e445', name: 'Esters glycériques de résines de bois', func: 'Émulsifiant', risk: 'sans_risque', description: 'Agent trouble des boissons aux agrumes, issu de résines de pin.', risks: [] },
  { code: 'e490', name: 'Propylène glycol (propane-1,2-diol)', func: 'Humectant / Support', risk: 'risque_limite', description: 'Humectant et support d’arômes très répandu (aussi numéroté E1520) ; l’EFSA a fixé une dose journalière et signale une accumulation possible chez le nourrisson. Fréquent dans les cosmétiques.', risks: ['Dose journalière fixée par l’EFSA', 'Accumulation possible chez le nourrisson'] },
  { code: 'e450', name: 'Diphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphates condensés : fromages fondus, viandes reconstituées, poudres à lever.', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e451', name: 'Triphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate le plus courant des surimis et charcuteries (rétention d’eau).', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e452', name: 'Polyphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Mélanges de phosphates condensés (fromages fondus, viandes).', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e457', name: 'Alpha-cyclodextrine', func: 'Stabilisant', risk: 'sans_risque', description: 'Fibre d’amidon en anneau, porteuse d’arômes et de compléments.', risks: [] },
  { code: 'e458', name: 'Gamma-cyclodextrine', func: 'Stabilisant', risk: 'sans_risque', description: 'Fibre d’amidon cyclique, porteuse (mêmes usages que l’alpha-cyclodextrine).', risks: [] },
  { code: 'e459', name: 'Bêta-cyclodextrine', func: 'Stabilisant', risk: 'risque_limite', description: 'Fibre d’amidon cyclique ; l’EFSA a fixé une dose journalière basse, à ne pas dépasser en cumul.', risks: ['Dose journalière basse fixée par l’EFSA'] },
  { code: 'e460', name: 'Cellulose', func: 'Agent de texture', risk: 'sans_risque', description: 'Fibre de cellulose purifiée (poudre de bois).', risks: [] },
  { code: 'e461', name: 'Méthylcellulose', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée, épaississant courant des produits sans gluten.', risks: [] },
  { code: 'e463', name: 'Hydroxypropylcellulose', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée, alternative végétale aux gélifiants animaux.', risks: [] },
  { code: 'e464', name: 'Hypromellose (HPMC)', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée très répandue (gélules végétales, produits sans gluten).', risks: [] },
  { code: 'e465', name: 'Méthyléthylcellulose', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée, émulsifiante et épaississante.', risks: [] },
  { code: 'e466', name: 'Carboxyméthylcellulose', func: 'Épaississant', risk: 'risque_limite', description: 'Cellulose modifiée très courante (glaces, sauces). Des études récentes suggèrent un effet sur le microbiote intestinal.', risks: ['Altération possible du microbiote intestinal (études récentes)', 'Inflammation intestinale suspectée'] },
  { code: 'e468', name: 'Croscarméllose sodique', func: 'Agent de texture', risk: 'sans_risque', description: 'Cellulose réticulée gonflante (désintégration des comprimés, texture).', risks: [] },
  { code: 'e469', name: 'Carboxyméthylcellulose enzymatiquement hydrolysée', func: 'Épaississant', risk: 'risque_limite', description: 'Cellulose modifiée prédigérée par enzyme ; mêmes réserves que la CMC (E466).', risks: ['Altération possible du microbiote intestinal (études récentes)'] },
  { code: 'e470a', name: 'Sels d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Sels de sodium, potassium ou calcium d’acides gras naturels.', risks: [] },
  { code: 'e470b', name: 'Sels de magnésium d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Sels de magnésium d’acides gras naturels (anti-agglomérant, démoulant).', risks: [] },
  { code: 'e471', name: 'Mono- et diglycérides d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant obtenu à partir de graisses et de glycérol, proche des graisses naturelles ; le plus répandu.', risks: [] },
  { code: 'e472a', name: 'Esters acétiques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide acétique.', risks: [] },
  { code: 'e472b', name: 'Esters lactiques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide lactique.', risks: [] },
  { code: 'e472c', name: 'Esters citriques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide citrique.', risks: [] },
  { code: 'e472d', name: 'Esters tartriques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide tartrique.', risks: [] },
  { code: 'e472e', name: 'Esters diacétyltartriques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Esters diacétyltartriques (DATEM) : renforçant du pain industriel.', risks: [] },
  { code: 'e472f', name: 'Esters mixtes acétiques et tartriques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mélange d’esters acétiques et tartriques des mono- et diglycérides.', risks: [] },
  { code: 'e473', name: 'Esters de saccharose et d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant construit sur du saccharose (boissons, pâtisseries).', risks: [] },
  { code: 'e474', name: 'Sucroglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mélange d’esters de saccharose et de mono-diglycérides.', risks: [] },
  { code: 'e475', name: 'Esters polyglycériques d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant de pâtisserie (mousses, fourrages).', risks: [] },
  { code: 'e476', name: 'Polyricinoléate de polyglycérol', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant issu de l’huile de ricin qui fluidifie le chocolat.', risks: [] },
  { code: 'e477', name: 'Esters de propylène glycol et d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant des pâtisseries et mousses aériennes.', risks: [] },
  { code: 'e479b', name: 'Esther thermooxydé d’huile de soja et d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant de friture (beurres de cuisson, ailerons de poulet).', risks: [] },
  { code: 'e481', name: 'Stéaroyl-2-lactylate de sodium', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant du pain industriel (acide gras + acide lactique).', risks: [] },
  { code: 'e482', name: 'Stéaroyl-2-lactylate de calcium', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant de pâte (acide gras + acide lactique), renforce la mie.', risks: [] },
  { code: 'e483', name: 'Tartrate de stéaryle', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster tartrique d’alcool gras, agent de blanchiment de la pâte.', risks: [] },
  { code: 'e491', name: 'Monostéarate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant des chocolats et desserts.', risks: [] },
  { code: 'e492', name: 'Tristéarate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster de sorbitane et d’acide stéarique (chocolaterie).', risks: [] },
  { code: 'e493', name: 'Monolaurate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster de sorbitane et d’acide laurique (pâtisseries).', risks: [] },
  { code: 'e494', name: 'Mono-oléate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster de sorbitane et d’acide oléique (gâteaux fourrés).', risks: [] },
  { code: 'e495', name: 'Monopalmitate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Éster de sorbitane et d’acide palmitique (glaçages).', risks: [] },
  { code: 'e500', name: 'Carbonates de sodium', func: 'Agent levant', risk: 'sans_risque', description: 'Sels alcalins du bicarbonate : pâtisserie, fromage fondu.', risks: [] },
  { code: 'e501', name: 'Carbonates de potassium', func: 'Agent levant', risk: 'sans_risque', description: 'Sel de potassium alcalin (cacao, biscuits).', risks: [] },
  { code: 'e503', name: 'Carbonates d’ammonium', func: 'Agent levant', risk: 'sans_risque', description: 'Levure chimique des biscuits ; s’évapore entièrement à la cuisson.', risks: [] },
  { code: 'e504', name: 'Carbonates de magnésium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Sel de magnésium anti-mottes (sel de table, poudres).', risks: [] },
  { code: 'e507', name: 'Acide chlorhydrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide naturel de l’estomac, utilisé comme régulateur d’acidité.', risks: [] },
  { code: 'e508', name: 'Chlorure de potassium', func: 'Sel de substitution', risk: 'sans_risque', description: 'Sel de potassium remplaçant partiellement le sel (chlorure de sodium).', risks: [] },
  { code: 'e509', name: 'Chlorure de calcium', func: 'Agent de texture', risk: 'sans_risque', description: 'Sel de calcium : fermeté des légumes en conserve, fromages.', risks: [] },
  { code: 'e510', name: 'Chlorure d’ammonium', func: 'Agent de texture', risk: 'sans_risque', description: 'Sel d’ammonium typique des bonbons salés nordiques (réglisse).', risks: [] },
  { code: 'e511', name: 'Chlorure de magnésium', func: 'Agent de texture', risk: 'sans_risque', description: 'Sel de magnésium (coagulant du tofu, nigari).', risks: [] },
  { code: 'e512', name: 'Chlorure d’étain', func: 'Conservateur', risk: 'risque_limite', description: 'Agent de conservation réservé aux asperges en conserve (maintien de la couleur).', risks: ['Apport en étain (usage très limité dans l’UE)'] },
  { code: 'e513', name: 'Acide sulfurique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide minéral utilisé pour l’hydrolyse des amidons (procédé, ne reste pas dans le produit fini).', risks: [] },
  { code: 'e514', name: 'Sulfates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide sulfurique (régulateur d’acidité).', risks: [] },
  { code: 'e515', name: 'Sulfates de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de potassium de l’acide sulfurique.', risks: [] },
  { code: 'e516', name: 'Sulfate de calcium', func: 'Agent de texture', risk: 'sans_risque', description: 'Plâtre alimentaire : coagulant du tofu, durcissant.', risks: [] },
  { code: 'e517', name: 'Sulfate d’ammonium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel d’ammonium de l’acide sulfurique (support de levain).', risks: [] },
  { code: 'e520', name: 'Sulfate d’aluminium', func: 'Ferme-fruit', risk: 'risque_limite', description: 'Sel d’aluminium (fermeté des légumes, œufs) ; l’EFSA a réduit la dose hebdomadaire tolérable d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e521', name: 'Sulfate double d’aluminium et de sodium (alun)', func: 'Ferme-fruit', risk: 'risque_limite', description: 'Alun sodique, même réserve que les autres sels d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e522', name: 'Sulfate double d’aluminium et de potassium (alun)', func: 'Ferme-fruit', risk: 'risque_limite', description: 'Alun potassique (pickles, levain chimique) ; même réserve que les sels d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e523', name: 'Sulfate double d’aluminium et d’ammonium (alun)', func: 'Ferme-fruit', risk: 'risque_limite', description: 'Alun d’ammonium ; même réserve que les autres sels d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e524', name: 'Hydroxyde de sodium (soude)', func: 'Alcalinisant', risk: 'sans_risque', description: 'Soude caustique diluée (bretzels, olives, régulateur de pH) ; réagissant totalement en cours de procédé.', risks: [] },
  { code: 'e525', name: 'Hydroxyde de potassium', func: 'Alcalinisant', risk: 'sans_risque', description: 'Potasse (régulateur de pH, cacao) ; réagissant totalement en cours de procédé.', risks: [] },
  { code: 'e526', name: 'Hydroxyde de calcium', func: 'Alcalinisant', risk: 'sans_risque', description: 'Chaux éteinte (régulateur de pH, conserves).', risks: [] },
  { code: 'e527', name: 'Hydroxyde d’ammonium', func: 'Alcalinisant', risk: 'sans_risque', description: 'Ammoniaque diluée, régulateur de pH.', risks: [] },
  { code: 'e528', name: 'Hydroxyde de magnésium', func: 'Alcalinisant', risk: 'sans_risque', description: 'Sel de magnésium alcalin (régulateur de pH).', risks: [] },
  { code: 'e529', name: 'Oxyde de calcium (chaux vive)', func: 'Alcalinisant', risk: 'sans_risque', description: 'Chaux vive désacidifiante (régulateur de pH).', risks: [] },
  { code: 'e530', name: 'Oxyde de magnésium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Magnésie (anti-mottes, complément de magnésium).', risks: [] },
  { code: 'e535', name: 'Ferrocyanure de sodium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Sel anti-mottes du sel de table. Réévalué par l’EFSA en 2018 : aucune préoccupation aux usages actuels (le fer, pas le cyanure libre, en détermine la toxicité).', risks: [] },
  { code: 'e536', name: 'Ferrocyanure de potassium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Anti-mottes du sel de table, mêmes conclusions EFSA que le E535.', risks: [] },
  { code: 'e537', name: 'Ferrocyanure de calcium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Anti-mottes de la même famille que E535-E536.', risks: [] },
  { code: 'e541', name: 'Phosphate d’aluminium et de sodium', func: 'Agent levant', risk: 'risque_limite', description: 'Poudre à lever à base d’aluminium (gâteaux industriels) ; cumul d’aluminium et de phosphates.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)', 'Apport phosphoré'] },
  { code: 'e551', name: 'Dioxyde de silicium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Silice fine anti-mottes (poudres, sel). L’EFSA n’a pas identifié de préoccupation aux usages actuels.', risks: [] },
  { code: 'e552', name: 'Silicate de calcium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Silicate anti-mottes (sel, épices en poudre).', risks: [] },
  { code: 'e553a', name: 'Silicate de magnésium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Silicate de magnésium synthétique (anti-mottes).', risks: [] },
  { code: 'e553b', name: 'Talc', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Talc alimentaire (anti-mottes du sel, agent de démoulage). Les préoccupations concernent l’inhalation en milieu professionnel, pas l’ingestion.', risks: [] },
  { code: 'e554', name: 'Silicates d’aluminium et de sodium', func: 'Antiagglomérant', risk: 'risque_limite', description: 'Silicate d’aluminium (anti-mottes, colors). Même réserve que les autres composés d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e555', name: 'Silicate d’aluminium et de potassium', func: 'Antiagglomérant', risk: 'risque_limite', description: 'Silicate d’aluminium (anti-mottes). Même réserve que les autres composés d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e556', name: 'Silicate d’aluminium et de calcium', func: 'Antiagglomérant', risk: 'risque_limite', description: 'Silicate d’aluminium (anti-mottes). Même réserve que les autres composés d’aluminium.', risks: ['Apport en aluminium (dose tolérable abaissée par l’EFSA)'] },
  { code: 'e558', name: 'Bentonite', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Argile colloïdale (clarification du vin, anti-mottes).', risks: [] },
  { code: 'e559', name: 'Argile kaolin (kaolinite)', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Argile blanche (anti-mottes, support d’arômes).', risks: [] },
  { code: 'e570', name: 'Acide stéarique', func: 'Agent de texture', risk: 'sans_risque', description: 'Acide gras naturel anti-mottes.', risks: [] },
  { code: 'e574', name: 'Acide gluconique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide issu de la fermentation du glucose.', risks: [] },
  { code: 'e575', name: 'Glucono-delta-lactone', func: 'Acidifiant', risk: 'sans_risque', description: 'Précurseur de l’acide gluconique (fromages, tofu).', risks: [] },
  { code: 'e576', name: 'Gluconate de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de sodium de l’acide gluconique (régulateur de pH).', risks: [] },
  { code: 'e577', name: 'Gluconate de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de potassium de l’acide gluconique.', risks: [] },
  { code: 'e578', name: 'Gluconate de calcium', func: 'Ferme-fruit', risk: 'sans_risque', description: 'Sel de calcium de l’acide gluconique (fermeté des fruits et légumes).', risks: [] },
  { code: 'e579', name: 'Gluconate ferreux', func: 'Colorant', risk: 'sans_risque', description: 'Sel de fer de l’acide gluconique (noircissement contrôlé des olives, fortification en fer).', risks: [] },
  { code: 'e580', name: 'Gluconate de magnésium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sel de magnésium de l’acide gluconique.', risks: [] },
  { code: 'e585', name: 'Lactate ferreux', func: 'Stabilisant', risk: 'sans_risque', description: 'Sel de fer de l’acide lactique (coloration des olives).', risks: [] },
  { code: 'e1414', name: 'Phosphate d’amidon acétylé', func: 'Épaississant', risk: 'sans_risque', description: 'Amidon de maïs modifié, texture des sauces.', risks: [] },
  { code: 'e1400', name: 'Amidon traité par acide', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié par acidification légère (fluidité, liant).', risks: [] },
  { code: 'e1401', name: 'Amidon traité par alcali', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié par alcalinisation.', risks: [] },
  { code: 'e1402', name: 'Amidon blanchi', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon blanchi (blancheur, stabilité).', risks: [] },
  { code: 'e1403', name: 'Amidon oxydé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié par oxydation légère.', risks: [] },
  { code: 'e1404', name: 'Amidon oxydé blanchi', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon oxydé puis blanchi.', risks: [] },
  { code: 'e1405', name: 'Amidon traité par enzymes', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié enzymatiquement (sirops, liants).', risks: [] },
  { code: 'e1410', name: 'Amidon phosphorylé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon estérifié par du phosphate (stabilité à la cuisson).', risks: [] },
  { code: 'e1412', name: 'Amidon réticulé au phosphate (distarch phosphate)', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon réticulé (résiste aux traitements thermiques).', risks: [] },
  { code: 'e1413', name: 'Amidon phosphorylé réticulé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon phosphaté réticulé (plats surgelés).', risks: [] },
  { code: 'e1415', name: 'Amidon acétylé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon estérifié à l’acide acétique.', risks: [] },
  { code: 'e1420', name: 'Amidon acétylé (anhydride acétique)', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon acétylé stabilisé (stabilité au froid).', risks: [] },
  { code: 'e1422', name: 'Amidon acétylé réticulé à l’adipate', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon très stable (plats préparés, sauces surgelées).', risks: [] },
  { code: 'e1440', name: 'Amidon hydroxypropylé', func: 'Agent de texture', risk: 'sans_risque', description: 'Amidon modifié à l’oxyde de propylène (transparence, tenue au froid).', risks: [] },
  { code: 'e1450', name: 'Octényle succinate d’amidon sodique', func: 'Émulsifiant', risk: 'sans_risque', description: 'Amidon « cireux » émulsifiant (arômes en poudre, boissons).', risks: [] },
  { code: 'e1442', name: 'Phosphate d’amidon hydroxypropylé', func: 'Épaississant', risk: 'sans_risque', description: 'Amidon modifié (produits laitiers, plats préparés).', risks: [] },

  // ── Exhausteurs de goût ────────────────────────────────────
  { code: 'e620', name: 'Acide glutamique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Acide aminé « umami », forme acide du glutamate. Mêmes réserves que le glutamate monosodique (E621).', risks: ['Symptômes d’intolérance chez certaines personnes (maux de tête)', 'Stimulation de l’appétit suspectée (études sur l’obésité)'] },
  { code: 'e621', name: 'Glutamate monosodique (GMS)', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur « umami » très répandu (plats préparés, soupes). Controversé : intolérance rapportée par certaines personnes et rôle discuté dans la stimulation de l’appétit.', risks: ['Symptômes d’intolérance chez certaines personnes (maux de tête)', 'Stimulation de l’appétit suspectée (études sur l’obésité)'] },
  { code: 'e622', name: 'Glutamate monopotassique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de potassium du glutamate, souvent utilisé dans les produits « réduits en sel ».', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e623', name: 'Diglutamate de calcium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de calcium du glutamate.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e624', name: 'Glutamate monoammonique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel d’ammonium du glutamate.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e625', name: 'Diglutamate de magnésium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de magnésium du glutamate.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e626', name: 'Acide guanylique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Nucléotide umami, souvent combiné au glutamate.', risks: ['Mêmes réserves que les autres exhausteurs (E627)'] },
  { code: 'e627', name: 'Guanylate disodique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur souvent combiné au glutamate pour renforcer le goût.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e628', name: 'Guanylate dipotassique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de potassium de l’acide guanylique.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e629', name: 'Guanylate de calcium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de calcium de l’acide guanylique.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e630', name: 'Acide inosinique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Nucléotide umami (viande, poisson), souvent combiné au glutamate.', risks: ['Mêmes réserves que les autres exhausteurs (E631)'] },
  { code: 'e631', name: 'Inosinate disodique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur souvent combiné au glutamate ; fréquemment d’origine animale (poisson).', risks: ['Mêmes réserves que le glutamate (E621)', 'Souvent d’origine animale'] },
  { code: 'e632', name: 'Inosinate dipotassique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de potassium de l’acide inosinique.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e633', name: 'Inosinate de calcium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Sel de calcium de l’acide inosinique.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e634', name: 'Ribonucléotides de calcium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Mélange de guanylate et d’inosinate de calcium.', risks: ['Mêmes réserves que le glutamate (E621)', 'Possible origine animale'] },
  { code: 'e635', name: 'Ribonucléotides de sodium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Mélange des exhausteurs E627 et E631, très puissant (chips, soupes).', risks: ['Mêmes réserves que le glutamate (E621)', 'Possible origine animale'] },
  { code: 'e640', name: 'Glycine', func: 'Exhausteur de goût', risk: 'sans_risque', description: 'Acide aminé naturel, correcteur d’amertume (parfois d’origine animale).', risks: ['Possible origine animale'] },

  // ── Enrobages, silicones, farines ──────────────────────────
  { code: 'e900', name: 'Diméthylpolysiloxane', func: 'Anti-mousse', risk: 'sans_risque', description: 'Silicone anti-mousse des huiles de friture et confiseries ; non absorbé par l’organisme.', risks: [] },
  { code: 'e901', name: 'Cire d’abeille', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Cire naturelle donnant leur brillance aux bonbons et fruits enrobés.', risks: [] },
  { code: 'e903', name: 'Cire de candelilla', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Cire végétale d’origine mexicaine (enrobage, brillance).', risks: [] },
  { code: 'e904', name: 'Gomme-laque', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Résine naturelle sécrétée par un insecte, utilisée pour la brillance (origine animale).', risks: [] },
  { code: 'e905', name: 'Cire de microcristalline', func: 'Agent d’enrobage', risk: 'risque_limite', description: 'Cire issue du pétrole (brillance des bonbons, traitement de surface des agrumes) ; usage très encadré dans l’UE.', risks: ['Origine pétrochimique', 'Usage très restreint dans l’UE'] },
  { code: 'e913', name: 'Lanoline', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Cire naturelle extraite de la laine de mouton (traitement de surface des fruits).', risks: ['Origine animale (laine)'] },
  { code: 'e920', name: 'L-cystéine (chlorhydrate)', func: 'Agent de traitement de la farine', risk: 'sans_risque', description: 'Acide aminé qui détend la pâte ; souvent produit par fermentation, historiquement extrait de plumes ou de cheveux.', risks: ['Origine animale possible (plumes, cheveux)'] },
  { code: 'e921', name: 'L-cystéine', func: 'Agent de traitement de la farine', risk: 'sans_risque', description: 'Forme base de la L-cystéine, mêmes usages que le E920.', risks: ['Origine animale possible'] },
  { code: 'e924', name: 'Bromate de potassium', func: 'Agent de traitement de la farine', risk: 'a_risque', description: 'Améliorant de farine retiré de la liste européenne des additifs.', risks: ['Néphrotoxicité démontrée (études animales)', 'Cancérogène chez l’animal', 'Interdit dans l’UE'] },
  { code: 'e927a', name: 'Azodicarbonamide', func: 'Agent de traitement de la farine', risk: 'a_risque', description: 'Améliorant de farine et agent gonflant, interdit comme additif alimentaire dans l’UE.', risks: ['Métabolite (sémicarbazide) suspecté cancérogène', 'Irritant respiratoire (exposition professionnelle)', 'Interdit dans l’UE'] },
  { code: 'e928', name: 'Peroxyde de benzoyle', func: 'Agent de traitement de la farine', risk: 'a_risque', description: 'Blanchissant de la farine retiré de la liste européenne en 2010.', risks: ['Retiré de la liste des additifs UE'] },
  { code: 'e938', name: 'Argon', func: 'Gaz d’emballage', risk: 'sans_risque', description: 'Gaz inerte de conditionnement (atmosphère protectrice).', risks: [] },
  { code: 'e939', name: 'Hélium', func: 'Gaz d’emballage', risk: 'sans_risque', description: 'Gaz inerte de conditionnement.', risks: [] },
  { code: 'e941', name: 'Azote', func: 'Gaz d’emballage', risk: 'sans_risque', description: 'Azote de conditionnement (cafés, fromages sous vide) et propulseur.', risks: [] },
  { code: 'e942', name: 'Protoxyde d’azote', func: 'Gaz propulseur', risk: 'sans_risque', description: 'Gaz propulseur des crèmes chantilly en bombe.', risks: [] },
  { code: 'e944', name: 'Propane', func: 'Gaz propulseur', risk: 'sans_risque', description: 'Gaz propulseur (bombes aérosols alimentaires).', risks: [] },
  { code: 'e948', name: 'Oxygène', func: 'Gaz d’emballage', risk: 'sans_risque', description: 'Oxygène de conditionnement (poissons, viandes sous atmosphère modifiée).', risks: [] },
  { code: 'e949', name: 'Hydrogène', func: 'Gaz propulseur', risk: 'sans_risque', description: 'Gaz propulseur inerte.', risks: [] },

  // ── Édulcorants ────────────────────────────────────────────
  { code: 'e950', name: 'Acésulfame K', func: 'Édulcorant', risk: 'a_risque', description: 'Édulcorant intense (~200 fois le sucre). Des études récentes suggèrent des effets sur le microbiote intestinal et la régulation de l’appétit.', risks: ['Effets possibles sur le microbiote intestinal (études récentes)', 'Avis OMS 2023 : édulcorants non recommandés pour le contrôle du poids'] },
  { code: 'e951', name: 'Aspartame', func: 'Édulcorant', risk: 'a_risque', description: 'Édulcorant intense parmi les plus étudiés. Classé « peut-être cancérogène pour l’homme » par le CIRC (groupe 2B, 2023) sur des données limitées ; l’EFSA maintient une dose journalière jugée sûre.', risks: ['Cancérogène possible (CIRC, groupe 2B, 2023)', 'Contre-indiqué en cas de phénylcétonurie', 'Effets sur l’appétit suspectés'] },
  { code: 'e952', name: 'Acide cyclamique et ses sels', func: 'Édulcorant', risk: 'risque_limite', description: 'Édulcorant interdit aux États-Unis depuis 1969 après des études contestées sur des tumeurs de vessie ; autorisé dans l’UE.', risks: ['Interdit aux États-Unis', 'Cancérogénicité débattue (études anciennes)'] },
  { code: 'e953', name: 'Isomalt', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol dérivé du sucre (bonbons sans sucre) ; toléré mais laxatif au-delà d’un certain seuil.', risks: ['Effet laxatif à forte dose', 'Fermentation intestinale (ballonnements)'] },
  { code: 'e954', name: 'Saccharine et ses sels', func: 'Édulcorant', risk: 'risque_limite', description: 'Le plus ancien édulcorant de synthèse. Les anciens soupçons de cancer de vessie ont été levés, mais l’effet sur l’appétit reste discuté.', risks: ['Effets sur l’appétit suspectés', 'Avis OMS 2023 : usage non recommandé pour le contrôle du poids'] },
  { code: 'e955', name: 'Sucralose', func: 'Édulcorant', risk: 'risque_limite', description: 'Édulcorant stable à la cuisson. Des études récentes suggèrent des effets sur le microbiote et la glycémie.', risks: ['Altération possible du microbiote intestinal (études récentes)', 'Avis OMS 2023 : non recommandé pour le contrôle du poids'] },
  { code: 'e957', name: 'Thaumatine', func: 'Édulcorant', risk: 'sans_risque', description: 'Protéine sucrée naturelle extraite d’un fruit d’Afrique de l’Ouest (katemfe), digérée comme une protéine.', risks: [] },
  { code: 'e959', name: 'Néohespéridine dihydrochalcone', func: 'Édulcorant', risk: 'sans_risque', description: 'Édulcorant intense extrait des écorces d’agrumes.', risks: [] },
  { code: 'e960', name: 'Glycosides de stéviol (stévia)', func: 'Édulcorant', risk: 'sans_risque', description: 'Édulcorant naturel extrait des feuilles de stévia.', risks: [] },
  { code: 'e961', name: 'Néotame', func: 'Édulcorant', risk: 'risque_limite', description: 'Dérivé de l’aspartame beaucoup plus sucrant ; réévalué sans préoccupation par l’EFSA, mais rattaché aux mêmes interrogations que sa famille.', risks: ['Dérivé de l’aspartame (E951)', 'Avis OMS 2023 : édulcorants non recommandés pour le contrôle du poids'] },
  { code: 'e962', name: 'Sel d’aspartame-acésulfame', func: 'Édulcorant', risk: 'risque_limite', description: 'Sel associant aspartame (E951) et acésulfame K (E950).', risks: ['Libère de l’aspartame (E951)', 'Contre-indiqué en cas de phénylcétonurie'] },
  { code: 'e965', name: 'Maltitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol au pouvoir sucrant proche du sucre (chocolats « sans sucre ajouté »).', risks: ['Effet laxatif à forte dose', 'Fermentation intestinale (ballonnements)'] },
  { code: 'e966', name: 'Lactitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol dérivé du lactose (pâtisseries sans sucre).', risks: ['Effet laxatif à forte dose', 'Contient des sucres du lait (intolérance possible)'] },
  { code: 'e967', name: 'Xylitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol des chewing-gums ; reconnu protecteur contre les caries dentaires.', risks: ['Effet laxatif à forte dose', 'Très toxique pour les chiens'] },
  { code: 'e968', name: 'Érythritol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol peu calorique bien toléré digestivement ; des études 2023 ont soulevé un possible lien avec des événements cardiovasculaires à forte dose.', risks: ['Possible lien cardiovasculaire à forte dose (études 2023, débattu)', 'Avis OMS 2023 : non recommandé pour le contrôle du poids'] },
  { code: 'e999', name: 'Extrait de quillaia (bois de Panama)', func: 'Émulsifiant', risk: 'risque_limite', description: 'Extrait d’écorce riche en saponines, agent moussant des boissons ; usage limité par une dose journalière.', risks: ['Saponines : dose journalière fixée par l’EFSA', 'Effet irritant possible à forte dose'] },

  // ── Enzymes et polymères ───────────────────────────────────
  { code: 'e1100', name: 'Alpha-amylase', func: 'Enzyme', risk: 'sans_risque', description: 'Enzyme qui découpe l’amidon (panification, sirops de glucose). Produite par fermentation, inactivée à la cuisson.', risks: [] },
  { code: 'e1101', name: 'Protéases (pepsine, trypsine)', func: 'Enzyme', risk: 'sans_risque', description: 'Enzymes qui découpent les protéines (fromages, extraits de viande) ; inactivées à la cuisson.', risks: ['Origine animale possible (porc, pancréas de bœuf)'] },
  { code: 'e1102', name: 'Glucose oxydase', func: 'Enzyme', risk: 'sans_risque', description: 'Enzyme qui consomme l’oxygène (conservation des œufs, mayonnaises).', risks: [] },
  { code: 'e1103', name: 'Invertase', func: 'Enzyme', risk: 'sans_risque', description: 'Enzyme qui convertit le saccharose (confiseries fourrées, fondants).', risks: [] },
  { code: 'e1104', name: 'Lipase', func: 'Enzyme', risk: 'sans_risque', description: 'Enzyme qui découpe les graisses (arômes fromagers, pâtisserie).', risks: [] },
  { code: 'e1105', name: 'Lysozyme', func: 'Conservateur', risk: 'risque_limite', description: 'Enzyme extraite du blanc d’œuf, utilisée en fromagerie.', risks: ['Allergène œuf (étiquetage obligatoire)'] },
  { code: 'e1200', name: 'Polydextrose', func: 'Épaississant', risk: 'sans_risque', description: 'Fibre de synthèse à partir de glucose (remplaçant du sucre et de la matière grasse) ; effet laxatif possible à très forte dose.', risks: [] },
  { code: 'e1201', name: 'Polyvinylpyrrolidone (PVP)', func: 'Stabilisant', risk: 'risque_limite', description: 'Polymère de synthèse (clarification, support de colorants) ; autorisé avec une dose journalière.', risks: ['Polymère de synthèse non absorbé', 'Dose journalière fixée par l’EFSA'] },
  { code: 'e1202', name: 'Polyvinylpolypyrrolidone (PVPP)', func: 'Stabilisant', risk: 'risque_limite', description: 'Polymère insoluble (clarification du vin et de la bière, éliminé avant conditionnement).', risks: ['Polymère de synthèse (éliminé du produit fini)'] },

  // ── Solvants et supports ───────────────────────────────────
  { code: 'e1505', name: 'Citrate de triéthyle', func: 'Support', risk: 'sans_risque', description: 'Solvant/porteuse d’arômes, évalué sans préoccupation par l’EFSA aux usages actuels.', risks: [] },
  { code: 'e1510', name: 'Éthanol', func: 'Solvant', risk: 'sans_risque', description: 'Alcool utilisé comme support d’arômes et d’extraits (s’évapore en partie à la cuisson).', risks: [] },
  { code: 'e1518', name: 'Triacétine (triacétate de glycérol)', func: 'Support', risk: 'sans_risque', description: 'Solvant des arômes et humectant des chewing-gums, issu de glycérine.', risks: [] },
  { code: 'e1519', name: 'Alcool benzylique', func: 'Solvant', risk: 'sans_risque', description: 'Solvant des arômes ; présent naturellement dans de nombreux fruits.', risks: [] },
  { code: 'e1520', name: 'Propylène glycol', func: 'Humectant', risk: 'risque_limite', description: 'Humectant et support d’arômes très répandu ; l’EFSA a fixé une dose journalière et signale une accumulation possible chez le nourrisson.', risks: ['Dose journalière fixée par l’EFSA', 'Accumulation possible chez le nourrisson'] },
];

export const ADDITIVES: Readonly<Record<string, AdditiveInfo>> = Object.fromEntries(
  ADDITIVE_LIST.map((a) => [a.code, a]),
);

/** Libellés FR des niveaux de risque. */
export const RISK_LABELS: Record<AdditiveRisk, string> = {
  sans_risque: 'Sans risque',
  risque_limite: 'Risque limité',
  a_risque: 'À risque',
};

/** Pastilles colorées par risque (badges « E250 »…). */
export const RISK_BADGE_STYLES: Record<AdditiveRisk, string> = {
  sans_risque: 'bg-emerald-100 text-emerald-700',
  risque_limite: 'bg-amber-100 text-amber-700',
  a_risque: 'bg-red-100 text-red-700',
};

/** Points de couleur par risque (résumés du classement). */
export const RISK_DOT_STYLES: Record<AdditiveRisk, string> = {
  sans_risque: 'bg-emerald-500',
  risque_limite: 'bg-amber-500',
  a_risque: 'bg-red-500',
};

/** Ordre d’affichage des groupes de risque (du plus préoccupant au plus sûr). */
export const RISK_ORDER: readonly AdditiveRisk[] = ['a_risque', 'risque_limite', 'sans_risque'];

// Variante d'un code additif : suffixe romain (E322i, E304ii) ou lettre
// latine (E160a) après la partie numérique. OFF indexe les variantes
// précises quand la réglementation les distingue (ex: « e322i »), y
// compris cumulées : base + lettre + romain (ex: « e160ai » = E160a i).
const VARIANT_SUFFIX_RE = /^(e\d+[a-z]?)(i{1,3}|iv|vi{0,3}|ix|x|[a-e])$/;

/**
 * Résout un code en fiche de base : « e322i » → fiche « e322 » (lécithines),
 * « e160ai » → « e160a ». Jusqu'à 3 suffixes retirés (ex: « e304ii » → « e304 »).
 */
function baseAdditiveInfo(code: string): AdditiveInfo | undefined {
  let current = code;
  for (let depth = 0; depth < 3; depth += 1) {
    const info = ADDITIVES[current];
    if (info) return current === code ? info : { ...info, code };
    const match = VARIANT_SUFFIX_RE.exec(current);
    if (!match) return undefined;
    current = match[1];
  }
  return ADDITIVES[current];
}

/** Fiche d'un additif ; repli prudent (risque limité) si inconnu de la base. */
export function getAdditiveInfo(tag: string): AdditiveInfo {
  const code = tag.trim().toLowerCase();
  return (
    baseAdditiveInfo(code) ?? {
      code,
      name: code.toUpperCase(),
      func: 'Additif',
      risk: 'risque_limite',
      description:
        'Cet additif n’est pas encore documenté dans notre base : par précaution, nous lui appliquons un risque limité.',
      risks: ['Données insuffisantes (additif peu documenté)'],
    }
  );
}

/** Tags → fiches, dédupliquées, ordre conservé. */
export function additivesInfos(tags: string[]): AdditiveInfo[] {
  const seen = new Set<string>();
  const infos: AdditiveInfo[] = [];
  for (const tag of tags) {
    const info = getAdditiveInfo(tag);
    if (seen.has(info.code)) continue;
    seen.add(info.code);
    infos.push(info);
  }
  return infos;
}

/** Classement des additifs par niveau de risque (groupes ordonnés selon
    RISK_ORDER ; un groupe vide n’apparaît pas). */
export function classifyByRisk(infos: AdditiveInfo[]): { risk: AdditiveRisk; items: AdditiveInfo[] }[] {
  return RISK_ORDER.map((risk) => ({ risk, items: infos.filter((a) => a.risk === risk) })).filter(
    (g) => g.items.length > 0,
  );
}
