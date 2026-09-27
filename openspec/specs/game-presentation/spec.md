# game-presentation Specification

## Purpose

Muestra el juego a los invitados en una segunda ventana pensada para la TV, reflejando lo que hace el operador sin revelar respuestas antes de tiempo.

## Requirements

### Requirement: Abrir la vista de presentación desde el operador
El sistema SHALL permitir abrir la vista de presentación en una ventana separada desde la vista de operador. En la versión web, si el navegador bloquea la apertura, el sistema MUST informar al operador cómo permitirla. En la app de escritorio, la ventana de presentación SHALL abrirse sin depender de ventanas emergentes: si hay un segundo monitor, MUST abrirse en ese monitor a pantalla completa; si hay un solo monitor, MUST abrirse como una ventana normal. Abrirla de nuevo MUST reutilizar la ventana de presentación existente en lugar de crear otra.

#### Scenario: Abrir la ventana de TV
- **WHEN** el operador presiona "Abrir pantalla de TV" durante un juego
- **THEN** se abre una ventana nueva con la vista de presentación del juego actual

#### Scenario: Ventana bloqueada
- **WHEN** en la versión web el navegador bloquea la apertura de la ventana
- **THEN** la vista de operador muestra un mensaje indicando que se deben permitir ventanas emergentes para el sitio

#### Scenario: Segundo monitor en escritorio
- **WHEN** en la app de escritorio, con dos monitores conectados, el operador presiona "Abrir pantalla de TV"
- **THEN** la vista de presentación se abre a pantalla completa en el monitor donde no está la ventana del operador

#### Scenario: Un solo monitor en escritorio
- **WHEN** en la app de escritorio, con un solo monitor, el operador presiona "Abrir pantalla de TV"
- **THEN** la vista de presentación se abre como una ventana normal

#### Scenario: Abrir la TV dos veces en escritorio
- **WHEN** en la app de escritorio el operador presiona "Abrir pantalla de TV" con la ventana de TV ya abierta
- **THEN** sigue habiendo una sola ventana de TV y pasa al frente

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

### Requirement: No exponer la respuesta antes de revelarla
Mientras la respuesta de la pregunta abierta no haya sido revelada, la vista de presentación MUST NOT contener el texto de la respuesta ni su imagen, ni siquiera ocultos. Una vez revelada, SHALL mostrar el texto de la respuesta junto a la pregunta. Si la respuesta tiene imagen, al revelarla esa imagen SHALL reemplazar a la imagen de la pregunta. Si la respuesta no tiene imagen, la presentación SHALL mantener la imagen de la pregunta.

#### Scenario: Antes de revelar
- **WHEN** hay una pregunta abierta sin revelar
- **THEN** el contenido de la ventana de presentación no incluye el texto de la respuesta

#### Scenario: Imagen de respuesta antes de revelar
- **WHEN** hay una pregunta abierta sin revelar cuya respuesta tiene imagen
- **THEN** la ventana de presentación no muestra ni recibe la imagen de la respuesta, y muestra la imagen de la pregunta si existe

#### Scenario: Después de revelar
- **WHEN** el operador revela la respuesta
- **THEN** en menos de 1 segundo la presentación muestra la respuesta

#### Scenario: Revelar una respuesta con imagen
- **WHEN** el operador revela una respuesta con imagen en una pregunta que también tiene imagen
- **THEN** en menos de 1 segundo la presentación muestra la imagen de la respuesta en lugar de la imagen de la pregunta

#### Scenario: Revelar una respuesta sin imagen
- **WHEN** el operador revela una respuesta sin imagen en una pregunta que tiene imagen
- **THEN** la presentación sigue mostrando la imagen de la pregunta junto a la respuesta

### Requirement: Presentación de solo lectura
La vista de presentación MUST NOT ofrecer controles que modifiquen el juego. Todo cambio de estado proviene del operador.

#### Scenario: Interacción en la TV
- **WHEN** alguien hace click sobre una celda en la vista de presentación
- **THEN** el estado del juego no cambia

### Requirement: Resincronización y ausencia del operador
Si la vista de presentación se recarga o se abre con un juego en curso, SHALL mostrar el estado actual sin intervención del operador. Si no hay un operador activo, MUST mostrar una pantalla de espera en lugar de un estado desactualizado o vacío.

#### Scenario: Recarga de la TV
- **WHEN** con una pregunta abierta la ventana de presentación se recarga
- **THEN** vuelve a mostrar esa pregunta y los puntajes actuales

#### Scenario: Operador cerrado
- **WHEN** la vista de operador se cierra
- **THEN** la presentación muestra una pantalla de espera

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

### Requirement: Anunciar un Daily Double
Mientras un Daily Double abierto espera la apuesta, la vista de presentación SHALL mostrar el anuncio "DAILY DOUBLE!" junto con la categoría y el valor de la celda, y MUST NOT contener el texto de la pregunta, su imagen, la respuesta ni la imagen de la respuesta, ni siquiera ocultos. Una vez registrada la apuesta, SHALL mostrar la pregunta y su imagen como en cualquier celda, junto con el nombre del equipo que responde y el monto apostado.

#### Scenario: Anuncio antes de la apuesta
- **WHEN** el operador abre una celda Daily Double
- **THEN** en menos de 1 segundo la presentación muestra "DAILY DOUBLE!" con la categoría y el valor de la celda

#### Scenario: Sin pregunta antes de la apuesta
- **WHEN** hay un Daily Double abierto sin apuesta registrada
- **THEN** el contenido de la ventana de presentación no incluye el texto de la pregunta ni su imagen

#### Scenario: Pregunta después de la apuesta
- **WHEN** el operador registra una apuesta de 800 del equipo "Primos" en un Daily Double
- **THEN** en menos de 1 segundo la presentación muestra la pregunta, su imagen si la tiene, el equipo "Primos" y la apuesta de 800

### Requirement: No revelar la ubicación de los Daily Double
La vista de presentación MUST NOT indicar ni recibir qué celdas del tablero son Daily Double antes de que se abran. En el tablero de la TV, una celda Daily Double sin abrir MUST verse igual que cualquier otra celda sin usar.

#### Scenario: Tablero con Daily Double sin abrir
- **WHEN** la presentación muestra el tablero de un juego con celdas Daily Double sin abrir
- **THEN** esas celdas se ven igual que las demás celdas sin usar y el estado que recibe la presentación no las identifica como Daily Double

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
