/**
 * Conversion du fichier de jetons (format W3C Design Tokens) en variables CSS,
 * et calcul des contrastes WCAG.
 *
 * Fonctions pures : aucune lecture ni écriture de fichier ici, pour pouvoir
 * les tester. Les entrées-sorties sont dans `generer-jetons.ts`.
 *
 * Le fichier est exécuté directement par Node (suppression des types) : seule
 * la syntaxe TypeScript « effaçable » est permise (pas d'enum, pas de namespace).
 */

/** Un jeton feuille : il porte une valeur `$value`. */
export interface Jeton {
  $type: string
  $value: unknown
  $description?: string
}

/** Un groupe : des jetons ou d'autres groupes, rangés par nom. */
export interface GroupeJetons {
  [nom: string]: Jeton | GroupeJetons
}

/** Un jeton une fois sorti de l'arborescence, avec son nom de variable CSS. */
export interface JetonAplati {
  nom: string
  type: string
  valeur: unknown
}

interface ValeurTypo {
  fontFamily: string
  fontSize: string
  fontWeight: number
  lineHeight: number
  letterSpacing?: string
}

interface ValeurOmbre {
  color: string
  offsetX: string
  offsetY: string
  blur: string
  spread: string
}

function estJeton(noeud: Jeton | GroupeJetons): noeud is Jeton {
  return '$value' in noeud
}

/**
 * Parcourt l'arborescence et renvoie la liste des jetons feuilles.
 * Le nom retenu est celui de la feuille (« encre », « cmd1-bord »,
 * « rayon-carte ») : c'est le vocabulaire de la charte. Deux feuilles du
 * même nom seraient ambiguës, on refuse donc les doublons.
 */
export function aplatirJetons(racine: GroupeJetons): JetonAplati[] {
  const resultat: JetonAplati[] = []
  const vus = new Set<string>()

  function parcourir(groupe: GroupeJetons): void {
    for (const [nom, noeud] of Object.entries(groupe)) {
      if (nom.startsWith('$')) continue
      if (!estJeton(noeud)) {
        parcourir(noeud)
        continue
      }
      if (vus.has(nom)) {
        throw new Error(
          `Jeton en double : « ${nom} ». Renommez l'un des deux dans le fichier de jetons.`,
        )
      }
      vus.add(nom)
      resultat.push({ nom, type: noeud.$type, valeur: noeud.$value })
    }
  }

  parcourir(racine)
  return resultat
}

/** Pile de polices de secours, au cas où le fichier de police tarde à charger. */
function pilePolices(famille: string): string {
  return famille.includes('Mono')
    ? `"${famille}", ui-monospace, monospace`
    : `"${famille}", system-ui, sans-serif`
}

/**
 * Transforme un jeton en une ou plusieurs déclarations CSS.
 * Une typographie donne la propriété raccourcie `font`
 * (`font: var(--typo-corps)`), plus l'interlettrage s'il existe.
 */
export function declarationsCss(jeton: JetonAplati): string[] {
  switch (jeton.type) {
    case 'color':
    case 'dimension':
      return [`--${jeton.nom}: ${String(jeton.valeur)};`]
    case 'typography': {
      const t = jeton.valeur as ValeurTypo
      const lignes = [
        `--typo-${jeton.nom}: ${t.fontWeight} ${t.fontSize}/${t.lineHeight} ${pilePolices(t.fontFamily)};`,
      ]
      if (t.letterSpacing) lignes.push(`--typo-${jeton.nom}-interlettrage: ${t.letterSpacing};`)
      return lignes
    }
    case 'shadow': {
      const o = jeton.valeur as ValeurOmbre
      return [`--${jeton.nom}: ${o.offsetX} ${o.offsetY} ${o.blur} ${o.spread} ${o.color};`]
    }
    default:
      throw new Error(
        `Type de jeton non pris en charge : « ${jeton.type} » (jeton « ${jeton.nom} »).`,
      )
  }
}

/** Produit la feuille de style complète, avec toutes les variables dans `:root`. */
export function genererCss(racine: GroupeJetons): string {
  const declarations = aplatirJetons(racine).flatMap(declarationsCss)
  return [
    '/* Fichier généré par « npm run tokens » à partir de plan-de-chargement.tokens.json.',
    '   Ne pas modifier à la main : modifiez le fichier de jetons. */',
    '',
    ':root {',
    ...declarations.map((d) => `  ${d}`),
    '}',
    '',
  ].join('\n')
}

/* ---------- Contrastes (WCAG 2.2, critères 1.4.3 et 1.4.11) ---------- */

/** Lit une couleur « #RRGGBB » ou « #RRGGBBAA » en composantes 0-255. */
export function lireHex(hex: string): { r: number; g: number; b: number; a: number } {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex)
  if (!m?.[1]) throw new Error(`Couleur illisible : « ${hex} »`)
  const n = parseInt(m[1], 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: m[2] ? parseInt(m[2], 16) / 255 : 1,
  }
}

/** Luminance relative, selon la formule de la WCAG. */
export function luminance(hex: string): number {
  const { r, g, b } = lireHex(hex)
  const lineaire = (c: number): number => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lineaire(r) + 0.7152 * lineaire(g) + 0.0722 * lineaire(b)
}

/** Rapport de contraste entre deux couleurs opaques, de 1 à 21. */
export function ratioContraste(premier: string, second: string): number {
  const l1 = luminance(premier)
  const l2 = luminance(second)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
