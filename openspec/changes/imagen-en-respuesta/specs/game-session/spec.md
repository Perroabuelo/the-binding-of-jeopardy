## MODIFIED Requirements

### Requirement: Seleccionar una pregunta
Desde el tablero, el sistema SHALL permitir al operador seleccionar una celda no usada. Al hacerlo, la vista de operador MUST mostrar la pregunta, su imagen si la tiene, su valor, su respuesta y la imagen de la respuesta si la tiene, esté revelada o no.

#### Scenario: Abrir una celda
- **WHEN** el operador selecciona la celda de 200 de la tercera categoría
- **THEN** la vista de operador muestra la pregunta, la imagen, el valor 200 y la respuesta de esa celda

#### Scenario: Abrir una celda con imagen de respuesta
- **WHEN** el operador selecciona una celda cuya respuesta tiene imagen, sin haberla revelado
- **THEN** la vista de operador muestra la imagen de la respuesta junto a la respuesta

#### Scenario: Celda ya usada
- **WHEN** el operador intenta seleccionar una celda ya usada
- **THEN** el sistema no abre la celda y el tablero no cambia
