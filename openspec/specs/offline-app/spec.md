# offline-app Specification

## Purpose

Asegura que la aplicación funcione el día del juego aunque falle la conexión a internet, una vez que se cargó al menos una vez en el navegador.

## Requirements

### Requirement: Funcionamiento sin conexión
Después de haberse cargado una vez con conexión, la aplicación SHALL abrirse y funcionar completa sin conexión a internet: editor, lista de tableros, vista de operador y vista de presentación.

#### Scenario: Abrir sin red
- **WHEN** el usuario abrió la aplicación con conexión y luego la abre sin conexión
- **THEN** la aplicación carga y muestra sus tableros guardados

#### Scenario: Jugar sin red
- **WHEN** sin conexión el operador inicia un juego y abre la pantalla de TV
- **THEN** ambas vistas funcionan y se sincronizan

### Requirement: Actualización sin pérdida de datos
Cuando haya una versión nueva publicada y el usuario abra la aplicación con conexión, el sistema SHALL pasar a la versión nueva sin perder los tableros guardados ni el juego en curso.

#### Scenario: Nueva versión
- **WHEN** se publica una versión nueva y el usuario vuelve a abrir la aplicación con conexión
- **THEN** la aplicación usa la versión nueva y los tableros guardados siguen disponibles
