// ─────────────────────────────────────────────────────────────
// Base locale des additifs alimentaires (données ouvertes).
//
// Sources : taxonomie « additives » d’Open Food Facts (noms FR,
// familles d’usage) croisée avec les évaluations publiques EFSA,
// ANSES et CIRC (réévaluations, doses journalières admissibles,
// classifications de cancérogénicité). Consultées en août 2026.
//
// Classification volontairement simple en 3 niveaux :
// - sans risque : aucun effet indésirable établi aux doses usuelles ;
// - risque limité : suspicions ou effets à forte dose (digestifs,
//   allergiques, apport excessif en phosphore…) ;
// - à risque : préoccupations documentées (cancérogènes possibles,
//   hyperactivité, perturbation endocrinienne…).
//
// Le groupe « à risque » correspond exactement au périmètre
// HIGH_RISK_ADDITIVES historique de lib/productAnalysis : la note
// d’un produit n’est donc pas modifiée par cette base, seul
// l’affichage détaillé s’enrichit. Additif absent de la base →
// repli prudent « risque limité ».
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
  { code: 'e150c', name: 'Caramel à l’ammoniac', func: 'Colorant', risk: 'risque_limite', description: 'Caramel produit en présence d’ammoniac. Peut contenir des traces de 4-MÉI, composé formé à la cuisson et surveillé par l’EFSA.', risks: ['Traces possibles de 4-MÉI (suspecté cancérogène)'] },
  { code: 'e150d', name: 'Caramel au sulfite d’ammonium', func: 'Colorant', risk: 'risque_limite', description: 'Caramel le plus utilisé (boissons cola). Même préoccupation que les autres caramels à l’ammoniac concernant le 4-MÉI.', risks: ['Traces possibles de 4-MÉI (suspecté cancérogène)'] },
  { code: 'e160a', name: 'Carotènes', func: 'Colorant', risk: 'sans_risque', description: 'Pigments orange naturels (provitamine A) extraits des carottes ou d’algues.', risks: [] },
  { code: 'e160b', name: 'Rocou (annatto)', func: 'Colorant', risk: 'risque_limite', description: 'Colorant naturel extrait des graines de rocou ; quelques cas d’allergie rapportés.', risks: ['Réactions allergiques rares rapportées'] },
  { code: 'e160c', name: 'Extrait de paprika', func: 'Colorant', risk: 'sans_risque', description: 'Pigments naturels du paprika (capsanthéine).', risks: [] },
  { code: 'e160d', name: 'Lycopène', func: 'Colorant', risk: 'sans_risque', description: 'Pigment rouge naturel de la tomate, antioxydant.', risks: [] },
  { code: 'e160e', name: 'Bêta-apo-8’-caroténal', func: 'Colorant', risk: 'sans_risque', description: 'Dérivé de synthèse du carotène (provitamine A).', risks: [] },
  { code: 'e161b', name: 'Lutéine', func: 'Colorant', risk: 'sans_risque', description: 'Pigment naturel présent dans les épinards et le jaune d’œuf, bénéfique pour la vision.', risks: [] },
  { code: 'e162', name: 'Rouge de betterave', func: 'Colorant', risk: 'sans_risque', description: 'Colorant naturel extrait des betteraves (bétanine).', risks: [] },
  { code: 'e163', name: 'Anthocyanes', func: 'Colorant', risk: 'sans_risque', description: 'Pigments naturels des fruits rouges et des légumes violets.', risks: [] },
  { code: 'e170', name: 'Carbonate de calcium', func: 'Colorant', risk: 'sans_risque', description: 'Chaux naturelle, source de calcium ; sert aussi d’antiagglomérant.', risks: [] },
  { code: 'e171', name: 'Dioxyde de titane', func: 'Colorant', risk: 'a_risque', description: 'Colorant blanc nanoparticulaire. L’EFSA n’a pas pu écarter un risque génotoxique : interdit comme additif alimentaire dans l’UE depuis 2022.', risks: ['Génotoxicité possible non écartée (EFSA)', 'Interdit dans l’UE depuis 2022 (nanoparticules)'] },
  { code: 'e172', name: 'Oxydes et hydroxydes de fer', func: 'Colorant', risk: 'sans_risque', description: 'Pigments minéraux naturels (fer).', risks: [] },
  { code: 'e173', name: 'Aluminium', func: 'Colorant', risk: 'risque_limite', description: 'Métal utilisé pour les décorations argentées. L’EFSA a fortement réduit sa dose hebdomadaire tolérable.', risks: ['Accumulation possible dans l’organisme', 'Dose tolérable abaissée par l’EFSA', 'Exclu du cahier des charges bio'] },
  { code: 'e174', name: 'Argent', func: 'Colorant', risk: 'risque_limite', description: 'Métal décoratif, usage très restreint dans l’UE.', risks: ['Accumulation possible à forte dose'] },
  { code: 'e180', name: 'Litholrubine BK', func: 'Colorant', risk: 'risque_limite', description: 'Colorant azoïque réservé en Europe au seul enrobage des croûtes de fromage.', risks: ['Données toxicologiques anciennes', 'Usage très restreint dans l’UE'] },

  // ── Conservateurs ──────────────────────────────────────────
  { code: 'e200', name: 'Acide sorbique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide issu des baies du sorbier ; inhibe moisissures et levures.', risks: [] },
  { code: 'e202', name: 'Sorbate de potassium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de potassium de l’acide sorbique, très répandu (yaourts, pâtisseries).', risks: [] },
  { code: 'e210', name: 'Acide benzoïque', func: 'Conservateur', risk: 'risque_limite', description: 'Conservateur des boissons gazeuses. Peut réagir avec la vitamine C pour former des traces de benzène.', risks: ['Formation possible de benzène en présence de vitamine C (E300)'] },
  { code: 'e211', name: 'Benzoate de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium de l’acide benzoïque, très courant dans les sodas et sauces.', risks: ['Formation possible de benzène en présence de vitamine C (E300)', 'Urticaire et asthme aggravés chez les personnes sensibles'] },
  { code: 'e220', name: 'Anhydride sulfureux', func: 'Conservateur', risk: 'risque_limite', description: 'Sulfite utilisé dans le vin et les fruits secs ; allergène à étiquetage obligatoire.', risks: ['Crises d’asthme chez les personnes sensibles', 'Destruction partielle de la vitamine B1', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e221', name: 'Sulfite de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Sel de sodium du sulfite, même famille que E220 (vins, fruits secs).', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e223', name: 'Disulfite de sodium', func: 'Conservateur', risk: 'risque_limite', description: 'Métabisulfite de sodium (famille des sulfites) : vin, crustacés, pommes de terre transformées.', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e224', name: 'Métabisulfite de potassium', func: 'Conservateur', risk: 'risque_limite', description: 'Métabisulfite de potassium (famille des sulfites), surtout utilisé en vinification.', risks: ['Crises d’asthme chez les personnes sensibles', 'Allergène à déclaration obligatoire (UE)'] },
  { code: 'e234', name: 'Nisine', func: 'Conservateur', risk: 'sans_risque', description: 'Peptide antibactérien produit par fermentation laitière, détruit par la digestion.', risks: [] },
  { code: 'e235', name: 'Natamycine', func: 'Conservateur', risk: 'sans_risque', description: 'Antifongique naturel appliqué en surface des fromages ; très peu absorbé par l’organisme.', risks: [] },
  { code: 'e249', name: 'Nitrite de potassium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur de charcuterie : il bloque le botulisme mais forme des nitrosamines à la cuisson.', risks: ['Formation de nitrosamines cancérogènes à la cuisson', 'Lien établi avec les cancers colorectaux (CIRC/OMS)', 'Dose journalière abaissée par l’EFSA (2023)'] },
  { code: 'e250', name: 'Nitrite de sodium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur emblématique des charcuteries (jambon, saucisses). Même problématique que les autres nitrites.', risks: ['Formation de nitrosamines cancérogènes à la cuisson', 'Lien établi avec les cancers colorectaux (CIRC/OMS)', 'Dose journalière abaissée par l’EFSA (2023)'] },
  { code: 'e251', name: 'Nitrate de sodium', func: 'Conservateur', risk: 'a_risque', description: 'Conservateur converti en nitrites dans l’organisme (même problématique que E249-E250).', risks: ['Conversion en nitrites dans l’organisme', 'Formation possible de nitrosamines', 'Lien établi avec les cancers colorectaux (CIRC/OMS)'] },
  { code: 'e252', name: 'Nitrate de potassium', func: 'Conservateur', risk: 'a_risque', description: 'Sel de salpêtre traditionnel des charcuteries, converti en nitrites dans le corps.', risks: ['Conversion en nitrites dans l’organisme', 'Formation possible de nitrosamines'] },
  { code: 'e260', name: 'Acide acétique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide du vinaigre, obtenu par fermentation.', risks: [] },
  { code: 'e262', name: 'Acétates de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Sels de sodium de l’acide acétique (vinaigre).', risks: [] },
  { code: 'e270', name: 'Acide lactique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide naturel de la fermentation (yaourt, choucroute).', risks: [] },
  { code: 'e280', name: 'Acide propionique', func: 'Conservateur', risk: 'sans_risque', description: 'Acide gras court produit par fermentation ; inhibe les moisissures du pain.', risks: [] },
  { code: 'e281', name: 'Propionate de sodium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de sodium de l’acide propionique (pain industriel).', risks: [] },
  { code: 'e282', name: 'Propionate de calcium', func: 'Conservateur', risk: 'sans_risque', description: 'Sel de calcium de l’acide propionique, utilisé dans le pain et les pâtisseries.', risks: [] },
  { code: 'e290', name: 'Dioxyde de carbone', func: 'Conservateur', risk: 'sans_risque', description: 'Gaz des boissons pétillantes (pétillance).', risks: [] },
  { code: 'e296', name: 'Acide malique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide naturel de la pomme.', risks: [] },
  { code: 'e297', name: 'Acide fumarique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide organique de synthèse, proche de l’acide malique.', risks: [] },
  { code: 'e1105', name: 'Lysozyme', func: 'Conservateur', risk: 'risque_limite', description: 'Enzyme extraite du blanc d’œuf, utilisée en fromagerie.', risks: ['Allergène œuf (étiquetage obligatoire)'] },

  // ── Antioxydants et acides ─────────────────────────────────
  { code: 'e300', name: 'Acide ascorbique', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine C naturelle ou de synthèse ; antioxydant et conservateur de couleur.', risks: [] },
  { code: 'e301', name: 'Ascorbate de sodium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de sodium de la vitamine C.', risks: [] },
  { code: 'e302', name: 'Ascorbate de calcium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de calcium de la vitamine C.', risks: [] },
  { code: 'e304', name: 'Palmitate d’ascorbyle', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine C liposoluble, adaptée à la protection des graisses.', risks: [] },
  { code: 'e306', name: 'Tocophérols d’extraction', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine E naturelle extraite de tourteaux végétaux (soja, tournesol).', risks: [] },
  { code: 'e307', name: 'Alpha-tocophérol', func: 'Antioxydant', risk: 'sans_risque', description: 'Vitamine E de synthèse (idem E308-E309 pour les autres formes).', risks: [] },
  { code: 'e310', name: 'Gallate de propyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses. L’EFSA a fixé sa dose journalaire à partir d’effets thyroïdiens observés chez l’animal.', risks: ['Effets sur la thyroïde à forte dose (études animales)'] },
  { code: 'e311', name: 'Gallate d’octyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses, même famille que E310.', risks: ['Effets sur la thyroïde à forte dose (études animales)', 'Passage faible mais mesurable dans le sang'] },
  { code: 'e312', name: 'Gallate de dodécyle', func: 'Antioxydant', risk: 'risque_limite', description: 'Antioxydant de synthèse des graisses, même famille que E310.', risks: ['Effets sur la thyroïde à forte dose (études animales)'] },
  { code: 'e315', name: 'Acide érythorbique', func: 'Antioxydant', risk: 'sans_risque', description: 'Isomère de la vitamine C : pouvoir antioxydant sans activité vitaminique.', risks: [] },
  { code: 'e316', name: 'Érythorbate de sodium', func: 'Antioxydant', risk: 'sans_risque', description: 'Sel de sodium de l’acide érythorbique, très utilisé en charcuterie.', risks: [] },
  { code: 'e320', name: 'BHA (hydroxyanisole butylé)', func: 'Antioxydant', risk: 'a_risque', description: 'Antioxydant de synthèse des graisses. Classé « peut-être cancérogène » par le CIRC ; perturbateur endocrinien suspecté.', risks: ['Cancérogène possible (CIRC, groupe 2B)', 'Perturbation endocrinienne suspectée', 'Effets sur le foie et les reins à forte dose'] },
  { code: 'e321', name: 'BHT (hydroxytoluène butylé)', func: 'Antioxydant', risk: 'a_risque', description: 'Antioxydant de synthèse proche du BHA ; dose journalière revue à la baisse, perturbation endocrinienne suspectée.', risks: ['Perturbation endocrinienne suspectée', 'Cancérogénicité débattue (études animales)', 'Effets hépatiques à forte dose'] },
  { code: 'e322', name: 'Lécithines', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant naturel extrait du soja ou du tournesol (lécithine). Allergène soja à étiquetage obligatoire le cas échéant.', risks: [] },
  { code: 'e325', name: 'Lactate de sodium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de sodium de l’acide lactique ; retient l’eau et régule l’acidité.', risks: [] },
  { code: 'e326', name: 'Lactate de potassium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de potassium de l’acide lactique.', risks: [] },
  { code: 'e327', name: 'Lactate de calcium', func: 'Humectant', risk: 'sans_risque', description: 'Sel de calcium de l’acide lactique, aussi ferme les légumes.', risks: [] },
  { code: 'e330', name: 'Acide citrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide du citron, l’acidifiant le plus répandu.', risks: [] },
  { code: 'e331', name: 'Citrates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide citrique (régulateurs d’acidité).', risks: [] },
  { code: 'e332', name: 'Citrates de potassium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de potassium de l’acide citrique.', risks: [] },
  { code: 'e333', name: 'Citrates de calcium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de calcium de l’acide citrique, source de calcium.', risks: [] },
  { code: 'e334', name: 'Acide tartrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide du raisin, produit industriellement par fermentation.', risks: [] },
  { code: 'e335', name: 'Tartrates de sodium', func: 'Acidifiant', risk: 'sans_risque', description: 'Sels de sodium de l’acide tartrique.', risks: [] },
  { code: 'e338', name: 'Acide phosphorique', func: 'Acidifiant', risk: 'risque_limite', description: 'Acide des boissons cola. Les phosphates additifs sont pointés en cas d’excès pour la santé rénale et osseuse.', risks: ['Apport phosphoré excessif : os et reins', 'Érosion dentaire (boissons acides)'] },
  { code: 'e339', name: 'Phosphates de sodium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de sodium : texture des fromages fondus et viandes. Excès de phosphates additifs surveillé par l’ANSES.', risks: ['Apport phosphoré excessif : os et reins', 'Risque cardiovasculaire associé à l’excès (ANSES)'] },
  { code: 'e340', name: 'Phosphates de potassium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de potassium : fromages fondus, viandes, poudres à lever.', risks: ['Apport phosphoré excessif : os et reins', 'Risque cardiovasculaire associé à l’excès (ANSES)'] },
  { code: 'e341', name: 'Phosphates de calcium', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate de calcium : fromages fondus, panures. Même réserve que les autres phosphates additifs.', risks: ['Apport phosphoré excessif : os et reins'] },

  // ── Épaississants, gommes, émulsifiants ────────────────────
  { code: 'e406', name: 'Agar-agar', func: 'Gélifiant', risk: 'sans_risque', description: 'Gélifiant extrait d’algues rouges, alternative végétale à la gélatine.', risks: [] },
  { code: 'e407', name: 'Carraghénanes', func: 'Épaississant', risk: 'risque_limite', description: 'Extraits d’algues rouges très utilisés (desserts lactés). Suspectés de favoriser l’inflammation intestinale ; réévaluation par l’EFSA en cours.', risks: ['Inflammation intestinale suspectée (études animales)', 'Effet laxatif à forte dose'] },
  { code: 'e407a', name: 'Algues Eucheuma traitées', func: 'Épaississant', risk: 'risque_limite', description: 'Semoule d’algues voisine des carraghénanes ; mêmes réserves que E407.', risks: ['Inflammation intestinale suspectée (études animales)'] },
  { code: 'e410', name: 'Gomme de caroube', func: 'Épaississant', risk: 'sans_risque', description: 'Farine de graines de caroube, épaississant naturel (glaces, compotes).', risks: [] },
  { code: 'e412', name: 'Gomme guar', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme de graines de guar, riche en fibres.', risks: [] },
  { code: 'e413', name: 'Gomme adragante', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme naturelle (astragale), épaississant et stabilisant.', risks: [] },
  { code: 'e414', name: 'Gomme arabique', func: 'Épaississant', risk: 'sans_risque', description: 'Gomme d’acacia, fibre naturelle des sodas et confiseries.', risks: [] },
  { code: 'e415', name: 'Gomme xanthane', func: 'Épaississant', risk: 'sans_risque', description: 'Polysaccharide produit par fermentation ; très répandu (produits sans gluten).', risks: [] },
  { code: 'e418', name: 'Gomme gellane', func: 'Épaississant', risk: 'sans_risque', description: 'Gélifiant obtenu par fermentation.', risks: [] },
  { code: 'e420', name: 'Sorbitol', func: 'Édulcorant et humectant', risk: 'risque_limite', description: 'Polyol (sucre-alcool) extrait du glucose, édulcorant et humectant.', risks: ['Effet laxatif à forte dose', 'Ballonnements et fermentation intestinale'] },
  { code: 'e421', name: 'Mannitol', func: 'Édulcorant et humectant', risk: 'risque_limite', description: 'Polyol extrait de fruits et algues, peu calorique.', risks: ['Effet laxatif à forte dose', 'Fermentation intestinale'] },
  { code: 'e422', name: 'Glycérol', func: 'Humectant', risk: 'sans_risque', description: 'Glycérine : retient l’humidité des pâtisseries.', risks: [] },
  { code: 'e440', name: 'Pectines', func: 'Gélifiant', risk: 'sans_risque', description: 'Fibres solubles des fruits, gélifiant des confitures.', risks: [] },
  { code: 'e442', name: 'Phosphatides d’ammonium', func: 'Émulsifiant', risk: 'risque_limite', description: 'Lécithine modifiée de colza, très utilisée en chocolaterie (famille des phosphates).', risks: ['Apport phosphoré (famille des phosphates additifs)'] },
  { code: 'e445', name: 'Esters glycériques de résines de bois', func: 'Émulsifiant', risk: 'sans_risque', description: 'Agent trouble des boissons aux agrumes, issu de résines de pin.', risks: [] },
  { code: 'e450', name: 'Diphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphates condensés : fromages fondus, viandes reconstituées, poudres à lever.', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e451', name: 'Triphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Phosphate le plus courant des surimis et charcuteries (rétention d’eau).', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e452', name: 'Polyphosphates', func: 'Stabilisant', risk: 'risque_limite', description: 'Mélanges de phosphates condensés (fromages fondus, viandes).', risks: ['Apport phosphoré excessif : os, reins, cardiovasculaire'] },
  { code: 'e460', name: 'Cellulose', func: 'Agent de texture', risk: 'sans_risque', description: 'Fibre de cellulose purifiée (poudre de bois).', risks: [] },
  { code: 'e461', name: 'Méthylcellulose', func: 'Épaississant', risk: 'sans_risque', description: 'Cellulose modifiée, épaississant courant des produits sans gluten.', risks: [] },
  { code: 'e466', name: 'Carboxyméthylcellulose', func: 'Épaississant', risk: 'risque_limite', description: 'Cellulose modifiée très courante (glaces, sauces). Des études récentes suggèrent un effet sur le microbiote intestinal.', risks: ['Altération possible du microbiote intestinal (études récentes)', 'Inflammation intestinale suspectée'] },
  { code: 'e470a', name: 'Sels d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Sels de sodium, potassium ou calcium d’acides gras naturels.', risks: [] },
  { code: 'e471', name: 'Mono- et diglycérides d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant obtenu à partir de graisses et de glycérol, proche des graisses naturelles ; le plus répandu.', risks: [] },
  { code: 'e472a', name: 'Esters acétiques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide acétique.', risks: [] },
  { code: 'e472c', name: 'Esters citriques de mono- et diglycérides', func: 'Émulsifiant', risk: 'sans_risque', description: 'Mono- et diglycérides estérifiés à l’acide citrique.', risks: [] },
  { code: 'e475', name: 'Esters polyglycériques d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant de pâtisserie (mousses, fourrages).', risks: [] },
  { code: 'e476', name: 'Polyricinoléate de polyglycérol', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant issu de l’huile de ricin qui fluidifie le chocolat.', risks: [] },
  { code: 'e477', name: 'Esters de propylène glycol et d’acides gras', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant des pâtisseries et mousses aériennes.', risks: [] },
  { code: 'e481', name: 'Stéaroyl-2-lactylate de sodium', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant du pain industriel (acide gras + acide lactique).', risks: [] },
  { code: 'e491', name: 'Monostéarate de sorbitane', func: 'Émulsifiant', risk: 'sans_risque', description: 'Émulsifiant des chocolats et desserts.', risks: [] },
  { code: 'e500', name: 'Carbonates de sodium', func: 'Agent levant', risk: 'sans_risque', description: 'Sels alcalins du bicarbonate : pâtisserie, fromage fondu.', risks: [] },
  { code: 'e501', name: 'Carbonates de potassium', func: 'Agent levant', risk: 'sans_risque', description: 'Sel de potassium alcalin (cacao, biscuits).', risks: [] },
  { code: 'e503', name: 'Carbonates d’ammonium', func: 'Agent levant', risk: 'sans_risque', description: 'Levure chimique des biscuits ; s’évapore entièrement à la cuisson.', risks: [] },
  { code: 'e504', name: 'Carbonates de magnésium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Sel de magnésium anti-mottes (sel de table, poudres).', risks: [] },
  { code: 'e507', name: 'Acide chlorhydrique', func: 'Acidifiant', risk: 'sans_risque', description: 'Acide naturel de l’estomac, utilisé comme régulateur d’acidité.', risks: [] },
  { code: 'e509', name: 'Chlorure de calcium', func: 'Agent de texture', risk: 'sans_risque', description: 'Sel de calcium : fermeté des légumes en conserve, fromages.', risks: [] },
  { code: 'e551', name: 'Dioxyde de silicium', func: 'Antiagglomérant', risk: 'sans_risque', description: 'Silice fine anti-mottes (poudres, sel). L’EFSA n’a pas identifié de préoccupation aux usages actuels.', risks: [] },
  { code: 'e570', name: 'Acide stéarique', func: 'Agent de texture', risk: 'sans_risque', description: 'Acide gras naturel anti-mottes.', risks: [] },
  { code: 'e575', name: 'Glucono-delta-lactone', func: 'Acidifiant', risk: 'sans_risque', description: 'Précurseur de l’acide gluconique (fromages, tofu).', risks: [] },
  { code: 'e1414', name: 'Phosphate d’amidon acétylé', func: 'Épaississant', risk: 'sans_risque', description: 'Amidon de maïs modifié, texture des sauces.', risks: [] },
  { code: 'e1442', name: 'Phosphate d’amidon hydroxypropylé', func: 'Épaississant', risk: 'sans_risque', description: 'Amidon modifié (produits laitiers, plats préparés).', risks: [] },

  // ── Exhausteurs de goût ────────────────────────────────────
  { code: 'e621', name: 'Glutamate monosodique (GMS)', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur « umami » très répandu (plats préparés, soupes). Controversé : intolérance rapportée par certaines personnes et rôle discuté dans la stimulation de l’appétit.', risks: ['Symptômes d’intolérance chez certaines personnes (maux de tête)', 'Stimulation de l’appétit suspectée (études sur l’obésité)'] },
  { code: 'e627', name: 'Guanylate disodique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur souvent combiné au glutamate pour renforcer le goût.', risks: ['Mêmes réserves que le glutamate (E621)'] },
  { code: 'e631', name: 'Inosinate disodique', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Exhausteur souvent combiné au glutamate ; fréquemment d’origine animale (poisson).', risks: ['Mêmes réserves que le glutamate (E621)', 'Souvent d’origine animale'] },
  { code: 'e635', name: 'Ribonucléotides de sodium', func: 'Exhausteur de goût', risk: 'risque_limite', description: 'Mélange des exhausteurs E627 et E631, très puissant (chips, soupes).', risks: ['Mêmes réserves que le glutamate (E621)', 'Possible origine animale'] },

  // ── Enrobages, silicones, farines ──────────────────────────
  { code: 'e900', name: 'Diméthylpolysiloxane', func: 'Anti-mousse', risk: 'sans_risque', description: 'Silicone anti-mousse des huiles de friture et confiseries ; non absorbé par l’organisme.', risks: [] },
  { code: 'e901', name: 'Cire d’abeille', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Cire naturelle donnant leur brillance aux bonbons et fruits enrobés.', risks: [] },
  { code: 'e903', name: 'Cire de candelilla', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Cire végétale d’origine mexicaine (enrobage, brillance).', risks: [] },
  { code: 'e904', name: 'Gomme-laque', func: 'Agent d’enrobage', risk: 'sans_risque', description: 'Résine naturelle sécrétée par un insecte, utilisée pour la brillance (origine animale).', risks: [] },
  { code: 'e924', name: 'Bromate de potassium', func: 'Agent de traitement de la farine', risk: 'a_risque', description: 'Améliorant de farine retiré de la liste européenne des additifs.', risks: ['Néphrotoxicité démontrée (études animales)', 'Cancérogène chez l’animal', 'Interdit dans l’UE'] },
  { code: 'e927a', name: 'Azodicarbonamide', func: 'Agent de traitement de la farine', risk: 'a_risque', description: 'Améliorant de farine et agent gonflant, interdit comme additif alimentaire dans l’UE.', risks: ['Métabolite (sémicarbazide) suspecté cancérogène', 'Irritant respiratoire (exposition professionnelle)', 'Interdit dans l’UE'] },

  // ── Édulcorants ────────────────────────────────────────────
  { code: 'e950', name: 'Acésulfame K', func: 'Édulcorant', risk: 'a_risque', description: 'Édulcorant intense (~200 fois le sucre). Des études récentes suggèrent des effets sur le microbiote intestinal et la régulation de l’appétit.', risks: ['Effets possibles sur le microbiote intestinal (études récentes)', 'Avis OMS 2023 : édulcorants non recommandés pour le contrôle du poids'] },
  { code: 'e951', name: 'Aspartame', func: 'Édulcorant', risk: 'a_risque', description: 'Édulcorant intense parmi les plus étudiés. Classé « peut-être cancérogène pour l’homme » par le CIRC (groupe 2B, 2023) sur des données limitées ; l’EFSA maintient une dose journalière jugée sûre.', risks: ['Cancérogène possible (CIRC, groupe 2B, 2023)', 'Contre-indiqué en cas de phénylcétonurie', 'Effets sur l’appétit suspectés'] },
  { code: 'e952', name: 'Acide cyclamique et ses sels', func: 'Édulcorant', risk: 'risque_limite', description: 'Édulcorant interdit aux États-Unis depuis 1969 après des études contestées sur des tumeurs de vessie ; autorisé dans l’UE.', risks: ['Interdit aux États-Unis', 'Cancérogénicité débattue (études anciennes)'] },
  { code: 'e954', name: 'Saccharine et ses sels', func: 'Édulcorant', risk: 'risque_limite', description: 'Le plus ancien édulcorant de synthèse. Les anciens soupçons de cancer de vessie ont été levés, mais l’effet sur l’appétit reste discuté.', risks: ['Effets sur l’appétit suspectés', 'Avis OMS 2023 : usage non recommandé pour le contrôle du poids'] },
  { code: 'e955', name: 'Sucralose', func: 'Édulcorant', risk: 'risque_limite', description: 'Édulcorant stable à la cuisson. Des études récentes suggèrent des effets sur le microbiote et la glycémie.', risks: ['Altération possible du microbiote intestinal (études récentes)', 'Avis OMS 2023 : non recommandé pour le contrôle du poids'] },
  { code: 'e960', name: 'Glycosides de stéviol (stévia)', func: 'Édulcorant', risk: 'sans_risque', description: 'Édulcorant naturel extrait des feuilles de stévia.', risks: [] },
  { code: 'e962', name: 'Sel d’aspartame-acésulfame', func: 'Édulcorant', risk: 'risque_limite', description: 'Sel associant aspartame (E951) et acésulfame K (E950).', risks: ['Libère de l’aspartame (E951)', 'Contre-indiqué en cas de phénylcétonurie'] },
  { code: 'e965', name: 'Maltitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol au pouvoir sucrant proche du sucre (chocolats « sans sucre ajouté »).', risks: ['Effet laxatif à forte dose', 'Fermentation intestinale (ballonnements)'] },
  { code: 'e966', name: 'Lactitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol dérivé du lactose (pâtisseries sans sucre).', risks: ['Effet laxatif à forte dose', 'Contient des sucres du lait (intolérance possible)'] },
  { code: 'e967', name: 'Xylitol', func: 'Édulcorant', risk: 'risque_limite', description: 'Polyol des chewing-gums ; reconnu protecteur contre les caries dentaires.', risks: ['Effet laxatif à forte dose', 'Très toxique pour les chiens'] },
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

/** Additifs à risque élevé — référence unique pour la pénalité de score
    (lib/productAnalysis) et le classement affiché dans le détail. */
export const HIGH_RISK_ADDITIVES: ReadonlySet<string> = new Set(
  ADDITIVE_LIST.filter((a) => a.risk === 'a_risque').map((a) => a.code),
);

/** Fiche d’un additif ; repli prudent (risque limité) si inconnu de la base. */
export function getAdditiveInfo(tag: string): AdditiveInfo {
  const code = tag.trim().toLowerCase();
  return (
    ADDITIVES[code] ?? {
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
