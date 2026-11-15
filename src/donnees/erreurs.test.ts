// Traduction des erreurs de la base (cahier technique 6.1) : jamais brutes.
import { describe, expect, it } from 'vitest'
import { ErreurDonnees, traduireErreur } from './erreurs'

describe('traduireErreur', () => {
  it('RG-21 : un numéro de commande en double devient une erreur du champ « numero »', () => {
    const erreur = traduireErreur({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "commande_numero_unique_dans_tournee"',
      details: 'Key (tournee_id, numero)=(…, CMD-2026-0432) already exists.',
    })
    expect(erreur).toBeInstanceOf(ErreurDonnees)
    expect(erreur).toMatchObject({ code: 'doublon', champ: 'numero' })
    expect(erreur.message).toBe('Cette valeur est déjà utilisée. Indiquez-en une autre.')
  })

  it('RG-21 : une référence d’article en double devient une erreur du champ « reference »', () => {
    const erreur = traduireErreur({
      code: '23505',
      message: 'duplicate key value violates unique constraint "article_reference_key"',
    })
    expect(erreur).toMatchObject({ code: 'doublon', champ: 'reference' })
  })

  it('RG-21 : une contrainte CHECK nommée renvoie vers son champ', () => {
    const erreur = traduireErreur({
      code: '23514',
      message:
        'new row for relation "article" violates check constraint "article_nue_au_plus_emballee"',
    })
    expect(erreur).toMatchObject({ code: 'contrainte', champ: 'dimsNues' })
  })

  it('distingue une suppression refusée d’une référence absente (clé étrangère)', () => {
    expect(
      traduireErreur({
        code: '23503',
        message:
          'update or delete on table "article" violates foreign key constraint "ligne_commande_article_id_fkey" on table "ligne_commande"',
        details: 'Key (id)=(…) is still referenced from table "ligne_commande".',
      }),
    ).toMatchObject({ code: 'utilise' })
    expect(
      traduireErreur({
        code: '23503',
        message:
          'insert or update on table "ligne_commande" violates foreign key constraint "ligne_commande_article_id_fkey"',
        details: 'Key (article_id)=(…) is not present in table "article".',
      }),
    ).toMatchObject({ code: 'introuvable' })
  })

  it('classe toute autre erreur comme un problème de réseau, sans message brut', () => {
    const erreur = traduireErreur({ message: 'TypeError: Failed to fetch' })
    expect(erreur.code).toBe('reseau')
    expect(erreur.message).not.toContain('fetch')
  })
})
