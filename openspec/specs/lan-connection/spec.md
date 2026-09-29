# lan-connection Specification

## Purpose

Conecta los celulares de los invitados con la app de escritorio a través de la red wifi local, sin internet, como base para los pulsadores.

## Requirements

### Requirement: Servidor en la red local
Mientras la app de escritorio esté abierta, el sistema SHALL atender conexiones HTTP y WebSocket de otros dispositivos de la red local, sin necesitar conexión a internet. SHALL usar un puerto preferido fijo y, si está ocupado, el siguiente puerto libre dentro de un rango acotado. Si no encuentra ningún puerto libre en ese rango, MUST informar al operador que la conexión de dispositivos no está disponible, y el resto de la app MUST seguir funcionando.

#### Scenario: Puerto preferido libre
- **WHEN** la app de escritorio se abre con el puerto preferido libre
- **THEN** la dirección de conexión usa el puerto preferido

#### Scenario: Puerto preferido ocupado
- **WHEN** la app de escritorio se abre con el puerto preferido ocupado por otro programa
- **THEN** la dirección de conexión usa otro puerto libre y un celular puede conectarse con ella

#### Scenario: Sin puertos libres
- **WHEN** todos los puertos del rango están ocupados
- **THEN** la pantalla "Conectar dispositivos" indica que la conexión no está disponible y el operador puede jugar sin dispositivos

### Requirement: Dirección y código QR de conexión
En la app de escritorio y en un juego con pulsadores, la vista de operador SHALL ofrecer una pantalla "Conectar dispositivos" y un botón para mostrar u ocultar en la vista de presentación la dirección de conexión y un código QR con esa misma dirección. La dirección y el QR MUST mostrarse solo en la vista de presentación: la vista de operador MUST NOT mostrarlos. En un juego sin pulsadores, la vista de operador MUST NOT ofrecer la pantalla "Conectar dispositivos" ni el botón del QR. La dirección MUST usar la IP de la interfaz de red elegida. El sistema SHALL elegir por defecto una interfaz de red privada y física (por ejemplo, la del wifi) antes que interfaces virtuales, de VPN o de enlace local, y la pantalla "Conectar dispositivos" SHALL permitir al operador elegir otra interfaz de la lista. La elección MUST recordarse entre aperturas de la app mientras esa interfaz exista.

#### Scenario: QR con la IP del wifi
- **WHEN** el equipo tiene la interfaz wifi con la IP 192.168.1.20 y una interfaz virtual con la IP 172.25.0.1, y el operador muestra el QR en la TV
- **THEN** la TV muestra una dirección con 192.168.1.20 y el QR contiene esa misma dirección

#### Scenario: Elegir otra interfaz
- **WHEN** con el QR visible en la TV el operador elige otra interfaz en la pantalla "Conectar dispositivos"
- **THEN** la dirección y el QR de la TV pasan a usar la IP de esa interfaz

#### Scenario: El operador no ve el QR
- **WHEN** en un juego con pulsadores el operador abre la pantalla "Conectar dispositivos"
- **THEN** la pantalla muestra el selector de red y los dispositivos conectados, y no contiene el código QR ni la dirección de conexión

#### Scenario: Juego sin pulsadores
- **WHEN** el operador juega en la app de escritorio un juego sin pulsadores
- **THEN** la vista de operador no ofrece la pantalla "Conectar dispositivos" ni el botón para mostrar el QR en la TV

#### Scenario: Sin red
- **WHEN** el equipo no tiene ninguna interfaz de red privada activa
- **THEN** la pantalla "Conectar dispositivos" indica que el equipo debe conectarse a una red wifi para conectar dispositivos

### Requirement: Página de conexión del celular
Al abrir la dirección de conexión, un celular de la misma red SHALL ver una página de conexión en español que indique si está conectado a la app. Si pierde la conexión, la página MUST indicarlo y reintentar sola hasta volver a conectarse.

#### Scenario: Celular conectado
- **WHEN** un celular abre la dirección de conexión con la app de escritorio abierta
- **THEN** la página del celular indica que está conectado

#### Scenario: Reconexión
- **WHEN** el celular pierde la conexión y la app de escritorio sigue abierta
- **THEN** la página indica que se está reconectando y vuelve a indicar "conectado" sin que el invitado recargue la página

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

### Requirement: Ayuda de conexión
La pantalla "Conectar dispositivos" SHALL avisar cuando Windows tiene la red actual marcada como Pública, indicando que el firewall puede bloquear a los celulares y cómo cambiarla a Privada. SHALL mostrar además una guía con qué revisar si ningún dispositivo logra conectarse: el permiso del firewall de Windows para la app, que el celular esté en la misma red, y el aislamiento de clientes de las redes de invitados.

#### Scenario: Red Pública
- **WHEN** Windows informa que la red de la interfaz elegida es Pública
- **THEN** la pantalla muestra un aviso sobre la red Pública con los pasos para cambiarla a Privada

#### Scenario: Guía de problemas
- **WHEN** el operador abre la ayuda de la pantalla "Conectar dispositivos"
- **THEN** ve la guía con el firewall, la misma red y las redes de invitados

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
