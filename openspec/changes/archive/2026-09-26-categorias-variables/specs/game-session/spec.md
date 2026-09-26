## MODIFIED Requirements

### Requirement: Fin del juego y podio
El sistema SHALL terminar el juego cuando todas las celdas del tablero estén usadas, cualquiera sea su número de categorías, o antes si el operador lo decide y lo confirma. Al terminar, MUST mostrar un podio con los equipos ordenados por puntaje de mayor a menor, y los equipos empatados MUST compartir la misma posición.

#### Scenario: Todas las celdas usadas
- **WHEN** el operador vuelve al tablero tras la última celda no usada
- **THEN** el juego termina y se muestra el podio

#### Scenario: Todas las celdas usadas en un tablero de 3 categorías
- **WHEN** en un tablero de 3 categorías el operador vuelve al tablero tras usar la celda número 15
- **THEN** el juego termina y se muestra el podio

#### Scenario: Celdas pendientes en un tablero de 8 categorías
- **WHEN** en un tablero de 8 categorías el operador vuelve al tablero tras usar 25 celdas
- **THEN** el juego sigue en el tablero con 15 celdas disponibles

#### Scenario: Empate
- **WHEN** el juego termina con "Primos" 800, "Tíos" 800 y "Abuelos" 300
- **THEN** el podio muestra a "Primos" y "Tíos" en la posición 1 y a "Abuelos" en la posición 3

#### Scenario: Terminar antes
- **WHEN** el operador elige terminar el juego con celdas pendientes y confirma
- **THEN** el juego termina y se muestra el podio
