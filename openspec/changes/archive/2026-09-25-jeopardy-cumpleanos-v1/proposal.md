## Why

Se necesita un juego estilo Jeopardy para un cumpleaños, con preguntas e imágenes propias y dos pantallas: una laptop para el anfitrión y una TV para los invitados. Las alternativas existentes no calzan. JeopardyLabs muestra la respuesta a todos al revelarla. `pfroud/jeopardy` depende de preguntas de J! Archive, de hardware y de un CSS fijo. Se necesita una primera versión simple, sin instalación para quien la usa, que sirva de base para iterar.

**Rama del cambio:** `change/jeopardy-cumpleanos-v1` (creada desde `main`, se integra por PR con CI en verde).

## What Changes

- Proyecto nuevo Vite + React + TypeScript, sin backend, desplegado en GitHub Pages bajo `/the-binding-of-jeopardy/`.
- **Editor de tableros**: título, 5 categorías x 5 preguntas (valores 100 a 500), cada una con pregunta, respuesta e imagen opcional subida desde el computador.
- **Persistencia local** en IndexedDB con varios tableros guardados, más **exportar e importar** un archivo que incluye las imágenes.
- **Vista de operador**: tablero, pregunta con su respuesta visible solo para el anfitrión, botón para revelar, equipos con nombre y puntaje a mano (+/-), celdas usadas y pantalla final con podio.
- **Vista de presentación** para la TV, abierta desde el operador. Muestra el tablero, la pregunta, la imagen, la respuesta solo cuando se revela y los puntajes. Se sincroniza por `BroadcastChannel` y se resincroniza si se recarga.
- **PWA**: la app funciona sin conexión después de la primera carga.
- **Calidad**: ESLint, typecheck, Vitest (unitarias y de componentes), Playwright (e2e en Chromium) y pipeline de GitHub Actions que bloquea el deploy si algo falla.

## Capabilities

### New Capabilities
- `board-editing`: creación y edición de un tablero: título, categorías, preguntas, respuestas e imágenes, más la validación de completitud para jugar.
- `board-storage`: guardado local de varios tableros en el navegador, con exportar e importar un archivo portable que incluye imágenes.
- `game-session`: conducción del juego desde la vista de operador: estados del juego, selección de celdas, revelar respuesta, equipos, puntajes y fin con podio.
- `game-presentation`: vista para la TV que refleja el estado del juego sin exponer la respuesta antes de revelarla, con sincronización entre ventanas y recuperación tras recargar.
- `offline-app`: disponibilidad sin conexión de la aplicación una vez cargada.

### Modified Capabilities
<!-- Ninguna: el proyecto no tiene specs previas. -->

## Fuera de alcance

- Daily Double, Final Jeopardy, temporizador y sonidos.
- Buzzers o respuestas desde celulares, y cualquier comunicación entre dispositivos distintos.
- Backend, cuentas, autenticación o compartir tableros por link.
- Estética definitiva: la v1 usa un tema neutro basado en tokens CSS y el tema final será un cambio aparte.
- Tamaños de tablero configurables.
- Hosting en el homeserver (Cloudflare Tunnel): será un cambio posterior.
- Navegadores distintos de Chromium (Chrome o Edge) como objetivo soportado.

## Impact

- **Código**: todo es nuevo (repositorio sin código previo).
- **Dependencias**: react, react-dom, vite, typescript, vite-plugin-pwa, idb, zod, vitest, @testing-library/react, fake-indexeddb, @playwright/test, eslint.
- **Sistemas**: GitHub Actions (CI y deploy) y GitHub Pages en `Perroabuelo/the-binding-of-jeopardy`. Pages debe configurarse con fuente "GitHub Actions".
- **Datos**: los tableros viven solo en el navegador del usuario y nunca se versionan en el repositorio.
