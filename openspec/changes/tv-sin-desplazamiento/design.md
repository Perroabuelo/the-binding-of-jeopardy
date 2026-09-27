## Context

La motivación está en `proposal.md` y el requisito en `specs/game-presentation/spec.md`.

Estado actual del CSS de la TV:

- `html`, `body` y `#root` tienen `height: 100%`. `.tv` (`TvScreen.module.css`) tiene `min-height: 100%`, así que crece con su contenido en vez de limitarse a la ventana.
- En el tablero, cada celda tiene `min-height: 12vh` (`BoardGrid.module.css`, `.tv .cell`). Solo las 5 filas ya suman 60vh. A eso se agregan el título, la ronda, los nombres de categoría (hasta 3 líneas con nombres largos), el `padding` y los `gap` de `--space-6`, y los puntajes.
- Los puntajes de la TV usan `--tv-cell-font` para el número y `--tv-category-font` para el nombre (`TeamScores.module.css`). Esos tamaños dependen solo del ancho (`vw`) y de `--columns`, no de la altura ni de la cantidad de equipos. Con 8 equipos la lista se reparte en varias filas.
- Los e2e existentes (`e2e/game.spec.ts`, "TV en 1920x1080") solo verifican que no haya desplazamiento horizontal ni texto cortado a lo ancho.

## Goals / Non-Goals

**Goals:**
- En la fase de tablero, la TV ocupa exactamente la altura de la ventana y reparte el espacio sobrante entre las filas del tablero.
- Solo cambia CSS y una variable de CSS en `TeamScores`. No se toca el dominio, la proyección ni la sincronización.

**Non-Goals:**
- Rediseñar las otras fases de la TV (ver "Fuera de alcance" en la propuesta).
- Ajustes para proporciones distintas de 16:9.

## Decisions

### 1. La TV mide exactamente la ventana y el tablero toma el espacio sobrante

`.tv` pasa de `min-height: 100%` a `height: 100%`, con `overflow: hidden`. Sigue siendo una columna flex: el encabezado y los puntajes toman su alto natural (`flex: none`), y el tablero toma el resto (`flex: 1; min-height: 0`).

El `<table>` del tablero no se estira con flex, así que `BoardGrid` en modo TV se envuelve en un contenedor (`.tvBoard`) con `flex: 1; min-height: 0`, y la tabla usa `height: 100%`. Una tabla con altura fija reparte la altura sobrante entre sus filas. Las celdas de la TV pasan de `min-height: 12vh` a `height: 100%` dentro de su `td`, con un mínimo pequeño que solo protege el texto.

El resto de las fases (pregunta, Daily Double, Final, transición y podio) ya usan `.clue` con `flex: 1`, así que heredan la altura fija sin cambios visibles. Para no esconder contenido en esas fases, el `overflow: hidden` se aplica solo con el tablero (`.tv[data-phase="board"]`). Las demás mantienen su comportamiento, fuera de alcance.

*Alternativa descartada:* calcular la altura de cada celda con `calc((100vh - encabezado - puntajes) / 5)`. Obliga a conocer el alto del encabezado y de los puntajes, que varía con los nombres largos, las rondas y la cantidad de equipos. Flex con `min-height: 0` lo resuelve solo.

*Alternativa descartada:* CSS grid en lugar de `<table>`. La tabla da la semántica que usan los lectores de pantalla y los tests (`role="table"`, `columnheader`, `cell`). Se conserva.

### 2. Tamaños de letra también limitados por la altura

Hoy los tokens de la TV dependen del ancho. Con una ventana de 16:9 eso basta a lo ancho, pero no garantiza que el alto alcance. Cada token agrega un tope en `vh` dentro del `min()` existente:

- `--tv-cell-font`: además de los topes por columnas y cifras, `≤ 7vh`, para que 5 filas de valores quepan con su `padding`.
- `--tv-category-font`: `≤ 2.6vh`, para que un nombre de 3 líneas no se coma el tablero.
- Título y ronda: usan `--tv-category-font`, así que heredan el tope.

Los valores exactos se ajustan al implementar, con los e2e de la decisión 4 como criterio, y cuidando el test existente que exige letra de valores ≥ 32px a 1920x1080.

### 3. Puntajes en una fila, con letra según la cantidad de equipos

`TeamScores` en modo TV define `style={{ '--teams': teams.length }}`, y el CSS define `--tv-score-font` en función de `--teams`. Por ejemplo `clamp(1rem, min(calc(24vw / (var(--teams) + 2)), 6vh), 4rem)`, con el nombre a un 45% de ese tamaño. La lista de la TV no se reparte en varias filas (`flex-wrap: nowrap`), y cada puntaje puede achicarse (`min-width: 0`). Con 8 equipos a 1280x720 caben en una fila. Si un nombre es muy largo, se corta con puntos suspensivos (`text-overflow: ellipsis`) y el puntaje se sigue viendo completo.

*Alternativa descartada:* dejar que los puntajes usen varias filas. Con 8 equipos se lleva hasta un 20% del alto de la pantalla, que es justo lo que le falta al tablero.

### 4. "Elige: …" dentro del espacio de los puntajes

La línea "Elige: …" se queda debajo de los puntajes, pero con su letra limitada por la altura (`≤ 4vh`) y sin margen superior extra. Queda dentro del bloque `flex: none` del pie.

## Estrategia de pruebas

- **E2E (`e2e/game.spec.ts`)**, en un `describe` nuevo por resolución (`test.use({ viewport })`), con un helper `expectFitsWindow(tv)` que verifica:
  - `document.documentElement.scrollHeight <= clientHeight` y `scrollWidth <= clientWidth`;
  - que el `getBoundingClientRect()` del título, la ronda (si hay), la tabla, la lista de puntajes y "Elige: …" (si hay) esté dentro de `window.innerHeight` y `innerWidth`;
  - que ninguna celda ni encabezado corte su texto a lo ancho (el mismo chequeo `scrollWidth > clientWidth` de los tests existentes).
- Casos:
  - 1920x1080: 6 categorías con nombres largos y 2 equipos.
  - 1280x720: 8 categorías con nombres largos, ronda x10, 8 equipos y equipo que elige.
  - 1280x720: 3 categorías y 1 equipo.
- **Equipo que elige en la web:** "Elige: …" solo aparece con pulsadores, que son de escritorio. El e2e web arranca el juego, escribe `controlTeamId` en la sesión guardada en IndexedDB y recarga el operador. La recuperación del juego lo publica a la TV. Así se prueba el diseño sin Electron.
- Los tests existentes de "TV en 1920x1080" siguen pasando, incluida la letra de valores ≥ 32px.
- **Unitarias y componentes:** jsdom no calcula el diseño. Solo un test de componente de `TeamScores` que verifica que en modo TV la lista define `--teams` con la cantidad de equipos.

## CI

Sin cambios en el pipeline. Los e2e nuevos corren en el job `e2e` existente.

## Risks / Trade-offs

- [La letra queda más chica que antes a 1920x1080] → El tope por `vh` solo actúa cuando no cabe. El test de letra de valores ≥ 32px a 1920x1080 se mantiene.
- [Nombres de equipo muy largos con 8 equipos] → Se cortan con puntos suspensivos y el puntaje se ve completo. Es aceptable en una TV de fiesta.
- [Otras fases con contenido largo siguen pudiendo desplazarse] → Fuera de alcance. El `overflow: hidden` solo aplica al tablero para no esconder contenido en ellas.

## Migration Plan

Sin migración de datos. Revertir es volver al CSS anterior.
