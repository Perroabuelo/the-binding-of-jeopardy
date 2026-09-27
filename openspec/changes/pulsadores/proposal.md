## Why

Hoy el operador decide a ojo qué equipo levantó la mano primero, y en una fiesta ruidosa eso genera discusiones. En el programa original cada jugador tiene un pulsador y gana quien toca primero, pero solo después de que el conductor termina de leer. `app-escritorio` dejó una app que conecta los celulares de los invitados por la red wifi local. Este cambio los convierte en **pulsadores**: cada invitado escanea el QR, elige su equipo y usa el celular como botón. Aprovechando esa conexión, en el Final cada equipo envía su apuesta y su respuesta en secreto desde el celular, sin papel.

**Rama del cambio:** `change/pulsadores`. Se crea desde `change/app-escritorio` porque asume implementados y archivados `daily-double`, `final-jeopardy`, `rondas` y `app-escritorio`. Se archiva después de ellos y se integra por PR con CI en verde.

Roadmap encadenado, cada cambio sobre la rama del anterior:

1. `daily-double`
2. `final-jeopardy`
3. `rondas`
4. `app-escritorio`
5. `pulsadores` (este)

## What Changes

- **Solo en la app de escritorio.** Al iniciar un juego en escritorio aparece la opción "Usar pulsadores", activada por defecto. La versión web no cambia: el operador sigue sumando y restando a mano.
- **Unirse a un equipo.** El celular que escanea el QR muestra los equipos del juego en curso, y el invitado elige el suyo. Varios celulares pueden estar en el mismo equipo, y cualquiera de ellos pulsa por el equipo. El invitado puede cambiar de equipo desde el celular. La lista de dispositivos del operador muestra el equipo de cada uno.
- **Armar los pulsadores.** Con una pregunta abierta, el operador la lee y presiona "Activar pulsadores". Recién entonces los celulares muestran el botón activo.
- **Pulsar antes de tiempo.** Un toque antes de que se activen bloquea a ese celular durante 0,25 s, como en el programa.
- **Primer toque.** El primer toque válido gana: el operador, la TV y los celulares muestran qué equipo responde, y el celular que tocó lo indica.
- **Tiempo para responder.** Al ganar el toque empieza una cuenta regresiva fija de 5 s, visible en el operador, la TV y los celulares. Al llegar a 0 muestran "¡Tiempo!" y el operador ve resaltado "Incorrecta", pero no se descuenta nada solo: el operador decide, porque basta con empezar a responder dentro del plazo. La cuenta se detiene al juzgar o cerrar los pulsadores, y vuelve a empezar si otro equipo gana el toque tras una reapertura.
- **Correcta o incorrecta.**
  - "Correcta" suma el valor de la pregunta (con el multiplicador de la ronda) al equipo que respondió y cierra los pulsadores.
  - "Incorrecta" le resta ese valor y reabre los pulsadores para los demás equipos. Un equipo que ya falló en esa pregunta no puede volver a pulsar. Si no quedan equipos, los pulsadores se cierran.
  - El operador puede cerrar los pulsadores sin juzgar, y los +/- manuales y la corrección de puntajes siguen disponibles.
- **Quién elige.** El equipo que acertó con el pulsador queda indicado como el que elige la siguiente pregunta, en el operador y en la TV.
- **Daily Double sin pulsadores.** En un Daily Double responde el equipo que apostó, como hoy.
- **Final desde el celular.** En el Final, cada equipo participante envía su apuesta y luego su respuesta desde cualquiera de sus celulares. El primer envío de cada cosa queda fijo para todo el equipo, y los demás celulares del equipo ven "Enviada por …". Los celulares muestran la cuenta regresiva de 30 s. El operador sigue pudiendo anotar o corregir apuestas a mano (por ejemplo, para un equipo sin celular) y ve las respuestas enviadas para juzgarlas. En la revelación, la TV muestra la respuesta escrita del equipo en turno.
- **Privacidad.** Un celular nunca recibe preguntas, respuestas del tablero, ni las apuestas o respuestas de otros equipos. La TV no recibe apuestas ni respuestas del Final antes de revelarlas.
- **Reconexión y recuperación.** Un celular que se recarga o se reconecta vuelve a su equipo y a su estado. Si la vista de operador se recarga, el estado de los pulsadores y los envíos del Final se recuperan.

## Notas de versión

**v1.1.0** (minor).

- Pulsadores: en la app de escritorio, cada invitado escanea el QR, elige su equipo y usa su celular como botón.
- El operador activa los pulsadores después de leer la pregunta. Si alguien toca antes, queda bloqueado un instante.
- El equipo que pulsa tiene 5 segundos para responder, con la cuenta regresiva a la vista de todos.
- Una respuesta incorrecta resta los puntos y le da la oportunidad a los demás equipos.
- En la TV se ve qué equipo responde y quién elige la siguiente pregunta.
- En el Final, cada equipo envía su apuesta y su respuesta en secreto desde el celular. Ya no hace falta papel.

## Capabilities

### New Capabilities
- `buzzers`: los pulsadores desde los celulares. Cubre la opción al iniciar, unirse a un equipo, armar y bloquear, el primer toque, el tiempo para responder, juzgar correcta o incorrecta con reapertura, el Daily Double sin pulsadores, el indicador de quién elige, los estados del celular, la apuesta y la respuesta del Final desde el celular, la privacidad de los celulares, y la reconexión.

### Modified Capabilities
- `game-session`: "Recuperar el juego en curso" agrega el estado de los pulsadores (incluido cuándo empezó el tiempo para responder), el equipo que elige y los envíos del Final.
- `game-presentation`: se agrega mostrar el estado de los pulsadores, con la cuenta regresiva para responder, y quién elige. "Presentar el Final" agrega la respuesta escrita del equipo en turno, y "No exponer el Final antes de tiempo" agrega las respuestas enviadas.
- `lan-connection`: "Dispositivos conectados" agrega el equipo de cada dispositivo, y "No exponer datos a la red" pasa a permitir la información mínima que necesita el pulsador.

## Fuera de alcance

- Pulsadores en la versión web. Siguen requiriendo el servidor de la app de escritorio.
- Descontar puntos automáticamente al agotarse los 5 s, o configurar esa duración.
- Sonidos y animaciones, incluido el sonido del pulsador. Tendrán su propio cambio. El celular solo vibra si el navegador lo permite.
- La TV como dispositivo de la red. Sigue siendo una ventana de la misma app.
- Nombres de jugador. El celular se identifica con su etiqueta de dispositivo ("Android 2").
- Compensar la latencia de cada celular para decidir quién tocó primero. Gana el primer toque que llega a la app. En una red local las diferencias son de pocos milisegundos.
- Mantener la pantalla del celular encendida. `http://IP` no es un contexto seguro y el navegador no permite `wakeLock`. La página lo sugiere.
- Pulsadores en el Final o en el Daily Double.
- Escribir las respuestas del Final desde la app del operador. Si un equipo no tiene celular, escribe en papel como antes.

## Impact

- **Dominio (`src/domain/`):** sesión con `buzzersEnabled`, estado de pulsadores dentro de la fase `clue`, `controlTeamId`, y envíos del Final (apuestas con su origen y respuestas). Acciones nuevas en `gameReducer`. Proyección pura hacia los celulares (`projectForDevices`), separada por equipo. `projectForTv` agrega el estado de los pulsadores, quién elige y la respuesta del equipo en turno en el Final.
- **Red (`src/net/`):** mensajes nuevos en el protocolo de dispositivos (elegir equipo, pulsar, enviar apuesta y respuesta, estado del juego para el celular). El hub agrega el equipo de cada dispositivo, el bloqueo por pulsar antes de tiempo y el envío por equipo.
- **Escritorio (`electron/`, `src/platform/`):** `DesktopApi.lan` agrega `publishGame` y `onDeviceEvent`, y `LanStatus.devices` agrega el equipo.
- **UI:** `TeamSetupScreen` (opción "Usar pulsadores"), `OperatorScreen`/`CluePanel` (activar, correcta, incorrecta, cerrar, equipo que responde, quién elige), panel del Final (envíos desde el celular), `TvScreen` (estado de pulsadores, quién elige, respuesta en la revelación) y la página del celular (`#/unirse`) con elección de equipo, botón y formulario del Final.
- **Pruebas y CI:** unitarias del dominio, del hub y de la proyección; componentes; e2e de escritorio con varios navegadores Chromium como celulares. Sin jobs nuevos.
- **Datos:** sin migración. Los campos nuevos de la sesión son opcionales.
