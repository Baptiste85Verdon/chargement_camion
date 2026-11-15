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
        expect(await depots.commandes.obtenir(resultat.commande.id)).toEqual(resultat)
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

      it('remplace toutes les lignes à chaque enregistrement', async () => {
        const plaque = await depots.articles.enregistrer(ba13)
        const fen = await depots.articles.enregistrer(fenetre)
        const t = await tournee()
        const { commande } = await depots.commandes.enregistrer(
          { tourneeId: t.id, numero: 'CMD-1', destination: 'Client', rangLivraison: 1 },
          [ligne(plaque.id), ligne(fen.id)],
        )
        const modifiee = await depots.commandes.enregistrer(commande, [
          ligne(fen.id, { quantite: 5, nu: true }),
        ])
        expect(modifiee.lignes.map((l) => [l.articleId, l.quantite, l.nu])).toEqual([
          [fen.id, 5, true],
        ])
        expect((await depots.commandes.obtenir(commande.id))?.lignes).toHaveLength(1)
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
    })

    describe('liste d’attente', () => {
      it('ajoute, liste puis supprime un élément en attente (RG-11)', async () => {
        const article = await depots.articles.enregistrer(ba13)
        const t = await tournee()
        const { commande, lignes } = await depots.commandes.enregistrer(
          { tourneeId: null, numero: 'CMD-7', destination: 'SCI Martin', rangLivraison: null },
          [ligne(article.id)],
        )
        const entier = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: null,
          tourneeOrigineId: t.id,
          motif: 'depassement',
        })
        const partiel = await depots.attente.ajouter({
          commandeId: commande.id,
          ligneCommandeId: lignes[0]?.id ?? null,
          tourneeOrigineId: t.id,
          motif: 'signalement',
        })
        expect(await depots.attente.lister()).toEqual([entier, partiel])
        await depots.attente.supprimer(entier.id)
        expect(await depots.attente.lister()).toEqual([partiel])
      })
    })
  })
}
