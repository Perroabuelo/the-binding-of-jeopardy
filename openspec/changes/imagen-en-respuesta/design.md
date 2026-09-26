## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`. Así funciona hoy la imagen de las preguntas:

- `Clue` tiene un único `imageId?`. El binario vive en el store `images` de IndexedDB y el tablero solo guarda el id.
- La TV lee las imágenes desde el mismo IndexedDB mediante `useImageUrl(imageId)`, porque es otra ventana del mismo origen. Por `BroadcastChannel` solo viaja el `TvView` que arma `projectForTv`. Por eso la TV "recibe" una imagen solo si su id aparece en `TvView`.
- La pregunta "¿qué imágenes usa este tablero?" está implementada cuatro veces: `referencedImageIds` en `exchange.ts`, `boardImageIds` en `db.ts`, `imageIdsOf` en `ui/boards/boardFiles.ts` y `usesImage` en `ui/editor/imageCleanup.ts`. Si alguna de ellas no considera el campo nuevo, se borran imágenes en uso o se exportan tableros incompletos.
- `ClueImageField` tiene el texto fijo ("Imagen (opcional)", "Vista previa de la imagen", "Quitar imagen"), y los tests unitarios y e2e lo usan como selector.
- `package.json` está en `0.1.0`, no hay tags y el deploy ocurre en cada push a `main`.

## Goals / Non-Goals

**Goals:**
- Una sola función del dominio responde "¿qué imágenes usa un tablero?", y el resto del código la usa.
- La regla de no filtrar la respuesta a la TV se aplica en un solo lugar (`projectForTv`) y cubre texto e imagen.
- El registro de versiones funciona desde este mismo cambio.

**Non-Goals:**
- Automatizar el versionado o los tags en el CI.
- Migrar datos: el campo es opcional y no se sube `BOARD_SCHEMA_VERSION` ni `EXCHANGE_SCHEMA_VERSION`.

## Decisions

### 1. Modelo: `answerImageId?` al lado de `imageId?`

```ts
Clue { value, question, answer, imageId?: string, answerImageId?: string }
```

`imageId` conserva su nombre y significa "imagen de la pregunta". Así los tableros guardados, las sesiones en curso y los archivos exportados siguen siendo válidos tal como están.

*Alternativa descartada:* renombrar a `questionImageId` o usar `images: { question?, answer? }`. Es más simétrico, pero obliga a migrar IndexedDB y a subir la versión del formato de intercambio, sin beneficio visible para el usuario.

### 2. `clueImageIds(clue)` y `boardImageIds(board)` en `src/domain/board.ts`

Son funciones puras. La primera devuelve los ids de una celda (pregunta y respuesta) y la segunda el conjunto de todo el tablero. Reemplazan a las cuatro implementaciones actuales:

| Hoy                                 | Pasa a usar                               |
|-------------------------------------|-------------------------------------------|
| `exchange.ts` `referencedImageIds`  | `boardImageIds`                           |
| `db.ts` `boardImageIds` (local)     | `boardImageIds` del dominio               |
| `boardFiles.ts` `imageIdsOf`        | `boardImageIds`                           |
| `imageCleanup.ts` `usesImage`       | `boardImageIds(board).has(id)`            |

La consolidación va en una tarea propia, **antes** de agregar el campo, con tests que fijan el comportamiento actual. Después, agregar `answerImageId` solo requiere tocar `clueImageIds`.

### 3. Intercambio: el campo es opcional y la versión sigue en 1

- El esquema zod de la celda agrega `answerImageId: z.string().optional()`.
- `importBoard` reasigna ids nuevos recorriendo **ambos** campos con un mismo mapa `viejo -> nuevo`. Si la pregunta y la respuesta usan el mismo id, se copia una sola imagen y ambas celdas apuntan al id nuevo.
- Si una respuesta referencia una imagen ausente del archivo, se rechaza con el mismo error que hoy existe para las preguntas.
- `EXCHANGE_SCHEMA_VERSION` sigue en 1. Una app antigua descarta el campo sin avisar, porque zod ignora las claves desconocidas. Ese riesgo está aceptado en la propuesta.

### 4. TV: `projectForTv` decide qué imagen se muestra

`TvView.phase` de tipo `clue` sigue con un único `imageId?`: la imagen que la TV debe mostrar.

```
revealed = false  ->  imageId = clue.imageId                 (sin answer, sin answerImageId)
revealed = true   ->  imageId = clue.answerImageId ?? clue.imageId,  answer = clue.answer
```

La TV no necesita saber de qué imagen se trata: `TvScreen` se queda como está. El id de la imagen de la respuesta no aparece en el mensaje antes de revelar, así que la TV no tiene forma de cargarla.

*Alternativa descartada:* mandar `questionImageId` y `answerImageId` y que la TV elija. Pone la regla de seguridad en la UI y filtra el id antes de tiempo.

El texto alternativo del `<img>` en la TV cambia según el caso ("Imagen de la pregunta" o "Imagen de la respuesta"). Para eso, la proyección incluye `imageRole: 'question' | 'answer'` junto a `imageId`.

### 5. Editor: `ClueImageField` parametrizado

`ClueImageField` recibe `label` ("Imagen de la pregunta" o "Imagen de la respuesta") y los textos derivados: la vista previa pasa a llamarse "Vista previa de la imagen de la pregunta" o "de la respuesta", y el botón "Quitar imagen de la pregunta" o "de la respuesta". `ClueDialog` pone un campo bajo cada textarea. `EditorScreen` pasa un `onImageChange` por campo, que parchea `imageId` o `answerImageId`. `boardEdits.applyCluePatch` generaliza el borrado de la clave cuando el valor es `undefined`.

Los selectores de los tests actuales ("Imagen (opcional)", etc.) se actualizan en la misma tarea.

`replaceImage` y `deleteImageIfUnused` no cambian de lógica. Como `deleteImageIfUnused` usa `boardImageIds`, no borra la imagen si la otra celda o el otro campo la siguen usando.

### 6. Operador

`CluePanel` muestra `ClueImage` con `clue.answerImageId` dentro de la sección "Respuesta", esté revelada o no. La imagen de la pregunta se queda donde está.

### 7. Registro de versiones (primera tarea)

- `openspec/config.yaml`:
  - `rules.proposal`: agrega una sección "Notas de versión", con la versión objetivo, el tipo de salto SemVer y los bullets en lenguaje de usuario.
  - `operations.archive.guidance`: agrega tres pasos: mover las notas a `CHANGELOG.md`, subir `version` en `package.json` (y `package-lock.json`), y crear el tag `vX.Y.Z` sobre el merge a `main` y hacer push del tag.
- `CHANGELOG.md` en la raíz, con formato *Keep a Changelog* en español, una entrada `0.1.0` retroactiva para la v1 y una sección `Sin publicar`.
- Con la app en `0.x`, una funcionalidad nueva sube el minor y una corrección sube el patch.
- El salto a `0.2.0` y el tag se hacen al archivar este cambio, no en la primera tarea, para que el tag quede sobre el commit que realmente se despliega.

*Alternativa descartada:* un workflow que cree el tag al hacer merge. Con un solo desarrollador y pocos cambios, un paso manual guiado por la regla de archive alcanza.

## Estrategia de pruebas

- **Unit (Vitest, dominio):**
  - `boardImageIds` y `clueImageIds`: tableros sin imágenes, con imágenes de pregunta, de respuesta y con ids repetidos.
  - `exchange`: la ida y vuelta conserva `answerImageId`; un archivo sin `answerImageId` se importa; se rechaza una imagen de respuesta ausente; un mismo id compartido se copia una sola vez.
  - `projectForTv`: sin revelar, no contiene `answerImageId`, el `imageId` es el de la pregunta y el JSON serializado no contiene el id de la respuesta. Revelada con imagen de respuesta, el `imageId` es el de la respuesta. Revelada sin imagen de respuesta, se mantiene la de la pregunta.
- **Almacenamiento (Vitest + fake-indexeddb):** `deleteBoard` y `deleteImageIfUnused` no borran una imagen usada como imagen de respuesta por otro tablero o sesión.
- **Componentes (Testing Library):**
  - `EditorScreen`: adjuntar, quitar y rechazar en el campo de respuesta, independiente del de pregunta.
  - `OperatorScreen`: la imagen de la respuesta se ve antes de revelar.
  - `TvScreen`: se muestra la imagen correcta según la fase.
- **E2E (Playwright):**
  - `editor.spec`: adjuntar una imagen de respuesta y verla tras recargar.
  - `boards.spec`: exportar e importar un tablero con imagen de respuesta.
  - `game.spec`: en la TV, la imagen de la respuesta no está antes de revelar y reemplaza a la de la pregunta después.

## CI

Sin cambios en el pipeline. Los tags se crean a mano al archivar y no disparan workflows: `ci.yml` solo reacciona a `push` de ramas y a `pull_request`.

## Risks / Trade-offs

- [Una de las cuatro implementaciones de ids no se migra] → Mitigación: la tarea de consolidación elimina las copias locales, y el lint y el typecheck fallan si alguna queda sin usar o sin importar.
- [Una app antigua en caché descarta la imagen de respuesta al importar] → Mitigación: riesgo aceptado. La PWA se actualiza al abrir con conexión.
- [El diálogo de la celda crece y en pantallas bajas necesita scroll] → Mitigación: vistas previas con altura máxima y el diálogo con `overflow: auto`.
- [Cambian los textos accesibles del campo de imagen] → Mitigación: los selectores de los tests se actualizan en la misma tarea para que el CI no quede rojo entre commits.

## Migration Plan

No hay migración de datos. Si hay que revertir, basta con revertir el PR. Los tableros que ya tengan `answerImageId` siguen abriendo en la versión anterior, que ignora ese campo; sus imágenes quedan guardadas pero sin mostrarse.
