## MODIFIED Requirements

### Requirement: Tablero legible con cualquier cantidad de categorías
La vista de presentación SHALL mostrar el tablero completo, con todas sus categorías y celdas, en una ventana de 1920x1080 sin desplazamiento horizontal, para tableros de 3 a 8 categorías. El tamaño del texto de las categorías y de los valores MUST adaptarse al número de columnas para que ningún nombre de categoría ni valor quede cortado, incluidos los valores multiplicados de hasta 4 cifras. Mientras muestra el tablero, en ventanas de 1920x1080 y de 1280x720, la vista de presentación MUST mostrar dentro de la ventana, sin desplazamiento vertical ni horizontal, el título del tablero, la ronda y su multiplicador si el juego tiene rondas, el tablero completo, los puntajes de todos los equipos (de 1 a 8) y el equipo que elige, si lo hay.

#### Scenario: Tablero de 8 categorías en la TV
- **WHEN** la presentación muestra un tablero de 8 categorías en una ventana de 1920x1080
- **THEN** las 8 columnas se ven completas, sin desplazamiento horizontal y sin texto de categoría ni valor cortado

#### Scenario: Tablero de 3 categorías en la TV
- **WHEN** la presentación muestra un tablero de 3 categorías en una ventana de 1920x1080
- **THEN** las 3 columnas ocupan el ancho del tablero y sus valores se ven completos

#### Scenario: Tablero de 8 categorías en una ronda x10
- **WHEN** la presentación muestra un tablero de 8 categorías en una ronda x10 en una ventana de 1920x1080
- **THEN** los valores de 1000 a 5000 se ven completos, sin desplazamiento horizontal

#### Scenario: Tablero y puntajes caben a 1920x1080
- **WHEN** la presentación muestra un tablero de 6 categorías con nombres largos y 2 equipos en una ventana de 1920x1080
- **THEN** la página no se desplaza vertical ni horizontalmente, y el título, el tablero y los puntajes quedan completos dentro de la ventana

#### Scenario: Caso más cargado a 1280x720
- **WHEN** la presentación muestra un tablero de 8 categorías con nombres largos, en una ronda x10, con 8 equipos y un equipo que elige, en una ventana de 1280x720
- **THEN** la página no se desplaza vertical ni horizontalmente, y el título, la ronda, el tablero, los 8 puntajes y "Elige: …" quedan completos dentro de la ventana, sin texto de categoría ni valor cortado

#### Scenario: Tablero de 3 categorías con 1 equipo a 1280x720
- **WHEN** la presentación muestra un tablero de 3 categorías con 1 equipo en una ventana de 1280x720
- **THEN** la página no se desplaza, y el tablero y el puntaje quedan completos dentro de la ventana
