## Why

En la vista de TV a 1920x1080, la resolución de pantalla completa de la mayoría de los televisores, el tablero de 6 categorías no cabe junto con los puntajes: la página se desplaza hacia abajo y los puntajes quedan cortados. Los invitados no ven bien cómo va el juego. Se detectó al preparar las capturas del README. La spec actual solo exige que no haya desplazamiento horizontal.

**Rama del cambio:** `change/tv-sin-desplazamiento`, creada desde `main`. Se integra por PR con el CI en verde. Las capturas del README (rama `docs/readme-capturas`) esperan esta corrección.

## What Changes

- **El tablero de la TV cabe en la pantalla.** Mientras se muestra el tablero, el título, la ronda y su multiplicador, las categorías, las 5 filas de celdas, los puntajes y "Elige: …" se ven completos, sin desplazamiento vertical ni horizontal.
- **Cualquier tamaño de juego.** Vale para tableros de 3 a 8 categorías, con 1 a 8 equipos y valores de hasta 4 cifras.
- **Dos resoluciones.** Se verifica a 1920x1080 y también a 1280x720, la de los televisores HD más antiguos o de un notebook conectado por HDMI.
- **Legible de lejos.** Las celdas reparten la altura disponible en vez de tener una altura mínima fija. La letra de los valores y de los puntajes se achica solo lo necesario para caber, según la cantidad de columnas y de equipos.

## Notas de versión

**v1.2.1** (patch).

- En la TV, el tablero y los puntajes ahora caben completos en la pantalla, sin que se corten los puntajes abajo.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `game-presentation`: "Tablero legible con cualquier cantidad de categorías" pasa a exigir que el tablero y los puntajes se vean sin desplazamiento vertical, con hasta 8 equipos, a 1920x1080 y a 1280x720.

## Fuera de alcance

- Las demás pantallas de la TV (pregunta, Daily Double, Final, transición entre rondas y podio). Mantienen su diseño actual. Si se detecta un problema parecido con una pregunta muy larga y una imagen, tendrá su propio cambio.
- Resoluciones de otra proporción que 16:9, como 4:3 o pantallas verticales.
- La vista de operador, que se usa en el computador y puede desplazarse.

## Impact

- **UI (CSS):** `TvScreen.module.css` (la TV ocupa exactamente la altura de la ventana y reparte el espacio), `BoardGrid.module.css` (celdas de la TV sin altura mínima fija), `TeamScores.module.css` y `TeamScores.tsx` (letra según la cantidad de equipos), y tokens de tamaño de la TV en `tokens.css`.
- **Pruebas:** e2e de la TV a 1920x1080 y 1280x720 que verifican que nada se desplace ni quede fuera de la ventana. Sin jobs nuevos de CI.
- **Datos y dominio:** sin cambios.
