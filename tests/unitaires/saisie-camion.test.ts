import { describe, expect, it } from 'vitest'
import type { ModeleCamion, Tournee } from '@/domaine/modele'
import {
  camionDepuisFormulaire,
  formulaireDepuisCamion,
  tourneesDuCamion,
} from '@/domaine/saisie-camion'

const porteur: ModeleCamion = {
  id: 'c1',
  nom: 'Porteur 7,2 m',
  longueur: 7200,
  largeur: 2400,
  hauteur: 2500,
}

const tournee = (reference: string, statut: Tournee['statut'], camion = 'c1'): Tournee => ({
  id: reference,
  reference,
  date: '2026-11-05',
  modeleCamionId: camion,
  statut,
})

describe('formulaire de la fiche camion', () => {
  it('relit le modèle à l’identique depuis son formulaire', () => {
    expect(camionDepuisFormulaire(formulaireDepuisCamion(porteur), porteur)).toEqual(porteur)
  })

  it('accepte les espaces dans les millimètres et retire les espaces du nom', () => {
    const camion = camionDepuisFormulaire({
      nom: ' Fourgon ',
      longueur: '4 400',
      largeur: '2 050',
      hauteur: '2 200',
    })
    expect(camion).toEqual({ nom: 'Fourgon', longueur: 4400, largeur: 2050, hauteur: 2200 })
  })

  it('RG-21 : modifier un modèle archivé le laisse archivé', () => {
    const archive = { ...porteur, archiveLe: '2026-11-15T10:00:00.000Z' }
    const f = { ...formulaireDepuisCamion(archive), nom: 'Autre' }
    expect(camionDepuisFormulaire(f, archive).archiveLe).toBe(archive.archiveLe)
  })

  it('refuse de convertir un formulaire qui ne passe pas la vérification', () => {
    expect(() =>
      camionDepuisFormulaire({ nom: 'X', longueur: '2,4', largeur: '1', hauteur: '1' }),
    ).toThrow()
  })
})

describe('tournées d’un modèle de camion (RG-21)', () => {
  const tournees = [
    tournee('T-1', 'chargee'),
    tournee('T-2', 'enPreparation'),
    tournee('T-3', 'prete', 'c2'),
  ]

  it('sépare les tournées en cours des tournées chargées', () => {
    const { enCours, chargees } = tourneesDuCamion('c1', tournees)
    expect(enCours.map((t) => t.reference)).toEqual(['T-2'])
    expect(chargees.map((t) => t.reference)).toEqual(['T-1'])
  })
})
