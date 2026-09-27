> Cada tarea es un commit en la rama `change/pulsadores`. La rama se crea desde `change/app-escritorio` y se implementa después de `daily-double`, `final-jeopardy`, `rondas` y `app-escritorio`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`. Si la tarea toca la UI web, también `npm run test:e2e`. Si toca `electron/` o el flujo de escritorio, también `npm run test:e2e:desktop` (en Windows). Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Dominio

- [x] 1.1 En `src/domain/game.ts`, agregar `buzzersEnabled`, `controlTeamId`, `BuzzState` en la fase `clue`, `startGame(..., { withBuzzers })`, y las acciones `armBuzzers`, `closeBuzzers`, `buzz` y `judgeBuzz`. `openClue` crea `buzz` cerrado solo con `buzzersEnabled`, y `placeWager` deja la `clue` sin `buzz`. Verificar con tests unitarios en `game.test.ts`:
  - `openClue` con y sin `buzzersEnabled`, y el Daily Double sin `buzz` después de `placeWager`.
  - `armBuzzers` → `buzz` pasa a `answering`, y un segundo `buzz` devuelve la misma referencia.
  - `judgeBuzz(true)` suma `clueValueInPlay` (también en x2), fija `controlTeamId` y cierra.
  - `judgeBuzz(false)` resta, agrega a `failedTeamIds` y rearma. Con todos los equipos fallados queda `closed`, y `armBuzzers` devuelve la misma referencia.
  - Un `buzz` de un equipo fallado o inexistente no cuenta. `closeBuzzers` no cambia puntajes.
  - `buzz` fija `answering.startedAt`. `BUZZ_ANSWER_MS` y `buzzTimeRemaining` bajan de 5000 a 0 sin pasar de 0 y devuelven `null` fuera de `answering`. Con el tiempo en 0 la sesión no cambia sola y `judgeBuzz(true)` sigue sumando. Tras `judgeBuzz(false)`, el siguiente `buzz` tiene un `startedAt` nuevo.
  - `award` y `setScore` siguen funcionando con un equipo respondiendo.
  - Una sesión sin los campos nuevos se comporta como antes.
- [x] 1.2 Agregar `submitFinalWager` y `submitFinalAnswer`, con `wagerSources` y `answers` en la fase `final`, y hacer que `setFinalWager` borre `wagerSources[teamId]` al sobrescribir. Verificar con tests unitarios en `game.test.ts`:
  - El primer `submitFinalWager` de un equipo queda y el segundo devuelve la misma referencia.
  - Un monto fuera de 0..`entryScore`, no entero, o de un equipo no participante no hace nada.
  - `setFinalWager` sobrescribe una apuesta enviada y borra su origen.
  - `submitFinalAnswer` solo en la etapa `clue`, con texto recortado no vacío de hasta 200 caracteres, no con el temporizador en 0 ni en `reveal`, y el primero queda.
- [x] 1.3 Crear `src/domain/deviceProjection.ts` (`projectForDevices`) y extender `projectForTv` con `buzz`, `controlTeamName` y las respuestas enviadas en la revelación del Final. Verificar con tests unitarios:
  - `projectForDevices(null)` es `null`.
  - Con una pregunta abierta, `JSON.stringify(common)` no contiene la pregunta, la respuesta, los nombres de categorías ni ningún puntaje.
  - Cada `perTeam[x]` no contiene montos ni textos de otros equipos, y `maxWager` es el `entryScore` del equipo.
  - En la TV, en `reveal`, sale la respuesta del equipo en turno y de los juzgados, pero no la de los que todavía no estuvieron en turno. `buzz.answeringTeamName`, `buzz.answerEndsAt` (= `startedAt` + 5000) y `controlTeamName` salen como corresponde, y `common.buzz.answerEndsAt` en la proyección de celulares.

## 2. Red y escritorio

- [x] 2.1 Extender `src/net/protocol.ts` con `chooseTeam`, `buzz`, `finalWager`, `finalAnswer`, `join.teamId`, `ping.serverTime` y `game`, con sus validadores, y crear `src/net/clock.ts` (`remainingWithOffset` y el cálculo del desfase). Verificar con tests unitarios: los mensajes nuevos válidos se aceptan, y los montos no enteros, los textos de más de 200 caracteres y los tipos desconocidos se rechazan. `remainingWithOffset` es correcto con desfase positivo, negativo y cero.
- [ ] 2.2 Extender `src/net/hub.ts` con el registro de equipo por dispositivo, el bloqueo de 250 ms, `publishGame` con el envío por socket de `common + perTeam` propio, `youWon` y `lockedUntil`, y la emisión de `deviceEvent`. Verificar con tests unitarios en `hub.test.ts`, con reloj falso:
  - `chooseTeam` con un equipo existente lo guarda, y con uno inexistente lo ignora. `join` con `teamId` recupera el equipo si existe.
  - Un `buzz` antes de armar bloquea 250 ms y no se reenvía. Un `buzz` durante el bloqueo no se reenvía aunque ya esté armado. Otro dispositivo del mismo equipo no queda bloqueado. Un `buzz` sin equipo se ignora.
  - Un `buzz` armado se reenvía con el `teamId` y el `deviceLabel` del registro.
  - Cada socket recibe solo su `perTeam`. `youWon` sale solo para el dispositivo ganador. `publishGame(null)` envía `view: null`.
  - `finalWager` y `finalAnswer` se reenvían con el equipo del registro.
  - `LanStatus.devices` incluye `teamId`.
- [ ] 2.3 En el proceso principal y el preload, agregar `lan.publishGame` y `lan.onDeviceEvent` a `DesktopApi` y conectarlos con el hub. Verificar con `electron/lanServer.test.ts` (integración en Node): un cliente `ws` que elige equipo y pulsa con los pulsadores publicados como activos produce un `deviceEvent`, y un segundo cliente de otro equipo recibe `game` con `answeringTeamId` pero sin el `perTeam` del primero.

## 3. UI del operador y TV

- [ ] 3.1 Hacer secuencial el `dispatch` de `OperatorScreen` (con `sessionRef` o actualización funcional) y crear `useDevicePublisher`, que publica `projectForDevices` en cada cambio y `null` al desmontar, y traduce `deviceEvent` a `GameAction`. Verificar con tests de componentes con un `DesktopApi` falso: dos eventos `buzz` en el mismo tick dejan como ganador al primero, el publicador recibe la proyección en cada cambio y `null` al desmontar, y en la web no se llama a nada.
- [ ] 3.2 En `TeamSetupScreen`, agregar la casilla "Usar pulsadores" (solo en escritorio, activada por defecto). En `CluePanel`, agregar los controles por estado ("Activar pulsadores", "Cerrar pulsadores", "Responde: …" con la cuenta regresiva de 5 s, "Correcta" e "Incorrecta" mostrando el valor en juego, "¡Tiempo!" con "Incorrecta" resaltada al llegar a 0, y la lista de equipos fallados). En `OperatorScreen`, mostrar "Elige: …". En `ConnectDevicesPanel`, mostrar el equipo de cada dispositivo o "Sin equipo". Verificar con tests de componentes: la casilla aparece solo en escritorio y activada; cada estado muestra sus botones; con reloj falso, a los 5 s aparece "¡Tiempo!" y "Incorrecta" queda resaltada sin cambiar puntajes; "Incorrecta" deja visibles los fallados; "Activar pulsadores" no aparece en un Daily Double ni sin pulsadores; la lista de dispositivos muestra el equipo.
- [ ] 3.3 En el panel del Final del operador, mostrar "Enviada desde …" o "Pendiente" por participante en `wagers` (con el campo manual disponible), qué equipos respondieron en `clue` (sin el texto), y la respuesta enviada del equipo en turno en `reveal`. Verificar con tests de componentes para cada etapa, incluido que el texto de la respuesta no aparece en `clue`.
- [ ] 3.4 En `TvScreen`, mostrar la banda "¡Pulsadores activos!", "Responde: …" con la cuenta regresiva de 5 s y "¡Tiempo!" en 0, "Elige: …" y las respuestas escritas en la revelación del Final. Verificar con tests de componentes: cada indicación aparece solo con los datos de la proyección, y en un juego sin pulsadores no aparece ninguna.

## 4. Celular

- [ ] 4.1 Reemplazar `JoinScreen` por `PhoneScreen` (`#/unirse`): espera sin juego, elección y cambio de equipo (con confirmación), el botón con los estados esperando, activo, bloqueado, ganaste, "Responde …" y "Tu equipo ya falló" (en ganaste y "Responde …", la cuenta regresiva de 5 s corregida por desfase y luego "¡Tiempo!"), la vibración si existe, y el equipo guardado en `localStorage` con try/catch. Verificar con tests de componentes con transporte falso: elegir equipo envía `chooseTeam`, una recarga envía `join` con el `teamId` guardado, cada `game` muestra el estado correspondiente, la cuenta de 5 s llega a "¡Tiempo!" con reloj falso, tocar envía `buzz`, y `vibrate` se llama al activarse y al ganar.
- [ ] 4.2 Agregar a `PhoneScreen` el Final: formulario de apuesta con el máximo, formulario de respuesta con la cuenta regresiva corregida por desfase, "Enviada por …" y "Tu equipo no juega el Final". Verificar con tests de componentes: una apuesta mayor al máximo se rechaza en el celular, un envío muestra "Enviada por …", la respuesta se deshabilita en 0, y un equipo no participante ve el aviso.

## 5. Pruebas de extremo a extremo y documentación

- [ ] 5.1 Agregar al e2e web que la pantalla de equipos no muestra "Usar pulsadores", y al e2e de escritorio (`e2e-desktop/`) el flujo con dos páginas Chromium como celulares: unirse a equipos, toque antes de tiempo bloqueado, primer toque ganador con la cuenta de 5 s en la TV y "¡Tiempo!" al agotarse sin cambiar puntajes, "Incorrecta" que reabre y "Correcta" con "Elige: …" en la TV, apuestas y respuestas del Final desde los celulares con el segundo envío rechazado, recarga de un celular y del operador con el estado recuperado, y ningún mensaje WebSocket de un celular con la pregunta abierta ni con datos del otro equipo. Verificar con `npm run test:e2e` y `npm run test:e2e:desktop` en verde, y el job `desktop` del CI en verde.
- [ ] 5.2 Actualizar el README (cómo usar los pulsadores, sugerencia de pantalla encendida) y el CHANGELOG con la entrada de la versión v1.1.0. Verificar que `npm run lint` pasa y que el README describe el flujo de unirse, pulsar y el Final desde el celular.
