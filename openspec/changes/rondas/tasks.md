> Cada tarea es un commit en la rama `change/rondas`. La rama se crea desde `change/final-jeopardy` y se implementa después de `daily-double` y `final-jeopardy`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`. Si la tarea toca la UI, e2e o el build, también `npm run test:e2e`. Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Dominio

- [x] 1.1 En `src/domain/game.ts`, reemplazar `boardSnapshot` por `rounds: GameRound[]` y `roundIndex`, con `currentRound`, `sessionBoards` y `normalizeSession`. Adaptar `gameReducer`, `projectForTv`, `OperatorScreen`, `storage/db.ts` (`getSession` normaliza, y `deleteBoard` recorre `sessionBoards` de sesiones normalizadas) y `ui/editor/imageCleanup.ts`, sin cambiar el comportamiento: `startGame` crea una sola ronda en x1. Verificar con tests unitarios:
  - Todos los tests existentes de `game`, `projection` y `db` pasan con la forma nueva.
  - `normalizeSession` convierte una sesión con `boardSnapshot` en una ronda x1 con `roundIndex: 0`, y deja igual una sesión con `rounds`.
  - `deleteBoard` conserva una imagen que solo usa la segunda ronda de una sesión guardada.
  - `getSession` devuelve normalizada una sesión guardada con la forma anterior.
- [x] 1.2 Cambiar `startGame` para recibir `RoundSetup[]`, con `validateRounds` (de 1 a 5 rondas, tableros listos y distintos, multiplicador entero de 1 a 10) y la validación de `withFinal` sobre la última ronda. Actualizar `finalClueOf` para leer la última ronda. Verificar con tests unitarios en `game.test.ts`:
  - `[{ board, multiplier: 1 }]` produce la misma sesión que antes.
  - Se rechazan 6 rondas, un tablero repetido, un tablero no listo y los multiplicadores 0, 11 y 1.5, con un mensaje en español.
  - `withFinal` se rechaza si solo la primera ronda tiene pista final, y se acepta si la tiene la última.
  - `finalClueOf` devuelve la pista final de la última ronda.
- [x] 1.3 Agregar `clueValueInPlay` y aplicarla en `award`, y aplicar el multiplicador en `maxWager`. Verificar con tests unitarios:
  - En x2, `award` sobre la celda de 400 suma 800.
  - En un Daily Double en x2, `award` sigue usando la apuesta.
  - En x2 con un tablero de 100 a 500, `maxWager` es 1000 para un equipo con 300 y 1200 para uno con 1200, y `placeWager` rechaza 1100 para el equipo con 300.
- [x] 1.4 Agregar la fase `roundBreak`, `endRound` y las acciones `finishRound` y `startNextRound`, y hacer que `backToBoard` use `endRound`. Verificar con tests unitarios en `game.test.ts`:
  - La última celda de la ronda 1 de 2 lleva a `roundBreak` con `nextRoundIndex: 1`.
  - La última celda de la ronda 2 de 2 va al Final (activo y con puntaje positivo) o al podio.
  - `finishRound` desde `board` y desde `clue` (la celda queda usada) lleva a `roundBreak`, y en la última ronda devuelve la misma referencia.
  - `finish` en la ronda 1 de 3 va al podio sin Final, y al Final con Final activo.
  - `startNextRound` avanza `roundIndex`, vacía `usedClues` y conserva los puntajes.
  - En `roundBreak`, `openClue`, `reveal`, `award`, `placeWager` y `backToBoard` devuelven la misma referencia, y `setScore` funciona.
- [x] 1.5 En `src/domain/projection.ts`, proyectar los valores multiplicados (`categories`, `clue` y `dailyDouble`), `round` solo con 2 o más rondas, el título de la ronda en curso y la fase `roundBreak`. Cambiar a `number` el tipo de los valores del `TvView`. Verificar con tests unitarios sobre `JSON.stringify(view)`:
  - En x2, el tablero proyecta 200 a 1000, la celda abierta de 300 proyecta 600, y el Daily Double de 300 también proyecta 600.
  - Sin rondas no hay `round`.
  - En `roundBreak` aparecen el número, el total, el multiplicador y el título de la ronda siguiente, y no aparece ninguna pregunta, respuesta ni id de imagen de su tablero.

## 2. Inicio del juego

- [x] 2.1 En `TeamSetupScreen`, agregar la casilla "Jugar con rondas" y la lista de rondas: la ronda 1 con el tablero actual, "Agregar ronda" hasta 5, un selector de tableros listos que deshabilita los ya usados, un multiplicador que parte en el número de ronda, "Quitar" cuando hay más de 2, errores en vivo con `validateRounds` y la casilla del Final según la última ronda. Verificar con tests de componentes en `TeamSetupScreen.test.tsx`:
  - Sin activar rondas, la sesión guardada tiene una ronda x1 con el tablero actual.
  - Al activar, se muestran la ronda 1 con el tablero actual y la ronda 2 con x2 por defecto.
  - Un tablero no listo no aparece en el selector, y uno ya elegido está deshabilitado en otra ronda.
  - Un multiplicador en 11 muestra el error y no permite comenzar.
  - Con 5 rondas, "Agregar ronda" está deshabilitado.
  - La casilla del Final solo está disponible si el tablero de la última ronda tiene pista final completa.
  - Comenzar guarda una sesión con las rondas y multiplicadores elegidos.

## 3. Operador y TV

- [ ] 3.1 En `OperatorScreen`, agregar el indicador "Ronda N de M · xK", los valores multiplicados en `CluePanel`, el panel de transición con "Comenzar ronda N", y "Terminar ronda" con confirmación solo cuando hay una ronda siguiente. `pendingCount` usa la ronda en curso. Verificar con tests de componentes en `OperatorScreen.test.tsx`:
  - El indicador aparece con rondas y no aparece sin rondas.
  - En x2, los botones dicen "Sumar 600" en la celda de 300.
  - "Terminar ronda" pide confirmación, cancelar no cambia nada y confirmar muestra la transición.
  - En la última ronda no aparece "Terminar ronda".
  - "Comenzar ronda 2" muestra el tablero con todas sus celdas disponibles.
  - Recargar en la transición la recupera, y una sesión con la forma anterior se reanuda.
- [ ] 3.2 En `TvScreen`, agregar el indicador de ronda y la pantalla de transición con los puntajes. En `ui/game/BoardGrid`, ajustar la escala de letra para valores de 4 cifras. Verificar con tests de componentes en `TvScreen.test.tsx`: el indicador aparece con rondas y no sin ellas, la transición muestra la ronda, el multiplicador, el título y los puntajes sin el tablero, y el tablero en x2 muestra 200 a 1000.
- [ ] 3.3 Agregar un e2e en `e2e/game.spec.ts`:
  - Crear dos tableros listos e iniciar con rondas (x1 y x2).
  - Jugar una celda de la ronda 1 y usar "Terminar ronda".
  - La TV muestra la transición hacia la ronda 2 con x2.
  - Recargar el operador y verificar que sigue en la transición.
  - Comenzar la ronda 2: la TV muestra los valores 200 a 1000.
  - Sumar la celda de 300 y comprobar que el puntaje sube 600 en ambas ventanas.

  Agregar un caso de 8 categorías en x10 a 1920x1080, sin desplazamiento horizontal ni valores cortados. Verificar que `npm run test:e2e` pasa localmente y que el CI de la rama queda en verde.

## 4. Documentación

- [ ] 4.1 Actualizar `README.md` con cómo armar una partida con rondas, los multiplicadores y la diferencia entre "Terminar ronda" y "Terminar juego". Agregar la entrada de v0.6.0 en `CHANGELOG.md` con las notas de versión de la propuesta. Verificar que `npm run lint` pasa y que el CI de la rama queda en verde.
