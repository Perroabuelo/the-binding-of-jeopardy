> Cada tarea es un commit en la rama `change/tv-sin-desplazamiento`, creada desde `main`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck`, `npm test` y `npm run test:e2e`. Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Pruebas que muestran el problema

- [x] 1.1 En `e2e/game.spec.ts`, agregar el helper `expectFitsWindow(tv)` y los tres casos del diseño: 1920x1080 con 6 categorías largas y 2 equipos; 1280x720 con 8 categorías largas, ronda x10, 8 equipos y equipo que elige (escribiendo `controlTeamId` en la sesión guardada y recargando el operador); y 1280x720 con 3 categorías y 1 equipo. Marcarlos con `test.fail()` para dejar registrado que hoy fallan. Verificar con `npm run test:e2e`: los tres casos se reportan como fallas esperadas y el resto pasa.

## 2. Corrección

- [ ] 2.1 Hacer que la TV mida exactamente la ventana y que el tablero tome el espacio sobrante (diseño, decisiones 1 y 2): `.tv` con `height: 100%`, `data-phase` en `TvScreen`, `overflow: hidden` solo en la fase de tablero, contenedor `.tvBoard` con `flex: 1; min-height: 0`, tabla con `height: 100%`, celdas sin `min-height: 12vh`, y topes en `vh` para `--tv-cell-font` y `--tv-category-font`. Verificar con `npm run test:e2e`: el caso de 1920x1080 y el de 3 categorías pasan (quitarles `test.fail()`), y los tests existentes de "TV en 1920x1080" siguen pasando, incluida la letra de valores ≥ 32px.
- [ ] 2.2 Poner los puntajes de la TV en una fila con letra según la cantidad de equipos (decisiones 3 y 4): `--teams` en `TeamScores`, `--tv-score-font`, `flex-wrap: nowrap`, puntos suspensivos para nombres largos, y "Elige: …" con tope en `vh`. Verificar con un test de componente en `TeamScores` (en modo TV, la lista define `--teams` con la cantidad de equipos) y con `npm run test:e2e`: el caso de 1280x720 con 8 equipos pasa sin `test.fail()`.

## 3. Verificación visual

- [ ] 3.1 Revisar con capturas a 1920x1080 y 1280x720 (tablero de 6 categorías con 2 equipos, y de 8 con 8 equipos) que la TV se ve bien y legible, y adjuntarlas al PR. Verificar con el CI en verde en el PR.
