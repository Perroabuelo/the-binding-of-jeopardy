> Cada tarea es un commit en la rama `change/app-escritorio`. La rama parte de `main`, con `daily-double`, `final-jeopardy` y `rondas` ya integrados. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`. Si la tarea toca la UI o el build web, también `npm run test:e2e`. Si toca `electron/` o el escritorio, también `npm run test:e2e:desktop` (en Windows). Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Base de escritorio y CI

- [x] 1.1 Agregar Electron al proyecto:
  - Dependencias `electron`, `electron-builder`, `ws`, `@types/ws`, `qrcode` y `@types/qrcode`.
  - `tsconfig.electron.json` (CommonJS a `dist-electron/`) referenciado desde `tsconfig.json`, y el script que escribe `dist-electron/package.json` con `{"type":"commonjs"}`.
  - Scripts `build:desktop`, `desktop`, `dist:desktop` y `test:e2e:desktop`.
  - `dist-electron/` y `release/` en `.gitignore` y `.prettierignore`.
  - ESLint sobre `electron/`, y reglas de pureza para `src/net/`.
  - En `vitest.config.ts`, los `include` de `src/{net,platform}/**/*.test.ts` y `electron/**/*.test.ts`.
  - Un `electron/main.ts` mínimo que registra el esquema `app://jeopardy`, sirve `dist/` con `resolveStaticPath` (`electron/static.ts`) y abre la ventana del operador con `sandbox`, `contextIsolation`, `setWindowOpenHandler` que rechaza y `will-navigate` bloqueado fuera de `app://`.
  - Configuración de `electron-builder`: NSIS `oneClick`, `perMachine: false`, `appId`, `productName` y `build/icon.ico` generado desde `public/icon.svg`.

  Criterio de listo: pasan los tests unitarios de `electron/static.test.ts` (sirve bajo `base`, rechaza `..`, `%2e%2e`, rutas absolutas y rutas fuera de `base`, devuelve `index.html` para el `base` exacto), y `npm run build:desktop` y `npx electron-builder --win --dir` terminan sin errores.
- [x] 1.2 Crear `e2e-desktop/` y `playwright.desktop.config.ts` (Playwright `_electron`), con las variables `JEOPARDY_USER_DATA`, `JEOPARDY_BACKUP_DIR` y `JEOPARDY_LAN_PORT` leídas por `main.ts`. Agregar un test de humo: la app arranca, se ve la lista de tableros y un tablero creado sigue ahí al cerrar y volver a abrir. En `ci.yml`, agregar `workflow_call`, `tags-ignore: ['v*']` en `push`, y el job `desktop` (`windows-latest`, `needs: checks`) con `build:desktop`, `playwright install chromium`, `test:e2e:desktop` y `electron-builder --win --dir`, que sube el reporte si falla. `deploy` sigue dependiendo solo de `checks` y `e2e`. Criterio de listo: el job `desktop` queda en verde en el CI de la rama.

## 2. Modalidad y ventanas

- [ ] 2.1 Agregar el preload (`electron/preload.ts`) con `contextBridge` y `src/platform/desktop.ts`, con `DesktopApi`, `LanStatus` y `getDesktopApi()`. Agregar `shouldRegisterServiceWorker` y usarla en `src/main.tsx`. En el proceso principal, limpiar los `serviceworkers` de la sesión al arrancar y usar `requestSingleInstanceLock`: una segunda apertura enfoca la ventana existente. Criterio de listo:
  - Pasa el test unitario de `shouldRegisterServiceWorker`: web segura sí, escritorio no, `http://IP` no.
  - En el e2e de escritorio, no hay service workers registrados.
  - En el e2e de escritorio, una segunda instancia termina y deja una sola ventana del operador.
- [ ] 2.2 Agregar `pickTvDisplay` (pura, `electron/windows.ts`) y la IPC `openTv`: reutiliza la ventana de TV existente, la abre en el otro monitor a pantalla completa o como ventana de 1280x720 si hay un solo monitor, y F11 alterna la pantalla completa. Al cerrar el operador se cierra la TV y termina la app. En `TvLauncher`, usar `openTv` en escritorio y ocultar la URL y el aviso de bloqueo. Criterio de listo:
  - Pasan los tests de `pickTvDisplay` con uno y con dos monitores, y con el operador en el secundario.
  - Pasan los tests de componentes de `TvLauncher` en escritorio (llama a `openTv`, no muestra la URL) y en la web (sin cambios).
  - En el e2e de escritorio, "Abrir pantalla de TV" abre una segunda ventana que se sincroniza al abrir una celda, presionarlo otra vez no crea una tercera, y cerrar el operador cierra ambas.

## 3. Red local

- [ ] 3.1 Crear `src/net/protocol.ts` (mensajes `join`, `pong`, `welcome` y `ping`, con sus validadores) y `src/net/hub.ts` (`createDeviceHub`, con reloj inyectado). Criterio de listo: pasan los tests unitarios de protocolo (válidos, desconocidos y mal formados) y del hub:
  - Con `join`, el dispositivo aparece.
  - Un `join` con el mismo `deviceId` deja uno solo.
  - `disconnect` lo quita de inmediato.
  - Sin `pong` durante 4 s, `tick` lo expulsa.
  - `welcome` trae `serverTime`.
  - Los mensajes inválidos se ignoran.
- [ ] 3.2 Crear `src/net/interfaces.ts` (`rankInterfaces`) y `electron/networkProfile.ts` (`parseNetworkProfiles` más la ejecución de PowerShell con un tiempo máximo de 3 s). Criterio de listo: pasan los tests unitarios:
  - El Wi-Fi 192.168.x queda antes que `vEthernet (WSL)`.
  - Se descartan loopback, 169.254 e IPv6.
  - Sin interfaces privadas, el resultado está vacío.
  - El parser acepta un objeto y un arreglo, y ante JSON inválido o salida vacía devuelve `unknown`.
- [ ] 3.3 Crear `electron/lanServer.ts`:
  - `pickPort` en el rango 47470–47479.
  - Rutas: `/` redirige a `#/unirse`, los estáticos bajo `SITE_BASE` con `no-cache` para `index.html`, `/ws` y 404 para todo lo demás.
  - Conexión con el hub.
  - Estado `LanStatus` enviado por IPC (`getStatus`, `onStatus`, `selectInterface`), con la interfaz elegida guardada en `userData`.
  - El servidor se detiene al cerrar la app.

  Criterio de listo: pasan los tests de integración de `electron/lanServer.test.ts` en Node:
  - La redirección de `/`, un archivo servido, y 404 para una ruta con `..`.
  - Un cliente `ws` con `join` aparece en la lista, y al cerrar desaparece.
  - Con el primer puerto ocupado se usa el siguiente, y con todos ocupados queda `noPort`.
  - Ningún mensaje enviado al cliente contiene datos del juego.
- [ ] 3.4 Hacer genérico `SyncTransport<M = SyncMessage>`, sin cambios para los usos actuales, y crear `src/net/wsTransport.ts` (`createWebSocketTransport`, con reconexión con espera creciente y estado `connecting | open | reconnecting`). Criterio de listo: pasan los tests existentes de `src/sync` y los nuevos con WebSocket falso: entrega los mensajes válidos, filtra los inválidos, se reconecta con espera creciente y `close` detiene los reintentos.

## 4. UI de conexión

- [ ] 4.1 Crear `ui/screens/JoinScreen` (`#/unirse`) con `deviceId` en `localStorage` (con try/catch), `label` según el user agent, y los estados "Conectando…", "Conectado a la fiesta" y "Reconectando…". Si no hay servidor, muestra el mensaje para abrirla desde el QR. Agregar la ruta al router. Criterio de listo: pasan los tests de componentes con transporte falso, uno por estado, y el test del router para `#/unirse`.
- [ ] 4.2 Crear `ui/lan/ConnectDevicesPanel` y el botón "Conectar dispositivos" en `OperatorScreen`, solo en escritorio. El panel incluye:
  - La URL y el QR SVG con `qrcode`.
  - El selector de interfaz.
  - El contador y la lista de dispositivos, con numeración de los repetidos.
  - El aviso de red Pública.
  - La guía "¿No se conectan?".
  - Los mensajes de `noInterface` y `noPort`.

  Criterio de listo:
  - Pasan los tests de componentes con un `DesktopApi` falso: la URL y un QR que la codifica, la lista actualizada con `onStatus`, el aviso de red Pública, `noPort`, `noInterface`, la guía, que elegir una interfaz llama a `selectInterface`, y que el botón no aparece sin `DesktopApi`.
  - Pasa un e2e web que verifica que la versión web no muestra "Conectar dispositivos".
- [ ] 4.3 Agregar al e2e de escritorio el caso de conexión: abrir "Conectar dispositivos", abrir `http://127.0.0.1:<puerto>/` desde Chromium de Playwright, ver "Conectado a la fiesta" y 1 dispositivo en el operador, recargar y seguir con 1, cerrar y quedar en 0 en menos de 2 s. Criterio de listo: el caso pasa en el job `desktop` del CI.

## 5. Respaldo en disco

- [ ] 5.1 Crear `src/domain/backup.ts` (`backupFileName` e `isBackupOf`) y `electron/backup.ts` (`writeBoard` atómico con temporal y `rename`, borrado de los archivos anteriores del mismo tablero, `trashBoard` hacia `eliminados/`, `openFolder`), con su IPC. Criterio de listo:
  - Pasan los tests unitarios de nombres (sanea el título, incluye el id, `isBackupOf` reconoce solo los del tablero).
  - Pasan los tests de `electron/backup.test.ts` sobre una carpeta temporal: escribe, reemplaza al cambiar el título dejando un solo archivo, mueve a `eliminados` y rechaza la promesa si la carpeta no se puede escribir.
- [ ] 5.2 Extraer `buildBoardExport` de `downloadBoardFile` y crear `ui/boards/boardBackup.ts`: `scheduleBoardBackup` con debounce de 3 s por tablero y `flush` al salir del editor, respaldo inmediato al crear o importar, `trashBoard` al eliminar y aviso no bloqueante si falla. Agregar "Abrir carpeta de respaldos" en `BoardListScreen`, solo en escritorio. Criterio de listo:
  - Pasan los tests de `boardBackup` con temporizadores falsos: varios guardados seguidos producen una sola escritura, y una falla muestra el aviso.
  - Pasan los tests de `BoardListScreen`: el botón solo aparece en escritorio, eliminar llama a `trashBoard` e importar respalda.
  - Pasa el test de exportación existente sin cambios.
- [ ] 5.3 Agregar al e2e de escritorio: crear un tablero listo, verificar que su archivo aparece en `JEOPARDY_BACKUP_DIR`, que al importarlo en la web crea un tablero equivalente (validado con `importBoard` en el test), y que al eliminarlo pasa a `eliminados`. Agregar también un e2e web que verifica que no aparece "Abrir carpeta de respaldos". Criterio de listo: ambos casos pasan en el CI.

## 6. Publicación y documentación

- [ ] 6.1 Crear `.github/workflows/release.yml` (tags `v*`, `contents: write`). Reutiliza `ci.yml` y después, en `windows-latest`:
  - Verifica que el tag coincide con `v${version}` de `package.json`.
  - Ejecuta `build:desktop` y `electron-builder --win nsis --publish never`.
  - Publica con `gh release create` y las notas del CHANGELOG.

  Criterio de listo: `actionlint` no da errores (o se revisa el workflow en el PR), y un tag de prueba en un fork o en una rama de prueba publica una release con el `.exe`. Si el tag no coincide con la versión, falla sin publicar.
- [ ] 6.2 Actualizar el README:
  - Modalidades web y escritorio.
  - Instalación desde GitHub Releases.
  - Aviso de SmartScreen ("Más información" → "Ejecutar de todas formas").
  - Firewall y red Pública.
  - Redes de invitados.
  - Cómo traer tableros de la web (exportar e importar).
  - Carpeta de respaldos.

  Agregar la entrada del CHANGELOG con la versión v1.0.0 y subir `package.json` a esa versión. Criterio de listo: `npm run lint` pasa (prettier sobre el markdown) y la versión de `package.json` coincide con la del CHANGELOG y la de `proposal.md`.
