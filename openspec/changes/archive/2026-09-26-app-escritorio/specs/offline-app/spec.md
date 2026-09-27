## MODIFIED Requirements

### Requirement: Funcionamiento sin conexión
En la versión web, después de haberse cargado una vez con conexión, la aplicación SHALL abrirse y funcionar completa sin conexión a internet: editor, lista de tableros, vista de operador y vista de presentación. La app de escritorio SHALL funcionar completa sin conexión a internet desde la primera apertura, incluida la conexión de dispositivos en la red local, y MUST NOT registrar un service worker.

#### Scenario: Abrir sin red
- **WHEN** el usuario abrió la aplicación web con conexión y luego la abre sin conexión
- **THEN** la aplicación carga y muestra sus tableros guardados

#### Scenario: Jugar sin red
- **WHEN** sin conexión el operador inicia un juego y abre la pantalla de TV
- **THEN** ambas vistas funcionan y se sincronizan

#### Scenario: Escritorio sin internet desde la primera vez
- **WHEN** el usuario instala la app de escritorio y la abre por primera vez en un equipo sin internet
- **THEN** la app carga, permite crear un tablero y jugar con la pantalla de TV

#### Scenario: Escritorio sin service worker
- **WHEN** la app de escritorio está abierta
- **THEN** no hay ningún service worker registrado para la aplicación

### Requirement: Actualización sin pérdida de datos
Cuando haya una versión nueva publicada y el usuario abra la aplicación web con conexión, el sistema SHALL pasar a la versión nueva sin perder los tableros guardados ni el juego en curso. En la app de escritorio, instalar una versión nueva sobre la anterior SHALL conservar los tableros guardados, sus imágenes y los respaldos en disco.

#### Scenario: Nueva versión
- **WHEN** se publica una versión nueva y el usuario vuelve a abrir la aplicación web con conexión
- **THEN** la aplicación usa la versión nueva y los tableros guardados siguen disponibles

#### Scenario: Actualizar la app de escritorio
- **WHEN** el usuario instala una versión nueva de la app de escritorio sobre la anterior y la abre
- **THEN** la app muestra la versión nueva y los tableros guardados siguen disponibles con sus imágenes
