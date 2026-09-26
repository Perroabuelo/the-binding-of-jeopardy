## MODIFIED Requirements

### Requirement: No exponer la respuesta antes de revelarla
Mientras la respuesta de la pregunta abierta no haya sido revelada, la vista de presentación MUST NOT contener el texto de la respuesta ni su imagen, ni siquiera ocultos. Una vez revelada, SHALL mostrar el texto de la respuesta junto a la pregunta. Si la respuesta tiene imagen, al revelarla esa imagen SHALL reemplazar a la imagen de la pregunta. Si la respuesta no tiene imagen, la presentación SHALL mantener la imagen de la pregunta.

#### Scenario: Antes de revelar
- **WHEN** hay una pregunta abierta sin revelar
- **THEN** el contenido de la ventana de presentación no incluye el texto de la respuesta

#### Scenario: Imagen de respuesta antes de revelar
- **WHEN** hay una pregunta abierta sin revelar cuya respuesta tiene imagen
- **THEN** la ventana de presentación no muestra ni recibe la imagen de la respuesta, y muestra la imagen de la pregunta si existe

#### Scenario: Después de revelar
- **WHEN** el operador revela la respuesta
- **THEN** en menos de 1 segundo la presentación muestra la respuesta

#### Scenario: Revelar una respuesta con imagen
- **WHEN** el operador revela una respuesta con imagen en una pregunta que también tiene imagen
- **THEN** en menos de 1 segundo la presentación muestra la imagen de la respuesta en lugar de la imagen de la pregunta

#### Scenario: Revelar una respuesta sin imagen
- **WHEN** el operador revela una respuesta sin imagen en una pregunta que tiene imagen
- **THEN** la presentación sigue mostrando la imagen de la pregunta junto a la respuesta
