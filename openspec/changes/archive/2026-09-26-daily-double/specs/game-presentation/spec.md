## ADDED Requirements

### Requirement: Anunciar un Daily Double
Mientras un Daily Double abierto espera la apuesta, la vista de presentación SHALL mostrar el anuncio "DAILY DOUBLE!" junto con la categoría y el valor de la celda, y MUST NOT contener el texto de la pregunta, su imagen, la respuesta ni la imagen de la respuesta, ni siquiera ocultos. Una vez registrada la apuesta, SHALL mostrar la pregunta y su imagen como en cualquier celda, junto con el nombre del equipo que responde y el monto apostado.

#### Scenario: Anuncio antes de la apuesta
- **WHEN** el operador abre una celda Daily Double
- **THEN** en menos de 1 segundo la presentación muestra "DAILY DOUBLE!" con la categoría y el valor de la celda

#### Scenario: Sin pregunta antes de la apuesta
- **WHEN** hay un Daily Double abierto sin apuesta registrada
- **THEN** el contenido de la ventana de presentación no incluye el texto de la pregunta ni su imagen

#### Scenario: Pregunta después de la apuesta
- **WHEN** el operador registra una apuesta de 800 del equipo "Primos" en un Daily Double
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen si la tiene, el equipo "Primos" y la apuesta de 800

### Requirement: No revelar la ubicación de los Daily Double
La vista de presentación MUST NOT indicar ni recibir qué celdas del tablero son Daily Double antes de que se abran. En el tablero de la TV, una celda Daily Double sin abrir MUST verse igual que cualquier otra celda sin usar.

#### Scenario: Tablero con Daily Double sin abrir
- **WHEN** la presentación muestra el tablero de un juego con celdas Daily Double sin abrir
- **THEN** esas celdas se ven igual que las demás celdas sin usar y el estado que recibe la presentación no las identifica como Daily Double

## MODIFIED Requirements

### Requirement: Reflejar el estado del juego
La vista de presentación SHALL mostrar el título, el tablero con las celdas usadas visualmente distintas y los puntajes de los equipos. Con una pregunta abierta, MUST mostrar la pregunta, su imagen y su valor, salvo en un Daily Double que espera la apuesta, donde MUST mostrar el anuncio de Daily Double en su lugar. Con el juego terminado, MUST mostrar el podio. Cada cambio del operador MUST verse en la presentación en menos de 1 segundo.

#### Scenario: Pregunta abierta
- **WHEN** el operador abre una celda
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen y su valor

#### Scenario: Daily Double abierto
- **WHEN** el operador abre una celda Daily Double
- **THEN** en menos de 1 segundo la presentación muestra el anuncio de Daily Double en lugar de la pregunta

#### Scenario: Cambio de puntaje
- **WHEN** el operador suma puntos a un equipo
- **THEN** en menos de 1 segundo la presentación muestra el puntaje actualizado

#### Scenario: Podio
- **WHEN** el juego termina
- **THEN** la presentación muestra el podio
