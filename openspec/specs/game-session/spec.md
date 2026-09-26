# game-session Specification

## Purpose

Permite al anfitrión conducir una partida desde la vista de operador: elegir preguntas, ver la respuesta antes que nadie, revelarla, asignar puntos a los equipos y cerrar el juego con un podio.

## Requirements

### Requirement: Iniciar un juego con equipos
El sistema SHALL permitir iniciar un juego solo desde un tablero listo para jugar, definiendo entre 1 y 8 equipos con nombre no vacío. Todos los equipos MUST comenzar con puntaje 0. Al iniciar, el sistema SHALL ofrecer activar o desactivar el Final Jeopardy!. La opción MUST estar disponible solo si el tablero tiene una pista final completa, y en ese caso SHALL venir activada. Si el tablero no tiene pista final completa, el juego MUST iniciarse sin Final.

#### Scenario: Iniciar con dos equipos
- **WHEN** el usuario inicia un juego con los equipos "Primos" y "Tíos"
- **THEN** la vista de operador muestra el tablero y ambos equipos con puntaje 0

#### Scenario: Sin equipos
- **WHEN** el usuario intenta iniciar un juego sin ningún equipo
- **THEN** el sistema impide iniciar el juego e indica que se requiere al menos un equipo

#### Scenario: Tablero con pista final completa
- **WHEN** el usuario va a iniciar un juego con un tablero que tiene pista final completa
- **THEN** la opción "Jugar Final Jeopardy!" está disponible y activada

#### Scenario: Tablero sin pista final
- **WHEN** el usuario va a iniciar un juego con un tablero sin pista final o con la pista final incompleta
- **THEN** la opción "Jugar Final Jeopardy!" no está disponible y el juego se inicia sin Final

#### Scenario: Desactivar el Final
- **WHEN** el usuario desactiva la opción "Jugar Final Jeopardy!" e inicia el juego
- **THEN** al usar todas las celdas el juego termina y se muestra el podio, sin Final

### Requirement: Seleccionar una pregunta
Desde el tablero, el sistema SHALL permitir al operador seleccionar una celda no usada. Al hacerlo, la vista de operador MUST mostrar la pregunta, su imagen si la tiene, su valor, su respuesta y la imagen de la respuesta si la tiene, esté revelada o no.

#### Scenario: Abrir una celda
- **WHEN** el operador selecciona la celda de 200 de la tercera categoría
- **THEN** la vista de operador muestra la pregunta, la imagen, el valor 200 y la respuesta de esa celda

#### Scenario: Abrir una celda con imagen de respuesta
- **WHEN** el operador selecciona una celda cuya respuesta tiene imagen, sin haberla revelado
- **THEN** la vista de operador muestra la imagen de la respuesta junto a la respuesta

#### Scenario: Celda ya usada
- **WHEN** el operador intenta seleccionar una celda ya usada
- **THEN** el sistema no abre la celda y el tablero no cambia

### Requirement: Revelar la respuesta
Con una pregunta abierta, el sistema SHALL permitir al operador revelar la respuesta a los jugadores. Revelar MUST ser una acción explícita del operador.

#### Scenario: Revelar
- **WHEN** el operador presiona "Revelar respuesta" con una pregunta abierta
- **THEN** el estado del juego pasa a respuesta revelada

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
El sistema SHALL terminar el tablero cuando todas sus celdas estén usadas, cualquiera sea su número de categorías, o antes si el operador lo decide y lo confirma. Si el Final está activo y hay equipos con puntaje mayor que 0, terminar el tablero MUST llevar al Final en lugar del podio, y el juego termina cuando el operador va al podio desde el Final. Sin Final, terminar el tablero termina el juego. El operador SHALL poder terminar el juego también durante el Final, con confirmación, y las apuestas de los equipos aún no juzgados MUST NOT aplicarse. Al terminar, el sistema MUST mostrar un podio con los equipos ordenados por puntaje de mayor a menor, y los equipos empatados MUST compartir la misma posición.

#### Scenario: Todas las celdas usadas
- **WHEN** en un juego sin Final el operador vuelve al tablero tras la última celda no usada
- **THEN** el juego termina y se muestra el podio

#### Scenario: Todas las celdas usadas en un tablero de 3 categorías
- **WHEN** en un juego sin Final con un tablero de 3 categorías el operador vuelve al tablero tras usar la celda número 15
- **THEN** el juego termina y se muestra el podio

#### Scenario: Celdas pendientes en un tablero de 8 categorías
- **WHEN** en un tablero de 8 categorías el operador vuelve al tablero tras usar 25 celdas
- **THEN** el juego sigue en el tablero con 15 celdas disponibles

#### Scenario: Empate
- **WHEN** el juego termina con "Primos" 800, "Tíos" 800 y "Abuelos" 300
- **THEN** el podio muestra a "Primos" y "Tíos" en la posición 1 y a "Abuelos" en la posición 3

#### Scenario: Terminar antes
- **WHEN** en un juego sin Final el operador elige terminar el juego con celdas pendientes y confirma
- **THEN** el juego termina y se muestra el podio

#### Scenario: Pasar al Final al usar todas las celdas
- **WHEN** con el Final activo y "Primos" con 500 el operador vuelve al tablero tras la última celda no usada
- **THEN** el juego pasa al Final y no muestra el podio

#### Scenario: Pasar al Final al terminar antes
- **WHEN** con el Final activo y equipos con puntaje positivo el operador termina el juego con celdas pendientes y confirma
- **THEN** el juego pasa al Final

#### Scenario: Terminar durante el Final
- **WHEN** durante la revelación, con "Primos" aún sin juzgar, el operador elige terminar el juego y confirma
- **THEN** el juego termina, se muestra el podio y el puntaje de "Primos" no cambia

### Requirement: Recuperar el juego en curso
El sistema SHALL conservar el juego en curso (equipos, puntajes, celdas usadas, pregunta abierta y, si es un Daily Double, la espera de apuesta o la apuesta registrada con su equipo) de forma que, si la vista de operador se recarga o se cierra por accidente, el operador pueda reanudarlo en el mismo punto. Durante el Final, SHALL conservar además la etapa del Final, los equipos participantes, las apuestas anotadas, los equipos ya juzgados con su resultado, si la respuesta fue revelada y el momento en que se inició el temporizador. Al reanudar con el temporizador corriendo, la cuenta regresiva SHALL continuar con el tiempo restante, sin reproducir la música hasta que el operador reinicie el temporizador.

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

### Requirement: Apuestas del Final
Al entrar al Final, el sistema SHALL fijar qué equipos participan: los que en ese momento tienen puntaje mayor que 0. Los demás MUST quedar fuera del Final y la vista de operador MUST indicarlo. La vista de operador SHALL mostrar la categoría, la pregunta y la respuesta de la pista final, y SHALL permitir anotar la apuesta de cada equipo participante: un monto entero entre 0 y el puntaje que tenía el equipo al entrar al Final, ambos inclusive. El sistema MUST rechazar un monto fuera de ese rango, o que no sea entero, indicando el máximo permitido. Mientras la pista no se muestre, una apuesta anotada SHALL poder cambiarse. El sistema MUST NOT permitir mostrar la pista hasta que todos los equipos participantes tengan su apuesta anotada. Corregir puntajes manualmente durante el Final MUST NOT cambiar qué equipos participan ni el máximo de su apuesta.

#### Scenario: Equipos que participan
- **WHEN** el juego entra al Final con "Primos" con 800, "Tíos" con 0 y "Sobrinos" con -200
- **THEN** solo "Primos" participa y la vista de operador indica que "Tíos" y "Sobrinos" no juegan el Final

#### Scenario: Apuesta válida
- **WHEN** "Primos", que entró al Final con 800, apuesta 800
- **THEN** la apuesta de "Primos" queda anotada por 800

#### Scenario: Apuesta mayor al puntaje
- **WHEN** "Primos", que entró al Final con 800, intenta apostar 900
- **THEN** el sistema rechaza la apuesta e indica que el máximo es 800

#### Scenario: Cambiar una apuesta antes de la pista
- **WHEN** el operador anota 300 para "Primos" y luego la cambia a 500 antes de mostrar la pista
- **THEN** la apuesta de "Primos" queda en 500

#### Scenario: Faltan apuestas
- **WHEN** participan "Primos" y "Tíos" y solo "Primos" tiene apuesta anotada
- **THEN** la acción de mostrar la pista no está disponible

### Requirement: Pista y temporizador del Final
Con todas las apuestas anotadas, el sistema SHALL permitir al operador mostrar la pista final. Una vez mostrada, las apuestas MUST NOT poder cambiarse. El sistema SHALL permitir iniciar un temporizador de 30 segundos. Mientras el temporizador corre, la vista de operador SHALL reproducir una música de licencia libre, y SHALL ofrecer un control para silenciarla y volver a activarla. El operador SHALL poder reiniciar el temporizador y pasar a la revelación en cualquier momento, aunque el temporizador no haya terminado. Al llegar a 0, el temporizador MUST detenerse, la música MUST terminar y el juego MUST seguir en la pista hasta que el operador pase a la revelación. La música MUST sonar también sin conexión a internet, si la aplicación se cargó antes con conexión.

#### Scenario: Mostrar la pista
- **WHEN** todos los equipos participantes tienen apuesta y el operador muestra la pista
- **THEN** el juego pasa a la pista final y las apuestas ya no se pueden cambiar

#### Scenario: Iniciar el temporizador
- **WHEN** con la pista mostrada el operador inicia el temporizador
- **THEN** comienza una cuenta regresiva de 30 segundos y la vista de operador reproduce la música

#### Scenario: Silenciar la música
- **WHEN** con el temporizador corriendo el operador silencia la música
- **THEN** la música deja de oírse y la cuenta regresiva continúa

#### Scenario: Fin del tiempo
- **WHEN** el temporizador llega a 0
- **THEN** la cuenta regresiva muestra 0, la música termina y el juego sigue en la pista final

#### Scenario: Música sin conexión
- **WHEN** la aplicación se cargó una vez con conexión y el operador inicia el temporizador del Final sin conexión
- **THEN** la música suena

### Requirement: Revelación del Final
En la revelación, el sistema SHALL presentar los equipos participantes de a uno, en orden ascendente según el puntaje que tenían al entrar al Final. Los empates se resuelven en el orden en que se definieron los equipos. Para el equipo en turno, el operador SHALL marcar si acertó o falló: si acertó se suma su apuesta y si falló se resta. Cada equipo MUST juzgarse una sola vez y solo cuando es su turno. El operador SHALL poder mostrar la respuesta correcta de la pista final en cualquier momento de la revelación. Cuando todos los equipos participantes estén juzgados, el sistema SHALL permitir ir al podio.

#### Scenario: Orden de revelación
- **WHEN** entran al Final "Primos" con 1200, "Tíos" con 400 y "Abuelos" con 800
- **THEN** la revelación presenta primero a "Tíos", luego a "Abuelos" y por último a "Primos"

#### Scenario: Acierto en el Final
- **WHEN** "Tíos", con 400 y una apuesta de 400, está en turno y el operador marca que acertó
- **THEN** el puntaje de "Tíos" pasa a 800 y el turno pasa al siguiente equipo

#### Scenario: Fallo en el Final
- **WHEN** "Primos", con 1200 y una apuesta de 1000, está en turno y el operador marca que falló
- **THEN** el puntaje de "Primos" pasa a 200

#### Scenario: Fuera de turno
- **WHEN** es el turno de "Tíos" y el operador intenta juzgar a "Primos"
- **THEN** la acción no está disponible y ningún puntaje cambia

#### Scenario: Mostrar la respuesta correcta
- **WHEN** durante la revelación el operador muestra la respuesta
- **THEN** el estado del juego indica que la respuesta de la pista final fue revelada

#### Scenario: Ir al podio
- **WHEN** el operador juzga al último equipo participante y elige ir al podio
- **THEN** el juego termina y se muestra el podio con los puntajes finales

### Requirement: Saltar el Final sin equipos con puntaje positivo
Si el Final está activo pero, al momento de entrar, ningún equipo tiene puntaje mayor que 0, el sistema SHALL terminar el juego sin Final y MUST indicar en el podio que el Final se saltó porque ningún equipo tenía puntaje positivo.

#### Scenario: Todos en cero o negativo
- **WHEN** con el Final activo se usa la última celda y todos los equipos tienen 0 o menos
- **THEN** el juego termina, se muestra el podio y un aviso indica que el Final se saltó porque ningún equipo tenía puntaje positivo
