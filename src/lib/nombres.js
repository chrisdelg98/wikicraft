/**
 * Nombres para el yunque: letras raras que el juego SI sabe dibujar.
 *
 * Esta es toda la gracia del modulo. Casi cualquier generador de "texto bonito"
 * de internet usa el bloque de simbolos matematicos (𝕕𝕠𝕓𝕝𝕖 𝕥𝕣𝕒𝕫𝕠, 𝓮𝓼𝓬𝓻𝓲𝓽𝓪,
 * 𝖋𝖗𝖆𝖐𝖙𝖚𝖗), que vive fuera del plano basico de Unicode. La fuente de Minecraft
 * solo cubre el plano basico, asi que todo eso sale en el juego como cajas
 * blancas: pagas tu nivel en el yunque y te llevas ▯▯▯▯▯.
 *
 * Aqui no hay ni un caracter fuera del plano basico. A cambio hay menos
 * estilos, pero los que hay se ven.
 */

/** Limite del campo del yunque, en unidades UTF-16. */
export const LIMITE = 50

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

/** Ancho completo: el ASCII imprimible corrido 0xFEE0, y el espacio aparte. */
const anchoCompleto = (texto) =>
  [...texto]
    .map((c) => {
      if (c === ' ') return '\u3000'
      const n = c.codePointAt(0)
      return n >= 0x21 && n <= 0x7e ? String.fromCodePoint(n + 0xfee0) : c
    })
    .join('')

export const ESTILOS = [
  { id: 'tal_cual', aplicar: (t) => t },
  { id: 'mayusculas', aplicar: (t) => t.toUpperCase() },
  { id: 'versalitas', aplicar: (t) => [...t.toLowerCase()].map((c) => VERSALITAS[c] ?? c).join('') },
  { id: 'ancho', aplicar: anchoCompleto },
  { id: 'separado', aplicar: (t) => [...t.trim()].join(' ').replace(/ {3}/g, '   ') }
]

/** Adornos que se ponen a los lados. Todos del plano basico. */
export const ADORNOS = [
  { id: 'ninguno', izq: '', der: '' },
  { id: 'estrella', izq: '✦ ', der: ' ✦' },
  { id: 'rombo', izq: '◆ ', der: ' ◆' },
  { id: 'flor', izq: '❈ ', der: ' ❈' },
  { id: 'espadas', izq: '⚔ ', der: ' ⚔' },
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
