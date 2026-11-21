#!/usr/bin/env node
/**
 * Comprueba la logica del telar y del mezclador.
 *
 * Lo que se prueba es lo que, si falla, falla en silencio: un enlace compartido
 * que al abrirse pierde capas, una lista de materiales que pide un tinte de
 * menos, o una mezcla del juego que el mezclador no reconoce por el orden en
 * que pusiste los tintes.
 *
 * Uso: node scripts/probar-telar.mjs
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PATRONES,
  IDEAS,
  MAX_CAPAS,
  COLORES,
  rectsDePatron,
  aTextoDiseno,
  deTextoDiseno,
  materiales,
  claveMezcla
} from '../src/lib/tintes.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let fallos = 0
const comprobar = (condicion, mensaje) => {
  if (!condicion) {
    fallos++
    console.error(`  ✗ ${mensaje}`)
  }
}

// --- El enlace de un diseno vuelve igual que se fue ------------------------

for (const idea of IDEAS) {
  const vuelta = deTextoDiseno(`#${aTextoDiseno(idea)}`)
  comprobar(
    JSON.stringify(vuelta) === JSON.stringify({ base: idea.base, capas: idea.capas }),
    `la idea "${idea.id}" no sobrevive al enlace`
  )
  comprobar(idea.capas.length <= MAX_CAPAS, `la idea "${idea.id}" pasa de ${MAX_CAPAS} capas`)
}

comprobar(deTextoDiseno('#base=morado') === null, 'acepta un color que no existe')
comprobar(deTextoDiseno('') === null, 'acepta un enlace vacio')
const sucio = deTextoDiseno('#base=red&capas=creeper.black,nada.red,circle.azul,border.white')
comprobar(sucio?.capas.length === 2, 'no descarta las capas con patron o color desconocido')
const largo = deTextoDiseno(
  `#base=red&capas=${Array.from({ length: 9 }, () => 'circle.white').join(',')}`
)
comprobar(largo?.capas.length === MAX_CAPAS, `no corta en ${MAX_CAPAS} capas`)

// --- Materiales -------------------------------------------------------------

const m = materiales({
  base: 'blue',
  capas: [
    { patron: 'creeper', color: 'black' },
    { patron: 'border', color: 'black' },
    { patron: 'creeper', color: 'white' },
    { patron: 'circle', color: 'red' }
  ]
})
comprobar(m.estandarte === 'blue_banner', 'el estandarte base no es el del color de la tela')
comprobar(
  m.tintes.find((t) => t.id === 'black_dye')?.cantidad === 2,
  'no cuenta un tinte por capa'
)
comprobar(
  m.patrones.length === 1 && m.patrones[0] === 'creeper_banner_pattern',
  'cuenta el patron de estandarte mas de una vez, o no lo cuenta'
)

// --- Dibujos ----------------------------------------------------------------

const ids = new Set()
for (const p of PATRONES) {
  comprobar(!ids.has(p.id), `patron repetido: ${p.id}`)
  ids.add(p.id)
  comprobar(rectsDePatron(p).length > 0, `el patron ${p.id} no pinta nada`)
}
comprobar(COLORES.length === 16, 'no hay dieciseis colores')

// --- Mezclas: toda receta de tintes se reconoce en cualquier orden ----------

const carpeta = join(RAIZ, 'data/entities/recipes')
const tintes = new Set(COLORES.map((c) => `${c.id}_dye`))
let mezclas = 0
for (const archivo of (await readdir(carpeta)).filter((f) => f.endsWith('.json'))) {
  const r = JSON.parse((await readFile(join(carpeta, archivo), 'utf8')).replace(/^﻿/, ''))
  if (!tintes.has(r.resultado?.item)) continue
  if (!r.ingredientes?.every((i) => i.opciones.length === 1 && tintes.has(i.opciones[0]))) continue
  mezclas++
  const colores = r.ingredientes.flatMap((i) =>
    Array.from({ length: i.cantidad ?? 1 }, () => i.opciones[0].replace(/_dye$/, ''))
  )
  comprobar(
    claveMezcla(colores) === claveMezcla([...colores].reverse()),
    `la mezcla ${r.id} depende del orden`
  )
  comprobar(colores.length <= 4, `la mezcla ${r.id} no cabe en la cuadricula del inventario`)
}
comprobar(mezclas >= 10, `solo se encuentran ${mezclas} mezclas de tintes en las recetas`)

if (fallos > 0) {
  console.error(`\nTelar: ${fallos} fallo(s).`)
  process.exit(1)
}
console.log(`Telar: ${PATRONES.length} patrones, ${IDEAS.length} ideas y ${mezclas} mezclas comprobadas.`)
