// Contrat des dépôts (cahier technique 7.1) : ce que toute implémentation
// doit faire, qu'elle parle à Supabase, à une API ou à la mémoire.
// Chaque implémentation lance ces mêmes tests avec sa propre fabrique.
import { beforeEach, describe, expect, it } from 'vitest'
import type { FicheArticle, ModeleCamion, Tournee } from '@/domaine/modele'
import type { AEnregistrer, Depots, LigneAEnregistrer } from '@/donnees/depots'

const ba13: AEnregistrer<FicheArticle> = {
  reference: 'PLQ-BA13',
  nom: 'Paquet de plaques BA13 250 × 120',
  famille: 'Plaques de plâtre',
  dimsEmballees: { l: 2500, w: 1200, h: 250 },
  poids: 500,
  fragile: false,
  orientations: ['aPlat', 'contreParoi'],
  forme: 'rectangulaire',
  porteur: true,
}

const fenetre: AEnregistrer<FicheArticle> = {
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

const porteur72: AEnregistrer<ModeleCamion> = {
  nom: 'Porteur 7,2 m',
  longueur: 7200,
  largeur: 2400,
  hauteur: 2500,
}

export function verifierContratDepots(nom: string, fabrique: () => Depots | Promise<Depots>) {
  describe(`contrat des dépôts : ${nom}`, () => {
    let depots: Depots

    beforeEach(async () => {
      depots = await fabrique()
    })

    /** Crée un camion et une tournée en préparation qui l'utilise. */
    async function tournee(reference = 'T-2026-118'): Promise<Tournee> {
      const camion = await depots.camions.enregistrer(porteur72)
      return depots.tournees.enregistrer({
        reference,
        date: '2026-11-05',
        modeleCamionId: camion.id,
        statut: 'enPreparation',
      })
    }

    const ligne = (
      articleId: string,
      modif: Partial<LigneAEnregistrer> = {},
    ): LigneAEnregistrer => ({
      articleId,
      quantite: 2,
      nu: false,
      poidsEstime: false,
      ...modif,
    })

    /** Un placement minimal de l'unité 1 d'une ligne, au rang donné. */
    const poser = (ligneCommandeId: string, rang: number) => ({
      ligneCommandeId,
      numeroUnite: 1,
      x: 0,
      y: 0,
      z: 0,
      orientation: 'aPlat' as const,
      rang,
      statut: 'aFaire' as const,
    })

    describe('articles', () => {
      it('crée un article, lui donne un identifiant et le relit à l’identique', async () => {
        const cree = await depots.articles.enregistrer(fenetre)
        expect(cree.id).toBeTruthy()
        expect(cree).toEqual({ ...fenetre, id: cree.id })
        expect(await depots.articles.obtenir(cree.id)).toEqual(cree)
      })

      it('liste les articles par nom', async () => {
        await depots.articles.enregistrer(ba13)
        await depots.articles.enregistrer(fenetre)
        const noms = (await depots.articles.lister()).map((a) => a.nom)
        expect(noms).toEqual([fenetre.nom, ba13.nom])
      })

      it('modifie un article existant', async () => {
        const cree = await depots.articles.enregistrer(ba13)
        await depots.articles.enregistrer({ ...cree, poids: 520 })
        expect((await depots.articles.obtenir(cree.id))?.poids).toBe(520)
        expect(await depots.articles.lister()).toHaveLength(1)
      })

      it('retire la taille nue quand elle n’est plus donnée', async () => {
        const cree = await depots.articles.enregistrer(fenetre)
        await depots.articles.enregistrer({ ...cree, dimsNues: undefined })
        expect((await depots.articles.obtenir(cree.id))?.dimsNues).toBeUndefined()
      })

      it('renvoie null pour un article inconnu', async () => {
        expect(await depots.articles.obtenir('00000000-0000-4000-8000-000000000000')).toBeNull()
      })

      it('RG-21 : refuse une référence déjà prise, sur le champ « reference »', async () => {
        await depots.articles.enregistrer(ba13)
        await expect(
          depots.articles.enregistrer({ ...fenetre, reference: 'PLQ-BA13' }),
        ).rejects.toMatchObject({
          name: 'ErreurDonnees',
          code: 'doublon',
          champ: 'reference',
        })
      })

      it('accepte plusieurs articles sans référence', async () => {
        await depots.articles.enregistrer({ ...ba13, reference: undefined })
        await depots.articles.enregistrer({ ...fenetre, reference: undefined })
        expect(await depots.articles.lister()).toHaveLength(2)
      })

      it('supprime un article inutilisé, refuse un article utilisé par une commande', async () => {
        const libre = await depots.articles.enregistrer(fenetre)
        await depots.articles.supprimer(libre.id)
        expect(await depots.articles.obtenir(libre.id)).toBeNull()

        const utilise = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'SCI Martin', rangLivraison: 1 },
          [ligne(utilise.id)],
        )
        await expect(depots.articles.supprimer(utilise.id)).rejects.toMatchObject({
          code: 'utilise',
        })
      })
    })

    describe('camions', () => {
      it('crée, relit, modifie et liste les modèles de camions', async () => {
        const cree = await depots.camions.enregistrer(porteur72)
        expect(await depots.camions.obtenir(cree.id)).toEqual({ ...porteur72, id: cree.id })
        await depots.camions.enregistrer({ ...cree, hauteur: 2550 })
        expect(await depots.camions.lister()).toEqual([
          { ...porteur72, id: cree.id, hauteur: 2550 },
        ])
      })

      it('refuse de supprimer un camion utilisé par une tournée', async () => {
        const t = await tournee()
        await expect(depots.camions.supprimer(t.modeleCamionId ?? '')).rejects.toMatchObject({
          code: 'utilise',
        })
      })
    })

    describe('tournées', () => {
      it('crée une tournée et la relit à l’identique', async () => {
        const t = await tournee()
        expect(await depots.tournees.obtenir(t.id)).toEqual(t)
      })

      it('accepte une tournée en préparation sans date ni camion (capture 02e)', async () => {
        const t = await depots.tournees.enregistrer({
          reference: 'T-2026-119',
          date: null,
          modeleCamionId: null,
          statut: 'enPreparation',
        })
        expect(await depots.tournees.obtenir(t.id)).toEqual(t)
      })

      it('liste les tournées les plus récentes d’abord', async () => {
        const camion = await depots.camions.enregistrer(porteur72)
        for (const [reference, date] of [
          ['T-2026-116', '2026-11-03'],
          ['T-2026-118', '2026-11-05'],
          ['T-2026-117', '2026-11-04'],
        ] as const) {
          await depots.tournees.enregistrer({
            reference,
            date,
            modeleCamionId: camion.id,
            statut: 'prete',
          })
        }
        const references = (await depots.tournees.lister()).map((t) => t.reference)
        expect(references).toEqual(['T-2026-118', 'T-2026-117', 'T-2026-116'])
      })

      it('refuse une référence de tournée déjà prise', async () => {
        await tournee('T-2026-118')
        await expect(tournee('T-2026-118')).rejects.toMatchObject({
          code: 'doublon',
          champ: 'reference',
        })
      })

      it('supprimer une tournée supprime ses commandes', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'SCI Martin', rangLivraison: 1 },
          [ligne(article.id)],
        )
        await depots.tournees.supprimer(t.id)
        expect(await depots.tournees.obtenir(t.id)).toBeNull()
        expect(await depots.commandes.obtenir(commande.id)).toBeNull()
      })
    })

    describe('commandes', () => {
      it('enregistre une commande avec ses lignes et ses valeurs propres (RG-03)', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const resultat = await depots.commandes.enregistrer(
          {
            tourneeId: t.id,
            numero: 'CMD-2026-0431',
            destination: 'Menuiserie Dubois',
            ville: 'Nantes',
            rangLivraison: 1,
          },
          [
            ligne(article.id, {
              dimsPropres: { l: 2000, w: 1200, h: 250 },
              poidsPropre: 400,
              poidsEstime: true,
            }),
          ],
        )
        expect(resultat.commande.id).toBeTruthy()
        expect(resultat.lignes).toEqual([
          {
            id: resultat.lignes[0]?.id,
            commandeId: resultat.commande.id,
            articleId: article.id,
            quantite: 2,
            nu: false,
            dimsPropres: { l: 2000, w: 1200, h: 250 },
            poidsPropre: 400,
            poidsEstime: true,
          },
        ])
        // Une nouvelle commande : toutes ses lignes sont à placer.
        expect(resultat.lignesChangees).toEqual([resultat.lignes[0]?.id])
        expect(await depots.commandes.obtenir(resultat.commande.id)).toEqual({
          commande: resultat.commande,
          lignes: resultat.lignes,
        })
      })

      it('liste les commandes d’une tournée par rang de livraison', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        for (const [numero, rang] of [
          ['CMD-3', 3],
          ['CMD-1', 1],
          ['CMD-2', 2],
        ] as const) {
          await depots.commandes.enregistrer(
            { tourneeId: t.id, numero, destination: 'Client', rangLivraison: rang },
            [ligne(article.id)],
          )
        }
        const numeros = (await depots.commandes.listerParTournee(t.id)).map(
          (c) => c.commande.numero,
        )
        expect(numeros).toEqual(['CMD-1', 'CMD-2', 'CMD-3'])
      })

      it('RG-21 : refuse un numéro déjà pris dans la même tournée, sur le champ « numero »', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const autre = await tournee('T-2026-119')
        const commande = { numero: 'CMD-2026-0432', destination: 'Chantier Les Ormeaux' }
        await depots.commandes.enregistrer({ ...commande, tourneeId: t.id, rangLivraison: 1 }, [
          ligne(article.id),
        ])
        // Le même numéro dans une autre tournée est accepté.
        await depots.commandes.enregistrer({ ...commande, tourneeId: autre.id, rangLivraison: 1 }, [
          ligne(article.id),
        ])
        await expect(
          depots.commandes.enregistrer({ ...commande, tourneeId: t.id, rangLivraison: 2 }, [
            ligne(article.id),
          ]),
        ).rejects.toMatchObject({ code: 'doublon', champ: 'numero' })
      })

      it('modifie les lignes en place : une ligne retirée disparaît, les autres gardent leur identifiant', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const fen = await depots.articles.enregistrer(fenetre)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id), ligne(fen.id)],
        )
        const [, deuxieme] = lignes
        const modifiee = await depots.commandes.enregistrer(commande, [
          { ...ligne(fen.id, { quantite: 5, nu: true }), id: deuxieme?.id },
        ])
        expect(modifiee.lignes.map((l) => [l.id, l.articleId, l.quantite, l.nu])).toEqual([
          [deuxieme?.id, fen.id, 5, true],
        ])
        expect((await depots.commandes.obtenir(commande.id))?.lignes).toHaveLength(1)
      })

      it('garde l’ordre de saisie des lignes, même réordonnées', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const fen = await depots.articles.enregistrer(fenetre)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id), ligne(fen.id)],
        )
        const [a, b] = lignes
        const inversee = await depots.commandes.enregistrer(commande, [
          { ...ligne(fen.id), id: b?.id },
          { ...ligne(plaque.id), id: a?.id },
        ])
        expect(inversee.lignes.map((l) => l.id)).toEqual([b?.id, a?.id])
      })

      it('seules les lignes vraiment changées perdent leur placement', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const fen = await depots.articles.enregistrer(fenetre)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id, { quantite: 1 }), ligne(fen.id, { quantite: 1 })],
        )
        const [garde, changee] = lignes
        await depots.plans.enregistrerVersion(t.id, [
          poser(garde?.id ?? '', 1),
          poser(changee?.id ?? '', 2),
        ])

        const resultat = await depots.commandes.enregistrer(
          { ...commande, destination: 'Client renommé' },
          [
            { ...ligne(plaque.id, { quantite: 1 }), id: garde?.id },
            { ...ligne(fen.id, { quantite: 2 }), id: changee?.id },
            ligne(plaque.id, { quantite: 1 }),
          ],
        )
        const ajoutee = resultat.lignes[2]?.id
        expect(resultat.lignesChangees).toEqual([changee?.id, ajoutee])
        const plan = await depots.plans.obtenirDernier(t.id)
        expect(plan?.placements.map((p) => p.ligneCommandeId)).toEqual([garde?.id])
      })

      it('changer le numéro, le client ou la ville ne touche pas au plan', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id, { quantite: 1, poidsPropre: 480, poidsEstime: true })],
        )
        await depots.plans.enregistrerVersion(t.id, [poser(lignes[0]?.id ?? '', 1)])
        const resultat = await depots.commandes.enregistrer(
          { ...commande, numero: 'CMD-2', destination: 'Autre', ville: 'Vertou' },
          // Le seul marquage « estimé » retiré ne change ni la taille ni le poids.
          [{ ...ligne(plaque.id, { quantite: 1, poidsPropre: 480 }), id: lignes[0]?.id }],
        )
        expect(resultat.lignesChangees).toEqual([])
        expect((await depots.plans.obtenirDernier(t.id))?.placements).toHaveLength(1)
      })

      it('refuse une ligne qui appartient à une autre commande, sans rien enregistrer', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id)],
        )
        const autre = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-2', destination: 'Autre', rangLivraison: 2 },
          [ligne(plaque.id)],
        )
        await expect(
          depots.commandes.enregistrer({ ...commande, destination: 'Changée' }, [
            { ...ligne(plaque.id), id: autre.lignes[0]?.id },
          ]),
        ).rejects.toMatchObject({ code: 'introuvable' })
        // Tout ou rien : la commande n'a pas changé.
        expect((await depots.commandes.obtenir(commande.id))?.commande.destination).toBe('Client')
      })

      it('RG-07 : réordonne les commandes d’une tournée', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const ids: string[] = []
        for (const rang of [1, 2, 3]) {
          const { commande } = await depots.commandes.enregistrer(
            { tourneeId: t.id, numero: `CMD-${rang}`, destination: 'Client', rangLivraison: rang },
            [ligne(plaque.id)],
          )
          ids.push(commande.id)
        }
        const [a = '', b = '', c = ''] = ids
        await depots.commandes.reordonner(t.id, [c, a, b])
        const ordre = (await depots.commandes.listerParTournee(t.id)).map((x) => [
          x.commande.numero,
          x.commande.rangLivraison,
        ])
        expect(ordre).toEqual([
          ['CMD-3', 1],
          ['CMD-1', 2],
          ['CMD-2', 3],
        ])
      })

      it('RG-07 : refuse un ordre qui oublie une commande de la tournée', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const ids: string[] = []
        for (const rang of [1, 2]) {
          const { commande } = await depots.commandes.enregistrer(
            { tourneeId: t.id, numero: `CMD-${rang}`, destination: 'Client', rangLivraison: rang },
            [ligne(plaque.id)],
          )
          ids.push(commande.id)
        }
        await expect(depots.commandes.reordonner(t.id, [ids[1] ?? ''])).rejects.toMatchObject({
          code: 'contrainte',
        })
      })

      it('liste les commandes qui utilisent un article, avec toutes leurs lignes', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const autre = await depots.articles.enregistrer(fenetre)
        const t = await tournee()
        const { commande: c1 } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'SCI Martin', rangLivraison: 1 },
          [ligne(autre.id), ligne(article.id)],
        )
        await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-2', destination: 'Client', rangLivraison: 2 },
          [ligne(autre.id)],
        )
        const { commande: c3 } = await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-3', destination: 'En attente', rangLivraison: null },
          [ligne(article.id, { quantite: 1 })],
        )

        const trouvees = await depots.commandes.listerParArticle(article.id)
        expect(trouvees.map((c) => c.commande.id).sort()).toEqual([c1.id, c3.id].sort())
        expect(trouvees.find((c) => c.commande.id === c1.id)?.lignes).toHaveLength(2)
        expect(await depots.commandes.listerParArticle('inconnu')).toEqual([])
      })

      it('liste à part les commandes sans tournée (liste d’attente)', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id)],
        )
        await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-9', destination: 'Client', rangLivraison: null },
          [ligne(article.id)],
        )
        expect((await depots.commandes.listerSansTournee()).map((c) => c.commande.numero)).toEqual([
          'CMD-9',
        ])
      })

      it('supprime une commande et ses lignes', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id)],
        )
        await depots.commandes.supprimer(commande.id)
        expect(await depots.commandes.obtenir(commande.id)).toBeNull()
        // L'article n'est plus utilisé : il peut être supprimé.
        await depots.articles.supprimer(article.id)
      })
    })

    describe('plans de chargement', () => {
      it('numérote les versions et relit la dernière avec ses placements par rang', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id)],
        )
        const ligneId = lignes[0]?.id ?? ''
        const placement = (numeroUnite: number, rang: number, z: number) => ({
          ligneCommandeId: ligneId,
          numeroUnite,
          x: 1200,
          y: 1000,
          z,
          orientation: 'aPlat' as const,
          rang,
          statut: 'aFaire' as const,
        })

        const v1 = await depots.plans.enregistrerVersion(t.id, [placement(1, 1, 0)])
        const v2 = await depots.plans.enregistrerVersion(t.id, [
          placement(2, 2, 250),
          placement(1, 1, 0),
        ])
        expect([v1.plan.version, v2.plan.version]).toEqual([1, 2])
        expect((await depots.plans.listerVersions(t.id)).map((p) => p.version)).toEqual([1, 2])

        const dernier = await depots.plans.obtenirDernier(t.id)
        expect(dernier?.plan).toEqual(v2.plan)
        expect(dernier?.placements.map((p) => [p.rang, p.numeroUnite, p.z])).toEqual([
          [1, 1, 0],
          [2, 2, 250],
        ])
        expect(dernier?.placements.every((p) => p.planId === v2.plan.id)).toBe(true)
      })

      it('change le statut d’une étape de chargement', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id, { quantite: 1 })],
        )
        const { placements } = await depots.plans.enregistrerVersion(t.id, [
          {
            ligneCommandeId: lignes[0]?.id ?? '',
            numeroUnite: 1,
            x: 0,
            y: 0,
            z: 0,
            orientation: 'contreParoi',
            rang: 1,
            statut: 'aFaire',
          },
        ])
        await depots.plans.changerStatutPlacement(placements[0]?.id ?? '', 'charge')
        expect((await depots.plans.obtenirDernier(t.id))?.placements[0]?.statut).toBe('charge')
      })

      it('renvoie null pour une tournée sans plan, et supprime une version', async () => {
        const t = await tournee()
        expect(await depots.plans.obtenirDernier(t.id)).toBeNull()
        const { plan } = await depots.plans.enregistrerVersion(t.id, [])
        await depots.plans.supprimer(plan.id)
        expect(await depots.plans.listerVersions(t.id)).toEqual([])
      })

      it('RG-22 : marque une version « à recalculer » ; la version suivante repart à jour', async () => {
        const t = await tournee()
        const { plan } = await depots.plans.enregistrerVersion(t.id, [])
        expect(plan.aRecalculer).toBe(false)
        await depots.plans.marquerARecalculer(plan.id)
        expect((await depots.plans.obtenirDernier(t.id))?.plan.aRecalculer).toBe(true)
        const { plan: suivante } = await depots.plans.enregistrerVersion(t.id, [])
        expect(suivante.aRecalculer).toBe(false)
      })
    })

    describe('archivage (RG-21)', () => {
      it('RG-21 : un article archivé quitte la liste mais reste lisible par ses commandes', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'SCI Martin', rangLivraison: 1 },
          [ligne(article.id)],
        )
        await depots.articles.archiver(article.id)

        expect(await depots.articles.lister()).toEqual([])
        const tous = await depots.articles.lister({ avecArchives: true })
        expect(tous.map((a) => a.id)).toEqual([article.id])
        expect(tous[0]?.archiveLe).toEqual(expect.any(String))
        expect((await depots.articles.obtenir(article.id))?.archiveLe).toEqual(expect.any(String))
        expect((await depots.commandes.obtenir(commande.id))?.lignes[0]?.articleId).toBe(article.id)
      })

      it('RG-21 : un article utilisé ne se supprime pas, même archivé', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id)],
        )
        await depots.articles.archiver(article.id)
        await expect(depots.articles.supprimer(article.id)).rejects.toMatchObject({
          code: 'utilise',
        })
      })

      it('RG-21 : la référence d’un article archivé peut être reprise par un article actif', async () => {
        const ancien = await depots.articles.enregistrer(ba13)
        await depots.articles.archiver(ancien.id)
        const nouveau = await depots.articles.enregistrer({ ...ba13, nom: 'BA13 nouvelle gamme' })
        expect(nouveau.reference).toBe('PLQ-BA13')
        // Mais pas par un second article actif.
        await expect(
          depots.articles.enregistrer({ ...ba13, nom: 'Encore une' }),
        ).rejects.toMatchObject({ code: 'doublon', champ: 'reference' })
      })

      it('archiver deux fois garde la première date', async () => {
        const article = await depots.articles.enregistrer(ba13)
        await depots.articles.archiver(article.id)
        const date = (await depots.articles.obtenir(article.id))?.archiveLe
        await depots.articles.archiver(article.id)
        expect((await depots.articles.obtenir(article.id))?.archiveLe).toBe(date)
      })

      it('archiver un élément inconnu est refusé', async () => {
        await expect(
          depots.articles.archiver('00000000-0000-4000-8000-000000000000'),
        ).rejects.toMatchObject({ code: 'introuvable' })
      })

      it('RG-21 : un article réactivé revient dans la liste', async () => {
        const article = await depots.articles.enregistrer(ba13)
        await depots.articles.archiver(article.id)
        await depots.articles.reactiver(article.id)
        const liste = await depots.articles.lister()
        expect(liste.map((a) => a.id)).toEqual([article.id])
        expect(liste[0]?.archiveLe).toBeUndefined()
      })

      it('réactiver un élément déjà actif est sans effet, un élément inconnu est refusé', async () => {
        const article = await depots.articles.enregistrer(ba13)
        await depots.articles.reactiver(article.id)
        expect(await depots.articles.obtenir(article.id)).toEqual(article)
        await expect(
          depots.articles.reactiver('00000000-0000-4000-8000-000000000000'),
        ).rejects.toMatchObject({ code: 'introuvable' })
      })

      it('RG-21 : un article dont la référence a été reprise ne se réactive pas', async () => {
        const ancien = await depots.articles.enregistrer(ba13)
        await depots.articles.archiver(ancien.id)
        await depots.articles.enregistrer({ ...ba13, nom: 'BA13 nouvelle gamme' })
        await expect(depots.articles.reactiver(ancien.id)).rejects.toMatchObject({
          code: 'doublon',
          champ: 'reference',
        })
        expect((await depots.articles.obtenir(ancien.id))?.archiveLe).toEqual(expect.any(String))
      })

      it('RG-21 : un camion archivé se réactive', async () => {
        const camion = await depots.camions.enregistrer(porteur72)
        await depots.camions.archiver(camion.id)
        await depots.camions.reactiver(camion.id)
        expect((await depots.camions.lister()).map((c) => c.id)).toEqual([camion.id])
      })

      it('RG-21 : un camion utilisé par une tournée en cours ne s’archive pas', async () => {
        const t = await tournee()
        await expect(depots.camions.archiver(t.modeleCamionId ?? '')).rejects.toMatchObject({
          code: 'utilise',
          champ: 'camion',
        })
        expect(await depots.camions.lister()).toHaveLength(1)
      })

      it('RG-21 : un camion utilisé seulement par une tournée chargée s’archive, sans se supprimer', async () => {
        const t = await tournee()
        await depots.tournees.enregistrer({ ...t, statut: 'chargee' })
        const camionId = t.modeleCamionId ?? ''
        await expect(depots.camions.supprimer(camionId)).rejects.toMatchObject({ code: 'utilise' })
        await depots.camions.archiver(camionId)
        expect(await depots.camions.lister()).toEqual([])
        expect(await depots.camions.lister({ avecArchives: true })).toHaveLength(1)
      })
    })

    describe('liste d’attente', () => {
      it('ajoute, liste puis supprime un élément en attente (RG-11)', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-7', destination: 'SCI Martin', rangLivraison: 1 },
          [ligne(article.id), ligne(article.id)],
        )
        const premier = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: lignes[0]?.id ?? null,
          tourneeOrigineId: t.id,
          rangOrigine: 1,
          motif: 'depassement',
        })
        const second = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: lignes[1]?.id ?? null,
          tourneeOrigineId: t.id,
          rangOrigine: 1,
          motif: 'signalement',
        })
        expect(premier.reporteLe).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        expect(premier).toMatchObject({ rangOrigine: 1, motif: 'depassement' })
        expect(await depots.attente.lister()).toEqual([premier, second])
        // Des articles reportés : seul l'élément disparaît, la commande d'origine reste.
        await depots.attente.supprimer(premier.id)
        expect(await depots.attente.lister()).toEqual([second])
        expect((await depots.commandes.obtenir(commande.id))?.lignes).toHaveLength(2)
      })

      it('RG-22 : supprimer une commande entière en attente supprime la commande', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-7', destination: 'SCI Martin', rangLivraison: null },
          [ligne(article.id)],
        )
        const element = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: null,
          tourneeOrigineId: t.id,
          rangOrigine: 3,
          motif: 'depassement',
        })
        await depots.attente.supprimer(element.id)
        expect(await depots.attente.lister()).toEqual([])
        expect(await depots.commandes.obtenir(commande.id)).toBeNull()
      })

      it('RG-11 : affecte une commande entière à une tournée, livrée en dernier', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const origine = await tournee('T-2026-117')
        const cible = await tournee('T-2026-118')
        await depots.commandes.enregistrer(
          { tourneeId: cible.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(article.id)],
        )
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-7', destination: 'SCI Martin', rangLivraison: null },
          [ligne(article.id)],
        )
        const element = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: null,
          tourneeOrigineId: origine.id,
          rangOrigine: 4,
          motif: 'depassement',
        })

        const affectee = await depots.attente.affecter(element.id, cible.id)

        expect(affectee).toBe(commande.id)
        expect(await depots.attente.lister()).toEqual([])
        const commandes = await depots.commandes.listerParTournee(cible.id)
        expect(commandes.map((c) => [c.commande.numero, c.commande.rangLivraison])).toEqual([
          ['CMD-1', 1],
          ['CMD-7', 2],
        ])
      })

      it('RG-11 : affecte des articles reportés dans une commande de la tournée choisie', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const fen = await depots.articles.enregistrer(fenetre)
        const origine = await tournee('T-2026-116')
        const cible = await tournee('T-2026-118')
        const { commande, lignes } = await depots.commandes.enregistrer(
          {
            tourneeId: origine.id,
            numero: 'CMD-5',
            destination: 'Ets Garnier',
            ville: 'Carquefou',
            rangLivraison: 2,
          },
          [ligne(plaque.id), ligne(fen.id), ligne(plaque.id, { quantite: 1 })],
        )
        const [, l2, l3] = lignes
        await depots.plans.enregistrerVersion(origine.id, [poser(l2?.id ?? '', 1)])
        const elements = []
        for (const l of [l2, l3]) {
          elements.push(
            await depots.attente.ajouter({
              commandeId: commande.id,
              ligneCommandeId: l?.id ?? null,
              tourneeOrigineId: origine.id,
              rangOrigine: 2,
              motif: 'signalement',
            }),
          )
        }

        const premiere = await depots.attente.affecter(elements[0]?.id ?? '', cible.id)
        // Une seconde ligne de la même commande rejoint la même commande.
        const seconde = await depots.attente.affecter(elements[1]?.id ?? '', cible.id)

        expect(seconde).toBe(premiere)
        const nouvelle = await depots.commandes.obtenir(premiere)
        expect(nouvelle?.commande).toMatchObject({
          tourneeId: cible.id,
          numero: 'CMD-5',
          destination: 'Ets Garnier',
          ville: 'Carquefou',
          rangLivraison: 1,
        })
        expect(nouvelle?.lignes.map((l) => l.id)).toEqual([l2?.id, l3?.id])
        // La commande d'origine garde ce qui a été livré.
        expect((await depots.commandes.obtenir(commande.id))?.lignes.map((l) => l.id)).toEqual([
          lignes[0]?.id,
        ])
        // La ligne quitte le plan de sa tournée d'origine.
        expect((await depots.plans.obtenirDernier(origine.id))?.placements).toEqual([])
        expect(await depots.attente.lister()).toEqual([])
      })

      it('refuse d’affecter à une tournée qui n’est plus en préparation', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const chargee = await depots.tournees.enregistrer({
          reference: 'T-2026-001',
          date: '2026-11-02',
          modeleCamionId: t.modeleCamionId,
          statut: 'chargee',
        })
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-7', destination: 'SCI Martin', rangLivraison: null },
          [ligne(article.id)],
        )
        const element = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: null,
          tourneeOrigineId: t.id,
          rangOrigine: 1,
          motif: 'depassement',
        })
        await expect(depots.attente.affecter(element.id, chargee.id)).rejects.toMatchObject({
          code: 'contrainte',
        })
        expect(await depots.attente.lister()).toHaveLength(1)
      })
    })
  })
}
