/**
 * Tintes y telar: colores, dibujos y la logica del disenador de estandartes.
 *
 * Es codigo puro, sin datos del grafo, porque se usa en dos sitios: en el build
 * para pintar las paginas y en el navegador para el disenador. Lo que sale de
 * los datos (nombres, enlaces, que mezcla da que tinte) se calcula en la pagina
 * y se le pasa al navegador ya resuelto; aqui no se importa datos.js, que
 * arrastraria el grafo entero al cliente.
 *
 * Todos los dibujos son propios. Imitan el aire del juego (pixeles gordos, tres
 * tonos por color) pero no copian ninguna textura de Mojang, por el mismo
 * motivo que los iconos de los modulos: ver src/lib/iconos.js.
 */

// ---------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------

/**
 * Los dieciseis colores en el orden en que salen en el juego. El identificador
 * es el prefijo de todo lo que se tine: red_dye, red_wool, red_banner.
 *
 * El color es el que el juego usa para tenir estandartes y armaduras, no el del
 * dibujo del objeto. Es el que importa aqui: es el que vas a ver en la tela.
 */
export const COLORES = [
  { id: 'white', hex: '#f9fffe' },
  { id: 'light_gray', hex: '#9d9d97' },
  { id: 'gray', hex: '#474f52' },
  { id: 'black', hex: '#1d1d21' },
  { id: 'brown', hex: '#835432' },
  { id: 'red', hex: '#b02e26' },
  { id: 'orange', hex: '#f9801d' },
  { id: 'yellow', hex: '#fed83d' },
  { id: 'lime', hex: '#80c71f' },
  { id: 'green', hex: '#5e7c16' },
  { id: 'cyan', hex: '#169c9c' },
  { id: 'light_blue', hex: '#3ab3da' },
  { id: 'blue', hex: '#3c44aa' },
  { id: 'purple', hex: '#8932b8' },
  { id: 'magenta', hex: '#c74ebd' },
  { id: 'pink', hex: '#f38baa' }
]

export const HEX = Object.fromEntries(COLORES.map((c) => [c.id, c.hex]))
export const tinte = (color) => `${color}_dye`
export const estandarte = (color) => `${color}_banner`

/** Capas que admite un estandarte en el telar, en Java y en Bedrock. */
export const MAX_CAPAS = 6

// ---------------------------------------------------------------------------
// El tinte, dibujado
// Un monton de polvo con grumos, posado en un platito de tierra. La misma forma
// para los dieciseis: solo cambia el color, que es lo que hay que reconocer.
//   'o' contorno del color, '#' el color, '+' brillo, '-' sombra
//   'p' borde del plato, 'm' sombra del plato, 't' tierra clara
// El polvo se pinta con currentColor y capas de blanco o negro encima; el
// plato lleva colores fijos.
// ---------------------------------------------------------------------------

export const MAPA_TINTE = [
  '................',
  '................',
  '.....ooo.oo.....',
  '....o+#+o+#o....',
  '...o+###+###oo..',
  '..o+##+####+#-o.',
  '..o+#####+###-o.',
  '.o++####-####-o.',
  '.o+##-####-#--o.',
  '.o#-####--##--o.',
  'po------------op',
  '.pmmmmmmmmmmmmp.',
  '..pttttttttttp..',
  '...pppppppppp...',
  '................',
  '................'
]

/**
 * Une los pixeles contiguos de cada fila en un rectangulo. Devuelve, por cada
 * caracter, la lista de rectangulos que lo pintan.
 */
export const rectsPorCaracter = (mapa, dx = 0, dy = 0) => {
  const salida = {}
  mapa.forEach((fila, y) => {
    let x = 0
    while (x < fila.length) {
      const c = fila[x]
      let fin = x
      while (fin < fila.length && fila[fin] === c) fin++
      if (c !== '.' && c !== ' ') {
        ;(salida[c] ??= []).push({ x: x + dx, y: y + dy, w: fin - x })
      }
      x = fin
    }
  })
  return salida
}

// ---------------------------------------------------------------------------
// Patrones del telar
// La tela mide 20x40 pixeles, como en el juego. Cada patron es una funcion que
// dice cuanto cubre cada pixel (1 entero, 0 nada, entre medias en los
// degradados) o un dibujo en texto para los emblemas.
// ---------------------------------------------------------------------------

export const ANCHO = 20
export const ALTO = 40

const dentro = (x, y) => x >= 0 && x < ANCHO && y >= 0 && y < ALTO

/** Distancia de un pixel a la diagonal que va de (x0,0) a (x1,ALTO). */
const cercaDeDiagonal = (x, y, haciaDerecha, grosor) => {
  const cx = haciaDerecha ? ((y + 0.5) * ANCHO) / ALTO : ANCHO - ((y + 0.5) * ANCHO) / ALTO
  return Math.abs(x + 0.5 - cx) <= grosor / 2
}

const dientes = (x, y, abajo) => {
  // Cuatro dientes de cinco pixeles de ancho y seis de alto.
  const fila = abajo ? ALTO - 1 - y : y
  const enDiente = Math.abs((x % 5) - 2) // 0 en el pico, 2 en el valle
  return fila <= 5 - enDiente * 2 || fila <= 1
}

/**
 * Emblemas. Doce de ancho, centrados en la tela. '#' es lo que se tine; el
 * resto queda transparente y deja ver las capas de debajo.
 */
const EMBLEMAS = {
  creeper: [
    '............',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '.....##.....',
    '.....##.....',
    '...######...',
    '...######...',
    '...######...',
    '...##..##...',
    '...##..##...'
  ],
  skull: [
    '...######...',
    '..########..',
    '.##########.',
    '.##..##..##.',
    '.##..##..##.',
    '.##########.',
    '..###..###..',
    '...######...',
    '...#.##.#...',
    '#..........#',
    '.##......##.',
    '...##..##...',
    '.....##.....',
    '...##..##...',
    '.##......##.',
    '#..........#'
  ],
  flower: [
    '.....##.....',
    '....####....',
    '..#.####.#..',
    '.###.##.###.',
    '.####..####.',
    '..##.##.##..',
    '..##.##.##..',
    '.####..####.',
    '.###.##.###.',
    '..#.####.#..',
    '....####....',
    '.....##.....'
  ],
  // No es el logotipo: es una "cosa" con la misma idea de marca redonda con
  // algo dentro, que es como lo llama el propio juego en ingles.
  mojang: [
    '...######...',
    '..########..',
    '.###....###.',
    '.##......##.',
    '##..#..#..##',
    '##..##.#..##',
    '##..#.##..##',
    '##..#..#..##',
    '.##......##.',
    '.###....###.',
    '..########..',
    '...######...'
  ],
  globe: [
    '....####....',
    '..##....##..',
    '.#.##.....#.',
    '.#.####...#.',
    '#..####..#.#',
    '#...##..####',
    '#.......####',
    '#..##....#.#',
    '.#.###....#.',
    '.#..##....#.',
    '..##....##..',
    '....####....'
  ],
  piglin: [
    '............',
    '..########..',
    '.##########.',
    '.##########.',
    '.##..##..##.',
    '.##..##..##.',
    '.##########.',
    '.##########.',
    '..########..',
    '............',
    '.##......##.',
    '.##......##.'
  ],
  flow: [
    '..########..',
    '.#........#.',
    '#..######..#',
    '#.#......#.#',
    '#.#.####.#.#',
    '#.#.#..#.#.#',
    '#.#.#.##.#.#',
    '#.#.#....#.#',
    '#.#.######.#',
    '#.#........#',
    '.#.#########',
    '..#.........'
  ],
  guster: [
    '...######...',
    '..#......#..',
    '.#..####..#.',
    '.#.#....#.#.',
    '.#.#.##.#.#.',
    '.#.#.##.#.#.',
    '.#..#..#..#.',
    '..#......#..',
    '...######...',
    '....#..#....',
    '...#....#...',
    '..#......#..'
  ]
}

const emblema = (mapa) => {
  const dx = Math.floor((ANCHO - mapa[0].length) / 2)
  const dy = Math.floor((ALTO - mapa.length) / 2) - 2
  return (x, y) => (mapa[y - dy]?.[x - dx] === '#' ? 1 : 0)
}

/**
 * Los patrones, en el orden del telar. "item" es el patron de estandarte que
 * hay que poner en el tercer hueco para que aparezca; los demas salen siempre.
 */
export const PATRONES = [
  { id: 'stripe_bottom', forma: (x, y) => y >= 27 },
  { id: 'stripe_top', forma: (x, y) => y < 13 },
  { id: 'stripe_left', forma: (x) => x < 7 },
  { id: 'stripe_right', forma: (x) => x >= 13 },
  { id: 'stripe_center', forma: (x) => x >= 7 && x < 13 },
  { id: 'stripe_middle', forma: (x, y) => y >= 17 && y < 23 },
  { id: 'stripe_downright', forma: (x, y) => cercaDeDiagonal(x, y, true, 6) },
  { id: 'stripe_downleft', forma: (x, y) => cercaDeDiagonal(x, y, false, 6) },
  { id: 'small_stripes', forma: (x) => x % 4 === 1 || x % 4 === 2 },
  {
    id: 'cross',
    forma: (x, y) => cercaDeDiagonal(x, y, true, 5) || cercaDeDiagonal(x, y, false, 5)
  },
  { id: 'straight_cross', forma: (x, y) => (x >= 8 && x < 12) || (y >= 18 && y < 22) },
  { id: 'diagonal_left', forma: (x, y) => (x + 0.5) / ANCHO + (y + 0.5) / ALTO < 1 },
  { id: 'diagonal_right', forma: (x, y) => (x + 0.5) / ANCHO > (y + 0.5) / ALTO },
  { id: 'diagonal_up_left', forma: (x, y) => (x + 0.5) / ANCHO < (y + 0.5) / ALTO },
  { id: 'diagonal_up_right', forma: (x, y) => (x + 0.5) / ANCHO + (y + 0.5) / ALTO > 1 },
  { id: 'half_vertical', forma: (x) => x < 10 },
  { id: 'half_vertical_right', forma: (x) => x >= 10 },
  { id: 'half_horizontal', forma: (x, y) => y < 20 },
  { id: 'half_horizontal_bottom', forma: (x, y) => y >= 20 },
  { id: 'square_top_left', forma: (x, y) => x < 10 && y < 13 },
  { id: 'square_top_right', forma: (x, y) => x >= 10 && y < 13 },
  { id: 'square_bottom_left', forma: (x, y) => x < 10 && y >= 27 },
  { id: 'square_bottom_right', forma: (x, y) => x >= 10 && y >= 27 },
  {
    id: 'triangle_bottom',
    forma: (x, y) => y >= 30 && Math.abs(x + 0.5 - 10) <= (y - 29) * 1
  },
  {
    id: 'triangle_top',
    forma: (x, y) => y < 10 && Math.abs(x + 0.5 - 10) <= 10 - y
  },
  { id: 'triangles_bottom', forma: (x, y) => dientes(x, y, true) },
  { id: 'triangles_top', forma: (x, y) => dientes(x, y, false) },
  {
    id: 'circle',
    forma: (x, y) => (x + 0.5 - 10) ** 2 + (y + 0.5 - 20) ** 2 <= 5.6 ** 2
  },
  {
    id: 'rhombus',
    forma: (x, y) => Math.abs(x + 0.5 - 10) / 7.5 + Math.abs(y + 0.5 - 20) / 11 <= 1
  },
  {
    id: 'border',
    forma: (x, y) => x < 1 || x >= ANCHO - 1 || y < 1 || y >= ALTO - 1
  },
  // Degradados en ocho escalones, como se ven en el juego de lejos.
  { id: 'gradient', forma: (x, y) => Math.max(0, Math.floor((1 - y / 34) * 8) / 8) },
  {
    id: 'gradient_up',
    forma: (x, y) => Math.max(0, Math.floor((1 - (ALTO - 1 - y) / 34) * 8) / 8)
  },
  {
    id: 'curly_border',
    item: 'bordure_indented_banner_pattern',
    forma: (x, y) => {
      if (x < 1 || x >= ANCHO - 1 || y < 1 || y >= ALTO - 1) return 1
      const enX = x === 1 || x === ANCHO - 2
      const enY = y === 1 || y === ALTO - 2
      return (enX && y % 3 === 0) || (enY && x % 3 === 0) ? 1 : 0
    }
  },
  {
    id: 'bricks',
    item: 'field_masoned_banner_pattern',
    forma: (x, y) => {
      if (y % 4 === 3) return 1
      const desfase = Math.floor(y / 4) % 2 === 0 ? 0 : 4
      return (x + desfase) % 8 === 0 ? 1 : 0
    }
  },
  { id: 'flower', item: 'flower_banner_pattern', forma: emblema(EMBLEMAS.flower) },
  { id: 'creeper', item: 'creeper_banner_pattern', forma: emblema(EMBLEMAS.creeper) },
  { id: 'skull', item: 'skull_banner_pattern', forma: emblema(EMBLEMAS.skull) },
  { id: 'mojang', item: 'mojang_banner_pattern', forma: emblema(EMBLEMAS.mojang) },
  { id: 'globe', item: 'globe_banner_pattern', forma: emblema(EMBLEMAS.globe) },
  { id: 'piglin', item: 'piglin_banner_pattern', forma: emblema(EMBLEMAS.piglin) },
  { id: 'flow', item: 'flow_banner_pattern', forma: emblema(EMBLEMAS.flow) },
  { id: 'guster', item: 'guster_banner_pattern', forma: emblema(EMBLEMAS.guster) }
]

export const PATRON = Object.fromEntries(PATRONES.map((p) => [p.id, p]))

/**
 * Rectangulos de un patron: une en horizontal los pixeles seguidos que cubren
 * lo mismo. Un patron lleno pasa de 800 pixeles a 40 rectangulos, y los
 * sencillos se quedan en uno.
 */
export const rectsDePatron = (patron) => {
  const rects = []
  for (let y = 0; y < ALTO; y++) {
    let x = 0
    while (x < ANCHO) {
      const a = Number(patron.forma(x, y)) || 0
      let fin = x + 1
      while (fin < ANCHO && (Number(patron.forma(fin, y)) || 0) === a) fin++
      if (a > 0 && dentro(x, y)) rects.push({ x, y, w: fin - x, a })
      x = fin
    }
  }
  // Se unen tambien en vertical las filas identicas, que es lo que hace que una
  // franja sea un rectangulo y no cuarenta.
  const unidos = []
  for (const r of rects) {
    const encima = unidos.find((u) => u.x === r.x && u.w === r.w && u.a === r.a && u.y + u.h === r.y)
    if (encima) encima.h++
    else unidos.push({ ...r, h: 1 })
  }
  return unidos
}

// ---------------------------------------------------------------------------
// El diseno
// Un diseno es un color de fondo y una lista de capas { patron, color }. Viaja
// en la URL para poder compartirlo: #base=red&capas=creeper.black,border.white
// ---------------------------------------------------------------------------

const esColor = (c) => c in HEX
const esPatron = (p) => p in PATRON

export const aTextoDiseno = ({ base, capas }) => {
  const partes = [`base=${base}`]
  if (capas.length > 0) partes.push(`capas=${capas.map((c) => `${c.patron}.${c.color}`).join(',')}`)
  return partes.join('&')
}

export const deTextoDiseno = (texto) => {
  const params = new URLSearchParams(String(texto ?? '').replace(/^#/, ''))
  const base = params.get('base')
  if (!esColor(base)) return null
  const capas = (params.get('capas') ?? '')
    .split(',')
    .filter(Boolean)
    .map((trozo) => {
      const [patron, color] = trozo.split('.')
      return { patron, color }
    })
    .filter((c) => esPatron(c.patron) && esColor(c.color))
    .slice(0, MAX_CAPAS)
  return { base, capas }
}

/**
 * Lo que hace falta para fabricar un diseno. Los tintes se gastan uno por
 * capa; los patrones de estandarte no se gastan, asi que cada uno cuenta una
 * sola vez aunque se use en varias capas.
 */
export const materiales = ({ base, capas }) => {
  const tintes = new Map()
  for (const { color } of capas) tintes.set(color, (tintes.get(color) ?? 0) + 1)
  const patrones = [...new Set(capas.map((c) => PATRON[c.patron].item).filter(Boolean))]
  return {
    estandarte: estandarte(base),
    tintes: [...tintes].map(([color, cantidad]) => ({ id: tinte(color), color, cantidad })),
    patrones
  }
}

/** Ideas para empezar. Dibujos propios, ninguno pasa de seis capas. */
export const IDEAS = [
  { id: 'creeper', base: 'lime', capas: [{ patron: 'creeper', color: 'black' }] },
  {
    id: 'pirata',
    base: 'black',
    capas: [
      { patron: 'skull', color: 'white' },
      { patron: 'border', color: 'white' }
    ]
  },
  {
    id: 'atardecer',
    base: 'light_blue',
    capas: [
      { patron: 'gradient_up', color: 'orange' },
      { patron: 'circle', color: 'yellow' },
      { patron: 'half_horizontal_bottom', color: 'blue' }
    ]
  },
  {
    id: 'caballero',
    base: 'blue',
    capas: [
      { patron: 'rhombus', color: 'yellow' },
      { patron: 'circle', color: 'red' },
      { patron: 'border', color: 'yellow' }
    ]
  },
  {
    id: 'muro',
    base: 'red',
    capas: [
      { patron: 'bricks', color: 'light_gray' },
      { patron: 'gradient_up', color: 'black' }
    ]
  },
  {
    id: 'bosque',
    base: 'green',
    capas: [
      { patron: 'flower', color: 'pink' },
      { patron: 'triangles_bottom', color: 'lime' },
      { patron: 'gradient', color: 'light_blue' }
    ]
  }
]

export const IDEA_INICIAL = IDEAS[0]

// ---------------------------------------------------------------------------
// Mezclas de tintes
// ---------------------------------------------------------------------------

/** Clave de un conjunto de tintes que no depende del orden: "blue+white+white". */
export const claveMezcla = (colores) => [...colores].sort().join('+')

// ---------------------------------------------------------------------------
// Dibujar
// Devuelven texto HTML para que la misma funcion sirva en el build (con
// set:html) y en el navegador (con innerHTML). Todo lo que entra son
// identificadores ya comprobados contra las listas de arriba o textos que se
// escapan aqui.
// ---------------------------------------------------------------------------

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const usosDe = (capas) =>
  capas
    .map(
      (c) =>
        `<use href="#pt-${c.patron}" width="${ANCHO}" height="${ALTO}" style="color:${HEX[c.color]}"/>`
    )
    .join('')

/** Un estandarte colgado de su travesano. */
export const svgEstandarte = ({ base, capas }, { clase = '', titulo = '' } = {}) =>
  `<svg viewBox="-2 -2 24 43" class="${clase}" shape-rendering="crispEdges" ${
    titulo ? `role="img" aria-label="${escapar(titulo)}"` : 'aria-hidden="true"'
  }>` +
  `<rect x="-2" y="-2" width="24" height="2" fill="#6b4a2b"/>` +
  `<rect x="-2" y="-2" width="24" height="1" fill="#8d653c"/>` +
  `<rect x="0" y="0" width="${ANCHO}" height="${ALTO}" fill="${HEX[base]}"/>` +
  usosDe(capas) +
  // Un pliegue de sombra en el borde derecho y bajo el travesano: lo justo para
  // que se lea como tela y no como un rectangulo de color.
  `<rect x="${ANCHO - 1}" y="0" width="1" height="${ALTO}" fill="#000" fill-opacity=".14"/>` +
  `<rect x="0" y="0" width="${ANCHO}" height="1" fill="#000" fill-opacity=".18"/>` +
  `</svg>`

/**
 * El mismo diseno en un escudo. El juego lo encoge para que quepa entero, asi
 * que aqui tambien: nada de recortar la parte de abajo.
 */
export const svgEscudo = ({ base, capas }, { clase = '', titulo = '' } = {}) =>
  `<svg viewBox="0 0 14 26" class="${clase}" shape-rendering="crispEdges" ${
    titulo ? `role="img" aria-label="${escapar(titulo)}"` : 'aria-hidden="true"'
  }>` +
  `<rect x="0" y="0" width="14" height="26" fill="#5f5f5f"/>` +
  `<rect x="0" y="0" width="14" height="1" fill="#8c8c8c"/>` +
  `<g transform="translate(1 1) scale(0.6 0.6)">` +
  `<rect width="${ANCHO}" height="${ALTO}" fill="${HEX[base]}"/>` +
  usosDe(capas) +
  `</g>` +
  `<rect x="6" y="11" width="2" height="2" fill="#8c8c8c"/>` +
  `</svg>`

/** El icono de un tinte, a partir del simbolo de SpriteTelar. */
export const svgTinte = (color, clase = 'h-8 w-8') =>
  `<svg class="${clase}" style="color:${HEX[color]}" aria-hidden="true"><use href="#tinte"/></svg>`

/**
 * Textos y enlaces que el disenador necesita. Los prepara la pagina con los
 * datos del grafo; aqui solo se usan.
 *   T.nombre[id], T.url[id], T.patron[id], T.ui[clave]
 */
const enlace = (T, id) =>
  T.url[id]
    ? `<a href="${T.url[id]}" class="font-semibold underline decoration-borde-fuerte underline-offset-2 hover:text-acento">${escapar(T.nombre[id] ?? id)}</a>`
    : `<span class="font-semibold">${escapar(T.nombre[id] ?? id)}</span>`

const rellenar = (plantilla, valores) =>
  Object.entries(valores).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), escapar(plantilla))

export const htmlMateriales = (diseno, T) => {
  const m = materiales(diseno)
  const fila = (icono, cantidad, contenido) =>
    `<li class="flex items-center gap-3">` +
    `<span class="grid h-10 w-10 shrink-0 place-items-center hueco">${icono}</span>` +
    `<span class="w-8 shrink-0 text-right font-bold tabular-nums">${cantidad}</span>` +
    `<span class="min-w-0 flex-1">${contenido}</span></li>`

  const lana = `${diseno.base}_wool`
  const filas = [
    fila(
      svgEstandarte({ base: diseno.base, capas: [] }, { clase: 'h-8 w-5' }),
      '1×',
      `${enlace(T, m.estandarte)}<span class="block text-sm text-texto-suave">${rellenar(
        T.ui.lana,
        { lana: enlace(T, lana) }
      )}</span>`
    ),
    ...m.tintes.map((t) => fila(svgTinte(t.color, 'h-7 w-7'), `${t.cantidad}×`, enlace(T, t.id))),
    ...m.patrones.map((id) =>
      fila(
        `<svg class="h-6 w-6 text-acento" aria-hidden="true"><use href="#ic-telar"/></svg>`,
        '1×',
        `${enlace(T, id)}<span class="block text-sm text-texto-suave">${escapar(T.ui.noSeGasta)}</span>`
      )
    ),
    fila(
      `<svg class="h-6 w-6 text-acento" aria-hidden="true"><use href="#ic-telar"/></svg>`,
      '1×',
      enlace(T, 'loom')
    )
  ]
  return `<ul class="space-y-2">${filas.join('')}</ul>`
}

export const htmlPasos = (diseno, T) => {
  const pasos = [rellenar(T.ui.pasoBase, { estandarte: enlace(T, estandarte(diseno.base)) })]
  for (const capa of diseno.capas) {
    const item = PATRON[capa.patron].item
    const valores = {
      tinte: enlace(T, tinte(capa.color)),
      patron: `<strong>«${escapar(T.patron[capa.patron])}»</strong>`,
      item: item ? enlace(T, item) : ''
    }
    const mini =
      `<svg viewBox="0 0 ${ANCHO} ${ALTO}" class="h-10 w-5 shrink-0 hueco" aria-hidden="true">` +
      // Sobre la tela del diseno y no sobre el fondo de la pagina: una capa
      // negra en el tema oscuro desaparecia.
      `<rect width="${ANCHO}" height="${ALTO}" fill="${HEX[diseno.base]}"/>` +
      usosDe([capa]) +
      `</svg>`
    pasos.push(
      `<span class="flex items-start gap-3">${mini}<span>${rellenar(
        item ? T.ui.pasoCapaItem : T.ui.pasoCapa,
        valores
      )}</span></span>`
    )
  }
  pasos.push(escapar(diseno.capas.length > 0 ? T.ui.pasoFinal : T.ui.pasoSinCapas))

  return (
    `<ol class="space-y-3">` +
    pasos
      .map(
        (p, i) =>
          `<li class="flex gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center bloque bg-acento-fondo text-sm font-bold text-acento-contraste">${i + 1}</span><span class="min-w-0 flex-1 pt-0.5">${p}</span></li>`
      )
      .join('') +
    `</ol>`
  )
}
