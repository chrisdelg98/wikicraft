# Fuentes

Aqui van los archivos de tipografia, y se sirven desde `/fuentes/…`.

Se alojan en el propio sitio y no se piden a Google. No es manía: una de las
restricciones del proyecto es que no haya peticiones de red para leer
contenido, y una fuente traida de fuera es justo eso, ademas de un tercero que
ve la IP de quien entra.

## Que archivos hacen falta

- **Formato `.woff2` y solo ese.** Lo entienden todos los navegadores desde
  2016 y pesa la mitad que un `.ttf`. Si lo que has bajado de Google Fonts es
  un zip con `.ttf`, dilo y lo convertimos.
- **Subconjunto latino.** El paquete completo trae cirilico, griego y vietnamita
  que aqui no se usan y multiplican el peso por cuatro.
- **Solo los pesos que usa el sitio**, que son cuatro:

  | Peso | Donde se usa            |
  | ---- | ----------------------- |
  | 400  | texto normal            |
  | 600  | `font-semibold`         |
  | 700  | `font-bold`             |
  | 800  | `font-extrabold`        |

  Una variable font en un solo archivo tambien vale, y suele salir mejor.

## Como nombrarlos

    public/fuentes/<familia>-400.woff2
    public/fuentes/<familia>-600.woff2
    public/fuentes/<familia>-700.woff2
    public/fuentes/<familia>-800.woff2

o, si es variable:

    public/fuentes/<familia>-variable.woff2

## Presupuesto

El sitio entero manda hoy 2,8 KB de JavaScript y 18 KB de CSS. Cuatro pesos en
woff2 latino son unos 25-40 KB en total, que es asumible; el paquete completo
sin recortar se va a 200 KB y ahi ya no compensa.
