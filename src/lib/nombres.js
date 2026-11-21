/**
 * Nombres para el yunque: letras raras que el juego SI sabe dibujar, colores
 * donde el juego los admite y comandos donde no.
 *
 * La gracia del modulo es hacer lo que el yunque no deja. Escribir en
 * mayusculas lo hace cualquiera; lo que no se puede dentro del juego es ver
 * como va a quedar antes de pagar el nivel, poner colores en Java, o saber
 * que codigo de color pega Bedrock. Eso es lo que hay aqui.
 *
 * Una regla se mantiene desde el principio: ni un caracter fuera del plano
 * basico de Unicode. Casi cualquier generador de "texto bonito" de internet
 * usa los simbolos matematicos (𝕕𝕠𝕓𝕝𝕖 𝕥𝕣𝕒𝕫𝕠, 𝓮𝓼𝓬𝓻𝓲𝓽𝓪), que viven fuera de
 * ese plano, y en el juego salen como cajas blancas: pagas el nivel y te
 * llevas ▯▯▯▯▯. Aqui todo lo que sale se ve.
 */

// ---------------------------------------------------------------------------
// Ediciones
// ---------------------------------------------------------------------------

/**
 * Lo que cambia entre Java y Bedrock. El limite es el del campo del yunque:
 * Java lo subio a 50 y Bedrock sigue en 30. En Bedrock los codigos de color
 * cuentan como letras, porque se escriben dentro del nombre.
 */
export const EDICIONES = {
  java: { limite: 50, cursiva: true, colorEnYunque: false },
  bedrock: { limite: 30, cursiva: false, colorEnYunque: true }
}

/** Compatibilidad con lo anterior: el limite de Java. */
export const LIMITE = EDICIONES.java.limite

// ---------------------------------------------------------------------------
// Estilos de letra
// ---------------------------------------------------------------------------

/**
 * Versalitas. Faltan la Q y la X porque Unicode no tiene versalita de esas dos
 * letras; se dejan en minuscula, que es lo que hace todo el mundo. Lo que no
 * este en la tabla pasa tal cual: una enye sigue siendo una enye.
 */
const VERSALITAS = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
  j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ',
  t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ'
}

/**
 * Letras boca abajo. Se leen al reves y se escriben de derecha a izquierda,
 * asi que ademas de cambiar cada letra se le da la vuelta a la palabra. Es el
 * complemento natural de "Dinnerbone", que pone al mob boca abajo.
 */
const AL_REVES = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ı',
  j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
  s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  '!': '¡', '?': '¿', '¡': '!', '¿': '?', '.': '˙', ',': "'", '(': ')', ')': '('
}

/** Ancho completo: el ASCII imprimible corrido 0xFEE0, y el espacio aparte. */
const anchoCompleto = (texto) =>
  [...texto]
    .map((c) => {
      if (c === ' ') return '　'
      const n = c.codePointAt(0)
      return n >= 0x21 && n <= 0x7e ? String.fromCodePoint(n + 0xfee0) : c
    })
    .join('')

/** Letras en circulo: ⓐ a ⓩ y Ⓐ a Ⓩ, todas del plano basico. */
const burbuja = (texto) =>
  [...texto]
    .map((c) => {
      const n = c.codePointAt(0)
      if (n >= 0x61 && n <= 0x7a) return String.fromCodePoint(0x24d0 + n - 0x61)
      if (n >= 0x41 && n <= 0x5a) return String.fromCodePoint(0x24b6 + n - 0x41)
      return c
    })
    .join('')

/** Quita tildes para que las tablas de letras las encuentren: "á" pasa a "a". */
const sinTilde = (c) => (c === 'ñ' || c === 'Ñ' ? c : c.normalize('NFD').replace(/[̀-ͯ]/g, ''))

export const ESTILOS = [
  { id: 'tal_cual', aplicar: (t) => t },
  { id: 'mayusculas', aplicar: (t) => t.toUpperCase() },
  { id: 'versalitas', aplicar: (t) => [...t.toLowerCase()].map((c) => VERSALITAS[sinTilde(c)] ?? c).join('') },
  { id: 'burbuja', aplicar: (t) => burbuja([...t].map(sinTilde).join('')) },
  { id: 'al_reves', aplicar: (t) => [...t.toLowerCase()].map((c) => AL_REVES[sinTilde(c)] ?? c).reverse().join('') },
  { id: 'ancho', aplicar: anchoCompleto },
  { id: 'separado', aplicar: (t) => [...t.trim()].join(' ').replace(/ {3}/g, '   ') }
]

/** Adornos que se ponen a los lados. Todos del plano basico. */
export const ADORNOS = [
  { id: 'ninguno', izq: '', der: '' },
  { id: 'estrella', izq: '✦ ', der: ' ✦' },
  { id: 'corona', izq: '♛ ', der: ' ♛' },
  { id: 'rayo', izq: '⚡ ', der: ' ⚡' },
  { id: 'espadas', izq: '⚔ ', der: ' ⚔' },
  { id: 'calavera', izq: '☠ ', der: ' ☠' },
  { id: 'corazon', izq: '♥ ', der: ' ♥' },
  { id: 'pico', izq: '⛏ ', der: ' ⛏' },
  { id: 'flor', izq: '✿ ', der: ' ✿' },
  { id: 'rombo', izq: '◆ ', der: ' ◆' },
  { id: 'comillas', izq: '« ', der: ' »' },
  { id: 'flecha', izq: '➤ ', der: '' }
]

/**
 * Lo que de verdad cuenta el juego no son las letras que ves sino las unidades
 * UTF-16, que es como mide Java. Con lo que hay aqui coinciden, porque todo es
 * del plano basico; la funcion existe igual para que el dia que se cuele algo
 * de fuera el contador no mienta.
 */
export const largo = (texto) => texto.length

export const componer = (texto, estilo, adorno) =>
  `${adorno.izq}${estilo.aplicar(texto)}${adorno.der}`

// ---------------------------------------------------------------------------
// Colores
// Los dieciseis del juego, con su codigo para Bedrock (§) y su nombre para los
// comandos de Java. El hex es el que pinta el juego, para la vista previa.
// ---------------------------------------------------------------------------

export const COLORES = [
  { codigo: 'f', java: 'white', hex: '#FFFFFF' },
  { codigo: '7', java: 'gray', hex: '#AAAAAA' },
  { codigo: '8', java: 'dark_gray', hex: '#555555' },
  { codigo: '0', java: 'black', hex: '#000000' },
  { codigo: 'c', java: 'red', hex: '#FF5555' },
  { codigo: '4', java: 'dark_red', hex: '#AA0000' },
  { codigo: '6', java: 'gold', hex: '#FFAA00' },
  { codigo: 'e', java: 'yellow', hex: '#FFFF55' },
  { codigo: 'a', java: 'green', hex: '#55FF55' },
  { codigo: '2', java: 'dark_green', hex: '#00AA00' },
  { codigo: 'b', java: 'aqua', hex: '#55FFFF' },
  { codigo: '3', java: 'dark_aqua', hex: '#00AAAA' },
  { codigo: '9', java: 'blue', hex: '#5555FF' },
  { codigo: '1', java: 'dark_blue', hex: '#0000AA' },
  { codigo: 'd', java: 'light_purple', hex: '#FF55FF' },
  { codigo: '5', java: 'dark_purple', hex: '#AA00AA' }
]

export const COLOR = Object.fromEntries(COLORES.map((c) => [c.codigo, c]))

const aRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const aHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/**
 * Un color por letra, de "desde" a "hasta". Los espacios no gastan color: si
 * contaran, el degradado se veria a saltos en las palabras cortas.
 */
export const degradado = (texto, desde, hasta) => {
  const letras = [...texto]
  const visibles = letras.filter((c) => c.trim()).length
  const [a, b] = [aRgb(desde), aRgb(hasta)]
  let i = 0
  return letras.map((c) => {
    if (!c.trim()) return { c, hex: null }
    const t = visibles > 1 ? i++ / (visibles - 1) : 0
    return { c, hex: aHex(a.map((v, k) => v + (b[k] - v) * t)) }
  })
}

/**
 * El texto en trozos con su color, que es lo que pintan la vista previa y el
 * comando. Un color solo es un trozo; un degradado es un trozo por letra.
 */
export const trozos = (texto, { color = null, color2 = null } = {}) => {
  if (color && color2 && color !== color2) {
    return degradado(texto, COLOR[color].hex, COLOR[color2].hex)
  }
  return [{ c: texto, hex: color ? COLOR[color].hex : null }]
}

// ---------------------------------------------------------------------------
// Bedrock: codigos de color dentro del nombre
// ---------------------------------------------------------------------------

/**
 * En Bedrock el color va dentro del propio nombre con "§" y una letra. Un
 * degradado no existe: Bedrock solo tiene los dieciseis colores, asi que se
 * reparte el texto en tramos del color de inicio al de final.
 */
export const conCodigos = (texto, { color = null, color2 = null, negrita = false } = {}) => {
  const formato = negrita ? '§l' : ''
  if (!color) return negrita ? `§l${texto}` : texto
  if (!color2 || color2 === color) return `§${color}${formato}${texto}`
  const letras = [...texto]
  const mitad = Math.ceil(letras.length / 2)
  // Despues de un color Bedrock borra la negrita, asi que se repite.
  return `§${color}${formato}${letras.slice(0, mitad).join('')}§${color2}${formato}${letras.slice(mitad).join('')}`
}

// ---------------------------------------------------------------------------
// Java: comando /give
// ---------------------------------------------------------------------------

/** Escapa lo que romperia la cadena SNBT entre comillas dobles. */
const snbt = (texto) => texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

/**
 * Comando para darte el objeto con el nombre ya puesto. Desde la 1.21.5 los
 * textos de los comandos van en SNBT, no en JSON. Se apaga la cursiva, que es
 * lo que el juego pone por defecto a todo lo renombrado.
 */
export const comandoGive = (item, texto, opciones = {}) => {
  const partes = trozos(texto, opciones)
  const negrita = opciones.negrita ? ',bold:true' : ''
  const parte = ({ c, hex }) => `{text:"${snbt(c)}"${hex ? `,color:"${hex}"` : ''}}`
  const nombre =
    partes.length === 1
      ? `{text:"${snbt(partes[0].c)}"${partes[0].hex ? `,color:"${javaDe(opciones.color) ?? partes[0].hex}"` : ''},italic:false${negrita}}`
      : `{text:"",italic:false${negrita},extra:[${partes.map(parte).join(',')}]}`
  return `/give @s ${item}[custom_name=${nombre}]`
}

/** Si el color es uno de los dieciseis, el comando usa su nombre, que se lee mejor. */
const javaDe = (codigo) => (codigo ? COLOR[codigo]?.java : null)

/** Objetos para el comando. El id es el del juego; el nombre sale del grafo. */
export const OBJETOS_COMANDO = [
  'diamond_sword', 'netherite_sword', 'diamond_pickaxe', 'netherite_pickaxe', 'bow',
  'crossbow', 'trident', 'mace', 'shield', 'diamond_helmet', 'elytra', 'name_tag'
]

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

/**
 * Las ideas salen de dos listas: una de "que es" y otra de "de que". Asi con
 * una docena de palabras por lista hay mas de cien nombres distintos, y basta
 * con anadir una palabra para tener otra docena. Los textos viven en ui.json,
 * separados por "|", porque son de cada idioma.
 */
export const IDEA_OBJETOS = ['arma', 'herramienta', 'armadura', 'mascota']
export const IDEA_TONOS = ['epico', 'gracioso', 'tierno']

export const nuevaIdea = (listas, objeto, tono, azar = Math.random, maximo = EDICIONES.bedrock.limite) => {
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)]
  const base = listas[`${objeto}.${tono}`] ?? listas[objeto] ?? []
  const complemento = listas[`complemento.${tono}`] ?? []
  // Las mascotas llevan nombre propio, sin complemento: "Bizcocho", no
  // "Bizcocho del Abismo".
  if (objeto === 'mascota' || complemento.length === 0) return elegir(base)
  // Una idea que no cabe en el yunque no es una idea: se prueba otra. El
  // limite es el de Bedrock, el mas corto, para que sirva en las dos.
  let idea = ''
  for (let i = 0; i < 30; i++) {
    idea = `${elegir(base)} ${elegir(complemento)}`
    if (idea.length <= maximo) return idea
  }
  return elegir(base)
}

// ---------------------------------------------------------------------------
// Nombres secretos
// ---------------------------------------------------------------------------

/**
 * Nombres que el juego reconoce y que cambian al mob. Se ponen con una etiqueta
 * escrita en el yunque. "mob" es el id del grafo, para enlazar a su ficha.
 */
export const SECRETOS = [
  { nombre: 'Dinnerbone', mob: null, id: 'dinnerbone' },
  { nombre: 'Grumm', mob: null, id: 'grumm' },
  { nombre: 'jeb_', mob: 'sheep', id: 'jeb' },
  { nombre: 'Toast', mob: 'rabbit_mob', id: 'toast' },
  { nombre: 'Johnny', mob: 'vindicator', id: 'johnny' }
]
