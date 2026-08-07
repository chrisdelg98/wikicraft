import { codigosIdioma, indiceBusqueda } from '../../lib/datos.js'

// Un indice por idioma, servido como archivo estatico. El navegador lo descarga
// una sola vez, la primera que alguien toca el buscador, y el service worker lo
// guarda para las visitas siguientes.

export function getStaticPaths() {
  return codigosIdioma.map((idioma) => ({ params: { idioma } }))
}

export function GET({ params }) {
  return new Response(JSON.stringify(indiceBusqueda(params.idioma)), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })
}
