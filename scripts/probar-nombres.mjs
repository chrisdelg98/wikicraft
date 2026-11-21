#!/usr/bin/env node
/**
 * Comprueba el generador de nombres.
 *
 * La promesa de la pagina es que todo lo que sale se ve dentro del juego. Si
 * un estilo nuevo colara una letra fuera del plano basico de Unicode, el
 * jugador pagaria su nivel en el yunque y se llevaria cuadros blancos, y nadie
 * se enteraria hasta verlo en la partida. Esta prueba lo impide.
 *
 * Uso: node scripts/probar-nombres.mjs
 */

import { readFile } from 'node:fs/promises'
import {
  ESTILOS,
  ADORNOS,
  COLORES,
  componer,
  conCodigos,
  comandoGive,
  degradado,
  nuevaIdea,
  IDEA_OBJETOS,
  IDEA_TONOS
} from '../src/lib/nombres.js'

let fallos = 0
const comprobar = (condicion, mensaje) => {
  if (!condicion) {
    fallos++
    console.error(`  ✗ ${mensaje}`)
  }
}

const fueraDelPlano = (texto) => [...texto].some((c) => c.codePointAt(0) > 0xffff)

// --- Todo lo que sale se ve en el juego ------------------------------------

const MUESTRAS = ['Afortunado', 'Ñandú Pingüino', 'ABC xyz 123 !?', 'Espada del Dragón']
for (const estilo of ESTILOS) {
  for (const adorno of ADORNOS) {
    for (const m of MUESTRAS) {
      const r = componer(m, estilo, adorno)
      comprobar(!fueraDelPlano(r), `${estilo.id} + ${adorno.id} saca letras que el juego no dibuja: ${r}`)
    }
  }
}

const alReves = ESTILOS.find((e) => e.id === 'al_reves').aplicar('hola')
comprobar(alReves === 'ɐloɥ', `al revés debería dar "ɐloɥ" y da "${alReves}"`)

// --- Bedrock ---------------------------------------------------------------

comprobar(conCodigos('Hola', { color: 'c' }) === '§cHola', 'el código de color de Bedrock va delante')
comprobar(conCodigos('Hola', { color: 'c', negrita: true }) === '§c§lHola', 'la negrita va después del color')
comprobar(conCodigos('Hola', {}) === 'Hola', 'sin color no se añade nada')
comprobar(conCodigos('Hola', { color: 'c', color2: '9' }) === '§cHo§9la', 'el degradado de Bedrock parte el nombre en dos colores')

// --- Java ------------------------------------------------------------------

const simple = comandoGive('diamond_sword', 'Hola', { color: '6' })
comprobar(
  simple === '/give @s diamond_sword[custom_name={text:"Hola",color:"gold",italic:false}]',
  `comando con color mal formado: ${simple}`
)
const comillas = comandoGive('name_tag', 'Di "hola"', {})
comprobar(comillas.includes('text:"Di \\"hola\\""'), `las comillas no se escapan: ${comillas}`)
const grad = comandoGive('bow', 'Ab', { color: 'c', color2: '9', negrita: true })
comprobar(grad.includes('extra:[') && grad.includes('bold:true') && grad.includes('italic:false'), `degradado mal formado: ${grad}`)

const d = degradado('A B', '#000000', '#FFFFFF')
comprobar(d[0].hex === '#000000' && d[2].hex === '#FFFFFF' && d[1].hex === null, 'los espacios no deben gastar color')
comprobar(COLORES.length === 16, 'no hay dieciséis colores')

// --- Ideas -----------------------------------------------------------------

for (const idioma of ['es', 'en']) {
  const ui = JSON.parse(await readFile(new URL(`../data/i18n/${idioma}/ui.json`, import.meta.url), 'utf8'))
  const listas = {}
  for (const [k, v] of Object.entries(ui)) {
    if (k.startsWith('nombres.idea.')) listas[k.slice('nombres.idea.'.length)] = v.split('|').map((s) => s.trim())
  }
  for (const o of IDEA_OBJETOS) {
    for (const t of IDEA_TONOS) {
      for (let i = 0; i < 20; i++) {
        const idea = nuevaIdea(listas, o, t)
        comprobar(idea && !idea.includes('undefined'), `[${idioma}] idea vacía para ${o}/${t}`)
        comprobar(idea.length <= 30, `[${idioma}] idea más larga que el yunque de Bedrock: ${idea}`)
      }
    }
  }
}

if (fallos > 0) {
  console.error(`\nNombres: ${fallos} fallo(s).`)
  process.exit(1)
}
console.log(`Nombres: ${ESTILOS.length} estilos y ${ADORNOS.length} adornos dentro del plano básico; comandos e ideas en orden.`)
