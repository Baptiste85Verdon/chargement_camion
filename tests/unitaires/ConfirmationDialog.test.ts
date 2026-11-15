import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ConfirmationDialog from '@/composants/ConfirmationDialog.vue'
import { textes } from '@/textes/fr'

/** Élément n° i d'une liste, ou échec du test s'il n'existe pas (accès indexé strict). */
function nieme<T>(liste: T[], i: number): T {
  const element = liste[i]
  if (element === undefined) throw new Error(`Élément ${i} introuvable`)
  return element
}

/*
 * jsdom ne sait pas encore ouvrir un <dialog> en fenêtre modale : on simule
 * showModal() et close() au plus simple. Le vrai comportement du navigateur
 * (focus piégé, Échap, voile) est vérifié par Playwright sur la vitrine.
 */
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

const proprietes = {
  titre: 'Supprimer « Poutre lamellé-collé » ?',
  consequence: 'Cet article n’est utilisé dans aucune commande. Il sera définitivement supprimé.',
  libelleAction: 'Supprimer l’article',
}

function monter(props: Record<string, unknown> = {}) {
  return mount(ConfirmationDialog, {
    props: { ...proprietes, ouvert: false, ...props },
    attachTo: document.body,
  })
}

describe('ConfirmationDialog (RG-22)', () => {
  it('RG-22 : est un <dialog> natif nommé par son titre et décrit par sa conséquence', () => {
    const fenetre = monter()
    const dialog = fenetre.get('dialog')
    const titre = fenetre.get(`#${dialog.attributes('aria-labelledby')}`)
    const conseq = fenetre.get(`#${dialog.attributes('aria-describedby')}`)
    expect(titre.text()).toBe(proprietes.titre)
    expect(conseq.text()).toBe(proprietes.consequence)
    fenetre.unmount()
  })

  it('RG-22 : nomme l’action à gauche et propose « Annuler » à droite', () => {
    const fenetre = monter()
    const boutons = fenetre.findAll('button')
    expect(boutons.map((b) => b.text())).toEqual([
      proprietes.libelleAction,
      textes.composants.annuler,
    ])
    fenetre.unmount()
  })

  it('RG-22 : le bouton d’action est rouge quand l’action fait perdre des données, en encre sinon', () => {
    const danger = monter({ ton: 'danger' })
    expect(nieme(danger.findAll('button'), 0).classes()).toContain('bouton--danger')
    danger.unmount()
    const neutre = monter({ ton: 'neutre', libelleAction: 'Archiver l’article' })
    expect(nieme(neutre.findAll('button'), 0).classes()).toContain('bouton--principal')
    neutre.unmount()
  })

  it('RG-22 : à l’ouverture, le focus va d’abord sur « Annuler »', async () => {
    const fenetre = monter()
    await fenetre.setProps({ ouvert: true })
    await nextTick()
    expect(fenetre.get('dialog').attributes('open')).toBeDefined()
    expect(document.activeElement).toBe(nieme(fenetre.findAll('button'), 1).element)
    fenetre.unmount()
  })

  it('RG-22 : à la fermeture, le focus revient sur le bouton qui a ouvert la fenêtre', async () => {
    const declencheur = document.createElement('button')
    document.body.appendChild(declencheur)
    declencheur.focus()

    const fenetre = monter()
    await fenetre.setProps({ ouvert: true })
    await nextTick()
    await fenetre.setProps({ ouvert: false })
    await nextTick()
    expect(fenetre.get('dialog').attributes('open')).toBeUndefined()
    expect(document.activeElement).toBe(declencheur)

    fenetre.unmount()
    declencheur.remove()
  })

  it('émet « confirmer » ou « annuler » selon le bouton', async () => {
    const fenetre = monter({ ouvert: true })
    const boutons = fenetre.findAll('button')
    const action = nieme(boutons, 0)
    const annuler = nieme(boutons, 1)
    await action.trigger('click')
    await annuler.trigger('click')
    expect(fenetre.emitted('confirmer')).toHaveLength(1)
    expect(fenetre.emitted('annuler')).toHaveLength(1)
    fenetre.unmount()
  })

  it('RG-22 : la touche Échap annule sans rien faire', async () => {
    const fenetre = monter({ ouvert: true })
    await fenetre.get('dialog').trigger('cancel')
    expect(fenetre.emitted('annuler')).toHaveLength(1)
    expect(fenetre.emitted('confirmer')).toBeUndefined()
    fenetre.unmount()
  })
})
