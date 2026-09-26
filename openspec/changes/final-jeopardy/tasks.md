> Cada tarea es un commit en la rama `change/final-jeopardy`. La rama se crea desde `change/daily-double` y se implementa después de él. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`. Si la tarea toca la UI, e2e o el build, también `npm run test:e2e`. Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Dominio

- [x] 1.1 Agregar `FinalClue` y `Board.final?` en `src/domain/board.ts`, con `finalImageIds` e imágenes de `final` en `boardImageIds`. Agregar `isFinalComplete` en `validation.ts`, sin cambiar `validateBoard`. Verificar con tests unitarios:
  - `boardImageIds` incluye las dos imágenes de `final`.
  - `isFinalComplete` es `false` con categoría, pregunta o respuesta vacía, o sin `final`, y `true` con las tres.
  - `validateBoard` sigue en `ready` con una pista final ausente o incompleta.
- [x] 1.2 En `exchange.ts`, aceptar `final` opcional en `boardSchema` y reasignar sus ids de imagen en `importBoard`. Verificar con tests unitarios:
  - La ida y vuelta conserva categoría, pregunta, respuesta e imágenes de `final`.
  - Un archivo sin `final` se importa sin pista final.
  - Una imagen de `final` faltante o dañada lanza `ImportError`.
- [x] 1.3 En `src/domain/game.ts`, agregar `finalEnabled?` en la sesión y `withFinal` en `startGame`. Agregar la fase `final` con etapas, `finished.finalSkipped?`, `endBoard`, `finalClueOf`, las acciones `setFinalWager`, `showFinalClue`, `startFinalTimer`, `startFinalReveal`, `judgeFinal` y `revealFinalAnswer`, `finish` desde `final`, y `FINAL_TIMER_MS` y `finalTimeRemaining`. Verificar con tests unitarios en `game.test.ts` (ver casos en design, Estrategia de pruebas):
  - `startGame` rechaza `withFinal` sin pista final completa.
  - La entrada desde `backToBoard` y desde `finish`.
  - El orden 1200/400/800 → Tíos, Abuelos, Primos, con un empate estable.
  - El salto con `finalSkipped`.
  - Los límites de apuesta (0, `entryScore`, +1, negativo, 2.5, no participante), que devuelven la misma referencia.
  - Sobrescribir una apuesta.
  - `showFinalClue` bloqueada con apuestas faltantes.
  - `startFinalTimer` reinicia.
  - `judgeFinal` en turno (+400 → 800; −1000 → 200), fuera de turno y repetido.
  - `finish` desde `final` no aplica las apuestas pendientes.
  - `setScore` no cambia `entryScore`.
  - `finalTimeRemaining` en 0, 10, 30 y 45 s.
- [x] 1.4 En `src/domain/projection.ts`, proyectar la fase `final` por etapa y `finalSkipped`. Verificar con tests unitarios sobre `JSON.stringify(view)`:
  - En `wagers` no aparecen la pregunta, la respuesta, los ids de sus imágenes ni los montos anotados, y sí `wagersReady`.
  - En `clue` no aparece la respuesta y sí `question` y `timerEndsAt`.
  - En `reveal` solo aparecen los montos de los equipos juzgados, y la respuesta y su imagen solo con `answerRevealed`.
  - En `finished` aparece `finalSkipped`.

## 2. Editor e inicio

- [x] 2.1 Agregar la sección "Pista final" en el editor: categoría, pregunta, respuesta y dos `ClueImageField`, con parches en `boardEdits.ts` que eliminan `final` si queda vacía. Agregar la línea de estado en `ReadinessPanel`. Verificar con tests de componentes en `EditorScreen.test.tsx`:
  - Completar la pista final persiste tras volver a montar y muestra "completa".
  - Solo la categoría muestra "incompleta" y jugar sigue habilitado.
  - Un tablero sin `final` muestra "sin pista final".
  - Un PDF en la imagen de la pista final muestra el error y no cambia nada.
- [x] 2.2 En `TeamSetupScreen`, agregar la casilla "Jugar Final Jeopardy!" y pasar `withFinal` a `startGame`. Verificar con tests de componentes en `TeamSetupScreen.test.tsx`:
  - Con una pista final completa, la casilla está habilitada y marcada, y la sesión guardada tiene `finalEnabled: true`.
  - Desmarcada, la sesión se guarda con `finalEnabled` en `false`.
  - Con una pista final incompleta o ausente, la casilla no está disponible.

## 3. Música

- [ ] 3.1 Elegir una pieza CC0 de al menos 30 s y menos de 1 MB, que no sea ni imite el tema del programa. Guardarla como `public/audio/final-jeopardy.mp3`, con la URL de origen, el autor y la licencia en `public/audio/CREDITS.md`. Agregar `mp3` a `workbox.globPatterns` en `vite.config.ts`. Verificar que `npm run build` genera `dist/sw.js` con `audio/final-jeopardy.mp3` en el manifiesto de precache. Agregar a `e2e/offline.spec.ts` un `fetch` del audio sin conexión que responda 200.
- [ ] 3.2 Crear el hook `useFinalMusic` en `src/ui/game/`: reproducir desde 0 al iniciar o reiniciar, detener al llegar a 0, al pasar a `reveal` y al desmontar, silenciar con la preferencia en `localStorage` protegida con try/catch, y mostrar un aviso si `play()` falla. Verificar con tests unitarios del hook, con `HTMLMediaElement` simulado: `play` al iniciar, `pause` al terminar el tiempo y al desmontar, `muted` persistido tras volver a montar, aviso cuando `play` rechaza, y que después de recargar no se llama a `play` sin una acción del operador.

## 4. Operador y TV

- [ ] 4.1 En `OperatorScreen`, agregar los paneles de las etapas `wagers`, `clue` y `reveal` (design, decisión 7), la confirmación de "Terminar juego" durante el Final, "Ir al podio" y el aviso de `finalSkipped` en el podio. Verificar con tests de componentes en `OperatorScreen.test.tsx`:
  - Cada participante muestra su máximo y quienes quedan fuera aparecen como "no participan".
  - "Mostrar pista" está deshabilitado con apuestas faltantes.
  - El temporizador llama a `play` y la cuenta regresiva avanza con temporizadores falsos.
  - "Acertó" y "Falló" solo aparecen para el equipo en turno.
  - "Ir al podio" aparece al terminar de juzgar.
  - La recarga en `wagers`, en `clue` con el temporizador a los 10 s y en `reveal` recupera el mismo punto.
- [ ] 4.2 En `TvScreen`, mostrar la categoría con los participantes y el conteo de apuestas, la pregunta con la cuenta regresiva desde `timerEndsAt`, la revelación por equipo con el equipo en turno, la respuesta revelada con su imagen y el aviso de Final saltado en el podio. Verificar con tests de componentes en `TvScreen.test.tsx`: cada etapa muestra lo esperado y no muestra lo oculto, la cuenta regresiva baja de 30 a 0 con temporizadores falsos, y aparece el aviso de `finalSkipped`.
- [ ] 4.3 Agregar un e2e en `e2e/game.spec.ts`:
  - Crear un tablero con pista final y jugar con dos equipos con puntaje positivo y uno en 0, hasta usar todas las celdas.
  - La TV muestra la categoría y no el texto de la pregunta.
  - Anotar las apuestas, recargar el operador y verificar que siguen.
  - Mostrar la pista e iniciar el temporizador: el `audio` del operador no está en pausa y la TV muestra la cuenta regresiva.
  - Pasar a la revelación, juzgar en orden y comprobar los puntajes en ambas ventanas.
  - Revelar la respuesta e ir al podio.

  Agregar en `e2e/boards.spec.ts` la ida y vuelta de un tablero con pista final. Verificar que `npm run test:e2e` pasa localmente y que el CI de la rama queda en verde.

## 5. Documentación

- [ ] 5.1 Actualizar `README.md`: cómo agregar la pista final, activar el Final y jugarlo, y una sección "Créditos" con la música. Agregar la entrada de v0.5.0 en `CHANGELOG.md` con las notas de versión de la propuesta. Verificar que `npm run lint` pasa y que el CI de la rama queda en verde.
