/**
 * Lo que las paginas de tintes y telar sacan del grafo. Solo se ejecuta en el
 * build: importa datos.js, que no debe llegar nunca al navegador.
 *
 * Que mezcla da que tinte no se escribe a mano en ningun sitio: se lee de las
 * recetas. Si una version nueva del juego cambia una mezcla, el importador
 * actualiza la receta y el mezclador cambia solo.
 */
import { grafo, entidadesDe, t, ui, rutaDe } from './datos.js'
import { COLORES, PATRONES, tinte, estandarte, claveMezcla } from './tintes.js'

const COLOR_DE_TINTE = Object.fromEntries(COLORES.map((c) => [tinte(c.id), c.id]))

/**
 * Lo que se funde en el horno para sacar un tinte. Es lo unico escrito a mano:
 * el importador no trae las recetas de horno, y sin esto el verde pareceria no
 * salir de ninguna parte.
 */
const SE_FUNDE = {
  green_dye: ['cactus'],
  lime_dye: ['sea_pickle']
}

// El grafo es la unica red: si un identificador de aqui no existe, la pagina
// enlazaria a la nada. Mejor que el build se pare.
const comprobar = (id, donde) => {
  if (!grafo.has(id)) throw new Error(`tintes: "${id}" no existe en el grafo (${donde})`)
}
for (const c of COLORES) {
  comprobar(tinte(c.id), 'COLORES')
  comprobar(estandarte(c.id), 'COLORES')
  comprobar(`${c.id}_wool`, 'COLORES')
}
for (const p of PATRONES) if (p.item) comprobar(p.item, `patron ${p.id}`)
for (const [id, fuentes] of Object.entries(SE_FUNDE)) {
  comprobar(id, 'SE_FUNDE')
  fuentes.forEach((f) => comprobar(f, 'SE_FUNDE'))
}
comprobar('loom', 'telar')

const recetasDeTinte = entidadesDe('recipes')
  .map(({ entidad }) => entidad)
  .filter((r) => r.resultado?.item in COLOR_DE_TINTE && r.ingredientes?.length > 0)

const soloTintes = (r) =>
  r.ingredientes.every((i) => i.opciones.length === 1 && i.opciones[0] in COLOR_DE_TINTE)

/** Las mezclas: recetas cuyos ingredientes son todos tintes. */
export const mezclas = recetasDeTinte.filter(soloTintes).map((r) => {
  const colores = r.ingredientes.flatMap((i) =>
    Array.from({ length: i.cantidad ?? 1 }, () => COLOR_DE_TINTE[i.opciones[0]])
  )
  return {
    receta: r.id,
    color: COLOR_DE_TINTE[r.resultado.item],
    cantidad: r.resultado.cantidad ?? 1,
    colores: [...colores].sort(),
    clave: claveMezcla(colores)
  }
})

/** De donde sale cada tinte sin mezclar: flores, plantas y objetos. */
export const fuentes = Object.fromEntries(
  COLORES.map(({ id: color }) => {
    const ids = recetasDeTinte
      .filter((r) => COLOR_DE_TINTE[r.resultado.item] === color && !soloTintes(r))
      .flatMap((r) => r.ingredientes.flatMap((i) => i.opciones))
    return [
      color,
      {
        fabricando: [...new Set(ids)],
        fundiendo: SE_FUNDE[tinte(color)] ?? []
      }
    ]
  })
)

/**
 * Textos y enlaces que el disenador de estandartes usa en el navegador. Es lo
 * minimo: los dieciseis tintes, estandartes y lanas, los patrones y el telar.
 */
export const textosTelar = (idioma) => {
  const ids = [
    ...COLORES.flatMap((c) => [tinte(c.id), estandarte(c.id), `${c.id}_wool`]),
    ...PATRONES.map((p) => p.item).filter(Boolean),
    'loom'
  ]
  return {
    nombre: Object.fromEntries(ids.map((id) => [id, t(idioma, id).nombre])),
    url: Object.fromEntries(ids.map((id) => [id, rutaDe(idioma, id)])),
    patron: Object.fromEntries(PATRONES.map((p) => [p.id, ui(idioma, `telar.patron.${p.id}`)])),
    ui: Object.fromEntries(
      [
        'lana',
        'capas',
        'noSeGasta',
        'pasoBase',
        'pasoCapa',
        'pasoCapaItem',
        'pasoFinal',
        'pasoSinCapas',
        'quitar',
        'subir',
        'bajar',
        'lleno',
        'copiado'
      ].map((k) => [k, ui(idioma, `telar.${k}`)])
    )
  }
}
