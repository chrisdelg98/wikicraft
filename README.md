# Wikicraft

Una wiki **relacional** de Minecraft: rápida, instalable y navegable por
conexiones en lugar de por páginas aisladas.

En una wiki convencional buscas «Espada de Diamante», lees, y vuelves a buscar
«Sharpness», y vuelves a buscar «qué aldeano lo vende». En Wikicraft cada
elemento llega con sus relaciones ya resueltas: crafteo, encantamientos
recomendados, aldeanos que los venden, pociones que combinan, material de
reparación y mobs contra los que conviene usarla. Un solo salto, sin volver al
buscador.

## Estado

Proyecto en fase inicial. La estructura base está montada; el modelado de datos
(Fase 0) es el siguiente paso.

## Principios de arquitectura

El objetivo declarado es la velocidad, y de ahí sale todo lo demás:

- **Sin backend en tiempo de ejecución.** Los datos de Minecraft son estáticos:
  cambian con cada versión del juego, no con cada usuario. Se generan como
  archivos y se sirven desde un CDN.
- **Sin base de datos.** La información vive en JSON/YAML versionados en este
  repositorio. No hay servidor de base de datos ni consultas remotas.
- **HTML pre-renderizado.** Cada página se genera en tiempo de build, de modo
  que el navegador pinta contenido en el primer frame en lugar de esperar a que
  JavaScript construya la interfaz.
- **JavaScript mínimo.** Solo se hidrata lo que de verdad es interactivo:
  buscador, filtros y calculadoras.
- **Búsqueda en el cliente.** El índice se precompila en el build y se resuelve
  en memoria, sin una sola petición de red por pulsación.
- **PWA offline.** Un service worker precachea la aplicación y sus datos.

## Estructura del repositorio

```
data/             Fuente de verdad del contenido
  schemas/        Esquemas que validan cada tipo de entidad
  entities/       Datos por módulo (encantamientos, pociones, mobs, …)
scripts/          Utilidades de build: validación, índice de búsqueda
```

Además existen dos rutas locales que no se versionan, porque son herramientas
de quien desarrolla y no parte del producto: `docs/` (notas internas) y
`.claude/` junto a `CLAUDE.md` (configuración de Claude Code).

`src/` y `public/` aparecerán al inicializar el generador de sitios estáticos.

## Los datos como grafo

Cada entidad es un nodo con referencias explícitas por identificador a otros
nodos. Las páginas no «buscan» sus relaciones: las resuelven contra el conjunto
de datos que ya está en memoria. Ese es el mecanismo que hace que la navegación
se sienta instantánea, y es la razón por la que el modelado de datos merece más
cuidado que cualquier otra parte del proyecto.

## Módulos previstos

Encantamientos · Pociones · Aldeanos · Crafteos · Biomas y estructuras ·
Herramientas y armaduras · Mobs · Granjas

## Decisiones abiertas

- Origen de los datos: dataset propio o derivado de fuentes existentes.
- Generador de sitios estáticos concreto.
- Panel de administración para mantenimiento de contenido (fase posterior; el
  sitio público seguiría siendo estático en cualquier caso).
