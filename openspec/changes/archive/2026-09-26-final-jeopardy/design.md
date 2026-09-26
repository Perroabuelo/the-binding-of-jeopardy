## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`.

**Depende de `daily-double`; se archiva después.** Este diseño parte del estado que deja `daily-double` una vez implementado y archivado:

- `GamePhase = board | wager | clue { revealed, wager? } | finished`.
- La acción `placeWager` y `maxWager(session, teamId)`.
- La fase de TV `dailyDouble`.
- `Clue.dailyDouble?`.

Los bloques `MODIFIED` de "Recuperar el juego en curso" (`game-session`) y "Reflejar el estado del juego" (`game-presentation`) parten del texto que deja `daily-double`, con todos sus escenarios. "Iniciar un juego con equipos" y "Fin del juego y podio" no los toca `daily-double`, así que parten del texto de `openspec/specs`. Si `daily-double` cambia al implementarse, hay que revisar esos bloques antes de archivar este cambio.

Estado relevante del código:

- `Board` (`src/domain/board.ts`) no tiene campos por encima de las categorías más que el título. `boardImageIds` es la única fuente de "qué imágenes usa un tablero": la usan la exportación, el borrado de tableros (`storage/db.ts`) y la limpieza de imágenes (`ui/editor/imageCleanup.ts`).
- `validateBoard` decide si el tablero está "listo para jugar", y `startGame` lo exige.
- `gameReducer` es puro: una acción inválida devuelve **la misma referencia**. `backToBoard` y `finish` son los dos únicos caminos a `finished`.
- La TV solo recibe el `TvView` que arma `projectForTv`. Esa proyección es la barrera contra filtraciones, y sus tests la verifican sobre el objeto serializado.
- El service worker (`vite-plugin-pwa`) precachea `**/*.{js,css,html,svg,png,ico,webmanifest}`. Un archivo de audio hoy **no** quedaría disponible sin conexión.
- La TV es una ventana abierta con `window.open`. No recibe gestos del usuario, así que su política de autoplay puede bloquear el audio.

## Goals / Non-Goals

**Goals:**
- Toda la regla del Final vive en `src/domain` como código puro, probado sin React: participantes, límites, etapas, orden de revelación y puntajes.
- La TV no puede filtrar la pregunta, las apuestas ni la respuesta, porque la proyección no las incluye hasta su momento.
- No hay que migrar nada: los tableros, sesiones y archivos existentes siguen siendo válidos tal cual.
- El temporizador es recuperable: se guarda como un instante, no como un contador en memoria.

**Non-Goals:**
- Apuestas y respuestas desde celulares (`pulsadores`), ni un Final de varias rondas (`rondas`).
- Una capa de audio general. Solo hay una pista y la reproduce un solo componente.

## Decisions

### 1. Pista final como campo opcional del tablero

```ts
interface FinalClue {
  category: string;
  question: string;
  answer: string;
  imageId?: string;        // imagen de la pregunta
  answerImageId?: string;
}
interface Board { /* ... */ final?: FinalClue }
```

- Es opcional y se omite cuando está vacía, así los tableros viejos siguen válidos sin migrar y `BOARD_SCHEMA_VERSION` se mantiene en 1.
- `isFinalComplete(final)` en `validation.ts` exige categoría, pregunta y respuesta no vacías. `validateBoard` **no** la usa: el Final nunca bloquea "listo para jugar".
- `boardImageIds` incluye las imágenes de `final`. Con eso, exportar, borrar tableros y limpiar imágenes huérfanas las cubren sin más cambios. Una función `finalImageIds(final)` sigue el patrón de `clueImageIds`.
- El editor muestra una sección "Pista final" debajo del tablero, con los tres campos de texto y dos `ClueImageField`, reutilizando la validación de formato y tamaño. Las ediciones son parches puros en `boardEdits.ts` (`{ final: ... }`) por el mismo camino del guardado automático. Si los cinco campos quedan vacíos, el parche elimina `final`.
- `ReadinessPanel` agrega una línea informativa: "Pista final: completa, incompleta o sin pista final". No bloquea.

*Alternativa descartada:* modelar el Final como una "categoría especial" dentro de `categories`. Rompe la invariante de 5 celdas por categoría, que usan `allClueKeys`, `validateBoard`, el esquema de intercambio y la TV.

### 2. Toggle al iniciar: `finalEnabled` en la sesión

```ts
interface GameSession { /* ... */ finalEnabled?: boolean }   // ausente = false
startGame(board, teamNames, { ..., withFinal?: boolean })
```

- `startGame` lanza un error si `withFinal` es `true` y la pista final no está completa. Así el reducer puede confiar en `boardSnapshot.final` cuando `finalEnabled` es `true`.
- En `TeamSetupScreen`, la casilla "Jugar Final Jeopardy!" solo aparece habilitada con una pista final completa, y en ese caso viene marcada.
- Como el campo es opcional, las sesiones guardadas antes de este cambio siguen funcionando sin Final.
- **Nota para `rondas`:** la pista final saldrá del tablero de la última ronda. Hoy es `boardSnapshot.final`. `rondas` solo tiene que cambiar la función `finalClueOf(session)`, que encapsula ese acceso.

### 3. Fase `final` con etapas

```ts
type GamePhase =
  | ...                                    // board | wager | clue (de daily-double)
  | {
      kind: 'final';
      stage: 'wagers' | 'clue' | 'reveal';
      /** Fijados al entrar, ya en orden de revelación (puntaje ascendente, estable). */
      participants: { teamId: string; entryScore: number }[];
      wagers: Record<string, number>;
      timerStartedAt?: number;             // ms epoch; se reemplaza al reiniciar
      judged: { teamId: string; correct: boolean }[];
      answerRevealed: boolean;
    }
  | { kind: 'finished'; finalSkipped?: 'noPositiveScores' };

type GameAction = ...
  | { type: 'setFinalWager'; teamId: string; amount: number }
  | { type: 'showFinalClue' }
  | { type: 'startFinalTimer' }
  | { type: 'startFinalReveal' }
  | { type: 'judgeFinal'; teamId: string; correct: boolean }
  | { type: 'revealFinalAnswer' };
```

- **Entrada.** `backToBoard`, cuando se usaron todas las celdas, y `finish`, desde `board`, `wager` o `clue`, llaman a una función pura `endBoard(session, now)`. Sin `finalEnabled`, pasa a `finished` como hoy. Con `finalEnabled`, calcula los participantes (equipos con `score > 0`, ordenados por puntaje ascendente y con `sort` estable para que los empates respeten el orden de definición). Si no hay ninguno, pasa a `finished` con `finalSkipped: 'noPositiveScores'`. Si hay, pasa a `final` en la etapa `wagers`.
- **`setFinalWager`** es válida solo en `wagers`, para un participante y con un entero entre `0` y `entryScore`. Puede sobrescribir una apuesta anterior. El máximo es `entryScore` y no el puntaje actual, así una corrección manual con `setScore` durante el Final no cambia las reglas en medio de la etapa. Esta es la regla del programa y difiere del Daily Double: no usa `maxClueValue`.
- **`showFinalClue`**: de `wagers` a `clue`, solo si todos los participantes tienen apuesta.
- **`startFinalTimer`**: solo en `clue`. Fija `timerStartedAt = now`. Llamarla otra vez reinicia el temporizador.
- **`startFinalReveal`**: de `clue` a `reveal`, en cualquier momento. No exige que el temporizador haya terminado ni que se haya iniciado.
- **`judgeFinal`**: solo en `reveal` y solo para el siguiente participante sin juzgar, `participants[judged.length]`. Suma o resta `wagers[teamId]` y agrega el equipo a `judged`. Por eso un equipo no se puede juzgar dos veces.
- **`revealFinalAnswer`**: solo en `reveal`. Pone `answerRevealed` en `true`.
- **`finish` en `final`** pasa a `finished` sin aplicar las apuestas pendientes. La UI la usa de dos formas: "Ir al podio", sin confirmación, cuando todos están juzgados, y "Terminar juego", con confirmación, antes de eso.
- `openClue`, `reveal`, `award` y `placeWager` no hacen nada en `final`, por la regla de fase. `setScore` sigue permitida.
- **Tiempo:** `FINAL_TIMER_MS = 30_000` y `finalTimeRemaining(phase, now)` son puras. La UI hace tic cada 250 ms y consulta la función. El reducer no modela el "fin del tiempo" como una transición: es una propiedad derivada del instante guardado. Por eso, al recargar, el tiempo continúa sin hacer nada especial.

*Alternativa descartada:* tres fases separadas (`finalWagers`, `finalClue`, `finalReveal`). Repetiría `participants` y `wagers` en cada una y multiplicaría los `case`. Con una fase y un `stage`, todo el estado del Final queda en un solo objeto que se guarda y proyecta junto.

### 4. Proyección hacia la TV

```ts
TvView['phase'] = ... | {
  kind: 'final';
  stage: 'wagers' | 'clue' | 'reveal';
  category: string;
  participants: { teamId: string; name: string }[];
  wagersReady: number;                                   // solo un conteo
  question?: string;                                     // desde 'clue'
  imageId?: string; imageRole?: TvImageRole;             // como en 'clue'
  timerEndsAt?: number;                                  // timerStartedAt + 30 s
  judged?: { name: string; correct: boolean; wager: number; score: number }[];
  currentTeamName?: string;                              // en 'reveal'
  answer?: string;                                       // solo con answerRevealed
} | { kind: 'finished'; ranking: ...; finalSkipped?: 'noPositiveScores' };
```

- En `wagers`, la proyección **no** copia `question`, las imágenes ni `answer`. De las apuestas solo sale `wagersReady` (un número), nunca los montos.
- En `reveal`, el monto de un equipo sale solo cuando ese equipo está en `judged`.
- La imagen sigue la regla vigente: la de la respuesta reemplaza a la de la pregunta solo con `answerRevealed`, y hasta entonces su id no sale.
- `timerEndsAt` es absoluto. La TV calcula el tiempo restante con su propio reloj, que hoy es el mismo, porque ambas ventanas corren en el mismo equipo. **Nota para `app-escritorio` y `pulsadores`:** con clientes en otros dispositivos habrá que enviar el tiempo restante o corregir el desfase de reloj.

### 5. Música: la reproduce el operador

- El archivo `public/audio/final-jeopardy.mp3` es una pieza CC0 de al menos 30 s y menos de 1 MB. Su fuente (URL), autor y licencia quedan en `public/audio/CREDITS.md` y en una sección "Créditos" del README. **No** puede ser el tema original del programa ni una imitación de su melodía. Se elige de un catálogo con filtro CC0, como Freesound u OpenGameArt, al implementar la tarea.
- Suena en la **vista de operador**. El clic en "Iniciar temporizador" es un gesto del usuario, así que el autoplay nunca lo bloquea. En una fiesta, el notebook del operador suele estar conectado a la TV por HDMI, así que el audio sale por la TV de todos modos.
- Un hook `useFinalMusic` (en `ui/game/`) maneja un único `HTMLAudioElement`:
  - Al iniciar o reiniciar el temporizador: `currentTime = 0` y `play()`.
  - Se detiene cuando el tiempo llega a 0, cuando se pasa a `reveal` o cuando se desmonta el componente.
  - Silenciar usa `muted`. La preferencia se guarda en `localStorage`, envuelta en try/catch, porque es una comodidad por operador y no estado del juego.
- **Al recargar** con el temporizador corriendo, la cuenta regresiva continúa pero la música **no** vuelve a sonar: no hay gesto del usuario y retomarla a mitad sería confuso. El operador puede reiniciar el temporizador si quiere la música.
- **Sin conexión:** se agrega `mp3` a `workbox.globPatterns` en `vite.config.ts`, así el audio queda precacheado junto con el build.

*Alternativa descartada:* reproducir en la TV. La ventana de la TV no tiene gesto propio y Chromium puede bloquear el `play()`. Además habría que sincronizar el silencio entre ventanas.

### 6. Intercambio

`boardSchema` agrega `final` opcional (tres strings y dos ids de imagen opcionales). `importBoard` reasigna los ids de las imágenes de `final` con el mismo mapa que las celdas, y lanza `ImportError` si falta una imagen o está dañada. `EXCHANGE_SCHEMA_VERSION` sigue en 1, porque el campo es aditivo.

### 7. UI del operador por etapa

- **`wagers`:**
  - Categoría, pregunta y respuesta, visibles solo para el operador.
  - Lista de participantes, cada uno con un campo de monto, "máx. N" y "Anotar".
  - Lista de "no participan".
  - "Mostrar pista", deshabilitado hasta tener todas las apuestas.
- **`clue`:**
  - Pregunta y respuesta.
  - Cuenta regresiva grande.
  - "Iniciar temporizador" (se convierte en "Reiniciar"), "Silenciar/Activar música" y "Pasar a la revelación".
- **`reveal`:**
  - Equipo en turno con su respuesta esperada y su apuesta.
  - "Acertó" y "Falló".
  - Historial de equipos ya juzgados.
  - "Mostrar respuesta en la TV".
  - "Ir al podio" cuando todos están juzgados.
- "Terminar juego" sigue disponible, con una confirmación que dice que las apuestas pendientes no se aplicarán.
- El podio muestra el aviso de `finalSkipped` cuando corresponde.

## Estrategia de pruebas

- **Unitarias (Vitest, dominio):**
  - `validation.test.ts`: `isFinalComplete` con cada campo vacío. `validateBoard` no cambia con una pista final ausente o incompleta.
  - `board.test.ts`: `boardImageIds` incluye las imágenes de `final`.
  - `exchange.test.ts`: ida y vuelta con `final` e imágenes. Un archivo sin `final` se importa sin pista final. Una imagen faltante de `final` lanza `ImportError`.
  - `game.test.ts`:
    - `startGame` con `withFinal` y sin pista final completa lanza un error.
    - La entrada al Final desde `backToBoard` y desde `finish`.
    - Los participantes y su orden (1200/400/800 → Tíos, Abuelos, Primos, con un empate estable).
    - Salto a `finished` con `finalSkipped` cuando nadie tiene más de 0.
    - Límites de `setFinalWager` (0, `entryScore`, `entryScore + 1`, negativo, no entero, no participante), que devuelven la misma referencia.
    - Sobrescribir una apuesta.
    - `showFinalClue` con apuestas faltantes.
    - `startFinalTimer` reinicia.
    - `judgeFinal` fuera de turno, repetido, con acierto (+apuesta) y con fallo (-apuesta).
    - `finish` desde `final` no aplica las apuestas pendientes.
    - `setScore` durante el Final no cambia `entryScore`.
    - `finalTimeRemaining` en 0 s, 10 s, 30 s y 45 s.
  - `projection.test.ts`:
    - En `wagers`, `JSON.stringify(view)` no contiene la pregunta, la respuesta, los ids de sus imágenes ni ningún monto anotado.
    - En `clue`, no contiene la respuesta y sí `timerEndsAt`.
    - En `reveal`, solo contiene los montos de los juzgados, y la respuesta solo con `answerRevealed`.
    - Se proyecta `finalSkipped`.
- **Componentes (Testing Library):**
  - `EditorScreen`: editar la pista final persiste, el estado completa/incompleta se muestra y jugar sigue habilitado.
  - `TeamSetupScreen`: la casilla está habilitada y marcada solo con una pista final completa.
  - `OperatorScreen`, con `HTMLMediaElement.prototype.play` y `pause` simulados:
    - Las apuestas con su máximo.
    - "Mostrar pista" deshabilitado.
    - El temporizador llama a `play` y silenciar pone `muted`.
    - "Acertó" y "Falló" solo para el equipo en turno.
    - La recarga en cada etapa.
  - `TvScreen`: cada etapa, la cuenta regresiva desde `timerEndsAt` con temporizadores falsos, y el aviso de Final saltado.
- **e2e (Playwright, Chromium):**
  - Tablero con pista final. Jugar con dos equipos con puntaje positivo y uno en 0. Verificar que la TV muestra la categoría sin la pregunta. Anotar apuestas, mostrar la pista e iniciar el temporizador: el audio del operador no está en pausa y la TV muestra la cuenta regresiva. Pasar a la revelación, juzgar en orden, verificar los puntajes en ambas ventanas, revelar la respuesta e ir al podio.
  - Recargar el operador durante las apuestas.
  - En `offline.spec.ts`: sin conexión, `fetch` del audio responde 200 desde la caché.
  - En `boards.spec.ts`: ida y vuelta de un tablero con pista final.

## CI

No cambia el pipeline: los tests nuevos entran en los pasos existentes (lint → typecheck → unit → e2e → build). El único cambio de build es agregar `mp3` a los patrones de precache.

## Risks / Trade-offs

- [El audio elegido resulta no ser CC0 o se parece al tema original] → La tarea exige registrar la URL de origen y la licencia en `CREDITS.md`. La revisión del PR confirma ambas cosas antes del merge.
- [El navegador bloquea el audio] → Se reproduce en el operador, en respuesta a un clic. Si `play()` falla igual, se captura el error, la cuenta regresiva sigue y se muestra "No se pudo reproducir la música".
- [Desfase entre la cuenta regresiva del operador y la de la TV] → Ambas derivan de `timerStartedAt` con el mismo reloj del equipo. Queda anotado para cuando haya clientes remotos.
- [El operador se equivoca al juzgar] → No hay "deshacer juicio". Se corrige con la corrección manual de puntajes, igual que en el Daily Double. El historial de juzgados muestra cada resultado.
- [Una app antigua en caché abre una sesión con fase `final`] → El service worker actualiza la app al abrirla con conexión. En el peor caso, se inicia un juego nuevo.
- [El precache crece con el audio] → Menos de 1 MB. Es aceptable.

## Migration Plan

No hay migración de datos. Se despliega con el flujo habitual: merge a `main` después de `daily-double`, luego CI y GitHub Pages. Para volver atrás basta con revertir el merge: los tableros con `final` siguen abriéndose en la versión anterior, que ignora el campo.

## Open Questions

- Qué pieza CC0 concreta usar. Se elige al implementar la tarea de audio, con las restricciones de la decisión 5, y no cambia specs ni tareas.
