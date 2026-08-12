/**
 * Capa de datos de Wikicraft.
 *
 * Todo esto se ejecuta en tiempo de build, nunca en el navegador: carga el
 * grafo completo, resuelve las relaciones en ambos sentidos y deja las paginas
 * listas para pintarse. Lo que llega al usuario es HTML ya renderizado.
 *
 * La pieza clave es el indice inverso. Guardar que una espada recomienda
 * Reparacion es facil; lo que hace util la wiki es poder responder, desde la
 * ficha de Reparacion, en que equipo se recomienda. Ese indice se construye
 * una vez recorriendo el mapa de data/relaciones.json, sin codigo por tipo.
 */

import locales from '../../data/locales.json'
import relaciones from '../../data/relaciones.json'

const entidadesRaw = import.meta.glob('../../data/entities/*/*.json', {
  eager: true,
  import: 'default'
})

const textosRaw = import.meta.glob('../../data/i18n/*/*.json', {
  eager: true,
  import: 'default'
})

// ---------------------------------------------------------------------------
// Configuracion de idiomas
// ---------------------------------------------------------------------------

export const idiomaBase = locales.base
export const idiomas = locales.idiomas
export const codigosIdioma = locales.idiomas.map((i) => i.codigo)
export const modulos = locales.modulos

/**
 * Los que salen en el menu y en la portada.
 *
 * Un modulo oculto sigue existiendo entero: se generan sus paginas, se indexa
 * en el buscador y se llega a el desde cualquier ficha que lo mencione. Lo
 * unico que pierde es el sitio en el menu, que es un recurso escaso y no se le
 * regala a un modulo con una sola entidad dentro.
 */
export const modulosVisibles = modulos.filter(
  (m) => !(locales.modulosOcultos ?? []).includes(m)
)

const respaldoDe = Object.fromEntries(locales.idiomas.map((i) => [i.codigo, i.respaldo]))

/** Cadena de idiomas a probar, del preferido al ultimo recurso. */
const cadenaDeRespaldo = (idioma) => {
  const cadena = []
  let actual = idioma
  while (actual && !cadena.includes(actual)) {
    cadena.push(actual)
    actual = respaldoDe[actual]
  }
  if (!cadena.includes(idiomaBase)) cadena.push(idiomaBase)
  return cadena
}

// ---------------------------------------------------------------------------
// Grafo
// ---------------------------------------------------------------------------

/** id -> { entidad, modulo } */
export const grafo = new Map()

for (const [ruta, entidad] of Object.entries(entidadesRaw)) {
  const modulo = ruta.split('/').at(-2)
  grafo.set(entidad.id, { entidad, modulo })
}

export const entidades = [...grafo.values()]

export const entidadesDe = (modulo) => entidades.filter((e) => e.modulo === modulo)

// ---------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------

/** idioma -> modulo -> id -> textos */
const textos = {}
/** idioma -> clave -> texto de interfaz */
const textosUi = {}

for (const [ruta, contenido] of Object.entries(textosRaw)) {
  const partes = ruta.split('/')
  const idioma = partes.at(-2)
  const modulo = partes.at(-1).replace('.json', '')

  if (modulo === 'ui') {
    textosUi[idioma] = contenido
  } else {
    textos[idioma] ??= {}
    textos[idioma][modulo] = contenido
  }
}

/**
 * Texto de una entidad en un idioma. Si falta, cae al idioma de respaldo y lo
 * marca, para que la interfaz pueda avisar en vez de fingir que esta traducido.
 */
export const t = (idioma, id) => {
  const nodo = grafo.get(id)
  if (!nodo) return null

  for (const candidato of cadenaDeRespaldo(idioma)) {
    const entrada = textos[candidato]?.[nodo.modulo]?.[id]
    if (entrada) {
      return { ...entrada, idiomaUsado: candidato, traducido: candidato === idioma }
    }
  }
  return { nombre: id, slug: id, idiomaUsado: null, traducido: false }
}

/** Texto de interfaz. Acepta sustituciones tipo {n}. */
export const ui = (idioma, clave, sustituciones = {}) => {
  let texto = clave
  for (const candidato of cadenaDeRespaldo(idioma)) {
    if (textosUi[candidato]?.[clave] != null) {
      texto = textosUi[candidato][clave]
      break
    }
  }
  for (const [nombre, valor] of Object.entries(sustituciones)) {
    texto = texto.replaceAll(`{${nombre}}`, valor)
  }
  return texto
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

/** Segmento de URL de un modulo, traducido: /es/encantamientos, /en/enchantments. */
export const rutaModulo = (idioma, modulo) => ui(idioma, `ruta.${modulo}`)

/**
 * La calculadora no es un modulo, asi que su ruta no sale de los datos: la fija
 * el nombre del archivo en src/pages y por eso es igual en todos los idiomas.
 * Vive aqui, y no en las traducciones, para que nadie la traduzca sin darse
 * cuenta y deje los enlaces apuntando a una pagina que no existe.
 */
export const RUTA_ENCANTADOR = 'encantador'

export const rutaDe = (idioma, id) => {
  const nodo = grafo.get(id)
  if (!nodo) return null
  return `/${idioma}/${rutaModulo(idioma, nodo.modulo)}/${t(idioma, id).slug}/`
}

// ---------------------------------------------------------------------------
// Relaciones
// ---------------------------------------------------------------------------

const trocear = (ruta) =>
  ruta
    .replace(/\[\]/g, '.[].')
    .replace(/\{\}/g, '.{}.')
    .split('.')
    .filter(Boolean)

const recolectar = (valor, segmentos) => {
  if (valor == null) return []
  if (segmentos.length === 0) return [valor]

  const [actual, ...resto] = segmentos
  if (actual === '[]') {
    return Array.isArray(valor) ? valor.flatMap((v) => recolectar(v, resto)) : []
  }
  if (actual === '{}') {
    return typeof valor === 'object' ? Object.values(valor).flatMap((v) => recolectar(v, resto)) : []
  }
  return recolectar(valor[actual], resto)
}

/** id -> [{ etiqueta, ids }] con lo que esta entidad apunta. */
const directas = new Map()
/** id -> Map(etiqueta -> Set(ids)) con lo que apunta a esta entidad. */
const inversasCrudas = new Map()

for (const { entidad } of entidades) {
  const grupos = []

  for (const { campo, etiqueta, inversa } of relaciones[entidad.tipo] ?? []) {
    const encontrados = [...new Set(recolectar(entidad, trocear(campo)))].filter((id) =>
      grafo.has(id)
    )
    if (encontrados.length === 0) continue

    const yaExiste = grupos.find((g) => g.etiqueta === etiqueta)
    if (yaExiste) {
      yaExiste.ids = [...new Set([...yaExiste.ids, ...encontrados])]
    } else {
      grupos.push({ etiqueta, ids: encontrados })
    }

    for (const destino of encontrados) {
      if (destino === entidad.id) continue
      inversasCrudas.set(destino, inversasCrudas.get(destino) ?? new Map())
      const porEtiqueta = inversasCrudas.get(destino)
      porEtiqueta.set(inversa, porEtiqueta.get(inversa) ?? new Set())
      porEtiqueta.get(inversa).add(entidad.id)
    }
  }

  directas.set(entidad.id, grupos)
}

/**
 * Encantamientos aplicables a una pieza de equipo. No se guarda en los datos:
 * se deriva cruzando la categoria del equipo con el campo aplicableA de cada
 * encantamiento, para que no haya dos listas que mantener sincronizadas.
 */
export const encantamientosCompatibles = (id) => {
  const nodo = grafo.get(id)
  if (!nodo || !['herramienta', 'armadura'].includes(nodo.entidad.tipo)) return []

  return entidades
    .filter(
      (e) =>
        e.entidad.tipo === 'encantamiento' &&
        (e.entidad.aplicableA ?? []).includes(nodo.entidad.categoria)
    )
    .map((e) => e.entidad.id)
}

/**
 * Todas las conexiones de una entidad, en un solo objeto listo para pintar.
 * Es lo que convierte una ficha en un nodo navegable en vez de una pagina
 * suelta: el usuario nunca tiene que volver al buscador.
 */
export const relacionesDe = (id) => {
  const grupos = [...(directas.get(id) ?? [])]

  for (const [etiqueta, ids] of inversasCrudas.get(id) ?? []) {
    const yaExiste = grupos.find((g) => g.etiqueta === etiqueta)
    if (yaExiste) {
      yaExiste.ids = [...new Set([...yaExiste.ids, ...ids])]
    } else {
      grupos.push({ etiqueta, ids: [...ids] })
    }
  }

  const compatibles = encantamientosCompatibles(id)
  if (compatibles.length > 0) {
    grupos.push({ etiqueta: 'rel.encantamientosCompatibles', ids: compatibles })
  }

  return grupos.filter((g) => g.ids.length > 0)
}

// ---------------------------------------------------------------------------
// Facetas
// Cada modulo tiene un campo que sirve para clasificar de un vistazo: la
// categoria de un objeto, la dimension de un bioma, si un mob es hostil. Es lo
// que convierte una tarjeta con solo un nombre en algo que dice algo.
// ---------------------------------------------------------------------------

const FACETAS_POR_MODULO = {
  items: (e) => e.categorias ?? [],
  tools: (e) => [e.categoria, e.material],
  enchantments: (e) => [e.categoria],
  mobs: (e) => [e.categoria, ...(e.dimension ?? [])],
  structures: (e) => [...(e.dimension ?? []), e.comoSeEncuentra],
  biomes: (e) => [e.dimension, e.tipo === 'estructura' ? 'estructura' : null],
  /**
   * Por caracter y no por efecto.
   *
   * Estaba puesto el efecto, que es distinto en cada pocion: dieciseis
   * categorias de una pocion cada una. Un filtro que solo puede darte un
   * resultado no es un filtro, es un indice con otro nombre y ocupando tres
   * veces mas.
   *
   * Lo que si se pregunta al mirar la lista es si una pocion ayuda o fastidia,
   * porque de eso depende si te la bebes o se la lanzas a otro. El dato ya
   * estaba en las fichas, sin usar.
   */
  potions: (e) => [
    e.presentacion,
    e.efecto === 'ninguno' || !e.efecto ? 'sin_efecto' : e.beneficiosa ? 'buena' : 'mala'
  ],
  recipes: (e) => [e.estacion],
  farms: (e) => [e.dificultad],
  villagers: () => []
}

export const facetasDe = ({ entidad, modulo }) =>
  (FACETAS_POR_MODULO[modulo]?.(entidad) ?? []).filter(Boolean)

/**
 * Familias de faceta que merecen su propio filtro en vez de ir todas revueltas
 * en una fila.
 *
 * Sin esto, la lista de mobs ofrecia "No te ataca | Te ataca | Solo si lo
 * molestas | Superficie | Nether | End" seguidas, como si fueran alternativas
 * entre si, y ademas solo dejaba elegir una. Separadas se pueden cruzar, que es
 * donde esta la pregunta de verdad: que me ataca en el Nether.
 *
 * Lo que no pertenece a ninguna familia se queda en el grupo por defecto, asi
 * que anadir una familia no obliga a repasar los nueve modulos.
 */
const FAMILIAS_FACETA = {
  caracter: ['buena', 'mala', 'sin_efecto'],
  dimension: ['superficie', 'nether', 'end'],
  material: [
    'madera',
    'piedra',
    'hierro',
    'oro',
    'diamante',
    'netherita',
    'cuero',
    'malla',
    'caparazon',
    'ninguno'
  ],
  busqueda: [
    'explorando',
    'bajo_tierra',
    'bajo_el_agua',
    'mapa_de_aldeano',
    'brujula',
    'ojo_de_ender'
  ]
}

export const familiaFaceta = (clave) =>
  Object.keys(FAMILIAS_FACETA).find((familia) => FAMILIAS_FACETA[familia].includes(clave)) ??
  'general'

/** Ordena las facetas de una pagina en grupos listos para pintar. */
export const gruposFaceta = (facetas) => {
  const orden = [...Object.keys(FAMILIAS_FACETA), 'general']
  return orden
    .map((familia) => ({
      familia,
      facetas: facetas.filter(({ clave }) => familiaFaceta(clave) === familia)
    }))
    .filter((g) => g.facetas.length > 1)
}

/**
 * Entidades hermanas: las que comparten el final de su identificador. Un
 * abanico de coral de burbuja encuentra asi los demas abanices de coral, y una
 * lana roja las otras quince lanas.
 *
 * Se prueba primero el sufijo mas largo, que es el mas especifico. Sale gratis
 * porque los identificadores de Minecraft ya estan construidos asi, y evita
 * tener que declarar a mano a que familia pertenece cada una de las 3.151
 * entidades.
 */
export const familiaDe = (id, limite = 8) => {
  const nodo = grafo.get(id)
  if (!nodo) return []

  const partes = id.split('_')
  for (let n = Math.min(3, partes.length - 1); n >= 1; n--) {
    const sufijo = `_${partes.slice(-n).join('_')}`
    const hermanas = entidades.filter(
      (e) => e.modulo === nodo.modulo && e.entidad.id !== id && e.entidad.id.endsWith(sufijo)
    )
    if (hermanas.length >= 2) return hermanas.slice(0, limite).map((e) => e.entidad.id)
  }
  return []
}
// ---------------------------------------------------------------------------
// Como se consigue
// La pregunta que mas se hace quien juega no es "que es esto" sino "de donde lo
// saco". No es un dato que haya que escribir: ya esta en el grafo, repartido
// entre recetas, botines, comercios y bloques. Aqui se junta.
// ---------------------------------------------------------------------------

const ESTACIONES_DE_FUEGO = ['horno', 'alto_horno', 'ahumador', 'fogata']

/** Lo unico que no se deduce del grafo: la pesca no esta en los datos. */
const SE_PESCA = [
  'cod', 'salmon', 'tropical_fish', 'pufferfish', 'ink_sac', 'bone', 'string',
  'leather', 'leather_boots', 'rotten_flesh', 'stick', 'bowl', 'lily_pad',
  'tripwire_hook', 'nautilus_shell', 'saddle', 'name_tag', 'enchanted_book',
  'fishing_rod', 'bow'
]

const metodos = new Map()
const anotarMetodo = (id, metodo) => {
  if (!id || !grafo.has(id)) return
  if (!metodos.has(id)) metodos.set(id, new Set())
  metodos.get(id).add(metodo)
}

for (const { entidad, modulo } of entidades) {
  if (modulo === 'recipes' && entidad.resultado) {
    anotarMetodo(
      entidad.resultado.item,
      ESTACIONES_DE_FUEGO.includes(entidad.estacion) ? 'fundir' : 'fabricar'
    )
  }
  if (modulo === 'mobs') {
    for (const b of entidad.botin ?? []) anotarMetodo(b.item, 'matar')
  }
  if (modulo === 'villagers') {
    for (const nivel of entidad.niveles ?? []) {
      for (const trato of nivel.tradeos) {
        anotarMetodo(trato.entrega.encantamiento ?? trato.entrega.item, 'comerciar')
      }
    }
  }
  if (modulo === 'biomes') {
    for (const r of [...(entidad.recursos ?? []), ...(entidad.botin ?? []), ...(entidad.exclusivo ?? [])]) {
      anotarMetodo(r, 'explorar')
    }
  }
  // Un bloque se consigue rompiendolo, sin mas. "seObtieneRompiendo" solo
  // recoge los casos en que sale OTRA cosa, como el diamante de su mena.
  if (entidad.seObtieneRompiendo?.length > 0) anotarMetodo(entidad.id, 'romper')
  if (modulo === 'items' && (entidad.categorias ?? []).includes('bloque')) {
    anotarMetodo(entidad.id, 'romper')
  }
}

for (const id of SE_PESCA) anotarMetodo(id, 'pescar')

/** Formas conocidas de conseguir algo, en orden de utilidad practica. */
const ORDEN_METODOS = ['fabricar', 'romper', 'matar', 'comerciar', 'fundir', 'pescar', 'explorar']

export const comoSeConsigue = (id) =>
  ORDEN_METODOS.filter((m) => metodos.get(id)?.has(m))

/**
 * Nombre corto para un conjunto de alternativas de una receta.
 *
 * Si las diecinueve opciones de una casilla terminan todas en "_log", esa
 * casilla admite "cualquier tronco". Devuelve el sufijo comun para que la
 * interfaz busque su etiqueta; null si no comparten ninguno.
 */

/**
 * Conjuntos de finales que en realidad son una sola cosa. Un tronco, una madera
 * y un tallo del Nether no comparten sufijo, pero para una receta son lo mismo.
 */
const FAMILIAS_SUFIJO = {
  madera: ['log', 'wood', 'stem', 'hyphae'],
  piedra: ['stone', 'cobblestone', 'andesite', 'diorite', 'granite', 'deepslate', 'tuff'],
  flor: ['flower', 'tulip', 'orchid', 'allium', 'poppy', 'dandelion', 'bluet', 'daisy', 'cornflower'],
  carbon: ['coal', 'charcoal']
}

export const grupoDe = (ids) => {
  if (!ids || ids.length <= 1) return null

  const partes = ids[0].split('_')
  for (let n = Math.min(3, partes.length); n >= 1; n--) {
    const sufijo = partes.slice(-n).join('_')
    if (ids.every((id) => id === sufijo || id.endsWith(`_${sufijo}`))) return sufijo
  }

  for (const [familia, sufijos] of Object.entries(FAMILIAS_SUFIJO)) {
    const cubre = (id) => sufijos.some((s) => id === s || id.endsWith(`_${s}`))
    if (ids.every(cubre)) return familia
  }

  return null
}

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------

/** Quita acentos y pasa a minusculas, para que "pocion" encuentre "poción". */
export const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Indice que se envia al navegador.
 *
 * Se queda fuera todo lo marcado como relevancia baja: las variantes de color y
 * de madera, y las recetas. No es solo por peso; es que mejora los resultados.
 * Buscar "puerta" devolviendo doce maderas casi identicas es peor que devolver
 * la puerta base, cuya ficha lista sus variantes. Esas paginas siguen
 * existiendo y siguen siendo accesibles desde su ficha base y desde Google.
 *
 * El formato es corto a proposito: la URL se reconstruye en el navegador a
 * partir del modulo y el slug en vez de repetir el prefijo en cada entrada.
 */
export const indiceBusqueda = (idioma) => ({
  rutas: Object.fromEntries(modulos.map((m) => [m, rutaModulo(idioma, m)])),
  nombres: Object.fromEntries(modulos.map((m) => [m, ui(idioma, `nav.${m}`)])),
  idioma,
  entradas: entidades
    .filter(({ entidad }) => entidad.relevancia !== 'baja')
    .map(({ entidad, modulo }) => {
      const texto = t(idioma, entidad.id)
      const nombreNormalizado = normalizar(texto.nombre)

      // Terminos extra por los que tambien se puede encontrar. Se omite lo que
      // ya esta en el nombre: repetirlo solo engorda la descarga.
      const extra = [...new Set([entidad.id, ...(entidad.etiquetas ?? [])])]
        .map(normalizar)
        .filter((termino) => termino && !nombreNormalizado.includes(termino))
        .join(' ')

      return {
        n: texto.nombre,
        s: texto.slug,
        m: modulo,
        e: entidad.etapa,
        ...(extra ? { b: extra } : {})
      }
    })
})
