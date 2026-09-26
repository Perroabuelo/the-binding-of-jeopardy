## MODIFIED Requirements

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
