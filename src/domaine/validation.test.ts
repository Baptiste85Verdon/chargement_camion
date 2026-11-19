// Vérification des saisies (RG-21, cahier technique 6.1) : un test par ligne
// du tableau des règles, et les règles communes de lecture des nombres.
import { describe, expect, it } from 'vitest'
import type { Commande, FicheArticle, ModeleCamion, Tournee } from './modele'
import type { Unite } from './types'
import {
  ACTIONS_RACCOURCIS,
  RACCOURCIS_PAR_DEFAUT,
  lireKilogrammes,
  lireMillimetres,
  nomTouche,
  validerArticle,
  validerCamion,
  validerCommande,
  validerRaccourcis,
  validerSignalement,
  validerSuppressionCamion,
  validerTournee,
  type SaisieArticle,
  type SaisieCamion,
  type SaisieCommande,
  type Raccourcis,
  type SaisieLigne,
  type SaisieSignalement,
} from './validation'

// --- Données communes -------------------------------------------------------

const porteur72: ModeleCamion = {
  id: 'cam-72',
  nom: 'Porteur 7,2 m',
  longueur: 7200,
  largeur: 2400,
  hauteur: 2500,
}

const fenetre1V: FicheArticle = {
  id: 'art-fen-1v',
  reference: 'FEN-PVC-1V',
  nom: 'Fenêtre PVC 1 vantail 60 × 125',
  famille: 'Fenêtres',
  dimsEmballees: { l: 650, w: 1300, h: 180 },
  dimsNues: { l: 600, w: 1250, h: 80 },
  poids: 22,
  fragile: true,
  orientations: ['debout'],
  forme: 'rectangulaire',
  porteur: true,
}

const poutre: FicheArticle = {
  id: 'art-poutre',
  reference: 'POU-LC-2040',
  nom: 'Poutre lamellé-collé 200 × 400',
  famille: 'Poutres et charpente',
  dimsEmballees: { l: 8000, w: 200, h: 400 },
  poids: 293,
  fragile: false,
  orientations: ['aPlat'],
  forme: 'rectangulaire',
  porteur: true,
}

const contexteArticle = { catalogue: [fenetre1V, poutre], camions: [porteur72] }

/** Une fiche article correcte, que chaque test abîme à sa façon. */
function saisieArticle(modif: Partial<SaisieArticle> = {}): SaisieArticle {
  return {
    nom: 'Botte de liteaux 4 m',
    famille: 'Poutres et charpente',
    dimsEmballees: { l: '4 000', w: '300', h: '200' },
    poids: '45,5',
    livrableNu: false,
    dimsNues: { l: '', w: '', h: '' },
    orientations: ['aPlat'],
    ...modif,
  }
}

const codes = (problemes: { code: string }[]) => problemes.map((p) => p.code)
const champs = (problemes: { champ: string }[]) => problemes.map((p) => p.champ)

// --- Lecture des nombres ----------------------------------------------------

describe('lecture des nombres saisis (RG-21, cahier technique 6.1)', () => {
  it('RG-21 : lit des millimètres entiers, espaces de milliers acceptées', () => {
    expect(lireMillimetres('1250')).toBe(1250)
    expect(lireMillimetres(' 1 250 ')).toBe(1250)
    // Espace insécable et espace fine insécable, que collent les tableurs.
    expect(lireMillimetres('1 250')).toBe(1250)
    expect(lireMillimetres('1 250')).toBe(1250)
  })

  it('RG-21 : refuse les millimètres décimaux, négatifs, nuls ou vides', () => {
    expect(lireMillimetres('2,4')).toBeNull()
    expect(lireMillimetres('12.5')).toBeNull()
    expect(lireMillimetres('-3')).toBeNull()
    expect(lireMillimetres('0')).toBeNull()
    expect(lireMillimetres('')).toBeNull()
    expect(lireMillimetres('abc')).toBeNull()
  })

  it('RG-21 : lit des kilogrammes avec la virgule ou le point décimal', () => {
    expect(lireKilogrammes('22,5')).toBe(22.5)
    expect(lireKilogrammes('22.5')).toBe(22.5)
    expect(lireKilogrammes('1 225')).toBe(1225)
  })

  it('RG-21 : refuse un poids nul, négatif ou illisible', () => {
    expect(lireKilogrammes('0')).toBeNull()
    expect(lireKilogrammes('0,0')).toBeNull()
    expect(lireKilogrammes('-2')).toBeNull()
    expect(lireKilogrammes('2,5,1')).toBeNull()
    expect(lireKilogrammes('')).toBeNull()
  })
})

// --- Fiche article ----------------------------------------------------------

describe('validerArticle (RG-21, fiche article)', () => {
  it('RG-21 : une fiche article complète ne présente ni erreur ni avertissement', () => {
    const resultat = validerArticle(saisieArticle(), contexteArticle)
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual([])
  })

  it('RG-21 : nom, famille et poids obligatoires', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ nom: '  ', famille: '', poids: '' }),
      contexteArticle,
    )
    expect(champs(erreurs)).toEqual(['nom', 'famille', 'poids'])
    expect(codes(erreurs)).toEqual(['obligatoire', 'obligatoire', 'obligatoire'])
    expect(erreurs[1]?.message).toBe("Choisissez la famille de l'article.")
  })

  it("RG-21 : refuse une famille qui n'est pas dans la liste", () => {
    const { erreurs } = validerArticle(saisieArticle({ famille: 'Peinture' }), contexteArticle)
    expect(champs(erreurs)).toEqual(['famille'])
  })

  it('RG-21 : les trois dimensions emballées sont obligatoires', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ dimsEmballees: { l: '650', w: '', h: '1 300' } }),
      contexteArticle,
    )
    expect(erreurs).toEqual([
      {
        champ: 'dimsEmballees',
        code: 'tailleIncomplete',
        message:
          'Indiquez les trois dimensions emballées : longueur, largeur et hauteur, en millimètres.',
      },
    ])
  })

  it('RG-21 : dimensions en millimètres entiers supérieurs à 0', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ dimsEmballees: { l: '650', w: '2,4', h: '0' } }),
      contexteArticle,
    )
    expect(erreurs).toEqual([
      {
        champ: 'dimsEmballees',
        code: 'entierPositif',
        message: 'Indiquez un nombre entier de millimètres, par exemple 1 250.',
      },
    ])
  })

  it('RG-21 : poids supérieur à 0, virgule acceptée', () => {
    expect(validerArticle(saisieArticle({ poids: '22,5' }), contexteArticle).erreurs).toEqual([])
    const { erreurs } = validerArticle(saisieArticle({ poids: '0' }), contexteArticle)
    expect(codes(erreurs)).toEqual(['nombrePositif'])
  })

  it('RG-21 : livrable nu, les trois dimensions nues sont obligatoires', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ livrableNu: true, dimsNues: { l: '3 900', w: '280', h: '' } }),
      contexteArticle,
    )
    expect(erreurs).toEqual([
      {
        champ: 'dimsNues',
        code: 'tailleIncomplete',
        message:
          'Indiquez les trois dimensions nues, en millimètres, ou décochez « Peut être livré nu ».',
      },
    ])
  })

  it('RG-21 : chaque dimension nue est au plus la dimension emballée correspondante', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ livrableNu: true, dimsNues: { l: '3 900', w: '310', h: '180' } }),
      contexteArticle,
    )
    expect(champs(erreurs)).toEqual(['dimsNues'])
    expect(codes(erreurs)).toEqual(['nuePlusGrande'])
  })

  it('RG-21 : case « Peut être livré nu » décochée, les champs nus sont ignorés', () => {
    const { erreurs } = validerArticle(
      saisieArticle({ livrableNu: false, dimsNues: { l: 'n’importe quoi', w: '', h: '' } }),
      contexteArticle,
    )
    expect(erreurs).toEqual([])
  })

  it('RG-21 : au moins une orientation cochée', () => {
    const { erreurs } = validerArticle(saisieArticle({ orientations: [] }), contexteArticle)
    expect(erreurs).toEqual([
      {
        champ: 'orientations',
        code: 'orientationRequise',
        message: 'Cochez au moins une orientation autorisée.',
      },
    ])
  })

  it('RG-21 : avertit quand le nom est déjà celui d’un autre article, sans bloquer', () => {
    const resultat = validerArticle(
      saisieArticle({
        nom: ' fenêtre pvc 1 vantail 60 × 125 ',
        famille: 'Fenêtres',
        orientations: ['debout'],
      }),
      contexteArticle,
    )
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual([
      {
        champ: 'nom',
        code: 'nomDejaUtilise',
        message:
          "Ce nom est déjà celui de l'article FEN-PVC-1V. Vous pouvez enregistrer ; vérifiez qu'il ne s'agit pas du même article.",
      },
    ])
  })

  it('RG-21 : un article modifié ne se signale pas lui-même comme doublon', () => {
    const resultat = validerArticle(
      saisieArticle({
        id: fenetre1V.id,
        nom: fenetre1V.nom,
        famille: 'Fenêtres',
        orientations: ['debout'],
      }),
      contexteArticle,
    )
    expect(resultat.avertissements).toEqual([])
  })

  it('RG-21 : avertit quand l’article ne rentre dans aucun camion, quelle que soit l’orientation', () => {
    // 2 600 mm de large à plat, 2 600 mm de haut debout : trop pour 2 400 × 2 500.
    const resultat = validerArticle(
      saisieArticle({
        dimsEmballees: { l: '3 000', w: '2 600', h: '2 600' },
        orientations: ['aPlat', 'debout'],
      }),
      contexteArticle,
    )
    expect(resultat.erreurs).toEqual([])
    expect(codes(resultat.avertissements)).toEqual(['horsCamions'])
  })

  it('RG-21 : un article qui rentre debout seulement ne déclenche pas d’avertissement', () => {
    // À plat : 2 600 de large, trop ; debout : 1 000 de large et 2 600… non,
    // on prend 200 de haut à plat, donc 200 de large et 2 600 de haut debout.
    const resultat = validerArticle(
      saisieArticle({
        dimsEmballees: { l: '3 000', w: '2 450', h: '200' },
        orientations: ['aPlat', 'debout'],
      }),
      contexteArticle,
    )
    expect(resultat.avertissements).toEqual([])
  })

  it('RG-21 : avertit d’une orientation contraire à RG-04, « à plat » pour une fenêtre', () => {
    const resultat = validerArticle(
      saisieArticle({
        famille: 'Fenêtres',
        dimsEmballees: { l: '1 500', w: '1 350', h: '180' },
        orientations: ['aPlat', 'debout'],
      }),
      contexteArticle,
    )
    expect(resultat.erreurs).toEqual([])
    expect(codes(resultat.avertissements)).toEqual(['orientationContraire'])
    expect(resultat.avertissements[0]?.champ).toBe('orientations')
  })

  it('RG-21 : avertit d’une plaque « debout » qui n’est pas contre une paroi (RG-04)', () => {
    const resultat = validerArticle(
      saisieArticle({
        famille: 'Plaques de plâtre',
        dimsEmballees: { l: '2 500', w: '1 200', h: '250' },
        orientations: ['aPlat', 'debout'],
      }),
      contexteArticle,
    )
    expect(codes(resultat.avertissements)).toEqual(['orientationContraire'])
  })
})

describe('validerArticle et archivage (RG-21)', () => {
  const archive: FicheArticle = {
    ...poutre,
    id: 'art-ancien',
    reference: 'POU-ANC',
    nom: 'Poutre ancienne',
    archiveLe: '2026-11-01T08:00:00Z',
  }
  const contexte = { catalogue: [fenetre1V, poutre, archive], camions: [porteur72] }

  it('RG-21 : refuse une référence déjà prise par un autre article actif', () => {
    const { erreurs } = validerArticle(saisieArticle({ reference: ' POU-LC-2040 ' }), contexte)
    expect(erreurs).toEqual([
      {
        champ: 'reference',
        code: 'doublon',
        message:
          "Cette référence est déjà celle de l'article Poutre lamellé-collé 200 × 400. Indiquez une autre référence.",
      },
    ])
  })

  it('RG-21 : accepte la référence d’un article archivé', () => {
    expect(validerArticle(saisieArticle({ reference: 'POU-ANC' }), contexte).erreurs).toEqual([])
  })

  it('RG-21 : un article modifié garde sa propre référence', () => {
    const resultat = validerArticle(
      saisieArticle({ id: poutre.id, reference: 'POU-LC-2040', nom: poutre.nom }),
      contexte,
    )
    expect(resultat.erreurs).toEqual([])
  })

  it('RG-21 : n’avertit pas d’un nom déjà pris par un article archivé', () => {
    const resultat = validerArticle(saisieArticle({ nom: 'Poutre ancienne' }), contexte)
    expect(resultat.avertissements).toEqual([])
  })

  it('RG-21 : un camion archivé ne compte pas pour « ne rentre dans aucun camion »', () => {
    const grand = { ...porteur72, id: 'cam-12', longueur: 12000, archiveLe: '2026-11-01T08:00:00Z' }
    const resultat = validerArticle(
      saisieArticle({ dimsEmballees: { l: '9 000', w: '300', h: '200' } }),
      { catalogue: [], camions: [porteur72, grand] },
    )
    expect(codes(resultat.avertissements)).toEqual(['horsCamions'])
  })
})

// --- Fiche camion -----------------------------------------------------------

describe('validerCamion (RG-21, fiche camion)', () => {
  const saisieCamion = (modif: Partial<SaisieCamion> = {}): SaisieCamion => ({
    nom: 'Porteur 7,2 m',
    longueur: '7 200',
    largeur: '2 400',
    hauteur: '2 500',
    ...modif,
  })

  it('RG-21 : une fiche camion complète est acceptée', () => {
    expect(validerCamion(saisieCamion())).toEqual({ erreurs: [], avertissements: [] })
  })

  it('RG-21 : nom et trois dimensions utiles obligatoires, en millimètres entiers', () => {
    // L'état de la capture 09e : nom vide, largeur « 2,4 », hauteur vide.
    const { erreurs } = validerCamion(saisieCamion({ nom: '', largeur: '2,4', hauteur: '' }))
    expect(erreurs).toEqual([
      {
        champ: 'nom',
        code: 'obligatoire',
        message: 'Indiquez le nom du modèle, par exemple Porteur 7,2 m.',
      },
      {
        champ: 'largeur',
        code: 'entierPositif',
        message: 'Indiquez un nombre entier de millimètres, par exemple 1 250.',
      },
      {
        champ: 'hauteur',
        code: 'obligatoire',
        message: 'Indiquez la hauteur utile en millimètres, par exemple 2 500.',
      },
    ])
  })

  it('RG-21 : refuse de supprimer ou d’archiver un camion utilisé, en citant les tournées', () => {
    const tournees: Tournee[] = [
      {
        id: 't1',
        reference: 'T-2026-118',
        date: '2026-11-05',
        modeleCamionId: 'cam-72',
        statut: 'enPreparation',
      },
      {
        id: 't2',
        reference: 'T-2026-120',
        date: '2026-11-06',
        modeleCamionId: 'cam-72',
        statut: 'enChargement',
      },
      {
        id: 't3',
        reference: 'T-2026-110',
        date: '2026-10-28',
        modeleCamionId: 'cam-72',
        statut: 'chargee',
      },
      {
        id: 't4',
        reference: 'T-2026-117',
        date: '2026-11-04',
        modeleCamionId: 'cam-85',
        statut: 'prete',
      },
    ]
    const { erreurs } = validerSuppressionCamion(porteur72, tournees)
    expect(erreurs).toEqual([
      {
        champ: 'camion',
        code: 'camionUtilise',
        message:
          "Ce modèle est utilisé par les tournées T-2026-118, T-2026-120. Changez leur camion, ou attendez qu'elles soient chargées, avant de le supprimer ou de l'archiver.",
      },
    ])
  })

  it('RG-21 : accepte la suppression d’un camion utilisé seulement par des tournées chargées', () => {
    const tournees: Tournee[] = [
      {
        id: 't3',
        reference: 'T-2026-110',
        date: '2026-10-28',
        modeleCamionId: 'cam-72',
        statut: 'chargee',
      },
    ]
    expect(validerSuppressionCamion(porteur72, tournees).erreurs).toEqual([])
  })
})

// --- Saisie express ---------------------------------------------------------

describe('validerCommande (RG-21, saisie express)', () => {
  const c2: Commande = {
    id: 'cmd-c2',
    tourneeId: 't1',
    numero: 'CMD-2026-0432',
    destination: 'Chantier Les Ormeaux',
    rangLivraison: 2,
  }
  const contexte = { commandesDeLaTournee: [c2], catalogue: [fenetre1V, poutre], camion: porteur72 }

  const ligne = (modif: Partial<SaisieLigne> = {}): SaisieLigne => ({
    articleId: poutre.id,
    quantite: '2',
    nu: false,
    dimsPropres: { l: '', w: '', h: '' },
    poids: '',
    poidsEstime: false,
    ...modif,
  })
  const saisie = (modif: Partial<SaisieCommande> = {}): SaisieCommande => ({
    numero: 'CMD-2026-0450',
    destination: 'Menuiserie Dubois',
    ville: 'Nantes',
    lignes: [
      ligne({ dimsPropres: { l: '6 000', w: '200', h: '400' }, poids: '220', poidsEstime: false }),
    ],
    ...modif,
  })

  it('RG-21 : une commande complète est acceptée', () => {
    expect(validerCommande(saisie(), contexte)).toEqual({ erreurs: [], avertissements: [] })
  })

  it('RG-21 : numéro et destination obligatoires', () => {
    const { erreurs } = validerCommande(saisie({ numero: '', destination: ' ' }), contexte)
    expect(champs(erreurs)).toEqual(['numero', 'destination'])
    expect(erreurs[1]?.message).toBe('Indiquez le client ou la destination de la commande.')
  })

  it('RG-21 : numéro unique dans la tournée, avec le code et la destination du doublon', () => {
    const { erreurs } = validerCommande(saisie({ numero: ' cmd-2026-0432 ' }), contexte)
    expect(erreurs).toEqual([
      {
        champ: 'numero',
        code: 'doublon',
        message:
          'Ce numéro est déjà celui de la commande C2 Chantier Les Ormeaux dans cette tournée. Indiquez un autre numéro.',
      },
    ])
  })

  it('RG-21 : une commande modifiée garde son propre numéro', () => {
    const { erreurs } = validerCommande(saisie({ id: c2.id, numero: c2.numero }), contexte)
    expect(erreurs).toEqual([])
  })

  it('RG-21 : au moins une ligne', () => {
    const { erreurs } = validerCommande(saisie({ lignes: [] }), contexte)
    expect(erreurs).toEqual([
      {
        champ: 'lignes',
        code: 'ligneRequise',
        message: 'Ajoutez au moins une ligne à la commande.',
      },
    ])
  })

  it("RG-21 : quantité entière d'au moins 1", () => {
    for (const quantite of ['0', '1,5', '', '-1']) {
      const { erreurs } = validerCommande(saisie({ lignes: [ligne({ quantite })] }), contexte)
      expect(erreurs).toEqual([
        {
          champ: 'lignes.0.quantite',
          code: 'quantiteEntiere',
          message: "Indiquez une quantité entière d'au moins 1.",
        },
      ])
    }
  })

  it('RG-21 : dimensions propres, les trois ou aucune', () => {
    const { erreurs } = validerCommande(
      saisie({ lignes: [ligne({ dimsPropres: { l: '4 000', w: '', h: '400' } })] }),
      contexte,
    )
    expect(erreurs).toEqual([
      {
        champ: 'lignes.0.dimsPropres',
        code: 'tailleIncomplete',
        message:
          'Indiquez les trois dimensions, ou videz-les toutes pour reprendre celles du catalogue.',
      },
    ])
  })

  it('RG-21 : dimensions propres entières et supérieures à 0', () => {
    const { erreurs } = validerCommande(
      saisie({ lignes: [ligne({ dimsPropres: { l: '4 000', w: '0', h: '400' } })] }),
      contexte,
    )
    expect(codes(erreurs)).toEqual(['entierPositif'])
    expect(champs(erreurs)).toEqual(['lignes.0.dimsPropres'])
  })

  it('RG-21 : poids propre supérieur à 0', () => {
    const { erreurs } = validerCommande(saisie({ lignes: [ligne({ poids: '0' })] }), contexte)
    expect(champs(erreurs)).toEqual(['lignes.0.poids'])
    expect(codes(erreurs)).toEqual(['nombrePositif'])
  })

  it('RG-03 : avertit d’un poids estimé au prorata du volume', () => {
    const resultat = validerCommande(
      saisie({
        lignes: [
          ligne({
            dimsPropres: { l: '6 000', w: '200', h: '400' },
            poids: '220',
            poidsEstime: true,
          }),
        ],
      }),
      contexte,
    )
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual([
      {
        champ: 'lignes.0.poids',
        code: 'poidsEstime',
        message: 'Poids estimé au prorata du volume (RG-03). Corrigez-le si vous le connaissez.',
      },
    ])
  })

  it('RG-10 : avertit qu’un article ne rentre pas dans le camion de la tournée', () => {
    // La poutre du catalogue fait 8 000 mm : plus longue que la caisse de 7 200 mm.
    const resultat = validerCommande(saisie({ lignes: [ligne()] }), contexte)
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual([
      {
        champ: 'lignes.0',
        code: 'horsCamion',
        message:
          "Cet article ne rentre pas dans le camion de la tournée, quelle que soit l'orientation : il finira en trop (RG-10).",
      },
    ])
  })

  it('RG-21 : sans camion choisi, pas d’avertissement de taille', () => {
    const resultat = validerCommande(saisie({ lignes: [ligne()] }), {
      ...contexte,
      camion: undefined,
    })
    expect(resultat.avertissements).toEqual([])
  })

  it('RG-21 : une ligne nue prend la taille nue du catalogue pour la vérification', () => {
    // Fenêtre 1 vantail nue : 600 × 1 250 × 80, debout 600 × 80 × 1 250 : elle rentre.
    const resultat = validerCommande(
      saisie({ lignes: [ligne({ articleId: fenetre1V.id, nu: true })] }),
      contexte,
    )
    expect(resultat).toEqual({ erreurs: [], avertissements: [] })
  })
})

// --- Préparation d'une tournée ---------------------------------------------

describe('validerTournee (RG-21, préparation d’une tournée)', () => {
  it('RG-21 : date et camion obligatoires à l’enregistrement', () => {
    const { erreurs } = validerTournee(
      { date: '', modeleCamionId: '' },
      { nombreCommandes: 0, lancement: false },
    )
    expect(erreurs).toEqual([
      {
        champ: 'date',
        code: 'obligatoire',
        message: 'Indiquez la date de livraison de la tournée.',
      },
      {
        champ: 'modeleCamionId',
        code: 'obligatoire',
        message: 'Choisissez le camion de la tournée.',
      },
    ])
  })

  it('RG-21 : refuse une date illisible', () => {
    const { erreurs } = validerTournee(
      { date: '2026-02-30', modeleCamionId: 'cam-72' },
      { nombreCommandes: 1, lancement: false },
    )
    expect(champs(erreurs)).toEqual(['date'])
    expect(codes(erreurs)).toEqual(['dateInvalide'])
  })

  it('RG-21 : au moins une commande avant « Lancer le calcul »', () => {
    const saisie = { date: '2026-11-05', modeleCamionId: 'cam-72' }
    expect(validerTournee(saisie, { nombreCommandes: 0, lancement: false }).erreurs).toEqual([])
    expect(validerTournee(saisie, { nombreCommandes: 0, lancement: true }).erreurs).toEqual([
      {
        champ: 'commandes',
        code: 'commandeRequise',
        message: 'Ajoutez au moins une commande avant de lancer le calcul.',
      },
    ])
  })
})

// --- Signalement ------------------------------------------------------------

describe('validerSignalement (RG-21, signalement)', () => {
  const prevu: Unite = {
    id: 'A06',
    commandeRang: 3,
    dims: { l: 4000, w: 1000, h: 400 },
    poids: 800,
    fragile: false,
    porteur: true,
    orientations: ['aPlat'],
  }
  const saisie = (modif: Partial<SaisieSignalement> = {}): SaisieSignalement => ({
    type: 'abime',
    action: 'conserver',
    commentaire: '',
    dimsMesurees: { l: '', w: '', h: '' },
    ...modif,
  })

  it('RG-21 : un signalement complet est accepté', () => {
    expect(validerSignalement(saisie(), prevu)).toEqual({ erreurs: [], avertissements: [] })
  })

  it('RG-21 : type de problème et action obligatoires', () => {
    const { erreurs } = validerSignalement(saisie({ type: '', action: '' }), prevu)
    expect(champs(erreurs)).toEqual(['type', 'action'])
    expect(codes(erreurs)).toEqual(['obligatoire', 'obligatoire'])
  })

  it('RG-21 : dimensions mesurées, les trois ou aucune, supérieures à 0', () => {
    const incompletes = validerSignalement(
      saisie({ type: 'plusGrand', dimsMesurees: { l: '4 100', w: '', h: '' } }),
      prevu,
    )
    expect(codes(incompletes.erreurs)).toEqual(['tailleIncomplete'])
    const nulles = validerSignalement(
      saisie({ type: 'plusGrand', dimsMesurees: { l: '4 100', w: '0', h: '400' } }),
      prevu,
    )
    expect(codes(nulles.erreurs)).toEqual(['entierPositif'])
    expect(champs(nulles.erreurs)).toEqual(['dimsMesurees'])
  })

  it('RG-21 : avertit d’un « plus grand que prévu » dont aucune mesure ne dépasse', () => {
    const resultat = validerSignalement(
      saisie({ type: 'plusGrand', dimsMesurees: { l: '4 000', w: '1 000', h: '380' } }),
      prevu,
    )
    expect(resultat.erreurs).toEqual([])
    expect(codes(resultat.avertissements)).toEqual(['plusGrandSansDepassement'])
  })

  it('RG-21 : pas d’avertissement quand une mesure dépasse la dimension prévue', () => {
    const resultat = validerSignalement(
      saisie({ type: 'plusGrand', dimsMesurees: { l: '4 120', w: '1 000', h: '400' } }),
      prevu,
    )
    expect(resultat.avertissements).toEqual([])
  })
})

// --- Raccourcis clavier -------------------------------------------------------------

describe('validerRaccourcis', () => {
  const raccourcis = (modif: Partial<Raccourcis> = {}): Raccourcis => ({
    ...RACCOURCIS_PAR_DEFAUT,
    ...modif,
  })

  it('RG-21 : accepte les raccourcis par défaut', () => {
    expect(validerRaccourcis(raccourcis())).toEqual({ erreurs: [], avertissements: [] })
  })

  it('RG-21 : refuse une touche qui sert déjà à une autre action, en la nommant', () => {
    const resultat = validerRaccourcis(raccourcis({ aimantation: 'r' }), 'aimantation')
    expect(resultat.erreurs).toEqual([
      {
        champ: 'aimantation',
        code: 'toucheDejaPrise',
        message:
          "La touche R sert déjà à « Changer d'orientation ». Choisissez une autre touche, ou modifiez d'abord ce raccourci.",
      },
    ])
  })

  it('RG-21 : compare les lettres sans tenir compte des majuscules', () => {
    const resultat = validerRaccourcis(raccourcis({ aimantation: 'R' }), 'aimantation')
    expect(codes(resultat.erreurs)).toEqual(['toucheDejaPrise'])
  })

  it('RG-21 : refuse une flèche, réservée au déplacement, qui ne se modifie pas', () => {
    const resultat = validerRaccourcis(raccourcis({ retirer: 'ArrowLeft' }), 'retirer')
    expect(resultat.erreurs).toEqual([
      {
        champ: 'retirer',
        code: 'toucheDejaPrise',
        message:
          "La touche ← sert déjà à « Déplacer l'article sélectionné », un raccourci fixe. Choisissez une autre touche.",
      },
    ])
  })

  it('RG-21 : ne signale que le raccourci modifié, pas celui qui avait la touche avant', () => {
    const resultat = validerRaccourcis(raccourcis({ aimantation: 'r' }), 'aimantation')
    expect(champs(resultat.erreurs)).toEqual(['aimantation'])
  })

  it('RG-21 : accepte des raccourcis désactivés, même plusieurs', () => {
    const resultat = validerRaccourcis(raccourcis({ aimantation: null, modeAffichage: null }))
    expect(resultat.erreurs).toEqual([])
  })

  it('RG-21 : sans raccourci modifié, signale chaque touche déjà prise plus haut dans la liste', () => {
    const resultat = validerRaccourcis(
      raccourcis({ aimantation: 'r', modeAffichage: 'r', etapeSuivante: 'ArrowDown' }),
    )
    expect(champs(resultat.erreurs)).toEqual(['aimantation', 'modeAffichage', 'etapeSuivante'])
  })

  it.each([
    ['Tab', 'Tab (et Maj + Tab)'],
    ['Enter', 'Entrée'],
    [' ', 'Espace'],
    ['Escape', 'Échap'],
  ])('RG-21 : refuse %s, réservée à la navigation au clavier (%s)', (touche) => {
    const resultat = validerRaccourcis(raccourcis({ aimantation: touche }), 'aimantation')
    expect(resultat.erreurs).toEqual([
      {
        champ: 'aimantation',
        code: 'toucheReservee',
        message: 'Cette touche sert à naviguer au clavier, elle ne peut pas être attribuée.',
      },
    ])
  })

  it('RG-21 : refuse une touche de navigation aussi à la relecture de toute la liste', () => {
    const resultat = validerRaccourcis(raccourcis({ retirer: 'Enter', etapeSuivante: 'Tab' }))
    expect(champs(resultat.erreurs)).toEqual(['retirer', 'etapeSuivante'])
    expect(codes(resultat.erreurs)).toEqual(['toucheReservee', 'toucheReservee'])
  })

  it('RG-21 : « Désélectionner » est un raccourci fixe sur Échap, hors des raccourcis modifiables', () => {
    expect(ACTIONS_RACCOURCIS).not.toContain('deselectionner')
    expect(Object.values(RACCOURCIS_PAR_DEFAUT)).not.toContain('Escape')
  })

  it('nomme les touches comme sur le clavier', () => {
    expect(nomTouche('r')).toBe('R')
    expect(nomTouche('?')).toBe('?')
    expect(nomTouche('Delete')).toBe('Suppr')
    expect(nomTouche('Escape')).toBe('Échap')
    expect(nomTouche('PageDown')).toBe('Pg suiv.')
    expect(nomTouche('PageUp')).toBe('Pg préc.')
    expect(nomTouche('ArrowUp')).toBe('↑')
    expect(nomTouche(' ')).toBe('Espace')
    expect(nomTouche('F2')).toBe('F2')
  })
})
