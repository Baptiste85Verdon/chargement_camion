/**
 * Tous les textes de l'interface, en français.
 * Aucun texte en dur dans les composants : ils viennent d'ici.
 */
export const textes = {
  application: {
    nom: 'Plan de chargement',
    societe: 'Négoce de matériaux · dépôt de Nantes',
  },
  /** Accueil · tournées (capture 01, CF 4.1). */
  accueil: {
    titre: 'Tournées',
    vide: 'Aucune tournée pour le moment. Créez-en une pour commencer.',
    resume: (total: number, enPreparation: number) =>
      `${total} ${total > 1 ? 'tournées' : 'tournée'} · ${enPreparation} en préparation`,
    creer: 'Créer une tournée',
    legende: 'Tournées',
    colonnes: {
      date: 'Date',
      tournee: 'Tournée',
      camion: 'Camion',
      commandes: 'Commandes',
      statut: 'Statut',
      ouvrir: 'Ouvrir',
    },
    dateAFixer: 'Date à fixer',
    camionAChoisir: 'À choisir',
    nombreCommandes: (n: number) => `${n} ${n > 1 ? 'commandes' : 'commande'}`,
    raccourcis: 'Accès rapides',
    catalogue: 'Catalogue des articles',
    catalogueResume: (articles: number, familles: number) =>
      `${articles} articles · ${familles} familles`,
    camions: 'Modèles de camions',
    camionsResume: (n: number) => `${n} ${n > 1 ? 'modèles' : 'modèle'}`,
    attente: "Liste d'attente",
    attenteResume: (n: number) =>
      n === 0
        ? 'Aucun élément en attente'
        : `${n} ${n > 1 ? 'éléments' : 'élément'} à affecter à une tournée`,
  },

  /** Préparation d'une tournée (captures 02 et 02e, CF 4.2). */
  preparation: {
    titre: 'Préparation de la tournée',
    ariane: (date: string) =>
      `Tournée du ${date.charAt(0).toLocaleLowerCase('fr')}${date.slice(1)}`,
    nouvelle: 'Nouvelle tournée',
    introuvable: "Cette tournée n'existe plus. Revenez à l'accueil pour actualiser la liste.",
    dateAFixer: 'Date à fixer',
    supprimer: 'Supprimer la tournée',
    supprimerTitre: (reference: string) => `Supprimer la tournée ${reference} ?`,
    supprimerConsequence: (n: number) =>
      n === 0
        ? 'Cette tournée ne contient aucune commande. Elle sera définitivement supprimée.'
        : `Ses ${n} ${n > 1 ? 'commandes et leurs plans seront' : 'commande et son plan sera'} définitivement ${n > 1 ? 'supprimés' : 'supprimé'}.`,
    supprimee: (reference: string) => `La tournée ${reference} est supprimée.`,
    dateCamion: '1. Date et camion',
    gererCamions: 'Gérer les modèles de camions',
    date: 'Date de livraison',
    camion: 'Camion',
    caisseDe: (volume: string) => `Caisse de ${volume}`,
    enregistre: 'Enregistré',
    changerCamionTitre: 'Changer le camion de la tournée ?',
    changerCamionConsequence: (version: number, actuel: string, nouveau: string) =>
      `Le plan version ${version} a été calculé pour le ${actuel}. Avec le ${nouveau}, il sera marqué « à recalculer » : relancez le calcul.`,
    changerCamionAction: 'Changer de camion',
    aRecalculer: 'Plan à recalculer',
    aRecalculerAide: 'Le camion a changé depuis le calcul. Relancez le calcul.',
    enregistreAuto: 'La date et le camion sont enregistrés dès que vous les changez.',
    commandes: '2. Commandes et ordre de livraison',
    ajouterAttente: "Ajouter depuis la liste d'attente",
    saisir: 'Saisir une commande',
    explicationOrdre:
      "La commande en tête de liste est livrée en premier. Le calcul la garde accessible depuis les portes à chaque livraison (RG-07). Glissez une commande, ou utilisez les flèches, pour changer l'ordre.",
    legende: 'Commandes de la tournée, dans l’ordre de livraison',
    colonnes: {
      poignee: 'Déplacer',
      livraison: 'Livraison',
      commande: 'Commande',
      articles: 'Articles',
      nombre: 'Nombre',
      poids: 'Poids',
      actions: 'Actions',
      ouvrir: 'Ouvrir',
    },
    rang: (n: number) => (n === 1 ? '1re' : `${n}e`),
    dimensionsPropres: 'Dimensions propres à la commande (RG-03)',
    monter: (code: string) => `Livrer ${code} plus tôt`,
    descendre: (code: string) => `Livrer ${code} plus tard`,
    glisser: (code: string) => `Glisser ${code} pour changer son rang`,
    supprimerCommande: 'Supprimer',
    supprimerCommandeTitre: (code: string, destination: string) =>
      `Supprimer la commande ${code} ${destination} ?`,
    supprimerCommandeConsequence:
      'La commande et ses lignes seront définitivement supprimées de cette tournée.',
    supprimerCommandeAction: 'Supprimer la commande',
    commandeSupprimee: (destination: string) => `La commande ${destination} est supprimée.`,
    ordreChange: (code: string, rang: string) => `${code} est maintenant livrée en ${rang}.`,
    aucuneCommande: 'Aucune commande dans cette tournée',
    aucuneCommandeAide: "Saisissez une commande, ou ajoutez-en une depuis la liste d'attente.",
    calcul: '3. Calcul du plan',
    resume: {
      camion: 'Camion',
      caisse: 'Caisse',
      commandes: 'Commandes',
      articles: 'Articles',
      volume: 'Volume',
      poids: 'Poids',
    },
    aChoisir: 'À choisir',
    volumeSur: (charge: string, caisse: string, part: string) =>
      `${charge} sur ${caisse} (${part})`,
    noteCalcul:
      "Le volume ne garantit pas que tout rentre : le calcul vérifie chaque placement et l'ordre de livraison. Le poids sert à placer les lourds en bas et à équilibrer la caisse ; la charge utile n'est pas contrôlée en V1 (RG-05).",
    lancer: 'Lancer le calcul',
    calculEnCours: 'Calcul en cours…',
    apresCalcul: "Le plan s'ouvre ensuite pour relecture et ajustement.",
    planCalcule: (version: number, places: number) =>
      `Plan version ${version} calculé : ${places} ${places > 1 ? 'articles placés' : 'article placé'}. La page du plan arrive à l'étape suivante du développement.`,
    planEnTrop: (n: number, codes: string) =>
      `${n} ${n > 1 ? 'articles ne rentrent pas' : 'article ne rentre pas'} (${codes}) : ils seront à reporter (RG-10, RG-11).`,
    dernierPlan: (version: number, date: string) =>
      `Dernier plan : version ${version}, calculée le ${date}.`,
    champs: {
      date: 'Date de livraison',
      modeleCamionId: 'Camion',
      commandes: 'Commandes',
    },
  },

  /** Saisie express d'une commande (captures 03, 03b, 03e ; CF 4.3). */
  saisieExpress: {
    titre: "Saisie express d'une commande",
    titreModification: (code: string) => `Modifier la commande ${code}`,
    ariane: 'Saisie express',
    codeDansTournee: (reference: string) => `code dans la tournée ${reference}`,
    introuvable: "Cette commande n'existe plus. Revenez à la tournée pour actualiser la liste.",
    commande: 'Commande',
    numero: 'Numéro',
    destination: 'Client ou destination',
    destinationAide: 'Nom du client ou du chantier',
    ville: 'Ville',
    catalogue: 'Ajouter depuis le catalogue',
    recherche: 'Rechercher un article',
    rechercheAide: 'Entrée ajoute le premier résultat.',
    recherchePlaceholder: 'Nom, référence ou famille',
    resultats: (n: number) => `${n} ${n > 1 ? 'articles' : 'article'}`,
    aucunResultat: 'Aucun article ne correspond. Modifiez la recherche.',
    ajouter: 'Ajouter',
    ajouterArticle: (nom: string) => `Ajouter ${nom}`,
    fragile: 'fragile',
    nu: (dims: string) => `nu ${dims}`,
    ligneAjoutee: (nom: string) => `${nom} ajouté à la commande.`,
    lignes: 'Lignes de la commande',
    unites: 'Dimensions en mm : longueur × largeur × hauteur',
    legende: 'Lignes de la commande',
    colonnes: {
      article: 'Article',
      quantite: 'Quantité',
      livraison: 'Livraison',
      dimensions: 'Dimensions',
      source: 'Source',
      poids: 'Poids unitaire',
      actions: 'Actions',
    },
    aucuneLigne: 'Aucune ligne. Recherchez un article dans le catalogue pour l’ajouter.',
    note: "Une dimension modifiée ici ne vaut que pour cette commande ; le catalogue n'est pas modifié (RG-03). Le poids est alors proposé au prorata du volume, marqué « estimé », et reste modifiable. Par défaut, la taille retenue est la taille maximale connue (RG-02).",
    quantite: (nom: string) => `Quantité de ${nom}`,
    moins: (nom: string) => `Retirer une unité de ${nom}`,
    plus: (nom: string) => `Ajouter une unité de ${nom}`,
    livraison: (nom: string) => `Livraison de ${nom}`,
    emballe: 'Emballé',
    nuLibelle: 'Nu',
    sansNu: "Cet article n'a pas de taille nue.",
    dimensions: (nom: string) => `Dimensions de ${nom}`,
    longueur: 'Longueur',
    largeur: 'Largeur',
    hauteur: 'Hauteur',
    sourceCatalogue: (nu: boolean) => (nu ? 'Catalogue, nu' : 'Catalogue, emballé'),
    sourcePropre: 'Propre à la commande',
    retablir: 'Rétablir le catalogue',
    retablirLigne: (nom: string) => `Rétablir le catalogue pour ${nom}`,
    poids: (nom: string) => `Poids unitaire de ${nom}`,
    estime: 'estimé',
    retirer: (nom: string) => `Retirer la ligne ${nom}`,
    ligneRetiree: (nom: string) => `Ligne ${nom} retirée.`,
    archive: 'archivé',
    resume: (lignes: number, articles: number, volume: string, poids: string) =>
      `${lignes} ${lignes > 1 ? 'lignes' : 'ligne'} · ${articles} ${articles > 1 ? 'articles' : 'article'} · ${volume} · ${poids}`,
    caisse: (camion: string, dims: string) => ` · caisse du ${camion} : ${dims} mm`,
    annuler: 'Annuler',
    enregistrer: 'Enregistrer la commande',
    enregistree: (destination: string) => `La commande ${destination} est enregistrée.`,
    aReplacer: (n: number) =>
      `${n} ${n > 1 ? 'lignes ajoutées ou modifiées ont' : 'ligne ajoutée ou modifiée a'} perdu sa place dans le plan : ${n > 1 ? 'elles sont' : 'elle est'} à replacer. Relancez le calcul.`,
    champLigne: (n: number, nom: string, champ: string) => `Ligne ${n}, ${nom}, ${champ}`,
    champs: {
      numero: 'Numéro',
      destination: 'Client ou destination',
      lignes: 'Lignes',
      quantite: 'quantité',
      dimsPropres: 'dimensions',
      poids: 'poids',
    },
  },

  /** Liste d'attente (capture 10, CF 4.8, RG-11). */
  attente: {
    titre: "Liste d'attente",
    intro:
      'Commandes et articles reportés après un dépassement (RG-11) ou un signalement (RG-13), à affecter à une prochaine tournée.',
    filtre: 'Filtrer par motif',
    tous: (n: number) => `Tous · ${n}`,
    depassement: 'Dépassement',
    signalement: 'Signalement',
    legende: 'Éléments en attente',
    colonnes: {
      element: 'Élément',
      type: 'Type',
      origine: "Tournée d'origine",
      motif: 'Motif',
      affectation: 'Affectation',
    },
    commandeEntiere: 'Commande entière',
    articlesReportes: 'Articles reportés',
    motifDepassement: (camion: string) =>
      camion
        ? `Ne rentrait pas dans le ${camion} (RG-10, RG-11)`
        : 'Ne rentrait pas dans le camion (RG-10, RG-11)',
    motifSignalement:
      'Retiré au chargement après un signalement ; la commande est partie incomplète (RG-12, RG-13)',
    reporteLe: (date: string) => `Reporté le ${date}`,
    origineInconnue: 'Tournée supprimée',
    tournee: (reference: string) => `Tournée de ${reference}`,
    choisirTournee: (element: string) => `Tournée d'affectation de ${element}`,
    optionTournee: (reference: string, date: string, camion: string) =>
      [reference, date, camion].filter(Boolean).join(' · '),
    aucuneTournee: 'Aucune tournée en préparation',
    affecter: 'Affecter',
    affecterElement: (element: string) => `Affecter ${element}`,
    affecte: (element: string, reference: string) =>
      `${element} est affecté à la tournée ${reference}, livré en dernier.`,
    supprimer: (element: string) => `Supprimer ${element} de la liste d'attente`,
    supprimerTitre: (element: string) => `Supprimer ${element} de la liste d'attente ?`,
    supprimerCommandeConsequence:
      'La commande et ses lignes seront définitivement supprimées. Elle ne pourra plus être affectée à une tournée.',
    supprimerArticlesConsequence:
      "Les articles quittent la liste d'attente. Ils restent dans leur commande d'origine, comme non livrés.",
    supprimerAction: "Supprimer de la liste d'attente",
    supprime: (element: string) => `${element} est retiré de la liste d'attente.`,
    vide: 'Aucun élément en attente. Les commandes et articles reportés apparaîtront ici.',
    videFiltre: 'Aucun élément pour ce motif.',
    note: "Le code affiché est celui de la tournée d'origine. Un nouveau code est attribué dans la tournée d'affectation, où l'élément est livré en dernier jusqu'à ce que vous changiez son rang.",
  },

  /** Navigation principale, dans l'en-tête. */
  navigation: {
    nom: 'Navigation principale',
    tournees: 'Tournées',
    catalogue: 'Catalogue',
    camions: 'Camions',
    attente: "Liste d'attente",
    attenteNombre: (n: number) => `${n} ${n > 1 ? 'éléments' : 'élément'}`,
    filAriane: "Fil d'Ariane",
    accueil: 'Accueil',
  },

  /** Textes communs aux pages des référentiels. */
  referentiels: {
    chargement: 'Chargement…',
    archive: 'archivé',
    archiveLe: (date: string) => `Archivé le ${date}`,
    reactiver: 'Réactiver',
    aucun: '—',
    quitterTitre: 'Quitter sans enregistrer ?',
    quitterConsequence: 'Vos modifications seront perdues.',
    quitterAction: 'Quitter sans enregistrer',
  },

  /** Catalogue des articles (capture 07, CF 4.6). */
  catalogue: {
    titre: 'Catalogue des articles',
    intro:
      'Base d’exemple générée au premier lancement : dimensions et poids plausibles mais fictifs, modifiables (RG-01).',
    creer: 'Créer un article',
    recherche: 'Rechercher par nom ou référence',
    compte: (affiches: number, total: number) =>
      `${affiches} ${affiches > 1 ? 'articles' : 'article'} sur ${total}`,
    familles: 'Filtrer par famille',
    toutes: 'Toutes',
    legende: 'Articles du catalogue',
    aucunResultat: 'Aucun article ne correspond. Modifiez la recherche ou choisissez « Toutes ».',
    colonnes: {
      reference: 'Référence',
      article: 'Article',
      famille: 'Famille',
      tailleEmballee: 'Taille emballée, à plat (mm)',
      tailleNue: 'Taille nue, à plat (mm)',
      poids: 'Poids',
      fragile: 'Fragile',
      forme: 'Forme',
      orientations: 'Orientations',
      archiveLe: 'Archivé le',
      action: 'Action',
    },
    oui: 'Oui',
    non: 'Non',
    archives: {
      afficher: (n: number) => `Afficher les articles archivés (${n})`,
      masquer: 'Masquer les articles archivés',
      titre: 'Articles archivés',
      intro:
        'Ils ne sont plus proposés dans le catalogue ni à la saisie, et restent visibles dans les commandes qui les utilisent (RG-21).',
      aucun: 'Aucun article archivé.',
    },
    reactive: (nom: string) => `« ${nom} » est de nouveau proposé dans le catalogue.`,
    archive: (nom: string) =>
      `« ${nom} » est archivé. Vous pouvez le réactiver depuis la liste des articles archivés.`,
    supprime: (nom: string) => `« ${nom} » est supprimé.`,
    referenceReprise: (nom: string, reference: string, autre: string) =>
      `« ${nom} » ne peut pas être réactivé : sa référence ${reference} est reprise par l’article « ${autre} ». Changez l’une des deux références, puis réactivez-le.`,
  },

  /** Formes (RG-18), telles qu'elles s'affichent. */
  formes: {
    rectangulaire: 'Rectangulaire',
    cylindrique: 'Cylindrique',
    irreguliere: 'Irrégulière',
  },

  /** Fiche article (captures 08 et 08e, RG-18, RG-21, RG-22). */
  ficheArticle: {
    nouveau: 'Nouvel article',
    enregistrer: 'Enregistrer l’article',
    supprimer: 'Supprimer l’article',
    archiver: 'Archiver l’article',
    reactiver: 'Réactiver l’article',
    identification: 'Identification',
    nom: 'Nom',
    reference: 'Référence',
    famille: 'Famille',
    choisirFamille: 'Choisir une famille',
    taillesEtPoids: 'Tailles et poids',
    ordreDimensions: 'Longueur × largeur × hauteur, à plat',
    tailleEmballee: 'Taille emballée, à plat',
    tailleNue: 'Taille nue, à plat',
    longueur: 'Longueur',
    largeur: 'Largeur',
    hauteur: 'Hauteur',
    poids: 'Poids emballé',
    livrableNu: 'Peut être livré nu, sans emballage',
    dimsNues: 'Dimensions nues',
    noteBoite:
      'Ces dimensions sont celles de la boîte englobante, l’article posé à plat : la plus petite boîte qui contient l’article entier, quelle que soit sa forme. C’est la place réservée dans le camion (RG-18).',
    noteDefaut:
      'La taille et le poids retenus par défaut sont les valeurs maximales connues (RG-02, RG-05). Une modification ici s’applique aux commandes créées ensuite ; les commandes existantes gardent leurs dimensions (RG-03).',
    reglesPlacement: 'Règles de placement',
    fragile: 'Fragile',
    fragileAide: 'Ne supporte rien au-dessus de lui (RG-04).',
    forme: 'Forme',
    porteur: 'Dessus porteur',
    porteurAide: 'Un autre article peut être posé dessus.',
    porteurNonRectangulaire:
      'Non par défaut pour une forme non rectangulaire : rien n’est posé dessus (RG-18).',
    porteurFragile:
      'Indisponible : un article fragile ne supporte rien au-dessus de lui (RG-04). Décochez « Fragile » pour le modifier.',
    orientations: 'Orientations autorisées',
    orientationsParDefaut: (famille: string) =>
      `Orientations proposées pour la famille ${famille} (RG-04). Vous pouvez les modifier.`,
    apercu: 'Aperçu coté',
    apercuVue: 'article posé à plat',
    faces: 'Face montrée',
    dessus: 'Dessus',
    face: 'Face',
    cote: 'Côté',
    vueDessus: 'Vue de dessus · longueur × largeur',
    vueFace: 'Vue de face · longueur × hauteur',
    vueCote: 'Vue de côté · largeur × hauteur',
    apercuDescription: (vue: string, a: string, b: string) =>
      `Article à plat, ${vue} : ${a} sur ${b}.`,
    apercuIncomplet: 'Indiquez les trois dimensions emballées pour voir l’aperçu.',
    emballe: 'emballé',
    nu: 'nu',
    commandesEnCours: 'Commandes en cours',
    aucuneCommande: 'Aucune commande en cours n’utilise cet article.',
    commande: (numero: string, destination: string) => `${numero} · ${destination}`,
    enAttente: 'en attente',
    archiveBandeau:
      'Cet article est archivé : il n’est plus proposé dans le catalogue ni à la saisie express.',
    introuvable: 'Cet article n’existe plus. Revenez au catalogue.',
    enregistre: (nom: string) => `« ${nom} » est enregistré.`,
    supprimerTitre: (nom: string) => `Supprimer « ${nom} » ?`,
    supprimerConsequence:
      'Cet article n’est utilisé dans aucune commande. Il sera définitivement supprimé.',
    archiverTitre: (nom: string) => `Archiver « ${nom} » ?`,
    archiverConsequence: (n: number) =>
      `Cet article est utilisé dans ${n} ${n > 1 ? 'commandes' : 'commande'}. Il ne peut pas être supprimé. Archivez-le : il ne sera plus proposé, et restera visible dans ${n > 1 ? 'ces commandes' : 'cette commande'}.`,
  },

  /** Modèles de camions (capture 09, CF 4.7). */
  camions: {
    titre: 'Modèles de camions',
    intro:
      'Dimensions utiles de la caisse, à l’intérieur des parois. Modèles d’exemple générés au premier lancement, modifiables.',
    creer: 'Créer un modèle',
    legende: 'Modèles de camions',
    colonnes: {
      modele: 'Modèle',
      echelle: 'Longueur à l’échelle, vue de dessus',
      caisse: 'Caisse L × l × h (mm)',
      volume: 'Volume',
      tournees: 'Tournées',
      action: 'Action',
      archiveLe: 'Archivé le',
    },
    echelle: (longueur: string) => `Caisse de ${longueur} mm de long`,
    fond: 'Fond',
    portes: 'Portes',
    archives: {
      afficher: (n: number) => `Afficher les modèles archivés (${n})`,
      masquer: 'Masquer les modèles archivés',
      titre: 'Modèles archivés',
      intro:
        'Ils ne sont plus proposés au choix du camion, et restent visibles dans les tournées qui les utilisent (RG-21).',
      aucun: 'Aucun modèle archivé.',
    },
    reactive: (nom: string) => `« ${nom} » est de nouveau proposé au choix du camion.`,
    archive: (nom: string) =>
      `« ${nom} » est archivé. Vous pouvez le réactiver depuis la liste des modèles archivés.`,
    supprime: (nom: string) => `« ${nom} » est supprimé.`,
  },

  /** Statuts des tournées, tels qu'ils s'affichent. */
  statutsTournee: {
    enPreparation: 'en préparation',
    prete: 'prête',
    enChargement: 'en chargement',
    chargee: 'chargée',
  },

  /** Fiche camion (captures 09b et 09e, RG-21, RG-22). */
  ficheCamion: {
    nouveau: 'Nouveau modèle',
    enregistrer: 'Enregistrer le modèle',
    supprimer: 'Supprimer le modèle',
    archiver: 'Archiver le modèle',
    reactiver: 'Réactiver le modèle',
    caisse: 'Caisse',
    nom: 'Nom du modèle',
    nomExemple: 'Par exemple Porteur 7,2 m',
    longueur: 'Longueur utile',
    largeur: 'Largeur utile',
    hauteur: 'Hauteur utile',
    volume: 'Volume utile',
    tournees: 'Tournées',
    aucune: 'Aucune',
    tournee: (reference: string, statut: string) => `${reference} (${statut})`,
    note: 'Mesurez à l’intérieur des parois, du fond (côté cabine) jusqu’aux portes. La charge utile n’est pas contrôlée en V1 (RG-05).',
    plan: 'Plan coté de la caisse',
    vueDessus: 'Vue de dessus · longueur × largeur',
    vueCote: 'Vue de côté · longueur × hauteur',
    fond: '◂ Fond (cabine)',
    portes: 'Portes · entrée des articles ▸',
    descriptionPlan: (vue: string, a: string, b: string) =>
      `${vue} : ${a} mm sur ${b} mm, quadrillage de 1 m, fond à gauche, portes à droite.`,
    cote: (valeur: string) => `${valeur} mm`,
    archiveBandeau:
      'Ce modèle est archivé : il n’est plus proposé au choix du camion d’une tournée.',
    introuvable: 'Ce modèle n’existe plus. Revenez à la liste des modèles.',
    enregistre: (nom: string) => `« ${nom} » est enregistré.`,
    enregistrerTitre: (nom: string) => `Enregistrer « ${nom} » ?`,
    enregistrerConsequence: (tournees: string) =>
      `Ce modèle est utilisé par ${tournees}. Les plans de chargement déjà calculés devront être recalculés avec les nouvelles dimensions.`,
    supprimerTitre: (nom: string) => `Supprimer « ${nom} » ?`,
    supprimerConsequence:
      'Ce modèle n’est utilisé par aucune tournée. Il sera définitivement supprimé.',
    archiverTitre: (nom: string) => `Archiver « ${nom} » ?`,
    archiverConsequence: (n: number) =>
      `Ce modèle est utilisé par ${n} ${n > 1 ? 'tournées chargées' : 'tournée chargée'}. Il ne peut pas être supprimé. Archivez-le : il ne sera plus proposé, et restera visible dans ${n > 1 ? 'ces tournées' : 'cette tournée'}.`,
  },

  /** Textes communs aux composants de base (charte, design system). */
  composants: {
    obligatoire: '(obligatoire)',
    /** Préfixes lus par les lecteurs d'écran devant un message : l'icône seule ne suffit pas. */
    prefixeErreur: 'Erreur :',
    prefixeAvertissement: 'Avertissement :',
    champsACorriger: (nombre: number) =>
      nombre === 1 ? '1 champ à corriger' : `${nombre} champs à corriger`,
    annuler: 'Annuler',
    enMillimetres: 'en millimètres',
    /** Formulaire modifié depuis le dernier enregistrement (RG-21, RG-22). */
    modificationsNonEnregistrees: 'Modifications non enregistrées',
  },

  /** Tableaux triables. */
  tableau: {
    /** En-tête, lu seulement, de la colonne du chevron. */
    fiche: 'Fiche',
    trieePar: (colonne: string, sens: 'croissant' | 'decroissant') =>
      `, triée par ${colonne}, ordre ${sens === 'croissant' ? 'croissant' : 'décroissant'}`,
  },

  /** Page /vitrine : chaque composant de base avec ses états. */
  vitrine: {
    titre: 'Vitrine des composants',
    intro:
      'Chaque composant de base avec ses états. Cette page sert à la relecture et au contrôle automatique de l’accessibilité.',
    boutons: {
      titre: 'Boutons',
      principal: 'Passer en mode quai',
      secondaire: 'Relancer la simulation',
      presse: 'Tout',
      texte: 'Au fil de la tournée',
      danger: 'Supprimer l’article',
      petit: 'Voir',
      desactive: 'Masquer le premier plan',
      raccourcis: 'Raccourcis clavier',
      zoomer: 'Zoomer',
      dezoomer: 'Dézoomer',
    },
    selecteurs: {
      titre: 'Sélecteurs',
      vue: 'Vue affichée',
      profondeur: 'Profondeur',
      mode: "Mode d'affichage",
      dessus: 'Dessus',
      gauche: 'Gauche',
      droite: 'Droite',
      avant: 'Avant',
      arriere: 'Arrière',
      tout: 'Tout',
      unCouche: '−1 couche',
      deuxCouches: '−2 couches',
      planComplet: 'Plan complet',
      parEtape: 'Par étape',
      aimantation: 'Aimantation',
      pas: 'pas de 100 mm',
      interrupteurDesactive: 'Aimantation (prototype 2)',
    },
    bandeaux: {
      titre: 'Bandeaux',
      alerteTitre: '3 articles cachés derrière d’autres',
      alerteCorps: 'A04 (C3) · A06 (C3) · A08 (C1)',
      alerteAction: 'Masquer le premier plan',
      infoCorps: 'Filtre actif : les articles des deux premières couches sont masqués.',
      infoAction: 'Tout afficher',
    },
    codes: {
      titre: 'Codes de commande',
      sousTitre: 'C1 à C6 pleins, C7 à C12 hachurés',
    },
    cartes: {
      titre: 'Cartes, badges et touches',
      zone: 'Articles à placer',
      zoneVide: 'Aucun article. Les articles en trop apparaîtront ici.',
      badge: 'En préparation',
      touches: 'Faire pivoter',
    },
    champs: {
      titre: 'Champs',
      enregistrer: 'Enregistrer',
      nom: 'Nom',
      reference: 'Référence',
      longueur: 'Longueur',
      poids: 'Poids emballé',
      famille: 'Famille',
      desactive: 'Poids nu',
      aide: 'Facultative, mais unique parmi les articles actifs.',
    },
    fenetres: {
      titre: 'Fenêtres de confirmation',
      ouvrirDanger: 'Supprimer',
      ouvrirNeutre: 'Archiver',
      dangerTitre: 'Supprimer « Poutre lamellé-collé » ?',
      dangerConsequence:
        'Cet article n’est utilisé dans aucune commande. Il sera définitivement supprimé.',
      dangerAction: 'Supprimer l’article',
      neutreTitre: 'Archiver « Palette de parpaings 20 cm » ?',
      neutreConsequence:
        'Cet article est utilisé dans 2 commandes. Archivez-le : il ne sera plus proposé, et restera visible dans ces commandes.',
      neutreAction: 'Archiver l’article',
      resultatConfirme: (action: string) => `Action confirmée : ${action}.`,
      resultatAnnule: 'Action annulée.',
    },
  },

  /**
   * Messages de vérification des saisies (RG-21, cahier technique 6.1).
   * Chacun dit ce qui ne va pas et comment corriger, sans point d'exclamation.
   */
  validation: {
    nombre: {
      entierPositif: 'Indiquez un nombre entier de millimètres, par exemple 1 250.',
      poidsPositif: 'Indiquez un poids supérieur à 0 en kilogrammes, par exemple 22,5.',
    },
    article: {
      nom: "Indiquez le nom de l'article.",
      referenceDejaPrise: (autre: string) =>
        `Cette référence est déjà celle de l'article ${autre}. Indiquez une autre référence.`,
      famille: "Choisissez la famille de l'article.",
      poids: 'Indiquez le poids en kilogrammes, par exemple 22,5.',
      dimsEmballeesIncompletes:
        'Indiquez les trois dimensions emballées : longueur, largeur et hauteur, en millimètres.',
      dimsNuesIncompletes:
        'Indiquez les trois dimensions nues, en millimètres, ou décochez « Peut être livré nu ».',
      nuePlusGrande:
        'Indiquez des dimensions nues inférieures ou égales aux dimensions emballées correspondantes.',
      orientationRequise: 'Cochez au moins une orientation autorisée.',
      nomDejaUtilise: (autre: string) =>
        `Ce nom est déjà celui de l'article ${autre}. Vous pouvez enregistrer ; vérifiez qu'il ne s'agit pas du même article.`,
      horsCamions:
        "Cet article ne rentre dans aucun modèle de camion, quelle que soit l'orientation. Vous pouvez enregistrer ; vérifiez ses dimensions.",
      orientationContraire: (orientations: string, famille: string) =>
        `${orientations} : contraire aux règles de transport de la famille ${famille} (RG-04). Vous pouvez enregistrer ; vérifiez que c'est voulu.`,
    },
    camion: {
      nom: 'Indiquez le nom du modèle, par exemple Porteur 7,2 m.',
      longueur: 'Indiquez la longueur utile en millimètres, par exemple 7 200.',
      largeur: 'Indiquez la largeur utile en millimètres, par exemple 2 400.',
      hauteur: 'Indiquez la hauteur utile en millimètres, par exemple 2 500.',
      utilise: (tournees: string) =>
        `Ce modèle est utilisé par les tournées ${tournees}. Changez leur camion, ou attendez qu'elles soient chargées, avant de le supprimer ou de l'archiver.`,
    },
    commande: {
      numero: 'Indiquez le numéro de la commande.',
      numeroDoublon: (code: string, destination: string) =>
        `Ce numéro est déjà celui de la commande ${code} ${destination} dans cette tournée. Indiquez un autre numéro.`,
      destination: 'Indiquez le client ou la destination de la commande.',
      ligneRequise: 'Ajoutez au moins une ligne à la commande.',
      quantite: "Indiquez une quantité entière d'au moins 1.",
      dimsPropresIncompletes:
        'Indiquez les trois dimensions, ou videz-les toutes pour reprendre celles du catalogue.',
      poidsEstime: 'Poids estimé au prorata du volume (RG-03). Corrigez-le si vous le connaissez.',
      horsCamion:
        "Cet article ne rentre pas dans le camion de la tournée, quelle que soit l'orientation : il finira en trop (RG-10).",
    },
    tournee: {
      date: 'Indiquez la date de livraison de la tournée.',
      dateInvalide: 'Indiquez une date de livraison valide, par exemple 05/11/2026.',
      camion: 'Choisissez le camion de la tournée.',
      commandeRequise: 'Ajoutez au moins une commande avant de lancer le calcul.',
    },
    signalement: {
      type: 'Choisissez le type de problème.',
      action: "Choisissez l'action à mener.",
      dimsMesureesIncompletes:
        'Indiquez les trois dimensions mesurées, en millimètres, ou videz-les toutes.',
      plusGrandSansDepassement:
        'Aucune mesure ne dépasse les dimensions prévues. Vous pouvez valider ; vérifiez vos mesures.',
    },
  },

  /** Noms des orientations (RG-04), tels qu'ils s'affichent. */
  orientations: {
    aPlat: 'À plat',
    debout: 'Debout',
    contreParoi: 'Contre une paroi',
  },

  /** Erreurs renvoyées par la couche de données, traduites (cahier technique 6.1). */
  donnees: {
    doublon: 'Cette valeur est déjà utilisée. Indiquez-en une autre.',
    contrainte: "Une valeur n'est pas acceptée. Vérifiez la saisie puis enregistrez à nouveau.",
    utilise:
      'Cet élément est encore utilisé ailleurs. Retirez-le de là où il sert, puis supprimez-le.',
    introuvable: "Cet élément n'existe plus. Revenez à la liste pour l'actualiser.",
    reseau: "Les données n'ont pas pu être enregistrées. Vérifiez la connexion puis réessayez.",
  },
} as const
