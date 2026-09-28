> Cada tarea es un commit en la rama `change/qr-en-tv`, creada desde `main`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` y, en las tareas que tocan escritorio, `npm run test:e2e:desktop`. Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Dominio

- [x] 1.1 Agregar `joinQrVisible?: boolean` a `GameSession`, la acción `setJoinQr` en `gameReducer` (solo con `buzzersEnabled`; sin pulsadores devuelve la misma sesión) y `joinQr?: true` en `TvView` desde `projectForTv` (diseño, decisión 1). Verificar con `npm test`: en `game.test.ts`, `setJoinQr` muestra y oculta el QR con pulsadores y no cambia la sesión sin pulsadores; en `projection.test.ts`, `joinQr` aparece solo con pulsadores y el QR visible, y una sesión guardada sin el campo proyecta sin `joinQr`.

## 2. QR en la TV

- [ ] 2.1 Mover `QrCode` de `ConnectDevicesPanel.tsx` a `src/ui/lan/QrCode.tsx`, con sus estilos, sin cambiar su salida (decisión 3). Verificar con `npm test`: los tests de `ConnectDevicesPanel` siguen pasando sin cambios.
- [ ] 2.2 Agregar a `TvScreen` la capa `TvJoinQr`, que se muestra cuando la vista trae `joinQr`. Pide y escucha el estado de la red con la API de escritorio y muestra el QR, la dirección (`data-testid="lan-url"`) y "Escanea con la cámara del celular para unirte", o el aviso "La conexión de dispositivos no está disponible" si no hay dirección (decisión 2). Verificar con tests en `TvScreen.test.tsx`, con la API de escritorio simulada: con `joinQr` se ven el QR y la dirección, un `onStatus` con otra IP actualiza la dirección, sin `url` se ve el aviso y ningún QR, y sin `joinQr` no hay capa.

## 3. Operador

- [ ] 3.1 En `OperatorScreen`, mostrar `ConnectDevicesButton` solo en escritorio con pulsadores, y agregar al lado el botón "Mostrar QR en la TV" / "Ocultar QR de la TV" con `aria-pressed`, que despacha `setJoinQr` (decisión 4). Verificar con tests en `OperatorScreen.test.tsx`: en escritorio con pulsadores están los dos botones y el del QR alterna texto y `aria-pressed`; en escritorio sin pulsadores y en la web no está ninguno de los dos. Ajustar el test existente "en escritorio ofrece Conectar dispositivos" para que use un juego con pulsadores.
- [ ] 3.2 Quitar del panel "Conectar dispositivos" el QR y la dirección (bloque `.join` y sus estilos), y conservar el selector de red, el aviso de red Pública, los dispositivos y la ayuda. Verificar con tests en `ConnectDevicesPanel.test.tsx`: el panel no contiene el QR ni `lan-url`; elegir otra interfaz sigue llamando a `selectInterface`, y los avisos "Sin red" y "Sin puertos" se siguen viendo. Los tests que leían `lan-url` del panel pasan a comprobar su ausencia.

## 4. Extremo a extremo en escritorio

- [ ] 4.1 Actualizar `e2e-desktop/lan.spec.ts`: abrir la TV, pulsar "Mostrar QR en la TV", leer `lan-url` en la ventana de la TV con el puerto real, conectar el "celular" y ver que el panel del operador lo cuenta y no tiene `lan-url`. Luego recargar la TV y verificar que el QR sigue visible, y pulsar "Ocultar QR de la TV" y verificar que desaparece en menos de 1 segundo. Revisar `buzzers.spec.ts` por si depende del QR en el panel. Verificar con `npm run test:e2e:desktop`.

## 5. Capturas

- [ ] 5.1 Actualizar `screenshots/desktop.spec.ts` para capturar el panel "Conectar dispositivos" sin QR y la TV con el QR a 1280x720 (`docs/capturas/tv-qr.png`). Regenerar las capturas con `npm run screenshots` y actualizar el README donde describe la conexión de celulares. Verificar revisando que el QR de la TV se vea nítido en la captura y con el CI en verde en el PR.
