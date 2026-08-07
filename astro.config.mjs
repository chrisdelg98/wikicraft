import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// Sitio estatico puro: sin adaptador de servidor y sin renderizado bajo demanda.
// Ver docs/decisiones/001-arquitectura-estatica.md.
export default defineConfig({
  site: 'https://wikicraft.pages.dev',

  // Las rutas por idioma se generan a mano desde data/locales.json con un
  // parametro [idioma], en vez de con el enrutado i18n de Astro. Asi la lista
  // de idiomas vive en un solo sitio y anadir uno no toca la configuracion.

  redirects: {
    '/': '/es/'
  },

  build: {
    // Genera /es/encantamientos/reparacion/index.html en vez de .../reparacion.html,
    // para que las URL no lleven extension.
    format: 'directory'
  },

  vite: {
    plugins: [tailwindcss()]
  }
})
