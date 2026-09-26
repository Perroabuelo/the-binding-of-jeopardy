## ADDED Requirements

### Requirement: Pista final opcional del tablero
El sistema SHALL permitir editar en el editor una pista final opcional del tablero, con categoría, pregunta y respuesta, además de una imagen opcional para la pregunta y otra para la respuesta. Las imágenes MUST cumplir las mismas reglas de formato y tamaño que las imágenes de las celdas, y se MUST poder quitar después. La pista final está completa cuando su categoría, su pregunta y su respuesta no están vacías. El editor MUST indicar si la pista final está completa, incompleta o ausente. Una pista final ausente o incompleta MUST NOT afectar la validación de tablero listo para jugar. Los tableros creados antes de este cambio MUST quedar sin pista final. Los cambios en la pista final MUST guardarse automáticamente, como el resto del editor.

#### Scenario: Completar la pista final
- **WHEN** el usuario escribe la categoría "Cumpleañero", una pregunta y una respuesta en la pista final y recarga la página
- **THEN** el editor muestra la pista final con esos textos e indica que está completa

#### Scenario: Pista final incompleta
- **WHEN** en un tablero listo para jugar el usuario escribe solo la categoría de la pista final
- **THEN** el editor indica que la pista final está incompleta y la acción de jugar sigue habilitada

#### Scenario: Imagen en la pista final
- **WHEN** el usuario adjunta un archivo PNG de 1 MB a la pregunta de la pista final
- **THEN** el editor muestra la vista previa de esa imagen en la pista final

#### Scenario: Rechazar un archivo no soportado en la pista final
- **WHEN** el usuario intenta adjuntar a la pista final un archivo PDF o una imagen de 8 MB
- **THEN** el sistema muestra un mensaje de error indicando el formato o tamaño permitido y la pista final conserva su estado anterior

#### Scenario: Tablero antiguo sin pista final
- **WHEN** el usuario abre un tablero guardado antes de este cambio
- **THEN** el editor indica que el tablero no tiene pista final y la acción de jugar no cambia
