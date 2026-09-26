## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`.

**Depende de `daily-double`, `final-jeopardy`, `rondas` y `app-escritorio`. Se archiva después de los cuatro.** Este diseño parte del estado que dejan esos cambios implementados y archivados:

- `GamePhase = board | wager | clue { revealed, wager? } | roundBreak | final { stage, participants, wagers, timerStartedAt?, judged, answerRevealed } | finished`.
- `GameSession` con `rounds`, `roundIndex`, `finalEnabled?`, `clueValueInPlay`, `endRound` y `endBoard`.
- `FINAL_TIMER_MS` y `finalTimeRemaining(phase, now)`.
- En escritorio: el proceso principal con el servidor `http` + `ws`, el hub puro `createDeviceHub` (`src/net/hub.ts`), el protocolo `join | pong` / `welcome { serverTime } | ping`, `createWebSocketTransport`, `DesktopApi.lan` con `LanStatus` por IPC y la página `#/unirse`.

Cada bloque `MODIFIED` de las specs delta parte del texto más reciente de la cadena:

| Requisito | Parte de |
|---|---|
| `game-session` / "Recuperar el juego en curso" | `rondas` (que ya incluye lo de `daily-double` y `final-jeopardy`) |
| `game-presentation` / "Presentar el Final" | `final-jeopardy` (ADDED ahí; `rondas` no lo toca) |
| `game-presentation` / "No exponer el Final antes de tiempo" | `final-jeopardy` (ADDED ahí) |
| `lan-connection` / "Dispositivos conectados" | `app-escritorio` (ADDED ahí) |
| `lan-connection` / "No exponer datos a la red" | `app-escritorio` (ADDED ahí) |

Si alguno de los cuatro cambios previos cambia esos requisitos al implementarse, hay que revisar estos bloques antes de archivar. `openspec validate` avisará que los requisitos todavía no existen en `openspec/specs` hasta que se archiven los cambios previos.

Estado relevante del código que condiciona el diseño:

- `OperatorScreen.dispatch` calcula `gameReducer(session, action, Date.now())` con la `session` del render. Hasta hoy todas las acciones venían de clics del operador, de a una. Con pulsadores llegan eventos de varios celulares casi al mismo tiempo.
- El operador guarda la sesión en IndexedDB en cada cambio (`saveSession`) y la publica a la TV con `useOperatorSync`.
- El proceso principal de Electron no conoce el juego: solo tiene los sockets y el hub.

## Goals / Non-Goals

**Goals:**
- Toda la regla de pulsadores (armar, primer toque, fallados, reapertura, equipo que elige, envíos del Final) vive en `src/domain` como código puro y probado sin React ni red.
- **Una sola fuente de verdad:** la sesión del operador. El proceso principal y los celulares solo reciben proyecciones.
- La privacidad por equipo se garantiza en una función pura (la proyección hacia los celulares) que se puede probar con `JSON.stringify`.
- El juego web y el juego de escritorio sin pulsadores se comportan exactamente como antes.

**Non-Goals:**
- Un temporizador para responder tras pulsar, compensar latencias o nombres de jugador (ver "Fuera de alcance").
- Que el proceso principal persista estado del juego.

## Decisions

### 1. Quién decide el primer toque: el reducer del operador

```
 celular --buzz--> [main: hub]  --IPC deviceEvent (en orden)--> [operador: gameReducer]
                     |  bloqueo 0,25 s                                  |
                     |  (sin reenviar)                                  v
 celular <--game-- [main: hub] <--IPC publishGame(projectForDevices)-- sesión nueva
```

- El hub del proceso principal recibe los toques. Si el celular está bloqueado, o si los pulsadores no están activos según la última proyección publicada, **no reenvía** el toque y bloquea al dispositivo (decisión 4). En otro caso, reenvía un `deviceEvent` por IPC al operador. IPC conserva el orden de llegada.
- El operador convierte cada evento en una `GameAction` y la aplica al reducer. El primer `buzz` que encuentra los pulsadores activos gana. Los siguientes encuentran la fase `answering` y devuelven la misma referencia.
- **`dispatch` pasa a ser secuencial:** se reescribe con un `sessionRef` (o `setSession(prev => gameReducer(prev, action, Date.now()))`) para que dos eventos en el mismo tick se apliquen uno después del otro. Hoy dos toques simultáneos calcularían ambos desde la misma sesión y el segundo pisaría al primero. Hay un test de componente para este caso.

*Alternativa descartada:* que el hub decida el ganador. Duplicaría el estado del juego en el proceso principal (quién falló, si está activo, qué equipos existen), perdería la recuperación del operador y rompería "una sola fuente de verdad". El costo del camino por IPC es de milisegundos.

### 2. Modelo en la sesión

```ts
interface GameSession {
  // ...
  buzzersEnabled?: boolean;            // ausente = false (web, o escritorio con la opción apagada)
  controlTeamId?: string;              // equipo que elige; ausente = ninguno
}

interface BuzzState {
  status: 'closed' | 'armed' | 'answering';
  answering?: { teamId: string; deviceId: string; deviceLabel: string };  // solo en 'answering'
  failedTeamIds: string[];             // fallaron en esta pregunta
}

type GamePhase =
  | ...
  | { kind: 'clue'; clueKey; revealed; wager?; buzz?: BuzzState }   // buzz solo con buzzersEnabled y sin wager
  | { kind: 'final'; ...;
      wagerSources?: Record<string, { deviceId: string; deviceLabel: string }>;  // apuestas enviadas desde celulares
      answers?: Record<string, { text: string; deviceId: string; deviceLabel: string }>;
    };
```

- `startGame(..., { withBuzzers })` fija `buzzersEnabled`. La UI solo lo ofrece si `getDesktopApi()` existe.
- `openClue` sobre una celda normal, con `buzzersEnabled`, crea `buzz: { status: 'closed', failedTeamIds: [] }`. Un Daily Double pasa por `wager` y `placeWager` crea la `clue` **sin** `buzz`: así el Daily Double queda sin pulsadores por construcción.
- Todos los campos nuevos son opcionales. Una sesión guardada sin ellos es un juego sin pulsadores, sin migración ni cambios en `normalizeSession`.

### 3. Acciones nuevas

```ts
type GameAction = ...
  | { type: 'armBuzzers' }                                              // closed -> armed (si queda algún equipo)
  | { type: 'closeBuzzers' }                                            // armed | answering -> closed, sin puntos
  | { type: 'buzz'; teamId: string; deviceId: string; deviceLabel: string }  // armed -> answering
  | { type: 'judgeBuzz'; correct: boolean }                             // solo en answering
  | { type: 'submitFinalWager'; teamId: string; amount: number; deviceId: string; deviceLabel: string }
  | { type: 'submitFinalAnswer'; teamId: string; text: string; deviceId: string; deviceLabel: string };
```

- **`armBuzzers`**: válida en `clue` con `buzz.status === 'closed'` y al menos un equipo fuera de `failedTeamIds`.
- **`buzz`**: válida solo en `armed`, con un equipo existente que no esté en `failedTeamIds`. Pasa a `answering`.
- **`judgeBuzz`**:
  - `correct: true` suma `clueValueInPlay`, fija `controlTeamId` y pasa a `closed`.
  - `correct: false` resta `clueValueInPlay`, agrega el equipo a `failedTeamIds` y pasa a `armed` si queda algún equipo por responder, o a `closed` si no.
  - Reutiliza `updateTeamScore`, igual que `award`.
- **`closeBuzzers`**: vuelve a `closed` sin tocar puntajes ni `failedTeamIds`. El operador puede volver a armar.
- **`award` y `setScore` no cambian.** El operador puede usarlas en cualquier momento, también con un equipo respondiendo por pulsador.
- **`submitFinalWager`**: válida en `final`/`wagers`, para un participante sin apuesta en `wagers`, con un entero entre 0 y `entryScore`. Anota `wagers[teamId]` y `wagerSources[teamId]`. Si el equipo ya tiene apuesta, devuelve la misma referencia: **el primer envío queda fijo**.
- **`setFinalWager`** (del operador) no cambia: puede sobrescribir cualquier apuesta mientras la etapa sea `wagers`. Al sobrescribir, borra `wagerSources[teamId]`, porque la apuesta ya no es la que envió el celular.
- **`submitFinalAnswer`**: válida en `final`/`clue`, para un participante sin respuesta, con texto recortado no vacío de hasta 200 caracteres, y solo si el temporizador no se inició o `finalTimeRemaining(phase, now) > 0`. En `reveal` ya no se aceptan respuestas.
- `judgeFinal` no cambia. El operador ve la respuesta enviada para decidir.

*Alternativa descartada:* que el operador no pueda corregir una apuesta enviada por un celular. Un invitado que se equivoca de número no tendría arreglo, y la regla del primer envío existe para coordinar a los celulares del equipo, no para limitar al operador.

### 4. Hub: equipo, bloqueo y envío por equipo

El hub de `app-escritorio` (`src/net/hub.ts`, puro, con reloj inyectado) se extiende:

- **Registro de equipo:** `deviceId → teamId?`. `chooseTeam` lo actualiza solo si el `teamId` existe en la última proyección publicada. Un `join` puede traer `teamId`, guardado en el `localStorage` del celular, para recuperar el equipo tras una recarga o un reinicio de la app. Si ese equipo no existe en el juego en curso, se ignora y el celular vuelve a elegir.
- **Bloqueo:** `lockedUntil: deviceId → ms`. Un `buzz` de un dispositivo sin equipo se ignora. Un `buzz` con `now < lockedUntil` se ignora. Un `buzz` con los pulsadores no activos en la proyección fija `lockedUntil = now + 250` y no se reenvía. Un `buzz` con los pulsadores activos se reenvía como `deviceEvent`. El bloqueo es por dispositivo, no por equipo.
- **Por qué el bloqueo vive en el hub:** el hub recibe el toque primero y con el reloj más preciso. El estado es efímero y no hace falta recuperarlo, así que no se guarda en la sesión.
- **Envío:** con cada `publishGame`, el hub arma para cada socket `common + perTeam[teamId]` (decisión 5), más el estado propio del dispositivo (`lockedUntil`, si ganó: `answering.deviceId === deviceId`). Nunca envía el `perTeam` de otro equipo.
- **`LanStatus.devices`** agrega `teamId?` y el operador lo traduce al nombre del equipo en "Conectar dispositivos".
- Si la ventana del operador se desmonta, publica `null`. Los celulares muestran "Esperando a que empiece el juego".

### 5. Proyección hacia los celulares (pura)

```ts
// src/domain/deviceProjection.ts
interface DeviceGameView {
  common: {
    sessionId: string;
    teams: { id: string; name: string }[];
    buzzersEnabled: boolean;
    stage: 'board' | 'clue' | 'dailyDouble' | 'roundBreak' | 'final' | 'finished';
    buzz?: { status: 'closed' | 'armed' | 'answering'; answeringTeamId?: string; failedTeamIds: string[] };
    controlTeamId?: string;
    final?: { stage: 'wagers' | 'clue' | 'reveal'; category: string; timerEndsAt?: number };
  };
  perTeam: Record<string, {
    final?: {
      participating: boolean;
      maxWager?: number;                                  // entryScore del propio equipo
      wager?: { amount: number; deviceLabel?: string };   // solo la del propio equipo
      answer?: { text: string; deviceLabel: string };     // solo la del propio equipo
    };
  }>;
}
export function projectForDevices(session: GameSession | null): DeviceGameView | null;
```

- `common` **nunca** contiene preguntas, respuestas, imágenes, nombres de categorías del tablero ni puntajes. `perTeam[x]` solo contiene datos del equipo `x`. Un test recorre cada `perTeam` con `JSON.stringify` y verifica que no aparezcan montos ni textos de otros equipos.
- `answering` sale como `answeringTeamId` y sin `deviceId`. El "ganaste" se lo agrega el hub a cada socket comparando ids, así ningún celular conoce el `deviceId` de otro.
- La categoría del Final sí sale (la TV ya la muestra públicamente).
- El operador llama a `lan.publishGame(projectForDevices(session))` en cada cambio de sesión, desde un hook `useDevicePublisher` análogo a `useOperatorSync`.

### 6. Protocolo de dispositivos

```ts
// Celular -> app
type DeviceClientMessage =
  | { type: 'join'; deviceId: string; label: string; teamId?: string }   // teamId: nuevo, opcional
  | { type: 'pong' }
  | { type: 'chooseTeam'; teamId: string }
  | { type: 'buzz' }
  | { type: 'finalWager'; amount: number }
  | { type: 'finalAnswer'; text: string };

// App -> celular
type DeviceServerMessage =
  | { type: 'welcome'; serverTime: number }
  | { type: 'ping'; serverTime: number }                 // serverTime: nuevo, para corregir el desfase
  | { type: 'game'; view: PhoneView | null };

type PhoneView = DeviceGameView['common'] & {
  teamId?: string;
  team?: DeviceGameView['perTeam'][string];
  lockedUntil?: number;                                  // en reloj del servidor
  youWon?: boolean;
};

// main -> operador (IPC)
type DeviceEvent =
  | { type: 'buzz'; deviceId: string; deviceLabel: string; teamId: string }
  | { type: 'finalWager'; deviceId: string; deviceLabel: string; teamId: string; amount: number }
  | { type: 'finalAnswer'; deviceId: string; deviceLabel: string; teamId: string; text: string };
```

- Los validadores (`isDeviceClientMessage`, `isDeviceServerMessage`) se extienden con el mismo patrón y rechazan montos no enteros o textos de más de 200 caracteres.
- El hub completa `teamId` y `deviceLabel` desde su registro: el celular no puede enviar por otro equipo.
- `DesktopApi.lan` agrega `publishGame(view: DeviceGameView | null): void` y `onDeviceEvent(listener): () => void`.

### 7. Reloj: desfase solo para la cuenta regresiva

- El orden de los toques **no** usa relojes: gana el que llega primero al hub.
- Para la cuenta regresiva del Final en el celular, `timerEndsAt` y `lockedUntil` vienen en el reloj del proceso principal, que es el mismo equipo que el operador. El celular calcula `offset = serverTime - Date.now()` con cada `welcome` y `ping` (media móvil simple) y muestra `timerEndsAt - (Date.now() + offset)`. Es una función pura `remainingWithOffset` con tests.
- El celular deshabilita el envío de la respuesta al llegar a 0, pero quien decide es el reducer (`submitFinalAnswer` con `finalTimeRemaining`).

### 8. UI

- **`TeamSetupScreen`:** casilla "Usar pulsadores", solo con `getDesktopApi()`, activada por defecto.
- **`CluePanel` (operador), con `buzz`:**
  - `closed`: "Activar pulsadores".
  - `armed`: "Pulsadores activos…" y "Cerrar pulsadores".
  - `answering`: "Responde: Tíos (Android 2)", con "Correcta (+600)", "Incorrecta (−600)" y "Cerrar pulsadores".
  - La lista de equipos fallados.
  - Los +/- manuales siguen debajo.
- **`OperatorScreen`:** "Elige: Primos" junto a los puntajes.
- **Panel del Final (operador):** en `wagers`, cada participante muestra "Enviada desde Android" o "Pendiente", y el campo manual sigue disponible. En `clue`, marca qué equipos respondieron (sin mostrar el texto hasta la revelación, para que el operador no lo lea en voz alta por error). En `reveal`, muestra la respuesta enviada del equipo en turno.
- **`ConnectDevicesPanel`:** cada dispositivo con su equipo o "Sin equipo".
- **`TvScreen`:** banda "¡Pulsadores activos!" y "Responde: Tíos" en la pregunta, "Elige: Primos" junto a los puntajes, y en la revelación del Final la respuesta escrita del equipo en turno y de los ya juzgados.
- **`PhoneScreen` (`#/unirse`, reemplaza a `JoinScreen`):**
  - Sin juego: "Esperando a que empiece el juego".
  - Sin equipo: la lista de equipos para elegir. Un botón "Cambiar de equipo" siempre visible, con confirmación.
  - Con equipo: un botón grande que ocupa la pantalla con los estados esperando, activo, bloqueado, ganaste, "Responde Tíos" y "Tu equipo ya falló".
  - En el Final: formulario de apuesta (con el máximo), luego formulario de respuesta con la cuenta regresiva, o "Enviada por Android: 500".
  - `navigator.vibrate` al activarse y al ganar, si existe.
  - El equipo elegido se guarda en `localStorage` con try/catch, junto al `deviceId`.
- **`TvProjection`:** `projectForTv` agrega `buzz?: { status; answeringTeamName? }`, `controlTeamName?` y, en `final`/`reveal`, `answer` por equipo juzgado y `currentTeamAnswer?`. Las respuestas enviadas de equipos que todavía no estuvieron en turno no salen.

## Estrategia de pruebas

- **Unitarias (Vitest, `unit`):**
  - `game.test.ts`:
    - `openClue` con `buzzersEnabled` crea `buzz` cerrado, y sin él no. `placeWager` deja la `clue` sin `buzz`.
    - `armBuzzers` → `buzz` → `answering`. Un segundo `buzz` devuelve la misma referencia.
    - `judgeBuzz(true)` suma `clueValueInPlay` (también en x2) y fija `controlTeamId`.
    - `judgeBuzz(false)` resta, agrega a `failedTeamIds` y rearma. Con todos fallados queda `closed`, y `armBuzzers` sin equipos disponibles devuelve la misma referencia.
    - Un `buzz` de un equipo fallado no cuenta. `closeBuzzers` no cambia puntajes.
    - `submitFinalWager`: el primero queda y el segundo no; fuera de rango o de un no participante no hace nada; `setFinalWager` sobrescribe y borra `wagerSources`.
    - `submitFinalAnswer`: solo en `clue`, no después de 0, el primero queda.
    - Una sesión sin campos nuevos sigue funcionando.
  - `deviceProjection.test.ts`: sin preguntas, respuestas ni puntajes en ningún `common`; cada `perTeam` sin datos de otros equipos; `maxWager` es el `entryScore`; `null` sin sesión.
  - `projection.test.ts` (TV): el estado de pulsadores, `controlTeamName`, y en `reveal` la respuesta del equipo en turno sí y la de los que no estuvieron en turno no.
  - `src/net/hub.test.ts`: `chooseTeam` con un equipo existente e inexistente; `join` con `teamId` recupera el equipo; bloqueo de 250 ms antes de armar; un toque durante el bloqueo no se reenvía; otro dispositivo del mismo equipo no queda bloqueado; un toque sin equipo se ignora; el envío por socket incluye solo su `perTeam`; `youWon` solo para el dispositivo ganador; `publishGame(null)` envía `view: null`.
  - `src/net/protocol.test.ts`: los mensajes nuevos válidos, y montos no enteros o textos largos rechazados.
  - `src/net/clock.test.ts`: `remainingWithOffset` con desfase positivo y negativo.
- **Componentes (Testing Library, `dom`, con `DesktopApi` falso):**
  - `TeamSetupScreen`: la casilla solo en escritorio y activada.
  - `OperatorScreen`: botones por estado; **dos `deviceEvent` de `buzz` en el mismo tick dejan como ganador al primero** (prueba del `dispatch` secuencial); "Elige: …".
  - Panel del Final: "Enviada desde …" y la respuesta en la revelación.
  - `ConnectDevicesPanel`: el equipo de cada dispositivo.
  - `PhoneScreen`, con transporte falso: elegir y cambiar de equipo, cada estado del botón, el formulario de apuesta con el máximo, "Enviada por …", la cuenta regresiva y la respuesta deshabilitada en 0.
  - `TvScreen`: la banda de pulsadores y "Responde: …".
- **e2e web (Playwright Chromium):** la pantalla de equipos no muestra "Usar pulsadores".
- **e2e de escritorio (`e2e-desktop/`, Playwright `_electron` + dos páginas Chromium como celulares):**
  1. Iniciar con pulsadores y dos equipos; cada celular elige un equipo y el operador los ve en "Conectar dispositivos".
  2. Abrir una celda; un celular toca antes de activar y queda bloqueado; activar; el otro celular toca y gana; la TV muestra "Responde: …".
  3. "Incorrecta" resta y reabre para el primer equipo, que toca y gana; "Correcta" suma y la TV muestra "Elige: …".
  4. Final: los celulares envían apuestas y respuestas; un segundo envío del mismo equipo se rechaza; la revelación muestra la respuesta en la TV.
  5. Recargar un celular y recargar el operador con un equipo respondiendo: se recupera el estado.
  6. Ningún mensaje WebSocket recibido por un celular contiene la pregunta abierta ni datos del otro equipo.

## CI

No se agregan jobs. Los tests unitarios y de componentes entran en los pasos existentes. El e2e de escritorio corre en el job `desktop` (`windows-latest`) que agregó `app-escritorio`, y el e2e web sigue en el job `e2e`.

## Risks / Trade-offs

- [Dos toques casi simultáneos] → Gana el que llega primero al hub. En una red local las diferencias son de pocos milisegundos. Compensar latencias queda fuera de alcance.
- [El `dispatch` actual pisa estados con eventos seguidos] → Se reescribe secuencial y hay un test de componente para dos eventos en el mismo tick.
- [La proyección publicada al hub llega unos milisegundos después del cambio en el operador] → Un toque justo después de armar puede verse como "antes de tiempo" y bloquear 250 ms. Desde el celular es correcto: todavía no había visto el pulsador activo.
- [Redes wifi con picos de latencia] → El estado se recupera solo con cada `game`. Un celular que se desconecta vuelve a su equipo al reconectarse.
- [El celular se apaga la pantalla (sin `wakeLock` en `http://`)] → La página sugiere ajustar el tiempo de pantalla. Al volver, el WebSocket se reconecta y muestra el estado actual.
- [Un invitado cambia de equipo para pulsar por otro] → Es un juego de cumpleaños: el operador ve el equipo de cada dispositivo en la lista y puede corregir puntajes.
- [Un invitado escribe algo inapropiado en la respuesta del Final] → La TV la muestra recién en la revelación. El operador la ve antes en su panel de revelación y puede decidir.
- [Respuestas enviadas un instante después de llegar a 0] → Decide el reducer con el reloj del operador, que es el mismo que el del temporizador.

## Migration Plan

- No hay migración de datos: los campos nuevos de la sesión son opcionales y una sesión anterior es un juego sin pulsadores.
- Se integra por PR después de `app-escritorio`, con CI en verde. La web se despliega como siempre (sin cambios visibles salvo que no aparece la casilla). El escritorio se publica con un tag nuevo.
- **Rollback:** se revierte el merge y se publica un tag nuevo con la versión anterior. Una sesión guardada con pulsadores se reanuda en la versión anterior como un juego sin pulsadores, porque los campos extra se ignoran.

## Open Questions

- El texto exacto de la sugerencia para mantener la pantalla encendida y el diseño visual del botón del celular. Se deciden al implementar, sin cambiar specs ni tareas.
