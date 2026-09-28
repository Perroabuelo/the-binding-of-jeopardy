## Context

- La TV de escritorio es una segunda `BrowserWindow` de la misma app. Carga el mismo `preload` que el operador, así que `getDesktopApi()` también existe en la TV y puede llamar a `lan.getStatus()` y `lan.onStatus()`, que ya usa el panel del operador.
- El operador le habla a la TV solo por el `BroadcastChannel` de `src/sync`: publica una `TvView` completa (`projectForTv`) en cada cambio de la sesión, y la responde al `hello` de una TV que se abre o se recarga.
- Hoy `ConnectDevicesPanel.tsx` contiene el componente `QrCode` (SVG armado con `qrPath`), la dirección (`data-testid="lan-url"`), el selector de red, el aviso de red Pública, la lista de dispositivos y la ayuda. `ConnectDevicesButton` se muestra en cualquier juego en escritorio.

## Goals / Non-Goals

**Goals:**
- Que la visibilidad del QR viaje por el mismo camino que el resto del estado de la TV, sin mensajes nuevos en el protocolo.
- Que la dirección de conexión nunca pase por la `TvView`: la TV la pide ella misma al proceso principal.
- Reusar la generación del QR tal como está.

**Non-Goals:**
- Cambios en el proceso principal de Electron, en el servidor de la red local o en la página del celular.

## Decisions

### 1. La visibilidad del QR vive en la sesión de juego

`GameSession` gana `joinQrVisible?: boolean` (ausente = oculto) y `GameAction` gana `{ type: 'setJoinQr'; visible: boolean }`. El reductor lo aplica solo si `buzzersEnabled`, y en otro caso devuelve la misma sesión. `projectForTv` agrega `joinQr?: true` a la `TvView` cuando `buzzersEnabled && joinQrVisible`.

- Con esto, "la TV se recarga y vuelve a mostrar el QR" sale gratis: la TV manda `hello` y recibe la `TvView` con `joinQr`. Además se guarda en IndexedDB, como cualquier cambio: si el operador recarga, el botón sigue en el mismo estado.
- La regla ("solo con pulsadores") queda como código puro y probado en el dominio, separada de React.
- **Alternativa descartada:** un estado de React en `OperatorScreen` que `useOperatorSync` sume a la vista. Evita tocar el modelo, pero se pierde al recargar el operador y deja la regla en la UI.
- **Alternativa descartada:** un mensaje nuevo `{ type: 'joinQr' }` en `SyncMessage`. Duplica lo que ya hace `state` y obliga a manejar el `hello` por separado.

El campo nuevo es opcional, así que las sesiones guardadas antes del cambio se leen igual (QR oculto). El reductor no cambia `updatedAt` de forma distinta a otras acciones.

### 2. La TV pide la dirección directamente a la API de escritorio

Cuando la `TvView` trae `joinQr`, `TvScreen` monta un componente `TvJoinQr` que se suscribe con `desktop.lan.onStatus` y pide `desktop.lan.getStatus()`, como hace hoy el panel. Si `status.url` existe, muestra el QR y la dirección. Si no hay `url` (`problem` es `noPort` o `noInterface`), muestra "La conexión de dispositivos no está disponible". Mientras carga, no muestra nada. Al ocultar el QR, el componente se desmonta y se desuscribe.

- La dirección no entra en la `TvView`, que sigue siendo solo estado del juego, y la proyección no depende de la red.
- **Alternativa descartada:** que el operador ponga la URL en la `TvView`. Obligaría a `useOperatorSync` a conocer el estado de la red y a republicar la vista cuando cambia la interfaz.

Sin `getDesktopApi()` (TV de la versión web) `TvJoinQr` no se muestra. En la práctica no pasa, porque sin escritorio no hay pulsadores.

### 3. `QrCode` se mueve a su propio módulo

`QrCode` sale de `ConnectDevicesPanel.tsx` a `src/ui/lan/QrCode.tsx`, con sus estilos. El panel pierde el bloque `.join` (QR y dirección) y conserva todo lo demás. `data-testid="lan-url"` pasa a la dirección de la TV.

En la TV, el QR va en una capa centrada sobre el contenido (`position: fixed`, fondo semitransparente), con un lado de alrededor de `min(50vh, 40vw)` para que se pueda escanear desde varios metros. Muestra la dirección en letra grande y el texto "Escanea con la cámara del celular para unirte". La capa es una `section` con nombre accesible "Unirse con el celular" y sin controles. No es un `dialog`, porque en la TV nadie la cierra ni recibe foco. Si falla la lectura del estado de la red, muestra el mismo aviso que cuando no hay dirección.

### 4. Controles del operador

En `OperatorScreen`, dentro de `.tools`, y solo si hay `getDesktopApi()` y `session.buzzersEnabled`:
- `ConnectDevicesButton`, que ya no se muestra en juegos sin pulsadores.
- Un botón que despacha `setJoinQr`. Muestra "Mostrar QR en la TV" u "Ocultar QR de la TV" según `session.joinQrVisible`, con `aria-pressed`.

El botón no se deshabilita si la TV está cerrada o no hay red. El estado queda guardado y la TV lo muestra al abrirse. Si no hay red, la TV lo dice y el panel del operador explica el motivo.

## Estrategia de pruebas

- **Unitarias (Vitest):** en `game.test.ts`, `setJoinQr` muestra y oculta con pulsadores y no cambia la sesión sin pulsadores. En `projection.test.ts`, `joinQr` solo aparece con pulsadores y el QR visible, y una sesión sin el campo proyecta sin `joinQr`.
- **Componentes (Testing Library):**
  - `OperatorScreen.test.tsx`: el botón y "Conectar dispositivos" existen solo en escritorio con pulsadores, y el botón alterna su texto y `aria-pressed`.
  - `ConnectDevicesPanel.test.tsx`: el panel ya no contiene el QR ni la dirección, y conserva el selector y los dispositivos.
  - `TvScreen.test.tsx`: con la API de escritorio simulada, `joinQr` muestra el QR y la dirección, el cambio de `onStatus` actualiza la dirección, sin `url` se ve el aviso, y sin `joinQr` no hay capa.
- **e2e de escritorio (Playwright + Electron):** `lan.spec.ts` abre la TV, pulsa "Mostrar QR en la TV", lee `lan-url` en la ventana de la TV, conecta el "celular" y verifica que el panel del operador no tiene `lan-url`. Luego recarga la TV y sigue viendo el QR, y al ocultarlo desaparece. `buzzers.spec.ts` se ajusta si depende del QR en el panel.
- **Capturas:** `screenshots/desktop.spec.ts` deja de capturar el QR en el panel y captura la TV con el QR. Se regeneran `docs/capturas/conectar-dispositivos.png` y se agrega `docs/capturas/tv-qr.png`.

## CI

Sin cambios en el pipeline: las pruebas nuevas entran en los jobs existentes de unitarias y e2e de escritorio.

## Risks / Trade-offs

- [La capa del QR tapa la pregunta si el operador la deja visible al abrir una celda] → Lo oculta el operador, como se decidió. El botón queda a la vista en `.tools` en todas las fases.
- [Un QR muy grande en una TV 720p puede verse pixelado] → SVG con `shapeRendering="crispEdges"` y margen de 4 módulos, igual que hoy. Se verifica en la captura a 1280x720.
- [La TV y el panel piden el estado de la red a la vez] → `lan-status` es un `invoke` barato que ya soporta varios oyentes de `onStatus`.
