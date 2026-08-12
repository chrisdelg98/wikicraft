/**
 * Iconos de los modulos, dibujados como pixel art.
 *
 * Se definen como mapas de bits en texto porque asi se leen y se editan igual
 * que se ven. Cada caracter es un pixel de una rejilla de 12x12:
 *   '#' trazo principal, '+' detalle en color de acento, '.' vacio.
 *
 * Son iconos de CATEGORIA, no de cada objeto del juego. Poner un icono a cada
 * una de las 3.141 entidades exigiria las texturas de Mojang, que no son
 * nuestras; estos nueve son dibujo propio y por eso se pueden usar sin dudas.
 */

export const MAPAS = {
  items: [
    '............',
    '............',
    '.##########.',
    '.#++++++++#.',
    '.#++++++++#.',
    '.####..####.',
    '.#...##...#.',
    '.#........#.',
    '.#........#.',
    '.##########.',
    '............',
    '............'
  ],

  enchantments: [
    '............',
    '...+........',
    '..+++.......',
    '...+........',
    '..########..',
    '..#......#..',
    '..#.####.#..',
    '..#......#..',
    '..#.####.#..',
    '..########..',
    '............',
    '............'
  ],

  tools: [
    '............',
    '.##......##.',
    '..##....##..',
    '...######...',
    '.....++.....',
    '.....++.....',
    '.....++.....',
    '.....++.....',
    '.....++.....',
    '.....++.....',
    '............',
    '............'
  ],

  villagers: [
    '............',
    '..########..',
    '.#........#.',
    '.#.##..##.#.',
    '.#........#.',
    '.#...++...#.',
    '.#...++...#.',
    '.#...++...#.',
    '.#........#.',
    '..########..',
    '............',
    '............'
  ],

  mobs: [
    '............',
    '.##########.',
    '.#........#.',
    '.#.++..++.#.',
    '.#.++..++.#.',
    '.#........#.',
    '.#..++++..#.',
    '.#.++..++.#.',
    '.#........#.',
    '.##########.',
    '............',
    '............'
  ],

  potions: [
    '............',
    '....####....',
    '....#..#....',
    '....#..#....',
    '...#....#...',
    '..#......#..',
    '..#.++++.#..',
    '..#.++++.#..',
    '..#.++++.#..',
    '...######...',
    '............',
    '............'
  ],

  recipes: [
    '............',
    '.##########.',
    '.#..#..#..#.',
    '.#..#..#..#.',
    '.##########.',
    '.#..#..#..#.',
    '.#..#..#..#.',
    '.##########.',
    '.#..#..#..#.',
    '.#..#..#..#.',
    '.##########.',
    '............'
  ],

  // Una torre con almenas y una puerta: es la silueta que casi todo el mundo
  // dibuja cuando piensa en "sitio al que ir a saquear".
  structures: [
    '............',
    '..#.##.##.#.',
    '..########..',
    '..########..',
    '..#.####.#..',
    '..########..',
    '..###..###..',
    '..##.++.##..',
    '..##.++.##..',
    '..##.++.##..',
    '############',
    '............'
  ],

  biomes: [
    '............',
    '.........++.',
    '.........++.',
    '............',
    '.....##.....',
    '....####....',
    '...##..##...',
    '..##....##..',
    '.##......##.',
    '############',
    '............',
    '............'
  ],

  farms: [
    '............',
    '..+...+...+.',
    '.+++.+++.+++',
    '..+...+...+.',
    '.+++.+++.+++',
    '..+...+...+.',
    '..#...#...#.',
    '..#...#...#.',
    '..#...#...#.',
    '############',
    '............',
    '............'
  ],

  /**
   * La cara del creeper. No es un modulo: vive en el pie de pagina.
   *
   * Se dibuja aqui con los demas porque asi entra en el mismo sprite y cada uso
   * son cuarenta bytes de "use" en vez de un SVG repetido. Y esta cara es de las
   * pocas cosas de Minecraft que se reconocen sin haber jugado nunca, que es
   * justo lo que se le pide a un guino en el pie.
   */
  creeper: [
    '............',
    '............',
    '..###..###..',
    '..###..###..',
    '..###..###..',
    '.....##.....',
    '....####....',
    '....####....',
    '....####....',
    '....#..#....',
    '............',
    '............'
  ]
}

/**
 * Convierte un mapa de bits en rectangulos, uniendo los pixeles contiguos de
 * cada fila en uno solo. Un icono pasa asi de mas de cien rectangulos a unas
 * veinte, que es la diferencia entre un sprite usable y uno que engorda cada
 * pagina sin motivo.
 */
export const aRectangulos = (mapa) => {
  const rects = []

  mapa.forEach((fila, y) => {
    let inicio = null
    let caracter = null

    const cerrar = (x) => {
      if (inicio === null) return
      rects.push({ x: inicio, y, ancho: x - inicio, acento: caracter === '+' })
      inicio = null
      caracter = null
    }

    for (let x = 0; x < fila.length; x++) {
      const c = fila[x]
      if (c === '.' || c !== caracter) cerrar(x)
      if (c !== '.' && inicio === null) {
        inicio = x
        caracter = c
      }
    }
    cerrar(fila.length)
  })

  return rects
}

export const modulosConIcono = Object.keys(MAPAS)
