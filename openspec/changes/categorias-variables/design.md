## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`. Así está el código hoy:

- `src/domain/board.ts` define `CATEGORY_COUNT = 5`, y de esa constante dependen `parseClueKey` (rechaza `c5-*` o superiores), `allClueKeys()` (no recibe el tablero), `createEmptyBoard`, `validateBoard` y el esquema de `exchange.ts` (`.length(CATEGORY_COUNT)`).
- `gameReducer` decide el fin automático con `allClueKeys()`. Por eso un tablero de 3 categorías nunca terminaría solo, y uno de 8 terminaría a las 25 celdas.
- Las ediciones del tablero son funciones puras en `ui/editor/boardEdits.ts` (`withTitle`, `withCategoryName`, `withClue`) que se aplican con `update()` de `useBoardEditor`, que guarda automáticamente con debounce. `flush()` fuerza el guardado.
- La grilla del editor tiene `repeat(5, ...)` fijo en su CSS. La grilla del juego es una `<table>` con `table-layout: fixed`, que ya se adapta a cualquier número de columnas, pero el tamaño de letra de la TV (`--tv-category-font` y `--tv-cell-font`) solo depende del ancho de la ventana.
- `ConfirmDialog` vive en `ui/boards/` y hoy solo lo usa la lista de tableros.
- El fixture `makeCompleteBoard` se construye con `createEmptyBoard`, así que hereda el número de categorías por defecto.
- Este cambio se implementa **después** de `imagen-en-respuesta`, y reutiliza `clueImageIds` y `boardImageIds` de `src/domain/board.ts`.

## Goals / Non-Goals

**Goals:**
- El número de categorías se deriva siempre de `board.categories.length`. No queda ninguna constante de tamaño fuera de los límites 3, 8 y 6.
- Agregar, quitar y mover categorías son funciones puras del dominio, probadas por separado de React.
- Los tableros, sesiones y archivos existentes de 5 categorías funcionan sin migración.

**Non-Goals:**
- Hacer variable el número de filas. `CLUES_PER_CATEGORY` y `CLUE_VALUES` no cambian.
- Adaptar la vista de operador a teléfonos.

## Decisions

### 1. Constantes y claves de celda

```ts
export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 8;
export const DEFAULT_CATEGORIES = 6;

createEmptyBoard(id, now, categoryCount = DEFAULT_CATEGORIES)
allClueKeys(board)            // recorre board.categories
parseClueKey(key)             // solo sintaxis: sin tope de categoría
```

`parseClueKey` deja de validar rangos. La pertenencia al tablero ya la resuelve `getClue(board, key)`, que devuelve `null` cuando la celda no existe. `openClue` y `award` ya usan `getClue` para eso. `parseClueKey` sigue rechazando `rowIndex >= CLUES_PER_CATEGORY`, porque las filas siguen siendo fijas.

`CATEGORY_COUNT` se elimina. Así, cualquier uso que quede sin migrar hace fallar el typecheck.

*Alternativa descartada:* `parseClueKey(key, board)`. Obliga a pasar el tablero a lugares que solo necesitan la posición, como `describeMissing` o el encabezado de la TV, sin ganar seguridad.

### 2. Operaciones de estructura en el dominio

En `src/domain/board.ts`, todas puras. Si la operación no es válida, devuelven **la misma referencia**, igual que `gameReducer`:

| Función                           | Precondición                  | Resultado                                         |
|-----------------------------------|-------------------------------|---------------------------------------------------|
| `addCategory(board)`              | `length < MAX_CATEGORIES`     | agrega una categoría vacía (5 celdas) al final    |
| `removeCategory(board, index)`    | `length > MIN_CATEGORIES`     | quita la categoría y las demás mantienen su orden |
| `moveCategory(board, from, to)`   | ambos índices en rango, `from != to` | mueve la categoría a `to`                  |
| `categoryHasContent(category)`    | —                             | `true` si tiene nombre, pregunta, respuesta o imagen no vacíos |

En la UI, las flechas llaman a `moveCategory(board, i, i ± 1)`. La firma general `from, to` queda por si en el futuro se reordena arrastrando, sin costo extra.

*Alternativa descartada:* ponerlas en `ui/editor/boardEdits.ts`, junto a `withTitle`. Los límites 3 y 8 son reglas del tablero, y `exchange.ts` y `validation.ts` también las usan.

### 3. Validación e intercambio

- `validateBoard` recorre `board.categories`, que ya produce los faltantes por índice. Además, si la cantidad está fuera de rango, agrega el faltante `{ kind: 'categoryCount' }`. En la UI no debería ocurrir, pero protege contra datos corruptos.
- En `exchange.ts`, `categories` pasa de `.length(5)` a `.min(MIN_CATEGORIES).max(MAX_CATEGORIES)`. El mensaje de error pasa a ser: *"El tablero del archivo no es válido: debe tener entre 3 y 8 categorías con 5 preguntas de 100 a 500."* `EXCHANGE_SCHEMA_VERSION` sigue en 1.

### 4. Quitar una categoría en el editor

```
click "Quitar categoría N"
   |
   +-- categoryHasContent? -- no --> update(removeCategory) --> flush
   |
   +-- sí --> ConfirmDialog "¿Quitar la categoría <nombre o N>?"
                 |-- Cancelar --> sin cambios
                 +-- Quitar  --> ids = imágenes de la categoría (clueImageIds)
                                 update(removeCategory) --> flush()
                                 si guardó: deleteImageIfUnused(id) por cada id
```

Las imágenes se borran **después** de guardar el tablero sin la categoría. Es el mismo orden que usa `ClueImageField.replaceImage`, así que si falla el guardado no queda ninguna celda apuntando a una imagen borrada. `ConfirmDialog` se mueve a `ui/lib/` para compartirlo entre la lista de tableros y el editor.

### 5. Controles del editor

Cada columna de `ui/editor/BoardGrid` agrega sobre el nombre una barra con tres botones:

- `<`, con `aria-label` "Mover categoría N a la izquierda".
- `>`, con `aria-label` "Mover categoría N a la derecha".
- "Quitar", con `aria-label` "Quitar categoría N".

Cada botón se deshabilita en su límite. Debajo de la grilla va el botón "Agregar categoría", que se deshabilita con 8 columnas.

Después de mover una columna, el foco sigue al botón equivalente de la columna en su nueva posición. Así se puede presionar varias veces seguidas con el teclado. Las `key` de React siguen siendo el índice de columna, como hoy: la columna no tiene id, y el foco se recupera explícitamente.

En el CSS, la grilla pasa a `repeat(var(--columns), minmax(8rem, 1fr))`, con `--columns` en línea en el estilo, y el contenedor se desplaza horizontalmente si no cabe. En una laptop, 8 columnas de 8rem caben sin desplazamiento.

### 6. Tamaño de letra de la TV según el número de columnas

`ui/game/BoardGrid` publica `--columns` en el estilo de la `<table>`. Los tokens de la TV pasan a depender de esa variable:

```css
--tv-category-font: clamp(0.9rem, calc(12vw / var(--columns, 5)), 2.5rem);
--tv-cell-font:     clamp(1.25rem, calc(24vw / var(--columns, 5)), 5rem);
```

Con 5 columnas, el resultado es igual a los valores actuales (2vw y 4vw aproximadamente, más cerca del tope). Con 8 columnas, la letra se achica en proporción. Los nombres largos ya se parten con `overflow-wrap: anywhere`. Los coeficientes exactos se ajustan en la tarea, con el e2e de 1920x1080 como criterio.

### 7. Compatibilidad

- Una sesión en curso guardada con 5 categorías sigue funcionando: `allClueKeys(session.boardSnapshot)` devuelve 25 claves.
- Reordenar un tablero no afecta a los juegos en curso, que usan su propia copia (`boardSnapshot`).
- `makeCompleteBoard` pasa a 6 categorías y 30 celdas. Los tests que asumen 25 celdas o 5 columnas se ajustan en la tarea que cambia el valor por defecto.

## Estrategia de pruebas

- **Unit (dominio):**
  - `createEmptyBoard` con el valor por defecto (6) y con una cantidad explícita.
  - `allClueKeys` con 3 y 8 categorías.
  - `parseClueKey` acepta `c7-r4` y rechaza `c0-r5`.
  - `addCategory` y `removeCategory` en sus límites: devuelven la misma referencia en 8 y en 3.
  - `moveCategory`: mueve al centro y a los extremos, y devuelve la misma referencia con índices inválidos.
  - `categoryHasContent` con cada tipo de contenido.
  - `validateBoard` con 3, 6 y 8 categorías, y con una categoría agregada vacía.
  - `gameReducer`: fin automático a las 15 celdas con 3 categorías; con 8 categorías no termina a las 25.
  - `exchange`: ida y vuelta de 8 categorías, importación de un archivo de 5, rechazo de 2 y de 9 categorías con el mensaje nuevo.
- **Almacenamiento (fake-indexeddb):** `deleteImageIfUnused` sobre las imágenes de una categoría quitada no borra las que usa otro tablero.
- **Componentes (Testing Library, `EditorScreen`):**
  - Agregar hasta 8 y ver el botón deshabilitado.
  - Quitar hasta 3 y ver "Quitar" deshabilitado.
  - Quitar una columna vacía sin diálogo.
  - Quitar una columna con contenido: cancelar no cambia nada, confirmar la quita.
  - Flechas deshabilitadas en los extremos y el foco siguiendo a la columna movida.
  - El panel de faltantes indica la categoría 7 después de agregarla.
- **E2E (Playwright):**
  - `editor.spec`: crear un tablero (6 columnas), agregar, mover y quitar con confirmación, recargar y verificar el orden y el contenido.
  - `boards.spec`: exportar e importar un tablero de 8 categorías.
  - `game.spec`: la TV con 8 categorías en 1920x1080. Se verifica que `scrollWidth <= clientWidth` en la página y en cada encabezado y celda, y que el juego termina al usar todas las celdas de un tablero de 3.

## CI

Sin cambios en el pipeline. El e2e de legibilidad fija el viewport de 1920x1080 dentro del propio test, así que no necesita un proyecto nuevo de Playwright.

## Risks / Trade-offs

- [Los tests existentes asumen 5 columnas o 25 celdas y fallan en masa al cambiar el valor por defecto a 6] → Mitigación: una tarea hace el cambio de valor por defecto y el ajuste de tests juntos, en un mismo commit, antes de tocar la UI.
- [Nombres de categoría muy largos con 8 columnas ocupan muchas líneas en la TV] → Mitigación: el tamaño de letra se adapta al número de columnas y el texto se parte. Si un nombre es excesivo, se acepta que la fila de encabezados crezca, porque el e2e solo exige que no haya texto cortado.
- [Quitar una categoría por error] → Mitigación: confirmación cuando tiene contenido. Deshacer queda fuera de alcance.
- [Conflictos al rebasar sobre `imagen-en-respuesta` en `board.ts` y `exchange.ts`] → Mitigación: implementar después del merge de ese cambio, como indica la propuesta.

## Migration Plan

No hay migración de datos. Si hay que revertir, basta con revertir el PR. La versión anterior no soporta los tableros creados con 3, 4, 6, 7 u 8 categorías: no pasan su validación ni su importación, así que deben quitarse o completarse hasta 5 antes de revertir.
