## Why

Hoy una partida es un solo tablero con valores fijos. El programa original juega en rondas: **Jeopardy!** y después **Double Jeopardy!**, un tablero nuevo con los valores al doble, que es donde se da vuelta el marcador. Este cambio permite armar una partida con varias rondas, cada una con un tablero que ya existe y su propio multiplicador. Es opcional: quien no lo active juega exactamente como hoy.

**Rama del cambio:** `change/rondas`. Se creó desde `change/final-jeopardy`, porque depende de `daily-double` y de `final-jeopardy`, y tras la integración de ambos (v0.4.0 y v0.5.0) quedó rebasada sobre `main`. Se integra por PR con CI en verde.

Roadmap encadenado, cada cambio sobre la rama del anterior:

1. `daily-double`
2. `final-jeopardy`
3. `rondas` (este)
4. `app-escritorio`: app Electron con servidor en la red local.
5. `pulsadores`: pulsadores desde los celulares por QR.

## What Changes

- **Toggle al iniciar.** En la pantalla de equipos aparece la opción "Jugar con rondas". Desactivada, la partida es la de hoy: una ronda con el tablero elegido y valores x1.
- **Armar las rondas.** Con el toggle activo, el operador define de **2 a 5 rondas**. Cada ronda usa un tablero **listo para jugar** distinto de los demás y tiene un **multiplicador** entero de 1 a 10. La ronda 1 parte con el tablero desde el que se entró. Por defecto, la ronda N tiene multiplicador xN (x1, x2, x3…), y el operador puede cambiarlo.
- **Valores multiplicados.** En cada ronda, las celdas valen su valor base por el multiplicador de la ronda: en una ronda x2, la celda de 300 vale 600. El operador y la TV muestran el valor multiplicado, y sumar o restar puntos usa ese valor. Los tableros no cambian: el multiplicador es de la partida, no del tablero.
- **Daily Double por ronda.** Cada tablero trae sus propias celdas Daily Double. El máximo de la apuesta usa el valor más alto de la ronda en curso, ya multiplicado.
- **Transición entre rondas.** Al usar todas las celdas de una ronda que no es la última, la TV muestra una pantalla de transición ("Ronda 2 de 3", el multiplicador y el título del tablero siguiente) y el operador inicia la ronda cuando quiere. Los puntajes se mantienen de una ronda a otra.
- **Última ronda.** Al terminar la última ronda, el juego sigue el flujo actual: Final Jeopardy!, si está activo, o el podio.
- **Final de la última ronda.** La pista final sale del tablero de la última ronda. La opción "Jugar Final Jeopardy!" se habilita según ese tablero.
- **Terminar antes, con dos opciones.**
  - "Terminar ronda" pasa a la transición de la siguiente ronda. Solo aparece si queda al menos una ronda después.
  - "Terminar juego" funciona como hoy: lleva al Final, si está activo y hay equipos con puntaje positivo, o al podio.
  - Ambas piden confirmación.
- **Indicador de ronda.** Con rondas, el operador y la TV muestran en qué ronda va el juego y su multiplicador.
- Si la vista de operador se recarga, el juego se recupera en la misma ronda, incluida la pantalla de transición.
- La TV sigue mostrando el tablero completo y legible con valores de hasta 4 cifras.

## Notas de versión

**v0.6.0** (minor)

- Rondas: arma una partida de 2 a 5 rondas, cada una con uno de tus tableros y su propio multiplicador (por ejemplo, Double Jeopardy! con los valores al doble).
- Entre ronda y ronda, la TV muestra una pantalla de transición y los puntajes se mantienen.
- El Final Jeopardy! sale del tablero de la última ronda.
- Ahora puedes terminar solo la ronda en curso, o el juego completo.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `game-session`: se agregan el armado de rondas, la transición y "terminar ronda". "Iniciar un juego con equipos", "Seleccionar una pregunta", "Asignar puntos por pregunta", "Registrar la apuesta de un Daily Double", "Fin del juego y podio" y "Recuperar el juego en curso" cambian para cubrir rondas y multiplicadores.
- `game-presentation`: se agregan la pantalla de transición y el indicador de ronda con valores multiplicados. "Reflejar el estado del juego" y "Tablero legible con cualquier cantidad de categorías" cambian para cubrirlos.

## Fuera de alcance

- Sonidos y animaciones de transición o de llenado del tablero. Tendrán su propio cambio.
- Guardar "plantillas de partida" (una combinación de tableros y multiplicadores) para reutilizarlas. Las rondas se arman cada vez al iniciar.
- Multiplicadores no enteros o por celda, y valores base distintos de 100 a 500.
- Repetir el mismo tablero en dos rondas.
- Un Final por ronda o elegir de qué ronda sale el Final. Siempre sale de la última.
- Volver a una ronda anterior o reordenar rondas durante el juego.
- Cambiar el formato del tablero o del archivo de intercambio. Las rondas viven solo en la partida.
- App de escritorio y pulsadores. Tienen sus propios cambios.

## Impact

- **Dominio:**
  - `src/domain/game.ts`: la sesión guarda las rondas (tablero y multiplicador) y la ronda en curso en lugar de un único `boardSnapshot`. Nuevas opciones de `startGame`, fase de transición, acciones para terminar e iniciar rondas, y valores multiplicados en `award` y `maxWager`. `finalClueOf` usa el tablero de la última ronda. Normaliza las sesiones guardadas con la forma anterior.
  - `src/domain/projection.ts`: valores multiplicados, indicador de ronda y fase de transición para la TV.
- **Almacenamiento:** `storage/db.ts` (`deleteBoard`, `getSession`) y `ui/editor/imageCleanup.ts` consideran las imágenes de todos los tableros de una sesión guardada.
- **UI:**
  - `TeamSetupScreen`: toggle, selección de tableros y multiplicadores por ronda.
  - `OperatorScreen`: indicador de ronda, valores multiplicados, transición, "Terminar ronda" y "Terminar juego".
  - `TvScreen`: indicador de ronda y pantalla de transición. `ui/game/BoardGrid` ajusta el tamaño de letra a valores de 4 cifras.
- **Pruebas:** unitarias de dominio (armado, multiplicadores, transición, terminar ronda o juego, Final de la última ronda, normalización), de componentes (equipos, operador, TV) y e2e de una partida de dos rondas.
- **Datos:** sin migración de tableros. Las sesiones guardadas con la forma anterior se normalizan al leerlas.
- **Dependencias:** ninguna nueva.
