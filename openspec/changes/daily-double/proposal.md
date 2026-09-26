## Why

Hoy cada celda vale exactamente lo que dice el tablero y cualquier equipo puede sumar o restar ese valor. Así, el juego no tiene momentos de riesgo ni sorpresas que puedan dar vuelta el marcador. El **Daily Double** del Jeopardy original resuelve eso: es una celda escondida en la que un solo equipo apuesta antes de ver la pista. Es el primer paso para acercar la experiencia al programa, y el más barato, porque no toca la estructura del tablero ni del juego.

**Rama del cambio:** `change/daily-double` (creada desde `main`, se integra por PR con CI en verde).

Este cambio es el primero de un roadmap de cinco que se propusieron encadenados, cada uno sobre la rama del anterior:

1. `daily-double` (este)
2. `final-jeopardy`: pista final con apuestas secretas y temporizador de 30 s.
3. `rondas`: N rondas, cada una con su tablero y su multiplicador.
4. `app-escritorio`: app Electron con servidor en la red local.
5. `pulsadores`: pulsadores desde los celulares por QR.

## What Changes

- En el editor, cada celda se puede **marcar como Daily Double**. No hay tope: un tablero puede tener desde ninguna hasta todas sus celdas marcadas, y lo decide quien lo arma. Marcar una celda no afecta la validación de "listo para jugar".
- El editor y el tablero del operador muestran qué celdas son Daily Double. La TV **nunca** revela dónde están.
- En el juego, al abrir una celda Daily Double:
  - La TV muestra la pantalla **"DAILY DOUBLE!"** con la categoría y el valor, pero **sin la pregunta ni su imagen**, que ni siquiera se envían a la TV.
  - El operador ve la pregunta y la respuesta, como en cualquier celda, y registra **qué equipo responde** y **cuánto apuesta**.
  - La apuesta va de **0** al **mayor entre el puntaje del equipo y el valor más alto del tablero**, de modo que un equipo con 0 o negativo igual puede apostar.
  - Una vez registrada la apuesta, la TV muestra la pregunta junto con el equipo y su apuesta, y el juego sigue como una celda normal (revelar, volver al tablero).
  - Sumar o restar puntos en un Daily Double usa **la apuesta**, no el valor de la celda, y solo está disponible para el equipo que responde.
- La corrección manual de puntajes sigue disponible como siempre, también en un Daily Double.
- Si la vista de operador se recarga, el juego se recupera en el mismo punto, incluida la espera de la apuesta o la apuesta ya registrada.
- Exportar e importar conservan las marcas de Daily Double. Los tableros y archivos existentes siguen siendo válidos y no tienen ninguna celda marcada.

## Notas de versión

**v0.4.0** (minor)

- Daily Double: marca las celdas que quieras en el editor. Al abrirlas, la TV anuncia "DAILY DOUBLE!" y el equipo apuesta antes de ver la pista.
- La apuesta va de 0 hasta el puntaje del equipo o el valor más alto del tablero, lo que sea mayor. Los equipos en 0 o negativos también pueden apostar.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `board-editing`: se agrega marcar y desmarcar celdas como Daily Double en el editor.
- `board-storage`: exportar e importar conservan las marcas de Daily Double, y los archivos sin marcas siguen importándose.
- `game-session`: se agregan la fase de apuesta, sus límites y los puntos por apuesta. "Asignar puntos por pregunta" y "Recuperar el juego en curso" cambian para cubrir el Daily Double.
- `game-presentation`: se agrega la pantalla "DAILY DOUBLE!" y la regla de no revelar la ubicación de los Daily Double ni la pregunta antes de la apuesta. "Reflejar el estado del juego" cambia para incluir esa excepción.

## Fuera de alcance

- Sonidos y animaciones, incluida la animación o el sonido del Daily Double. Tendrán su propio cambio más adelante.
- Sortear automáticamente dónde van los Daily Double. Siempre los marca el editor.
- Fijar un tope o un mínimo de Daily Doubles por tablero.
- Aplicar el multiplicador de ronda al máximo de la apuesta. Llega con `rondas`.
- Final Jeopardy, rondas, app de escritorio y pulsadores. Cada uno tiene su propio cambio en el roadmap.
- Saber qué equipo "tiene el control" del tablero. El operador elige qué equipo responde.
- Editar la apuesta después de registrarla. Los errores se corrigen con la corrección manual de puntajes.
- Subir la versión del formato de intercambio. Una app antigua en caché que importe un archivo nuevo descarta las marcas en silencio.

## Impact

- **Dominio:**
  - `src/domain/board.ts`: `Clue` recibe el campo opcional `dailyDouble` y se agrega una función para calcular el valor más alto del tablero.
  - `src/domain/game.ts`: nueva fase de apuesta, nueva acción para registrarla, y `award` usa la apuesta en un Daily Double.
  - `src/domain/projection.ts`: nueva fase de TV para el Daily Double. La TV no recibe las marcas.
  - `src/domain/exchange.ts`: el esquema acepta y conserva `dailyDouble`.
- **UI:**
  - `ui/editor/ClueDialog` y `ui/editor/BoardGrid`: casilla y marca de Daily Double.
  - `OperatorScreen`: formulario de apuesta y botones de puntos limitados al equipo que responde. El tablero del operador marca los Daily Double.
  - `TvScreen`: pantalla "DAILY DOUBLE!", y el equipo y la apuesta junto a la pregunta.
- **Pruebas:** unitarias de dominio (reducer, límites de apuesta, proyección, intercambio), de componentes (editor, operador, TV) y e2e de un Daily Double completo.
- **Datos:** sin migración. `BOARD_SCHEMA_VERSION` y `EXCHANGE_SCHEMA_VERSION` se mantienen en 1.
- **Dependencias:** ninguna nueva.
