import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Badge from '@/composants/Badge.vue'
import Bandeau from '@/composants/Bandeau.vue'
import Bouton from '@/composants/Bouton.vue'
import Carte from '@/composants/Carte.vue'
import CodeCommande from '@/composants/CodeCommande.vue'
import Icone from '@/composants/Icone.vue'
import Interrupteur from '@/composants/Interrupteur.vue'
import Selecteur from '@/composants/Selecteur.vue'
import Touche from '@/composants/Touche.vue'

/** Élément n° i d'une liste, ou échec du test s'il n'existe pas (accès indexé strict). */
function nieme<T>(liste: T[], i: number): T {
  const element = liste[i]
  if (element === undefined) throw new Error(`Élément ${i} introuvable`)
  return element
}

describe('Icone', () => {
  it('dessine une icône au trait, cachée des lecteurs d’écran', () => {
    const icone = mount(Icone, { props: { nom: 'alerte' } })
    const svg = icone.get('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('fill')).toBe('none')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.findAll('path').length).toBeGreaterThan(0)
  })

  it('accepte la taille 24 du mode quai', () => {
    const icone = mount(Icone, { props: { nom: 'coche', taille: 24 } })
    expect(icone.get('svg').attributes('width')).toBe('24')
  })
})

describe('Bouton', () => {
  it('est un bouton de type « button » secondaire par défaut', () => {
    const bouton = mount(Bouton, { slots: { default: 'Relancer la simulation' } })
    const element = bouton.get('button')
    expect(element.attributes('type')).toBe('button')
    expect(element.classes()).toContain('bouton--secondaire')
    expect(element.text()).toBe('Relancer la simulation')
  })

  it('applique la variante et la taille demandées', () => {
    const bouton = mount(Bouton, {
      props: { variante: 'principal', taille: 'grande' },
      slots: { default: 'Passer en mode quai' },
    })
    expect(bouton.classes()).toEqual(
      expect.arrayContaining(['bouton--principal', 'bouton--grande']),
    )
  })

  it('n’annonce l’état pressé que pour un bouton à bascule', () => {
    const simple = mount(Bouton, { slots: { default: 'Tout' } })
    expect(simple.attributes('aria-pressed')).toBeUndefined()
    const presse = mount(Bouton, { props: { presse: true }, slots: { default: 'Tout' } })
    expect(presse.attributes('aria-pressed')).toBe('true')
  })

  it('donne un nom accessible à un bouton qui ne montre qu’une icône', () => {
    const bouton = mount(Bouton, {
      props: { icone: 'plus', seulementIcone: true, libelle: 'Zoomer' },
    })
    expect(bouton.attributes('aria-label')).toBe('Zoomer')
    expect(bouton.find('svg').exists()).toBe(true)
  })

  it('se désactive et n’émet alors plus de clic', async () => {
    const bouton = mount(Bouton, { props: { desactive: true }, slots: { default: 'Voir' } })
    expect(bouton.attributes('disabled')).toBeDefined()
    await bouton.trigger('click')
    expect(bouton.emitted('click')).toBeUndefined()
  })
})

describe('Selecteur', () => {
  const vues = [
    { valeur: 'dessus', libelle: 'Dessus' },
    { valeur: 'gauche', libelle: 'Gauche', desactive: true },
    { valeur: 'droite', libelle: 'Droite' },
  ]

  it('groupe des boutons radio sous une légende', () => {
    const selecteur = mount(Selecteur, {
      props: { legende: 'Vue affichée', options: vues, modelValue: 'dessus' },
    })
    expect(selecteur.get('fieldset legend').text()).toBe('Vue affichée')
    const radios = selecteur.findAll('input[type="radio"]')
    expect(radios).toHaveLength(3)
    expect((nieme(radios, 0).element as HTMLInputElement).checked).toBe(true)
    // Tous les boutons du groupe partagent le même nom : les flèches passent de l'un à l'autre.
    const noms = new Set(radios.map((r) => r.attributes('name')))
    expect(noms.size).toBe(1)
  })

  it('rend indisponible une option désactivée (vue déjà affichée dans l’autre cadre)', () => {
    const selecteur = mount(Selecteur, {
      props: { legende: 'Vue affichée', options: vues, modelValue: 'dessus' },
    })
    expect(nieme(selecteur.findAll('input'), 1).attributes('disabled')).toBeDefined()
  })

  it('émet la valeur choisie', async () => {
    const selecteur = mount(Selecteur, {
      props: { legende: 'Vue affichée', options: vues, modelValue: 'dessus' },
    })
    await nieme(selecteur.findAll('input'), 2).setValue(true)
    expect(selecteur.emitted('update:modelValue')).toEqual([['droite']])
  })
})

describe('Interrupteur', () => {
  it('est un interrupteur accessible qui porte son libellé', () => {
    const interrupteur = mount(Interrupteur, {
      props: { libelle: 'Aimantation', modelValue: true },
    })
    const bouton = interrupteur.get('button')
    expect(bouton.attributes('role')).toBe('switch')
    expect(bouton.attributes('aria-checked')).toBe('true')
    expect(bouton.text()).toContain('Aimantation')
  })

  it('bascule au clic', async () => {
    const interrupteur = mount(Interrupteur, {
      props: { libelle: 'Aimantation', modelValue: false },
    })
    await interrupteur.get('button').trigger('click')
    expect(interrupteur.emitted('update:modelValue')).toEqual([[true]])
  })

  it('ne bascule pas quand il est désactivé', async () => {
    const interrupteur = mount(Interrupteur, {
      props: { libelle: 'Aimantation', modelValue: false, desactive: true },
    })
    await interrupteur.get('button').trigger('click')
    expect(interrupteur.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('Bandeau', () => {
  it('montre une alerte avec une icône triangle et un titre, jamais par la couleur seule', () => {
    const bandeau = mount(Bandeau, {
      props: { ton: 'alerte', titre: '3 articles cachés derrière d’autres' },
      slots: { default: 'A04 (C3)', actions: '<button>Masquer le premier plan</button>' },
    })
    expect(bandeau.classes()).toContain('bandeau--alerte')
    expect(bandeau.find('svg').exists()).toBe(true)
    expect(bandeau.text()).toContain('3 articles cachés derrière d’autres')
    expect(bandeau.text()).toContain('A04 (C3)')
    expect(bandeau.find('button').exists()).toBe(true)
  })

  it('existe en ton information (filtre actif, description d’étape)', () => {
    const bandeau = mount(Bandeau, { props: { ton: 'info' }, slots: { default: 'Filtre actif' } })
    expect(bandeau.classes()).toContain('bandeau--info')
  })
})

describe('CodeCommande', () => {
  it('affiche le code de commande dans un cartouche à la teinte de la commande', () => {
    const code = mount(CodeCommande, { props: { numero: 3 } })
    expect(code.text()).toBe('C3')
    expect(code.classes()).toContain('code-commande--t3')
    expect(code.classes()).not.toContain('code-commande--hachure')
  })

  it('hachure le fond à partir de C7', () => {
    const code = mount(CodeCommande, { props: { numero: 8 } })
    expect(code.text()).toBe('C8')
    expect(code.classes()).toEqual(
      expect.arrayContaining(['code-commande--t2', 'code-commande--hachure']),
    )
  })
})

describe('Carte', () => {
  it('est une section nommée par son titre', () => {
    const carte = mount(Carte, {
      props: { titre: 'Équilibre de la charge', sousTitre: 'RG-20' },
      slots: { default: '<p>Contenu</p>' },
    })
    const section = carte.get('section')
    const titre = carte.get('h2')
    expect(titre.text()).toBe('Équilibre de la charge')
    expect(section.attributes('aria-labelledby')).toBe(titre.attributes('id'))
    expect(carte.text()).toContain('RG-20')
  })

  it('accepte un titre de niveau 3 et la variante zone en pointillés', () => {
    const carte = mount(Carte, {
      props: { titre: 'Articles à placer', niveau: 3, variante: 'zone' },
    })
    expect(carte.find('h3').exists()).toBe(true)
    expect(carte.classes()).toContain('carte--zone')
  })
})

describe('Badge et Touche', () => {
  it('le badge affiche son texte', () => {
    expect(mount(Badge, { slots: { default: 'En préparation' } }).text()).toBe('En préparation')
  })

  it('la touche est un élément kbd', () => {
    const touche = mount(Touche, { slots: { default: 'R' } })
    expect(touche.element.tagName).toBe('KBD')
    expect(touche.text()).toBe('R')
  })
})
