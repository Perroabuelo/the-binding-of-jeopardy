## ADDED Requirements

### Requirement: Tablero legible con cualquier cantidad de categorías
La vista de presentación SHALL mostrar el tablero completo, con todas sus categorías y celdas, en una ventana de 1920x1080 sin desplazamiento horizontal, para tableros de 3 a 8 categorías. El tamaño del texto de las categorías y de los valores MUST adaptarse al número de columnas para que ningún nombre de categoría ni valor quede cortado.

#### Scenario: Tablero de 8 categorías en la TV
- **WHEN** la presentación muestra un tablero de 8 categorías en una ventana de 1920x1080
- **THEN** las 8 columnas se ven completas, sin desplazamiento horizontal y sin texto de categoría ni valor cortado

#### Scenario: Tablero de 3 categorías en la TV
- **WHEN** la presentación muestra un tablero de 3 categorías en una ventana de 1920x1080
- **THEN** las 3 columnas ocupan el ancho del tablero y sus valores se ven completos
