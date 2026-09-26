## ADDED Requirements

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
