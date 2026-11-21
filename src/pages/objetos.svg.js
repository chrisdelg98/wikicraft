/**
 * El sprite de los iconos de objetos, como un archivo aparte.
 *
 * Los iconos de los modulos van dentro de cada pagina porque son nueve y
 * pesan nada. Estos son cuarenta dibujos con textura y no caben asi: metidos
 * en cada pagina, una ficha que hoy pesa 12 KB pasaria a pesar varias veces
 * eso. En un archivo aparte el navegador lo baja una vez, lo guarda, y cada
 * icono de cada pagina es un <use> de unos pocos bytes. Es lo mismo que se
 * hace con la fuente de los titulos.
 *
 * Cada capa es un solo <path>: una fila de pixeles iguales es "M x y h w v 1
 * H x z", y eso ocupa la cuarta parte que un <rect>.
 */
import { SIMBOLOS, capasDe } from '../lib/sprites.js'

export function GET() {
  const simbolos = Object.keys(SIMBOLOS)
    .map((nombre) => {
      const caminos = capasDe(nombre)
        .map(({ fill, opacidad, rects }) => {
          const d = rects.map(({ x, y, w }) => `M${x} ${y}h${w}v1H${x}z`).join('')
          const op = opacidad < 1 ? ` fill-opacity="${opacidad}"` : ''
          return `<path fill="${fill}"${op} d="${d}"/>`
        })
        .join('')
      return `<symbol id="obj-${nombre}" viewBox="0 0 16 16">${caminos}</symbol>`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${simbolos}</svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } })
}
