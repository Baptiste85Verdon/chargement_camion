// L'implémentation en mémoire respecte le contrat des dépôts.
import { creerDepotsEnMemoire } from '@/donnees/memoire'
import { verifierContratDepots } from './depots-contrat'

verifierContratDepots('mémoire', () => creerDepotsEnMemoire())
