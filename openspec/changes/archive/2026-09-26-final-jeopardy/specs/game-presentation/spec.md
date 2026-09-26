## ADDED Requirements

### Requirement: Presentar el Final
Durante el Final, la vista de presentación SHALL mostrar la etapa en curso:
- **Apuestas:** la categoría de la pista final, qué equipos participan y cuántos ya tienen su apuesta anotada.
- **Pista:** la pregunta de la pista final, su imagen si la tiene y, si el temporizador fue iniciado, la cuenta regresiva de 30 segundos.
- **Revelación:** la pregunta y, para cada equipo ya juzgado, su nombre, si acertó o falló, su apuesta y su puntaje actualizado. Debe indicar también qué equipo está en turno.

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

### Requirement: No exponer el Final antes de tiempo
La vista de presentación MUST NOT contener ni recibir, ni siquiera ocultos:
- el texto de la pregunta de la pista final ni su imagen antes de que el operador muestre la pista;
- el monto de la apuesta de un equipo antes de que ese equipo sea juzgado;
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

## MODIFIED Requirements

### Requirement: Reflejar el estado del juego
La vista de presentación SHALL mostrar el título, el tablero con las celdas usadas visualmente distintas y los puntajes de los equipos. Con una pregunta abierta, MUST mostrar la pregunta, su imagen y su valor, salvo en un Daily Double que espera la apuesta, donde MUST mostrar el anuncio de Daily Double en su lugar. Durante el Final, MUST mostrar la etapa del Final en lugar del tablero. Con el juego terminado, MUST mostrar el podio y, si el Final se saltó por falta de equipos con puntaje positivo, el aviso correspondiente. Cada cambio del operador MUST verse en la presentación en menos de 1 segundo.

#### Scenario: Pregunta abierta
- **WHEN** el operador abre una celda
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen y su valor

#### Scenario: Daily Double abierto
- **WHEN** el operador abre una celda Daily Double
- **THEN** en menos de 1 segundo la presentación muestra el anuncio de Daily Double en lugar de la pregunta

#### Scenario: Cambio de puntaje
- **WHEN** el operador suma puntos a un equipo
- **THEN** en menos de 1 segundo la presentación muestra el puntaje actualizado

#### Scenario: Entrada al Final
- **WHEN** el juego pasa al Final
- **THEN** en menos de 1 segundo la presentación deja de mostrar el tablero y muestra la etapa de apuestas del Final

#### Scenario: Podio
- **WHEN** el juego termina
- **THEN** la presentación muestra el podio

#### Scenario: Podio con el Final saltado
- **WHEN** el juego termina porque el Final se saltó al no haber equipos con puntaje positivo
- **THEN** la presentación muestra el podio y el aviso de que el Final se saltó
