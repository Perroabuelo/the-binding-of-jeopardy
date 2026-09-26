## ADDED Requirements

### Requirement: Marcar celdas como Daily Double
El sistema SHALL permitir marcar y desmarcar cualquier celda del tablero como Daily Double desde el editor, sin límite de celdas marcadas por tablero, desde ninguna hasta todas. El editor MUST mostrar qué celdas están marcadas. Marcar o desmarcar una celda MUST NOT cambiar su pregunta, respuesta, imágenes ni valor, y MUST NOT afectar la validación de tablero listo para jugar. Las celdas de los tableros creados antes de este cambio MUST quedar sin marcar.

#### Scenario: Marcar una celda
- **WHEN** el usuario abre la celda de 400 de la segunda categoría, la marca como Daily Double y la cierra
- **THEN** el editor muestra esa celda como Daily Double y, al recargar la página, sigue marcada

#### Scenario: Desmarcar una celda
- **WHEN** el usuario desmarca una celda que era Daily Double
- **THEN** el editor deja de mostrarla como Daily Double y su pregunta y respuesta no cambian

#### Scenario: Sin tope de marcas
- **WHEN** el usuario marca como Daily Double todas las celdas de un tablero de 3 categorías
- **THEN** las 15 celdas quedan marcadas y el tablero, si está completo, sigue listo para jugar

#### Scenario: Tablero antiguo
- **WHEN** el usuario abre un tablero guardado antes de este cambio
- **THEN** ninguna de sus celdas aparece como Daily Double
