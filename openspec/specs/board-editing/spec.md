# board-editing Specification

## Purpose

Permite al anfitrión armar su propio tablero de Jeopardy, con título, categorías, preguntas, respuestas e imágenes, y saber cuándo está listo para jugarse.

## Requirements

### Requirement: Estructura del tablero
El sistema SHALL permitir tableros con entre 3 y 8 categorías, cada una con exactamente 5 preguntas de valores 100, 200, 300, 400 y 500 en ese orden, de arriba hacia abajo. Cada tablero nuevo MUST crearse con 6 categorías vacías. Los tableros existentes con 5 categorías MUST seguir siendo válidos sin modificarse.

#### Scenario: Crear un tablero nuevo
- **WHEN** el usuario crea un tablero nuevo
- **THEN** el editor muestra 6 categorías vacías, cada una con 5 celdas de valores 100, 200, 300, 400 y 500

#### Scenario: Abrir un tablero de 5 categorías
- **WHEN** el usuario abre un tablero guardado antes de este cambio, con 5 categorías
- **THEN** el editor muestra las 5 categorías con su contenido intacto

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

### Requirement: Imagen opcional por respuesta
El sistema SHALL permitir adjuntar a cada respuesta una imagen opcional, independiente de la imagen de la pregunta, desde un archivo local en formato PNG, JPEG, GIF o WebP de hasta 5 MB, y quitarla después. El sistema MUST rechazar archivos de otro formato o de mayor tamaño con un mensaje que explique el motivo, sin modificar la celda.

#### Scenario: Adjuntar una imagen a la respuesta
- **WHEN** el usuario adjunta un archivo PNG de 1 MB a la respuesta de una celda
- **THEN** el editor muestra una vista previa de esa imagen en la respuesta y la imagen de la pregunta, si existe, no cambia

#### Scenario: Quitar la imagen de la respuesta
- **WHEN** el usuario quita la imagen de la respuesta de una celda que tenía imágenes en la pregunta y en la respuesta
- **THEN** la respuesta queda sin imagen, su vista previa desaparece y la pregunta conserva su imagen

#### Scenario: Rechazar un archivo no soportado en la respuesta
- **WHEN** el usuario intenta adjuntar a la respuesta un archivo PDF o una imagen de 8 MB
- **THEN** el sistema muestra un mensaje de error indicando el formato o tamaño permitido y la respuesta conserva su estado anterior

#### Scenario: Conservar tras recargar
- **WHEN** el usuario adjunta una imagen a la respuesta y luego recarga la página
- **THEN** al reabrir la celda, la respuesta sigue mostrando la vista previa de esa imagen

### Requirement: Guardado automático de la edición
El sistema SHALL guardar cada cambio del editor sin que el usuario tenga que presionar un botón de guardar, de modo que al recargar la página el tablero conserve todos los cambios.

#### Scenario: Recargar tras editar
- **WHEN** el usuario edita una categoría y una pregunta y luego recarga la página
- **THEN** el editor muestra el tablero con esos cambios

### Requirement: Validación de tablero listo para jugar
El sistema SHALL considerar un tablero listo para jugar solo cuando tiene título, todas sus categorías tienen nombre y todas sus celdas tienen pregunta y respuesta no vacías, cualquiera sea su número de categorías. Mientras no esté listo, el sistema MUST impedir iniciar un juego con él e indicar qué elementos faltan.

#### Scenario: Tablero incompleto
- **WHEN** a un tablero le falta la respuesta de una celda
- **THEN** la acción de jugar está deshabilitada y el editor señala la celda incompleta

#### Scenario: Tablero completo
- **WHEN** el tablero tiene título, las 6 categorías nombradas y las 30 celdas con pregunta y respuesta
- **THEN** la acción de jugar está habilitada

#### Scenario: Categoría agregada vacía
- **WHEN** a un tablero completo de 6 categorías se le agrega una séptima categoría
- **THEN** la acción de jugar queda deshabilitada y el editor indica que faltan el nombre y las celdas de la categoría 7

### Requirement: Agregar y quitar categorías
El sistema SHALL permitir agregar una categoría vacía al final del tablero mientras tenga menos de 8, y quitar cualquier categoría mientras tenga más de 3. Quitar una categoría con contenido (nombre, alguna pregunta, respuesta o imagen) MUST requerir confirmación. Quitar una categoría sin contenido MUST NOT pedir confirmación. Al quitar una categoría, el sistema MUST eliminar sus imágenes, salvo las que siga usando otro tablero o un juego guardado.

#### Scenario: Agregar una categoría
- **WHEN** el usuario presiona "Agregar categoría" en un tablero de 6 categorías
- **THEN** el editor muestra 7 categorías y la nueva está vacía y al final

#### Scenario: Máximo de categorías
- **WHEN** el tablero tiene 8 categorías
- **THEN** la acción de agregar categoría está deshabilitada

#### Scenario: Mínimo de categorías
- **WHEN** el tablero tiene 3 categorías
- **THEN** la acción de quitar está deshabilitada en todas las categorías

#### Scenario: Quitar una categoría vacía
- **WHEN** el usuario quita una categoría sin nombre ni contenido
- **THEN** la categoría desaparece sin pedir confirmación

#### Scenario: Quitar una categoría con contenido y confirmar
- **WHEN** el usuario quita la categoría "Historia familiar", que tiene preguntas, y confirma
- **THEN** la categoría desaparece, las demás conservan su contenido y su orden, y el cambio sigue tras recargar la página

#### Scenario: Cancelar quitar una categoría
- **WHEN** el usuario quita una categoría con contenido y cancela la confirmación
- **THEN** el tablero no cambia

#### Scenario: Limpiar imágenes al quitar
- **WHEN** el usuario quita y confirma una categoría con una pregunta que tiene imagen, y esa imagen no la usa nada más
- **THEN** la imagen deja de estar guardada

### Requirement: Reordenar categorías
El sistema SHALL permitir mover cada categoría una posición a la izquierda o a la derecha, conservando su nombre, preguntas, respuestas e imágenes. La acción de mover a la izquierda MUST estar deshabilitada en la primera categoría y la de mover a la derecha en la última.

#### Scenario: Mover una categoría a la derecha
- **WHEN** el usuario mueve a la derecha la primera categoría, "Historia familiar"
- **THEN** "Historia familiar" pasa a ser la segunda categoría con todo su contenido, la que era segunda pasa a ser la primera, y el orden sigue tras recargar la página

#### Scenario: Límites del reordenamiento
- **WHEN** el editor muestra un tablero
- **THEN** la acción de mover a la izquierda está deshabilitada en la primera categoría y la de mover a la derecha en la última
