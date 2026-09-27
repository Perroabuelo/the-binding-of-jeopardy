## Purpose

Permite que los invitados usen sus celulares, conectados por la red local a la app de escritorio, como pulsadores de su equipo y como medio para enviar en secreto la apuesta y la respuesta del Final.

## ADDED Requirements

### Requirement: Usar pulsadores al iniciar
Al iniciar un juego en la app de escritorio, el sistema SHALL ofrecer la opción "Usar pulsadores", activada por defecto. En la versión web la opción MUST NOT aparecer y el juego MUST funcionar sin pulsadores. Con la opción desactivada, el juego SHALL funcionar como en la versión web, sin controles de pulsadores ni envíos desde los celulares.

#### Scenario: Opción en escritorio
- **WHEN** el usuario va a iniciar un juego en la app de escritorio
- **THEN** la opción "Usar pulsadores" está disponible y activada

#### Scenario: Opción en la web
- **WHEN** el usuario va a iniciar un juego en la versión web
- **THEN** la opción "Usar pulsadores" no aparece

#### Scenario: Juego sin pulsadores
- **WHEN** el usuario desactiva "Usar pulsadores" e inicia el juego en escritorio
- **THEN** al abrir una pregunta la vista de operador no ofrece "Activar pulsadores"

### Requirement: Unirse a un equipo desde el celular
Con un juego con pulsadores en curso, la página del celular SHALL mostrar los equipos del juego y permitir al invitado elegir uno. Varios celulares MUST poder unirse al mismo equipo. El invitado SHALL poder cambiar de equipo desde el celular en cualquier momento. Sin un juego con pulsadores en curso, la página del celular SHALL indicar que espera a que empiece el juego.

#### Scenario: Elegir equipo
- **WHEN** en un juego con los equipos "Primos" y "Tíos" un invitado elige "Primos" en su celular
- **THEN** el celular queda unido a "Primos" y lo indica

#### Scenario: Varios celulares en un equipo
- **WHEN** dos celulares eligen "Primos"
- **THEN** ambos quedan unidos a "Primos"

#### Scenario: Cambiar de equipo
- **WHEN** un celular unido a "Primos" elige "Tíos"
- **THEN** el celular queda unido a "Tíos" y deja de pulsar por "Primos"

#### Scenario: Sin juego en curso
- **WHEN** un celular se conecta sin un juego con pulsadores en curso
- **THEN** la página indica que espera a que empiece el juego

### Requirement: Armar los pulsadores
Con una pregunta abierta que no es un Daily Double, en un juego con pulsadores, el sistema SHALL permitir al operador activar los pulsadores. Mientras no estén activos, ningún toque MUST contar como respuesta. El operador SHALL poder cerrar los pulsadores en cualquier momento sin asignar puntos.

#### Scenario: Activar
- **WHEN** con una pregunta abierta el operador presiona "Activar pulsadores"
- **THEN** los celulares de los equipos que pueden responder muestran el pulsador activo

#### Scenario: Cerrar sin juzgar
- **WHEN** con los pulsadores activos y sin toques el operador los cierra
- **THEN** los pulsadores quedan cerrados y ningún puntaje cambia

### Requirement: Bloqueo por pulsar antes de tiempo
Un toque de un celular mientras los pulsadores no están activos MUST bloquear a ese celular durante 0,25 segundos. Un toque de un celular bloqueado MUST NOT contar, aunque los pulsadores se activen durante el bloqueo. El bloqueo MUST afectar solo al celular que tocó, no a los demás celulares de su equipo.

#### Scenario: Toque antes de activar
- **WHEN** un celular toca el pulsador antes de que el operador lo active
- **THEN** ese celular queda bloqueado 0,25 segundos y el celular lo indica

#### Scenario: Toque durante el bloqueo
- **WHEN** un celular bloqueado toca el pulsador justo después de que el operador lo activa
- **THEN** su toque no cuenta y los pulsadores siguen activos

#### Scenario: Otro celular del mismo equipo
- **WHEN** un celular de "Primos" está bloqueado y otro celular de "Primos" toca con los pulsadores activos
- **THEN** el toque del segundo celular cuenta para "Primos"

### Requirement: Primer toque gana
Con los pulsadores activos, el primer toque válido que llegue a la app SHALL ganar: el equipo de ese celular pasa a responder y los pulsadores MUST dejar de aceptar toques. La vista de operador y los celulares SHALL mostrar qué equipo responde, y el celular que tocó SHALL indicar que ganó. Un toque de un equipo que ya falló en esa pregunta MUST NOT contar.

#### Scenario: Primer toque
- **WHEN** con los pulsadores activos un celular de "Tíos" toca primero y luego uno de "Primos"
- **THEN** responde "Tíos", el toque de "Primos" no cuenta y el celular de "Tíos" que tocó indica que ganó

#### Scenario: Equipo que ya falló
- **WHEN** "Tíos" ya falló en la pregunta y un celular de "Tíos" toca con los pulsadores reabiertos
- **THEN** su toque no cuenta

### Requirement: Tiempo para responder
Cuando un equipo gana el toque, el sistema SHALL iniciar una cuenta regresiva fija de 5 segundos para responder, visible en la vista de operador y en los celulares. Al llegar a 0, la vista de operador y los celulares SHALL indicar "¡Tiempo!" y la vista de operador SHALL resaltar la opción de marcar la respuesta como incorrecta. Llegar a 0 MUST NOT cambiar puntajes ni el estado de los pulsadores: el operador decide y SHALL poder marcar la respuesta como correcta o incorrecta después de agotado el tiempo. La cuenta regresiva MUST terminar cuando el operador juzga la respuesta o cierra los pulsadores, y MUST empezar de nuevo en 5 segundos cuando otro equipo gana el toque tras una reapertura.

#### Scenario: Cuenta regresiva al ganar el toque
- **WHEN** gana el toque de "Tíos"
- **THEN** la vista de operador y los celulares muestran una cuenta regresiva que empieza en 5 segundos

#### Scenario: Tiempo agotado
- **WHEN** pasan 5 segundos desde que "Tíos" ganó el toque sin que el operador juzgue
- **THEN** la vista de operador y los celulares muestran "¡Tiempo!", la opción de marcar incorrecta queda resaltada, y el puntaje de "Tíos" y el estado de los pulsadores no cambian

#### Scenario: Correcta después del tiempo
- **WHEN** con el tiempo agotado el operador marca correcta la respuesta de "Tíos", que tenía 0 puntos, en la pregunta de 200
- **THEN** "Tíos" pasa a 200

#### Scenario: Reapertura reinicia la cuenta
- **WHEN** el operador marca incorrecta la respuesta de "Tíos" y luego gana el toque de "Primos"
- **THEN** la cuenta regresiva empieza de nuevo en 5 segundos para "Primos"

### Requirement: Juzgar la respuesta del pulsador
Con un equipo respondiendo por pulsador, el sistema SHALL ofrecer al operador marcar la respuesta como correcta o incorrecta. Correcta MUST sumar al equipo el valor de la pregunta multiplicado por el multiplicador de la ronda en curso y cerrar los pulsadores. Incorrecta MUST restar ese valor al equipo y reabrir los pulsadores para los equipos que aún no fallaron en esa pregunta. Si no queda ningún equipo que pueda responder, los pulsadores MUST quedar cerrados. Los botones manuales para sumar o restar puntos y la corrección de puntajes MUST seguir disponibles.

#### Scenario: Correcta
- **WHEN** "Primos", con 100 puntos, responde la pregunta de 400 por pulsador y el operador marca correcta
- **THEN** "Primos" pasa a 500 y los pulsadores quedan cerrados

#### Scenario: Correcta en una ronda x2
- **WHEN** en una ronda x2 "Primos", con 100 puntos, responde la pregunta de 400 y el operador marca correcta
- **THEN** "Primos" pasa a 900

#### Scenario: Incorrecta reabre
- **WHEN** en un juego con "Primos", "Tíos" y "Abuelos", "Tíos", con 0 puntos, responde la pregunta de 300 y el operador marca incorrecta
- **THEN** "Tíos" pasa a -300 y los pulsadores quedan activos solo para "Primos" y "Abuelos"

#### Scenario: Todos fallaron
- **WHEN** en un juego con "Primos" y "Tíos", ambos responden por pulsador y el operador marca incorrecta las dos veces
- **THEN** los pulsadores quedan cerrados

### Requirement: Daily Double sin pulsadores
En un Daily Double, el sistema MUST NOT ofrecer activar los pulsadores. Responde el equipo que registró la apuesta, como en un juego sin pulsadores.

#### Scenario: Daily Double abierto
- **WHEN** en un juego con pulsadores el operador abre un Daily Double y registra la apuesta
- **THEN** la vista de operador no ofrece "Activar pulsadores"

### Requirement: Equipo que elige
En un juego con pulsadores, el equipo que acierta una pregunta por pulsador SHALL quedar indicado como el equipo que elige la siguiente pregunta, hasta que otro equipo acierte por pulsador. La vista de operador SHALL mostrar qué equipo elige. Al inicio del juego ningún equipo está indicado.

#### Scenario: Acierto por pulsador
- **WHEN** el operador marca correcta la respuesta de "Primos" por pulsador
- **THEN** la vista de operador indica que elige "Primos"

#### Scenario: Otro acierto
- **WHEN** elige "Primos" y luego "Tíos" acierta por pulsador
- **THEN** la vista de operador indica que elige "Tíos"

### Requirement: Estados del pulsador en el celular
La página del celular unido a un equipo SHALL mostrar en todo momento uno de estos estados: esperando (sin pregunta o pulsadores cerrados), activo (puede tocar), bloqueado (tocó antes de tiempo), ganó (su toque ganó), otro equipo responde (con el nombre del equipo), o ya falló (su equipo falló en esa pregunta). Cada cambio de estado MUST verse en el celular en menos de 1 segundo. La página SHALL vibrar al activarse los pulsadores y al ganar, si el navegador lo permite.

#### Scenario: Esperando
- **WHEN** el juego está en el tablero
- **THEN** el celular muestra el estado esperando

#### Scenario: Activo
- **WHEN** el operador activa los pulsadores
- **THEN** en menos de 1 segundo el celular muestra el pulsador activo

#### Scenario: Otro equipo responde
- **WHEN** gana el toque de "Tíos"
- **THEN** en menos de 1 segundo los celulares de los demás equipos muestran que responde "Tíos"

#### Scenario: Ya falló
- **WHEN** el operador marca incorrecta la respuesta de "Tíos"
- **THEN** los celulares de "Tíos" muestran que su equipo ya falló en esta pregunta

### Requirement: Apuesta y respuesta del Final desde el celular
En un juego con pulsadores y Final, los celulares de un equipo participante SHALL permitir enviar la apuesta durante la etapa de apuestas, con un monto entero entre 0 y el puntaje con que el equipo entró al Final, y enviar la respuesta escrita desde que se muestra la pista hasta que termina el temporizador o empieza la revelación. El primer envío de la apuesta y el primer envío de la respuesta de un equipo MUST quedar fijos para todo el equipo: los envíos posteriores desde otros celulares del equipo MUST NOT reemplazarlos, y esos celulares SHALL mostrar el valor enviado y qué dispositivo lo envió. El operador SHALL ver qué equipos enviaron su apuesta y su respuesta, y SHALL poder anotar o corregir la apuesta de cualquier equipo a mano mientras no se muestre la pista. La vista de operador SHALL mostrar la respuesta enviada del equipo en turno durante la revelación. Los celulares de un equipo que no participa SHALL indicar que su equipo no juega el Final. Los celulares SHALL mostrar la cuenta regresiva del temporizador del Final.

#### Scenario: Enviar la apuesta
- **WHEN** "Primos" entró al Final con 800 y un celular de "Primos" envía la apuesta 500
- **THEN** la apuesta de "Primos" queda anotada en 500 y la vista de operador indica que "Primos" ya apostó

#### Scenario: Apuesta mayor al máximo
- **WHEN** "Primos" entró al Final con 800 y un celular de "Primos" intenta enviar 900
- **THEN** el celular indica que el máximo es 800 y la apuesta no se anota

#### Scenario: Primer envío queda fijo
- **WHEN** un celular "Android" de "Primos" envía la apuesta 500 y luego otro celular de "Primos" intenta enviar 300
- **THEN** la apuesta de "Primos" sigue en 500 y el segundo celular muestra "Enviada por Android: 500"

#### Scenario: Corrección del operador
- **WHEN** "Primos" envió 500 desde el celular y el operador cambia la apuesta a 400 antes de mostrar la pista
- **THEN** la apuesta de "Primos" queda en 400

#### Scenario: Enviar la respuesta
- **WHEN** con la pista mostrada y el temporizador corriendo un celular de "Tíos" envía la respuesta "¿Qué es un pastel?"
- **THEN** la respuesta de "Tíos" queda guardada y la vista de operador indica que "Tíos" respondió

#### Scenario: Respuesta fuera de tiempo
- **WHEN** el temporizador del Final llegó a 0 y un celular intenta enviar una respuesta
- **THEN** la respuesta no se guarda y el celular indica que se acabó el tiempo

#### Scenario: Respuesta en la revelación
- **WHEN** en la revelación es el turno de "Tíos", que envió "¿Qué es un pastel?"
- **THEN** la vista de operador muestra la respuesta "¿Qué es un pastel?" de "Tíos" junto a los botones de acierto y fallo

#### Scenario: Equipo que no participa
- **WHEN** el juego entra al Final con "Sobrinos" en -200
- **THEN** los celulares de "Sobrinos" indican que su equipo no juega el Final

### Requirement: Privacidad de los celulares
Un celular MUST NOT recibir preguntas, respuestas ni imágenes de las celdas del tablero ni de la pista final, salvo la categoría del Final. Un celular MUST NOT recibir la apuesta ni la respuesta del Final de un equipo distinto del suyo, ni el puntaje de otros equipos.

#### Scenario: Pregunta abierta
- **WHEN** hay una pregunta abierta con los pulsadores activos
- **THEN** ningún mensaje recibido por los celulares contiene el texto de la pregunta ni de la respuesta

#### Scenario: Apuestas de otros equipos
- **WHEN** "Primos" envió su apuesta del Final
- **THEN** ningún mensaje recibido por los celulares de "Tíos" contiene la apuesta de "Primos"

### Requirement: Reconexión del celular
Un celular que recarga la página o se reconecta, incluso después de reiniciar la app de escritorio, SHALL volver a quedar unido al mismo equipo, si ese equipo existe en el juego en curso, y SHALL mostrar el estado actual sin intervención del invitado. Un envío del Final ya hecho por su equipo SHALL seguir mostrándose como enviado.

#### Scenario: Recarga del celular
- **WHEN** un celular unido a "Primos" recarga la página con los pulsadores activos
- **THEN** vuelve a quedar unido a "Primos" y muestra el pulsador activo

#### Scenario: Recarga tras enviar la apuesta
- **WHEN** un celular de "Primos" envió la apuesta 500 y recarga la página
- **THEN** muestra que "Primos" ya envió la apuesta 500

#### Scenario: Equipo que ya no existe
- **WHEN** un celular que estaba unido a un equipo de un juego anterior se conecta a un juego nuevo
- **THEN** la página le pide elegir un equipo del juego nuevo
