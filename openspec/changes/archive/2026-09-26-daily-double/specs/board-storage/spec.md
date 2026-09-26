## ADDED Requirements

### Requirement: Conservar los Daily Double al exportar e importar
Exportar un tablero SHALL incluir qué celdas son Daily Double, e importar ese archivo MUST crear un tablero con las mismas celdas marcadas. Los archivos exportados antes de que existieran los Daily Double MUST seguir importándose, con todas sus celdas sin marcar.

#### Scenario: Ida y vuelta con Daily Double
- **WHEN** el usuario exporta un tablero con las celdas de 300 de la primera categoría y de 500 de la cuarta marcadas como Daily Double, y luego importa el archivo resultante
- **THEN** el tablero nuevo tiene marcadas como Daily Double exactamente esas dos celdas

#### Scenario: Archivo anterior a los Daily Double
- **WHEN** el usuario importa un archivo exportado con una versión anterior de la aplicación
- **THEN** aparece un tablero nuevo equivalente al original, sin ninguna celda marcada como Daily Double
