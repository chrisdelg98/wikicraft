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

Fase 0, modelado de datos. Los esquemas de las entidades núcleo (objetos,
encantamientos, equipo y aldeanos) están definidos, con soporte multi-idioma y
un validador que garantiza la integridad del grafo. Faltan los módulos de
pociones, crafteos, biomas, mobs y granjas, y poblar el contenido real.

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
data/
  locales.json    Idiomas soportados, idioma base y módulos activos
  schemas/        Esquemas que definen la forma de cada tipo de entidad
  entities/       Datos estructurales por módulo, sin una sola palabra traducible
  i18n/<idioma>/  Textos traducibles, un archivo por módulo
scripts/
  validar.mjs     Valida el modelo completo. Sin dependencias
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

## Multi-idioma

El contenido arranca en español y admite más idiomas sin tocar los datos del
juego. La clave está en que la mayor parte de una wiki de Minecraft no es texto:
durabilidad, daño, incompatibilidades entre encantamientos o precios de aldeanos
son idénticos en cualquier idioma. Solo se traducen nombres, descripciones y
notas, que viven en archivos aparte bajo `data/i18n/`.

Añadir un idioma es, por tanto, añadir una carpeta de textos. Si una traducción
falta, la página se muestra en el idioma base marcando el hueco en lugar de
romperse.

## Validación

```
npm run validar
```

Comprueba que los identificadores sean válidos y únicos, que **toda relación
apunte a una entidad que existe**, que las incompatibilidades estén declaradas
en ambos sentidos, que ninguna recomendación sea contradictoria y qué cobertura
de traducción tiene cada idioma. Conviene ejecutarlo antes de cerrar cualquier
cambio en `data/`.

## Pensada para quien empieza

Buena parte de quien juega a Minecraft son niños, y las wikis existentes están
escritas para adultos que ya saben lo que buscan. Aquí la claridad es un
requisito, y se sostiene desde los propios datos: cada entidad declara en qué
momento de la partida entra en juego, las granjas declaran su dificultad, y las
debilidades de un mob son valores estructurados en vez de texto suelto, para que
el buscador pueda responder a «cómo mato un blaze» sin depender de que alguien
haya escrito esa frase.

Los textos se escriben en segunda persona y sin jerga, y los tutoriales van como
pasos cortos. El estilo visual se inspira en Minecraft (bloques, inventario,
pixel art) sin copiar la interfaz del juego: familiar, no un disfraz.

## Módulos

Objetos · Encantamientos · Herramientas y armaduras · Aldeanos · Mobs ·
Pociones · Crafteos · Biomas y estructuras · Granjas

## Decisiones abiertas

- Origen de los datos: dataset propio o derivado de fuentes existentes.
- Generador de sitios estáticos concreto.
- Panel de administración para mantenimiento de contenido (fase posterior; el
  sitio público seguiría siendo estático en cualquier caso).
