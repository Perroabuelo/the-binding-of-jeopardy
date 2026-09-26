## Purpose

Permite al anfitrión conducir una partida desde la vista de operador: elegir preguntas, ver la respuesta antes que nadie, revelarla, asignar puntos a los equipos y cerrar el juego con un podio.

## ADDED Requirements

### Requirement: Iniciar un juego con equipos
El sistema SHALL permitir iniciar un juego solo desde un tablero listo para jugar, definiendo entre 1 y 8 equipos con nombre no vacío. Todos los equipos MUST comenzar con puntaje 0.

#### Scenario: Iniciar con dos equipos
- **WHEN** el usuario inicia un juego con los equipos "Primos" y "Tíos"
- **THEN** la vista de operador muestra el tablero y ambos equipos con puntaje 0

#### Scenario: Sin equipos
- **WHEN** el usuario intenta iniciar un juego sin ningún equipo
- **THEN** el sistema impide iniciar el juego e indica que se requiere al menos un equipo

### Requirement: Seleccionar una pregunta
Desde el tablero, el sistema SHALL permitir al operador seleccionar una celda no usada. Al hacerlo, la vista de operador MUST mostrar la pregunta, su imagen si la tiene, su valor y su respuesta.

#### Scenario: Abrir una celda
- **WHEN** el operador selecciona la celda de 200 de la tercera categoría
- **THEN** la vista de operador muestra la pregunta, la imagen, el valor 200 y la respuesta de esa celda

#### Scenario: Celda ya usada
- **WHEN** el operador intenta seleccionar una celda ya usada
- **THEN** el sistema no abre la celda y el tablero no cambia

### Requirement: Revelar la respuesta
Con una pregunta abierta, el sistema SHALL permitir al operador revelar la respuesta a los jugadores. Revelar MUST ser una acción explícita del operador.

#### Scenario: Revelar
- **WHEN** el operador presiona "Revelar respuesta" con una pregunta abierta
- **THEN** el estado del juego pasa a respuesta revelada

### Requirement: Asignar puntos por pregunta
Con una pregunta abierta, revelada o no, el sistema SHALL permitir sumar o restar el valor de esa pregunta al puntaje de cualquier equipo, las veces que el operador decida. El sistema SHALL permitir que los puntajes queden negativos.

#### Scenario: Respuesta correcta
- **WHEN** con la pregunta de 400 abierta el operador suma puntos al equipo "Primos", que tenía 100
- **THEN** el puntaje de "Primos" pasa a 500

#### Scenario: Respuesta incorrecta con puntaje negativo
- **WHEN** con la pregunta de 300 abierta el operador resta puntos al equipo "Tíos", que tenía 0
- **THEN** el puntaje de "Tíos" pasa a -300

### Requirement: Corregir puntajes manualmente
El sistema SHALL permitir al operador fijar directamente el puntaje de cualquier equipo en cualquier momento del juego, para corregir errores.

#### Scenario: Corrección
- **WHEN** el operador fija el puntaje de "Primos" en 700
- **THEN** el puntaje de "Primos" es 700

### Requirement: Volver al tablero y marcar la celda como usada
Con una pregunta abierta, el sistema SHALL permitir al operador volver al tablero. La celda de esa pregunta MUST quedar marcada como usada y visualmente distinta de las no usadas.

#### Scenario: Volver tras una pregunta
- **WHEN** el operador vuelve al tablero después de abrir la celda de 100 de la primera categoría
- **THEN** el tablero muestra esa celda como usada

### Requirement: Fin del juego y podio
El sistema SHALL terminar el juego cuando las 25 celdas estén usadas, o antes si el operador lo decide y lo confirma. Al terminar, MUST mostrar un podio con los equipos ordenados por puntaje de mayor a menor, y los equipos empatados MUST compartir la misma posición.

#### Scenario: Todas las celdas usadas
- **WHEN** el operador vuelve al tablero tras la última celda no usada
- **THEN** el juego termina y se muestra el podio

#### Scenario: Empate
- **WHEN** el juego termina con "Primos" 800, "Tíos" 800 y "Abuelos" 300
- **THEN** el podio muestra a "Primos" y "Tíos" en la posición 1 y a "Abuelos" en la posición 3

#### Scenario: Terminar antes
- **WHEN** el operador elige terminar el juego con celdas pendientes y confirma
- **THEN** el juego termina y se muestra el podio

### Requirement: Recuperar el juego en curso
El sistema SHALL conservar el juego en curso (equipos, puntajes, celdas usadas y pregunta abierta) de forma que, si la vista de operador se recarga o se cierra por accidente, el operador pueda reanudarlo en el mismo punto.

#### Scenario: Recarga del operador
- **WHEN** con un juego en curso la vista de operador se recarga
- **THEN** el operador puede reanudar el juego con los mismos puntajes, celdas usadas y pregunta abierta
