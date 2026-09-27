## ADDED Requirements

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
