## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`.

**Depende de `daily-double` y `final-jeopardy`; se archiva después de ambos.** Este diseño parte del estado que dejan esos dos cambios implementados y archivados:

- `GamePhase = board | wager | clue { revealed, wager? } | final { stage, ... } | finished { finalSkipped? }`.
- `placeWager` y `maxWager(session, teamId)`, que hoy usa `Math.max(score, maxClueValue(boardSnapshot))`.
- `GameSession.finalEnabled?`, `startGame(..., { withFinal })`, `endBoard(session, now)` y `finalClueOf(session)`.
- Las fases de TV `dailyDouble` y `final`.

Cada bloque `MODIFIED` de las specs delta parte del texto más reciente de la cadena:

| Requisito | Parte de |
|---|---|
| `game-session` / "Iniciar un juego con equipos" | `final-jeopardy` |
| `game-session` / "Fin del juego y podio" | `final-jeopardy` |
| `game-session` / "Recuperar el juego en curso" | `final-jeopardy` (que ya incluye lo de `daily-double`) |
| `game-session` / "Asignar puntos por pregunta" | `daily-double` |
| `game-session` / "Registrar la apuesta de un Daily Double" | `daily-double` (ADDED ahí) |
| `game-session` / "Seleccionar una pregunta" | `openspec/specs` |
| `game-presentation` / "Reflejar el estado del juego" | `final-jeopardy` |
| `game-presentation` / "Tablero legible con cualquier cantidad de categorías" | `openspec/specs` |

Si `daily-double` o `final-jeopardy` cambian al implementarse, hay que revisar esos bloques antes de archivar este cambio.

Estado relevante del código (en `main`):

- `GameSession.boardSnapshot` es el único tablero de la partida. Lo usan `gameReducer`, `projectForTv`, `OperatorScreen` (título, `pendingCount`, `CluePanel`), `storage/db.ts` (`deleteBoard` conserva las imágenes que usa una sesión guardada) y `ui/editor/imageCleanup.ts` (igual, al borrar una imagen).
- `usedClues: ClueKey[]` con claves posicionales `c{categoría}-r{fila}`, sin información de ronda.
- `TvView.categories[].clues[].value` es `ClueValue` (100 a 500), y el operador dibuja su tablero con esa misma proyección (`projectForTv(session).categories`).
- `TeamSetupScreen` se abre desde un tablero (`#/boards/:id/play`) y solo carga ese tablero.
- Las sesiones se guardan tal cual en IndexedDB (`sessions`), sin versión.

## Goals / Non-Goals

**Goals:**
- Toda la regla de rondas (armado, validación, multiplicadores, transición, terminar ronda o juego) vive en `src/domain` como código puro, probado sin React.
- Un juego sin rondas se comporta exactamente como antes: es una partida de una ronda en x1.
- Los tableros y el formato de intercambio no cambian.
- Las sesiones guardadas con la forma anterior siguen reanudándose.

**Non-Goals:**
- Plantillas de partida reutilizables.
- Modelar las rondas dentro del `Board`.

## Decisions

### 1. La sesión guarda rondas en lugar de un único tablero

```ts
export const MIN_ROUNDS = 2;          // con "Jugar con rondas" activo
export const MAX_ROUNDS = 5;
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 10;

interface GameRound {
  /** Copia del tablero al iniciar. */
  boardSnapshot: Board;
  multiplier: number;                 // entero 1..10
}

interface GameSession {
  id: string;
  rounds: GameRound[];                // 1 sin rondas; 2..5 con rondas
  roundIndex: number;                 // ronda en curso, desde 0
  teams: Team[];
  usedClues: ClueKey[];               // solo de la ronda en curso
  phase: GamePhase;
  finalEnabled?: boolean;
  updatedAt: number;
}

export function currentRound(session: GameSession): GameRound;
export function sessionBoards(session: GameSession): Board[];   // todos los snapshots
```

- `boardSnapshot` desaparece de `GameSession`. Todos los usos pasan por `currentRound(session).boardSnapshot`, salvo los de imágenes (`deleteBoard`, `deleteImageIfUnused`), que usan `sessionBoards` para conservar las imágenes de **todas** las rondas.
- **`usedClues` se reinicia al iniciar cada ronda.** Las rondas terminadas no se vuelven a jugar, así que no hace falta recordar sus celdas. Las claves `ClueKey` no cambian y todo lo que depende de ellas (`getClue`, `parseClueKey`, `allClueKeys`, la TV) sigue igual.
- El título de la partida es el del tablero de la ronda en curso.

*Alternativa descartada:* mantener `boardSnapshot` como "tablero en curso" y agregar `rounds?` aparte. Evita normalizar las sesiones viejas, pero duplica el tablero en curso y abre la puerta a que ambos se desincronicen.

*Alternativa descartada:* claves de celda con ronda (`r1-c2-r3`). Obliga a cambiar el tipo `ClueKey`, `parseClueKey` y la TV, sin ninguna ventaja, porque nunca se consultan celdas de otra ronda.

### 2. Normalizar sesiones guardadas antes de este cambio

```ts
/** Acepta la forma anterior ({ boardSnapshot }) y devuelve la actual. Pura. */
export function normalizeSession(raw: unknown): GameSession;
```

Si la sesión trae `boardSnapshot` y no trae `rounds`, se convierte en `rounds: [{ boardSnapshot, multiplier: 1 }]` con `roundIndex: 0`. `getSession` la aplica al leer, y `deleteBoard` y `deleteImageIfUnused` la aplican al recorrer las sesiones. No hay migración de IndexedDB (`DB_VERSION` no cambia): la forma vieja se convierte al leerla y se guarda con la forma nueva en el siguiente cambio del operador.

### 3. `startGame` con rondas

```ts
interface RoundSetup { board: Board; multiplier: number }

startGame(rounds: readonly RoundSetup[], teamNames, { sessionId, now, makeTeamId, withFinal })
```

- Sin rondas, la UI llama con `[{ board, multiplier: 1 }]`.
- `startGame` lanza un error con un mensaje en español cuando:
  - hay menos de 1 o más de `MAX_ROUNDS` rondas;
  - algún tablero no está listo (`validateBoard`);
  - hay dos rondas con el mismo `board.id`;
  - algún multiplicador no es un entero entre 1 y 10;
  - `withFinal` está activo y la pista final **del tablero de la última ronda** no está completa.
- El mínimo de 2 rondas es una regla de la UI (el toggle activo exige agregar la segunda ronda). En el dominio, una sola ronda es la partida sin rondas.
- **Tableros repetidos no se permiten.** Jugar dos veces las mismas preguntas no tiene sentido en una partida, y la regla evita un error fácil al elegir en la lista.

### 4. Valores multiplicados en un solo lugar

```ts
export function clueValueInPlay(session: GameSession, clue: Clue): number;
// = clue.value * currentRound(session).multiplier
```

- `award` suma `direction * clueValueInPlay(...)` (salvo en Daily Double, donde sigue usando la apuesta).
- `maxWager` pasa a `Math.max(team.score, maxClueValue(board) * multiplier)`, con el tablero y el multiplicador de la ronda en curso. Es el único cambio que anticipó `daily-double`.
- `projectForTv` proyecta los valores ya multiplicados en `categories[].clues[].value`, en la fase `clue` y en la fase `dailyDouble`. El tipo de esos campos pasa de `ClueValue` a `number`. Como el operador dibuja su tablero con la misma proyección, también ve los valores multiplicados sin cambios extra.
- El `CluePanel` del operador muestra y rotula los botones con `clueValueInPlay`.

### 5. Transición entre rondas como fase propia

```ts
type GamePhase = ... | { kind: 'roundBreak'; nextRoundIndex: number };

type GameAction = ...
  | { type: 'finishRound' }           // "Terminar ronda"
  | { type: 'startNextRound' };
```

- Una función pura `endRound(session, now)` decide qué pasa al terminar una ronda. Si hay otra ronda después, pasa a `roundBreak` con `nextRoundIndex: roundIndex + 1`. Si no, delega en `endBoard` de `final-jeopardy`, que lleva al Final o al podio.
- `backToBoard`, cuando se usaron todas las celdas de la ronda, llama a `endRound` en lugar de `endBoard`.
- `finishRound` es válida en `board`, `wager` y `clue`, y solo si hay una ronda siguiente. Si no, devuelve la misma referencia. Marca la celda abierta como usada (por coherencia con `finish`) y llama a `endRound`.
- `finish` ("Terminar juego") no cambia: llama a `endBoard` desde cualquier ronda, aunque queden rondas pendientes. Así, terminar el juego en la ronda 1 lleva directo al Final si está activo, que es el cierre esperado.
- `startNextRound` es válida solo en `roundBreak`. Fija `roundIndex = nextRoundIndex`, vacía `usedClues` y pasa a `board`.
- En `roundBreak`, `openClue`, `reveal`, `award`, `placeWager`, `backToBoard` y las acciones del Final no hacen nada. `setScore` y `finish` sí.
- `finalClueOf(session)` pasa a leer `rounds.at(-1).boardSnapshot.final`.

*Alternativa descartada:* pasar de ronda automáticamente, sin transición. El operador pierde el momento para anunciar la ronda y la TV no tiene cuándo mostrar la pantalla de transición.

### 6. Proyección hacia la TV

```ts
interface TvView {
  // ...
  title: string;                                            // del tablero de la ronda en curso
  round?: { number: number; count: number; multiplier: number };  // solo con 2+ rondas
  phase: ... | {
    kind: 'roundBreak';
    number: number;           // ronda siguiente, desde 1
    count: number;
    multiplier: number;
    title: string;            // título del tablero siguiente
  };
}
```

- `round` sale solo si la partida tiene más de una ronda. Sin rondas, la TV no muestra indicador.
- En `roundBreak`, `categories` sigue siendo el tablero de la ronda que terminó, pero la TV no lo dibuja. La proyección **no** copia nada de las celdas del tablero siguiente: solo su título. La pantalla muestra además `teams`, que ya viaja en el `TvView`.
- `isSyncMessage` no valida la forma interna de `view`, así que no cambia el protocolo.

### 7. UI

- **`TeamSetupScreen`:**
  - Casilla "Jugar con rondas", desactivada por defecto.
  - Al activarla aparece la lista de rondas. La ronda 1 viene con el tablero actual, y "Agregar ronda" agrega una fila con un selector de tablero y un campo de multiplicador que parte en el número de ronda. Cada fila tiene "Quitar", salvo cuando hay 2.
  - El selector lista solo los tableros listos (`listBoards` + `validateBoard`) y deshabilita los que ya se usan en otra ronda.
  - Se valida en vivo con el mismo mensaje del dominio, llamando a una función pura `validateRounds(rounds)` que también usa `startGame`.
  - La casilla del Final se recalcula según el tablero de la última ronda.
- **`OperatorScreen`:**
  - Con rondas, muestra "Ronda N de M · xK" junto al título.
  - En `roundBreak`, un panel con la ronda siguiente, su multiplicador y su tablero, y el botón "Comenzar ronda N".
  - Muestra "Terminar ronda" (con confirmación: "¿Terminar la ronda N? Quedan X preguntas sin usar.") solo si hay una ronda siguiente, junto a "Terminar juego".
  - `pendingCount` usa el tablero de la ronda en curso.
- **`TvScreen`:** indicador de ronda en la cabecera y pantalla de transición a pantalla completa con los puntajes.
- **`ui/game/BoardGrid`:** la escala de letra de los valores considera valores de 4 cifras (hasta 5000) además del número de columnas.

## Estrategia de pruebas

- **Unitarias (Vitest, dominio):**
  - `game.test.ts`:
    - `startGame`: una ronda en x1 equivale a la partida de hoy. Rechaza 6 rondas, un tablero repetido, un tablero no listo, multiplicadores 0, 11 y 1.5, y `withFinal` cuando solo la primera ronda tiene pista final. Acepta `withFinal` cuando la tiene la última.
    - `award` en x2 suma el doble y `award` en un Daily Double en x2 sigue usando la apuesta.
    - `maxWager` en x2 con un tablero de 100 a 500 es 1000, y con puntaje 1200 es 1200.
    - `backToBoard` tras la última celda de la ronda 1 de 2 pasa a `roundBreak`, y tras la última de la ronda 2 va al Final o al podio.
    - `finishRound` desde `board` y desde `clue` (la celda queda usada) pasa a `roundBreak`, y en la última ronda devuelve la misma referencia.
    - `finish` en la ronda 1 de 3 va al podio sin Final, y al Final con Final activo.
    - `startNextRound` vacía `usedClues`, avanza `roundIndex` y conserva los puntajes. En `roundBreak`, `openClue` no hace nada y `setScore` sí.
    - `finalClueOf` usa la última ronda.
    - `normalizeSession` convierte una sesión con `boardSnapshot` y deja igual una sesión nueva.
  - `projection.test.ts`: valores multiplicados en `categories`, en `clue` y en `dailyDouble`. `round` ausente sin rondas y presente con rondas. En `roundBreak`, `JSON.stringify(view)` no contiene ninguna pregunta, respuesta ni id de imagen del tablero siguiente, y sí su título.
  - `db.test.ts`: `deleteBoard` conserva las imágenes que usa la ronda 2 de una sesión guardada, y lee sesiones con la forma anterior.
- **Componentes (Testing Library):**
  - `TeamSetupScreen`: el toggle muestra las rondas, el multiplicador por defecto es 2 en la segunda ronda, un tablero ya elegido está deshabilitado en otra ronda, un multiplicador fuera de rango muestra el error, el tope de 5 rondas deshabilita "Agregar ronda" y la casilla del Final depende de la última ronda.
  - `OperatorScreen`: el indicador de ronda, los botones con el valor multiplicado, el panel de transición con "Comenzar ronda 2", "Terminar ronda" con confirmación y su ausencia en la última ronda, y reanudar una sesión con la forma anterior.
  - `TvScreen`: el indicador de ronda, la pantalla de transición con los puntajes y los valores multiplicados.
- **e2e (Playwright, Chromium):**
  - Crear dos tableros listos, iniciar con rondas (x1 y x2), jugar una celda de la ronda 1, "Terminar ronda", verificar la transición en la TV, comenzar la ronda 2, verificar que la TV muestra los valores multiplicados, sumar puntos y verificar el puntaje en ambas ventanas.
  - Recargar el operador en la transición.
  - En `game.spec.ts`, el tablero de 8 categorías en x10 sin desplazamiento horizontal ni valores cortados a 1920x1080.

## CI

No cambia el pipeline: los tests nuevos entran en los pasos existentes (lint → typecheck → unit → e2e → build).

## Risks / Trade-offs

- [Quitar `boardSnapshot` toca muchos archivos a la vez] → Primero se agregan `currentRound` y `sessionBoards` y se reemplazan los usos en un commit de dominio con sus tests. La UI se adapta después.
- [Una app antigua en caché abre una sesión con la forma nueva] → El service worker actualiza la app al abrirla con conexión (spec `offline-app`). En el peor caso, la app antigua no encuentra `boardSnapshot` y se inicia un juego nuevo.
- [Valores de 4 cifras no caben en 8 columnas] → La escala de letra de `BoardGrid` considera la cantidad de cifras y el e2e a 1920x1080 lo verifica.
- [Un tablero usado en una partida se borra durante el juego] → No cambia: la sesión guarda copias (`boardSnapshot` por ronda) y `deleteBoard` conserva las imágenes de todas las rondas.
- [Partidas largas] → Es decisión del anfitrión. El tope de 5 rondas evita configuraciones absurdas.

## Migration Plan

No hay migración de tableros ni de IndexedDB. Las sesiones con la forma anterior se normalizan al leerlas. Se despliega con el flujo habitual: merge a `main` después de `daily-double` y `final-jeopardy`, luego CI y GitHub Pages. Para volver atrás se revierte el merge. Una sesión guardada con rondas no se puede reanudar en la versión anterior, pero los tableros no se ven afectados.
