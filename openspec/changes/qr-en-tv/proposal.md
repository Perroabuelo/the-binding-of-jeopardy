## Why

Hoy el código QR para unirse con el celular solo aparece en la pantalla "Conectar dispositivos" del operador, en el computador. Para escanearlo, los invitados tienen que acercarse al computador o el operador tiene que pasarlo de mano en mano. La TV es lo que todos miran: es el lugar natural para mostrar el QR mientras los invitados se unen, y el operador se queda con lo que solo le sirve a él (la red, la lista de dispositivos y la ayuda de conexión).

**Rama del cambio:** `change/qr-en-tv`, creada desde `main`. Se integra por PR con el CI en verde.

## What Changes

- **El QR se muestra en la TV.** En un juego con pulsadores, la TV puede mostrar el código QR y la dirección de conexión en grande, sobre lo que esté mostrando, con la indicación de escanearlo para unirse. El QR y la dirección se generan igual que hoy: con la IP de la interfaz de red elegida, y cambian si el operador elige otra red.
- **El operador decide cuándo aparece.** La vista de operador tiene un botón "Mostrar QR en la TV" que lo muestra, y el mismo botón (con el texto "Ocultar QR de la TV") lo oculta. Al empezar el juego el QR está oculto. Si la TV se abre o se recarga con el QR visible, lo muestra sin intervención del operador.
- **El operador ya no ve el QR ni la dirección.** La pantalla "Conectar dispositivos" conserva el selector de red, el aviso de red Pública, la lista de dispositivos conectados con su equipo y la guía "¿No se conectan?", pero deja de mostrar el QR y la dirección.
- **Solo en juegos con pulsadores.** El botón del QR y la pantalla "Conectar dispositivos" aparecen solo en la app de escritorio y en un juego con pulsadores. En un juego sin pulsadores no hay QR ni pantalla de dispositivos, porque el celular solo sirve para pulsar.
- **Sin conexión disponible.** Si el QR se pide pero no hay dirección de conexión (no hay red o no hay puerto libre), la TV muestra que la conexión de dispositivos no está disponible en lugar de un QR.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `lan-connection`: "Dirección y código QR de conexión" pasa a mostrar el QR y la dirección en la TV, a pedido del operador y solo en juegos con pulsadores; la pantalla "Conectar dispositivos" del operador deja de mostrarlos y solo existe en juegos con pulsadores.
- `game-presentation`: requisito nuevo para mostrar el QR de conexión en la vista de presentación cuando el operador lo pide, incluido al recargarla.

## Fuera de alcance

- La página del celular y el flujo de unirse a un equipo, que no cambian.
- Ocultar el QR automáticamente (por ejemplo, al abrir la primera pregunta): lo oculta el operador.
- Mostrar el QR en la TV de la versión web: la versión web no tiene servidor en la red local ni pulsadores.
- La corrección de las cajas de texto del editor de celdas que se achican en la app de escritorio. Es un bug aparte, en su propia rama `fix/`.

## Notas de versión

**v1.3.0** (minor).

- El código QR para unirse con el celular ahora aparece en la TV, donde todos lo ven. El operador lo muestra y lo oculta con el botón **Mostrar QR en la TV**.
- La pantalla **Conectar dispositivos** del operador queda para elegir la red, ver los dispositivos conectados y la ayuda de conexión.
- El QR y la pantalla de dispositivos aparecen solo en juegos con pulsadores.

## Impact

- **Dominio:** la sesión de juego guarda si el QR está visible en la TV (campo opcional, compatible con las sesiones guardadas), con una acción para mostrarlo u ocultarlo; `projectForTv` lo incluye en la `TvView`.
- **UI:** `OperatorScreen.tsx` (botón del QR, "Conectar dispositivos" solo con pulsadores), `ConnectDevicesPanel.tsx` (sin QR ni dirección; el componente del QR se mueve a un módulo propio en `src/ui/lan/`), `TvScreen.tsx` y `TvScreen.module.css` (capa con el QR, que lee el estado de la red con la API de escritorio).
- **Escritorio:** sin cambios en el proceso principal; la ventana de TV ya carga el `preload` y puede pedir el estado de la red.
- **Pruebas:** unitarias del reductor y la proyección, de componentes del operador, del panel y de la TV, y e2e de escritorio que escanea la dirección desde la TV. Sin jobs nuevos de CI.
