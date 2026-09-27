## Why

Hoy la app parte vacía: para probarla, mostrarla o jugar una partida rápida hay que escribir 30 preguntas con sus respuestas. Tres tableros de ejemplo listos para jugar permiten probar todo de inmediato, incluidos el Daily Double, el Final y las rondas. Además sirven de base para las capturas del README, que se harán en un cambio aparte, sin inventar contenido.

**Rama del cambio:** `change/tableros-ejemplo`, creada desde `main`. Se integra por PR con el CI en verde.

## What Changes

- **Botón "Crear desde ejemplo"** en la lista de tableros, junto a "Nuevo tablero" e "Importar tablero", en la web y en el escritorio. Abre un diálogo con los tres ejemplos, cada uno con su título y una descripción corta.
- **Tres tableros de ejemplo**, con contenido de conocimiento público:
  - **Agricultura**: cultivos, frutales, suelos y riego, maquinaria, plagas y enfermedades, historia de la agricultura.
  - **Videojuegos**: consolas, personajes, sagas clásicas, indies, Nintendo, The Binding of Isaac.
  - **Música: K-pop**: grupos, canciones, solistas, debuts, fandoms, cultura coreana.
- **Listos para jugar.** Cada ejemplo tiene 6 categorías completas de 5 preguntas (100 a 500), un Daily Double y una pista final completa. Por eso cualquiera de los tres puede jugarse solo o como ronda de una partida con rondas.
- **Copia editable.** Elegir un ejemplo crea un tablero nuevo, independiente, que aparece primero en la lista y se edita, exporta y elimina como cualquier otro. Crear el mismo ejemplo dos veces da dos tableros distintos. Editar o eliminar la copia no afecta al ejemplo, que se puede volver a crear cuando se quiera.
- **No se crean solos.** La app no agrega tableros por su cuenta: con la lista vacía, el mensaje invita a crear uno nuevo o desde un ejemplo.
- **Respaldo en escritorio.** Como cualquier tablero nuevo, la copia se respalda en disco apenas se crea.

## Notas de versión

**v1.2.0** (minor).

- Nuevo botón **Crear desde ejemplo** en la lista de tableros: trae tres tableros listos para jugar, de agricultura, videojuegos y K-pop.
- Cada ejemplo incluye un Daily Double y una pista final, y se puede editar como cualquier tablero.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `board-storage`: se agrega el requisito "Crear un tablero desde un ejemplo", con los tres ejemplos listos para jugar, la copia independiente y la ausencia de creación automática.

## Fuera de alcance

- Imágenes en los ejemplos. Solo traen texto, lo que además evita problemas de derechos con logos y fotos de artistas.
- Crear los ejemplos solos al abrir la app por primera vez.
- Actualizar las copias ya creadas cuando cambie el contenido de un ejemplo en una versión nueva.
- Ejemplos en otros idiomas, o creados por los usuarios como plantillas propias.
- Las capturas del README. Se harán en un cambio sin spec, en la rama `docs/readme-capturas`, usando estos ejemplos.

## Impact

- **Dominio (`src/domain/`):** módulo puro con los tres ejemplos como datos y una función que crea una copia con id y fechas nuevas. Sin cambios en el modelo `Board` ni en el formato de intercambio.
- **UI:** `BoardListScreen` agrega el botón y el diálogo de elección, y el mensaje de lista vacía menciona los ejemplos.
- **Almacenamiento y respaldo:** se reutilizan `saveBoard` y `boardBackup.backupNow`, igual que "Nuevo tablero".
- **Pruebas y CI:** unitarias de los ejemplos (completos, con Daily Double y Final, ida y vuelta por exportación), de componente para la lista y un e2e web. Sin jobs nuevos.
- **Datos:** sin migración.
- **Tamaño:** unos pocos KB de texto en el bundle.
