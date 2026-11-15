import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Champ from '@/composants/Champ.vue'
import ResumeErreurs from '@/composants/ResumeErreurs.vue'
import { textes } from '@/textes/fr'

/** Élément n° i d'une liste, ou échec du test s'il n'existe pas (accès indexé strict). */
function nieme<T>(liste: T[], i: number): T {
  const element = liste[i]
  if (element === undefined) throw new Error(`Élément ${i} introuvable`)
  return element
}

describe('Champ (RG-21)', () => {
  it('relie le libellé au champ', () => {
    const champ = mount(Champ, { props: { libelle: 'Nom', modelValue: '' } })
    const input = champ.get('input')
    expect(champ.get('label').attributes('for')).toBe(input.attributes('id'))
  })

  it('RG-21 : un champ obligatoire porte la mention « (obligatoire) » en texte et aria-required', () => {
    const champ = mount(Champ, { props: { libelle: 'Nom', modelValue: '', obligatoire: true } })
    expect(champ.get('label').text()).toBe(`Nom ${textes.composants.obligatoire}`)
    expect(champ.get('input').attributes('aria-required')).toBe('true')
  })

  it('RG-21 : une erreur s’affiche sous le champ, avec icône, et lui est reliée', () => {
    const message = textes.validation.nombre.entierPositif
    const champ = mount(Champ, {
      props: { libelle: 'Longueur', modelValue: '12,5', erreur: message },
    })
    const input = champ.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    const idMessage = input.attributes('aria-describedby')?.split(' ') ?? []
    const elementMessage = champ.get('.champ__message--erreur')
    expect(idMessage).toContain(elementMessage.attributes('id'))
    expect(elementMessage.text()).toContain(message)
    expect(elementMessage.find('svg').exists()).toBe(true)
    expect(champ.classes()).toContain('champ--erreur')
  })

  it('RG-21 : un avertissement s’affiche en ambre sans rendre le champ invalide', () => {
    const champ = mount(Champ, {
      props: { libelle: 'Poids', modelValue: '22', avertissement: 'Poids estimé.' },
    })
    expect(champ.get('input').attributes('aria-invalid')).toBeUndefined()
    const message = champ.get('.champ__message--avertissement')
    expect(message.text()).toContain('Poids estimé.')
    expect(champ.get('input').attributes('aria-describedby')).toContain(message.attributes('id'))
  })

  it('affiche l’unité dans le champ et la relie à la saisie', () => {
    const champ = mount(Champ, {
      props: { libelle: 'Longueur', modelValue: '', unite: 'mm', inputmode: 'numeric' },
    })
    const input = champ.get('input')
    expect(input.attributes('inputmode')).toBe('numeric')
    const unite = champ.get('.champ__unite')
    expect(unite.text()).toBe('mm')
    expect(input.attributes('aria-describedby')).toContain(unite.attributes('id'))
  })

  it('émet la saisie à chaque frappe et la sortie du champ', async () => {
    const champ = mount(Champ, { props: { libelle: 'Nom', modelValue: '' } })
    const input = champ.get('input')
    await input.setValue('Poutre')
    await input.trigger('blur')
    expect(champ.emitted('update:modelValue')).toEqual([['Poutre']])
    expect(champ.emitted('blur')).toHaveLength(1)
  })

  it('se désactive', () => {
    const champ = mount(Champ, { props: { libelle: 'Nom', modelValue: '', desactive: true } })
    expect(champ.get('input').attributes('disabled')).toBeDefined()
  })
})

describe('ResumeErreurs (RG-21)', () => {
  const erreurs = [
    { champId: 'famille', libelle: 'Famille', message: 'Choisissez la famille de l’article.' },
    { champId: 'longueur', libelle: 'Longueur', message: 'Indiquez la longueur.' },
  ]

  it('RG-21 : compte les champs à corriger et met un lien vers chacun', () => {
    const resume = mount(ResumeErreurs, { props: { erreurs } })
    expect(resume.get('[role="alert"]').text()).toContain(textes.composants.champsACorriger(2))
    const liens = resume.findAll('a')
    expect(liens).toHaveLength(2)
    expect(nieme(liens, 0).attributes('href')).toBe('#famille')
    expect(nieme(liens, 0).text()).toContain('Famille')
    expect(nieme(liens, 0).text()).toContain('Choisissez la famille de l’article.')
  })

  it('accorde le titre au singulier', () => {
    expect(textes.composants.champsACorriger(1)).toBe('1 champ à corriger')
    expect(textes.composants.champsACorriger(4)).toBe('4 champs à corriger')
  })

  it('n’affiche rien quand il n’y a aucune erreur', () => {
    const resume = mount(ResumeErreurs, { props: { erreurs: [] } })
    expect(resume.find('[role="alert"]').exists()).toBe(false)
  })

  it('RG-21 : reçoit le focus à l’enregistrement, et chaque lien met le focus sur son champ', async () => {
    const hote = document.createElement('div')
    document.body.appendChild(hote)
    const champ = document.createElement('input')
    champ.id = 'famille'
    document.body.appendChild(champ)

    const resume = mount(ResumeErreurs, { props: { erreurs }, attachTo: hote })
    ;(resume.vm as unknown as { focaliser: () => void }).focaliser()
    expect(document.activeElement).toBe(resume.get('[role="alert"]').element)

    await nieme(resume.findAll('a'), 0).trigger('click')
    expect(document.activeElement).toBe(champ)

    resume.unmount()
    champ.remove()
    hote.remove()
  })
})
