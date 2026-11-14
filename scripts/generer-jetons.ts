/**
 * npm run tokens : lit src/styles/plan-de-chargement.tokens.json
 * et écrit src/styles/jetons.css.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { genererCss, type GroupeJetons } from './jetons.ts'

const source = new URL('../src/styles/plan-de-chargement.tokens.json', import.meta.url)
const cible = new URL('../src/styles/jetons.css', import.meta.url)

const jetons = JSON.parse(readFileSync(source, 'utf8')) as GroupeJetons
writeFileSync(cible, genererCss(jetons), 'utf8')
console.log('Variables CSS écrites dans src/styles/jetons.css')
