#!/usr/bin/env node
/**
 * Comprueba el motor del yunque contra operaciones de coste conocido.
 *
 * Una wiki que dice "esta ruta cuesta 34 niveles" y se equivoca es peor que una
 * que no lo dice: quien la siga se queda sin herramienta. Estas pruebas son la
 * unica garantia de que los multiplicadores y la formula estan bien, asi que
 * corren en cada build junto al validador del modelo.
 *
 * Uso: node scripts/probar-yunque.mjs
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimizar, unir } from '../src/lib/yunque.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const leer = async (ruta) =>
  JSON.parse((await readFile(ruta, 'utf8')).replace(/^﻿/, ''))

// --- Tabla de multiplicadores, desde las propias fichas --------------------

const carpeta = join(RAIZ, 'data/entities/enchantments')
const tabla = {}
const sinDato = []

for (const archivo of (await readdir(carpeta)).filter((f) => f.endsWith('.json'))) {
  const e = await leer(join(carpeta, archivo))
  tabla[e.id] = {
    libro: e.costeYunque?.libro,
    objeto: e.costeYunque?.objeto,
    nivelMaximo: e.nivelMaximo,
    incompatibleCon: e.incompatibleCon ?? []
  }
  if (e.costeYunque?.libro == null) sinDato.push(e.id)
}

// --- Pruebas ---------------------------------------------------------------

const { casos, secuencias } = await leer(join(RAIZ, 'data/pruebas/yunque.json'))

const fallos = []
const linea = '-'.repeat(70)

console.log(`\n${linea}\n  Motor del yunque\n${linea}\n`)

for (const s of secuencias) {
  let estado = s.objeto
  const costes = []
  let roto = false

  for (const libro of s.pasos) {
    const r = unir(estado, { ench: libro, trabajos: 0 }, tabla)
    if (!r) {
      fallos.push(`${s.id}: una operacion resulto imposible`)
      roto = true
      break
    }
    costes.push(r.coste)
    estado = r.resultado
  }

  if (roto) continue
  const bien = JSON.stringify(costes) === JSON.stringify(s.costesEsperados)
  console.log(`  ${bien ? 'OK  ' : 'MAL '} ${s.nombre}`)
  console.log(`       costes ${costes.join(' + ')} = ${costes.reduce((a, b) => a + b, 0)}`)
  if (!bien) {
    console.log(`       se esperaba ${s.costesEsperados.join(' + ')}`)
    fallos.push(`${s.id}: costes por operacion distintos de los esperados`)
  }
}

for (const c of casos) {
  const r = optimizar(c.objeto, c.libros.map((ench) => ({ ench, trabajos: 0 })), tabla)

  if (r.imposible) {
    console.log(`  MAL  ${c.nombre}`)
    console.log(`       el motor no encontro ruta (${r.imposible})`)
    fallos.push(`${c.id}: sin ruta`)
    continue
  }

  const bienCoste = r.coste === c.costeEsperado
  const bienResultado =
    !c.resultadoEsperado ||
    JSON.stringify(Object.entries(r.resultado.ench).sort()) ===
      JSON.stringify(Object.entries(c.resultadoEsperado).sort())

  console.log(`  ${bienCoste && bienResultado ? 'OK  ' : 'MAL '} ${c.nombre}`)
  console.log(`       coste ${r.coste} en ${r.pasos.length} operaciones (esperado ${c.costeEsperado})`)

  // La ruta se imprime siempre: un total sin el camino no se puede revisar.
  const nombresDe = (mascara) =>
    c.libros
      .map((l, i) => (mascara & (1 << i) ? Object.entries(l).map(([k, v]) => `${k} ${v}`).join('+') : null))
      .filter(Boolean)
      .join(' + ')

  for (const [i, paso] of r.pasos.entries()) {
    const texto =
      paso.tipo === 'libros'
        ? `libro [${nombresDe(paso.de)}] + libro [${nombresDe(paso.con)}]`
        : `objeto + libro [${nombresDe(paso.con)}]`
    console.log(`         ${i + 1}. ${texto.padEnd(58)} ${String(paso.coste).padStart(3)}`)
  }

  if (!bienCoste) fallos.push(`${c.id}: coste ${r.coste}, se esperaba ${c.costeEsperado}`)
  if (!bienResultado) fallos.push(`${c.id}: el resultado no coincide`)
}

// --- Informe ---------------------------------------------------------------

console.log(`\n  Encantamientos con multiplicador: ${Object.keys(tabla).length - sinDato.length} de ${Object.keys(tabla).length}`)
if (sinDato.length > 0) {
  console.log(`  Sin contrastar todavia (${sinDato.length}): ${sinDato.join(', ')}`)
  console.log(`  El optimizador se niega a calcular rutas que los usen.`)
}

console.log(`\n${linea}`)
if (fallos.length === 0) {
  console.log('  Todas las pruebas cuadran.\n')
  process.exit(0)
}
console.log(`  ${fallos.length} prueba(s) fallan:`)
for (const f of fallos) console.log(`    - ${f}`)
console.log('')
process.exit(1)
