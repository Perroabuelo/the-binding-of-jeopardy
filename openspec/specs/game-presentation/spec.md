# game-presentation Specification

## Purpose

Muestra el juego a los invitados en una segunda ventana pensada para la TV, reflejando lo que hace el operador sin revelar respuestas antes de tiempo.

## Requirements

### Requirement: Abrir la vista de presentación desde el operador
El sistema SHALL permitir abrir la vista de presentación en una ventana separada desde la vista de operador. Si el navegador bloquea la apertura, el sistema MUST informar al operador cómo permitirla.

#### Scenario: Abrir la ventana de TV
- **WHEN** el operador presiona "Abrir pantalla de TV" durante un juego
- **THEN** se abre una ventana nueva con la vista de presentación del juego actual

#### Scenario: Ventana bloqueada
- **WHEN** el navegador bloquea la apertura de la ventana
- **THEN** la vista de operador muestra un mensaje indicando que se deben permitir ventanas emergentes para el sitio

### Requirement: Reflejar el estado del juego
La vista de presentación SHALL mostrar el título, el tablero con las celdas usadas visualmente distintas y los puntajes de los equipos. Con una pregunta abierta, MUST mostrar la pregunta, su imagen y su valor. Con el juego terminado, MUST mostrar el podio. Cada cambio del operador MUST verse en la presentación en menos de 1 segundo.

#### Scenario: Pregunta abierta
- **WHEN** el operador abre una celda
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen y su valor

#### Scenario: Cambio de puntaje
- **WHEN** el operador suma puntos a un equipo
- **THEN** en menos de 1 segundo la presentación muestra el puntaje actualizado

#### Scenario: Podio
- **WHEN** el juego termina
- **THEN** la presentación muestra el podio

### Requirement: No exponer la respuesta antes de revelarla
Mientras la respuesta de la pregunta abierta no haya sido revelada, la vista de presentación MUST NOT contener el texto de la respuesta ni su imagen, ni siquiera ocultos. Una vez revelada, SHALL mostrar el texto de la respuesta junto a la pregunta. Si la respuesta tiene imagen, al revelarla esa imagen SHALL reemplazar a la imagen de la pregunta. Si la respuesta no tiene imagen, la presentación SHALL mantener la imagen de la pregunta.

#### Scenario: Antes de revelar
- **WHEN** hay una pregunta abierta sin revelar
- **THEN** el contenido de la ventana de presentación no incluye el texto de la respuesta

#### Scenario: Imagen de respuesta antes de revelar
- **WHEN** hay una pregunta abierta sin revelar cuya respuesta tiene imagen
- **THEN** la ventana de presentación no muestra ni recibe la imagen de la respuesta, y muestra la imagen de la pregunta si existe

#### Scenario: Después de revelar
- **WHEN** el operador revela la respuesta
- **THEN** en menos de 1 segundo la presentación muestra la respuesta

#### Scenario: Revelar una respuesta con imagen
- **WHEN** el operador revela una respuesta con imagen en una pregunta que también tiene imagen
- **THEN** en menos de 1 segundo la presentación muestra la imagen de la respuesta en lugar de la imagen de la pregunta

#### Scenario: Revelar una respuesta sin imagen
- **WHEN** el operador revela una respuesta sin imagen en una pregunta que tiene imagen
- **THEN** la presentación sigue mostrando la imagen de la pregunta junto a la respuesta

### Requirement: Presentación de solo lectura
La vista de presentación MUST NOT ofrecer controles que modifiquen el juego. Todo cambio de estado proviene del operador.

#### Scenario: Interacción en la TV
- **WHEN** alguien hace click sobre una celda en la vista de presentación
- **THEN** el estado del juego no cambia

### Requirement: Resincronización y ausencia del operador
Si la vista de presentación se recarga o se abre con un juego en curso, SHALL mostrar el estado actual sin intervención del operador. Si no hay un operador activo, MUST mostrar una pantalla de espera en lugar de un estado desactualizado o vacío.

#### Scenario: Recarga de la TV
- **WHEN** con una pregunta abierta la ventana de presentación se recarga
- **THEN** vuelve a mostrar esa pregunta y los puntajes actuales

#### Scenario: Operador cerrado
- **WHEN** la vista de operador se cierra
- **THEN** la presentación muestra una pantalla de espera
