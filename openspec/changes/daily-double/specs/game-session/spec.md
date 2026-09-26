## ADDED Requirements

### Requirement: Abrir un Daily Double
Al seleccionar una celda marcada como Daily Double, el sistema SHALL abrirla en espera de apuesta. En esa espera, la vista de operador MUST mostrar la pregunta, sus imágenes y la respuesta, igual que en cualquier celda, y MUST pedir qué equipo responde y cuánto apuesta. Mientras no se registre la apuesta, el sistema MUST NOT permitir revelar la respuesta ni sumar o restar puntos por la celda. Volver al tablero sin registrar la apuesta SHALL dejar la celda marcada como usada.

#### Scenario: Abrir una celda Daily Double
- **WHEN** el operador selecciona una celda marcada como Daily Double
- **THEN** la vista de operador muestra la pregunta y la respuesta de la celda y pide elegir el equipo que responde y su apuesta

#### Scenario: Sin revelar antes de apostar
- **WHEN** hay un Daily Double abierto sin apuesta registrada
- **THEN** las acciones de revelar la respuesta y de sumar o restar puntos por la celda no están disponibles

#### Scenario: Volver sin apostar
- **WHEN** el operador vuelve al tablero desde un Daily Double sin registrar la apuesta
- **THEN** el tablero muestra esa celda como usada y ningún puntaje cambia

### Requirement: Registrar la apuesta de un Daily Double
El sistema SHALL permitir registrar la apuesta de un Daily Double abierto indicando un único equipo y un monto entero. El monto MUST estar entre 0 y el mayor valor entre el puntaje actual de ese equipo y el valor más alto de las celdas del tablero, ambos inclusive. El sistema MUST rechazar un monto fuera de ese rango, o que no sea entero, indicando el máximo permitido, sin registrar la apuesta. Una vez registrada, la apuesta MUST NOT poder cambiarse, y la celda SHALL seguir como una pregunta abierta normal, que se puede revelar y cerrar.

#### Scenario: Apuesta dentro del puntaje
- **WHEN** en un tablero de 100 a 500 el equipo "Primos", con 1200 puntos, apuesta 1000 en un Daily Double
- **THEN** la apuesta queda registrada para "Primos" por 1000

#### Scenario: Apuesta sobre el puntaje con el tope del tablero
- **WHEN** en un tablero de 100 a 500 el equipo "Tíos", con 300 puntos, apuesta 500
- **THEN** la apuesta queda registrada para "Tíos" por 500

#### Scenario: Equipo con puntaje negativo
- **WHEN** en un tablero de 100 a 500 el equipo "Sobrinos", con -400 puntos, apuesta 500
- **THEN** la apuesta queda registrada para "Sobrinos" por 500

#### Scenario: Apuesta de cero
- **WHEN** el equipo "Abuelos" apuesta 0 en un Daily Double
- **THEN** la apuesta queda registrada para "Abuelos" por 0

#### Scenario: Apuesta mayor al máximo
- **WHEN** en un tablero de 100 a 500 el equipo "Tíos", con 300 puntos, intenta apostar 600
- **THEN** el sistema rechaza la apuesta, indica que el máximo es 500 y el Daily Double sigue esperando la apuesta

#### Scenario: Apuesta negativa
- **WHEN** el operador intenta registrar una apuesta de -100
- **THEN** el sistema rechaza la apuesta y el Daily Double sigue esperando la apuesta

## MODIFIED Requirements

### Requirement: Asignar puntos por pregunta
Con una pregunta abierta, revelada o no, el sistema SHALL permitir sumar o restar el valor de esa pregunta al puntaje de cualquier equipo, las veces que el operador decida. En un Daily Double con apuesta registrada, el sistema SHALL sumar o restar el monto de la apuesta en lugar del valor de la celda, y MUST permitirlo solo al equipo que apostó. El sistema SHALL permitir que los puntajes queden negativos.

#### Scenario: Respuesta correcta
- **WHEN** con la pregunta de 400 abierta el operador suma puntos al equipo "Primos", que tenía 100
- **THEN** el puntaje de "Primos" pasa a 500

#### Scenario: Respuesta incorrecta con puntaje negativo
- **WHEN** con la pregunta de 300 abierta el operador resta puntos al equipo "Tíos", que tenía 0
- **THEN** el puntaje de "Tíos" pasa a -300

#### Scenario: Acierto en un Daily Double
- **WHEN** en la celda Daily Double de 200 el equipo "Primos", con 1200 puntos, apostó 1000 y el operador le suma puntos
- **THEN** el puntaje de "Primos" pasa a 2200

#### Scenario: Fallo en un Daily Double
- **WHEN** en un Daily Double el equipo "Tíos", con 300 puntos, apostó 500 y el operador le resta puntos
- **THEN** el puntaje de "Tíos" pasa a -200

#### Scenario: Otro equipo en un Daily Double
- **WHEN** en un Daily Double con apuesta de "Primos" el operador intenta sumar o restar puntos a "Tíos"
- **THEN** la acción no está disponible y el puntaje de "Tíos" no cambia

### Requirement: Recuperar el juego en curso
El sistema SHALL conservar el juego en curso (equipos, puntajes, celdas usadas, pregunta abierta y, si es un Daily Double, la espera de apuesta o la apuesta registrada con su equipo) de forma que, si la vista de operador se recarga o se cierra por accidente, el operador pueda reanudarlo en el mismo punto.

#### Scenario: Recarga del operador
- **WHEN** con un juego en curso la vista de operador se recarga
- **THEN** el operador puede reanudar el juego con los mismos puntajes, celdas usadas y pregunta abierta

#### Scenario: Recarga esperando la apuesta
- **WHEN** con un Daily Double abierto sin apuesta la vista de operador se recarga
- **THEN** al reanudar, el Daily Double sigue abierto y esperando la apuesta

#### Scenario: Recarga con la apuesta registrada
- **WHEN** con un Daily Double en el que "Primos" apostó 800 la vista de operador se recarga
- **THEN** al reanudar, la celda sigue abierta con la apuesta de 800 de "Primos"
