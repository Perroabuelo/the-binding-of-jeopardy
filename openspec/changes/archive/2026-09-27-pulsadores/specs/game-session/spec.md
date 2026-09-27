## MODIFIED Requirements

### Requirement: Recuperar el juego en curso
El sistema SHALL conservar el juego en curso (equipos, puntajes, rondas con su tablero y multiplicador, ronda en curso, celdas usadas de la ronda en curso, pregunta abierta y, si es un Daily Double, la espera de apuesta o la apuesta registrada con su equipo) de forma que, si la vista de operador se recarga o se cierra por accidente, el operador pueda reanudarlo en el mismo punto, incluida la transición entre rondas. En un juego con pulsadores, SHALL conservar además si los pulsadores están cerrados, activos o con un equipo respondiendo (y el momento en que ese equipo ganó el toque), qué equipos ya fallaron en la pregunta abierta y qué equipo elige. Durante el Final, SHALL conservar además la etapa del Final, los equipos participantes, las apuestas anotadas, los equipos ya juzgados con su resultado, si la respuesta fue revelada y el momento en que se inició el temporizador, y en un juego con pulsadores, las apuestas y respuestas enviadas desde los celulares con el dispositivo que las envió. Al reanudar con el temporizador corriendo, la cuenta regresiva SHALL continuar con el tiempo restante, sin reproducir la música hasta que el operador reinicie el temporizador. Un juego guardado por una versión anterior, sin rondas, SHALL reanudarse como un juego de una sola ronda con multiplicador x1, y un juego guardado sin pulsadores SHALL reanudarse sin pulsadores.

#### Scenario: Recarga del operador
- **WHEN** con un juego en curso la vista de operador se recarga
- **THEN** el operador puede reanudar el juego con los mismos puntajes, celdas usadas y pregunta abierta

#### Scenario: Recarga esperando la apuesta
- **WHEN** con un Daily Double abierto sin apuesta la vista de operador se recarga
- **THEN** al reanudar, el Daily Double sigue abierto y esperando la apuesta

#### Scenario: Recarga con la apuesta registrada
- **WHEN** con un Daily Double en el que "Primos" apostó 800 la vista de operador se recarga
- **THEN** al reanudar, la celda sigue abierta con la apuesta de 800 de "Primos"

#### Scenario: Recarga durante las apuestas del Final
- **WHEN** en el Final, con la apuesta de "Primos" anotada y la de "Tíos" pendiente, la vista de operador se recarga
- **THEN** al reanudar, el Final sigue en las apuestas con la apuesta de "Primos" anotada y la de "Tíos" pendiente

#### Scenario: Recarga con el temporizador corriendo
- **WHEN** 10 segundos después de iniciar el temporizador del Final la vista de operador se recarga
- **THEN** al reanudar, la cuenta regresiva continúa con unos 20 segundos restantes

#### Scenario: Recarga durante la revelación
- **WHEN** con "Tíos" ya juzgado como acierto la vista de operador se recarga
- **THEN** al reanudar, la revelación continúa con el siguiente equipo y el puntaje de "Tíos" no se vuelve a modificar

#### Scenario: Recarga con un equipo respondiendo por pulsador
- **WHEN** 2 segundos después de que "Tíos" ganó el toque la vista de operador se recarga
- **THEN** al reanudar, sigue respondiendo "Tíos" y la cuenta regresiva continúa con unos 3 segundos restantes

#### Scenario: Recarga en la ronda 2
- **WHEN** en la ronda 2 de una partida, con 4 celdas usadas, la vista de operador se recarga
- **THEN** al reanudar, el juego sigue en la ronda 2 con su multiplicador y las mismas 4 celdas usadas

#### Scenario: Recarga en la transición
- **WHEN** en la transición hacia la ronda 3 la vista de operador se recarga
- **THEN** al reanudar, el juego sigue en la transición hacia la ronda 3

#### Scenario: Juego guardado por una versión anterior
- **WHEN** el operador reanuda un juego guardado antes de que existieran las rondas
- **THEN** el juego sigue con su tablero, sus puntajes y sus celdas usadas, como una sola ronda con valores sin multiplicar

#### Scenario: Recarga con un equipo ya fallado
- **WHEN** con "Tíos" ya fallado y "Primos" respondiendo por pulsador la vista de operador se recarga
- **THEN** al reanudar, "Primos" sigue respondiendo, "Tíos" sigue marcado como fallado y el equipo que elige es el mismo

#### Scenario: Recarga con envíos del Final
- **WHEN** en el Final "Primos" envió su respuesta desde un celular y la vista de operador se recarga
- **THEN** al reanudar, la respuesta de "Primos" y el dispositivo que la envió siguen guardados

#### Scenario: Juego guardado sin pulsadores
- **WHEN** el operador reanuda un juego guardado antes de que existieran los pulsadores
- **THEN** el juego sigue sin pulsadores y sin equipo que elige
