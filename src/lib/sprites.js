/**
 * Iconos de objetos: un dibujo por familia y un color o una paleta por
 * variante.
 *
 * Es el mismo truco del tinte llevado a todo lo que se repite. Las dieciseis
 * lanas son un solo dibujo pintado con currentColor; las doce maderas, un solo
 * dibujo por pieza pintado con una paleta de cinco tonos en variables CSS. Con
 * unos treinta dibujos se cubren casi quinientas fichas.
 *
 * Todo es pixel art propio, en una rejilla de 16x16. Imita el aire del juego
 * (pixeles gordos, luz arriba a la izquierda) sin copiar ninguna textura de
 * Mojang, por lo mismo que los iconos de los modulos.
 *
 * Cada caracter del mapa es un pixel y dice como se pinta: ver TABLA. Codigo
 * puro y sin datos del grafo, para poder probarlo y usarlo en cualquier sitio.
 */

import { MAPA_TINTE, HEX as HEX_TINTE } from './tintes.js'

// ---------------------------------------------------------------------------
// Como se pinta cada caracter
// Una lista de capas por caracter: la primera es el color de base y las demas
// se ponen encima con transparencia, para aclarar u oscurecer sin conocer el
// color. Asi el mismo "+" es brillo en la lana roja y en la azul.
// ---------------------------------------------------------------------------

const CC = 'currentColor'
const luz = (a) => ['#fff', a]
const sombra = (a) => ['#000', a]

export const TABLA = {
  '#': [[CC, 1]],
  '+': [[CC, 1], luz(0.32)],
  '*': [[CC, 1], luz(0.62)],
  '-': [[CC, 1], sombra(0.2)],
  '=': [[CC, 1], sombra(0.4)],
  o: [[CC, 1], sombra(0.62)],
  t: [[CC, 0.5]],
  // Paleta de la madera, en variables: claro, medio, oscuro, corteza oscura y
  // corteza clara, y dos tonos de hoja.
  a: [['var(--m1)', 1]],
  b: [['var(--m2)', 1]],
  c: [['var(--m3)', 1]],
  d: [['var(--m4)', 1]],
  e: [['var(--m5)', 1]],
  h: [['var(--h1)', 1]],
  H: [['var(--h2)', 1]],
  // Colores fijos.
  f: [['#f7c1dc', 1]],
  F: [['#de78ae', 1]],
  k: [['#2a2a2a', 1]],
  m: [['#8c8c8c', 1]],
  M: [['#cfcfcf', 1]],
  w: [['#f2f2f2', 1]],
  x: [['#6b4a2b', 1]],
  X: [['#8d653c', 1]],
  y: [['#e8c84a', 1]],
  // Cristal: borde, brillo y hueco vacio. Se ven en tema claro y oscuro.
  g: [['#5d6f86', 1]],
  W: [['#ffffff', 0.8]],
  v: [['#ffffff', 0.24]],
  n: [['#a8763f', 1]],
  u: [['#b8823f', 1]],
  U: [['#9a6a32', 1]],
  // Libros de la estanteria.
  r: [['#9b2b2b', 1]],
  j: [['#2b4f9b', 1]],
  G: [['#3b7a2b', 1]],
  // Fondos de las menas: piedra, pizarra profunda y roca del Nether.
  1: [['#8f8f8f', 1]],
  2: [['#777777', 1]],
  3: [['#56565e', 1]],
  4: [['#45454c', 1]],
  5: [['#7a2f2f', 1]],
  6: [['#5e2222', 1]],
  q: [['#c9a2ee', 1]],
  N: [['#6e4a26', 1]]
}

// ---------------------------------------------------------------------------
// Ayudas para dibujar
// ---------------------------------------------------------------------------

const VACIA = '.'.repeat(16)

/** Ruido determinista: el mismo dibujo en cada build, sin Math.random. */
const ruido = (x, y, semilla = 1) => {
  let n = (x * 374761393 + y * 668265263 + semilla * 982451653) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

/** Bloque de 14x14 con borde, a partir de una funcion que pinta el interior. */
const bloque = (pixel, { borde = 'o' } = {}) => {
  const filas = [VACIA]
  for (let y = 0; y < 14; y++) {
    let fila = '.'
    for (let x = 0; x < 14; x++) {
      const enBorde = x === 0 || y === 0 || x === 13 || y === 13
      fila += enBorde && borde ? borde : pixel(x - 1, y - 1)
    }
    filas.push(`${fila}.`)
  }
  filas.push(VACIA)
  return filas
}

/** Liso, con luz en el borde de arriba y sombra en el de abajo. */
const liso = (x, y) => (y === 0 || x === 0 ? '+' : y === 11 || x === 11 ? '-' : '#')

/** Liso con motas: polvo y terracota. */
const motas = (densidad, semilla) => (x, y) => {
  const r = ruido(x, y, semilla)
  if (r < densidad / 2) return '+'
  if (r < densidad) return '-'
  return liso(x, y)
}

/**
 * Patron con giro de cuatro: un cuarto de 6x6 que se rota para llenar el
 * bloque. Es como estan hechas las terracotas vidriadas.
 */
const CUARTO_VIDRIADO = ['=++#--', '+=+#-+', '++=##-', '###=+#', '--#+=+', '-+#-+=']
const vidriado = (x, y) => {
  const [qx, qy] = [x % 6, y % 6]
  const rota = (x < 6 ? 0 : 1) + (y < 6 ? 0 : 2)
  const [a, b] = [[qx, qy], [qy, 5 - qx], [5 - qy, qx], [5 - qx, 5 - qy]][rota]
  return CUARTO_VIDRIADO[b][a]
}

/** Lana: rizos en diagonal. */
const lana = (x, y) => {
  const r = (x + y * 2) % 5
  return r === 0 ? '+' : r === 3 ? '-' : (x + y) % 7 === 0 ? '=' : '#'
}

// ---------------------------------------------------------------------------
// Familias de dieciseis colores
// ---------------------------------------------------------------------------

const ALFOMBRA = [
  ...Array(10).fill(VACIA),
  '.oooooooooooooo.',
  '.o+#+##+#+##+#o.',
  '.o#-##-##+#-##o.',
  '.oooooooooooooo.',
  VACIA,
  VACIA
]

const CAMA = [
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  '.xx.............',
  '.xX.............',
  '.xXwwww+++++++..',
  '.xXwwww#######-.',
  '.xX###########-.',
  '.xX#----------=.',
  '.xXXXXXXXXXXXXX.',
  '.xxxxxxxxxxxxxx.',
  '.xx..........xx.',
  '.xx..........xx.',
  VACIA
]

const VELA = [
  VACIA,
  '.......k........',
  '.......k........',
  '......*++-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......+##-......',
  '......#--=......',
  '......oooo......',
  VACIA,
  VACIA
]

const PANEL = [
  VACIA,
  '......oooo......',
  '......oWto......',
  '......oWto......',
  '......otWo......',
  '......otto......',
  '......otto......',
  '......otto......',
  '......oWto......',
  '......otWo......',
  '......otto......',
  '......otto......',
  '......otto......',
  '......otto......',
  '......oooo......',
  VACIA
]

const vidriera = (x, y) => (x === y || x === y + 1) && x < 6 ? 'W' : x === y - 6 && y > 7 ? 'W' : 't'

const caja = (x, y) => {
  if (y === 4) return '='
  if (y === 5 && x > 3 && x < 8) return 'o'
  if (y === 0 || (x === 0 && y < 4)) return '+'
  if (y === 11 || x === 11) return '-'
  return '#'
}

const ARNES = [
  VACIA,
  VACIA,
  VACIA,
  '....oooooooo....',
  '...o+######-o...',
  '..o+########-o..',
  '..o#ooooooo##o..',
  '.mo#o.....o#-om.',
  '.k.o#oooooo#o.k.',
  '.k..o######o..k.',
  '.k...oooooo...k.',
  '.k............k.',
  '.yk..........ky.',
  '..k..........k..',
  VACIA,
  VACIA
]

const ESTANDARTE = [
  VACIA,
  '..xxxxxxxxxxxx..',
  '..XXXXXXXXXXXX..',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....+######-....',
  '....-------=....',
  VACIA,
  VACIA
]

const SACO = [
  VACIA,
  '.....o....o.....',
  '......o..o......',
  '.....oooooo.....',
  '......o##o......',
  '....oo+##-oo....',
  '...o+######-o...',
  '..o+########-o..',
  '..o+########-o..',
  '..o#####*###-o..',
  '..o#########-o..',
  '..o-########=o..',
  '...o-------=o...',
  '....oooooooo....',
  VACIA,
  VACIA
]

// ---------------------------------------------------------------------------
// Pociones
// Tres frascos distintos: el de beber, redondo; el arrojadizo, con forma de
// matraz; el persistente, achatado y con la nube saliendo por arriba. El
// liquido es currentColor, que es el color exacto del efecto en el juego.
// ---------------------------------------------------------------------------

const POCION = [
  VACIA,
  '......nnnn......',
  '......NNNN......',
  '......gWvg......',
  '......gWvg......',
  '....ggWvvvgg....',
  '...g*+####--g...',
  '..g*+######--g..',
  '..g+#######--g..',
  '..g+######---g..',
  '..g#######---g..',
  '..g-#####----g..',
  '...g-#####==g...',
  '....gggggggg....',
  VACIA,
  VACIA
]

const POCION_ARROJADIZA = [
  VACIA,
  '.......nn.......',
  '.......NN.......',
  '......gWvg......',
  '......gWvg......',
  '.....gWvvvg.....',
  '....g*+###-g....',
  '....g+####-g....',
  '...g+#####--g...',
  '...g+#####--g...',
  '..g+######---g..',
  '..g#######---g..',
  '..g-######==-g..',
  '...gggggggggg...',
  VACIA,
  VACIA
]

const POCION_PERSISTENTE = [
  '...qq......qq...',
  '..q..q.nn.q..q..',
  '.......NN.......',
  '......gWvg......',
  '......gWvg......',
  '......gWvg......',
  '....ggW*vvgg....',
  '..gg*+####--gg..',
  '.g*+########--g.',
  '.g+##########-g.',
  '.g-#########--g.',
  '..g-########=g..',
  '...gggggggggg...',
  VACIA,
  VACIA,
  VACIA
]

// ---------------------------------------------------------------------------
// Madera
// Un dibujo por pieza y una paleta por madera.
// ---------------------------------------------------------------------------

/** Tablones: cuatro tablas con su junta, cada una desplazada. */
const tablones = (x, y) => {
  const fila = y % 4
  if (fila === 3) return 'c'
  const junta = [4, 9, 2, 7][Math.floor(y / 4) % 4]
  if (x === junta) return 'c'
  return fila === 0 ? 'a' : 'b'
}

/** Tronco de lado: vetas verticales de corteza. */
const corteza = (oscuro, claro) => (x, y) => {
  const veta = (x * 3 + Math.floor(ruido(x, 0, 7) * 4)) % 5
  const hueco = ruido(x, y, 11) < 0.12
  return veta < 2 !== hueco ? oscuro : claro
}

const HOJAS_BASE = (x, y) => {
  const r = ruido(x, y, 3)
  if (r < 0.12) return '.'
  return r < 0.55 ? 'h' : 'H'
}

const HOJAS_FLOR = (x, y) => {
  const r = ruido(x, y, 5)
  if (r < 0.09) return 'f'
  if (r < 0.13) return 'F'
  return HOJAS_BASE(x, y)
}

const BROTE = [
  VACIA,
  '.......hH.......',
  '.....hHhhH......',
  '....HhhHhhHh....',
  '...hHhhhHhhHh...',
  '....HhHhhhHH....',
  '.....hHdhH......',
  '.......d........',
  '.......d..hH....',
  '.......dhHh.....',
  '.......d........',
  '.......d........',
  '.......d........',
  '......dde.......',
  VACIA,
  VACIA
]

const PUERTA = [
  '...cccccccccc...',
  '...caaaaaaaac...',
  '...ca..ab..ac...',
  '...ca..ab..ac...',
  '...ca..ab..ac...',
  '...caaaaaaaac...',
  '...cbbbbbbbbc...',
  '...cbbcbbcbbc...',
  '...cbbcbbckbc...',
  '...cbbcbbcbbc...',
  '...cbbbbbbbbc...',
  '...caaaaaaaac...',
  '...cbbcbbcbbc...',
  '...cbbcbbcbbc...',
  '...cbbbbbbbbc...',
  '...cccccccccc...'
]

const TRAMPILLA = [
  VACIA,
  '.cccccccccccccc.',
  '.caaaaaaaaaaaac.',
  '.cab..bbbb..bac.',
  '.cab..bbbb..bac.',
  '.cabbbbbbbbbbac.',
  '.cabbbbcbbbbbac.',
  '.cabbbbcbbbbbac.',
  '.cabbbbbbbbbbac.',
  '.cab..bbbb..bac.',
  '.cab..bbbb..bac.',
  '.cabbbbbbbbbbac.',
  '.cbbbbbbbbbbbbc.',
  '.cccccccccccccc.',
  VACIA,
  VACIA
]

const VALLA = [
  VACIA,
  VACIA,
  '..ab........ab..',
  '..ab........ab..',
  '..ab........ab..',
  '..aaaaaaaaaaaa..',
  '..bbbbbbbbbbbb..',
  '..bc........bc..',
  '..ab........ab..',
  '..ab........ab..',
  '..aaaaaaaaaaaa..',
  '..bbbbbbbbbbbb..',
  '..bc........bc..',
  '..ab........ab..',
  '..cc........cc..',
  VACIA
]

const PUERTA_VALLA = [
  VACIA,
  VACIA,
  VACIA,
  '.ab..........ab.',
  '.ab..........ab.',
  '.abaaaaaaaaaaab.',
  '.abbbbbbbbbbbbb.',
  '.abc...ab...cab.',
  '.ab....ab....ab.',
  '.ab....ab....ab.',
  '.abaaaaaaaaaaab.',
  '.abbbbbbbbbbbbb.',
  '.abc........cab.',
  '.cc..........cc.',
  VACIA,
  VACIA
]

const BOTON = [
  ...Array(6).fill(VACIA),
  '.....aaaaaa.....',
  '.....abbbbc.....',
  '.....abbbbc.....',
  '.....cccccc.....',
  ...Array(6).fill(VACIA)
]

const PLACA = [
  ...Array(10).fill(VACIA),
  '..aaaaaaaaaaaa..',
  '.abbbbbbbbbbbbc.',
  '.cccccccccccccc.',
  ...Array(3).fill(VACIA)
]

const CARTEL = [
  VACIA,
  '.cccccccccccccc.',
  '.caaaaaaaaaaaac.',
  '.cabbbbbbbbbbbc.',
  '.cbccccccccc.bc.',
  '.cbbbbbbbbbbbbc.',
  '.cbcccccc.ccbbc.',
  '.cbbbbbbbbbbbbc.',
  '.cbccccc.bbbbbc.',
  '.cccccccccccccc.',
  '.......cc.......',
  '.......dc.......',
  '.......dc.......',
  '.......dc.......',
  '.......dc.......',
  VACIA
]

const CARTEL_COLGANTE = [
  VACIA,
  '..m..........m..',
  '..M..........M..',
  '..m..........m..',
  '..M..........M..',
  '.cccccccccccccc.',
  '.caaaaaaaaaaaac.',
  '.cbccccccccc.bc.',
  '.cbbbbbbbbbbbbc.',
  '.cbcccccc.ccbbc.',
  '.cbbbbbbbbbbbbc.',
  '.cccccccccccccc.',
  VACIA,
  VACIA,
  VACIA,
  VACIA
]

const BARCA = [
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  '.a............a.',
  '.ba..........ab.',
  '.bba..cccc..abb.',
  '.bbbaaaaaaaabbb.',
  '.bbbbbbbbbbbbbb.',
  '..bbcbbbbbbcbb..',
  '...cccccccccc...',
  VACIA,
  VACIA,
  VACIA,
  VACIA
]

const BARCA_COFRE = [
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  '.....aaaaaa.....',
  '.....bbkkbb.....',
  '.....bbbbbb.....',
  '.a...cccccc...a.',
  '.ba..........ab.',
  '.bbaaaaaaaaaabb.',
  '..bbbbbbbbbbbb..',
  '...cccccccccc...',
  VACIA,
  VACIA,
  VACIA,
  VACIA
]

const ESTANTE = [
  VACIA,
  VACIA,
  VACIA,
  '.cccccccccccccc.',
  '.caaaaaaaaaaaac.',
  '.cbbbbcbbbbcbbc.',
  '.cbbbbcbbbbcbbc.',
  '.cbbbbcbbbbcbbc.',
  '.caaaaaaaaaaaac.',
  '.cccccccccccccc.',
  '..c..........c..',
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA
]

/** Media tabla: los tablones solo en la mitad de abajo. */
const losa = (x, y) => (y < 6 ? '.' : tablones(x, y))
const escaleras = (x, y) => (y < 6 && x < 6 ? '.' : tablones(x, y))

/** Bloque de bambu: canas verticales con sus nudos. */
const bambu = (x, y) => {
  if ((y + (x % 4 < 2 ? 0 : 2)) % 5 === 0) return 'c'
  return x % 4 === 3 ? 'c' : x % 4 === 0 ? 'e' : 'd'
}

const BALSA = [
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  '.cccccccccccccc.',
  '.aeaeaeaeaeaeac.',
  '.bdbdbdbdbdbdbc.',
  '.cccccccccccccc.',
  '.bdbdbdbdbdbdbc.',
  '..c..........c..',
  VACIA,
  VACIA,
  VACIA
]

const BALSA_COFRE = [
  VACIA,
  VACIA,
  VACIA,
  VACIA,
  '.....aaaaaa.....',
  '.....bbkkbb.....',
  '.....bbbbbb.....',
  '.cccccccccccccc.',
  '.aeaeaeaeaeaeac.',
  '.bdbdbdbdbdbdbc.',
  '.cccccccccccccc.',
  '.bdbdbdbdbdbdbc.',
  '..c..........c..',
  VACIA,
  VACIA,
  VACIA
]

// ---------------------------------------------------------------------------
// Ingredientes basicos
// Los que mas salen en las recetas. Casi todos son un dibujo pintado con el
// color de cada material: un lingote sirve para el hierro, el oro, el cobre y
// la netherita.
// ---------------------------------------------------------------------------

const LINGOTE = [
  VACIA, VACIA, VACIA, VACIA, VACIA,
  '......oooooooo..',
  '.....o*++++++o..',
  '....o*++++++o#o.',
  '...o*++++++o##o.',
  '..oooooooooo##o.',
  '..o#########-o..',
  '..o-########=o..',
  '..oooooooooooo..',
  VACIA, VACIA, VACIA
]

const PEPITA = [
  VACIA, VACIA, VACIA, VACIA, VACIA, VACIA,
  '......oooo......',
  '.....o*++#o.....',
  '....o*+###-o....',
  '...o+####--#o...',
  '...o####---=o...',
  '....o--==-=o....',
  '.....ooooooo....',
  VACIA, VACIA, VACIA
]

const GEMA = [
  VACIA, VACIA, VACIA,
  '.....oooooo.....',
  '....o*+##+-o....',
  '...o*++#+#--o...',
  '..oooooooooooo..',
  '...o+##+##-o....',
  '....o+#+#-o.....',
  '.....o+##o......',
  '......o#-o......',
  '.......oo.......',
  VACIA, VACIA, VACIA, VACIA
]

const FRAGMENTO = [
  VACIA, VACIA,
  '..........oo....',
  '.........o*o....',
  '........o*+-o...',
  '.......o*+#-o...',
  '......o*+#-o....',
  '.....o*+#--o....',
  '....o++##-o.....',
  '...o+###-o......',
  '...o##--o.......',
  '...o#-=o........',
  '....ooo.........',
  VACIA, VACIA, VACIA
]

const POLVO = [
  VACIA, VACIA, VACIA, VACIA, VACIA, VACIA,
  '....+......#....',
  '..........+.....',
  '.......oo.......',
  '.....oo*+oo.....',
  '....o*++##-o....',
  '...o*+####--o...',
  '..o++######--o..',
  '.o+#########-=o.',
  '.oooooooooooooo.',
  VACIA
]

const VARA = [
  VACIA,
  '............oo..',
  '...........o*o..',
  '..........o*#o..',
  '.........o*#o...',
  '........o*#o....',
  '.......o*#o.....',
  '......o*#o......',
  '.....o*#o.......',
  '....o*#o........',
  '...o*#o.........',
  '..o*#o..........',
  '.o+#o...........',
  '.o-o............',
  '.oo.............',
  VACIA
]

const CARBON = [
  VACIA, VACIA, VACIA, VACIA,
  '......ooo.......',
  '....oo*+#oo.....',
  '...o*++##-#o....',
  '..o*+#####--o...',
  '..o+###*##--o...',
  '..o####-###-=o..',
  '...o##---##=o...',
  '....o-=-==oo....',
  '.....ooooo......',
  VACIA, VACIA, VACIA
]

const PANAL = [
  VACIA, VACIA, VACIA,
  '.....oooooo.....',
  '....o*+#+#-o....',
  '...o+#o##o#-o...',
  '..o+#o-oo-o#-o..',
  '..o#o#-##-#o-o..',
  '..o#-o#oo#o-=o..',
  '..o+#o-##-o#-o..',
  '...o#-o##o-=o...',
  '....o--==-=o....',
  '.....oooooo.....',
  VACIA, VACIA, VACIA
]

const CUERO = [
  VACIA, VACIA, VACIA,
  '...oo......oo...',
  '..o+#o....o#-o..',
  '..o+##oooo##-o..',
  '...o+#######-o..',
  '...o+########o..',
  '..o+#########-o.',
  '..o+#########-o.',
  '..o##########-o.',
  '...o#########o..',
  '...o-#-----#-o..',
  '..o-o.......o-o.',
  '..oo.........oo.',
  VACIA
]

const CUERDA = [
  VACIA, VACIA,
  '............##..',
  '...........#..#.',
  '...........#....',
  '............#...',
  '...........#....',
  '..........#.....',
  '........##......',
  '.......#........',
  '......#.........',
  '.....#..........',
  '....#...........',
  '...#.##.........',
  '....#..#........',
  VACIA
]

const PAPEL = [
  VACIA, VACIA,
  '...wwwwwwwwww...',
  '..wwwwwwwwwwM...',
  '..wMMMMMMMMwM...',
  '..wwwwwwwwwwM...',
  '..wMMMMMMMwwM...',
  '..wwwwwwwwwwM...',
  '..wMMMMMMMMwM...',
  '..wwwwwwwwwwM...',
  '..wMMMMMwwwwM...',
  '..wwwwwwwwwwM...',
  '...MMMMMMMMMM...',
  VACIA, VACIA, VACIA
]

const COFRE = [
  VACIA, VACIA,
  '.xxxxxxxxxxxxxx.',
  '.xuuuuuuuuuuuux.',
  '.xUUUUUUUUUUUUx.',
  '.xUUUUUUUUUUUUx.',
  '.xxxxxxkkxxxxxx.',
  '.xuuuuumMuuuuux.',
  '.xUUUUUkkUUUUUx.',
  '.xUUUUUUUUUUUUx.',
  '.xUUUUUUUUUUUUx.',
  '.xUUUUUUUUUUUUx.',
  '.xUUUUUUUUUUUUx.',
  '.xxxxxxxxxxxxxx.',
  VACIA, VACIA
]

const CADENA = [
  VACIA,
  '......o++o......',
  '......#..#......',
  '......#..#......',
  '......o--o......',
  '.......##.......',
  '.......##.......',
  '......o++o......',
  '......#..#......',
  '......#..#......',
  '......o--o......',
  '.......##.......',
  '.......##.......',
  '......o++o......',
  '......o--o......',
  VACIA
]

const TRIGO = [
  VACIA,
  '....*...*...*...',
  '...+#..+#..+#...',
  '...##..##..##...',
  '...+#..+#..+#...',
  '....#...#...#...',
  '....-...-...-...',
  '.....-..-..-....',
  '......-.-.-.....',
  '.......-#-......',
  '......=###=.....',
  '.......-#-......',
  '......-.-.-.....',
  '.....-..-..-....',
  '....-...-...-...',
  VACIA
]

const CUENCO = [
  VACIA, VACIA, VACIA, VACIA, VACIA, VACIA, VACIA, VACIA,
  '.xxxxxxxxxxxxxx.',
  '.xuuuuuuuuuuuux.',
  '..xUUUUUUUUUUx..',
  '...xUUUUUUUUx...',
  '....xxxxxxxx....',
  VACIA, VACIA, VACIA
]

const VAGONETA = [
  VACIA, VACIA, VACIA, VACIA, VACIA, VACIA,
  '.kkkkkkkkkkkkkk.',
  '.kMMMMMMMMMMMMk.',
  '.kmmmmmmmmmmmmk.',
  '.kmmmmmmmmmmmmk.',
  '.kmmmmmmmmmmmmk.',
  '.kkkkkkkkkkkkkk.',
  '..kmk......kmk..',
  '...k........k...',
  VACIA, VACIA
]

/**
 * Roca: piedras de anchos distintos con argamasa oscura entre ellas. Las
 * juntas de cada hilera caen en sitios distintos; con juntas regulares parecia
 * un suelo de baldosas.
 */
const roca = (x, y) => {
  const banda = Math.floor(y / 4)
  if (y % 4 === 3) return '='
  const juntas = new Set()
  let b = -Math.floor(ruido(banda, 0, 9) * 3)
  while (b < 14) {
    b += 3 + Math.floor(ruido(banda, b + 5, 17) * 3)
    juntas.add(b)
    b += 1
  }
  if (juntas.has(x)) return '='
  if (y % 4 === 0) return '+'
  return y % 4 === 2 && ruido(x, y, 13) < 0.45 ? '-' : '#'
}

/** Ladrillos: hileras de tres de alto con la junta desplazada. */
const ladrillos = (x, y) => {
  if (y % 3 === 2) return 'M'
  if ((x + (Math.floor(y / 3) % 2) * 3) % 6 === 5) return 'M'
  return y % 3 === 0 ? '+' : '#'
}

// ---------------------------------------------------------------------------
// Herramientas y armaduras
// La hoja o la pieza va en currentColor, que es el color del material; el
// mango es siempre de madera.
// ---------------------------------------------------------------------------

const ESPADA = [
  VACIA,
  '............ooo.',
  '...........o*+o.',
  '..........o*+#o.',
  '.........o*+#o..',
  '........o*+#o...',
  '.......o*+#o....',
  '......o*+#o.....',
  '..=..o*+#o......',
  '...=.+#o........',
  '....=...........',
  '...xX=..........',
  '..xX..=.........',
  '.xX.............',
  '==..............',
  VACIA
]

/*
 * Todas en diagonal, como en el juego: el mango sube desde la esquina de
 * abajo a la izquierda y la cabeza queda arriba a la derecha. Rectas se
 * reconocian peor, porque nadie las ha visto nunca asi en su inventario.
 *
 * Las que se dibujaban a mano pixel a pixel salian descuadradas: la guarda de
 * la espada no caia sobre la hoja y parecia despegada. Ahora se generan sobre
 * un eje: "s" es la distancia a lo largo del mango (crece hacia arriba a la
 * derecha) y "p" la distancia hacia los lados (positiva arriba a la
 * izquierda). Todo lo que comparte eje queda unido por construccion.
 */

const sobreEje = (pintar, { borde = true } = {}) => {
  const celdas = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => pintar(x - y, 15 - x - y, x, y) ?? '.')
  )
  const cabeza = (x, y) => '#+*-='.includes(celdas[y]?.[x] ?? '.')
  if (borde) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (celdas[y][x] !== '.') continue
        if (cabeza(x - 1, y) || cabeza(x + 1, y) || cabeza(x, y - 1) || cabeza(x, y + 1)) celdas[y][x] = 'o'
      }
    }
  }
  return celdas.map((fila) => fila.join(''))
}

/** El mango: dos lineas de madera, oscura y clara, entre dos puntos del eje. */
const mango = (s, p, desde, hasta) => (s >= desde && s <= hasta ? (p === 0 ? 'x' : p === -1 ? 'X' : null) : null)

const ESPADA_EJE = sobreEje((s, p) => {
  // Hoja de tres de ancho, con la arista iluminada y la otra en sombra.
  if (s >= -1 && s <= 12 && p >= -1 && p <= 1) return p === 1 ? '+' : p === 0 ? '#' : '-'
  if (s === 13 && p === 0) return '*'
  // Guarda cruzada, pegada al final de la hoja.
  if ((s === -3 || s === -2) && Math.abs(p) <= 3) return '='
  if (s === -4 && Math.abs(p) <= 1) return '='
  // Empunadura y pomo, en el mismo eje.
  const m = mango(s, p, -9, -5)
  if (m) return m
  if (s >= -11 && s <= -10 && p >= -1 && p <= 0) return '='
  return null
})

/**
 * Pico: un trozo de circulo con el centro sobre el mango, de modo que las
 * dos puntas quedan a la misma distancia de el. Asi es como se reconoce.
 */
const PICO_EJE = sobreEje((s, p, x, y) => {
  // El circulo pasa por las dos puntas, (2,2) y (13,13), y tiene el centro
  // sobre el eje del mango: asi el arco es amplio y simetrico, no un gancho.
  const [cx, cy, radio] = [5.7, 9.3, 8.2]
  const d = Math.hypot(x - cx, y - cy)
  const angulo = Math.acos(((x - cx) - (y - cy)) / Math.SQRT2 / (d || 1))
  if (d >= radio - 1.5 && d <= radio + 0.4 && angulo <= 1.27) {
    if (d > radio - 0.5) return '+'
    return p < -2 ? '-' : '#'
  }
  // El mango llega al centro del arco: si se queda corto parece una hoz.
  return mango(s, p, -11, 5)
})

/**
 * Hacha: la hoja es una cuna, estrecha donde toca el mango y ancha en el
 * filo, que va mas claro. Con la cabeza en bloque parecia un mazo.
 */
const HACHA_EJE = sobreEje((s, p) => {
  if (p >= 1 && p <= 6) {
    const medio = 1 + Math.floor(p * 0.6)
    if (Math.abs(s - 7) <= medio) return p === 6 ? '*' : p === 5 ? '+' : s - 7 === -medio ? '-' : '#'
  }
  if (s >= 6 && s <= 8 && p >= -2 && p <= -2) return '-'
  return mango(s, p, -11, 11)
})

/** Pala: hoja ancha que se estrecha hasta la punta. */
const PALA_EJE = sobreEje((s, p) => {
  const ancho = s === 4 ? 1 : s <= 10 ? 2 : s <= 12 ? 1 : s === 13 ? 0 : -1
  if (s >= 4 && Math.abs(p) <= ancho) return s === 12 && p === 0 ? '*' : p > 0 ? '+' : p < 0 ? '-' : '#'
  return mango(s, p, -11, 3)
})

/** Lanza: punta larga y fina sobre un mango mas largo que el de la pala. */
const LANZA_EJE = sobreEje((s, p) => {
  const ancho = s <= 8 ? 2 : s <= 11 ? 1 : s <= 14 ? 0 : -1
  if (s >= 6 && Math.abs(p) <= ancho) return p > 0 ? '+' : p < 0 ? '-' : s >= 13 ? '*' : '#'
  return mango(s, p, -13, 5)
})

/**
 * El pico es una media luna simetrica respecto al mango: sus dos puntas caen
 * a la misma distancia de el, una hacia la izquierda y otra hacia abajo. Asi
 * es como se reconoce, y es lo que fallaba en las versiones anteriores.
 */
const PICO = [
  VACIA,
  '......oooooo....',
  '....oo*++++#o...',
  '...o*+oooooo#o..',
  '..o+o....xXo#-o.',
  '.o+o....xX..o-o.',
  '.oo....xX...o-o.',
  '......xX....o=o.',
  '.....xX....o=o..',
  '....xX.....oo...',
  '...xX...........',
  '..xX............',
  '.xX.............',
  'xX..............',
  VACIA,
  VACIA
]

/** La cabeza del hacha abraza el mango: hoja grande a un lado y talon al otro. */
/*
 * A 32 px una herramienta se reconoce por la silueta, no por el detalle: con
 * cabezas redondeadas la pala, el hacha y la lanza eran la misma mancha. Por
 * eso cada una exagera lo suyo: el hacha, el filo recto; la pala, un rombo
 * grande; la lanza, una punta larga.
 */
/** Hacha: hoja en banderin, filo recto a la izquierda, mango que asoma arriba. */
const HACHA = [
  VACIA,
  '...ooooo...xX...',
  '..o*+++#o.xX....',
  '..o+++##oxX.....',
  '..o+###oxX......',
  '..o+##oxX.......',
  '..o#-oxX........',
  '..oooxX.........',
  '....xX..........',
  '...xX...........',
  '..xX............',
  '.xX.............',
  'xX..............',
  VACIA,
  VACIA,
  VACIA
]

/**
 * Pala: un rombo de esquinas vivas, con la cara iluminada a un lado de su eje
 * y en sombra al otro. Redondeada parecia una cuchara.
 */
const PALA = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => {
    const d = Math.abs(x - 11) + Math.abs(y - 4)
    if (d <= 4) {
      if (d === 4) return 'o'
      if (x === 10 && y === 3) return '*'
      const lado = x - 11 + (y - 4)
      return lado < 0 ? '+' : lado > 0 ? '-' : '#'
    }
    if (x + y === 13 && y >= 6) return 'x'
    if (x + y === 14 && y >= 6) return 'X'
    return '.'
  }).join('')
)

/** Arco: la madera curvada hacia arriba a la izquierda y la cuerda en diagonal. */
const ARCO = [
  VACIA,
  '.....xxxxxxx....',
  '....xXXXXXXMx...',
  '...xX.....M.....',
  '..xX.....M......',
  '.xX.....M.......',
  '.xX....M........',
  '.xX...M.........',
  '.xX..M..........',
  '.xX.M...........',
  '.xXM............',
  '.XM.............',
  '..x.............',
  VACIA,
  VACIA,
  VACIA
]

const AZADA = [
  VACIA,
  VACIA,
  '....ooooooo.....',
  '...o*++++#xX....',
  '...o=ooooxX.....',
  '...oo...xX......',
  '.......xX.......',
  '......xX........',
  '.....xX.........',
  '....xX..........',
  '...xX...........',
  '..xX............',
  '.xX.............',
  'xX..............',
  VACIA,
  VACIA
]

const LANZA = [
  '..............oo',
  '.............o*o',
  '............o*+o',
  '...........o*+#o',
  '..........o*+#o.',
  '.........o+##-o.',
  '.........xoooo..',
  '........xX......',
  '.......xX.......',
  '......xX........',
  '.....xX.........',
  '....xX..........',
  '...xX...........',
  '..xX............',
  '.xX.............',
  VACIA
]

const CASCO = [
  VACIA, VACIA, VACIA,
  '...oooooooooo...',
  '..o*+++++++#-o..',
  '..o+########-o..',
  '..o+########-o..',
  '..o##o....o#-o..',
  '..o#o......o-o..',
  '..o#o......o-o..',
  '..oo........oo..',
  VACIA, VACIA, VACIA, VACIA, VACIA
]

const PECHERA = [
  VACIA, VACIA,
  '..ooo......ooo..',
  '.o*+#o....o#-=o.',
  '.o+##oooooo##-o.',
  '.oo+########-oo.',
  '...o+######-o...',
  '...o+######-o...',
  '...o+######-o...',
  '...o+######-o...',
  '...o#######-o...',
  '...o-------=o...',
  '...oooooooooo...',
  VACIA, VACIA, VACIA
]

const PANTALONES = [
  VACIA, VACIA,
  '...oooooooooo...',
  '...o*+++++#-o...',
  '...o+######-o...',
  '...o+##oo##-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...o+#o..o#-o...',
  '...ooo....ooo...',
  VACIA, VACIA
]

const BOTAS = [
  VACIA, VACIA, VACIA, VACIA, VACIA, VACIA,
  '...ooo....ooo...',
  '...o+o....o+o...',
  '...o#o....o#o...',
  '...o#o....o#o...',
  '..oo#o...oo#o...',
  '.o*+#o..o*+#o...',
  '.o#--o..o#--o...',
  '.oooooo.oooooo..',
  VACIA, VACIA
]

// ---------------------------------------------------------------------------
// Piezas de piedra: losa, escaleras y muro
// Se dibuja la forma y se rellena con una textura; el borde sale solo donde la
// forma toca el vacio. Asi tres formas y dos texturas cubren mas de cien
// piezas, y el color lo pone cada piedra.
// ---------------------------------------------------------------------------

const pieza = (dentro, textura) => {
  const filas = [VACIA]
  for (let y = 0; y < 14; y++) {
    let fila = '.'
    for (let x = 0; x < 14; x++) {
      if (!dentro(x, y)) {
        fila += '.'
        continue
      }
      const borde =
        x === 0 || y === 0 || x === 13 || y === 13 ||
        !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1)
      fila += borde ? 'o' : textura(x, y)
    }
    filas.push(`${fila}.`)
  }
  filas.push(VACIA)
  return filas
}

const texturaLisa = (x, y) => {
  const r = ruido(x, y, 21)
  return r < 0.08 ? '+' : r < 0.16 ? '-' : '#'
}
const texturaLadrillo = (x, y) => ladrillos(x, y + 1)

const FORMA_LOSA = (x, y) => y >= 7
const FORMA_ESCALERAS = (x, y) => y >= 7 || x >= 7
const FORMA_MURO = (x, y) => (x >= 4 && x <= 9) || y >= 5

// ---------------------------------------------------------------------------
// Cobre
// ---------------------------------------------------------------------------

/** Cobre cortado: cuatro placas con su junta. */
const cortado = (x, y) => (x === 5 || x === 6 || y === 5 || y === 6 ? (x === 6 || y === 6 ? '-' : '=') : liso(x, y))

/** Cobre cincelado: un marco dentro de otro. */
const cincelado = (x, y) => {
  const d = Math.min(x, y, 11 - x, 11 - y)
  return d === 2 ? '=' : d === 3 ? '+' : d >= 5 ? '-' : '#'
}

/** Rejilla: agujeros por los que se ve. */
const rejilla = (x, y) => (x % 4 >= 1 && x % 4 <= 2 && y % 4 >= 1 && y % 4 <= 2 ? '.' : liso(x, y))

/** Bombilla: bloque con la luz en el centro. */
const bombilla = (x, y) => (x >= 3 && x <= 8 && y >= 3 && y <= 8 ? (x + y < 9 ? 'W' : 'y') : liso(x, y))

const BARROTES = [
  VACIA,
  '.#############..',
  '.#..#..#..#..#..',
  '.+..+..+..+..+..',
  '.#..#..#..#..#..',
  '.#..#..#..#..#..',
  '.+..+..+..+..+..',
  '.#..#..#..#..#..',
  '.#..#..#..#..#..',
  '.+..+..+..+..+..',
  '.#..#..#..#..#..',
  '.#..#..#..#..#..',
  '.+..+..+..+..+..',
  '.#..#..#..#..#..',
  '.=============..',
  VACIA
]

const FAROL = [
  VACIA,
  '.......kk.......',
  '......k..k......',
  '....kkkkkkkk....',
  '....k*++++#k....',
  '....k+####-k....',
  '....k+####-k....',
  '....k+####-k....',
  '....k+####-k....',
  '....k#----=k....',
  '....kkkkkkkk....',
  '.....kkkkkk.....',
  VACIA, VACIA, VACIA, VACIA
]

/** El cofre de madera, pero pintado con el color de su material. */
const COFRE_COLOR = COFRE.map((fila) =>
  fila.replace(/x/g, 'o').replace(/u/g, '+').replace(/U/g, '#').replace(/X/g, '-')
)

const PARARRAYOS = [
  VACIA,
  '.......**.......',
  '......o++o......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '.......#-.......',
  '......o==o......',
  VACIA, VACIA
]

// ---------------------------------------------------------------------------
// Menas
// El fondo es fijo (piedra, pizarra o roca del Nether) y las motas del
// mineral van en currentColor.
// ---------------------------------------------------------------------------

/**
 * Grumos de mineral, no puntos sueltos: cada uno con su brillo arriba y su
 * borde oscuro abajo, que es lo que hace que una mena se lea como mena. "1" y
 * "2" son los dos tonos del fondo; al dibujar se cambian por los de pizarra o
 * Nether.
 */
const PLANTILLA_MENA = [
  '121121211212',
  '1+#=12121+#1',
  '2#==12112#=2',
  '121121212121',
  '1121+##21211',
  '212##==12121',
  '11212121+#12',
  '2+#1212##=21',
  '1#=211212121',
  '212121+#2121',
  '1211211#=112',
  '212121121211'
]
const mena = (claro, oscuro) => (x, y) => {
  const c = PLANTILLA_MENA[y]?.[x]
  if (c === undefined) return ruido(x + 3, y + 3, 31) < 0.45 ? oscuro : claro
  return c === '1' ? claro : c === '2' ? oscuro : c
}

/**
 * Bloque de mineral: bisel claro arriba y a la izquierda, oscuro abajo y a la
 * derecha, y un brillo en diagonal. Asi se distingue de un bloque de piedra.
 */
const bloqueMineral = (x, y) => {
  if (x === 0 || y === 0) return '*'
  if (x === 11 || y === 11) return '='
  if (x === 1 || y === 1) return '+'
  if (x === 10 || y === 10) return '-'
  if ((x === 3 && y === 3) || (x === 4 && y === 3) || (x === 3 && y === 4)) return '*'
  return '#'
}

/** Lapislazuli: un grumo redondeado con facetas. */
const LAPIS = [
  VACIA, VACIA, VACIA,
  '.......oooo.....',
  '.....oo*++#o....',
  '....o*++#+##o...',
  '...o*+##+###-o..',
  '..o+##+###--o...',
  '..o##+###--=o...',
  '...o#---#-=o....',
  '....o--==-o.....',
  '.....oooo.......',
  VACIA, VACIA, VACIA, VACIA
]

/** Esmeralda: gema alta de seis lados, mas estrecha que el diamante. */
const ESMERALDA = [
  VACIA, VACIA,
  '.......oo.......',
  '......o*+o......',
  '.....o*++#o.....',
  '....o*++##-o....',
  '....o+*+#--o....',
  '....o+++#--o....',
  '....o++##--o....',
  '....o+##---o....',
  '.....o#--=o.....',
  '......o-=o......',
  '.......oo.......',
  VACIA, VACIA, VACIA
]

// ---------------------------------------------------------------------------
// Muebles de madera
// ---------------------------------------------------------------------------

const MESA_TRABAJO = [
  VACIA,
  '.xxxxxxxxxxxxxx.',
  '.xuuuxuuuxuuuux.',
  '.xxxxxxxxxxxxxx.',
  '.xuuuxuuuxuuuux.',
  '.xxxxxxxxxxxxxx.',
  '.XUUUUUUUUUUUUX.',
  '.XUmmmmUUUUkkUX.',
  '.XUmMmmUUUUkUUX.',
  '.XUUUmmUUUkkUUX.',
  '.XUUUUUUUUxUUUX.',
  '.XUUUUUUUxUUUUX.',
  '.XUUUUUUUUUUUUX.',
  '.XXXXXXXXXXXXXX.',
  VACIA, VACIA
]

const ESTANTERIA = [
  VACIA,
  '.xxxxxxxxxxxxxx.',
  '.xrjGyrGjyrjGyx.',
  '.xrjGyrGjyrjGyx.',
  '.xrjGyrGjyrjGyx.',
  '.xxxxxxxxxxxxxx.',
  '.xUUUUUUUUUUUUx.',
  '.xxxxxxxxxxxxxx.',
  '.xjGryjrGyjGryx.',
  '.xjGryjrGyjGryx.',
  '.xjGryjrGyjGryx.',
  '.xxxxxxxxxxxxxx.',
  '.xUUUUUUUUUUUUx.',
  '.xxxxxxxxxxxxxx.',
  VACIA, VACIA
]

const BARRIL = [
  VACIA,
  '..xxxxxxxxxxxx..',
  '.xuUuUuUuUuUuUx.',
  '.kkkkkkkkkkkkkk.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '.kkkkkkkkkkkkkk.',
  '.xuUuUuUuUuUuUx.',
  '.xuUuUuUuUuUuUx.',
  '..xxxxxxxxxxxx..',
  VACIA, VACIA
]

const ESCALERA_MANO = [
  '...X........X...',
  '...x........x...',
  '...xuuuuuuuux...',
  '...x........x...',
  '...x........x...',
  '...xuuuuuuuux...',
  '...x........x...',
  '...x........x...',
  '...xuuuuuuuux...',
  '...x........x...',
  '...x........x...',
  '...xuuuuuuuux...',
  '...x........x...',
  '...x........x...',
  '...xuuuuuuuux...',
  '...X........X...'
]

// ---------------------------------------------------------------------------
// Catalogo de simbolos
// ---------------------------------------------------------------------------

export const SIMBOLOS = {
  // Dieciseis colores
  lana: bloque(lana),
  alfombra: ALFOMBRA,
  cama: CAMA,
  vela: VELA,
  vidriera: bloque(vidriera),
  panel: PANEL,
  hormigon: bloque(liso),
  hormigon_polvo: bloque(motas(0.35, 2)),
  terracota: bloque(motas(0.14, 4)),
  terracota_vidriada: bloque(vidriado),
  caja_shulker: bloque(caja),
  arnes: ARNES,
  estandarte: ESTANDARTE,
  saco: SACO,
  tinte: MAPA_TINTE,

  // Pociones
  pocion: POCION,
  pocion_arrojadiza: POCION_ARROJADIZA,
  pocion_persistente: POCION_PERSISTENTE,

  // Madera
  tablones: bloque(tablones, { borde: 'c' }),
  tronco: bloque(corteza('d', 'e'), { borde: null }),
  tronco_pelado: bloque(corteza('b', 'a'), { borde: null }),
  hojas: bloque(HOJAS_BASE, { borde: null }),
  hojas_flor: bloque(HOJAS_FLOR, { borde: null }),
  brote: BROTE,
  puerta: PUERTA,
  trampilla: TRAMPILLA,
  valla: VALLA,
  puerta_valla: PUERTA_VALLA,
  boton: BOTON,
  placa: PLACA,
  cartel: CARTEL,
  cartel_colgante: CARTEL_COLGANTE,
  barca: BARCA,
  barca_cofre: BARCA_COFRE,
  estante: ESTANTE,
  losa: bloque(losa, { borde: null }),
  escaleras: bloque(escaleras, { borde: null }),
  bloque_bambu: bloque(bambu, { borde: 'c' }),
  balsa: BALSA,
  balsa_cofre: BALSA_COFRE,

  // Ingredientes
  lingote: LINGOTE,
  pepita: PEPITA,
  gema: GEMA,
  fragmento: FRAGMENTO,
  polvo: POLVO,
  vara: VARA,
  carbon: CARBON,
  panal: PANAL,
  cuero: CUERO,
  cuerda: CUERDA,
  papel: PAPEL,
  cofre: COFRE,
  cadena: CADENA,
  trigo: TRIGO,
  cuenco: CUENCO,
  vagoneta: VAGONETA,
  roca: bloque(roca),
  ladrillos: bloque(ladrillos),

  // Herramientas y armaduras
  espada: ESPADA_EJE,
  pico: PICO_EJE,
  hacha: HACHA_EJE,
  pala: PALA_EJE,
  azada: AZADA,
  lanza: LANZA_EJE,
  casco: CASCO,
  pechera: PECHERA,
  pantalones: PANTALONES,
  botas: BOTAS,
  arco: ARCO,

  // Piezas de piedra
  losa_lisa: pieza(FORMA_LOSA, texturaLisa),
  escaleras_lisa: pieza(FORMA_ESCALERAS, texturaLisa),
  muro_liso: pieza(FORMA_MURO, texturaLisa),
  losa_ladrillo: pieza(FORMA_LOSA, texturaLadrillo),
  escaleras_ladrillo: pieza(FORMA_ESCALERAS, texturaLadrillo),
  muro_ladrillo: pieza(FORMA_MURO, texturaLadrillo),

  // Cobre
  cortado: bloque(cortado),
  cincelado: bloque(cincelado),
  rejilla: bloque(rejilla),
  bombilla: bloque(bombilla),
  barrotes: BARROTES,
  farol: FAROL,
  cofre_color: COFRE_COLOR,
  pararrayos: PARARRAYOS,

  // Menas
  mena_piedra: bloque(mena('1', '2'), { borde: null }),
  mena_pizarra: bloque(mena('3', '4'), { borde: null }),
  mena_nether: bloque(mena('5', '6'), { borde: null }),
  bloque_mineral: bloque(bloqueMineral),
  lapis: LAPIS,
  esmeralda: ESMERALDA,

  // Muebles de madera
  mesa_trabajo: MESA_TRABAJO,
  estanteria: ESTANTERIA,
  barril: BARRIL,
  escalera_mano: ESCALERA_MANO
}

/** El tinte trae su plato con colores propios: se respetan. */
export const TABLA_PROPIA = {
  tinte: {
    p: [['#2e2118', 1]],
    m: [['#5a4130', 1]],
    t: [['#927b58', 1]],
    '+': [[CC, 1], luz(0.45)],
    '-': [[CC, 1], sombra(0.3)],
    o: [[CC, 1], sombra(0.6)]
  }
}

/**
 * Rectangulos de un simbolo, ya agrupados por capa. Une los pixeles iguales
 * seguidos de cada fila, que es lo que deja el sprite en pocos KB.
 */
export const capasDe = (nombre) => {
  const mapa = SIMBOLOS[nombre]
  const tabla = { ...TABLA, ...(TABLA_PROPIA[nombre] ?? {}) }
  const porCaracter = {}
  mapa.forEach((fila, y) => {
    let x = 0
    while (x < fila.length) {
      const c = fila[x]
      let fin = x + 1
      while (fin < fila.length && fila[fin] === c) fin++
      if (c !== '.') (porCaracter[c] ??= []).push({ x, y, w: fin - x })
      x = fin
    }
  })
  // Primero las bases de todos los caracteres y despues los velos de luz y
  // sombra, para que un velo nunca quede tapado por la base de otro pixel.
  const capas = []
  for (const nivel of [0, 1]) {
    for (const [c, rects] of Object.entries(porCaracter)) {
      const capa = tabla[c]?.[nivel]
      if (capa) capas.push({ fill: capa[0], opacidad: capa[1], rects })
    }
  }
  return capas
}

// ---------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------

const COLORES_IDS = Object.keys(HEX_TINTE).sort((a, b) => b.length - a.length)

const mezcla = (hex, con, t) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const b = [1, 3, 5].map((i) => parseInt(con.slice(i, i + 2), 16))
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/**
 * El color de cada familia sale del color del tinte, ajustado a como se ve en
 * el juego: la terracota es apagada y tirando a tierra; el hormigon en polvo,
 * mas claro que el hormigon.
 */
const FAMILIAS_COLOR = {
  wool: ['lana', (h) => h],
  carpet: ['alfombra', (h) => h],
  bed: ['cama', (h) => h],
  candle: ['vela', (h) => h],
  stained_glass_pane: ['panel', (h) => h],
  stained_glass: ['vidriera', (h) => h],
  concrete_powder: ['hormigon_polvo', (h) => mezcla(h, '#ffffff', 0.18)],
  concrete: ['hormigon', (h) => mezcla(h, '#000000', 0.08)],
  glazed_terracotta: ['terracota_vidriada', (h) => h],
  terracotta: ['terracota', (h) => mezcla(h, '#8a5a44', 0.55)],
  shulker_box: ['caja_shulker', (h) => h],
  harness: ['arnes', (h) => h],
  banner: ['estandarte', (h) => h],
  bundle: ['saco', (h) => h],
  dye: ['tinte', (h) => h]
}
const SUFIJOS_COLOR = Object.keys(FAMILIAS_COLOR).sort((a, b) => b.length - a.length)

/** Las versiones sin tenir de algunas familias. */
const SIN_TENIR = {
  candle: ['vela', '#e8d3a3'],
  terracotta: ['terracota', '#985e43'],
  shulker_box: ['caja_shulker', '#8b5f8b'],
  bundle: ['saco', '#9a6236']
}

// ---------------------------------------------------------------------------
// Maderas
// m1-m3 los tablones de claro a oscuro, m4-m5 la corteza, h1-h2 las hojas.
// ---------------------------------------------------------------------------

export const MADERAS = {
  oak: ['#c29d62', '#a8834f', '#7e6237', '#4c3d26', '#6b5434', '#5dae31', '#3c7a21'],
  spruce: ['#8a6a42', '#735634', '#4f3a22', '#3b2a1a', '#58412a', '#4d7d4d', '#2f5230'],
  birch: ['#e3d6a3', '#c8b77a', '#9c8c5a', '#a9a69a', '#ecebe3', '#82a957', '#5c7d3a'],
  jungle: ['#b88764', '#a0714f', '#75502f', '#574119', '#6e5a2a', '#34bd0e', '#1f7f08'],
  acacia: ['#c86f3f', '#a8562e', '#7d3e1f', '#5a554d', '#87807a', '#8aa33a', '#64792a'],
  dark_oak: ['#5e4024', '#4a3119', '#33210f', '#2e2012', '#4a3720', '#418020', '#275012'],
  mangrove: ['#8a3a36', '#6f2c29', '#4d1d1b', '#4f3d2b', '#6f5a44', '#72a838', '#4b7623'],
  cherry: ['#e9bdb6', '#d49f9a', '#a8726e', '#3a1f2c', '#5a3443', '#f4b6d6', '#d987b3'],
  bamboo: ['#e6cb5c', '#c9ac3e', '#9a8226', '#6f8f25', '#a3c03f', '#7fa83a', '#5a7f27'],
  crimson: ['#86405e', '#6a2f48', '#4a2033', '#4d1515', '#a8312f', '#b0302a', '#7a1f1c'],
  warped: ['#2f716a', '#235854', '#173d3a', '#2f2f40', '#22958c', '#2aa198', '#15655f'],
  pale_oak: ['#ebe1dd', '#d4c6c2', '#a99c98', '#55504d', '#7e7774', '#a5aaa2', '#7c8279'],
  azalea: ['#c29d62', '#a8834f', '#7e6237', '#4c3d26', '#6b5434', '#76972f', '#52701f']
}
const MADERAS_IDS = Object.keys(MADERAS).sort((a, b) => b.length - a.length)

export const estiloMadera = (madera) => {
  const [m1, m2, m3, m4, m5, h1, h2] = MADERAS[madera]
  return `--m1:${m1};--m2:${m2};--m3:${m3};--m4:${m4};--m5:${m5};--h1:${h1};--h2:${h2}`
}

/** Pieza de madera por el final del identificador. */
const PIEZAS_MADERA = [
  ['chest_raft', 'balsa_cofre'],
  ['raft', 'balsa'],
  ['chest_boat', 'barca_cofre'],
  ['boat', 'barca'],
  ['hanging_sign', 'cartel_colgante'],
  ['sign', 'cartel'],
  ['fence_gate', 'puerta_valla'],
  ['fence', 'valla'],
  ['trapdoor', 'trampilla'],
  ['door', 'puerta'],
  ['pressure_plate', 'placa'],
  ['button', 'boton'],
  ['shelf', 'estante'],
  ['mosaic_slab', 'losa'],
  ['mosaic_stairs', 'escaleras'],
  ['slab', 'losa'],
  ['stairs', 'escaleras'],
  ['mosaic', 'tablones'],
  ['planks', 'tablones'],
  ['leaves', 'hojas'],
  ['sapling', 'brote'],
  ['propagule', 'brote'],
  ['block', 'bloque_bambu'],
  ['log', 'tronco'],
  ['wood', 'tronco'],
  ['stem', 'tronco'],
  ['hyphae', 'tronco']
]

// ---------------------------------------------------------------------------
// Pociones
// ---------------------------------------------------------------------------

/**
 * El color de cada efecto, tal como lo pinta el juego hoy (minecraft.wiki,
 * "Effect colors"). Las pociones sin efecto, del agua a la rara, comparten el
 * azul del agua.
 */
export const COLOR_EFECTO = {
  ninguno: '#385DC6',
  velocidad: '#33EBFF',
  lentitud: '#8BAFE0',
  fuerza: '#FFC700',
  curacion: '#F82423',
  dano: '#A9656A',
  salto: '#FDFF84',
  regeneracion: '#CD5CAB',
  resistencia_al_fuego: '#FF9900',
  respiracion_acuatica: '#98DAC0',
  invisibilidad: '#F6F6F6',
  vision_nocturna: '#C2FF66',
  debilidad: '#484D48',
  veneno: '#87A363',
  caida_lenta: '#F3CFB9'
}

const FRASCO = { bebible: 'pocion', arrojadiza: 'pocion_arrojadiza', persistente: 'pocion_persistente' }

/** El icono de una pocion en cualquiera de sus tres frascos. */
export const iconoPocion = (efecto, presentacion = 'bebible') => ({
  simbolo: FRASCO[presentacion] ?? 'pocion',
  estilo: `color:${COLOR_EFECTO[efecto] ?? COLOR_EFECTO.ninguno}`
})

// ---------------------------------------------------------------------------
// El icono de una entidad
// ---------------------------------------------------------------------------

/**
 * Ingredientes con su dibujo y su color. Los bloques de piedra y de metal
 * reaprovechan los bloques lisos y moteados de las familias de color: un
 * bloque de hierro es, en dibujo, un hormigon gris claro.
 */
const DIRECTOS = {
  stick: ['vara', '#8d653c'],
  blaze_rod: ['vara', '#f6b21b'],
  breeze_rod: ['vara', '#9ec3ec'],
  iron_ingot: ['lingote', '#d8d8d8'],
  gold_ingot: ['lingote', '#f6d53b'],
  copper_ingot: ['lingote', '#e07b4c'],
  netherite_ingot: ['lingote', '#4d4446'],
  iron_nugget: ['pepita', '#d8d8d8'],
  gold_nugget: ['pepita', '#f6d53b'],
  copper_nugget: ['pepita', '#e07b4c'],
  diamond: ['gema', '#4fe3d4'],
  emerald: ['esmeralda', '#2ecc5c'],
  lapis_lazuli: ['lapis', '#2c55c5'],
  quartz: ['fragmento', '#efe9e2'],
  amethyst_shard: ['fragmento', '#a77bdb'],
  prismarine_shard: ['fragmento', '#6bb5a6'],
  echo_shard: ['fragmento', '#0e5a6b'],
  redstone: ['polvo', '#d42020'],
  glowstone_dust: ['polvo', '#f2cc5a'],
  blaze_powder: ['polvo', '#f5a623'],
  gunpowder: ['polvo', '#6f6f6f'],
  sugar: ['polvo', '#f4f4f4'],
  coal: ['carbon', '#2c2c2c'],
  charcoal: ['carbon', '#4a3b2c'],
  honeycomb: ['panal', '#f2b134'],
  leather: ['cuero', '#8b5a2b'],
  rabbit_hide: ['cuero', '#c8a27c'],
  // Gris medio y no blanco: blanca no se veia sobre el fondo claro.
  string: ['cuerda', '#a9a9a9'],
  paper: ['papel', null],
  chest: ['cofre', null],
  trapped_chest: ['cofre', null],
  iron_chain: ['cadena', '#9a9a9a'],
  copper_chain: ['cadena', '#c56b42'],
  wheat: ['trigo', '#d9b443'],
  bowl: ['cuenco', null],
  minecart: ['vagoneta', null],
  glass: ['vidriera', '#cde7ef'],
  glass_pane: ['panel', '#cde7ef'],
  tinted_glass: ['vidriera', '#3d2e47'],
  cobblestone: ['roca', '#8a8a8a'],
  mossy_cobblestone: ['roca', '#7a8a5f'],
  cobbled_deepslate: ['roca', '#55555c'],
  blackstone: ['roca', '#33303a'],
  stone: ['hormigon', '#8d8d8d'],
  smooth_stone: ['hormigon', '#a0a0a0'],
  deepslate: ['hormigon', '#55555c'],
  polished_blackstone: ['hormigon', '#3a3640'],
  sandstone: ['hormigon', '#d9c98d'],
  red_sandstone: ['hormigon', '#bb6a2c'],
  sand: ['hormigon_polvo', '#e3d6a0'],
  red_sand: ['hormigon_polvo', '#c4692b'],
  gravel: ['hormigon_polvo', '#8c8483'],
  dirt: ['hormigon_polvo', '#86603f'],
  sulfur: ['hormigon_polvo', '#d9c53c'],
  diorite: ['terracota', '#d6d6d6'],
  andesite: ['terracota', '#8f8f8f'],
  granite: ['terracota', '#9a6b57'],
  cinnabar: ['terracota', '#a8352c'],
  bricks: ['ladrillos', '#9b4b3c'],
  stone_bricks: ['ladrillos', '#808080'],
  nether_bricks: ['ladrillos', '#3a1c22'],
  mud_bricks: ['ladrillos', '#8a6a50'],
  deepslate_bricks: ['ladrillos', '#4a4a50'],
  end_stone_bricks: ['ladrillos', '#e3e2a8'],
  quartz_bricks: ['ladrillos', '#ece6dc'],
  prismarine_bricks: ['ladrillos', '#5fa596'],
  tuff_bricks: ['ladrillos', '#646a5e'],
  polished_blackstone_bricks: ['ladrillos', '#36323c'],
  resin_bricks: ['ladrillos', '#d9692a'],
  sulfur_bricks: ['ladrillos', '#d9c53c'],
  cinnabar_bricks: ['ladrillos', '#a8352c'],
  iron_block: ['bloque_mineral', '#dcdcdc'],
  gold_block: ['bloque_mineral', '#f6d53b'],
  copper_block: ['bloque_mineral', '#c56b42'],
  waxed_copper_block: ['bloque_mineral', '#c56b42'],
  diamond_block: ['bloque_mineral', '#5fe0d3'],
  emerald_block: ['bloque_mineral', '#2fcf63'],
  lapis_block: ['bloque_mineral', '#2c55b5'],
  redstone_block: ['bloque_mineral', '#b51c14'],
  coal_block: ['bloque_mineral', '#1e1e1e'],
  netherite_block: ['bloque_mineral', '#4d4446'],
  // Minerales en bruto: el mismo pedrusco que el carbon, en su color.
  raw_iron: ['carbon', '#d8af93'],
  raw_gold: ['carbon', '#e8b63a'],
  raw_copper: ['carbon', '#c96a3f'],
  raw_iron_block: ['roca', '#c49a7e'],
  raw_gold_block: ['roca', '#dca42e'],
  raw_copper_block: ['roca', '#b45f38'],
  ancient_debris: ['roca', '#5e4440'],
  // Muebles y piezas de madera que no son de ninguna madera concreta.
  crafting_table: ['mesa_trabajo', null],
  bookshelf: ['estanteria', null],
  chiseled_bookshelf: ['estanteria', null],
  barrel: ['barril', null],
  ladder: ['escalera_mano', null],
  iron_bars: ['barrotes', '#b8b8b8'],
  lantern: ['farol', '#f5b042'],
  soul_lantern: ['farol', '#4fd6e0']
}

// ---------------------------------------------------------------------------
// Herramientas y armaduras por material
// ---------------------------------------------------------------------------

const FORMA_EQUIPO = {
  espada: 'espada', pico: 'pico', hacha: 'hacha', pala: 'pala', azada: 'azada', lanza: 'lanza',
  casco: 'casco', pechera: 'pechera', pantalones: 'pantalones', botas: 'botas',
  arco: 'arco'
}

export const COLOR_MATERIAL = {
  madera: '#9c7240',
  piedra: '#8a8a8a',
  cobre: '#e07b4c',
  hierro: '#d8d8d8',
  oro: '#f6d53b',
  diamante: '#4fe3d4',
  // Algo mas clara que el lingote: con su tono real, en el tema oscuro las
  // herramientas de netherita casi desaparecian contra el fondo.
  netherita: '#655b60',
  cuero: '#8b5a2b',
  malla: '#a0a0a0',
  caparazon: '#4f9a3a'
}

// ---------------------------------------------------------------------------
// Cobre en sus cuatro estados
// Del naranja recien picado al verde del todo oxidado. La cera no cambia el
// color: solo lo congela.
// ---------------------------------------------------------------------------

export const ESTADOS_COBRE = {
  '': '#c56b42',
  exposed: '#a3795c',
  weathered: '#6e9c7c',
  oxidized: '#55a68d'
}

const PIEZAS_COBRE = [
  ['cut_copper_slab', 'losa_ladrillo'],
  ['cut_copper_stairs', 'escaleras_ladrillo'],
  ['cut_copper', 'cortado'],
  ['chiseled_copper', 'cincelado'],
  ['copper_grate', 'rejilla'],
  ['copper_bulb', 'bombilla'],
  ['copper_bars', 'barrotes'],
  ['copper_chain', 'cadena'],
  ['copper_lantern', 'farol'],
  ['copper_chest', 'cofre_color'],
  ['lightning_rod', 'pararrayos'],
  ['copper_door', 'puerta'],
  ['copper_trapdoor', 'trampilla'],
  ['copper_block', 'bloque_mineral'],
  ['copper', 'bloque_mineral']
]

const iconoCobre = (id) => {
  const sinCera = id.replace(/^waxed_/, '')
  const estado = ['exposed', 'weathered', 'oxidized'].find((e) => sinCera.startsWith(`${e}_`)) ?? ''
  const resto = estado ? sinCera.slice(estado.length + 1) : sinCera
  const pieza = PIEZAS_COBRE.find(([p]) => p === resto)
  if (!pieza) return null
  const hex = ESTADOS_COBRE[estado]
  // Los faroles de cobre dan luz verde, sea cual sea su estado.
  if (pieza[1] === 'farol') return { simbolo: 'farol', estilo: 'color:#7fe07a' }
  // Puertas y trampillas son las de madera con paleta de cobre.
  if (pieza[1] === 'puerta' || pieza[1] === 'trampilla') {
    const estilo = `--m1:${mezcla(hex, '#ffffff', 0.25)};--m2:${hex};--m3:${mezcla(hex, '#000000', 0.35)}`
    return { simbolo: pieza[1], estilo }
  }
  return { simbolo: pieza[1], estilo: `color:${hex}` }
}

// ---------------------------------------------------------------------------
// Menas
// ---------------------------------------------------------------------------

const MINERAL = {
  coal: '#2a2a2a',
  iron: '#d8af93',
  copper: '#e07b4c',
  gold: '#f6d53b',
  redstone: '#e02020',
  lapis: '#2c55c5',
  diamond: '#4fe3d4',
  emerald: '#2ecc5c'
}

const iconoMena = (id) => {
  const nether = id.match(/^nether_(gold|quartz)_ore$/)
  if (nether) return { simbolo: 'mena_nether', estilo: `color:${nether[1] === 'gold' ? '#f6d53b' : '#f3eee6'}` }
  const m = id.match(/^(deepslate_)?(\w+?)_ore$/)
  if (!m || !MINERAL[m[2]]) return null
  return { simbolo: m[1] ? 'mena_pizarra' : 'mena_piedra', estilo: `color:${MINERAL[m[2]]}` }
}

// ---------------------------------------------------------------------------
// Piedra: piezas y bloques
// El color sale de la palabra que nombra la piedra. El orden importa: "end
// stone" antes que "stone", "red sandstone" antes que "sandstone".
// ---------------------------------------------------------------------------

const COLOR_PIEDRA = [
  ['petrified_oak', '#c29d62'],
  ['cobbled_deepslate', '#55555c'],
  ['deepslate', '#4d4d55'],
  ['polished_blackstone', '#3a3640'],
  ['blackstone', '#33303a'],
  ['mossy', '#7a8a5f'],
  ['red_nether', '#6a1e1a'],
  ['nether', '#3a1c22'],
  ['red_sandstone', '#bb6a2c'],
  ['sandstone', '#d9c98d'],
  ['end_stone', '#e3e2a8'],
  ['smooth_quartz', '#efe9e0'],
  ['quartz', '#ece6dc'],
  ['purpur', '#a87aa8'],
  ['dark_prismarine', '#335e52'],
  ['prismarine', '#5fa596'],
  ['andesite', '#8f8f8f'],
  ['diorite', '#d6d6d6'],
  ['granite', '#9a6b57'],
  ['tuff', '#646a5e'],
  ['mud', '#8a6a50'],
  ['resin', '#d9692a'],
  ['sulfur', '#d9c53c'],
  ['cinnabar', '#a8352c'],
  ['smooth_stone', '#a0a0a0'],
  ['stone_brick', '#808080'],
  ['cobblestone', '#8a8a8a'],
  ['brick', '#9b4b3c'],
  ['stone', '#8d8d8d']
]

const colorPiedra = (id) => COLOR_PIEDRA.find(([clave]) => id.includes(clave))?.[1] ?? null

const iconoPiedra = (id, entidad) => {
  const pieza = id.match(/_(slab|stairs|wall)$/)
  const hex = colorPiedra(id)
  if (!hex) return null
  const ladrillo = /brick|tile/.test(id)
  if (pieza) {
    const forma = { slab: 'losa', stairs: 'escaleras', wall: 'muro' }[pieza[1]]
    const textura = ladrillo ? 'ladrillo' : forma === 'muro' ? 'liso' : 'lisa'
    return { simbolo: `${forma}_${textura}`, estilo: `color:${hex}` }
  }
  // Bloques enteros: solo si de verdad son bloques y no un boton o una placa
  // que lleven el nombre de la piedra.
  if (!(entidad?.categorias ?? []).includes('bloque')) return null
  if (/_(button|pressure_plate|ore|lamp|torch|fence|door)$/.test(id)) return null
  return { simbolo: ladrillo ? 'ladrillos' : 'hormigon', estilo: `color:${hex}` }
}

/**
 * Devuelve { simbolo, estilo } o null si la entidad aun no tiene dibujo. Se
 * decide por el identificador, que en Minecraft ya dice color y material, y
 * por la ficha en el caso de las pociones.
 */
export const iconoDe = (id, entidad = {}) => {
  if (entidad.tipo === 'pocion') return iconoPocion(entidad.efecto, entidad.presentacion)
  if (id === 'potion') return iconoPocion('ninguno')
  if (id === 'splash_potion') return iconoPocion('ninguno', 'arrojadiza')
  if (id === 'lingering_potion') return iconoPocion('ninguno', 'persistente')

  if (DIRECTOS[id]) {
    const [simbolo, hex] = DIRECTOS[id]
    return { simbolo, estilo: hex ? `color:${hex}` : '' }
  }

  if (SIN_TENIR[id]) {
    const [simbolo, hex] = SIN_TENIR[id]
    return { simbolo, estilo: `color:${hex}` }
  }

  if ((entidad.tipo === 'herramienta' || entidad.tipo === 'armadura') && FORMA_EQUIPO[entidad.categoria]) {
    return {
      simbolo: FORMA_EQUIPO[entidad.categoria],
      estilo: `color:${COLOR_MATERIAL[entidad.material] ?? COLOR_MATERIAL.hierro}`
    }
  }

  if (/copper|lightning_rod/.test(id)) {
    const cobre = iconoCobre(id)
    if (cobre) return cobre
  }

  const mena = iconoMena(id)
  if (mena) return mena

  const color = COLORES_IDS.find((c) => id.startsWith(`${c}_`))
  if (color) {
    const resto = id.slice(color.length + 1)
    const sufijo = SUFIJOS_COLOR.find((s) => resto === s)
    if (sufijo) {
      const [simbolo, ajuste] = FAMILIAS_COLOR[sufijo]
      return { simbolo, estilo: `color:${ajuste(HEX_TINTE[color])}` }
    }
  }

  // Madera: con o sin "stripped_" delante. Las hojas de azalea tienen su
  // propia paleta, y las floridas y las de cerezo llevan flores.
  if (id === 'azalea_leaves') return { simbolo: 'hojas', estilo: estiloMadera('azalea') }
  if (id === 'flowering_azalea_leaves') return { simbolo: 'hojas_flor', estilo: estiloMadera('azalea') }

  const pelado = id.startsWith('stripped_')
  const sinPelar = pelado ? id.slice('stripped_'.length) : id
  const madera = MADERAS_IDS.find((m) => sinPelar.startsWith(`${m}_`))
  if (madera && madera !== 'azalea') {
    const resto = sinPelar.slice(madera.length + 1)
    const pieza = PIEZAS_MADERA.find(([s]) => resto === s)
    if (pieza) {
      let simbolo = pieza[1]
      if (pelado) simbolo = simbolo === 'bloque_bambu' ? 'bloque_bambu' : 'tronco_pelado'
      if (simbolo === 'bloque_bambu' && madera !== 'bamboo') return null
      if (simbolo === 'hojas' && madera === 'cherry') simbolo = 'hojas_flor'
      return { simbolo, estilo: estiloMadera(madera) }
    }
  }

  return iconoPiedra(id, entidad)
}
