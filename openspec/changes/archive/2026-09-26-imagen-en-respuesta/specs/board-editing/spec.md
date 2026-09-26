## ADDED Requirements

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
