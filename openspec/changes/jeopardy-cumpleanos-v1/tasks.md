> Cada tarea es un commit en la rama `change/jeopardy-cumpleanos-v1`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`, además de `npm run test:e2e` cuando la tarea toca e2e. Después se hace push y se verifica que el CI quede en verde.

## 1. Base del proyecto y CI

- [x] 1.1 Crear el proyecto Vite + React + TypeScript estricto (`.nvmrc` con Node 22, `base: '/the-binding-of-jeopardy/'` en una constante compartida, estructura `src/domain`, `src/storage`, `src/sync`, `src/ui`) con una pantalla "Hola" — verificar que `npm run build` genera `dist/` y `npm run dev` muestra la pantalla
- [x] 1.2 Configurar ESLint (typescript-eslint, react-hooks, `no-restricted-imports` que impide a `src/domain/**` importar React, DOM o las capas `storage`/`sync`/`ui`) y Prettier, con los scripts `lint` y `typecheck` — verificar que ambos pasan y que un import prohibido de prueba en `domain` hace fallar `lint`
- [ ] 1.3 Configurar Vitest (proyectos node y jsdom) con Testing Library y un test inicial de la pantalla "Hola" — verificar que `npm test` pasa
- [ ] 1.4 Configurar Playwright (solo Chromium, `webServer` con `vite preview` usando la base real, SW bloqueado por defecto) con un e2e que abre la app — verificar que `npm run test:e2e` pasa localmente
- [ ] 1.5 Agregar `.github/workflows/ci.yml` con los jobs `checks` (lint, typecheck, unit, build) y `e2e` (subiendo `playwright-report` si falla), caché de npm y concurrencia por rama — verificar que el push de la rama deja ambos jobs en verde en GitHub
- [ ] 1.6 Agregar el job `deploy` (necesita `checks` y `e2e`, solo en push a `main`, `upload-pages-artifact` + `deploy-pages`) y documentar en `README.md` la configuración manual de Pages (fuente "GitHub Actions") y la protección de `main` — verificar con `actionlint` o con la ejecución del CI que el job se omite en la rama del cambio

## 2. Dominio: tablero

- [ ] 2.1 Implementar en `src/domain/board.ts` los tipos `Board`/`Category`/`Clue`, `createEmptyBoard()` (5x5, valores 100-500), las claves de celda y el fixture ficticio `tests/fixtures/board.ts` — verificar con tests unitarios la estructura y los valores del tablero vacío
- [ ] 2.2 Implementar `validateBoard(board)`, que devuelve si está listo y la lista de faltantes (título, categorías sin nombre, celdas sin pregunta o respuesta) — verificar con tests unitarios para el tablero vacío, el tablero con una respuesta faltante y el fixture completo
- [ ] 2.3 Implementar `validateImageFile({type, size})` (PNG/JPEG/GIF/WebP, ≤ 5 MB) — verificar con tests unitarios los formatos válidos, un PDF y un archivo de 8 MB

## 3. Dominio: juego

- [ ] 3.1 Implementar el tipo `GameSession`, `startGame(board, teamNames)` (1 a 8 equipos con nombre no vacío, puntajes en 0, copia del tablero) y `gameReducer` con `openClue`, `reveal`, `backToBoard` y `finish`, siguiendo la máquina de estados del diseño — verificar con tests unitarios cada transición válida, que las inválidas devuelven la misma referencia, que una celda usada no se reabre y que el juego termina automáticamente con las 25 usadas
- [ ] 3.2 Agregar al reducer `award(teamId, ±1)` y `setScore(teamId, n)` — verificar con tests unitarios la suma, la resta con resultado negativo, que `award` es inválida fuera de fase `clue` y que `setScore` funciona en `board` y en `clue`
- [ ] 3.3 Implementar `rankTeams(teams)` con ranking de competencia (1, 1, 3) — verificar con tests unitarios el orden, los empates y un solo equipo
- [ ] 3.4 Implementar `projectForTv(session)` — verificar con tests unitarios que el resultado, serializado a JSON, no contiene ninguna respuesta en fase `board` ni en `clue` sin revelar, y que contiene solo la respuesta abierta cuando `revealed` es verdadero

## 4. Almacenamiento

- [ ] 4.1 Implementar `src/storage/db.ts` con `idb` (almacenes `boards`, `images`, `sessions`), las funciones del repositorio y el error `StorageUnavailable` — verificar con tests en `fake-indexeddb` el CRUD, el orden de `listBoards` por `updatedAt`, el borrado en cascada de imágenes y el mapeo de un error de cuota simulado
- [ ] 4.2 Implementar en `src/domain/exchange.ts` `exportBoard(board, images)` e `importBoard(json)` con validación zod e ids nuevos — verificar con tests unitarios la ida y vuelta (mismo contenido e imágenes, ids distintos), la doble importación con ids distintos y el rechazo de un JSON ajeno, de una versión desconocida, de una estructura que no es 5x5 y de una data URL de tipo no permitido

## 5. UI: tema, ruteo y tableros

- [ ] 5.1 Crear `src/ui/theme/tokens.css` (tema neutro de alto contraste), el router por hash (`#/`, `#/boards/:id`, `#/play/:id`, `#/tv/:id`) con una pantalla 404 y un test que verifique que no hay colores literales fuera de `tokens.css` — verificar con tests de componentes que cada ruta renderiza su pantalla
- [ ] 5.2 Implementar la pantalla de lista de tableros (crear, abrir, eliminar con confirmación y aviso de `StorageUnavailable`) — verificar con tests de componentes crear, abrir, cancelar y confirmar la eliminación
- [ ] 5.3 Implementar el editor de título, categorías y celdas (pregunta y respuesta en un diálogo) con autoguardado con debounce — verificar con tests de componentes la edición y un e2e que edita, recarga y ve los cambios conservados
- [ ] 5.4 Agregar al editor la imagen por pregunta (adjuntar, vista previa, quitar y mensaje de rechazo) — verificar con tests de componentes una imagen válida, un PDF y un archivo de más de 5 MB
- [ ] 5.5 Agregar al editor el indicador de faltantes y el botón "Jugar" deshabilitado mientras no esté listo — verificar con tests de componentes que el botón se habilita solo con el fixture completo y que la celda incompleta queda señalada
- [ ] 5.6 Agregar exportar (descarga de `<titulo>.jeopardy.json`) e importar (selector de archivo y mensaje de error) en la lista de tableros — verificar con un e2e que exporta un tablero con imagen, lo importa y encuentra un segundo tablero idéntico, y con un e2e que importa un archivo inválido y ve el error

## 6. UI: juego con dos ventanas

- [ ] 6.1 Implementar la configuración de equipos y la vista de operador (tablero, pregunta con respuesta, "Revelar", +/- por equipo, editar puntaje, volver al tablero, terminar con confirmación y podio), persistiendo la sesión en cada cambio — verificar con tests de componentes el flujo de una pregunta y con un e2e que juega dos preguntas, recarga el operador y reanuda con los mismos puntajes
- [ ] 6.2 Implementar `src/sync` (`SyncTransport`, transporte `BroadcastChannel`, transporte en memoria y protocolo `hello/state/ping/bye` con timeout de 10 s) — verificar con tests unitarios (transporte en memoria y timers falsos) la respuesta a `hello`, el envío de estado en cada cambio y la pantalla de espera tras `bye` o timeout
- [ ] 6.3 Implementar la vista de presentación de solo lectura (tablero, pregunta con imagen, respuesta revelada, puntajes, podio y pantalla de espera, con imágenes leídas de IndexedDB) y el botón "Abrir pantalla de TV" con aviso de popup bloqueado y la URL para copiar — verificar con tests de componentes el render por fase y que un click en la TV no emite acciones
- [ ] 6.4 Agregar el e2e de dos ventanas: abrir la TV (evento `popup`), abrir una celda, comprobar que el DOM de la TV no contiene la respuesta, revelar y verla en menos de 1 s, sumar puntos, recargar la TV y ver el estado actual, cerrar el operador y ver la pantalla de espera, y terminar el juego y ver el podio en ambas ventanas — verificar que `npm run test:e2e` pasa

## 7. PWA y cierre

- [ ] 7.1 Configurar `vite-plugin-pwa` (`generateSW`, `registerType: 'prompt'` sin `skipWaiting`, scope y base del sitio, manifest e íconos neutros) — verificar con un e2e con SW habilitado que, tras cargar con red, `context.setOffline(true)`, recargar y abrir operador y TV, todo sigue funcionando con los tableros disponibles
- [ ] 7.2 Revisión final: recorrer las specs y confirmar que cada scenario tiene su test, actualizar `README.md` (uso, desarrollo, deploy y advertencia de no commitear tableros reales), correr toda la suite y abrir el PR a `main` — verificar el CI en verde en el PR y, tras fusionarlo, que la app carga en `https://perroabuelo.github.io/the-binding-of-jeopardy/`
