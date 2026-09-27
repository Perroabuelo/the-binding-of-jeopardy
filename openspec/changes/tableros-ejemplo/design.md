## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/board-storage/spec.md`.

Estado relevante del código:

- `BoardListScreen.createBoard` crea un tablero con `createEmptyBoard(newId(), Date.now())`, lo guarda con `saveBoard`, lo respalda con `boardBackup.backupNow` (que no hace nada en la web) y navega al editor.
- `handleImport` guarda el tablero importado y lo pone primero en la lista en memoria, con un aviso en `role="status"`.
- `validateBoard` decide si un tablero está listo para jugar, e `isFinalComplete` si la pista final está completa. El panel de Jugar y la configuración de rondas usan esas dos funciones.
- `ConfirmDialog` es el único diálogo modal de la app (backdrop, foco inicial y Escape).
- El modelo `Board` ya soporta todo lo que necesitan los ejemplos (`dailyDouble`, `final`). No hace falta cambiarlo.

## Goals / Non-Goals

**Goals:**
- Los ejemplos son datos puros en `src/domain`, sin React ni almacenamiento, y se prueban con las mismas funciones de validación que usa la app.
- Crear desde un ejemplo usa el mismo camino de guardado y respaldo que "Nuevo tablero" e "Importar tablero".

**Non-Goals:**
- Marcar los tableros creados desde un ejemplo. Una vez creados son tableros comunes, sin campo nuevo en `Board`.
- Cargar los ejemplos a pedido (lazy import). Son unos pocos KB de texto.

## Decisions

### 1. Los ejemplos como datos TypeScript en `src/domain/samples/`

Un archivo por ejemplo (`agriculture.ts`, `videogames.ts`, `kpop.ts`) exporta un `SampleBoard`:

```ts
interface SampleBoard {
  id: 'agricultura' | 'videojuegos' | 'kpop'; // clave estable del ejemplo, no el id del tablero
  title: string;
  description: string;
  categories: { name: string; clues: { question: string; answer: string; dailyDouble?: true }[] }[];
  final: { category: string; question: string; answer: string };
}
```

`src/domain/samples/index.ts` exporta `SAMPLE_BOARDS` (en el orden del diálogo) y
`createBoardFromSample(sample, id, now): Board`, que:

- asigna los valores `CLUE_VALUES` por posición (el ejemplo no repite 100…500),
- copia en profundidad los textos, para que editar la copia nunca toque el ejemplo,
- usa `id` y `now` recibidos como parámetros (código puro y testeable) para `id`, `createdAt` y `updatedAt`, con `schemaVersion: BOARD_SCHEMA_VERSION`.

*Alternativa descartada:* guardar los ejemplos como archivos `.jeopardy.json` en `public/` e importarlos con `importBoard`. Reutilizaría el importador, pero obliga a un `fetch` (que el service worker debe cachear para funcionar sin conexión y que en escritorio pasa por el servidor estático), agrega un caso de error de red y hace los datos más difíciles de revisar y tipar. Los tipos de TypeScript además garantizan la forma al compilar.

### 2. Un Daily Double por ejemplo, en filas de 300 a 500

Un solo Daily Double por tablero, como en la primera ronda del programa, en una celda de valor medio o alto y en una categoría distinta en cada ejemplo. Un test verifica que haya exactamente uno.

### 3. Diálogo de elección con `SampleDialog`

Un componente nuevo en `src/ui/boards/SampleDialog.tsx`, con el mismo patrón de `ConfirmDialog` (backdrop, `role="dialog"`, `aria-modal`, Escape y "Cancelar" cierran). Muestra un botón por ejemplo con el título y la descripción. Se reutiliza el CSS del diálogo existente donde se pueda.

*Alternativa descartada:* un `<select>` o un menú desplegable junto al botón. El diálogo deja espacio para la descripción y es más claro en pantallas táctiles.

### 4. Después de crear: se queda en la lista

Al elegir un ejemplo, el diálogo se cierra, el tablero nuevo aparece primero en la lista y el aviso dice `Se creó "<título>" desde el ejemplo.`, igual que al importar. No navega al editor: el tablero ya está completo, y lo más probable es jugarlo o crear otro ejemplo para una partida con rondas. Si el guardado falla, se muestra el error con `errorMessage(e, 'No se pudo crear el tablero.')` y la lista no cambia.

### 5. Contenido: estable, verificable y sin datos personales

- Solo hechos de conocimiento público y estables en el tiempo: nada de "el último álbum", récords vigentes, ventas o cifras que cambian.
- En K-pop: fechas de debut, nombres de grupos, fandoms y canciones conocidas, sin información privada de los artistas.
- Respuestas cortas, que el operador pueda leer de un vistazo.
- Dificultad creciente de 100 a 500 dentro de cada categoría.
- Cada ejemplo se revisa al implementarlo, y el PR lista las categorías para que el usuario revise el contenido antes de fusionar.

### 6. Mensaje de lista vacía

Pasa a: "Todavía no hay tableros. Crea uno nuevo o parte desde un ejemplo." No se cambia nada más de la lista.

## Estrategia de pruebas

- **Unitarias (`src/domain/samples/samples.test.ts`):** para cada ejemplo, `createBoardFromSample` da un tablero con `validateBoard(board).ready === true`, 6 categorías de valores 100 a 500, exactamente un Daily Double, `isFinalComplete(board.final)`, título y descripción no vacíos. Las claves de los ejemplos son únicas. Dos llamadas con ids distintos dan tableros independientes: mutar uno no cambia el otro ni `SAMPLE_BOARDS`. La ida y vuelta `exportBoard` → `importBoard` conserva el contenido, el Daily Double y la pista final.
- **Componentes (`BoardListScreen.test.tsx`):** el botón abre el diálogo con los tres ejemplos; elegir uno lo guarda (`listBoards`) y lo muestra primero con el aviso; crear dos veces da dos tableros; Escape cierra sin crear; con la lista vacía no se crea nada solo y el mensaje menciona los ejemplos; un fallo de `saveBoard` muestra el error. En escritorio simulado (`installDesktop`), crear un ejemplo llama a `backup.writeBoard`.
- **E2E web (`e2e/boards.spec.ts`):** crear el ejemplo de videojuegos desde la lista, abrirlo y ver en el panel de Jugar que está listo y con la pista final completa.
- **E2E escritorio:** no se agrega uno nuevo. El respaldo es el mismo `boardBackup.backupNow` que ya cubre `e2e-desktop/backup.spec.ts`, y el test de componente verifica que se llame.

## CI

Sin cambios en el pipeline. Los tests nuevos entran en los jobs `checks` y `e2e` existentes.

## Risks / Trade-offs

- [Un dato del contenido está mal o queda desactualizado] → Solo hechos estables (decisión 5), revisión del usuario en el PR y la copia siempre es editable.
- [Crecer el bundle] → Son unos 10 KB de texto sin comprimir entre los tres. Aceptable. Si crece, se puede pasar a `import()` dinámico sin cambiar la spec.
- [Cambiar un ejemplo en una versión futura no actualiza las copias ya creadas] → Es lo esperado: la copia es del usuario. Queda en "Fuera de alcance".

## Migration Plan

Sin migración: no cambian `Board`, IndexedDB ni el formato de intercambio. Revertir el cambio deja los tableros ya creados desde ejemplos como tableros comunes.
