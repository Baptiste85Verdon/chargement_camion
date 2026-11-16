// Plan de chargement : équilibre, calage et dépassement (étape 10b ; captures
// 04, 04a, 04b ; cahier technique 5.7, 5.16, 5.17 ; RG-10, RG-11, RG-19, RG-20).
// Base d'exemple : la tournée T-2026-118, avec le plan de référence d'un jeu
// d'essai (« couloirs » ou « fenêtres isolées ») ou un plan calculé.
import { type DOMWrapper, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PlacementEnregistre } from '@/domaine/modele'
import { vuesOuVisible } from '@/domaine/projection'
import { calculerPlan } from '@/domaine/tournee'
import type { Depots, PlacementAEnregistrer } from '@/donnees/depots'
import { textes } from '@/textes/fr'
import { chargerJeuEssai, type NomJeuEssai } from '../jeux-essai/charger'
import couloirs from '../jeux-essai/couloirs.json'
import fenetresIsolees from '../jeux-essai/fenetres-isolees.json'
import { depotsDemarrage, monterPage } from './monter-page'

const T118 = 'b0000000-0000-4000-8000-000000000118'
const t = textes.plan
const JSON_JEUX = { couloirs, 'fenetres-isolees': fenetresIsolees }

/**
 * Traduit le plan d'un jeu d'essai en placements de la base d'exemple : chaque
 * unité (A01…) retrouve la ligne de sa commande (C1…) par le nom de l'article,
 * et prend le numéro d'unité suivant dans cette ligne.
 */
async function placementsDuJeu(depots: Depots, nom: NomJeuEssai) {
  const [commandes, articles] = await Promise.all([
    depots.commandes.listerParTournee(T118),
    depots.articles.lister({ avecArchives: true }),
  ])
  const nomArticle = new Map(articles.map((a) => [a.id, a.nom]))
  const jeu = chargerJeuEssai(nom)
  const numeros = new Map<string, number>()
  return JSON_JEUX[nom].unites.map((u): PlacementAEnregistrer => {
    const commande = commandes.find((c) => `C${c.commande.rangLivraison}` === u.commande)
    const debut = u.article.split(',')[0] ?? ''
    const ligne = commande?.lignes.find((l) => nomArticle.get(l.articleId)?.startsWith(debut))
    if (!ligne) throw new Error(`Ligne introuvable pour ${u.id}`)
    const numero = (numeros.get(ligne.id) ?? 0) + 1
    numeros.set(ligne.id, numero)
    const p = jeu.placements.find((x) => x.uniteId === u.id)
    if (!p) throw new Error(`Placement introuvable pour ${u.id}`)
    return {
      ligneCommandeId: ligne.id,
      numeroUnite: numero,
      x: p.x,
      y: p.y,
      z: p.z,
      orientation: p.orientation,
      rang: p.rang,
      statut: 'aFaire',
    }
  })
}

async function ouvrirAvec(placements: (depots: Depots) => Promise<PlacementAEnregistrer[]>) {
  const depots = depotsDemarrage()
  await depots.plans.enregistrerVersion(T118, await placements(depots))
  return { ...(await monterPage(`/tournees/${T118}/plan`, depots)), depots }
}

const ouvrirJeu = (nom: NomJeuEssai) => ouvrirAvec((d) => placementsDuJeu(d, nom))

/** Le plan calculé par l'application, sans les placements que `retirer` désigne. */
async function planCalculeSans(depots: Depots, retirer: (p: PlacementAEnregistrer) => boolean) {
  const [tournee, articles, commandes] = await Promise.all([
    depots.tournees.obtenir(T118),
    depots.articles.lister({ avecArchives: true }),
    depots.commandes.listerParTournee(T118),
  ])
  const camion = await depots.camions.obtenir(tournee?.modeleCamionId ?? '')
  if (!camion) throw new Error('Camion introuvable')
  return calculerPlan(commandes, articles, camion).placements.filter((p) => !retirer(p))
}

/** Lignes de C4 dans la base d'exemple : parpaings (2 unités), ciment (1 unité). */
const PARPAINGS = 'e0000000-0000-4000-8000-000000000006'
const CIMENT = 'e0000000-0000-4000-8000-000000000007'
const C4 = 'd0000000-0000-4000-8000-000000000004'

/** Éléments en attente venus de T-2026-118 : la base d'exemple en contient déjà d'autres. */
const attenteDeT118 = async (depots: Depots) =>
  (await depots.attente.lister()).filter((e) => e.tourneeOrigineId === T118)

/** Texte lisible, espaces fines insécables ramenées à des espaces simples. */
const texte = (w: { text(): string } | undefined) => (w?.text() ?? '').replace(/\s+/g, ' ')

/** Une page, une carte ou un bandeau : tout ce qui contient des boutons. */
type Racine = { findAll(selecteur: string): DOMWrapper<Element>[] }

function bouton(racine: Racine, libelle: string) {
  const trouve = racine.findAll('button').find((b) => texte(b).trim() === libelle)
  if (!trouve) throw new Error(`Bouton « ${libelle} » introuvable`)
  return trouve
}

const carte = (page: VueWrapper, titre: string) => {
  const trouvee = page
    .findAll('section.carte')
    .find((s) => s.find('.carte__titre').text().startsWith(titre))
  if (!trouvee) throw new Error(`Carte « ${titre} » introuvable`)
  return trouvee
}

/** Messages de la zone aria-live de la page. */
const annonces = (page: VueWrapper) =>
  page
    .findAll('[role="status"]')
    .map((s) => texte(s))
    .join(' | ')

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// --- Équilibre de la charge (RG-20, 5.17) ----------------------------------------------

describe('Plan de chargement : équilibre de la charge (RG-20)', () => {
  it('RG-20 : donne 55 / 45 au départ et le statut « À surveiller », pire moment 59 / 41', async () => {
    const { page } = await ouvrirJeu('couloirs')
    const c = carte(page, t.equilibre.titre)
    expect(texte(c)).toContain(t.equilibre.statuts.aSurveiller)
    expect(texte(c)).toContain('pire moment 59 / 41, après C1 et C2')
    expect(texte(c)).toContain('55 % · 3,9 t')
    expect(texte(c)).toContain('45 % · 3,2 t')
    // Le statut a son contour d'alerte, et une icône en plus du texte.
    expect(c.classes()).toContain('equilibre--alerte')
    expect(c.find('.equilibre__statut svg').exists()).toBe(true)
  })

  it('RG-20 : situe le centre de gravité au départ, sans juger la distance au fond', async () => {
    const { page } = await ouvrirJeu('couloirs')
    expect(texte(carte(page, t.equilibre.titre))).toContain(
      "Au départ, centre de gravité à 2,22 m du fond et à 12 cm à gauche de l'axe.",
    )
  })

  it('RG-20 : le tableau « Au fil de la tournée » donne le départ puis chaque livraison', async () => {
    const { page } = await ouvrirJeu('couloirs')
    const c = carte(page, t.equilibre.titre)
    expect(c.find('details summary').text()).toBe(t.equilibre.auFil)
    const lignes = c.findAll('details tbody tr').map((l) => texte(l))
    expect(lignes).toHaveLength(4)
    expect(lignes[0]).toContain('Départ')
    expect(lignes[0]).toContain('55 %')
    expect(lignes[1]).toContain('Après C1')
    expect(lignes[1]).toContain('59 %')
    expect(lignes[3]).toContain('Après C3')
    expect(lignes[3]).toContain('58 %')
  })

  it('RG-20 : un plan vide affiche « Aucun article », sans statut, jauge ni tableau', async () => {
    const { page } = await ouvrirAvec(async () => [])
    const c = carte(page, t.equilibre.titre)
    expect(texte(c)).toContain(t.equilibre.vide)
    expect(texte(c)).not.toContain(t.equilibre.statuts.equilibre)
    expect(c.find('.jauge').exists()).toBe(false)
    expect(c.find('details').exists()).toBe(false)
  })

  it('RG-20 : la vue de dessus montre le centre de gravité, l’axe et la distance au fond', async () => {
    const { page } = await ouvrirJeu('couloirs')
    const [dessus, gauche] = page.findAll('section.cadre')
    expect(dessus?.find('.scene__axe').exists()).toBe(true)
    expect(dessus?.find('.scene__cg').exists()).toBe(true)
    expect(texte(dessus?.find('.calque__cg'))).toContain('CG à 2,22 m du fond')
    // Le marqueur n'est pas un article : décoratif, il n'a pas de bouton.
    expect(dessus?.find('.calque__cg').attributes('aria-hidden')).toBe('true')
    expect(dessus?.find('.calque__cg button').exists()).toBe(false)
    // Seule la vue de dessus le montre.
    expect(gauche?.find('.scene__cg').exists()).toBe(false)
  })
})

// --- Articles mal calés (RG-19, 5.16) --------------------------------------------------

describe('Plan de chargement : articles mal calés (RG-19)', () => {
  it('RG-19 : le jeu « couloirs » n’a aucun article mal calé', async () => {
    const { page } = await ouvrirJeu('couloirs')
    expect(page.find('.bandeau-calage').exists()).toBe(false)
  })

  it('RG-19 : signale A10, A11 et A12 de la variante « fenêtres isolées »', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    const bandeau = page.get('.bandeau-calage')
    expect(texte(bandeau)).toContain('3 articles mal calés : A10, A11, A12 (C2)')
    expect(annonces(page)).toContain('3 articles mal calés : A10, A11, A12 (C2)')
    // Mention dans le tableau, triangle sur les blocs.
    const mentions = page
      .findAll('.placements tbody tr')
      .filter((l) => l.text().includes('mal calé'))
    expect(mentions.map((l) => l.find('.placements__repere').text())).toEqual(['A10', 'A11', 'A12'])
    expect(page.findAll('.calque__mal-cale').length).toBeGreaterThan(0)
  })

  it('RG-19 : « Voir » sélectionne les articles mal calés, les liste et y porte le focus', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    await bouton(page.get('.bandeau-calage'), t.calage.voir).trigger('click')
    await flushPromises()

    const c = carte(page, t.selectionMultiple(3))
    expect(c.findAll('.multiple li').map((l) => l.find('.donnees').text())).toEqual([
      'A10',
      'A11',
      'A12',
    ])
    expect(document.activeElement).toBe(c.element)
    expect(annonces(page)).toContain('3 articles mal calés sélectionnés')
    // Dans la vue de dessus, les trois blocs portent l'anneau de sélection.
    expect(page.findAll('section.cadre')[0]?.findAll('.calque__selection')).toHaveLength(3)
  })

  it('RG-19 : Échap sort de la sélection multiple', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    await bouton(page.get('.bandeau-calage'), t.calage.voir).trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(texte(carte(page, t.selection))).toContain(t.selectionVide)
  })

  it('RG-19 : un clic ailleurs sort de la sélection multiple', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    await bouton(page.get('.bandeau-calage'), t.calage.voir).trigger('click')
    await flushPromises()
    page.get('.barre').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(texte(carte(page, t.selection))).toContain(t.selectionVide)
  })

  it('RG-19 : un clic sur un article de la liste revient à la sélection de cet article', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    await bouton(page.get('.bandeau-calage'), t.calage.voir).trigger('click')
    await flushPromises()
    const c = carte(page, t.selectionMultiple(3))
    await c.findAll('.multiple li button')[1]?.trigger('click')
    await flushPromises()
    const detail = carte(page, t.selection)
    expect(texte(detail)).toContain('A11')
    expect(page.findAll('section.cadre')[0]?.findAll('.calque__selection')).toHaveLength(1)
  })

  it('RG-19 : propose une vue où se voit un article sélectionné caché dans les deux cadres', async () => {
    const { page } = await ouvrirJeu('fenetres-isolees')
    const [premier, second] = page.findAll('section.cadre')
    await premier?.find('input[value="avant"]').setValue(true)
    await second?.find('input[value="droite"]').setValue(true)
    await bouton(page.get('.bandeau-calage'), t.calage.voir).trigger('click')
    await flushPromises()

    // Ce que la page doit proposer, d'après la projection du domaine.
    const jeu = chargerJeuEssai('fenetres-isolees')
    const attendu = ['A10', 'A11', 'A12'].map((id) => {
      const vues = vuesOuVisible(id, jeu.placements, jeu.unites, jeu.camion)
      if (vues.includes('avant') || vues.includes('droite')) return null
      const vue = vues.find((v) => v !== 'avant')
      return vue ? t.voirDansVue(t.vues[vue]) : t.cacheToutesVues
    })
    expect(attendu.some((a) => a !== null)).toBe(true)

    const lignes = carte(page, t.selectionMultiple(3)).findAll('.multiple li')
    lignes.forEach((ligne, i) => {
      const a = attendu[i]
      if (a === null || a === undefined) {
        expect(texte(ligne)).not.toContain('Voir dans la vue')
      } else {
        expect(texte(ligne)).toContain(a)
      }
    })
  })
})

// --- Dépassement et report (RG-10, RG-11, 5.7) ------------------------------------------

describe('Plan de chargement : dépassement et report (RG-10, RG-11)', () => {
  it('RG-10 : sans dépassement, la zone « Articles à placer » est vide', async () => {
    const { page } = await ouvrirJeu('couloirs')
    expect(page.find('.bandeau-depassement').exists()).toBe(false)
    expect(texte(carte(page, t.aPlacer.titre))).toContain(t.aPlacer.vide)
  })

  it('RG-10 : signale les articles sans place et leur commande, et les liste à part', async () => {
    const { page } = await ouvrirAvec((d) =>
      planCalculeSans(d, (p) => p.ligneCommandeId === CIMENT),
    )
    const bandeau = page.get('.bandeau-depassement')
    expect(texte(bandeau)).toContain("1 article de C4 n'a pas de place dans le camion")
    expect(texte(bandeau)).toContain('A12')
    const zone = carte(page, t.aPlacer.titre)
    expect(texte(zone)).toContain('Palette de sacs de ciment')
    expect(texte(zone)).toContain('C4')
    expect(annonces(page)).toContain("1 article de C4 n'a pas de place dans le camion")
  })

  it('RG-11 : reporte les articles en trop, et scinde une ligne reportée en partie', async () => {
    const { page, depots } = await ouvrirAvec((d) =>
      planCalculeSans(d, (p) => p.ligneCommandeId === PARPAINGS && p.numeroUnite === 2),
    )
    await bouton(page.get('.bandeau-depassement'), t.depassement.reporterEnTrop(1)).trigger('click')
    await flushPromises()

    const attente = await attenteDeT118(depots)
    expect(attente).toHaveLength(1)
    expect(attente[0]).toMatchObject({ commandeId: C4, motif: 'depassement', rangOrigine: 4 })
    const c4 = await depots.commandes.obtenir(C4)
    expect(c4?.lignes.map((l) => l.quantite)).toEqual([1, 1, 1])
    expect(page.find('.bandeau-depassement').exists()).toBe(false)
    expect(annonces(page)).toContain(t.depassement.articlesReportes(1))
  })

  it('RG-11 : reporte toute la commande après confirmation, puis relance le calcul', async () => {
    const { page, depots } = await ouvrirAvec((d) =>
      planCalculeSans(d, (p) => p.ligneCommandeId === CIMENT),
    )
    await bouton(page.get('.bandeau-depassement'), t.depassement.reporterCommande('C4', 3)).trigger(
      'click',
    )
    await flushPromises()
    const fenetre = page.get('dialog[open]')
    expect(texte(fenetre)).toContain(t.depassement.confirmation.titre('C4'))
    await bouton(fenetre, t.depassement.confirmation.action).trigger('click')
    await flushPromises()

    expect(await attenteDeT118(depots)).toEqual([
      expect.objectContaining({ commandeId: C4, ligneCommandeId: null, rangOrigine: 4 }),
    ])
    const versions = await depots.plans.listerVersions(T118)
    expect(versions).toHaveLength(2)
    const dernier = await depots.plans.obtenirDernier(T118)
    expect(dernier?.plan.aRecalculer).toBe(false)
    const lignesC4 = new Set([PARPAINGS, CIMENT])
    expect(
      dernier?.placements.some((p: PlacementEnregistre) => lignesC4.has(p.ligneCommandeId)),
    ).toBe(false)
    // Le nouveau plan ne compte plus que trois commandes ; C4 ne figure plus dans la légende.
    expect(texte(page)).toContain('3 commandes')
    expect(page.findAll('.legende li').map((l) => texte(l))).not.toContainEqual(
      expect.stringContaining('Maçonnerie Pereira'),
    )
    expect(annonces(page)).toContain(t.depassement.commandeReportee('C4'))
  })

  it('RG-11 : annuler la confirmation ne reporte rien', async () => {
    const { page, depots } = await ouvrirAvec((d) =>
      planCalculeSans(d, (p) => p.ligneCommandeId === CIMENT),
    )
    await bouton(page.get('.bandeau-depassement'), t.depassement.reporterCommande('C4', 3)).trigger(
      'click',
    )
    await flushPromises()
    await bouton(page.get('dialog[open]'), textes.composants.annuler).trigger('click')
    await flushPromises()
    expect(await attenteDeT118(depots)).toEqual([])
  })

  it('RG-11 : une ligne déjà reportée n’est plus à placer', async () => {
    const depots = depotsDemarrage()
    await depots.plans.enregistrerVersion(
      T118,
      await planCalculeSans(depots, (p) => p.ligneCommandeId === CIMENT),
    )
    await depots.attente.reporterArticles(
      T118,
      [{ ligneCommandeId: CIMENT, quantite: 1 }],
      'depassement',
    )
    const { page } = await monterPage(`/tournees/${T118}/plan`, depots)
    expect(page.find('.bandeau-depassement').exists()).toBe(false)
    expect(texte(carte(page, t.aPlacer.titre))).toContain(t.aPlacer.vide)
  })
})

// --- Relancer le calcul ----------------------------------------------------------------

describe('Plan de chargement : relancer le calcul', () => {
  it('RG-22 : un plan « à recalculer » le dit et propose de relancer le calcul', async () => {
    const depots = depotsDemarrage()
    const { plan } = await depots.plans.enregistrerVersion(
      T118,
      await planCalculeSans(depots, () => false),
    )
    await depots.plans.marquerARecalculer(plan.id)
    const { page } = await monterPage(`/tournees/${T118}/plan`, depots)

    expect(texte(page)).toContain(t.aRecalculer)
    await bouton(page, t.relancer).trigger('click')
    await flushPromises()

    expect(await depots.plans.listerVersions(T118)).toHaveLength(2)
    expect(texte(page)).not.toContain(t.aRecalculer)
    expect(annonces(page)).toContain(textes.preparation.planCalcule(2, 12))
  })
})
