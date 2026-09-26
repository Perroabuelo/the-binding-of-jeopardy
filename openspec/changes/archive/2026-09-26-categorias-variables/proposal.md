## Why

Todos los tableros tienen hoy exactamente 5 categorías, así que no se puede armar un juego más corto ni uno más largo, y tampoco usar las 6 columnas del Jeopardy original. Además, las categorías no se pueden reordenar después de escribirlas: para mover una hay que reescribirla a mano en otra columna.

**Rama del cambio:** `change/categorias-variables` (creada desde `main`, se integra por PR con CI en verde). Se implementa después de fusionar `imagen-en-respuesta`, rebasando esta rama sobre `main` antes de empezar.

## What Changes

- Un tablero puede tener **entre 3 y 8 categorías**. Cada categoría sigue teniendo 5 preguntas de 100 a 500.
- Los tableros nuevos se crean con **6 categorías**. Los tableros que ya existen con 5 siguen siendo válidos y no se modifican.
- En el editor:
  - **"Agregar categoría"** agrega una columna vacía al final y se deshabilita cuando ya hay 8.
  - Cada columna tiene **"Quitar"**, que se deshabilita cuando quedan 3. Si la columna tiene contenido (nombre, pregunta, respuesta o imagen), pide confirmación. Si está vacía, la quita directamente. Las imágenes de la columna quitada se limpian si nada más las usa.
  - Cada columna tiene flechas **izquierda y derecha** para moverla una posición. La flecha izquierda se deshabilita en la primera columna y la derecha en la última.
- La validación de "listo para jugar" exige nombre en **todas** las categorías del tablero y contenido en **todas** sus celdas, sin importar cuántas sean.
- El juego termina automáticamente cuando se usan **todas** las celdas del tablero, no a las 25.
- Importar acepta tableros de 3 a 8 categorías y rechaza los que tengan otra cantidad con un mensaje claro. El formato de intercambio se mantiene en la versión 1.
- En la TV, el tablero se ve completo y legible con cualquier cantidad de categorías entre 3 y 8.

## Notas de versión

**v0.3.0** (minor)

- Los tableros pueden tener entre 3 y 8 categorías. Los tableros nuevos se crean con 6, como en el Jeopardy original.
- Las categorías se pueden reordenar con flechas en el editor.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `board-editing`: la estructura fija de 5x5 pasa a ser de 3 a 8 categorías (6 por defecto) con 5 filas. Se agrega cómo añadir, quitar y reordenar categorías, y la validación de "listo para jugar" pasa a depender del número de categorías.
- `board-storage`: importar acepta tableros de 3 a 8 categorías y rechaza el resto.
- `game-session`: el fin automático del juego ocurre cuando se usan todas las celdas del tablero.
- `game-presentation`: el tablero en la TV debe verse completo y legible con 3 a 8 categorías.

## Fuera de alcance

- Cambiar el número de filas o los valores de las celdas (siguen 5 filas de 100 a 500).
- Reordenar arrastrando, reordenar celdas dentro de una categoría y mover celdas entre categorías.
- Deshacer después de quitar una categoría.
- Insertar una categoría en una posición intermedia: se agrega al final y después se mueve con las flechas.
- Optimizar la vista de operador para teléfonos con 7 u 8 columnas: el operador se sigue usando en la laptop.
- Subir la versión del formato de intercambio. Una app antigua en caché rechaza un archivo con otra cantidad de categorías que 5, con su mensaje de error actual.

## Impact

- **Dominio:**
  - `src/domain/board.ts`: la constante `CATEGORY_COUNT` se reemplaza por `MIN_CATEGORIES`, `MAX_CATEGORIES` y `DEFAULT_CATEGORIES`. `parseClueKey` y `allClueKeys` pasan a depender del tablero, y se agregan operaciones puras para agregar, quitar y mover categorías.
  - `validation.ts`, `game.ts` y `exchange.ts` se adaptan al número variable de categorías.
- **UI:**
  - `ui/editor/BoardGrid` recibe los controles de columna y una grilla CSS dinámica.
  - `EditorScreen` agrega la confirmación al quitar y la limpieza de imágenes.
  - `ConfirmDialog` se reutiliza desde el editor.
  - `ui/game/BoardGrid` y `tokens.css` ajustan el tamaño de letra de la TV según el número de columnas.
- **Pruebas:** el fixture `makeCompleteBoard` pasa a 6 categorías. Los tests que asumen 5 columnas o 25 celdas se actualizan.
- **Datos:** sin migración. Los tableros, sesiones y archivos existentes con 5 categorías siguen siendo válidos.
- **Dependencias:** ninguna nueva.
