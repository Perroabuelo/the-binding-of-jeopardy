## MODIFIED Requirements

### Requirement: Dispositivos conectados
La pantalla "Conectar dispositivos" SHALL mostrar la cantidad y la lista de dispositivos conectados, y MUST actualizarla en menos de 2 segundos cuando un dispositivo se conecta o se desconecta. Un dispositivo que recarga su página MUST contarse una sola vez. En un juego con pulsadores, la lista SHALL mostrar el equipo al que está unido cada dispositivo, o que aún no eligió equipo, y MUST actualizarlo en menos de 2 segundos cuando el dispositivo elige o cambia de equipo.

#### Scenario: Se conecta un celular
- **WHEN** un celular abre la dirección de conexión
- **THEN** en menos de 2 segundos la lista del operador muestra un dispositivo conectado más

#### Scenario: Se desconecta un celular
- **WHEN** un celular conectado cierra la página
- **THEN** en menos de 2 segundos la lista del operador deja de mostrarlo

#### Scenario: Recarga del celular
- **WHEN** un celular conectado recarga la página
- **THEN** la lista del operador sigue mostrando ese dispositivo una sola vez

#### Scenario: Equipo del dispositivo
- **WHEN** en un juego con pulsadores un celular elige el equipo "Primos"
- **THEN** en menos de 2 segundos la lista del operador muestra ese dispositivo en "Primos"

### Requirement: No exponer datos a la red
El servidor de la red local MUST NOT entregar a otros dispositivos tableros, imágenes, preguntas, respuestas de las celdas ni de la pista final, ni puntajes. Solo SHALL servir los archivos de la aplicación, la conexión de dispositivos y, en un juego con pulsadores, la información mínima para jugar desde el celular: los nombres de los equipos, el estado de los pulsadores, qué equipo responde, qué equipo elige, la etapa del Final con su categoría y su cuenta regresiva, y la apuesta máxima, la apuesta enviada y la respuesta enviada del propio equipo del dispositivo. Una petición a un archivo fuera de la aplicación MUST ser rechazada.

#### Scenario: Página del celular sin datos del juego
- **WHEN** con un juego en curso un celular se conecta
- **THEN** ningún mensaje recibido por el celular contiene preguntas, respuestas, nombres de categorías del tablero ni puntajes

#### Scenario: Datos de otros equipos
- **WHEN** en el Final "Tíos" envió su apuesta y su respuesta
- **THEN** ningún mensaje recibido por un celular unido a "Primos" contiene la apuesta ni la respuesta de "Tíos"

#### Scenario: Ruta fuera de la aplicación
- **WHEN** un dispositivo pide una ruta que intenta salir de la carpeta de la aplicación (por ejemplo, con `..`)
- **THEN** el servidor responde con un error y no entrega el archivo
