## Purpose

Permite al anfitrión armar su propio tablero de Jeopardy, con título, categorías, preguntas, respuestas e imágenes, y saber cuándo está listo para jugarse.

## ADDED Requirements

### Requirement: Tablero con estructura fija de 5x5
El sistema SHALL crear cada tablero nuevo con exactamente 5 categorías y 5 preguntas por categoría, con valores 100, 200, 300, 400 y 500 en ese orden, de arriba hacia abajo.

#### Scenario: Crear un tablero nuevo
- **WHEN** el usuario crea un tablero nuevo
- **THEN** el editor muestra 5 categorías vacías, cada una con 5 celdas de valores 100, 200, 300, 400 y 500

### Requirement: Editar título y categorías
El sistema SHALL permitir editar el título del tablero y el nombre de cada categoría.

#### Scenario: Renombrar una categoría
- **WHEN** el usuario escribe "Historia familiar" como nombre de la primera categoría
- **THEN** el editor muestra "Historia familiar" como encabezado de esa columna

#### Scenario: Editar el título
- **WHEN** el usuario escribe "Noche de trivia" como título
- **THEN** el editor muestra "Noche de trivia" como título del tablero

### Requirement: Editar pregunta y respuesta de una celda
El sistema SHALL permitir editar el texto de la pregunta y el texto de la respuesta de cada celda de forma independiente.

#### Scenario: Completar una celda
- **WHEN** el usuario abre la celda de 300 de la segunda categoría, escribe una pregunta y una respuesta y la cierra
- **THEN** la celda queda marcada como completa en el editor y, al reabrirla, muestra la pregunta y la respuesta escritas

### Requirement: Imagen opcional por pregunta
El sistema SHALL permitir adjuntar a cada pregunta una imagen opcional desde un archivo local en formato PNG, JPEG, GIF o WebP de hasta 5 MB, y quitarla después. El sistema MUST rechazar archivos de otro formato o de mayor tamaño con un mensaje que explique el motivo, sin modificar la celda.

#### Scenario: Adjuntar una imagen válida
- **WHEN** el usuario adjunta un archivo JPEG de 2 MB a una pregunta
- **THEN** el editor muestra una vista previa de la imagen en esa pregunta

#### Scenario: Quitar la imagen
- **WHEN** el usuario quita la imagen de una pregunta que tenía una
- **THEN** la pregunta queda sin imagen y la vista previa desaparece

#### Scenario: Rechazar un archivo no soportado
- **WHEN** el usuario intenta adjuntar un archivo PDF o una imagen de 8 MB
- **THEN** el sistema muestra un mensaje de error indicando el formato o tamaño permitido y la pregunta conserva su estado anterior

### Requirement: Guardado automático de la edición
El sistema SHALL guardar cada cambio del editor sin que el usuario tenga que presionar un botón de guardar, de modo que al recargar la página el tablero conserve todos los cambios.

#### Scenario: Recargar tras editar
- **WHEN** el usuario edita una categoría y una pregunta y luego recarga la página
- **THEN** el editor muestra el tablero con esos cambios

### Requirement: Validación de tablero listo para jugar
El sistema SHALL considerar un tablero listo para jugar solo cuando tiene título, las 5 categorías tienen nombre y las 25 celdas tienen pregunta y respuesta no vacías. Mientras no esté listo, el sistema MUST impedir iniciar un juego con él e indicar qué elementos faltan.

#### Scenario: Tablero incompleto
- **WHEN** a un tablero le falta la respuesta de una celda
- **THEN** la acción de jugar está deshabilitada y el editor señala la celda incompleta

#### Scenario: Tablero completo
- **WHEN** el tablero tiene título, las 5 categorías nombradas y las 25 celdas con pregunta y respuesta
- **THEN** la acción de jugar está habilitada
