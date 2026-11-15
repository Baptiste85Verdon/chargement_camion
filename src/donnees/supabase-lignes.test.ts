// Conversions table ↔ objet métier : un aller-retour rend l'objet de départ.
import { describe, expect, it } from 'vitest'
import type { FicheArticle, Tournee } from '@/domaine/modele'
import {
  articleDepuisLigne,
  articleVersLigne,
  commandeDepuisLigne,
  commandeVersLigne,
  elementAttenteDepuisLigne,
  elementAttenteVersLigne,
  ligneCommandePourEnregistrement,
  ligneCommandeDepuisLigne,
  ligneCommandeVersLigne,
  orientation,
  placementDepuisLigne,
  placementVersLigne,
  tourneeDepuisLigne,
  tourneeVersLigne,
} from './supabase-lignes'

const fenetre: FicheArticle = {
  id: 'a1',
  reference: 'FEN-PVC-2V',
  nom: 'Fenêtre PVC 2 vantaux 150 × 135',
  famille: 'Fenêtres',
  dimsEmballees: { l: 1500, w: 1350, h: 180 },
  dimsNues: { l: 1450, w: 1300, h: 80 },
  poids: 22.5,
  fragile: true,
  orientations: ['debout', 'contreParoi'],
  forme: 'irreguliere',
  porteur: false,
}

describe('conversions Supabase', () => {
  it('écrit un article en colonnes snake_case, orientations comprises', () => {
    expect(articleVersLigne(fenetre)).toEqual({
      id: 'a1',
      reference: 'FEN-PVC-2V',
      nom: 'Fenêtre PVC 2 vantaux 150 × 135',
      famille: 'Fenêtres',
      longueur_emballee: 1500,
      largeur_emballee: 1350,
      hauteur_emballee: 180,
      longueur_nue: 1450,
      largeur_nue: 1300,
      hauteur_nue: 80,
      poids: 22.5,
      fragile: true,
      orientations: ['debout', 'contre_paroi'],
      forme: 'irreguliere',
      dessus_porteur: false,
      archive_le: null,
    })
  })

  it('relit un article à l’identique, même avec un poids numeric rendu en texte', () => {
    const ligne = { ...articleVersLigne(fenetre), id: 'a1', poids: '22.5' }
    expect(articleDepuisLigne(ligne)).toEqual(fenetre)
  })

  it('un article sans taille nue ni référence écrit des colonnes vides (null)', () => {
    const sansNu = { ...fenetre, reference: '', dimsNues: undefined }
    const ligne = articleVersLigne(sansNu)
    expect(ligne).toMatchObject({
      reference: null,
      longueur_nue: null,
      largeur_nue: null,
      hauteur_nue: null,
    })
    expect(articleDepuisLigne({ ...ligne, id: 'a1' })).toEqual({
      ...fenetre,
      reference: undefined,
      dimsNues: undefined,
    })
  })

  it('RG-21 : garde la date d’archivage dans les deux sens', () => {
    const archive = { ...fenetre, archiveLe: '2026-11-15T10:00:00.000Z' }
    const ligne = articleVersLigne(archive)
    expect(ligne.archive_le).toBe('2026-11-15T10:00:00.000Z')
    expect(articleDepuisLigne({ ...ligne, id: 'a1' })).toEqual(archive)
  })

  it('n’envoie pas d’identifiant pour une création : la base le choisit', () => {
    expect(articleVersLigne({ ...fenetre, id: undefined })).not.toHaveProperty('id')
  })

  it('traduit les statuts de tournée et la date, dans les deux sens', () => {
    const tournee: Tournee = {
      id: 't1',
      reference: 'T-2026-118',
      date: '2026-11-05',
      modeleCamionId: 'c1',
      statut: 'enPreparation',
    }
    const ligne = tourneeVersLigne(tournee)
    expect(ligne).toEqual({
      id: 't1',
      reference: 'T-2026-118',
      date_livraison: '2026-11-05',
      modele_camion_id: 'c1',
      statut: 'en_preparation',
    })
    expect(tourneeDepuisLigne({ ...ligne, id: 't1' })).toEqual(tournee)
  })

  it('commande : ville vide en null, et retour sans ville', () => {
    const ligne = commandeVersLigne({
      tourneeId: null,
      numero: 'CMD-9',
      destination: 'SCI Martin',
      ville: '',
      rangLivraison: null,
    })
    expect(ligne.ville).toBeNull()
    expect(commandeDepuisLigne({ ...ligne, id: 'k1' })).toEqual({
      id: 'k1',
      tourneeId: null,
      numero: 'CMD-9',
      destination: 'SCI Martin',
      ville: undefined,
      rangLivraison: null,
    })
  })

  it('RG-03 : une ligne de commande garde ses dimensions et son poids propres', () => {
    const ligne = ligneCommandeVersLigne(
      {
        articleId: 'a14',
        quantite: 2,
        nu: false,
        dimsPropres: { l: 6000, w: 200, h: 400 },
        poidsPropre: 220,
        poidsEstime: true,
      },
      'k1',
      3,
    )
    expect(ligne).toMatchObject({ commande_id: 'k1', numero_ligne: 3, longueur_propre: 6000 })
    expect(ligneCommandeDepuisLigne({ ...ligne, id: 'l1', poids_propre: '220.0' })).toEqual({
      id: 'l1',
      commandeId: 'k1',
      articleId: 'a14',
      quantite: 2,
      nu: false,
      dimsPropres: { l: 6000, w: 200, h: 400 },
      poidsPropre: 220,
      poidsEstime: true,
    })
  })

  it('placement : orientation et statut traduits dans les deux sens', () => {
    const placement = {
      ligneCommandeId: 'l1',
      numeroUnite: 2,
      x: 1200,
      y: 1000,
      z: 250,
      orientation: 'contreParoi' as const,
      rang: 5,
      statut: 'enProbleme' as const,
    }
    const ligne = placementVersLigne(placement, 'p1')
    expect(ligne).toMatchObject({
      orientation: 'contre_paroi',
      statut: 'en_probleme',
      plan_id: 'p1',
    })
    expect(placementDepuisLigne({ ...ligne, id: 'x1' })).toEqual({
      ...placement,
      id: 'x1',
      planId: 'p1',
    })
  })

  it('refuse une valeur inconnue venant de la base, plutôt que de la laisser passer', () => {
    expect(() => orientation.versDomaine('couche')).toThrow('Valeur inconnue')
  })

  it('prépare une ligne pour la fonction enregistrer_commande, avec son id s’il existe', () => {
    const ligne = {
      articleId: 'a1',
      quantite: 2,
      nu: true,
      dimsPropres: { l: 6000, w: 200, h: 400 },
      poidsPropre: 219.8,
      poidsEstime: true,
    }
    expect(ligneCommandePourEnregistrement(ligne)).toEqual({
      article_id: 'a1',
      quantite: 2,
      nu: true,
      longueur_propre: 6000,
      largeur_propre: 200,
      hauteur_propre: 400,
      poids_propre: 219.8,
      poids_estime: true,
    })
    expect(ligneCommandePourEnregistrement({ ...ligne, id: 'l1' })).toMatchObject({ id: 'l1' })
  })

  it('convertit un élément en attente, avec son rang d’origine et sa date de report', () => {
    const element = {
      commandeId: 'c1',
      ligneCommandeId: null,
      tourneeOrigineId: 't1',
      rangOrigine: 5,
      motif: 'depassement' as const,
    }
    const ligne = elementAttenteVersLigne(element)
    expect(ligne).toEqual({
      commande_id: 'c1',
      ligne_commande_id: null,
      tournee_origine_id: 't1',
      rang_origine: 5,
      motif: 'depassement',
    })
    expect(
      elementAttenteDepuisLigne({ ...ligne, id: 'e1', cree_le: '2026-11-02T08:00:00+00:00' }),
    ).toEqual({ ...element, id: 'e1', reporteLe: '2026-11-02T08:00:00+00:00' })
  })
})
