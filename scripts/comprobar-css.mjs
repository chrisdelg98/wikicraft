/**
 * Busca clases que salen en el HTML y no existen en el CSS.
 *
 * Es el fallo que acaba de costar un commit: "text-acento-contraste/70" salia
 * en el atributo class, Tailwind no la compilaba por venir el color de una
 * variable, y el numero se quedaba del color que le tocara. En el HTML se ve
 * bien puesta; solo el CSS dice la verdad.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(RAIZ, 'dist')

const css = readdirSync(join(DIST, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(DIST, '_astro', f), 'utf8'))
  .join('\n')

/** Una clase existe si aparece en el CSS con los caracteres raros escapados. */
const existe = (clase) => {
  const escapada = clase.replace(/[/.:[\]()%,#&>+~*!'"]/g, (c) => `\\${c}`)
  return css.includes(`.${escapada}`)
}

/** Las que pinta el propio proyecto en global.css, sin pasar por Tailwind. */
const PROPIAS = new Set([
  'bloque', 'bloque-pulsable', 'trama', 'titulo-seccion', 'tabla-envoltorio',
  'envuelve', 'ancho', 'hueco', 'hueco-vacio', 'bandeja', 'group', 'sr-only'
])

const PAGINAS = [
  'es/index.html',
  'es/objetos/index.html',
  'es/objetos/tipo/bloque/index.html',
  'es/mobs/index.html',
  'es/lugares/monumento-oceanico/index.html',
  'es/encantador/index.html',
  'es/crafteos/receta-cofre/index.html'
]

const vistas = new Map()
for (const pagina of PAGINAS) {
  const ruta = join(DIST, pagina)
  if (!existsSync(ruta)) continue
  const html = readFileSync(ruta, 'utf8')
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    // El HTML trae las entidades escapadas y el CSS no.
    const crudo = m[1].replaceAll('&amp;', '&').replaceAll('&gt;', '>')
    for (const clase of crudo.split(/\s+/)) {
      if (clase && !PROPIAS.has(clase)) vistas.set(clase, pagina)
    }
  }
}

/**
 * Reglas de elemento sueltas, fuera de toda @layer.
 *
 * Es el mismo fallo por otro camino: la clase existe, se aplica, y aun asi no
 * pinta. En CSS lo que va fuera de capa gana a lo que va dentro por mucha
 * especificidad que tenga lo de dentro, y las utilidades de Tailwind viven
 * dentro de "utilities". Un "a { color: inherit }" suelto deja sin efecto
 * cualquier clase de color puesta en un enlace, y no hay forma de verlo salvo
 * mirando el navegador.
 */
const sueltas = []
{
  // Se recorre contando llaves y se borra lo que caiga dentro de una @layer o
  // de un @keyframes. Con expresiones regulares no sale: las capas de Tailwind
  // anidan varios niveles y el patron las daba por sueltas.
  //
  // Los fotogramas se saltan porque dentro llevan bloques llamados "from" y
  // "to", que tienen toda la pinta de un selector de elemento y no lo son. Un
  // "to { color: ... }" hizo saltar la alarma sin motivo.
  const SALTAR = ['@layer', '@keyframes', '@-webkit-keyframes']

  let fuera = ''
  let i = 0
  while (i < css.length) {
    if (SALTAR.some((regla) => css.startsWith(regla, i))) {
      const llave = css.indexOf('{', i)
      const puntoYComa = css.indexOf(';', i)
      if (llave < 0 || (puntoYComa >= 0 && puntoYComa < llave)) {
        i = (puntoYComa < 0 ? css.length : puntoYComa) + 1
        continue
      }
      let profundidad = 1
      let j = llave + 1
      while (j < css.length && profundidad > 0) {
        if (css[j] === '{') profundidad++
        else if (css[j] === '}') profundidad--
        j++
      }
      i = j
      continue
    }
    fuera += css[i]
    i++
  }

  for (const m of fuera.matchAll(/(^|[};])\s*([a-z][a-z0-9]*(?:\s*,\s*[a-z][a-z0-9]*)*)\s*\{([^}]*)\}/g)) {
    if (/(^|;)\s*(color|font-weight|background|background-color)\s*:/.test(m[3])) {
      sueltas.push(`${m[2].trim()} { ${m[3].trim().slice(0, 60)} }`)
    }
  }
}

const inertes = [...vistas].filter(([clase]) => !existe(clase))

console.log(`\n  CSS: ${vistas.size} clases distintas revisadas en ${PAGINAS.length} paginas`)

let mal = false

if (inertes.length === 0) {
  console.log('  Ninguna clase inerte.')
} else {
  mal = true
  console.log(`\n  ${inertes.length} clase(s) que salen en el HTML y no existen en el CSS:\n`)
  for (const [clase, pagina] of inertes) console.log(`    ${clase.padEnd(36)} ${pagina}`)
  console.log('\n  Se ven bien puestas en el atributo class y no pintan nada.')
}

if (sueltas.length === 0) {
  console.log('  Ninguna regla de elemento fuera de capa.\n')
} else {
  mal = true
  console.log(`\n  ${sueltas.length} regla(s) de elemento fuera de toda @layer:\n`)
  for (const regla of sueltas) console.log(`    ${regla}`)
  console.log('\n  Fuera de capa le ganan a cualquier utilidad de Tailwind, por')
  console.log('  mucha especificidad que tenga. Metelas en @layer base.\n')
}

if (mal) process.exit(1)
