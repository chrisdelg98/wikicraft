/**
 * Motor del yunque: coste de una operacion y busqueda de la ruta mas barata.
 *
 * La formula, para Java Edition, es mas corta de lo que suele contarse:
 *
 *   coste = suma(nivel resultante x multiplicador) de lo que se transfiere
 *         + (2^trabajos del destino    - 1)
 *         + (2^trabajos del sacrificio - 1)
 *
 * y el resultado queda con max(trabajos de ambos) + 1. No hay ningun termino
 * mas: el "coste de combinacion" del que hablan algunas guias solo aparece al
 * reparar con materiales o fusionar dos piezas danadas, y el de renombrar solo
 * si renombras. Verificado contra operaciones reales del juego en
 * data/pruebas/yunque.json.
 *
 * Buscar la ruta optima es elegir en que orden y en que parejas se combinan los
 * libros. La fuerza bruta se dispara enseguida, asi que se resuelve con
 * programacion dinamica sobre subconjuntos: para cada grupo de libros se guarda
 * lo que cuesta tenerlos ya unidos en uno solo, y ese resultado se reutiliza en
 * todas las rutas que lo contengan. El coste pasa de factorial a 3^n, que con
 * ocho libros son unos miles de estados: milisegundos en un movil.
 */

/** Penalizacion por trabajo previo: cada paso por el yunque dobla el recargo. */
export const penalizacion = (trabajos) => 2 ** trabajos - 1

/** En supervivencia el yunque rechaza cualquier operacion desde este coste. */
export const DEMASIADO_CARO = 40

/**
 * Une el sacrificio sobre el destino. Devuelve null si la operacion no aporta
 * nada o si el juego la rechazaria por cara.
 *
 * `tabla` es { id: { libro, nivelMaximo, incompatibleCon } }.
 */
export const unir = (destino, sacrificio, tabla, limite = DEMASIADO_CARO) => {
  const ench = { ...destino.ench }
  let coste = 0
  let aporta = false

  for (const [id, nivel] of Object.entries(sacrificio.ench)) {
    const datos = tabla[id]
    if (!datos || datos.libro == null) return null

    // Un encantamiento que choca con algo que ya lleva la pieza no se pega, y
    // en Java tampoco se cobra.
    const choca = (datos.incompatibleCon ?? []).some((otro) => ench[otro] != null)
    if (choca) continue

    const actual = ench[id]
    let resultante
    if (actual == null) resultante = nivel
    else if (actual === nivel) resultante = Math.min(nivel + 1, datos.nivelMaximo ?? nivel + 1)
    else resultante = Math.max(actual, nivel)

    if (resultante !== actual) aporta = true
    ench[id] = resultante
    coste += resultante * datos.libro
  }

  if (!aporta) return null

  coste += penalizacion(destino.trabajos) + penalizacion(sacrificio.trabajos)
  if (coste >= limite) return null

  return {
    coste,
    resultado: { ench, trabajos: Math.max(destino.trabajos, sacrificio.trabajos) + 1 }
  }
}

/**
 * Frente de Pareto: se guarda una opcion solo si ninguna otra es a la vez igual
 * o mas barata Y con igual o menos trabajo previo. La mas barata de ahora puede
 * salir cara despues si arrastra mas penalizacion, asi que no basta con guardar
 * el minimo coste.
 */
const añadir = (lista, candidato) => {
  for (const otro of lista) {
    if (otro.coste <= candidato.coste && otro.estado.trabajos <= candidato.estado.trabajos) return
  }
  const filtrada = lista.filter(
    (otro) => !(candidato.coste <= otro.coste && candidato.estado.trabajos <= otro.estado.trabajos)
  )
  filtrada.push(candidato)
  lista.length = 0
  lista.push(...filtrada)
}

const subconjuntosDe = function* (mascara) {
  for (let sub = (mascara - 1) & mascara; sub > 0; sub = (sub - 1) & mascara) yield sub
}

/**
 * Ruta mas barata para dejar el objeto con todos los libros aplicados.
 *
 * Limitacion conocida: se asume un libro por encantamiento. Con dos libros del
 * mismo encantamiento el nivel resultante depende del orden, y el subconjunto
 * dejaria de determinar el estado. Eso llega con la funcion de "los libros que
 * ya tienes".
 */
export const optimizar = (objeto, libros, tabla, limite = DEMASIADO_CARO) => {
  const n = libros.length
  if (n === 0) return { coste: 0, pasos: [], resultado: objeto }
  if (n > 12) throw new Error('Demasiados libros para calcular la ruta.')

  const sinDato = libros
    .flatMap((l) => Object.keys(l.ench))
    .filter((id) => tabla[id]?.libro == null)
  if (sinDato.length > 0) return { imposible: 'sinDato', encantamientos: [...new Set(sinDato)] }

  const total = 1 << n

  // Lo que cuesta tener un grupo de libros ya unidos en uno solo.
  const comoLibro = Array.from({ length: total }, () => [])
  for (let i = 0; i < n; i++) {
    comoLibro[1 << i].push({
      coste: 0,
      estado: { ench: { ...libros[i].ench }, trabajos: 0 },
      pasos: []
    })
  }

  for (let mascara = 1; mascara < total; mascara++) {
    if ((mascara & (mascara - 1)) === 0) continue
    for (const sub of subconjuntosDe(mascara)) {
      const resto = mascara ^ sub
      if (sub > resto) continue
      for (const [A, B] of [[sub, resto], [resto, sub]]) {
        for (const a of comoLibro[A]) {
          for (const b of comoLibro[B]) {
            const r = unir(a.estado, b.estado, tabla, limite)
            if (!r) continue
            añadir(comoLibro[mascara], {
              coste: a.coste + b.coste + r.coste,
              estado: r.resultado,
              pasos: [...a.pasos, ...b.pasos, { tipo: 'libros', de: A, con: B, coste: r.coste }]
            })
          }
        }
      }
    }
  }

  // Y ahora el objeto recibiendo grupos de libros, uno tras otro.
  const enObjeto = Array.from({ length: total }, () => [])
  enObjeto[0].push({ coste: 0, estado: objeto, pasos: [] })

  for (let mascara = 1; mascara < total; mascara++) {
    for (let sub = mascara; sub > 0; sub = (sub - 1) & mascara) {
      const previo = mascara ^ sub
      for (const p of enObjeto[previo]) {
        for (const l of comoLibro[sub]) {
          const r = unir(p.estado, l.estado, tabla, limite)
          if (!r) continue
          añadir(enObjeto[mascara], {
            coste: p.coste + l.coste + r.coste,
            estado: r.resultado,
            pasos: [...p.pasos, ...l.pasos, { tipo: 'objeto', con: sub, coste: r.coste }]
          })
        }
      }
    }
  }

  const finales = enObjeto[total - 1]
  if (finales.length === 0) return { imposible: 'demasiadoCaro' }

  const mejor = finales.reduce((a, b) => (b.coste < a.coste ? b : a))
  return { coste: mejor.coste, pasos: mejor.pasos, resultado: mejor.estado }
}
