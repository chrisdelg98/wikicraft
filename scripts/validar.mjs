#!/usr/bin/env node
/**
 * Validador del modelo de datos de Wikicraft.
 *
 * El valor del proyecto está en las relaciones entre entidades, y una relación
 * rota no se nota al mirar un archivo: se nota cuando una ficha aparece vacía en
 * producción. Este script convierte ese fallo silencioso en un error ruidoso.
 *
 * Comprueba cuatro cosas:
 *   1. Forma de las entidades: identificadores, unicidad y coherencia con el
 *      nombre del archivo.
 *   2. Integridad referencial: toda referencia apunta a una entidad que existe.
 *   3. Coherencia del dominio: incompatibilidades declaradas en ambos sentidos,
 *      recomendaciones que de verdad son aplicables.
 *   4. Cobertura de traducción por idioma, con los huecos listados uno a uno.
 *
 * Uso: node scripts/validar.mjs
 * Sale con código 1 si hay errores, 0 si solo hay avisos.
 */

import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATOS = join(RAIZ, 'data')

const errores = []
const avisos = []

const error = (donde, mensaje) => errores.push({ donde, mensaje })
const aviso = (donde, mensaje) => avisos.push({ donde, mensaje })

/**
 * Campos que contienen referencias a otras entidades, por tipo. Se declaran a
 * mano en lugar de deducirse de los esquemas: es una lista corta, explícita, y
 * evita que el validador dependa de una librería de JSON Schema.
 * La sintaxis `a[].b` recorre un array.
 */
const CAMPOS_REFERENCIA = {
  item: ['obtenidoDe[]'],
  encantamiento: ['incompatibleCon[]', 'obtenidoDe[]'],
  herramienta: [
    'materiales[].item',
    'reparadoCon[]',
    'encantamientosRecomendados[]',
    'mobsIdeales[]'
  ],
  armadura: [
    'materiales[].item',
    'reparadoCon[]',
    'encantamientosRecomendados[]',
    'mobsIdeales[]'
  ],
  aldeano: [
    'mesaDeTrabajo',
    'niveles[].tradeos[].entrega.item',
    'niveles[].tradeos[].entrega.encantamiento',
    'niveles[].tradeos[].recibe[].item'
  ],
  mob: ['apareceEn[]', 'botin[].item'],
  pocion: ['derivaDe', 'ingrediente'],
  receta: ['resultado.item', 'ingredientes[].item'],
  bioma: ['contiene[]', 'mobs[]', 'recursos[]', 'botin[]', 'exclusivo[]'],
  estructura: ['apareceEn[]', 'mobs[]', 'recursos[]', 'botin[]', 'exclusivo[]'],
  granja: ['produce[]', 'requiereMobs[]', 'lugar', 'materiales[].item']
}

/** Etapas de progreso válidas. Ver docs/decisiones/003-diseno-para-todos.md. */
const ETAPAS = ['inicio', 'hierro', 'diamante', 'nether', 'end']

/** Campos obligatorios en cada entrada de traducción. */
const CAMPOS_TRADUCCION = ['nombre', 'slug']

const leerJson = async (ruta) => {
  try {
    // Se retira el BOM: muchos editores de Windows lo escriben y JSON.parse lo
    // rechaza con un error que no dice nada útil sobre la causa real.
    const contenido = (await readFile(ruta, 'utf8')).replace(/^﻿/, '')
    return JSON.parse(contenido)
  } catch (e) {
    error(ruta.replace(RAIZ + '\\', '').replace(RAIZ + '/', ''), `JSON inválido: ${e.message}`)
    return null
  }
}

/** Recorre una ruta tipo `niveles[].tradeos[].entrega.item` y devuelve los valores encontrados. */
const recolectar = (valor, segmentos) => {
  if (valor == null) return []
  if (segmentos.length === 0) return [valor]

  const [actual, ...resto] = segmentos
  if (actual === '[]') {
    if (!Array.isArray(valor)) return []
    return valor.flatMap((v) => recolectar(v, resto))
  }
  return recolectar(valor[actual], resto)
}

const trocear = (ruta) =>
  ruta
    .replace(/\[\]/g, '.[].')
    .split('.')
    .filter(Boolean)

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

const locales = await leerJson(join(DATOS, 'locales.json'))
if (!locales) {
  console.error('No se pudo leer data/locales.json. Sin eso no hay nada que validar.')
  process.exit(1)
}

const idiomas = locales.idiomas.map((i) => i.codigo)
const idiomaBase = locales.base
const modulos = locales.modulos

/** id -> { entidad, modulo, archivo } */
const grafo = new Map()

for (const modulo of modulos) {
  const carpeta = join(DATOS, 'entities', modulo)
  if (!existsSync(carpeta)) {
    error(`data/entities/${modulo}`, 'El módulo está declarado en locales.json pero la carpeta no existe.')
    continue
  }

  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.json'))
  if (archivos.length === 0) {
    aviso(`data/entities/${modulo}`, 'El módulo no tiene ninguna entidad todavía.')
  }

  for (const archivo of archivos) {
    const ruta = join(carpeta, archivo)
    const entidad = await leerJson(ruta)
    if (!entidad) continue

    const donde = `data/entities/${modulo}/${archivo}`

    if (!entidad.id) {
      error(donde, 'Falta el campo obligatorio "id".')
      continue
    }
    if (!/^[a-z][a-z0-9_]*$/.test(entidad.id)) {
      error(donde, `El id "${entidad.id}" no es snake_case en minúsculas.`)
    }
    if (entidad.id !== basename(archivo, '.json')) {
      error(donde, `El id "${entidad.id}" no coincide con el nombre del archivo.`)
    }
    if (!entidad.tipo) {
      error(donde, 'Falta el campo obligatorio "tipo".')
    }
    // La etapa contesta a "¿esto es para mí ahora?", que es la pregunta que un
    // novato no sabe formular. Un campo opcional acaba siempre sin rellenar.
    if (!entidad.etapa) {
      error(donde, 'Falta el campo obligatorio "etapa".')
    } else if (!ETAPAS.includes(entidad.etapa)) {
      error(donde, `La etapa "${entidad.etapa}" no es válida. Opciones: ${ETAPAS.join(', ')}.`)
    }
    if (grafo.has(entidad.id)) {
      error(donde, `El id "${entidad.id}" ya lo usa ${grafo.get(entidad.id).donde}.`)
      continue
    }

    grafo.set(entidad.id, { entidad, modulo, donde })
  }
}

// ---------------------------------------------------------------------------
// Integridad referencial
// ---------------------------------------------------------------------------

for (const { entidad, donde } of grafo.values()) {
  const campos = CAMPOS_REFERENCIA[entidad.tipo]
  if (!campos) {
    aviso(donde, `No hay campos de referencia declarados para el tipo "${entidad.tipo}".`)
    continue
  }

  for (const campo of campos) {
    for (const referencia of recolectar(entidad, trocear(campo))) {
      if (!grafo.has(referencia)) {
        error(donde, `"${campo}" apunta a "${referencia}", que no existe en el grafo.`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Coherencia del dominio
// ---------------------------------------------------------------------------

const encantamientos = [...grafo.values()].filter((e) => e.entidad.tipo === 'encantamiento')
const equipo = [...grafo.values()].filter(
  (e) => e.entidad.tipo === 'herramienta' || e.entidad.tipo === 'armadura'
)

// Una incompatibilidad es simétrica: si A no combina con B, B tampoco con A.
for (const { entidad, donde } of encantamientos) {
  for (const otro of entidad.incompatibleCon ?? []) {
    const destino = grafo.get(otro)
    if (!destino) continue
    if (!(destino.entidad.incompatibleCon ?? []).includes(entidad.id)) {
      error(
        donde,
        `Declara incompatibilidad con "${otro}", pero "${otro}" no la declara de vuelta. Las incompatibilidades van en ambos sentidos.`
      )
    }
  }
}

// Los encantamientos compatibles se derivan, no se guardan. Lo que sí se guarda
// es la recomendación editorial, y esa tiene que ser un subconjunto real.
for (const { entidad, donde } of equipo) {
  const compatibles = new Set(
    encantamientos
      .filter((e) => (e.entidad.aplicableA ?? []).includes(entidad.categoria))
      .map((e) => e.entidad.id)
  )

  for (const recomendado of entidad.encantamientosRecomendados ?? []) {
    if (!grafo.has(recomendado)) continue
    if (!compatibles.has(recomendado)) {
      error(
        donde,
        `Recomienda "${recomendado}", pero ese encantamiento no es aplicable a la categoría "${entidad.categoria}".`
      )
    }
  }

  // Recomendar dos encantamientos que se excluyen entre sí es una contradicción.
  const recomendados = entidad.encantamientosRecomendados ?? []
  for (const uno of recomendados) {
    const nodo = grafo.get(uno)
    if (!nodo) continue
    for (const otro of nodo.entidad.incompatibleCon ?? []) {
      // La incompatibilidad es simétrica, así que el par saldría dos veces.
      // Se informa solo una, en orden alfabético.
      if (recomendados.includes(otro) && uno < otro) {
        error(donde, `Recomienda a la vez "${uno}" y "${otro}", que son incompatibles.`)
      }
    }
  }
}

// Las recetas con forma referencian items desde el mapa "clave", cuyos nombres
// de propiedad son letras del patrón y no una ruta fija.
for (const { entidad, donde } of grafo.values()) {
  if (entidad.tipo !== 'receta') continue

  for (const [letra, item] of Object.entries(entidad.clave ?? {})) {
    if (!grafo.has(item)) {
      error(donde, `La clave "${letra}" del patrón apunta a "${item}", que no existe en el grafo.`)
    }
  }

  const usadas = new Set((entidad.patron ?? []).join('').replace(/ /g, '').split(''))
  for (const letra of usadas) {
    if (!(letra in (entidad.clave ?? {}))) {
      error(donde, `El patrón usa la letra "${letra}" pero no está definida en "clave".`)
    }
  }
  for (const letra of Object.keys(entidad.clave ?? {})) {
    if (!usadas.has(letra)) {
      aviso(donde, `"clave" define la letra "${letra}" pero el patrón no la usa.`)
    }
  }
  if (entidad.conForma === false && !entidad.ingredientes) {
    error(donde, 'Es una receta sin forma, así que necesita "ingredientes".')
  }
  if (entidad.conForma !== false && !entidad.patron) {
    error(donde, 'Es una receta con forma, así que necesita "patron".')
  }
}

// Un mob que aparece en un lugar y un lugar que alberga ese mob son la misma
// relación vista desde dos lados. Si solo se declara en uno, una de las dos
// fichas saldrá incompleta.
for (const { entidad, donde } of grafo.values()) {
  if (entidad.tipo === 'mob') {
    for (const lugar of entidad.apareceEn ?? []) {
      const nodo = grafo.get(lugar)
      if (!nodo) continue
      if (!(nodo.entidad.mobs ?? []).includes(entidad.id)) {
        error(donde, `Dice aparecer en "${lugar}", pero "${lugar}" no lo lista en "mobs".`)
      }
    }
  }

  if (entidad.tipo === 'bioma' || entidad.tipo === 'estructura') {
    for (const mob of entidad.mobs ?? []) {
      const nodo = grafo.get(mob)
      if (!nodo) continue
      if (!(nodo.entidad.apareceEn ?? []).includes(entidad.id)) {
        error(donde, `Lista el mob "${mob}", pero "${mob}" no dice aparecer aquí.`)
      }
    }
  }

  // Lo mismo entre un bioma y las estructuras que contiene.
  if (entidad.tipo === 'bioma') {
    for (const estructura of entidad.contiene ?? []) {
      const nodo = grafo.get(estructura)
      if (!nodo) continue
      if (!(nodo.entidad.apareceEn ?? []).includes(entidad.id)) {
        error(donde, `Dice contener "${estructura}", pero esa estructura no dice generarse aquí.`)
      }
    }
  }
}

// El árbol de pociones se dibuja siguiendo "derivaDe". Un ciclo dejaría al
// generador dando vueltas para siempre.
for (const { entidad, donde } of grafo.values()) {
  if (entidad.tipo !== 'pocion') continue

  const visitadas = new Set([entidad.id])
  let actual = entidad
  while (actual?.derivaDe) {
    if (visitadas.has(actual.derivaDe)) {
      error(donde, `El árbol de fabricación forma un ciclo en "${actual.derivaDe}".`)
      break
    }
    visitadas.add(actual.derivaDe)
    actual = grafo.get(actual.derivaDe)?.entidad
  }

  if (entidad.derivaDe && !entidad.ingrediente) {
    error(donde, 'Deriva de otra poción pero no dice con qué ingrediente. El árbol quedaría cojo.')
  }
}

// ---------------------------------------------------------------------------
// Cobertura de traducción
// ---------------------------------------------------------------------------

const cobertura = []

for (const idioma of idiomas) {
  const esBase = idioma === idiomaBase
  let totalEsperado = 0
  let totalPresente = 0

  for (const modulo of modulos) {
    const ruta = join(DATOS, 'i18n', idioma, `${modulo}.json`)
    const idsDelModulo = [...grafo.values()]
      .filter((e) => e.modulo === modulo)
      .map((e) => e.entidad.id)

    totalEsperado += idsDelModulo.length

    if (!existsSync(ruta)) {
      const mensaje = `Falta el archivo de traducción de "${modulo}" (${idsDelModulo.length} entidades sin traducir).`
      esBase ? error(`data/i18n/${idioma}`, mensaje) : aviso(`data/i18n/${idioma}`, mensaje)
      continue
    }

    const textos = await leerJson(ruta)
    if (!textos) continue

    const donde = `data/i18n/${idioma}/${modulo}.json`
    const slugs = new Map()

    for (const id of idsDelModulo) {
      const entrada = textos[id]
      if (!entrada) {
        const mensaje = `Falta la traducción de "${id}".`
        esBase ? error(donde, mensaje) : aviso(donde, mensaje)
        continue
      }

      const faltantes = CAMPOS_TRADUCCION.filter((c) => !entrada[c])
      if (faltantes.length > 0) {
        error(donde, `"${id}" no tiene ${faltantes.map((f) => `"${f}"`).join(' ni ')}.`)
        continue
      }

      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entrada.slug)) {
        error(donde, `El slug de "${id}" ("${entrada.slug}") debe ir en minúsculas y separado por guiones.`)
      }
      if (slugs.has(entrada.slug)) {
        error(donde, `El slug "${entrada.slug}" lo usan "${slugs.get(entrada.slug)}" y "${id}". Sería la misma URL.`)
      }
      slugs.set(entrada.slug, id)

      totalPresente++
    }

    // Traducciones que ya no corresponden a ninguna entidad.
    for (const clave of Object.keys(textos)) {
      if (!idsDelModulo.includes(clave)) {
        aviso(donde, `"${clave}" no corresponde a ninguna entidad. ¿Se renombró o se borró?`)
      }
    }
  }

  // Textos de interfaz, contrastados contra el idioma base.
  const rutaUi = join(DATOS, 'i18n', idioma, 'ui.json')
  const rutaUiBase = join(DATOS, 'i18n', idiomaBase, 'ui.json')
  if (existsSync(rutaUi) && existsSync(rutaUiBase)) {
    const ui = (await leerJson(rutaUi)) ?? {}
    const uiBase = (await leerJson(rutaUiBase)) ?? {}
    const faltan = Object.keys(uiBase).filter((k) => !(k in ui))
    if (faltan.length > 0 && !esBase) {
      aviso(
        `data/i18n/${idioma}/ui.json`,
        `${faltan.length} textos de interfaz sin traducir: ${faltan.slice(0, 5).join(', ')}${faltan.length > 5 ? '…' : ''}`
      )
    }
  } else if (!existsSync(rutaUi)) {
    const mensaje = 'Falta el archivo de textos de interfaz ui.json.'
    esBase ? error(`data/i18n/${idioma}`, mensaje) : aviso(`data/i18n/${idioma}`, mensaje)
  }

  cobertura.push({ idioma, presente: totalPresente, esperado: totalEsperado })
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

const linea = '-'.repeat(70)

console.log(`\n${linea}\n  Validación del modelo de datos de Wikicraft\n${linea}`)

console.log(`\n  Entidades: ${grafo.size} en ${modulos.length} módulos`)
for (const modulo of modulos) {
  const n = [...grafo.values()].filter((e) => e.modulo === modulo).length
  console.log(`    ${modulo.padEnd(16)} ${n}`)
}

console.log('\n  Cobertura de traducción')
for (const { idioma, presente, esperado } of cobertura) {
  const pct = esperado === 0 ? 100 : Math.round((presente / esperado) * 100)
  const base = idioma === idiomaBase ? '  (idioma base)' : ''
  console.log(`    ${idioma.padEnd(16)} ${presente}/${esperado}  ${String(pct).padStart(3)}%${base}`)
}

const imprimir = (titulo, lista) => {
  if (lista.length === 0) return
  console.log(`\n  ${titulo} (${lista.length})`)
  let ultimoDonde = null
  for (const { donde, mensaje } of lista) {
    if (donde !== ultimoDonde) {
      console.log(`\n    ${donde}`)
      ultimoDonde = donde
    }
    console.log(`      - ${mensaje}`)
  }
}

imprimir('ERRORES', errores)
imprimir('AVISOS', avisos)

console.log(`\n${linea}`)
if (errores.length === 0) {
  console.log(
    avisos.length === 0
      ? '  Todo correcto.\n'
      : `  Sin errores. ${avisos.length} aviso(s) que conviene revisar.\n`
  )
  process.exit(0)
}
console.log(`  ${errores.length} error(es). El modelo no es consistente.\n`)
process.exit(1)
