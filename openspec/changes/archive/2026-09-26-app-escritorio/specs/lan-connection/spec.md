## Purpose

Conecta los celulares de los invitados con la app de escritorio a través de la red wifi local, sin internet, como base para los pulsadores.

## ADDED Requirements

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
La vista de operador de la app de escritorio SHALL ofrecer una pantalla "Conectar dispositivos" que muestre la dirección de conexión y un código QR con esa misma dirección. La dirección MUST usar la IP de la interfaz de red elegida. El sistema SHALL elegir por defecto una interfaz de red privada y física (por ejemplo, la del wifi) antes que interfaces virtuales, de VPN o de enlace local, y SHALL permitir al operador elegir otra interfaz de la lista. La elección MUST recordarse entre aperturas de la app mientras esa interfaz exista.

#### Scenario: QR con la IP del wifi
- **WHEN** el equipo tiene la interfaz wifi con la IP 192.168.1.20 y una interfaz virtual con la IP 172.25.0.1
- **THEN** la pantalla muestra una dirección con 192.168.1.20 y el QR contiene esa misma dirección

#### Scenario: Elegir otra interfaz
- **WHEN** el operador elige otra interfaz de la lista
- **THEN** la dirección y el QR pasan a usar la IP de esa interfaz

#### Scenario: Sin red
- **WHEN** el equipo no tiene ninguna interfaz de red privada activa
- **THEN** la pantalla indica que el equipo debe conectarse a una red wifi para conectar dispositivos

### Requirement: Página de conexión del celular
Al abrir la dirección de conexión, un celular de la misma red SHALL ver una página de conexión en español que indique si está conectado a la app. Si pierde la conexión, la página MUST indicarlo y reintentar sola hasta volver a conectarse.

#### Scenario: Celular conectado
- **WHEN** un celular abre la dirección de conexión con la app de escritorio abierta
- **THEN** la página del celular indica que está conectado

#### Scenario: Reconexión
- **WHEN** el celular pierde la conexión y la app de escritorio sigue abierta
- **THEN** la página indica que se está reconectando y vuelve a indicar "conectado" sin que el invitado recargue la página

### Requirement: Dispositivos conectados
La pantalla "Conectar dispositivos" SHALL mostrar la cantidad y la lista de dispositivos conectados, y MUST actualizarla en menos de 2 segundos cuando un dispositivo se conecta o se desconecta. Un dispositivo que recarga su página MUST contarse una sola vez.

#### Scenario: Se conecta un celular
- **WHEN** un celular abre la dirección de conexión
- **THEN** en menos de 2 segundos la lista del operador muestra un dispositivo conectado más

#### Scenario: Se desconecta un celular
- **WHEN** un celular conectado cierra la página
- **THEN** en menos de 2 segundos la lista del operador deja de mostrarlo

#### Scenario: Recarga del celular
- **WHEN** un celular conectado recarga la página
- **THEN** la lista del operador sigue mostrando ese dispositivo una sola vez

### Requirement: Ayuda de conexión
La pantalla "Conectar dispositivos" SHALL avisar cuando Windows tiene la red actual marcada como Pública, indicando que el firewall puede bloquear a los celulares y cómo cambiarla a Privada. SHALL mostrar además una guía con qué revisar si ningún dispositivo logra conectarse: el permiso del firewall de Windows para la app, que el celular esté en la misma red, y el aislamiento de clientes de las redes de invitados.

#### Scenario: Red Pública
- **WHEN** Windows informa que la red de la interfaz elegida es Pública
- **THEN** la pantalla muestra un aviso sobre la red Pública con los pasos para cambiarla a Privada

#### Scenario: Guía de problemas
- **WHEN** el operador abre la ayuda de la pantalla "Conectar dispositivos"
- **THEN** ve la guía con el firewall, la misma red y las redes de invitados

### Requirement: No exponer datos a la red
El servidor de la red local MUST NOT entregar a otros dispositivos tableros, imágenes, preguntas, respuestas ni el estado del juego. Solo SHALL servir los archivos de la aplicación y la conexión de dispositivos. Una petición a un archivo fuera de la aplicación MUST ser rechazada.

#### Scenario: Página del celular sin datos del juego
- **WHEN** con un juego en curso un celular se conecta
- **THEN** ningún mensaje recibido por el celular contiene preguntas, respuestas, nombres de categorías ni puntajes

#### Scenario: Ruta fuera de la aplicación
- **WHEN** un dispositivo pide una ruta que intenta salir de la carpeta de la aplicación (por ejemplo, con `..`)
- **THEN** el servidor responde con un error y no entrega el archivo
