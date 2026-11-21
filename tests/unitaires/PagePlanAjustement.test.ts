// Plan de chargement : ajuster au clavier et sans glisser (étape P2-5 ;
// captures 04f, 04h ; cahier technique 5.3, 5.5, 5.7 et 5.18 ; RG-08, RG-09,
// RG-22). Base d'exemple : la tournée T-2026-118, avec le plan de référence du
// jeu « couloirs » (A12, le carton de C2, est à côté de la fenêtre A11).
import { type DOMWrapper, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Depots } from '@/donnees/depots'
import { CLE_AIMANTATION } from '@/donnees/preferences'
import { textes } from '@/textes/fr'
import { monterPage } from './monter-page'
import { annonces, bouton, carte, ouvrirJeu, T118, texte } from './plan-aides'

const t = textes.plan
const tm = t.manuel

/** Le bouton d'un article dans un cadre de vue (0 : Dessus, 1 : Gauche). */
function article(page: VueWrapper, repere: string, cadre = 0): DOMWrapper<HTMLElement> {
  const trouve = page
    .findAll('section.cadre')
    [cadre]?.findAll<HTMLElement>('.calque__bouton')
    .find((b) => (b.attributes('aria-label') ?? '').startsWith(`${repere},`))
  if (!trouve) throw new Error(`Article ${repere} introuvable`)
  return trouve
}

/** Une touche pressée sur un article, comme au clavier. */
async function presser(
  cible: DOMWrapper<HTMLElement>,
  key: string,
  options: KeyboardEventInit = {},
) {
  await cible.trigger('keydown', { key, ...options })
  await flushPromises()
}

/** Une touche pressée ailleurs dans la page : Échap, Ctrl + Z. */
async function presserPage(key: string, options: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }))
  await flushPromises()
}

/** La ligne du tableau des placements d'un article, cellule par cellule : « … 3 700 1 240 0 À plat … ». */
function ligne(page: VueWrapper, repere: string): string {
  const tr = page
    .findAll('table.placements tbody tr')
    .find((l) => texte(l.find('.placements__repere')) === repere)
  return (tr?.findAll('td') ?? []).map((td) => texte(td).trim()).join(' ')
}

/** Le dernier plan enregistré, et le placement d'un article par son rang d'origine. */
async function dernier(depots: Depots) {
  const plan = await depots.plans.obtenirDernier(T118)
  if (!plan) throw new Error('Aucun plan')
  return plan
}

/** Sélectionne un article par sa ligne du tableau. */
async function selectionner(page: VueWrapper, repere: string) {
  const b = page
    .findAll('button.placements__article')
    .find((x) => texte(x.find('.placements__repere')) === repere)
  if (!b) throw new Error(`Ligne ${repere} introuvable`)
  await b.trigger('click')
  await flushPromises()
}

const zone = (page: VueWrapper) => carte(page, t.aPlacer.titre)

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Plan : ajuster au clavier (RG-08, RG-09, 5.3)', () => {
  it('RG-08 : refuse A12 posé sur la fenêtre A11 (capture 04f) ; A12 reprend sa place', async () => {
    localStorage.setItem(CLE_AIMANTATION, 'non')
    const { page, depots } = await ouvrirJeu('couloirs')
    const a12 = article(page, 'A12')
    // Maj + ↑ en vue de dessus : 500 mm vers la paroi droite ; A12 se pose au
    // plus bas, sur le dessus des fenêtres A11 et A10 (décision 2).
    await presser(a12, 'ArrowUp', { shiftKey: true })
    expect(texte(page.find('.bandeau-en-cours'))).toContain('1 740 mm de la paroi gauche')
    expect(texte(page.find('.bandeau-en-cours'))).toContain('1 350 mm du plancher')
    await presser(article(page, 'A12'), 'Enter')

    const bandeau = texte(page.find('.bandeau-refus'))
    expect(bandeau).toContain('Déplacement refusé : article fragile')
    expect(bandeau).toContain('RG-04 · RG-08')
    // A12 repose sur les deux fenêtres : le message en nomme une.
    expect(bandeau).toMatch(
      /« Carton de quincaillerie » \(A12, C2\) reposerait sur « Fenêtre PVC 2 vantaux 150 × 135 » \(A1[01], C2\)\. Un article fragile ne supporte rien au-dessus de lui\. L'article reprend sa place\./,
    )
    expect(annonces(page)).toContain('Déplacement refusé : article fragile')
    expect(ligne(page, 'A12')).toContain('3 700 1 240 0')
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(false)
    // Le focus revient sur l'article.
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^A12,/)
  })

  it('RG-09 : refuse une sortie de la caisse par les portes', async () => {
    localStorage.setItem(CLE_AIMANTATION, 'non')
    const { page } = await ouvrirJeu('couloirs')
    for (let i = 0; i < 6; i++) {
      await presser(article(page, 'A12'), 'ArrowRight', { shiftKey: true })
    }
    expect(texte(page.find('.bandeau-en-cours'))).toContain('Position refusée, hors de la caisse')
    await presser(article(page, 'A12'), 'Enter')
    expect(texte(page.find('.bandeau-refus'))).toContain('Déplacement refusé : hors de la caisse')
    expect(texte(page.find('.bandeau-refus'))).toContain('RG-06 · RG-09')
    expect(ligne(page, 'A12')).toContain('3 700 1 240 0')
  })

  it("RG-09 : avec l'aimantation, l'article s'arrête au contact de la fenêtre A11", async () => {
    const { page } = await ouvrirJeu('couloirs')
    expect(page.find('[role="switch"]').attributes('aria-checked')).toBe('true')
    // A12 touche déjà A11 du côté de la paroi droite : il ne bouge pas.
    await presser(article(page, 'A12'), 'ArrowUp', { shiftKey: true })
    expect(texte(page.find('.bandeau-en-cours'))).toContain('1 240 mm de la paroi gauche')
    // Vers la paroi gauche, le pas est de 50 mm.
    await presser(article(page, 'A12'), 'ArrowDown')
    expect(texte(page.find('.bandeau-en-cours'))).toContain('1 190 mm de la paroi gauche')
  })

  it('RG-08 : un déplacement accepté est enregistré, marqué « ajustée à la main », et survit au rechargement', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await presser(article(page, 'A12'), 'ArrowRight')
    expect(texte(page.find('.bandeau-en-cours'))).toContain(tm.enCours.permise)
    await presser(article(page, 'A12'), 'Enter')

    expect(page.find('.bandeau-en-cours').exists()).toBe(false)
    expect(annonces(page)).toContain('A12 déplacé. Le plan est enregistré.')
    expect(ligne(page, 'A12')).toContain('3 750 1 240 0')
    expect(texte(page.find('.entete-page'))).toContain(tm.ajusteeALaMain)
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(true)

    // Rechargement : la page est recréée sur les mêmes données.
    page.unmount()
    const { page: rechargee } = await monterPage(`/tournees/${T118}/plan`, depots)
    expect(ligne(rechargee, 'A12')).toContain('3 750 1 240 0')
    expect(texte(rechargee.find('.entete-page'))).toContain(tm.ajusteeALaMain)
    // L'historique ne survit pas au rechargement (décision 4).
    expect(bouton(rechargee, tm.annuler).attributes('disabled')).toBeDefined()
  })

  it('RG-08 : Échap annule le déplacement en cours, sans rien enregistrer', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await presser(article(page, 'A12'), 'ArrowRight')
    await presserPage('Escape')
    expect(page.find('.bandeau-en-cours').exists()).toBe(false)
    expect(annonces(page)).toContain(tm.fait.deplacementAnnule)
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(false)
  })

  it('RG-08 : Ctrl + Z annule plusieurs déplacements, et chaque annulation est enregistrée', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await presser(article(page, 'A12'), 'ArrowRight')
    await presser(article(page, 'A12'), 'Enter')
    await presser(article(page, 'A12'), 'ArrowRight')
    await presser(article(page, 'A12'), 'Enter')
    expect(ligne(page, 'A12')).toContain('3 800 1 240 0')

    await presserPage('z', { ctrlKey: true })
    expect(ligne(page, 'A12')).toContain('3 750 1 240 0')
    expect(annonces(page)).toContain('Déplacement de A12 annulé. Le plan est enregistré.')
    await bouton(page, tm.annuler).trigger('click')
    await flushPromises()
    expect(ligne(page, 'A12')).toContain('3 700 1 240 0')
    const enregistre = await dernier(depots)
    const a12 = enregistre.placements.find((p) => p.rang === 12)
    expect(a12?.x).toBe(3700)
    // Plus rien à annuler.
    expect(bouton(page, tm.annuler).attributes('disabled')).toBeDefined()
    await presserPage('z', { ctrlKey: true })
    expect(annonces(page)).toContain(tm.fait.rienAAnnuler)
  })

  it("RG-08 : R refuse de changer l'orientation d'un article qui n'en a qu'une", async () => {
    const { page } = await ouvrirJeu('couloirs')
    await presser(article(page, 'A12'), 'r')
    expect(texte(page.find('.bandeau-refus'))).toContain(
      "Changement d'orientation refusé : une seule orientation",
    )
  })
})

describe('Plan : retirer, choisir une place, placer (RG-08, 5.3, 5.7)', () => {
  it('RG-08 : « Retirer du plan » envoie A12 dans la zone ; « Placer » le remet sans bouger les autres', async () => {
    const { page } = await ouvrirJeu('couloirs')
    const avant = page.findAll('table.placements tbody tr').map((l) => texte(l))
    await selectionner(page, 'A12')
    await bouton(carte(page, t.selection), tm.retirer).trigger('click')
    await flushPromises()

    expect(texte(zone(page))).toContain('Carton de quincaillerie')
    expect(texte(zone(page))).toContain(tm.retire)
    expect(annonces(page)).toContain('A12 retiré vers « Articles à placer »')
    // A12 sort de l'ordre de chargement (écart connu de la capture 04h).
    expect(page.findAll('.ordre li')).toHaveLength(11)

    const placer = zone(page)
      .findAll('button')
      .find((b) => texte(b).startsWith(tm.placer))
    await placer?.trigger('click')
    await flushPromises()
    expect(texte(zone(page))).toContain(t.aPlacer.vide)
    expect(annonces(page)).toContain('1 article placé dans le camion')
    // Les onze autres articles n'ont pas bougé.
    const apres = page.findAll('table.placements tbody tr').map((l) => texte(l))
    for (const repere of ['A01', 'A04', 'A07', 'A11']) {
      expect(apres).toContain(avant.find((l) => l.includes(repere)))
    }
  })

  it('RG-08 : un retrait qui laisserait A05 sans appui est refusé ; « Retirer aussi A05 » retire les deux, en une action annulable', async () => {
    const { page } = await ouvrirJeu('couloirs')
    await selectionner(page, 'A04')
    await bouton(carte(page, t.selection), tm.retirer).trigger('click')
    await flushPromises()

    const refus = page.find('.bandeau-refus')
    expect(texte(refus)).toContain('Retrait refusé : appui insuffisant')
    expect(texte(refus)).toContain(
      "« Paquet de plaques BA13 250 × 120 » (A04, C3) porte « Paquet de plaques BA13 250 × 120 » (A05, C3) : retirez d'abord",
    )
    await bouton(refus, 'Retirer aussi A05').trigger('click')
    await flushPromises()
    expect(zone(page).findAll('.a-placer__article')).toHaveLength(2)

    await presserPage('z', { ctrlKey: true })
    expect(texte(zone(page))).toContain(t.aPlacer.vide)
    expect(page.findAll('.ordre li')).toHaveLength(12)
  })

  it('RG-08 : « Choisir une place » propose au plus 5 places ; un clic y pose l’article (capture 04h)', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await selectionner(page, 'A12')
    await bouton(carte(page, t.selection), tm.choisirPlace).trigger('click')
    await flushPromises()

    const marques = page.findAll('section.cadre')[0]?.findAll('.calque__place') ?? []
    expect(marques.length).toBeGreaterThan(0)
    expect(marques.length).toBeLessThanOrEqual(5)
    expect(marques[0]?.attributes('aria-label')).toMatch(/^Place 1 sur \d : .* mm du fond/)
    expect(texte(page.find('.bandeau-places'))).toContain('Placement de A12 (C2)')
    expect(document.activeElement).toBe(marques[0]?.element)

    await marques[0]?.trigger('click')
    await flushPromises()
    expect(page.find('.bandeau-places').exists()).toBe(false)
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(true)
  })

  it('Échap ferme les places proposées sans rien changer', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await selectionner(page, 'A12')
    await bouton(carte(page, t.selection), tm.choisirPlace).trigger('click')
    await flushPromises()
    await presserPage('Escape')
    expect(page.find('.calque__place').exists()).toBe(false)
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(false)
  })
})

describe('Plan : aimantation, plans ajustables et relance (RG-20, RG-22, décisions 5 et 8)', () => {
  it("RG-08 : l'aimantation se désactive, et le choix survit au rechargement", async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    await page.find('[role="switch"]').trigger('click')
    await flushPromises()
    expect(localStorage.getItem(CLE_AIMANTATION)).toBe('non')
    expect(annonces(page)).toContain(tm.fait.aimantation(false))
    page.unmount()
    const { page: rechargee } = await monterPage(`/tournees/${T118}/plan`, depots)
    expect(rechargee.find('[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it("RG-20 : l'équilibre et l'ordre de chargement se mettent à jour après un retrait", async () => {
    const { page } = await ouvrirJeu('couloirs')
    const equilibre = texte(carte(page, t.equilibre.titre))
    await selectionner(page, 'A07')
    await bouton(carte(page, t.selection), tm.retirer).trigger('click')
    await flushPromises()
    expect(texte(carte(page, t.equilibre.titre))).not.toBe(equilibre)
    expect(page.findAll('.ordre li')).toHaveLength(11)
  })

  it('RG-08 : un plan « à recalculer » ne s’ajuste pas, et la page dit pourquoi (décision 8)', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    page.unmount()
    await depots.plans.marquerARecalculer((await dernier(depots)).plan.id)
    const { page: rechargee } = await monterPage(`/tournees/${T118}/plan`, depots)
    expect(texte(rechargee.find('.barre'))).toContain(tm.nonAjustable.aRecalculer)
    expect(rechargee.find('[role="switch"]').exists()).toBe(false)
    await selectionner(rechargee, 'A12')
    expect(texte(carte(rechargee, t.selection))).not.toContain(tm.retirer)
    // Les flèches ne déplacent rien.
    await presser(article(rechargee, 'A12'), 'ArrowRight')
    expect(rechargee.find('.bandeau-en-cours').exists()).toBe(false)
  })

  it('RG-22 : « Relancer le calcul » ne demande confirmation que sur un plan ajusté à la main', async () => {
    const { page, depots } = await ouvrirJeu('couloirs')
    // Plan calculé, non ajusté : pas de fenêtre, une nouvelle version.
    await bouton(page, t.relancer).trigger('click')
    await flushPromises()
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect((await dernier(depots)).plan.version).toBe(2)

    // Ajusté : la fenêtre prévient, de ton neutre, que la version reste consultable.
    await presser(article(page, 'A01'), 'ArrowRight')
    await presser(article(page, 'A01'), 'Enter')
    expect((await dernier(depots)).plan.ajusteALaMain).toBe(true)
    await bouton(page, t.relancer).trigger('click')
    await flushPromises()
    const fenetre = document.querySelector('dialog[open]')
    expect(fenetre?.textContent).toContain(tm.confirmationRelance.titre)
    expect(fenetre?.textContent).toContain(
      'Le nouveau calcul ne reprendra pas vos ajustements. La version 2, ajustée à la main, restera consultable.',
    )
    const confirmer = [...(fenetre?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.trim() === tm.confirmationRelance.action,
    )
    confirmer?.click()
    await flushPromises()
    const nouvelle = await dernier(depots)
    expect(nouvelle.plan.version).toBe(3)
    expect(nouvelle.plan.ajusteALaMain).toBe(false)
    // Nouvelle version : l'historique est vidé (décision 4).
    expect(bouton(page, tm.annuler).attributes('disabled')).toBeDefined()
  })
})
