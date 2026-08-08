#!/usr/bin/env node
/**
 * Importador de minecraft-data a los esquemas de Wikicraft.
 *
 * minecraft-data (MIT) trae la capa mecanica del juego: nombres, durabilidades,
 * recetas, botines, biomas. Lo que NO trae es lo que nos diferencia: las
 * descripciones en lenguaje llano, los consejos, las granjas o las
 * recomendaciones. Esa division es deliberada y guia todo este script.
 *
 * Regla de convivencia con el trabajo a mano:
 *   - Los campos MECANICOS los posee el importador y se sobrescriben en cada
 *     ejecucion. Son datos del juego: si cambian en una version nueva, deben
 *     actualizarse solos.
 *   - Todo lo demas que haya en un archivo existente se respeta intacto. Eso
 *     incluye "etapa", porque es un juicio y no un dato: el importador solo la
 *     adivina para entidades nuevas.
 *
 * Uso:
 *   node scripts/importar.mjs [--version 1.21.4] [--rehacer-etapas]
 */

import minecraftData from 'minecraft-data'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATOS = join(RAIZ, 'data')

const args = process.argv.slice(2)
const leerArg = (nombre, pordefecto) => {
  const i = args.indexOf(`--${nombre}`)
  return i >= 0 ? args[i + 1] : pordefecto
}
const VERSION = leerArg('version', '1.21.4')
const REHACER_ETAPAS = args.includes('--rehacer-etapas')

const mc = minecraftData(VERSION)
if (!mc) {
  console.error(`No hay datos para la version ${VERSION}.`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Etapa de progreso
// Heuristica por nombre. Es un primer pase pensado para corregirse a mano: una
// vez escrita en un archivo, el importador no vuelve a tocarla.
// ---------------------------------------------------------------------------

const REGLAS_ETAPA = [
  [/^(chorus|purpur|end_|elytra|shulker|dragon_)|_end_|ender_dragon|endermite/, 'end'],
  [
    /netherite|nether_|_nether|blaze|ghast|wither|quartz|glowstone|soul_|crimson|warped|magma|piglin|hoglin|strider|basalt|blackstone|ancient_debris|shroomlight|weeping|twisting|gilded/,
    'nether'
  ],
  [/diamond|emerald|obsidian|beacon|enchant|anvil|ender_pearl|ender_eye/, 'diamante'],
  [/iron|gold|copper|redstone|lapis|amethyst|rail|bucket|hopper|piston|observer|shield/, 'hierro']
]

const etapaDe = (nombre) => {
  for (const [patron, etapa] of REGLAS_ETAPA) if (patron.test(nombre)) return etapa
  return 'inicio'
}

// ---------------------------------------------------------------------------
// Variantes de color y de madera
// Minecraft tiene 16 lanas, 16 hormigones y una decena de maderas. Son ruido
// para casi cualquier busqueda, asi que se agrupan bajo su item base.
// ---------------------------------------------------------------------------

const COLORES = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'
]

const MADERAS = [
  'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove',
  'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak'
]

const nombresDeItem = new Set(mc.itemsArray.map((i) => i.name))

const varianteDe = (nombre) => {
  for (const color of COLORES) {
    if (nombre.startsWith(`${color}_`)) {
      const base = nombre.slice(color.length + 1)
      if (nombresDeItem.has(base)) return base
    }
  }
  for (const madera of MADERAS) {
    if (madera === 'oak' || !nombre.startsWith(`${madera}_`)) continue
    const resto = nombre.slice(madera.length + 1)
    if (nombresDeItem.has(`oak_${resto}`)) return `oak_${resto}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Equipo: que items son herramientas o armaduras, y de que material
// ---------------------------------------------------------------------------

const CATEGORIA_EQUIPO = [
  [/_sword$/, 'espada'], [/_axe$/, 'hacha'], [/_pickaxe$/, 'pico'],
  [/_shovel$/, 'pala'], [/_hoe$/, 'azada'], [/_helmet$|^turtle_helmet$/, 'casco'],
  [/_chestplate$/, 'pechera'], [/_leggings$/, 'pantalones'], [/_boots$/, 'botas'],
  [/^bow$/, 'arco'], [/^crossbow$/, 'ballesta'], [/^trident$/, 'tridente'],
  [/^shield$/, 'escudo'], [/^elytra$/, 'elitros'], [/^mace$/, 'maza']
]

const MATERIAL_EQUIPO = [
  [/^wooden_/, 'madera'], [/^stone_/, 'piedra'], [/^iron_/, 'hierro'],
  [/^golden_/, 'oro'], [/^diamond_/, 'diamante'], [/^netherite_/, 'netherita'],
  [/^leather_/, 'cuero'], [/^chainmail_/, 'malla'], [/^turtle_/, 'caparazon']
]

const primerMatch = (tabla, nombre) => tabla.find(([p]) => p.test(nombre))?.[1] ?? null

// ---------------------------------------------------------------------------
// Encantamientos
// ---------------------------------------------------------------------------

/** Categorias de minecraft-data a las familias de equipo de nuestro esquema. */
const EQUIPO_POR_CATEGORIA = {
  sword: ['espada'],
  sharp_weapon: ['espada', 'hacha'],
  weapon: ['espada', 'hacha'],
  fire_aspect: ['espada'],
  mace: ['maza'],
  trident: ['tridente'],
  bow: ['arco'],
  crossbow: ['ballesta'],
  fishing: ['cana'],
  mining: ['pico', 'pala', 'hacha', 'azada'],
  mining_loot: ['pico', 'pala', 'hacha'],
  armor: ['casco', 'pechera', 'pantalones', 'botas'],
  head_armor: ['casco'],
  leg_armor: ['pantalones'],
  foot_armor: ['botas'],
  equippable: ['casco', 'pechera', 'pantalones', 'botas', 'elitros'],
  durability: [
    'espada', 'hacha', 'pico', 'pala', 'azada', 'arco', 'ballesta', 'tridente',
    'maza', 'casco', 'pechera', 'pantalones', 'botas', 'elitros', 'escudo',
    'cana', 'tijeras', 'mechero'
  ],
  vanishing: [
    'espada', 'hacha', 'pico', 'pala', 'azada', 'arco', 'ballesta', 'tridente',
    'maza', 'casco', 'pechera', 'pantalones', 'botas', 'elitros', 'escudo',
    'cana', 'tijeras', 'mechero'
  ]
}

const NUESTRA_CATEGORIA = {
  sword: 'dano', sharp_weapon: 'dano', weapon: 'dano', fire_aspect: 'dano',
  mace: 'dano', trident: 'dano', bow: 'dano', crossbow: 'dano',
  armor: 'proteccion', head_armor: 'proteccion', leg_armor: 'proteccion',
  foot_armor: 'proteccion', equippable: 'proteccion',
  mining: 'recoleccion', mining_loot: 'recoleccion', fishing: 'recoleccion',
  durability: 'utilidad', vanishing: 'utilidad'
}

// ---------------------------------------------------------------------------
// Mobs
// ---------------------------------------------------------------------------

const TIPOS_DE_MOB = ['mob', 'animal', 'ambient', 'hostile', 'water_creature', 'passive']
const JEFES = new Set(['ender_dragon', 'wither'])

const CATEGORIA_MOB = {
  hostile: 'hostil',
  animal: 'pasivo',
  passive: 'pasivo',
  ambient: 'pasivo',
  water_creature: 'pasivo',
  mob: 'neutral'
}

// ---------------------------------------------------------------------------
// Utilidades de escritura
// ---------------------------------------------------------------------------

const leerJson = async (ruta) => {
  if (!existsSync(ruta)) return null
  try {
    return JSON.parse((await readFile(ruta, 'utf8')).replace(/^﻿/, ''))
  } catch {
    return null
  }
}

const escribirJson = async (ruta, valor) => {
  await mkdir(dirname(ruta), { recursive: true })
  await writeFile(ruta, JSON.stringify(valor, null, 2) + '\n', 'utf8')
}

const babosa = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const conteo = { creadas: 0, actualizadas: 0, saltadas: 0 }

/**
 * Escribe una entidad respetando el trabajo a mano: solo los campos mecanicos
 * se sobrescriben; el resto del archivo existente se conserva tal cual.
 */
const guardarEntidad = async (modulo, entidad, mecanicos) => {
  const ruta = join(DATOS, 'entities', modulo, `${entidad.id}.json`)
  const existente = await leerJson(ruta)

  if (!existente) {
    await escribirJson(ruta, entidad)
    conteo.creadas++
    return
  }

  const fusionada = { ...existente }
  for (const campo of mecanicos) {
    if (entidad[campo] === undefined) delete fusionada[campo]
    else fusionada[campo] = entidad[campo]
  }
  if (REHACER_ETAPAS && entidad.etapa) fusionada.etapa = entidad.etapa

  if (JSON.stringify(fusionada) === JSON.stringify(existente)) {
    conteo.saltadas++
    return
  }
  await escribirJson(ruta, fusionada)
  conteo.actualizadas++
}

// ---------------------------------------------------------------------------
// Importacion
// ---------------------------------------------------------------------------

/** modulo -> [{ id, nombreIngles }] para generar despues las traducciones. */
const paraTraducir = {}
const anotar = (modulo, id, nombreIngles) => {
  paraTraducir[modulo] ??= []
  paraTraducir[modulo].push({ id, nombreIngles })
}

const importados = new Set()

// --- Encantamientos --------------------------------------------------------

// Las exclusiones deben ser simetricas; minecraft-data no siempre las declara
// en los dos sentidos y nuestro validador lo exige, con razon.
const exclusiones = new Map()
for (const e of mc.enchantmentsArray) {
  exclusiones.set(e.name, new Set(e.exclude ?? []))
}
for (const [nombre, otros] of exclusiones) {
  for (const otro of otros) exclusiones.get(otro)?.add(nombre)
}

for (const e of mc.enchantmentsArray) {
  const entidad = {
    $schema: '../../schemas/enchantment.schema.json',
    id: e.name,
    tipo: 'encantamiento',
    etapa: etapaDe(e.name),
    relevancia: 'alta',
    nivelMaximo: Math.min(e.maxLevel ?? 1, 5),
    categoria: e.curse ? 'maldicion' : (NUESTRA_CATEGORIA[e.category] ?? 'utilidad'),
    aplicableA: EQUIPO_POR_CATEGORIA[e.category] ?? ['espada'],
    incompatibleCon: [...(exclusiones.get(e.name) ?? [])].sort(),
    esTesoro: Boolean(e.treasureOnly),
    esMaldicion: Boolean(e.curse)
  }
  await guardarEntidad('enchantments', entidad, [
    'nivelMaximo', 'categoria', 'aplicableA', 'incompatibleCon', 'esTesoro',
    'esMaldicion', 'relevancia'
  ])
  anotar('enchantments', e.name, e.displayName)
  importados.add(e.name)
}

// --- Items y equipo --------------------------------------------------------

const esBloque = (nombre) => Boolean(mc.blocksByName?.[nombre])
const esComida = (nombre) => Boolean(mc.foodsByName?.[nombre])

const categoriasDe = (nombre) => {
  const cats = []
  if (esComida(nombre)) cats.push('comida')
  if (esBloque(nombre)) cats.push('bloque')
  if (/_ore$|^raw_|_ingot$|^diamond$|^emerald$|^coal$|^quartz$/.test(nombre)) cats.push('mineral')
  if (/_seeds$|_sapling$|^wheat|_flower$|^flower|_mushroom$/.test(nombre)) cats.push('vegetal')
  if (cats.length === 0) cats.push('material')
  return [...new Set(cats)]
}

/**
 * Que bloque hay que romper para conseguir cada item. Se excluye que un bloque
 * se suelte a si mismo, que no informa de nada, y se recorta la lista: saber
 * que la tierra sale de veinte bloques distintos no ayuda a nadie.
 */
const bloquesQueSueltan = new Map()
for (const { block, drops } of mc.blockLootArray ?? []) {
  for (const { item } of drops ?? []) {
    if (!item || item === block) continue
    bloquesQueSueltan.set(item, (bloquesQueSueltan.get(item) ?? new Set()).add(block))
  }
}

for (const item of mc.itemsArray) {
  const categoria = primerMatch(CATEGORIA_EQUIPO, item.name)
  const esEquipo = Boolean(categoria) && Boolean(item.maxDurability)

  if (esEquipo) {
    const esArmadura = ['casco', 'pechera', 'pantalones', 'botas', 'elitros'].includes(categoria)
    const entidad = {
      $schema: '../../schemas/tool.schema.json',
      id: item.name,
      tipo: esArmadura ? 'armadura' : 'herramienta',
      etapa: etapaDe(item.name),
      relevancia: 'alta',
      categoria,
      material: primerMatch(MATERIAL_EQUIPO, item.name) ?? 'ninguno',
      durabilidad: item.maxDurability,
      reparadoCon: (item.repairWith ?? []).filter((r) => nombresDeItem.has(r))
    }
    await guardarEntidad('tools', entidad, [
      'categoria', 'material', 'durabilidad', 'reparadoCon', 'relevancia'
    ])
    anotar('tools', item.name, item.displayName)
  } else {
    const base = varianteDe(item.name)
    const rompiendo = [...(bloquesQueSueltan.get(item.name) ?? [])]
      .filter((b) => nombresDeItem.has(b))
      .sort()
      .slice(0, 6)

    const entidad = {
      $schema: '../../schemas/item.schema.json',
      id: item.name,
      tipo: 'item',
      etapa: etapaDe(item.name),
      relevancia: base ? 'baja' : 'normal',
      categorias: categoriasDe(item.name),
      pila: [1, 16, 64].includes(item.stackSize) ? item.stackSize : 64,
      ...(base ? { varianteDe: base } : {}),
      ...(rompiendo.length > 0 ? { seObtieneRompiendo: rompiendo } : {})
    }
    await guardarEntidad('items', entidad, [
      'pila',
      'relevancia',
      'varianteDe',
      'seObtieneRompiendo'
    ])
    anotar('items', item.name, item.displayName)
  }
  importados.add(item.name)
}

// --- Mobs ------------------------------------------------------------------

const botinPorMob = new Map(
  (mc.entityLootArray ?? []).map((l) => [l.entity, l.drops ?? []])
)

for (const e of mc.entitiesArray) {
  if (!TIPOS_DE_MOB.includes(e.type)) continue

  // En Minecraft varios nombres designan a la vez un objeto y una criatura:
  // "chicken" es el pollo crudo y tambien el animal. Nuestros identificadores
  // son unicos en todo el grafo, asi que al mob se le anade un sufijo. Solo
  // afecta al identificador interno: el nombre y la URL siguen siendo "chicken",
  // porque el modulo ya los distingue.
  const idMob = importados.has(e.name) ? `${e.name}_mob` : e.name

  const botin = (botinPorMob.get(e.name) ?? [])
    .filter((d) => importados.has(d.item) && (d.stackSizeRange?.[1] ?? 0) >= 1)
    .map((d) => ({
      item: d.item,
      minimo: Math.max(0, d.stackSizeRange?.[0] ?? 0),
      maximo: d.stackSizeRange[1],
      ...(d.dropChance != null && d.dropChance > 0 && d.dropChance <= 1
        ? { probabilidad: d.dropChance }
        : {}),
      ...(d.playerKill ? { soloAlMorirPorJugador: true } : {})
    }))

  const entidad = {
    $schema: '../../schemas/mob.schema.json',
    id: idMob,
    tipo: 'mob',
    etapa: etapaDe(e.name),
    relevancia: e.type === 'hostile' ? 'alta' : 'normal',
    categoria: JEFES.has(e.name) ? 'jefe' : (CATEGORIA_MOB[e.type] ?? 'neutral'),
    ...(botin.length > 0 ? { botin } : {})
  }
  await guardarEntidad('mobs', entidad, ['categoria', 'botin', 'relevancia'])
  anotar('mobs', idMob, e.displayName)
  importados.add(idMob)
}

// --- Biomas ----------------------------------------------------------------

const DIMENSION = { overworld: 'superficie', nether: 'nether', end: 'end' }

for (const b of mc.biomesArray) {
  const dimension = DIMENSION[b.dimension] ?? 'superficie'
  const entidad = {
    $schema: '../../schemas/biome.schema.json',
    id: b.name,
    tipo: 'bioma',
    etapa: dimension === 'nether' ? 'nether' : dimension === 'end' ? 'end' : 'inicio',
    relevancia: 'normal',
    dimension
  }
  await guardarEntidad('biomes', entidad, ['dimension', 'relevancia'])
  anotar('biomes', b.name, b.displayName)
  importados.add(b.name)
}

// --- Recetas ---------------------------------------------------------------

/**
 * Recetas.
 *
 * minecraft-data expande las etiquetas del juego: donde la receta real dice
 * "cualquier tronco", el paquete entrega diecinueve recetas identicas que solo
 * se diferencian en la madera. Presentarlas asi es inutil, asi que aqui se
 * vuelven a plegar en una sola con alternativas por casilla.
 *
 * El plegado solo se aplica cuando TODAS las casillas que varian ofrecen
 * exactamente el mismo juego de alternativas, que es la huella que deja una
 * etiqueta. Si dos recetas comparten forma y resultado por casualidad pero no
 * cumplen eso, se dejan separadas: es preferible mostrar de mas que inventarse
 * una combinacion que el juego no acepta.
 */

const nombrePorId = new Map(mc.itemsArray.map((i) => [i.id, i.name]))
const LETRAS = 'ABCDEFGHI'

const candidatas = []

for (const [idResultado, recetas] of Object.entries(mc.recipes)) {
  const resultado = nombrePorId.get(Number(idResultado))
  if (!resultado || !importados.has(resultado)) continue

  for (const receta of recetas) {
    const cantidad = receta.result?.count ?? 0
    if (cantidad < 1) continue

    if (receta.inShape) {
      const filas = receta.inShape.map((f) =>
        f.map((c) => (c == null ? null : (nombrePorId.get(c) ?? null)))
      )
      const alto = filas.length
      const ancho = Math.max(...filas.map((f) => f.length))
      const celdas = []
      for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) celdas.push(filas[y]?.[x] ?? null)
      }
      const usados = celdas.filter(Boolean)
      if (usados.length === 0 || usados.some((u) => !importados.has(u))) continue

      candidatas.push({
        resultado,
        cantidad,
        conForma: true,
        alto,
        ancho,
        celdas,
        firma: `${resultado}|${cantidad}|f|${alto}x${ancho}|${celdas.map((c) => (c ? 'X' : '.')).join('')}`
      })
    } else if (receta.ingredients) {
      const usados = receta.ingredients.map((c) => nombrePorId.get(c)).filter(Boolean).sort()
      if (usados.length === 0 || usados.some((u) => !importados.has(u))) continue

      candidatas.push({
        resultado,
        cantidad,
        conForma: false,
        celdas: usados,
        firma: `${resultado}|${cantidad}|s|${usados.length}`
      })
    }
  }
}

const porFirma = new Map()
for (const c of candidatas) porFirma.set(c.firma, [...(porFirma.get(c.firma) ?? []), c])

const plegadas = []
let recetasOriginales = candidatas.length

for (const lista of porFirma.values()) {
  const n = lista[0].celdas.length
  const conjuntos = Array.from(
    { length: n },
    (_, i) => new Set(lista.map((c) => c.celdas[i]).filter(Boolean))
  )
  const variables = conjuntos.filter((s) => s.size > 1)

  const huella = (s) => [...s].sort().join(',')
  const plegable =
    lista.length === 1 ||
    variables.length === 0 ||
    variables.every((s) => huella(s) === huella(variables[0]))

  if (plegable) {
    plegadas.push({ ...lista[0], opciones: conjuntos.map((s) => [...s].sort()) })
  } else {
    for (const c of lista) plegadas.push({ ...c, opciones: c.celdas.map((x) => (x ? [x] : [])) })
  }
}

// Los identificadores se numeran solo cuando un mismo objeto conserva varias
// recetas realmente distintas.
const porResultado = new Map()
for (const r of plegadas) porResultado.set(r.resultado, [...(porResultado.get(r.resultado) ?? []), r])

let recetasEscritas = 0

for (const [resultado, lista] of porResultado) {
  for (const [indice, receta] of lista.entries()) {
    const id = lista.length > 1 ? `${resultado}_receta_${indice + 1}` : `${resultado}_receta`

    let campos
    if (receta.conForma) {
      // Cada juego distinto de alternativas recibe su propia letra.
      const claves = new Map()
      for (const opciones of receta.opciones) {
        if (opciones.length === 0) continue
        const huella = opciones.join(',')
        if (!claves.has(huella)) claves.set(huella, { letra: LETRAS[claves.size], opciones })
      }
      if (claves.size === 0 || claves.size > LETRAS.length) continue

      const patron = []
      for (let y = 0; y < receta.alto; y++) {
        let fila = ''
        for (let x = 0; x < receta.ancho; x++) {
          const opciones = receta.opciones[y * receta.ancho + x]
          fila += opciones.length ? claves.get(opciones.join(',')).letra : ' '
        }
        patron.push(fila.replace(/\s+$/, ''))
      }

      campos = {
        conForma: true,
        patron: patron.some((f) => f.length > 0) ? patron : [' '],
        clave: Object.fromEntries([...claves.values()].map((c) => [c.letra, c.opciones])),
        estacion: receta.alto > 2 || receta.ancho > 2 ? 'mesa_de_trabajo' : 'inventario'
      }
    } else {
      const cuenta = new Map()
      for (const opciones of receta.opciones) {
        if (opciones.length === 0) continue
        const huella = opciones.join(',')
        cuenta.set(huella, (cuenta.get(huella) ?? 0) + 1)
      }
      campos = {
        conForma: false,
        ingredientes: [...cuenta].map(([huella, cantidad]) => ({
          opciones: huella.split(','),
          cantidad
        })),
        estacion: receta.celdas.length > 4 ? 'mesa_de_trabajo' : 'inventario'
      }
    }

    const entidad = {
      $schema: '../../schemas/recipe.schema.json',
      id,
      tipo: 'receta',
      etapa: etapaDe(resultado),
      // Las recetas quedan fuera del buscador: siempre se llega a ellas desde
      // la ficha del objeto que producen, y buscar "barca" no deberia devolver
      // la barca y su receta como dos resultados distintos.
      relevancia: 'baja',
      resultado: { item: resultado, cantidad: receta.cantidad },
      ...campos
    }

    await guardarEntidad('recipes', entidad, [
      'estacion', 'resultado', 'conForma', 'patron', 'clave', 'ingredientes', 'relevancia'
    ])

    const nombreResultado = mc.itemsByName[resultado]?.displayName ?? resultado
    anotar(
      'recipes',
      id,
      lista.length > 1 ? `${nombreResultado} Recipe ${indice + 1}` : `${nombreResultado} Recipe`
    )
    recetasEscritas++
  }
}

// ---------------------------------------------------------------------------
// Traducciones al ingles
// minecraft-data trae los nombres en ingles, asi que se vuelcan tal cual. El
// espanol se traduce a mano; hasta entonces la cadena de respaldo cubre el
// hueco y la ficha avisa de que no esta traducida.
// ---------------------------------------------------------------------------

let textosCreados = 0

for (const [modulo, entradas] of Object.entries(paraTraducir)) {
  const ruta = join(DATOS, 'i18n', 'en', `${modulo}.json`)
  const existente = (await leerJson(ruta)) ?? {}
  const slugsUsados = new Set(Object.values(existente).map((e) => e.slug))

  for (const { id, nombreIngles } of entradas) {
    if (existente[id]) continue

    const nombre = nombreIngles ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    let slug = babosa(nombre)
    if (!slug || slugsUsados.has(slug)) slug = babosa(id)
    if (slugsUsados.has(slug)) slug = `${slug}-${slugsUsados.size}`

    slugsUsados.add(slug)
    existente[id] = { nombre, slug }
    textosCreados++
  }

  const ordenado = Object.fromEntries(Object.entries(existente).sort(([a], [b]) => a.localeCompare(b)))
  await escribirJson(ruta, ordenado)
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

const linea = '-'.repeat(70)
console.log(`\n${linea}\n  Importacion desde minecraft-data ${VERSION}\n${linea}\n`)
console.log(`  Entidades creadas       ${conteo.creadas}`)
console.log(`  Entidades actualizadas  ${conteo.actualizadas}`)
console.log(`  Sin cambios             ${conteo.saltadas}`)
console.log(`  Recetas procesadas      ${recetasEscritas} (de ${recetasOriginales} sin plegar)`)
console.log(`  Textos en ingles nuevos ${textosCreados}`)
console.log(`\n  El espanol se traduce a mano. Mientras tanto las fichas caen`)
console.log(`  al ingles y lo avisan. Ejecuta "npm run validar" para ver la`)
console.log(`  cobertura por idioma.\n`)
