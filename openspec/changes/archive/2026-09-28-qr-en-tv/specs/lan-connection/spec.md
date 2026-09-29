## MODIFIED Requirements

### Requirement: Dirección y código QR de conexión
En la app de escritorio y en un juego con pulsadores, la vista de operador SHALL ofrecer una pantalla "Conectar dispositivos" y un botón para mostrar u ocultar en la vista de presentación la dirección de conexión y un código QR con esa misma dirección. La dirección y el QR MUST mostrarse solo en la vista de presentación: la vista de operador MUST NOT mostrarlos. En un juego sin pulsadores, la vista de operador MUST NOT ofrecer la pantalla "Conectar dispositivos" ni el botón del QR. La dirección MUST usar la IP de la interfaz de red elegida. El sistema SHALL elegir por defecto una interfaz de red privada y física (por ejemplo, la del wifi) antes que interfaces virtuales, de VPN o de enlace local, y la pantalla "Conectar dispositivos" SHALL permitir al operador elegir otra interfaz de la lista. La elección MUST recordarse entre aperturas de la app mientras esa interfaz exista.

#### Scenario: QR con la IP del wifi
- **WHEN** el equipo tiene la interfaz wifi con la IP 192.168.1.20 y una interfaz virtual con la IP 172.25.0.1, y el operador muestra el QR en la TV
- **THEN** la TV muestra una dirección con 192.168.1.20 y el QR contiene esa misma dirección

#### Scenario: Elegir otra interfaz
- **WHEN** con el QR visible en la TV el operador elige otra interfaz en la pantalla "Conectar dispositivos"
- **THEN** la dirección y el QR de la TV pasan a usar la IP de esa interfaz

#### Scenario: El operador no ve el QR
- **WHEN** en un juego con pulsadores el operador abre la pantalla "Conectar dispositivos"
- **THEN** la pantalla muestra el selector de red y los dispositivos conectados, y no contiene el código QR ni la dirección de conexión

#### Scenario: Juego sin pulsadores
- **WHEN** el operador juega en la app de escritorio un juego sin pulsadores
- **THEN** la vista de operador no ofrece la pantalla "Conectar dispositivos" ni el botón para mostrar el QR en la TV

#### Scenario: Sin red
- **WHEN** el equipo no tiene ninguna interfaz de red privada activa
- **THEN** la pantalla "Conectar dispositivos" indica que el equipo debe conectarse a una red wifi para conectar dispositivos
