// Moment d'affichage des erreurs et avertissements (RG-21, cahier technique 6.1).
//
// La vérification elle-même vient de `domaine/validation.ts` : elle est
// recalculée à chaque frappe (`computed`). Ce module décide seulement quand
// montrer un problème :
// - un champ est vérifié quand on le quitte (`quitter`) ;
// - à l'enregistrement (`soumettre`), tous les champs le sont ;
// - une erreur affichée suit ensuite la saisie, et disparaît dès que la
//   valeur est corrigée, puisque la vérification est recalculée.
import { computed, ref, type Ref } from 'vue'
import type { Probleme, ResultatValidation } from '@/domaine/validation'

export function utiliserVerification(valider: () => ResultatValidation) {
  const resultat = computed(valider)
  const quittes = ref(new Set<string>())
  const soumis = ref(false)
  /** Erreurs renvoyées par la base (référence déjà prise…), par champ. */
  const erreursServeur: Ref<Probleme[]> = ref([])

  const visible = (champ: string) => soumis.value || quittes.value.has(champ)

  function quitter(champ: string) {
    quittes.value.add(champ)
  }

  /** Message d'erreur à afficher sous le champ, ou rien. */
  function erreur(champ: string): string | undefined {
    const serveur = erreursServeur.value.find((p) => p.champ === champ)
    if (serveur) return serveur.message
    if (!visible(champ)) return undefined
    return resultat.value.erreurs.find((p) => p.champ === champ)?.message
  }

  /** Avertissement à afficher sous le champ ; jamais en même temps qu'une erreur. */
  function avertissement(champ: string): string | undefined {
    if (!visible(champ) || erreur(champ)) return undefined
    return resultat.value.avertissements.find((p) => p.champ === champ)?.message
  }

  /** Erreurs du résumé en haut du formulaire, une par champ, après l'enregistrement. */
  const erreursResumees = computed(() => {
    if (!soumis.value) return []
    const vus = new Set<string>()
    return [...erreursServeur.value, ...resultat.value.erreurs].filter((p) => {
      if (vus.has(p.champ)) return false
      vus.add(p.champ)
      return true
    })
  })

  /** Marque tout comme vérifié ; vrai si l'enregistrement peut continuer. */
  function soumettre(): boolean {
    soumis.value = true
    erreursServeur.value = []
    return resultat.value.erreurs.length === 0
  }

  /** Une erreur de la base, affichée sous son champ jusqu'au prochain enregistrement. */
  function signalerErreurServeur(probleme: Probleme) {
    erreursServeur.value = [probleme]
  }

  return {
    resultat,
    quitter,
    erreur,
    avertissement,
    erreursResumees,
    soumettre,
    signalerErreurServeur,
  }
}
