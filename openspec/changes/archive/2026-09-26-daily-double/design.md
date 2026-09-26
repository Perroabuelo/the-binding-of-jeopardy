## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`. Así está el código hoy:

- `Clue` (`src/domain/board.ts`) tiene `value`, `question`, `answer`, `imageId?` y `answerImageId?`. Las ediciones de celda son parches puros (`ui/editor/boardEdits.ts`) que se aplican con `useBoardEditor` y se guardan automáticamente.
- `GamePhase` (`src/domain/game.ts`) es `board | clue { clueKey, revealed } | finished`. `gameReducer` es puro: una acción inválida devuelve **la misma referencia**. `award` suma `direction * clue.value` a cualquier equipo.
- La TV solo recibe un `TvView` que arma `projectForTv` (`src/domain/projection.ts`). Esa proyección ya es la barrera que impide que la respuesta llegue a la TV antes de revelarla, y los tests lo verifican sobre el objeto proyectado.
- La sesión completa (`GameSession`) se guarda en IndexedDB en cada cambio, y el operador la recupera tal cual al recargar.
- `exchange.ts` valida el archivo con zod. `z.object` descarta las claves desconocidas, así que hoy un campo nuevo en `Clue` se perdería al importar.

## Goals / Non-Goals

**Goals:**
- Toda la regla del Daily Double (fases, límites de apuesta, puntos) vive en `src/domain` como código puro, probado sin React.
- La TV no puede filtrar la pregunta ni la ubicación de los Daily Double, porque la proyección no las incluye.
- No hace falta migrar nada: los tableros, sesiones y archivos existentes siguen siendo válidos tal cual.

**Non-Goals:**
- Multiplicador de ronda (llega con `rondas`) y sonidos o animaciones.
- Concepto de "control del tablero".

## Decisions

### 1. Marca opcional en la celda

```ts
interface Clue {
  // ...
  /** Celda Daily Double. Ausente = false. */
  dailyDouble?: boolean;
}
```

Es opcional y se omite cuando es `false`, así los tableros guardados antes de este cambio quedan válidos sin migrar y `BOARD_SCHEMA_VERSION` se mantiene en 1. En el editor, `ClueDialog` agrega una casilla que emite el parche `{ dailyDouble }` por el mismo camino que `question` y `answer`. La celda del editor muestra una marca "DD".

*Alternativa descartada:* una lista `dailyDoubles: ClueKey[]` en `Board`. Se desincroniza al mover o quitar categorías (las claves son posicionales) y obligaría a tocar `moveCategory` y `removeCategory`. La marca en la celda viaja con ella.

### 2. Fase de apuesta separada de la fase de pista

```ts
type GamePhase =
  | { kind: 'board' }
  | { kind: 'wager'; clueKey: ClueKey }                        // Daily Double sin apuesta
  | { kind: 'clue'; clueKey: ClueKey; revealed: boolean;
      wager?: { teamId: string; amount: number } }             // presente solo en Daily Double
  | { kind: 'finished' };

type GameAction = ... | { type: 'placeWager'; teamId: string; amount: number };
```

- `openClue` sobre una celda con `dailyDouble` pasa a `wager` en lugar de `clue`.
- `placeWager` solo es válida en `wager`, con un equipo existente y un `amount` entero dentro de `[0, maxWager]`. Pasa a `clue` con `revealed: false` y la apuesta. Si no es válida, devuelve la misma referencia.
- En `wager`, `reveal` y `award` no hacen nada, por la regla actual de fase. `backToBoard` y `finish` aceptan `wager` y marcan la celda como usada, igual que en `clue`. `withOpenClueUsed` pasa a considerar ambas fases.
- `award` en una `clue` con `wager`: si `teamId !== wager.teamId` devuelve la misma referencia. En otro caso suma `direction * wager.amount`. Se puede aplicar varias veces, igual que hoy, para que el operador corrija un clic equivocado.
- `setScore` no cambia.

La apuesta no se puede editar después de registrarla, porque `placeWager` no es válida en `clue`. Un error se corrige con `setScore`.

*Alternativa descartada:* un solo `clue` con `wager?: ... | 'pending'`. Mezcla dos estados que la UI y la proyección tratan de forma totalmente distinta, y cada `if` tendría que distinguir los tres casos.

### 3. Límite de la apuesta como función pura

```ts
export function maxClueValue(board: Board): number;                        // board.ts
export function maxWager(session: GameSession, teamId: string): number;    // game.ts
// = Math.max(team.score, maxClueValue(session.boardSnapshot))
```

El operador usa `maxWager` para mostrar el máximo en el formulario y el reducer para validar. Así hay una sola fuente de verdad.

**Nota para `rondas`:** el valor más alto tendrá que incluir el multiplicador de la ronda en curso (x2 → 1000 en un tablero de 100 a 500). Por eso `maxWager` recibe la sesión y no solo el tablero: ese cambio solo tiene que modificar `maxWager`.

### 4. Proyección hacia la TV

```ts
TvView['phase'] =
  | ...
  | { kind: 'dailyDouble'; clueKey: ClueKey; value: ClueValue }     // sin question, sin imágenes
  | { kind: 'clue'; ...; dailyDouble?: { teamName: string; wager: number } };
```

- `wager` se proyecta a `dailyDouble` **sin** `question`, `imageId` ni `answer`. Es la misma técnica que se usa hoy para la respuesta no revelada: lo que no está en el objeto no puede aparecer en la TV.
- `TvView.categories[].clues[]` sigue con solo `key`, `value` y `used`. La marca `dailyDouble` no se copia, así que la TV no puede saber dónde están los Daily Double.
- El nombre de la categoría para el anuncio se obtiene de `categories[c].name` con `parseClueKey`, como ya lo hace `TvClue`.
- `isSyncMessage` no valida la forma interna de `view`, así que no hay que cambiar el protocolo.

### 5. Intercambio

`clueSchema` agrega `dailyDouble: z.boolean().optional()`, e `importBoard` lo copia solo si es `true`. `EXCHANGE_SCHEMA_VERSION` sigue en 1, porque el campo es aditivo y los archivos viejos lo omiten.

### 6. UI del operador

- **Tablero:** las celdas Daily Double sin usar muestran una marca, visible solo en la vista de operador. `BoardGrid` recibe un prop opcional con las claves marcadas, que la TV nunca pasa.
- **Fase `wager`:** panel con la pregunta y la respuesta, un selector de equipo, un campo numérico con "máximo N" (recalculado al cambiar de equipo) y el botón "Registrar apuesta", que se deshabilita si el monto está fuera de rango. También están disponibles "Volver al tablero" y la corrección manual de puntajes.
- **Fase `clue` con apuesta:** el panel actual muestra "Daily Double: Primos apuesta 800" y la lista de +/- solo incluye al equipo que apostó.

## Estrategia de pruebas

- **Unitarias (Vitest, dominio):**
  - `game.test.ts`: `openClue` sobre un Daily Double pasa a `wager`. Se prueban los límites de `placeWager`: 0, el máximo por puntaje, el máximo por tablero con puntaje negativo, fuera de rango, no entero y equipo inexistente, estos últimos devolviendo la misma referencia. También que `reveal` y `award` no hacen nada en `wager`, que `backToBoard` y `finish` desde `wager` marcan la celda usada, que `award` usa la apuesta y rechaza a otro equipo, y que `setScore` sigue funcionando.
  - `projection.test.ts`: en `wager`, el JSON serializado del `TvView` no contiene la pregunta ni el id de la imagen. En el tablero no aparece ninguna marca de Daily Double, y en `clue` con apuesta sí aparecen el equipo y el monto.
  - `exchange.test.ts`: ida y vuelta con marcas, y un archivo sin el campo que se importa sin marcas.
  - `board.test.ts`: `maxClueValue`.
- **Componentes (Testing Library):** en `EditorScreen`, marcar y desmarcar persiste. En `OperatorScreen`, el formulario de apuesta muestra el máximo, rechaza valores fuera de rango y deja solo los botones del equipo que apostó. En `TvScreen`, se muestra el anuncio sin la pregunta y luego el equipo y la apuesta.
- **e2e (Playwright, Chromium):** marcar una celda en el editor, jugar, abrir el Daily Double, comprobar que la TV muestra "DAILY DOUBLE!" sin el texto de la pregunta, registrar la apuesta, sumar y verificar el puntaje en ambas ventanas. Se suma un caso de recarga del operador en la fase de apuesta.

## CI

Sin cambios en el pipeline: los tests nuevos entran en los pasos existentes (lint → typecheck → unit → e2e → build).

## Risks / Trade-offs

- [Una sesión guardada con la app nueva, abierta por una app antigua en caché, no entiende la fase `wager`] → El service worker actualiza la app al abrirla con conexión (spec `offline-app`). El caso es improbable y, en el peor escenario, se inicia un juego nuevo.
- [Una app antigua que importa un archivo nuevo descarta las marcas en silencio] → Se acepta y queda en "Fuera de alcance". Subir la versión del formato para esto rompería la importación en apps antiguas sin necesidad.
- [El operador registra por error la apuesta a otro equipo] → No se puede editar la apuesta. El operador puede corregir con `setScore`, y la apuesta queda visible en el panel para detectar el error antes de sumar puntos.
- [Muchos Daily Double vuelven el juego tedioso] → Es decisión de quien arma el tablero, por diseño. No hay tope.

## Migration Plan

No hay migración de datos. Se despliega con el flujo habitual (merge a `main` → CI → GitHub Pages). Para volver atrás basta con revertir el merge: los tableros con marcas siguen abriéndose en la versión anterior, que ignora el campo.
