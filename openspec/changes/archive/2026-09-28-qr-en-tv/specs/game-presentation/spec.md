## ADDED Requirements

### Requirement: QR de conexión en la TV
En la app de escritorio y en un juego con pulsadores, la vista de presentación SHALL mostrar, cuando el operador lo pide, el código QR y la dirección de conexión de los celulares en grande, sobre lo que esté mostrando, junto con la indicación de escanearlo para unirse. Al empezar el juego el QR MUST estar oculto. El QR MUST verse u ocultarse en la presentación en menos de 1 segundo desde que el operador lo pide, y MUST actualizarse en menos de 2 segundos cuando cambia la dirección de conexión. Si la presentación se recarga o se abre con el QR pedido, SHALL mostrarlo sin intervención del operador. Si no hay dirección de conexión disponible, la presentación MUST indicar que la conexión de dispositivos no está disponible en lugar de mostrar un QR. En un juego sin pulsadores, la presentación MUST NOT mostrar el QR.

#### Scenario: Oculto al empezar
- **WHEN** empieza un juego con pulsadores y se abre la TV
- **THEN** la TV no muestra el código QR

#### Scenario: El operador muestra el QR
- **WHEN** el operador pulsa "Mostrar QR en la TV" con la dirección de conexión disponible
- **THEN** en menos de 1 segundo la TV muestra el código QR y la dirección de conexión sobre el tablero, y un celular que abre esa dirección se conecta a la app

#### Scenario: El operador oculta el QR
- **WHEN** con el QR visible el operador pulsa "Ocultar QR de la TV"
- **THEN** en menos de 1 segundo la TV deja de mostrar el código QR y la dirección

#### Scenario: Recarga con el QR visible
- **WHEN** con el QR visible la ventana de la TV se recarga
- **THEN** la TV vuelve a mostrar el código QR sin que el operador haga nada

#### Scenario: Sin dirección de conexión
- **WHEN** el operador pide el QR y todos los puertos del rango están ocupados
- **THEN** la TV indica que la conexión de dispositivos no está disponible y no muestra un código QR
