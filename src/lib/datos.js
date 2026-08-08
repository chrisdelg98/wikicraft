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
  mobs: (e) => [e.categoria],
  biomes: (e) => [e.dimension, e.tipo === 'estructura' ? 'estructura' : null],
  potions: (e) => [e.presentacion, e.efecto !== 'ninguno' ? e.efecto : null],
  recipes: (e) => [e.estacion],
  farms: (e) => [e.dificultad],
  villagers: () => []
}

export const facetasDe = ({ entidad, modulo }) =>
  (FACETAS_POR_MODULO[modulo]?.(entidad) ?? []).filter(Boolean)

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
