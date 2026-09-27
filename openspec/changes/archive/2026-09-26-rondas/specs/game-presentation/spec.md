## ADDED Requirements

### Requirement: Indicador de ronda y valores multiplicados
En un juego con rondas, la vista de presentación SHALL mostrar en qué ronda va el juego, cuántas rondas tiene y el multiplicador de la ronda en curso. En un juego sin rondas, MUST NOT mostrar el indicador. Todos los valores que muestra la presentación (celdas del tablero, pregunta abierta y anuncio de Daily Double) MUST ser los valores de la ronda en curso, ya multiplicados. El título que muestra la presentación SHALL ser el del tablero de la ronda en curso.

#### Scenario: Indicador en la ronda 2
- **WHEN** el juego está en la ronda 2 de 3, con multiplicador x2
- **THEN** la presentación muestra que es la ronda 2 de 3 con multiplicador x2

#### Scenario: Sin rondas
- **WHEN** el juego no tiene rondas
- **THEN** la presentación no muestra ningún indicador de ronda

#### Scenario: Tablero en una ronda x2
- **WHEN** la presentación muestra el tablero de una ronda x2 con valores base de 100 a 500
- **THEN** las celdas muestran los valores 200, 400, 600, 800 y 1000

#### Scenario: Daily Double en una ronda x2
- **WHEN** en una ronda x2 el operador abre la celda Daily Double de 300
- **THEN** la presentación muestra el anuncio de Daily Double con el valor 600

### Requirement: Pantalla de transición entre rondas
Durante la transición hacia una ronda, la vista de presentación SHALL mostrar una pantalla de transición con el número de la ronda siguiente, el total de rondas, su multiplicador, el título de su tablero y los puntajes de los equipos, en lugar del tablero. La pantalla de transición MUST NOT contener preguntas, respuestas ni imágenes de las celdas del tablero siguiente. Al iniciar la ronda, la presentación SHALL mostrar el tablero de esa ronda en menos de 1 segundo.

#### Scenario: Transición hacia la ronda 2
- **WHEN** el juego pasa a la transición hacia la ronda 2 de 2, con multiplicador x2 y el tablero "Cumple B"
- **THEN** en menos de 1 segundo la presentación muestra la ronda 2 de 2, el multiplicador x2, el título "Cumple B" y los puntajes

#### Scenario: Sin contenido de celdas en la transición
- **WHEN** la presentación muestra la transición hacia una ronda
- **THEN** el estado que recibe la presentación no incluye preguntas, respuestas ni imágenes de las celdas de esa ronda

#### Scenario: Inicio de la ronda
- **WHEN** en la transición el operador inicia la ronda 2
- **THEN** en menos de 1 segundo la presentación muestra el tablero de la ronda 2 con todas sus celdas sin usar

## MODIFIED Requirements

### Requirement: Reflejar el estado del juego
La vista de presentación SHALL mostrar el título, el tablero con las celdas usadas visualmente distintas y los puntajes de los equipos. Con una pregunta abierta, MUST mostrar la pregunta, su imagen y su valor, salvo en un Daily Double que espera la apuesta, donde MUST mostrar el anuncio de Daily Double en su lugar. Durante la transición entre rondas, MUST mostrar la pantalla de transición en lugar del tablero. Durante el Final, MUST mostrar la etapa del Final en lugar del tablero. Con el juego terminado, MUST mostrar el podio y, si el Final se saltó por falta de equipos con puntaje positivo, el aviso correspondiente. Cada cambio del operador MUST verse en la presentación en menos de 1 segundo.

#### Scenario: Pregunta abierta
- **WHEN** el operador abre una celda
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen y su valor

#### Scenario: Daily Double abierto
- **WHEN** el operador abre una celda Daily Double
- **THEN** en menos de 1 segundo la presentación muestra el anuncio de Daily Double en lugar de la pregunta

#### Scenario: Cambio de puntaje
- **WHEN** el operador suma puntos a un equipo
- **THEN** en menos de 1 segundo la presentación muestra el puntaje actualizado

#### Scenario: Entrada a la transición
- **WHEN** el juego pasa a la transición hacia la ronda siguiente
- **THEN** en menos de 1 segundo la presentación deja de mostrar el tablero y muestra la pantalla de transición

#### Scenario: Entrada al Final
- **WHEN** el juego pasa al Final
- **THEN** en menos de 1 segundo la presentación deja de mostrar el tablero y muestra la etapa de apuestas del Final

#### Scenario: Podio
- **WHEN** el juego termina
- **THEN** la presentación muestra el podio

#### Scenario: Podio con el Final saltado
- **WHEN** el juego termina porque el Final se saltó al no haber equipos con puntaje positivo
- **THEN** la presentación muestra el podio y el aviso de que el Final se saltó

### Requirement: Tablero legible con cualquier cantidad de categorías
La vista de presentación SHALL mostrar el tablero completo, con todas sus categorías y celdas, en una ventana de 1920x1080 sin desplazamiento horizontal, para tableros de 3 a 8 categorías. El tamaño del texto de las categorías y de los valores MUST adaptarse al número de columnas para que ningún nombre de categoría ni valor quede cortado, incluidos los valores multiplicados de hasta 4 cifras.

#### Scenario: Tablero de 8 categorías en la TV
- **WHEN** la presentación muestra un tablero de 8 categorías en una ventana de 1920x1080
- **THEN** las 8 columnas se ven completas, sin desplazamiento horizontal y sin texto de categoría ni valor cortado

#### Scenario: Tablero de 3 categorías en la TV
- **WHEN** la presentación muestra un tablero de 3 categorías en una ventana de 1920x1080
- **THEN** las 3 columnas ocupan el ancho del tablero y sus valores se ven completos

#### Scenario: Tablero de 8 categorías en una ronda x10
- **WHEN** la presentación muestra un tablero de 8 categorías en una ronda x10 en una ventana de 1920x1080
- **THEN** los valores de 1000 a 5000 se ven completos, sin desplazamiento horizontal
