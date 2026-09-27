## Purpose

Ofrece la modalidad fiesta: una app de escritorio para Windows que empaqueta la misma aplicación web, controla las ventanas del operador y de la TV, y se distribuye como instalador en GitHub Releases.

## ADDED Requirements

### Requirement: Instalación y arranque de la app de escritorio
El sistema SHALL distribuirse para Windows como un instalador `.exe` que MUST NOT requerir permisos de administrador. Al abrir la app instalada, el sistema SHALL mostrar la ventana del operador con la lista de tableros, sin pasos adicionales del usuario.

#### Scenario: Abrir la app instalada
- **WHEN** el usuario abre la app de escritorio instalada
- **THEN** se abre una ventana propia con la lista de tableros

#### Scenario: Instalación sin administrador
- **WHEN** un usuario sin permisos de administrador ejecuta el instalador
- **THEN** la app queda instalada con un acceso directo, sin pedir elevación de permisos

### Requirement: Instancia única
El sistema SHALL ejecutar una sola instancia de la app de escritorio por usuario. Si el usuario la abre de nuevo mientras ya está abierta, MUST enfocar la ventana del operador existente y MUST NOT iniciar una segunda instancia ni un segundo servidor en la red local.

#### Scenario: Abrir la app dos veces
- **WHEN** con la app abierta el usuario vuelve a abrirla desde el acceso directo
- **THEN** la ventana del operador existente pasa al frente y sigue habiendo una sola ventana del operador

### Requirement: Detección de la modalidad
La aplicación SHALL distinguir si corre en la app de escritorio o en la versión web sin hacer peticiones de red para averiguarlo. Las funciones propias del escritorio (conexión en red local, respaldo en disco, ventana de TV controlada) MUST mostrarse solo en la app de escritorio, y la versión web MUST seguir funcionando como antes.

#### Scenario: Versión web
- **WHEN** el usuario abre la aplicación en el navegador desde GitHub Pages
- **THEN** no aparece la opción "Conectar dispositivos" ni la opción de abrir la carpeta de respaldos

#### Scenario: App de escritorio
- **WHEN** el usuario inicia un juego en la app de escritorio
- **THEN** la vista de operador ofrece "Conectar dispositivos"

### Requirement: Datos estables entre sesiones de la app
La app de escritorio SHALL conservar los tableros, las imágenes y el juego en curso entre cierres y aperturas de la app, aunque cambie el puerto que usa en la red local.

#### Scenario: Reabrir la app
- **WHEN** el usuario crea un tablero, cierra la app y la vuelve a abrir
- **THEN** el tablero aparece en la lista con su contenido e imágenes

#### Scenario: Puerto distinto
- **WHEN** el usuario crea un tablero, cierra la app y la vuelve a abrir con el puerto preferido ocupado por otro programa
- **THEN** el tablero sigue apareciendo en la lista

### Requirement: Cierre de la app
Al cerrar la ventana del operador, la app de escritorio SHALL cerrar la ventana de TV y detener el servidor de la red local.

#### Scenario: Cerrar el operador
- **WHEN** con la ventana de TV abierta el usuario cierra la ventana del operador
- **THEN** la ventana de TV se cierra y la dirección de conexión deja de responder

### Requirement: Navegación restringida en escritorio
Las ventanas de la app de escritorio MUST mostrar solo contenido de la propia aplicación. Un enlace o una navegación hacia una dirección externa MUST NOT cargarse dentro de la app.

#### Scenario: Enlace externo
- **WHEN** la ventana del operador intenta navegar a una dirección externa
- **THEN** la ventana sigue mostrando la aplicación y no carga la dirección externa

### Requirement: Publicación en GitHub Releases
Cada tag de versión `vX.Y.Z` SHALL producir un instalador de Windows publicado en GitHub Releases, solo si pasan las verificaciones del CI y si la versión del tag coincide con la de la aplicación. El despliegue de la versión web MUST NOT depender de la publicación del escritorio.

#### Scenario: Tag de versión
- **WHEN** se crea el tag `v1.0.0` en un commit cuyas verificaciones pasan y cuya aplicación declara la versión 1.0.0
- **THEN** GitHub Releases tiene una versión v1.0.0 con el instalador `.exe`

#### Scenario: Versión que no coincide
- **WHEN** se crea el tag `v1.0.1` en un commit cuya aplicación declara la versión 1.0.0
- **THEN** la publicación falla y no se crea ningún instalador en GitHub Releases
