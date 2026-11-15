/**
 * Tous les textes de l'interface, en français.
 * Aucun texte en dur dans les composants : ils viennent d'ici.
 */
export const textes = {
  application: {
    nom: 'Plan de chargement',
    societe: 'Négoce de matériaux · dépôt de Nantes',
  },
  accueil: {
    titre: 'Tournées',
    vide: 'Aucune tournée pour le moment.',
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
