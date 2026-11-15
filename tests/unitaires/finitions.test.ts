import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BoutonEnregistrer from '@/composants/BoutonEnregistrer.vue'
import LigneCote from '@/composants/LigneCote.vue'
import TableauTriable, { type ColonneTableau } from '@/composants/TableauTriable.vue'
import { textes } from '@/textes/fr'
import { monterPage } from './monter-page'

afterEach(() => {
  document.body.innerHTML = ''
})

interface Ligne {
  id: string
  nom: string
  poids: number
}

const lignes: Ligne[] = [
  { id: '1', nom: 'Palette', poids: 1225 },
  { id: '2', nom: 'Carton', poids: 30 },
  { id: '3', nom: 'Botte', poids: 800 },
]

const colonnes: ColonneTableau<Ligne>[] = [
  { cle: 'nom', libelle: 'Article', valeur: (l) => l.nom },
  { cle: 'poids', libelle: 'Poids', valeur: (l) => l.poids, nombre: true },
  { cle: 'action', libelle: 'Action', libelleCache: true },
]

function monterTableau(tri: { cle: string; sens: 'croissant' | 'decroissant' } | null = null) {
  return mount(TableauTriable<Ligne>, {
    props: { colonnes, lignes, cleLigne: (l: Ligne) => l.id, legende: 'Articles', tri },
  })
}

const noms = (w: ReturnType<typeof monterTableau>) => w.findAll('tbody tr').map((tr) => tr.text())

describe('TableauTriable', () => {
  it('garde l’ordre reçu tant qu’aucun tri n’est choisi, sans aria-sort', () => {
    const tableau = monterTableau()
    expect(noms(tableau)).toEqual(['Palette1225', 'Carton30', 'Botte800'])
    expect(tableau.findAll('th[aria-sort]')).toHaveLength(0)
  })

  it('trie au clic sur l’en-tête, puis inverse le sens au clic suivant', async () => {
    const tableau = monterTableau()
    const poids = tableau.findAll('thead button').find((b) => b.text() === 'Poids')
    await poids?.trigger('click')
    expect(noms(tableau).map((n) => n.replace(/\D/g, ''))).toEqual(['30', '800', '1225'])
    expect(tableau.get('th[aria-sort]').attributes('aria-sort')).toBe('ascending')
    await poids?.trigger('click')
    expect(noms(tableau).map((n) => n.replace(/\D/g, ''))).toEqual(['1225', '800', '30'])
    expect(tableau.get('th[aria-sort]').attributes('aria-sort')).toBe('descending')
  })

  it('l’en-tête triable est un vrai bouton, utilisable au clavier', () => {
    const tableau = monterTableau()
    const boutons = tableau.findAll('thead button')
    expect(boutons.map((b) => b.text())).toEqual(['Article', 'Poids'])
    expect(boutons.every((b) => b.attributes('type') === 'button')).toBe(true)
  })

  it('applique le tri reçu par défaut et l’annonce dans la légende', () => {
    const tableau = monterTableau({ cle: 'nom', sens: 'croissant' })
    expect(noms(tableau).map((n) => n.replace(/\d/g, ''))).toEqual(['Botte', 'Carton', 'Palette'])
    expect(tableau.get('caption').text()).toContain(
      textes.tableau.trieePar('Article', 'croissant').trim(),
    )
  })

  it('une colonne sans valeur de tri n’a pas de bouton, et son libellé peut être caché', () => {
    const tableau = monterTableau()
    const action = tableau.findAll('thead th').at(2)
    expect(action?.find('button').exists()).toBe(false)
    expect(action?.find('.visuellement-cache').text()).toBe('Action')
  })
})

describe('BoutonEnregistrer (RG-21, RG-22)', () => {
  it('sans modification : pas de message, bouton secondaire mais actif', () => {
    const b = mount(BoutonEnregistrer, {
      props: { libelle: 'Enregistrer', modifie: false, formulaire: 'f' },
    })
    expect(b.get('[role="status"]').text()).toBe('')
    expect(b.get('button').classes()).toContain('bouton--secondaire')
    expect(b.get('button').attributes('disabled')).toBeUndefined()
  })

  it('modifié : message « Modifications non enregistrées » avec icône, bouton principal', () => {
    const b = mount(BoutonEnregistrer, {
      props: { libelle: 'Enregistrer', modifie: true, formulaire: 'f' },
    })
    const etat = b.get('[role="status"]')
    expect(etat.text()).toBe(textes.composants.modificationsNonEnregistrees)
    expect(etat.find('svg').exists()).toBe(true)
    expect(b.get('button').classes()).toContain('bouton--principal')
    expect(b.get('button').attributes('form')).toBe('f')
  })
})

describe('LigneCote (cahier technique 5.13)', () => {
  it('porte une flèche à chaque extrémité et la valeur au milieu', () => {
    const cote = mount(LigneCote, { props: { valeur: '7 200 mm' } })
    expect(cote.findAll('.cote__fleche')).toHaveLength(2)
    expect(cote.get('.cote__valeur').text()).toBe('7 200 mm')
    expect(cote.attributes('aria-hidden')).toBe('true')
  })
})

describe('fiches : indication de modification et aperçu', () => {
  it('la fiche article annonce les modifications non enregistrées, puis plus après enregistrement', async () => {
    const { page } = await monterPage('/catalogue/a0000000-0000-4000-8000-000000000022')
    const etat = () => page.get('.enregistrer__etat').text()
    expect(etat()).toBe('')
    await page.get('#article-poids').setValue('31')
    expect(etat()).toBe(textes.composants.modificationsNonEnregistrees)
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(etat()).toBe('')
  })

  it('la fiche camion annonce les modifications non enregistrées', async () => {
    const { page } = await monterPage('/camions/c0000000-0000-4000-8000-000000000004')
    await page.get('#camion-nom').setValue('Fourgon 22 m³')
    expect(page.get('.enregistrer__etat').text()).toBe(
      textes.composants.modificationsNonEnregistrees,
    )
  })

  it('l’aperçu de l’article montre le dessus, la face ou le côté, avec ses cotes', async () => {
    // FEN-PVC-2V : 1 500 × 1 350 × 180 à plat.
    const { page } = await monterPage('/catalogue/a0000000-0000-4000-8000-000000000001')
    const t = textes.ficheArticle
    const cotes = () => page.findAll('.apercu .cote__valeur').map((c) => c.text())
    expect(cotes()).toEqual(['1 350 mm', '1 500 mm'])

    await page.get(`.apercu input[value="face"]`).setValue(true)
    expect(page.get('.apercu figcaption').text()).toBe(t.vueFace)
    expect(cotes()).toEqual(['180 mm', '1 500 mm'])

    await page.get(`.apercu input[value="cote"]`).setValue(true)
    expect(page.get('.apercu figcaption').text()).toBe(t.vueCote)
    expect(cotes()).toEqual(['180 mm', '1 350 mm'])
    // La taille nue, en pointillés, suit la face choisie.
    expect(page.get('.apercu__nu').attributes('width')).toBe('1300')
  })

  it('les modèles de camions sont triés par nom par défaut', async () => {
    const { page } = await monterPage('/camions')
    const modeles = page.findAll('tbody th').map((th) => th.text())
    expect(modeles).toEqual(['Fourgon 20 m³', 'Porteur 6,2 m', 'Porteur 7,2 m', 'Porteur 8,5 m'])
    expect(page.get('th[aria-sort]').text()).toContain(textes.camions.colonnes.modele)
  })
})
