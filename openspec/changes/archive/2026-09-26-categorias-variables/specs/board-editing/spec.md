## RENAMED Requirements

- FROM: `### Requirement: Tablero con estructura fija de 5x5`
- TO: `### Requirement: Estructura del tablero`

## MODIFIED Requirements

### Requirement: Estructura del tablero
El sistema SHALL permitir tableros con entre 3 y 8 categorías, cada una con exactamente 5 preguntas de valores 100, 200, 300, 400 y 500 en ese orden, de arriba hacia abajo. Cada tablero nuevo MUST crearse con 6 categorías vacías. Los tableros existentes con 5 categorías MUST seguir siendo válidos sin modificarse.

#### Scenario: Crear un tablero nuevo
- **WHEN** el usuario crea un tablero nuevo
- **THEN** el editor muestra 6 categorías vacías, cada una con 5 celdas de valores 100, 200, 300, 400 y 500

#### Scenario: Abrir un tablero de 5 categorías
- **WHEN** el usuario abre un tablero guardado antes de este cambio, con 5 categorías
- **THEN** el editor muestra las 5 categorías con su contenido intacto

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

## ADDED Requirements

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
