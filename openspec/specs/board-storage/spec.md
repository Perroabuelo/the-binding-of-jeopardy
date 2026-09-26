# board-storage Specification

## Purpose

Guarda los tableros en el navegador del usuario y permite llevarlos a otro computador o respaldarlos mediante un archivo portable que incluye las imágenes.

## Requirements

### Requirement: Persistencia local de tableros
El sistema SHALL guardar los tableros, incluidas sus imágenes, en el almacenamiento local del navegador, y MUST NOT enviarlos a ningún servidor.

#### Scenario: Tableros disponibles tras cerrar el navegador
- **WHEN** el usuario crea un tablero, cierra el navegador y vuelve a abrir la aplicación
- **THEN** el tablero aparece en la lista de tableros con su contenido e imágenes

#### Scenario: Sin envío de datos
- **WHEN** el usuario crea, edita y guarda un tablero
- **THEN** la aplicación no realiza peticiones de red que contengan datos del tablero

### Requirement: Gestión de varios tableros
El sistema SHALL mostrar una lista de los tableros guardados con su título y fecha de última modificación, y permitir crear uno nuevo, abrir uno existente y eliminar uno. La eliminación MUST requerir confirmación.

#### Scenario: Abrir un tablero de la lista
- **WHEN** el usuario selecciona un tablero de la lista
- **THEN** el editor se abre con el contenido de ese tablero

#### Scenario: Eliminar con confirmación
- **WHEN** el usuario elige eliminar un tablero y confirma
- **THEN** el tablero desaparece de la lista y deja de estar guardado

#### Scenario: Cancelar eliminación
- **WHEN** el usuario elige eliminar un tablero y cancela la confirmación
- **THEN** el tablero sigue en la lista sin cambios

### Requirement: Exportar tablero a archivo
El sistema SHALL permitir exportar un tablero a un único archivo descargable que contiene todo su contenido, incluidas las imágenes de las preguntas y de las respuestas.

#### Scenario: Exportar un tablero con imágenes
- **WHEN** el usuario exporta un tablero que tiene preguntas con imágenes
- **THEN** el navegador descarga un único archivo con el tablero completo

#### Scenario: Exportar un tablero con imágenes de respuesta
- **WHEN** el usuario exporta un tablero que tiene respuestas con imágenes
- **THEN** el archivo descargado incluye esas imágenes asociadas a sus respuestas

### Requirement: Importar tablero desde archivo
El sistema SHALL permitir importar un archivo exportado previamente, creando un tablero nuevo equivalente al original, incluidas las imágenes de sus preguntas y respuestas. Importar MUST NOT sobrescribir tableros existentes. Un archivo inválido o corrupto MUST ser rechazado con un mensaje de error, sin crear ni modificar tableros. Los archivos exportados antes de que existieran las imágenes de respuesta MUST seguir importándose.

#### Scenario: Ida y vuelta
- **WHEN** el usuario exporta un tablero y luego importa el archivo resultante
- **THEN** aparece un tablero nuevo en la lista con el mismo título, categorías, preguntas, respuestas, imágenes de preguntas e imágenes de respuestas que el original

#### Scenario: Importar el mismo archivo dos veces
- **WHEN** el usuario importa dos veces el mismo archivo
- **THEN** la lista contiene dos tableros distintos y ningún tablero existente se modifica

#### Scenario: Archivo inválido
- **WHEN** el usuario importa un archivo que no es un tablero exportado o que está dañado
- **THEN** el sistema muestra un mensaje de error y la lista de tableros no cambia

#### Scenario: Archivo sin imágenes de respuesta
- **WHEN** el usuario importa un archivo exportado con una versión anterior de la aplicación, sin imágenes de respuesta
- **THEN** aparece un tablero nuevo equivalente al original, con sus imágenes de preguntas y sin imágenes de respuesta

#### Scenario: Falta una imagen de respuesta
- **WHEN** el usuario importa un archivo en el que una respuesta referencia una imagen que no está incluida
- **THEN** el sistema muestra un mensaje de error y la lista de tableros no cambia

### Requirement: Almacenamiento no disponible
El sistema SHALL mostrar un mensaje claro cuando el almacenamiento local del navegador no está disponible o se llena, indicando que los cambios no se pudieron guardar.

#### Scenario: Falla al guardar
- **WHEN** el navegador rechaza una operación de guardado
- **THEN** el sistema muestra un aviso de que el cambio no se guardó
