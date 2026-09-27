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

### Requirement: Importar tableros de distinto tamaño
El sistema SHALL importar tableros con entre 3 y 8 categorías, conservando su cantidad y su orden. Un archivo con menos de 3 o más de 8 categorías, o con una categoría que no tenga exactamente 5 preguntas de 100 a 500, MUST ser rechazado con un mensaje que indique la estructura permitida, sin crear ni modificar tableros.

#### Scenario: Importar un tablero de 8 categorías
- **WHEN** el usuario exporta un tablero de 8 categorías y luego importa el archivo resultante
- **THEN** aparece un tablero nuevo con las mismas 8 categorías en el mismo orden

#### Scenario: Importar un archivo de 5 categorías
- **WHEN** el usuario importa un archivo exportado antes de este cambio, con 5 categorías
- **THEN** aparece un tablero nuevo con esas 5 categorías

#### Scenario: Demasiadas categorías
- **WHEN** el usuario importa un archivo cuyo tablero tiene 9 categorías
- **THEN** el sistema muestra un mensaje indicando que el tablero debe tener entre 3 y 8 categorías con 5 preguntas de 100 a 500, y la lista de tableros no cambia

### Requirement: Almacenamiento no disponible
El sistema SHALL mostrar un mensaje claro cuando el almacenamiento local del navegador no está disponible o se llena, indicando que los cambios no se pudieron guardar.

#### Scenario: Falla al guardar
- **WHEN** el navegador rechaza una operación de guardado
- **THEN** el sistema muestra un aviso de que el cambio no se guardó

### Requirement: Conservar los Daily Double al exportar e importar
Exportar un tablero SHALL incluir qué celdas son Daily Double, e importar ese archivo MUST crear un tablero con las mismas celdas marcadas. Los archivos exportados antes de que existieran los Daily Double MUST seguir importándose, con todas sus celdas sin marcar.

#### Scenario: Ida y vuelta con Daily Double
- **WHEN** el usuario exporta un tablero con las celdas de 300 de la primera categoría y de 500 de la cuarta marcadas como Daily Double, y luego importa el archivo resultante
- **THEN** el tablero nuevo tiene marcadas como Daily Double exactamente esas dos celdas

#### Scenario: Archivo anterior a los Daily Double
- **WHEN** el usuario importa un archivo exportado con una versión anterior de la aplicación
- **THEN** aparece un tablero nuevo equivalente al original, sin ninguna celda marcada como Daily Double

### Requirement: Conservar la pista final al exportar e importar
Exportar un tablero SHALL incluir su pista final, si la tiene, con sus imágenes. Importar ese archivo MUST crear un tablero con la misma pista final y las mismas imágenes. Los archivos exportados antes de que existiera la pista final MUST seguir importándose, sin pista final. Un archivo cuya pista final referencia una imagen que no está incluida MUST ser rechazado con un mensaje de error, sin crear ni modificar tableros.

#### Scenario: Ida y vuelta con pista final
- **WHEN** el usuario exporta un tablero con una pista final que tiene imagen en la pregunta y luego importa el archivo resultante
- **THEN** el tablero nuevo tiene la misma categoría, pregunta, respuesta e imagen en su pista final

#### Scenario: Archivo anterior a la pista final
- **WHEN** el usuario importa un archivo exportado con una versión anterior de la aplicación
- **THEN** aparece un tablero nuevo equivalente al original y sin pista final

#### Scenario: Falta una imagen de la pista final
- **WHEN** el usuario importa un archivo en el que la pista final referencia una imagen que no está incluida
- **THEN** el sistema muestra un mensaje de error y la lista de tableros no cambia

### Requirement: Respaldo de tableros en disco en escritorio
En la app de escritorio, el sistema SHALL respaldar automáticamente cada tablero, después de crearlo o guardarlo, como un archivo en el mismo formato de exportación (con sus imágenes y todo su contenido) dentro de la carpeta `Documentos\The Binding of Jeopardy\Respaldos`. Cada tablero MUST tener un único archivo de respaldo, que se reemplaza en cada guardado aunque cambie el título. Al eliminar un tablero, su respaldo SHALL moverse a la subcarpeta `eliminados`. La app de escritorio SHALL ofrecer abrir la carpeta de respaldos. Si un respaldo falla, el sistema MUST avisarlo sin impedir seguir editando, y el tablero MUST seguir guardado en el almacenamiento de la app. La versión web MUST NOT hacer respaldos en disco.

#### Scenario: Respaldo al guardar
- **WHEN** en la app de escritorio el usuario guarda un tablero con imágenes
- **THEN** la carpeta de respaldos contiene un archivo de ese tablero que, al importarlo, crea un tablero equivalente con sus imágenes

#### Scenario: Cambio de título
- **WHEN** el usuario cambia el título de un tablero ya respaldado y lo guarda
- **THEN** la carpeta de respaldos contiene un único archivo de ese tablero, con el título nuevo

#### Scenario: Eliminar un tablero
- **WHEN** el usuario elimina un tablero respaldado y confirma
- **THEN** su archivo de respaldo ya no está en la carpeta de respaldos y está en la subcarpeta `eliminados`

#### Scenario: Falla el respaldo
- **WHEN** la carpeta de respaldos no se puede escribir y el usuario guarda un tablero
- **THEN** el sistema avisa que el respaldo falló y el tablero sigue guardado en la lista

#### Scenario: Versión web sin respaldo
- **WHEN** el usuario guarda un tablero en la versión web
- **THEN** no se escribe ningún archivo en disco y no aparece la opción de abrir la carpeta de respaldos

### Requirement: Crear un tablero desde un ejemplo
El sistema SHALL ofrecer, en la lista de tableros de la web y del escritorio, la opción de crear un tablero desde uno de tres ejemplos: agricultura, videojuegos y música K-pop. Cada ejemplo MUST estar listo para jugar: 6 categorías con nombre, cada una con 5 preguntas de 100 a 500 con su pregunta y su respuesta, exactamente un Daily Double y una pista final completa. Elegir un ejemplo SHALL crear un tablero nuevo e independiente, que aparece en la lista y se guarda, edita, exporta, respalda y elimina como cualquier otro. Crear un ejemplo MUST NOT modificar tableros existentes. El sistema MUST NOT crear tableros de ejemplo sin que el usuario lo pida.

#### Scenario: Elegir entre los ejemplos
- **WHEN** el usuario presiona "Crear desde ejemplo" en la lista de tableros
- **THEN** el sistema muestra los ejemplos de agricultura, videojuegos y K-pop, cada uno con su título y una descripción

#### Scenario: Crear un tablero desde un ejemplo
- **WHEN** el usuario elige el ejemplo de videojuegos
- **THEN** aparece primero en la lista un tablero nuevo con el título, las categorías, las preguntas, las respuestas, el Daily Double y la pista final del ejemplo

#### Scenario: Ejemplo listo para jugar
- **WHEN** el usuario crea un tablero desde cualquiera de los tres ejemplos y lo abre
- **THEN** el panel de Jugar indica que el tablero está listo para jugar y que la pista final está completa

#### Scenario: Crear el mismo ejemplo dos veces
- **WHEN** el usuario crea dos veces el tablero desde el ejemplo de agricultura
- **THEN** la lista contiene dos tableros distintos y ningún tablero existente se modifica

#### Scenario: La copia es independiente del ejemplo
- **WHEN** el usuario crea un tablero desde el ejemplo de K-pop, cambia una pregunta y luego vuelve a crear el mismo ejemplo
- **THEN** el tablero nuevo tiene la pregunta original del ejemplo y el tablero editado conserva su cambio

#### Scenario: Volver a crear un ejemplo eliminado
- **WHEN** el usuario elimina el tablero que creó desde un ejemplo y luego vuelve a crear ese ejemplo
- **THEN** aparece en la lista un tablero nuevo con el contenido del ejemplo

#### Scenario: Sin tableros de ejemplo automáticos
- **WHEN** el usuario abre la aplicación por primera vez, sin tableros guardados
- **THEN** la lista está vacía y el mensaje invita a crear un tablero nuevo o desde un ejemplo

#### Scenario: Respaldo de la copia en escritorio
- **WHEN** en la app de escritorio el usuario crea un tablero desde un ejemplo
- **THEN** la carpeta de respaldos contiene el archivo de ese tablero

#### Scenario: Exportar e importar un ejemplo
- **WHEN** el usuario exporta un tablero creado desde un ejemplo y luego importa el archivo resultante
- **THEN** aparece un tablero nuevo con el mismo contenido, Daily Double y pista final del ejemplo
