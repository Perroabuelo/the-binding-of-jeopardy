## ADDED Requirements

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
