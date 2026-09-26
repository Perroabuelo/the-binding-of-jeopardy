## Why

La versión web no puede recibir conexiones de otros dispositivos: una pestaña del navegador no puede actuar como servidor. Para que los invitados usen sus celulares como pulsadores (cambio `pulsadores`), alguien en la red local tiene que hacer de punto de encuentro. Este cambio crea la **modalidad fiesta**: una app de escritorio para Windows, hecha con Electron, que el anfitrión instala y abre como cualquier programa. Por dentro levanta un servidor en la red wifi, y además da más control que el navegador sobre las ventanas: la TV se abre sola en el segundo monitor y a pantalla completa. La versión web sigue existiendo igual que hoy, sin pulsadores.

**Rama del cambio:** `change/app-escritorio`. Se crea desde `change/rondas` porque asume implementados y archivados `daily-double`, `final-jeopardy` y `rondas`. Se archiva después de ellos y se integra por PR con CI en verde.

Roadmap encadenado, cada cambio sobre la rama del anterior:

1. `daily-double`
2. `final-jeopardy`
3. `rondas`
4. `app-escritorio` (este)
5. `pulsadores`: pulsadores desde los celulares por QR, sobre la conexión en red local que deja este cambio.

## What Changes

- **Dos modalidades del mismo build.**
  - **Web:** GitHub Pages, como hoy. Sin pulsadores, con modo sin conexión (PWA).
  - **Escritorio:** una app Electron para Windows que empaqueta el mismo build de la web.
  - La app sabe en qué modalidad corre por una API que expone Electron. No consulta ningún servidor para averiguarlo.
- **Instalación y arranque.** Se descarga un instalador `.exe` desde GitHub Releases. Instala sin pedir permisos de administrador y deja un acceso directo. Al abrir la app, todo pasa detrás de cámara: arranca el servidor local y se abre la ventana del operador. Si se abre dos veces, se enfoca la ventana que ya está abierta y no se levanta un segundo servidor.
- **Ventana de TV controlada por la app.** "Abrir pantalla de TV" abre la TV en el **segundo monitor a pantalla completa**, si existe. Con un solo monitor se abre como una ventana normal. No hay ventanas emergentes que el navegador pueda bloquear. Cerrar la ventana del operador cierra la TV y detiene el servidor.
- **Conexión en la red local.** La app levanta un servidor HTTP + WebSocket en la red local:
  - Detecta la dirección IP de la red wifi y permite elegir otra interfaz si detectó la equivocada (VPN, WSL, máquinas virtuales).
  - Muestra una pantalla "Conectar dispositivos" con la dirección y un **código QR**.
  - Un celular que escanea el QR abre una página mínima de conexión y aparece en la lista de **dispositivos conectados** del operador. Esa página es la base sobre la que `pulsadores` construirá el botón.
  - Si el puerto preferido está ocupado, usa el siguiente libre y el QR muestra el puerto real.
  - El servidor no expone tableros ni el estado del juego a la red.
- **Ayuda de conexión.** La pantalla de conexión avisa si Windows marcó la red como **Pública**, porque el firewall bloquea a los celulares. También explica qué revisar si ningún dispositivo logra conectarse: el permiso del firewall y el aislamiento de clientes en redes de invitados.
- **Respaldo de tableros en disco.** En la app de escritorio, cada tablero se respalda automáticamente como archivo de intercambio (`.jeopardy.json`, con imágenes) en `Documentos\The Binding of Jeopardy\Respaldos`. Los respaldos de tableros eliminados pasan a una subcarpeta `eliminados`. Un botón abre la carpeta. Para restaurar un respaldo, o para traer tableros de la versión web, se usa la importación que ya existe.
- **Sin service worker en escritorio.** La app de escritorio ya trae todos sus archivos, así que funciona sin internet desde la primera vez. No registra el service worker, para no quedar con versiones viejas en caché. Se actualiza instalando la versión nueva, y los tableros se conservan.
- **Distribución.** Al crear un tag `vX.Y.Z` en GitHub, el CI compila el instalador en un runner de Windows y lo publica en GitHub Releases. El despliegue de la web a GitHub Pages no cambia.
- **Instalador sin firma.** No se compra un certificado de firma de código. Al abrir el instalador, Windows muestra "Windows protegió tu PC", y el README explica cómo continuar ("Más información" → "Ejecutar de todas formas").

## Notas de versión

**v1.0.0** (major). **A confirmar por el usuario.** Es un salto deliberado: marca la primera versión de escritorio. Mientras la app esté en 0.x, las reglas dirían v0.7.0 (minor), porque no hay cambios incompatibles para la web.

- Nueva app de escritorio para Windows: instálala desde GitHub Releases y juega sin depender del navegador.
- La pantalla de TV se abre sola en el segundo monitor y a pantalla completa.
- Conecta celulares escaneando un QR en la misma red wifi. Es la base para los pulsadores que vienen en la próxima versión.
- Tus tableros se respaldan automáticamente en `Documentos\The Binding of Jeopardy\Respaldos`.
- La versión web sigue funcionando como siempre.

## Capabilities

### New Capabilities
- `desktop-app`: la app de escritorio. Cubre instalación y arranque, instancia única, ventanas del operador y de la TV (segundo monitor, pantalla completa), detección de la modalidad, ausencia de service worker, y distribución por GitHub Releases.
- `lan-connection`: la conexión en la red local. Cubre el servidor HTTP + WebSocket, la elección de interfaz y puerto, la pantalla con dirección y QR, la página de conexión del celular, la lista de dispositivos conectados, la ayuda de firewall y redes de invitados, y la regla de no exponer tableros ni estado del juego a la red.

### Modified Capabilities
- `board-storage`: se agrega el respaldo automático de tableros en disco en la app de escritorio.
- `game-presentation`: "Abrir la vista de presentación desde el operador" cambia para que, en escritorio, la TV se abra en el segundo monitor a pantalla completa sin ventanas emergentes.
- `offline-app`: "Funcionamiento sin conexión" y "Actualización sin pérdida de datos" cambian para distinguir la web (PWA) del escritorio (sin service worker, se actualiza reinstalando).

## Fuera de alcance

- **Pulsadores** y cualquier mensaje de juego hacia los celulares, incluidas las apuestas y respuestas del Final desde el celular. Llegan con `pulsadores`.
- **TV como dispositivo de la red.** La TV sigue siendo una ventana de la misma app.
- Instaladores para macOS o Linux. Solo Windows.
- Firma de código y actualización automática. Cada versión nueva se descarga e instala a mano.
- Crear reglas del firewall de Windows o cambiar la categoría de la red desde la app. Ambas cosas requieren permisos de administrador. La app solo avisa y explica.
- Restaurar respaldos con un botón dedicado o sincronizarlos con la web. Se usa la importación que ya existe.
- Importar varios archivos a la vez.
- Sonidos y animaciones. Tendrán su propio cambio.
- Corregir el desfase de reloj entre dispositivos (`timerEndsAt` del Final es absoluto). Como la TV sigue en el mismo equipo, este cambio no lo necesita. `pulsadores` tendrá que resolverlo.

## Impact

- **Código nuevo:**
  - `electron/`: proceso principal, preload, servidor HTTP/WebSocket, ventanas, respaldo, detección de red. Tiene su propio `tsconfig`.
  - `src/net/`: protocolo de la red local, lógica pura del hub de dispositivos, orden de interfaces y transporte WebSocket.
  - `src/platform/`: acceso tipado a la API de escritorio (`window.jeopardyDesktop`) y detección de modalidad.
- **Código modificado:**
  - `src/main.tsx`: el service worker solo se registra en la web.
  - `ui/game/TvLauncher`: en escritorio, abre la TV a través de la API de escritorio.
  - `storage/db.ts` o la UI de tableros: avisa al respaldo al guardar o eliminar un tablero.
  - Pantallas nuevas: "Conectar dispositivos" en el operador y la página de conexión del celular (`#/unirse`).
- **Dependencias nuevas:** `electron`, `electron-builder` (dev), `ws` y `qrcode` (con sus tipos).
- **CI:** job nuevo en un runner de Windows que compila el escritorio y corre una prueba de humo con Playwright `_electron`. Workflow nuevo de release que se dispara con tags `v*` y publica en GitHub Releases. Los jobs actuales y el deploy de la web no cambian.
- **Documentación:** README con la instalación de escritorio, el aviso de SmartScreen, la red Pública y las redes de invitados. Entrada en el CHANGELOG.
- **Datos:** sin migración. La app de escritorio parte con sus propios datos (separados de la web). Los tableros web se traen exportando e importando.
