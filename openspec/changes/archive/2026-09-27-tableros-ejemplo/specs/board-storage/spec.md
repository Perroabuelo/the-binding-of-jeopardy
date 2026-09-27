## ADDED Requirements

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
