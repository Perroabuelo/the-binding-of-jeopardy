## Why

Hoy el juego termina de golpe: se usa la última celda y aparece el podio. El **Final Jeopardy!** del programa original es el cierre dramático que falta. Todos los equipos con puntaje positivo apuestan a ciegas sobre una sola pista, y el marcador se puede dar vuelta en el último momento. Es el segundo paso del roadmap y se apoya en las apuestas que introduce `daily-double`.

**Rama del cambio:** `change/final-jeopardy`. Se creó desde `change/daily-double`, del que depende, y tras la integración de `daily-double` (v0.4.0) quedó rebasada sobre `main`. Se integra por PR con CI en verde.

Roadmap encadenado, cada cambio sobre la rama del anterior:

1. `daily-double`
2. `final-jeopardy` (este)
3. `rondas`: N rondas, cada una con su tablero y su multiplicador.
4. `app-escritorio`: app Electron con servidor en la red local.
5. `pulsadores`: pulsadores desde los celulares por QR.

## What Changes

- **Pista final en el tablero.** Cada tablero puede tener, opcionalmente, una pista final con categoría, pregunta y respuesta, y una imagen opcional para la pregunta y otra para la respuesta. Se edita en el editor. Un tablero sin pista final, o con la pista final incompleta, sigue listo para jugar.
- **Toggle al iniciar.** En la pantalla de equipos aparece la opción "Jugar Final Jeopardy!", disponible solo si el tablero tiene una pista final completa. Si está desactivada, el juego funciona como hoy.
- **Flujo del Final.** Con el toggle activo, cuando se usan todas las celdas o el operador termina el juego antes, el juego pasa al Final en vez de ir al podio:
  1. **Categoría y apuestas.** La TV muestra solo la categoría y qué equipos juegan. Participan únicamente los equipos con puntaje mayor que 0. El operador anota la apuesta secreta de cada uno, de 0 a su puntaje, y la TV no ve los montos.
  2. **Pista y temporizador.** Con todas las apuestas anotadas, el operador muestra la pista en la TV e inicia un temporizador de 30 s con música libre (CC0). La música se puede silenciar.
  3. **Revelación.** El operador revela los equipos del último al primero en puntaje. Para cada uno marca si acertó o falló, y se suma o resta su apuesta. La respuesta correcta se muestra en la TV cuando el operador lo decide.
  4. **Podio.**
- Si ningún equipo tiene puntaje mayor que 0, el Final se salta, el juego va al podio y se avisa por qué.
- La TV **nunca** recibe la pista antes de mostrarla, ni las apuestas antes de revelar cada equipo, ni la respuesta antes de revelarla.
- Si la vista de operador se recarga durante el Final, se recupera en el mismo punto, con las apuestas, los equipos ya revelados y el tiempo restante del temporizador.
- Exportar e importar conservan la pista final y sus imágenes. Los tableros y archivos existentes siguen siendo válidos y no tienen pista final.
- La música del Final funciona sin conexión, como el resto de la aplicación.

## Notas de versión

**v0.5.0** (minor)

- Final Jeopardy!: agrega una pista final a tu tablero y actívala al iniciar el juego. Los equipos con puntaje positivo apuestan en secreto, responden en 30 s con música y se revelan del último al primero.
- El Final se salta solo si ningún equipo tiene puntaje positivo.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `board-editing`: se agrega editar la pista final opcional del tablero, con sus imágenes.
- `board-storage`: exportar e importar conservan la pista final y sus imágenes, y los archivos sin pista final siguen importándose.
- `game-session`: se agregan el toggle del Final, las apuestas finales, el temporizador con música y la revelación en orden. "Iniciar un juego con equipos", "Fin del juego y podio" y "Recuperar el juego en curso" cambian para cubrir el Final.
- `game-presentation`: se agrega la presentación del Final sin exponer la pista, las apuestas ni la respuesta antes de tiempo. "Reflejar el estado del juego" cambia para incluir el Final.

## Fuera de alcance

- Otros sonidos y animaciones, como el llenado del tablero, el Daily Double o el tiempo agotado. Tendrán su propio cambio más adelante. Solo se incluye la música del temporizador del Final.
- Ingresar apuestas y respuestas del Final desde los celulares. Llega con `pulsadores`. En esta versión, las apuestas las anota el operador y los equipos escriben su respuesta en papel.
- Elegir de qué tablero sale el Final cuando hay varias rondas. `rondas` lo tomará del tablero de la última ronda.
- Editar la pista final durante el juego o escribirla en la pantalla de equipos. Siempre se edita en el editor.
- Desempate después del Final. Los equipos empatados comparten posición en el podio, como hoy.
- Cambiar la duración del temporizador. Siempre es de 30 s.
- Subir la versión del formato de intercambio. Una app antigua en caché que importe un archivo nuevo descarta la pista final en silencio.

## Impact

- **Dominio:**
  - `src/domain/board.ts`: campo opcional `final` en `Board`. `boardImageIds` incluye sus imágenes.
  - `src/domain/validation.ts`: función para saber si la pista final está completa. `validateBoard` no cambia.
  - `src/domain/game.ts`: opción del Final al iniciar, nueva fase `final` con sus acciones, y transición desde el tablero o "terminar".
  - `src/domain/projection.ts`: fase de TV para el Final, filtrada por etapa.
  - `src/domain/exchange.ts`: el esquema acepta y conserva `final`.
- **UI:**
  - Editor: sección "Pista final" con sus imágenes.
  - `TeamSetupScreen`: toggle del Final.
  - `OperatorScreen`: paneles de apuestas, pista y temporizador, y revelación. Reproduce la música.
  - `TvScreen`: categoría, pista con cuenta regresiva y revelación por equipo.
- **Recursos:** una pista de audio CC0 de unos 30 s en `public/audio/`, con su crédito y licencia documentados. `vite.config.ts` precachea el audio.
- **Pruebas:** unitarias de dominio (reducer, límites, orden de revelación, proyección, intercambio), de componentes (editor, equipos, operador, TV) y e2e del Final completo.
- **Datos:** sin migración. `BOARD_SCHEMA_VERSION` y `EXCHANGE_SCHEMA_VERSION` se mantienen en 1.
- **Dependencias:** ninguna nueva.
