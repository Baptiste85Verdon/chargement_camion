// Formulaire de la saisie express (captures 03, 03b, 03e ; CF 4.3, RG-03).
import { describe, expect, it } from 'vitest'
import type { FicheArticle, LigneDeCommande } from './modele'
import {
  commandeDepuisFormulaire,
  dimensionsCatalogue,
  estimerPoids,
  formulaireDepuisCommande,
  formulaireVideCommande,
  ligneDepuisArticle,
  ligneModifiee,
  numeroSuivant,
  proposerPoids,
  resumerLignes,
} from './saisie-commande'

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

const fenetre: FicheArticle = {
  id: 'art-fen',
  reference: 'FEN-PVC-2V',
  nom: 'Fenêtre PVC 2 vantaux 150 × 135',
  famille: 'Fenêtres',
  dimsEmballees: { l: 1500, w: 1350, h: 180 },
  dimsNues: { l: 1450, w: 1300, h: 80 },
  poids: 45,
  fragile: true,
  orientations: ['debout'],
  forme: 'rectangulaire',
  porteur: true,
}

const ligneEnregistree: LigneDeCommande = {
  id: 'l1',
  commandeId: 'c1',
  articleId: 'art-poutre',
  quantite: 2,
  nu: false,
  dimsPropres: { l: 6000, w: 200, h: 400 },
  poidsPropre: 220,
  poidsEstime: true,
}

describe('estimerPoids', () => {
  it('RG-03 : propose le poids au prorata du volume', () => {
    // La poutre de 8 m recoupée à 6 m : 293 × 6 000 / 8 000 = 219,75 kg.
    expect(estimerPoids(293, { l: 8000, w: 200, h: 400 }, { l: 6000, w: 200, h: 400 })).toBe(219.8)
  })

  it('RG-03 : arrondit au dixième de kilogramme, sans descendre sous 0,1 kg', () => {
    expect(estimerPoids(4, { l: 200, w: 150, h: 100 }, { l: 1, w: 1, h: 1 })).toBe(0.1)
  })
})

describe('proposerPoids', () => {
  it('RG-03 : propose un poids estimé quand les dimensions propres sont complètes', () => {
    const ligne = {
      ...ligneDepuisArticle(poutre),
      dimsPropres: { l: '6 000', w: '200', h: '400' },
    }
    expect(proposerPoids(ligne, poutre)).toEqual({ ...ligne, poids: '219,8', poidsEstime: true })
  })

  it('RG-03 : sans dimensions propres complètes, ne propose rien', () => {
    const ligne = { ...ligneDepuisArticle(poutre), dimsPropres: { l: '6 000', w: '', h: '400' } }
    expect(proposerPoids(ligne, poutre)).toBe(ligne)
  })

  it('RG-03 : une ligne nue part du volume et du poids de la taille nue', () => {
    // Pas de poids nu (RG-05) : le poids du catalogue vaut pour la taille nue.
    const ligne = {
      ...ligneDepuisArticle(fenetre),
      nu: true,
      dimsPropres: { l: '725', w: '1 300', h: '80' },
    }
    expect(proposerPoids(ligne, fenetre).poids).toBe('22,5')
  })
})

describe('ligneDepuisArticle', () => {
  it('RG-02 : une nouvelle ligne reprend le catalogue, emballée, en quantité 1', () => {
    expect(ligneDepuisArticle(fenetre)).toEqual({
      articleId: 'art-fen',
      quantite: '1',
      nu: false,
      dimsPropres: { l: '', w: '', h: '' },
      poids: '',
      poidsEstime: false,
    })
  })
})

describe('dimensionsCatalogue', () => {
  it('RG-02 : taille emballée par défaut, taille nue pour une ligne nue', () => {
    expect(dimensionsCatalogue(fenetre, false)).toEqual({ l: 1500, w: 1350, h: 180 })
    expect(dimensionsCatalogue(fenetre, true)).toEqual({ l: 1450, w: 1300, h: 80 })
    expect(dimensionsCatalogue(poutre, true)).toEqual({ l: 8000, w: 200, h: 400 })
  })
})

describe('formulaire de commande', () => {
  it('une nouvelle commande part du numéro proposé, sans ligne', () => {
    expect(formulaireVideCommande('CMD-2026-0435')).toEqual({
      numero: 'CMD-2026-0435',
      destination: '',
      ville: '',
      lignes: [],
    })
  })

  it('reprend une commande enregistrée, avec l’identifiant de chaque ligne', () => {
    const formulaire = formulaireDepuisCommande(
      {
        id: 'c1',
        tourneeId: 't1',
        numero: 'CMD-2026-0431',
        destination: 'Menuiserie Dubois',
        ville: 'Vertou',
        rangLivraison: 1,
      },
      [ligneEnregistree],
    )
    expect(formulaire).toEqual({
      id: 'c1',
      numero: 'CMD-2026-0431',
      destination: 'Menuiserie Dubois',
      ville: 'Vertou',
      lignes: [
        {
          id: 'l1',
          articleId: 'art-poutre',
          quantite: '2',
          nu: false,
          dimsPropres: { l: '6000', w: '200', h: '400' },
          poids: '220',
          poidsEstime: true,
        },
      ],
    })
  })

  it('RG-03 : convertit le formulaire en commande et lignes à enregistrer', () => {
    const { commande, lignes } = commandeDepuisFormulaire(
      {
        numero: ' CMD-2026-0435 ',
        destination: 'Chantier Les Pins',
        ville: '',
        lignes: [
          {
            articleId: 'art-poutre',
            quantite: '2',
            nu: false,
            dimsPropres: { l: '6 000', w: '200', h: '400' },
            poids: '219,8',
            poidsEstime: true,
          },
          { ...ligneDepuisArticle(fenetre), id: 'l9', nu: true },
        ],
      },
      { tourneeId: 't1', rangLivraison: 5 },
    )
    expect(commande).toEqual({
      tourneeId: 't1',
      numero: 'CMD-2026-0435',
      destination: 'Chantier Les Pins',
      rangLivraison: 5,
    })
    expect(lignes).toEqual([
      {
        articleId: 'art-poutre',
        quantite: 2,
        nu: false,
        dimsPropres: { l: 6000, w: 200, h: 400 },
        poidsPropre: 219.8,
        poidsEstime: true,
      },
      { id: 'l9', articleId: 'art-fen', quantite: 1, nu: true, poidsEstime: false },
    ])
  })
})

describe('ligneModifiee', () => {
  it('une ligne identique n’est pas modifiée', () => {
    expect(ligneModifiee(ligneEnregistree, { ...ligneEnregistree })).toBe(false)
  })

  it.each([
    ['l’article', { articleId: 'autre' }],
    ['la quantité', { quantite: 3 }],
    ['la livraison nue', { nu: true }],
    ['les dimensions', { dimsPropres: undefined }],
    ['le poids', { poidsPropre: 230 }],
  ])('une ligne dont change %s est modifiée', (_, changement) => {
    expect(ligneModifiee(ligneEnregistree, { ...ligneEnregistree, ...changement })).toBe(true)
  })

  it('le seul marquage « estimé » ne compte pas : le placement ne change pas', () => {
    expect(ligneModifiee(ligneEnregistree, { ...ligneEnregistree, poidsEstime: false })).toBe(false)
  })
})

describe('numeroSuivant', () => {
  it('propose le numéro qui suit le plus grand de l’année', () => {
    expect(numeroSuivant(['CMD-2026-0431', 'CMD-2026-0434', 'CMD-2025-0999'], 2026)).toBe(
      'CMD-2026-0435',
    )
  })

  it('ignore les numéros d’une autre forme, et commence à 0001', () => {
    expect(numeroSuivant(['BL 12'], 2027)).toBe('CMD-2027-0001')
  })
})

describe('resumerLignes', () => {
  it('RG-03 : compte lignes, articles, volume et poids avec les valeurs effectives', () => {
    const resume = resumerLignes(
      [
        {
          articleId: 'art-poutre',
          quantite: 2,
          nu: false,
          dimsPropres: { l: 6000, w: 200, h: 400 },
          poidsPropre: 220,
        },
        { articleId: 'art-fen', quantite: 1, nu: true },
      ],
      [poutre, fenetre],
    )
    // 2 × 0,48 m³ + 1,45 × 1,3 × 0,08 m³ ; 2 × 220 kg + 45 kg.
    expect(resume.lignes).toBe(2)
    expect(resume.articles).toBe(3)
    expect(resume.volume).toBeCloseTo(0.96 + 0.1508, 6)
    expect(resume.poids).toBe(485)
  })

  it('ignore une ligne dont l’article est inconnu', () => {
    expect(resumerLignes([{ articleId: 'x', quantite: 1, nu: false }], [poutre])).toEqual({
      lignes: 1,
      articles: 0,
      volume: 0,
      poids: 0,
    })
  })
})
