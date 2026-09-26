## Why

Hoy solo la pregunta puede tener imagen, así que no se pueden armar respuestas visuales como "¿quién es este?" seguida de la foto, o "¿dónde queda?" seguida del mapa. Además, el proyecto no lleva registro de qué mejoras trae cada deploy. Este es el primer cambio después de la v1, así que es buen momento para empezar a llevarlo.

**Rama del cambio:** `change/imagen-en-respuesta` (creada desde `main`, se integra por PR con CI en verde).

## What Changes

- Cada pregunta puede tener, además de su imagen, una **imagen de respuesta** opcional, con las mismas reglas de formato (PNG, JPEG, GIF, WebP) y tamaño (hasta 5 MB).
- En el editor, el diálogo de la celda tiene un segundo campo de imagen para la respuesta, que se puede adjuntar y quitar.
- En la vista de operador se ven siempre ambas imágenes: la de la pregunta junto a la pregunta y la de la respuesta junto a la respuesta.
- En la TV, la imagen de la respuesta **no llega** mientras la respuesta no se revela. Al revelar, **reemplaza** a la imagen de la pregunta. Si la respuesta no tiene imagen, se mantiene la de la pregunta.
- Exportar e importar incluyen las imágenes de respuesta. Los archivos exportados antes de este cambio se siguen importando sin cambios, y el formato de intercambio se mantiene en la versión 1.
- La limpieza de imágenes huérfanas considera ambas imágenes de cada celda.
- **Registro de versiones:** se agrega `CHANGELOG.md` y se adoptan reglas de proceso en `openspec/config.yaml`. Cada propuesta declara sus notas de versión y su tipo de salto SemVer. Al archivar, las notas pasan al changelog, se sube la versión en `package.json` y se crea un tag `vX.Y.Z` al fusionar. Este cambio estrena el proceso.

## Notas de versión

**v0.2.0** (minor)

- Las respuestas ahora pueden tener su propia imagen, que aparece en la TV al revelar la respuesta.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `board-editing`: el requirement de imagen opcional se extiende a una imagen de pregunta y una imagen de respuesta por celda.
- `board-storage`: exportar e importar deben conservar también las imágenes de respuesta, y los archivos previos deben seguir importándose.
- `game-session`: al abrir una celda, el operador ve además la imagen de la respuesta.
- `game-presentation`: la TV no recibe la imagen de la respuesta antes de revelarla, y al revelar esa imagen reemplaza a la de la pregunta.

## Fuera de alcance

- Varias imágenes por pregunta o por respuesta, y audio o video.
- Recortar o editar imágenes dentro de la app.
- Número variable de categorías y reordenar columnas: es el cambio `categorias-variables`.
- Mostrar la versión de la app en la interfaz y publicar GitHub Releases.
- Subir la versión del formato de intercambio. Una app antigua en caché que importe un archivo nuevo descartará la imagen de respuesta sin avisar, y se acepta ese riesgo.

## Impact

- **Dominio:** `src/domain/board.ts` (tipo `Clue`), `exchange.ts` (esquema y reasignación de ids), `projection.ts` y `game.ts` (`TvView`).
- **Almacenamiento:** `src/storage/db.ts` (ids de imágenes en uso). Se consolida la lógica de "imágenes que usa un tablero", hoy repetida en `exchange.ts`, `db.ts`, `ui/boards/boardFiles.ts` y `ui/editor/imageCleanup.ts`.
- **UI:** `ClueDialog`, `ClueImageField`, `EditorScreen`, `OperatorScreen` y `TvScreen`.
- **Datos:** sin migración. El campo nuevo es opcional y los tableros, juegos en curso y archivos existentes siguen siendo válidos.
- **Proceso y repositorio:** `openspec/config.yaml`, `CHANGELOG.md` (nuevo) y `package.json` (versión).
- **Dependencias:** ninguna nueva.
