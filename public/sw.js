/**
 * Service worker de Wikicraft.
 *
 * Estrategia deliberadamente conservadora. Como todo el contenido es estatico,
 * lo que se guarda no caduca por si solo: caduca cuando se despliega una version
 * nueva. Por eso el nombre del cache lleva version y el activate borra las
 * anteriores de golpe, en vez de intentar invalidar entrada por entrada.
 */

const VERSION = 'v2'
const CACHE = `wikicraft-${VERSION}`

/** Lo minimo para que la aplicacion arranque sin conexion. */
const ESENCIALES = [
  '/es/',
  '/es/indice.json',
  '/favicon.svg',
  '/manifest.webmanifest',
  // La fuente de los titulos. Sin ella, sin conexion los titulos cambian de
  // forma al cargar y la pagina parece rota.
  '/fuentes/jersey10-400.woff2'
]

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      // addAll falla entero si un solo recurso falla, y no queremos que un
      // fallo suelto impida instalar el service worker.
      .then((cache) => Promise.allSettled(ESENCIALES.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request
  if (peticion.method !== 'GET') return

  const url = new URL(peticion.url)
  if (url.origin !== self.location.origin) return

  // Navegaciones: primero la red, para que una version nueva se vea enseguida;
  // si no hay conexion, lo guardado.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(CACHE).then((cache) => cache.put(peticion, copia))
          return respuesta
        })
        .catch(() => caches.match(peticion).then((r) => r ?? caches.match('/es/')))
    )
    return
  }

  // Recursos: primero lo guardado, que es lo instantaneo, y se refresca detras.
  evento.respondWith(
    caches.match(peticion).then((guardada) => {
      const red = fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(CACHE).then((cache) => cache.put(peticion, copia))
          return respuesta
        })
        .catch(() => guardada)
      return guardada ?? red
    })
  )
})
