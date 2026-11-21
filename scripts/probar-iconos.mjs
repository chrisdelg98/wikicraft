#!/usr/bin/env node
/**
 * Comprueba los iconos de objetos.
 *
 * Un dibujo con una fila de 15 pixeles no rompe el build: se ve torcido en
 * produccion y nadie sabe por que. Y una pocion nueva cuyo efecto no tenga
 * color saldria azul, como el agua, sin avisar. Esto lo impide.
 *
 * Uso: node scripts/probar-iconos.mjs
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SIMBOLOS, TABLA, TABLA_PROPIA, COLOR_EFECTO, iconoDe } from '../src/lib/sprites.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let fallos = 0
const comprobar = (condicion, mensaje) => {
  if (!condicion) {
    fallos++
    console.error(`  ✗ ${mensaje}`)
  }
}

for (const [nombre, mapa] of Object.entries(SIMBOLOS)) {
  comprobar(mapa.length === 16, `${nombre} tiene ${mapa.length} filas en vez de 16`)
  const tabla = { ...TABLA, ...(TABLA_PROPIA[nombre] ?? {}) }
  mapa.forEach((fila, i) => {
    comprobar(fila.length === 16, `${nombre}, fila ${i}: mide ${fila.length}`)
    for (const c of fila) comprobar(c === '.' || tabla[c], `${nombre}: el caracter "${c}" no tiene color`)
  })
}

const leerCarpeta = async (modulo) => {
  const carpeta = join(RAIZ, 'data/entities', modulo)
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.json'))
  return Promise.all(archivos.map(async (f) => JSON.parse(await readFile(join(carpeta, f), 'utf8'))))
}

const pociones = await leerCarpeta('potions')
for (const p of pociones) {
  comprobar(p.efecto in COLOR_EFECTO, `la pocion ${p.id} tiene el efecto "${p.efecto}", que no tiene color`)
  comprobar(iconoDe(p.id, p)?.simbolo === 'pocion', `la pocion ${p.id} no tiene icono`)
}

// Cada icono apunta a un dibujo que existe.
let conIcono = 0
for (const modulo of ['items', 'tools', 'potions']) {
  for (const e of await leerCarpeta(modulo)) {
    const icono = iconoDe(e.id, e)
    if (!icono) continue
    conIcono++
    comprobar(icono.simbolo in SIMBOLOS, `${e.id} apunta al dibujo "${icono.simbolo}", que no existe`)
  }
}
comprobar(iconoDe('red_wool')?.simbolo === 'lana', 'la lana roja no tiene icono de lana')
comprobar(iconoDe('stripped_oak_log')?.simbolo === 'tronco_pelado', 'el tronco descortezado no se reconoce')
comprobar(iconoDe('cherry_leaves')?.simbolo === 'hojas_flor', 'las hojas de cerezo deberian llevar flores')

if (fallos > 0) {
  console.error(`\nIconos: ${fallos} fallo(s).`)
  process.exit(1)
}
console.log(`Iconos: ${Object.keys(SIMBOLOS).length} dibujos de 16x16 y ${conIcono} fichas con icono.`)
