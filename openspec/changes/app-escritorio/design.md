## Context

La motivación está en `proposal.md` (Why) y los requisitos en `specs/`.

**Depende de `daily-double`, `final-jeopardy` y `rondas`. Se archiva después de los tres.** Este cambio no modifica ningún requisito que esos cambios hayan agregado o modificado, así que cada bloque `MODIFIED` parte del texto de `openspec/specs`:

| Requisito | Parte de |
|---|---|
| `game-presentation` / "Abrir la vista de presentación desde el operador" | `openspec/specs` (ninguno de los tres cambios lo toca) |
| `offline-app` / "Funcionamiento sin conexión" | `openspec/specs` |
| `offline-app` / "Actualización sin pérdida de datos" | `openspec/specs` |

Si al implementarse alguno de los tres cambios previos llega a tocar esos requisitos, hay que revisar estos bloques antes de archivar. Del código de esos cambios, este diseño solo asume dos cosas: `boardImageIds` incluye las imágenes de la pista final (`final-jeopardy`), y la música del Final se precachea en la web (`final-jeopardy`). En escritorio, la música viene empaquetada y no necesita precache.

Estado relevante del código:

- **Build:** un solo build de Vite con `base: SITE_BASE` (`/the-binding-of-jeopardy/`), `vite-plugin-pwa` con `registerType: 'prompt'`, y `registerSW({ immediate: true })` en `src/main.tsx`.
- **Rutas:** router por hash (`#/`, `#/boards/:id`, `#/play/:id`, `#/tv/:id`).
- **Sincronización:** operador y TV se hablan por `BroadcastChannel` a través de la interfaz `SyncTransport` (`src/sync/transport.ts`), con `SyncMessage` = `hello | state | ping | bye`. Existe `createMemoryBus` para tests.
- **Ventana de TV:** `ui/game/TvLauncher.tsx` la abre con `window.open(url, 'jeopardy-tv')`, avisa si el navegador la bloquea y muestra la URL para copiarla.
- **Almacenamiento:** IndexedDB (`storage/db.ts`). El editor guarda solo con debounce (`useBoardEditor`). La lista de tableros guarda al crear o importar y borra con `deleteBoard`. `ui/boards/boardFiles.ts` arma el archivo de exportación (`exportBoard` más las imágenes como data URLs).
- **CI:** `checks` (lint, typecheck, unit, build) → `e2e` (Playwright Chromium contra `vite preview`) → `deploy` a Pages, solo en `main`. Todo corre en `ubuntu-latest`.
- **Vitest:** proyectos `unit` (node) y `dom` (jsdom), con `include` explícitos por carpeta.

## Goals / Non-Goals

**Goals:**
- Un solo build de Vite para las dos modalidades. La app de escritorio empaqueta exactamente el mismo `dist/` que se despliega en Pages.
- Toda la lógica nueva que no depende de Electron ni de Node vive como código puro y probado sin Electron: el protocolo y el hub de dispositivos, el orden de interfaces, la elección de monitor, los nombres de respaldo, la resolución de rutas estáticas y el parseo del perfil de red.
- El proceso principal de Electron es una capa delgada de adaptadores.
- La versión web no cambia de comportamiento.
- La TV sigue sincronizándose por `BroadcastChannel`. La red local es un canal aparte, solo para dispositivos.

**Non-Goals:**
- Enviar mensajes de juego a los celulares (`pulsadores`).
- Firma de código, actualización automática, macOS y Linux.
- Reemplazar IndexedDB por archivos en disco.

## Decisions

### 1. Arquitectura de procesos

```
  +--------------------------- proceso principal (Node) ----------------------------+
  |  protocolo app://jeopardy  --> sirve dist/ (ventanas de la app)                  |
  |  servidor LAN http+ws :47470..47479 (0.0.0.0) --> sirve dist/ + /ws              |
  |  hub de dispositivos (src/net/hub.ts, puro)                                      |
  |  respaldo en disco, perfil de red (PowerShell), elección de monitor              |
  +-------------+-------------------------------+-----------------------------------+
                | IPC (preload: window.jeopardyDesktop)       ^ WebSocket
                v                               |             |
  +------------------------+        +------------------------+   +------------------+
  | ventana operador       | <----> | ventana TV             |   | celular (#/unirse)|
  | app://jeopardy/...     | Broad- | app://jeopardy/...#/tv |   | http://IP:puerto |
  +------------------------+ cast-  +------------------------+   +------------------+
                             Channel
```

- El operador **no** usa WebSocket. Recibe la lista de dispositivos y el estado de la red por IPC (`onLanStatus`). El hub vive en el proceso principal, que es quien tiene los sockets.
- Los celulares usan un transporte WebSocket del lado del navegador (decisión 5).

*Alternativa descartada:* que el operador también se conecte por WebSocket a `127.0.0.1`. Duplica el camino, hace que el operador dependa del puerto y agrega problemas de contenido mixto entre `app://` y `ws://`, sin ninguna ventaja.

### 2. Origen estable con un esquema propio `app://jeopardy`

- Las ventanas de la app cargan `app://jeopardy/the-binding-of-jeopardy/index.html#/`. El esquema se registra antes de `ready` con `protocol.registerSchemesAsPrivileged` (`standard`, `secure`, `supportFetchAPI`, `stream`, **sin** `allowServiceWorkers`), y `protocol.handle` sirve los archivos de `dist/` empaquetado.
- El origen `app://jeopardy` no depende del puerto de la red local. IndexedDB y `localStorage` quedan siempre en el mismo lugar (la carpeta `userData` de Electron), y `BroadcastChannel` sigue funcionando entre la ventana del operador y la de la TV porque comparten origen y sesión.
- Se usa el mismo `dist/` y el mismo `base` que en la web: el manejador del protocolo y el servidor de la red local resuelven las rutas bajo `SITE_BASE`. **No hay un segundo build.**
- La ruta pedida se resuelve con una función pura `resolveStaticPath(root, urlPath)` (en `electron/static.ts`, con tests). Rechaza `..`, rutas absolutas y codificaciones que escapen de `dist/`, y cae en `index.html` solo cuando la ruta es el `base` exacto.

*Alternativa descartada:* cargar `http://localhost:PUERTO`. El origen cambiaría con el puerto, y un puerto ocupado "perdería" los tableros.

*Alternativa descartada:* un build de escritorio con `base: '/'` y sin PWA. Duplica el build y el tiempo de CI y rompe el "mismo build" que se acordó.

### 3. Detección de la modalidad y service worker

- El preload expone `window.jeopardyDesktop` con `contextBridge`. `src/platform/desktop.ts` define la interfaz `DesktopApi` y `getDesktopApi(): DesktopApi | null`. La UI decide qué mostrar con esa función y nada más.

```ts
interface DesktopApi {
  version: string;
  openTv(sessionId: string): Promise<void>;
  lan: {
    getStatus(): Promise<LanStatus>;
    onStatus(listener: (status: LanStatus) => void): () => void;
    selectInterface(name: string): Promise<void>;
  };
  backup: {
    writeBoard(file: { boardId: string; fileName: string; json: string }): Promise<void>;
    trashBoard(boardId: string): Promise<void>;
    openFolder(): Promise<void>;
  };
}

interface LanStatus {
  url: string | null;              // null: sin interfaz o sin puerto
  port: number | null;
  interfaces: { name: string; address: string; selected: boolean }[];
  networkCategory: 'public' | 'private' | 'domain' | 'unknown';
  devices: { deviceId: string; label: string; connectedAt: number }[];
  problem?: 'noInterface' | 'noPort';
}
```

- `src/main.tsx` registra el service worker solo cuando `shouldRegisterServiceWorker({ desktop: getDesktopApi() !== null, secureContext: window.isSecureContext })` devuelve `true`. Es una función pura con test. En escritorio no se registra, y en el celular (`http://IP`, contexto no seguro) tampoco.
- Hay dos resguardos más: el esquema no tiene `allowServiceWorkers`, y al arrancar el proceso principal limpia `serviceworkers` de la sesión con `session.clearStorageData`, por si una versión anterior hubiera dejado uno registrado.

### 4. Servidor de la red local

- Usa `node:http` y `ws` (`WebSocketServer` en la ruta `/ws`) escuchando en `0.0.0.0`.
- **Puerto preferido 47470**, con el rango 47470–47479. Una función pura `pickPort(candidates, tryListen)` recibe el intento de escucha inyectado y devuelve el primer puerto que funciona, o `null`. Con `null` queda `problem: 'noPort'` y la app sigue funcionando.
- **Rutas:**
  - `GET /` redirige a `${SITE_BASE}#/unirse`.
  - `GET ${SITE_BASE}...` sirve los archivos estáticos de `dist/` con `resolveStaticPath`.
  - `GET /ws` acepta el upgrade a WebSocket.
  - Cualquier otra ruta responde 404.
- **No hay ningún endpoint de datos.** Los tableros viven en el IndexedDB del origen `app://`, que el servidor ni siquiera puede leer.
- Las cabeceras incluyen `Cache-Control: no-cache` para `index.html`, así un celular no queda con una versión vieja de la página.

### 5. Protocolo, hub y transporte (`src/net/`, puro)

```ts
// Celular -> app
type DeviceClientMessage =
  | { type: 'join'; deviceId: string; label: string }
  | { type: 'pong' };
// App -> celular
type DeviceServerMessage =
  | { type: 'welcome'; serverTime: number }
  | { type: 'ping' };
```

- **Validación:** `isDeviceClientMessage` e `isDeviceServerMessage` filtran mensajes mal formados, siguiendo el mismo patrón que `isSyncMessage`.
- **Hub:** `createDeviceHub({ now, onChange })` es una máquina de estados pura, con reloj y salida inyectados.
  - `connect(socketId)`, `message(socketId, msg)` y `disconnect(socketId)` actualizan el estado.
  - `tick()` envía `ping` cada 1 s y expulsa los sockets que no responden en 4 s. Eso cubre una pérdida brusca, como un celular que se bloquea.
  - Un `join` con un `deviceId` ya conocido reemplaza el socket anterior. Así una recarga cuenta como un solo dispositivo.
  - `onChange` entrega la lista de dispositivos, que el proceso principal reenvía por IPC.
  - Un cierre limpio de la página dispara `disconnect` de inmediato, con lo que se cumple el plazo de 2 s de la spec.
- **`serverTime` en `welcome`:** es la base para que `pulsadores` corrija el desfase de reloj. Este cambio solo lo envía y no lo usa.
- **Transporte:** `SyncTransport` pasa a ser genérico, `SyncTransport<M = SyncMessage>`, sin cambios para los usos actuales. `createWebSocketTransport<M>(url, { isMessage, WebSocketImpl, onStatus })` implementa esa interfaz del lado del celular:
  - Se reconecta con espera creciente (0,5 s, 1 s, 2 s, luego 5 s como máximo).
  - Informa `connecting | open | reconnecting` para que la página muestre el estado.
  - Recibe el constructor de WebSocket inyectado, para probarlo con un falso.
- **`deviceId`:** es un id aleatorio guardado en el `localStorage` del celular, con try/catch. Si no se puede guardar, se usa un id en memoria (una recarga contaría como otro dispositivo, lo que se acepta en ese caso).
- **`label`:** se deriva del user agent ("Android", "iPhone", "Celular"). En la lista se numeran los repetidos ("Android 2").

### 6. Interfaces de red y perfil de Windows

- `rankInterfaces(os.networkInterfaces())` es una función pura (`src/net/interfaces.ts`) que ordena las interfaces así:
  1. IPv4 privadas (10/8, 172.16/12, 192.168/16) de adaptadores con nombres físicos (`Wi-Fi`, `WLAN`, `Ethernet`).
  2. Otras privadas.
  3. Se descartan loopback, 169.254/16 (enlace local), IPv6 y las interfaces virtuales conocidas (`vEthernet` de WSL o Hyper-V, `VirtualBox`, `VMware`, `Tailscale`, `ZeroTier`, `Hamachi`). Estas últimas quedan disponibles para elegirlas a mano, al final de la lista.
- La interfaz elegida se guarda en un JSON de `userData` y se usa mientras exista.
- **Categoría de red:** `Get-NetConnectionProfile | Select-Object InterfaceAlias,NetworkCategory | ConvertTo-Json`, ejecutado con `powershell.exe -NoProfile` y un tiempo máximo de 3 s. La salida la procesa `parseNetworkProfiles` (pura), que asocia cada entrada por alias con el nombre de la interfaz. Si falla o tarda, queda `unknown`, sin aviso, y la guía de ayuda sigue disponible.
- Se vuelve a consultar al abrir "Conectar dispositivos" y cuando cambia la interfaz.

### 7. Ventanas

- **Ventana del operador:** una `BrowserWindow` con `contextIsolation: true`, `sandbox: true` y `nodeIntegration: false`.
  - `setWindowOpenHandler` rechaza cualquier `window.open`.
  - `will-navigate` bloquea todo lo que no sea `app://jeopardy`.
  - `app.requestSingleInstanceLock()`: una segunda apertura enfoca la ventana existente y termina.
- **`openTv(sessionId)`:**
  - Si ya hay una ventana de TV, carga la ruta de esa sesión si cambió y la pasa al frente.
  - Si no la hay, crea una. `pickTvDisplay(displays, operatorDisplayId)` (pura) elige el primer monitor distinto del que contiene al operador. Si existe, la ventana se abre en ese monitor en `fullscreen`. Si no, se abre como una ventana normal de 1280x720.
  - F11 alterna la pantalla completa en la ventana de TV.
- **Cierre:** cerrar el operador cierra la TV, detiene el servidor y termina la app (`window-all-closed` → `app.quit()`, también en Windows).
- **`TvLauncher`:** en escritorio llama a `openTv` y oculta el campo de URL y el aviso de ventana bloqueada, que no aplican. En la web no cambia.

### 8. Respaldo de tableros

- **Disparadores:**
  - Al guardar un tablero, la UI llama a `scheduleBoardBackup(board)` (`ui/boards/boardBackup.ts`). Hay un debounce de 3 s por tablero, para no escribir en cada tecla del editor, y un `flush` al salir del editor.
  - Crear o importar desde la lista de tableros respalda de inmediato.
  - Eliminar llama a `backup.trashBoard(boardId)`.
- **Qué se escribe:** se reutiliza el armado de `downloadBoardFile`, extraído a `buildBoardExport(board): Promise<string>`, así que el respaldo es exactamente un archivo de exportación e incluye las imágenes de la pista final.
- **Nombre:** `backupFileName(board)` (pura, `src/domain/backup.ts`) devuelve el nombre de exportación con el id: `Mi tablero (a1b2c3d4).jeopardy.json`. `isBackupOf(fileName, boardId)` reconoce los archivos de un tablero por el sufijo del id.
- **Escritura (proceso principal):**
  - Escribe en `app.getPath('documents')/The Binding of Jeopardy/Respaldos`, primero a un archivo temporal y después con `rename`, para que sea atómica.
  - Después borra los otros archivos del mismo tablero (los de títulos anteriores).
  - `trashBoard` mueve los archivos del tablero a `Respaldos/eliminados/`, reemplazando uno anterior con el mismo nombre.
  - `openFolder` usa `shell.openPath`.
- **Fallas:** si falla la escritura, la promesa se rechaza y la UI muestra un aviso no bloqueante: "No se pudo respaldar el tablero en disco. Sigue guardado en la app." El guardado en IndexedDB no depende del respaldo.
- **Traer tableros de la web:** se exporta en la web y se importa en escritorio con la importación existente. El README lo explica.

*Alternativa descartada:* usar el disco como fuente de verdad y dejar IndexedDB solo para la web. Obliga a reescribir la capa de almacenamiento con dos implementaciones, sin beneficio para el juego.

*Alternativa descartada:* respaldar desde el proceso principal leyendo IndexedDB. El proceso principal no tiene acceso cómodo a IndexedDB, y la UI ya sabe armar el archivo.

### 9. Empaquetado y compilación

- **Código del proceso principal:** `electron/main.ts`, `preload.ts`, `lanServer.ts`, `windows.ts`, `backup.ts`, `static.ts` y `networkProfile.ts` se compilan con `tsc -p tsconfig.electron.json` a `dist-electron/` en CommonJS. Un script agrega `dist-electron/package.json` con `{"type":"commonjs"}`, porque el repositorio es `"type": "module"` y el preload con `sandbox` tiene que ser CommonJS. Importa los módulos puros de `src/net` y `src/domain/backup.ts`, que se compilan junto con él.
- **`electron-builder`:**
  - Objetivo `nsis` con `oneClick: true` y `perMachine: false`: instalación por usuario, sin administrador, con acceso directo.
  - `appId: cl.perroabuelo.jeopardy`, `productName: The Binding of Jeopardy`.
  - `files`: `dist/**`, `dist-electron/**` y las dependencias de producción.
  - Ícono `.ico` generado a partir de `public/icon.svg` y versionado en `build/icon.ico`.
  - Versión tomada de `package.json`.
- **Por qué NSIS y no el `.exe` portable:** el portable se descomprime en una carpeta temporal distinta en cada apertura. El firewall de Windows guarda los permisos por ruta de ejecutable, así que volvería a preguntar cada vez, y además tarda más en arrancar. Con NSIS la ruta es estable y el firewall pregunta una sola vez.
- **Scripts nuevos:**
  - `build:desktop`: `npm run build` más la compilación de `electron/`.
  - `desktop`: `build:desktop` y luego `electron .`.
  - `dist:desktop`: `electron-builder --win`.
  - `test:e2e:desktop`.
- **Variables de entorno para pruebas:** `JEOPARDY_USER_DATA`, `JEOPARDY_BACKUP_DIR` y `JEOPARDY_LAN_PORT` reemplazan las rutas y el puerto. Solo se leen si están definidas.
- **Dependencias nuevas:** `electron` y `electron-builder` (dev), `ws` (producción, proceso principal), `@types/ws` (dev), `qrcode` (se empaqueta en el bundle de Vite) y `@types/qrcode` (dev).

### 10. UI nueva

- **`ui/lan/ConnectDevicesPanel`:** se abre desde el operador con "Conectar dispositivos", solo en escritorio. Muestra:
  - La URL y el QR, generado con `qrcode` como SVG en el navegador, sin red.
  - El selector de interfaz.
  - El contador y la lista de dispositivos.
  - El aviso de red Pública.
  - La guía desplegable "¿No se conectan?".
  - Los problemas `noInterface` y `noPort`, con sus mensajes.
- **`ui/screens/JoinScreen` (`#/unirse`):** una página mínima para el celular, con estados "Conectando…", "Conectado a la fiesta" y "Reconectando…". Crea el transporte con `new URL('/ws', location.href)`, usando `ws:` o `wss:` según el protocolo. Si la página se abre fuera de la red local (por ejemplo, en Pages), no hay servidor y muestra "Esta página se abre escaneando el QR de la app de escritorio".
- **Lista de tableros (escritorio):** botón "Abrir carpeta de respaldos".

## Estrategia de pruebas

- **Unitarias (Vitest, proyecto `unit`):** se agregan `src/{net,platform}/**/*.test.ts` y `electron/**/*.test.ts` al `include`.
  - `src/net/protocol.test.ts`: validación de mensajes válidos, desconocidos y mal formados.
  - `src/net/hub.test.ts`, con reloj falso:
    - Con `join`, el dispositivo aparece en la lista.
    - Un `join` repetido con el mismo `deviceId` (recarga) deja uno solo.
    - `disconnect` lo quita de inmediato.
    - Sin `pong` durante 4 s, `tick` lo expulsa.
    - `welcome` incluye `serverTime`.
    - Los mensajes inválidos se ignoran.
  - `src/net/interfaces.test.ts`:
    - El Wi-Fi 192.168.x queda antes que `vEthernet (WSL)` 172.x.
    - Se descartan loopback, 169.254 e IPv6.
    - Sin interfaces privadas, el resultado está vacío.
  - `src/net/wsTransport.test.ts`, con WebSocket falso:
    - Entrega los mensajes válidos y filtra los inválidos.
    - Se reconecta con espera creciente y reporta los estados.
    - `close` detiene los reintentos.
  - `src/domain/backup.test.ts`: `backupFileName` sanea el título e incluye el id, e `isBackupOf` reconoce solo los archivos del tablero.
  - `electron/static.test.ts`: `resolveStaticPath` sirve los archivos bajo `base`, rechaza `..`, `%2e%2e`, rutas absolutas y rutas fuera de `base`, y devuelve `index.html` para el `base` exacto.
  - `electron/windows.test.ts`: `pickTvDisplay` con uno y con dos monitores, y con el operador en el monitor secundario.
  - `electron/networkProfile.test.ts`: `parseNetworkProfiles` con un objeto, con un arreglo, con JSON inválido y con salida vacía.
  - `electron/lanServer.test.ts` (integración en Node, sin Electron):
    - Levanta el servidor en un puerto libre con un `dist/` de prueba.
    - `GET /` redirige, `GET` a un archivo lo sirve y `GET` con `..` responde 404.
    - Un cliente `ws` que envía `join` aparece en `onChange`, y al cerrar desaparece.
    - `pickPort` con el primer puerto ocupado usa el siguiente, y con todos ocupados devuelve `null`.
    - Ningún mensaje enviado al cliente contiene datos del juego.
  - `src/platform/serviceWorker.test.ts`: `shouldRegisterServiceWorker` en web segura, en escritorio y en `http://IP`.
- **Componentes (Testing Library, proyecto `dom`), con un `DesktopApi` falso:**
  - `TvLauncher`: en escritorio llama a `openTv` y no muestra la URL. En la web se comporta como hoy.
  - `ConnectDevicesPanel`: muestra la URL y un QR que la codifica, actualiza la lista con `onStatus`, muestra el aviso de red Pública, los mensajes de `noPort` y `noInterface`, y la guía. Cambiar la interfaz llama a `selectInterface`.
  - `JoinScreen`, con transporte falso: los estados conectando, conectado y reconectando.
  - `OperatorScreen`: "Conectar dispositivos" aparece solo con `DesktopApi`.
  - `BoardListScreen`: "Abrir carpeta de respaldos" aparece solo en escritorio. Eliminar llama a `trashBoard`, e importar respalda.
  - `boardBackup`: el debounce agrupa guardados seguidos en una sola escritura, y una falla muestra el aviso.
- **e2e web (Playwright Chromium, sin cambios de configuración):** un caso nuevo verifica que la versión web no muestra "Conectar dispositivos" ni "Abrir carpeta de respaldos". Los e2e existentes siguen igual.
- **e2e de escritorio (`e2e-desktop/`, `playwright.desktop.config.ts`, Playwright `_electron`):** se ejecuta sobre `dist/` y `dist-electron/` ya compilados, con `JEOPARDY_USER_DATA`, `JEOPARDY_BACKUP_DIR` y `JEOPARDY_LAN_PORT` apuntando a carpetas temporales.
  1. Arranca la app y se ve la lista de tableros. No hay service workers registrados.
  2. Crea un tablero listo y verifica que aparece su archivo en la carpeta de respaldos. Lo elimina y verifica que el archivo pasa a `eliminados`.
  3. Inicia un juego y abre la TV: aparece una segunda ventana con la vista de presentación (el runner tiene un solo monitor, así que es una ventana normal). Abre un Daily Double o una celda y verifica que la TV se sincroniza.
  4. Abre "Conectar dispositivos". Desde un navegador Chromium de Playwright abre `http://127.0.0.1:<puerto>/`, verifica que muestra "Conectado a la fiesta" y que el operador muestra 1 dispositivo. Lo recarga y sigue habiendo 1. Lo cierra y quedan 0.
  5. Cierra la app, la vuelve a abrir con otro `JEOPARDY_LAN_PORT` y el tablero sigue ahí.
  6. Una segunda instancia enfoca la primera y termina.

## CI

- **`ci.yml`:**
  - Se agrega `workflow_call` como disparador, para que el release lo reutilice.
  - **Job nuevo `desktop`** (`windows-latest`, `needs: checks`): `npm ci` → `npm run build:desktop` → `npx playwright install chromium` → `npm run test:e2e:desktop` → `npx electron-builder --win --dir`, que verifica que empaqueta sin generar el instalador. Si falla, sube el reporte.
  - `deploy` sigue dependiendo solo de `checks` y `e2e`, así que un problema del escritorio no bloquea la web.
- **`release.yml` nuevo** (`on: push: tags: ['v*']`, `permissions: contents: write`):
  1. `uses: ./.github/workflows/ci.yml`, que corre `checks`, `e2e` y `desktop`.
  2. Job `release` (`windows-latest`, `needs: ci`):
     - Verifica que el tag coincide con `v${package.json.version}` y falla si no.
     - `npm run build:desktop`.
     - `npx electron-builder --win nsis --publish never`.
     - `gh release create $TAG release/*.exe --generate-notes`, con la sección del CHANGELOG como notas si existe.
- **Lint y typecheck:**
  - `tsconfig.json` agrega la referencia a `tsconfig.electron.json`.
  - ESLint cubre `electron/`, y las reglas de pureza del dominio se extienden a `src/net/` (sin `react`, `idb` ni `electron`).
  - `.gitignore` y `.prettierignore` agregan `dist-electron/` y `release/`.
- Como `ci.yml` ya se dispara con `push` sin filtros, un push de tag también correría `ci.yml` por su cuenta, además de dentro del release. Para evitar la corrida duplicada, se agrega `tags-ignore: ['v*']` al `push` de `ci.yml`.

## Risks / Trade-offs

- [El firewall de Windows pregunta la primera vez y el usuario elige "Cancelar", o la red es Pública] → La ayuda de conexión explica cómo permitir la app y cambiar la red a Privada. Con NSIS la ruta es estable y el diálogo aparece solo una vez.
- [Router con aislamiento de clientes (redes de invitados)] → No se puede resolver desde la app. La guía lo menciona.
- [SmartScreen y antivirus desconfían de un `.exe` sin firma] → Lo documenta el README. La firma queda fuera de alcance.
- [Electron queda desactualizado y acumula fallas de seguridad] → Las ventanas solo cargan contenido propio (`app://`), con `sandbox`, `contextIsolation` y navegación bloqueada. Además, se actualiza Electron en cada versión.
- [IndexedDB o `BroadcastChannel` fallan en un esquema propio mal configurado] → Se registra con `standard` y `secure`, y el e2e de escritorio verifica la persistencia y la sincronización con la TV.
- [Instalador de ~80–100 MB] → Es aceptable para una descarga única.
- [En el celular, `http://IP` no es un contexto seguro, así que no hay service worker, `navigator.wakeLock` ni otras APIs restringidas] → En este cambio no hacen falta. Queda anotado para `pulsadores` (vibración o mantener la pantalla encendida).
- [Desfase de reloj entre el equipo y los celulares] → `welcome` envía `serverTime`. `pulsadores` debe calcular el desfase antes de usar tiempos absolutos como `timerEndsAt`.
- [El runner de Windows es más lento y caro] → El job `desktop` solo se agrega después de `checks` y no bloquea el deploy de la web.
- [La política de ejecución de PowerShell o una versión antigua no tiene `Get-NetConnectionProfile`] → Se trata como `unknown` y no se muestra el aviso.
- [El escritorio y la web tienen tableros separados] → Es esperado, porque son orígenes distintos. La exportación y la importación hacen de puente, y el README lo explica.

## Migration Plan

- **Web:** sin cambios ni migraciones. El merge a `main` despliega igual que siempre.
- **Escritorio:**
  1. Se hace el merge (después de `daily-double`, `final-jeopardy` y `rondas`).
  2. Se sube la versión en `package.json` y se crea el tag `vX.Y.Z`.
  3. El workflow de release publica el instalador.
- **Rollback:** se borra la release en GitHub. La web no se ve afectada. En escritorio, reinstalar una versión anterior conserva `userData` y los respaldos.

## Open Questions

- El número exacto del puerto preferido (47470 es una propuesta). Se puede cambiar al implementar sin tocar specs ni tareas, siempre que sea un rango fijo de 10 puertos.
- El diseño del ícono `.ico`. Parte de `public/icon.svg` y se decide al implementar.
- La versión objetivo (v1.0.0 o v0.7.0) queda a confirmar por el usuario. Solo cambia `proposal.md`, el CHANGELOG y `package.json`.
