## ADDED Requirements

### Requirement: Estado de los pulsadores en la TV
En un juego con pulsadores y una pregunta abierta, la vista de presentación SHALL indicar cuando los pulsadores están activos y, cuando un equipo gana el toque, SHALL mostrar qué equipo responde junto a la cuenta regresiva de 5 segundos para responder, e indicar "¡Tiempo!" cuando llega a 0. Cada cambio MUST verse en la presentación en menos de 1 segundo. En un juego sin pulsadores, la presentación MUST NOT mostrar indicaciones de pulsadores.

#### Scenario: Pulsadores activos
- **WHEN** el operador activa los pulsadores
- **THEN** en menos de 1 segundo la presentación indica que los pulsadores están activos

#### Scenario: Equipo respondiendo
- **WHEN** gana el toque de "Tíos"
- **THEN** en menos de 1 segundo la presentación muestra que responde "Tíos" con una cuenta regresiva que empieza en 5 segundos

#### Scenario: Tiempo agotado en la TV
- **WHEN** pasan 5 segundos desde que "Tíos" ganó el toque sin que el operador juzgue
- **THEN** la presentación muestra "¡Tiempo!"

#### Scenario: Juego sin pulsadores
- **WHEN** en un juego sin pulsadores hay una pregunta abierta
- **THEN** la presentación no muestra indicaciones de pulsadores

### Requirement: Equipo que elige en la TV
En un juego con pulsadores, mientras un equipo esté indicado como el que elige, la vista de presentación SHALL mostrar ese equipo junto a los puntajes.

#### Scenario: Equipo que elige
- **WHEN** "Primos" acierta por pulsador y el juego vuelve al tablero
- **THEN** la presentación indica que elige "Primos"

## MODIFIED Requirements

### Requirement: Presentar el Final
Durante el Final, la vista de presentación SHALL mostrar la etapa en curso:
- **Apuestas:** la categoría de la pista final, qué equipos participan y cuántos ya tienen su apuesta anotada.
- **Pista:** la pregunta de la pista final, su imagen si la tiene y, si el temporizador fue iniciado, la cuenta regresiva de 30 segundos.
- **Revelación:** la pregunta y, para cada equipo ya juzgado, su nombre, si acertó o falló, su apuesta y su puntaje actualizado. Debe indicar también qué equipo está en turno y, si ese equipo envió su respuesta desde un celular, el texto de esa respuesta. Para cada equipo ya juzgado que envió su respuesta, SHALL mostrar también ese texto.

Cuando el operador revela la respuesta correcta, la presentación SHALL mostrarla junto a la pregunta. Si la respuesta tiene imagen, esa imagen SHALL reemplazar a la de la pregunta. Cada cambio del operador MUST verse en la presentación en menos de 1 segundo.

#### Scenario: Categoría del Final
- **WHEN** el juego entra al Final con la categoría "Cumpleañero"
- **THEN** en menos de 1 segundo la presentación muestra la categoría "Cumpleañero" y los equipos que participan

#### Scenario: Pista con cuenta regresiva
- **WHEN** el operador muestra la pista final e inicia el temporizador
- **THEN** la presentación muestra la pregunta y una cuenta regresiva que parte en 30 segundos

#### Scenario: Equipo juzgado
- **WHEN** el operador marca que "Tíos", con apuesta de 400, acertó
- **THEN** en menos de 1 segundo la presentación muestra a "Tíos" como acierto, su apuesta de 400 y su puntaje actualizado

#### Scenario: Respuesta revelada
- **WHEN** el operador revela la respuesta correcta durante la revelación
- **THEN** en menos de 1 segundo la presentación muestra la respuesta junto a la pregunta

#### Scenario: Respuesta escrita del equipo en turno
- **WHEN** en la revelación pasa a estar en turno "Tíos", que envió "¿Qué es un pastel?" desde un celular
- **THEN** en menos de 1 segundo la presentación muestra "¿Qué es un pastel?" como respuesta de "Tíos", sin mostrar su apuesta

### Requirement: No exponer el Final antes de tiempo
La vista de presentación MUST NOT contener ni recibir, ni siquiera ocultos:
- el texto de la pregunta de la pista final ni su imagen antes de que el operador muestre la pista;
- el monto de la apuesta de un equipo antes de que ese equipo sea juzgado;
- el texto de la respuesta enviada por un equipo antes de que ese equipo esté en turno en la revelación;
- el texto de la respuesta de la pista final ni su imagen antes de que el operador la revele.

#### Scenario: Pregunta oculta durante las apuestas
- **WHEN** el Final está en la etapa de apuestas
- **THEN** el estado que recibe la presentación no incluye el texto de la pregunta final ni su imagen

#### Scenario: Apuestas ocultas
- **WHEN** "Primos" tiene su apuesta anotada y aún no fue juzgado
- **THEN** el estado que recibe la presentación no incluye el monto de la apuesta de "Primos"

#### Scenario: Respuesta oculta
- **WHEN** la pista final está mostrada y el operador no reveló la respuesta
- **THEN** el estado que recibe la presentación no incluye el texto de la respuesta final ni su imagen

#### Scenario: Respuesta enviada oculta
- **WHEN** "Primos" envió su respuesta desde un celular y aún no está en turno en la revelación
- **THEN** el estado que recibe la presentación no incluye el texto de la respuesta de "Primos"
