# docs/ — Documentación interna de desarrollo

Esta carpeta es **local a cada máquina**. Todo su contenido está excluido del
repositorio mediante `.gitignore`; el único archivo versionado es este README,
que existe para que la carpeta y su convención sobrevivan a un clon limpio.

## Para qué sirve

Es el espacio de trabajo de quien desarrolla: notas sueltas, borradores,
investigación de datos, capturas, comparativas y cualquier material de apoyo que
ayuda a construir Wikicraft pero que **no forma parte del producto ni de su
documentación pública**.

## Qué NO va aquí

- Documentación destinada a usuarios finales o a colaboradores externos: eso va
  en el `README.md` de la raíz o en la propia wiki.
- Instrucciones permanentes para Claude Code: eso va en `CLAUDE.md`, en la raíz
  (también local, tampoco se versiona).
- Datos reales del juego: eso va en `data/`.
- Cualquier cosa que otra persona necesite para poder trabajar en el proyecto.
  Si un compañero lo necesita, por definición no es interno y debe versionarse.

## Subcarpetas sugeridas

| Carpeta          | Contenido                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `decisiones/`    | Registro de decisiones técnicas y por qué se tomaron.             |
| `investigacion/` | Fuentes de datos, exploración de APIs, análisis de wikis ajenas.  |
| `notas/`         | Todo lo demás: ideas, pendientes, borradores de diseño.           |

Ninguna es obligatoria. Crea las que te sirvan y borra las que no.

## Aviso importante

Como esta carpeta no se versiona, **nada de lo que guardes aquí tiene copia de
seguridad ni historial**. Si escribes algo que no puedes permitirte perder,
muévelo al repositorio.
