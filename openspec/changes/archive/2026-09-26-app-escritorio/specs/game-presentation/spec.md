## MODIFIED Requirements

### Requirement: Abrir la vista de presentación desde el operador
El sistema SHALL permitir abrir la vista de presentación en una ventana separada desde la vista de operador. En la versión web, si el navegador bloquea la apertura, el sistema MUST informar al operador cómo permitirla. En la app de escritorio, la ventana de presentación SHALL abrirse sin depender de ventanas emergentes: si hay un segundo monitor, MUST abrirse en ese monitor a pantalla completa; si hay un solo monitor, MUST abrirse como una ventana normal. Abrirla de nuevo MUST reutilizar la ventana de presentación existente en lugar de crear otra.

#### Scenario: Abrir la ventana de TV
- **WHEN** el operador presiona "Abrir pantalla de TV" durante un juego
- **THEN** se abre una ventana nueva con la vista de presentación del juego actual

#### Scenario: Ventana bloqueada
- **WHEN** en la versión web el navegador bloquea la apertura de la ventana
- **THEN** la vista de operador muestra un mensaje indicando que se deben permitir ventanas emergentes para el sitio

#### Scenario: Segundo monitor en escritorio
- **WHEN** en la app de escritorio, con dos monitores conectados, el operador presiona "Abrir pantalla de TV"
- **THEN** la vista de presentación se abre a pantalla completa en el monitor donde no está la ventana del operador

#### Scenario: Un solo monitor en escritorio
- **WHEN** en la app de escritorio, con un solo monitor, el operador presiona "Abrir pantalla de TV"
- **THEN** la vista de presentación se abre como una ventana normal

#### Scenario: Abrir la TV dos veces en escritorio
- **WHEN** en la app de escritorio el operador presiona "Abrir pantalla de TV" con la ventana de TV ya abierta
- **THEN** sigue habiendo una sola ventana de TV y pasa al frente
