> Cada tarea es un commit en la rama `change/tableros-ejemplo`, creada desde `main`. Antes de commitear deben pasar `npm run lint`, `npm run typecheck` y `npm test`. Si la tarea toca la UI web, también `npm run test:e2e`. Después se hace push y se verifica que el CI quede en verde. Ninguna tarea se marca completa si alguno de esos pasos falla.

## 1. Dominio

- [x] 1.1 Crear `src/domain/samples/index.ts` con el tipo `SampleBoard`, `SAMPLE_BOARDS` y `createBoardFromSample(sample, id, now)`, y un primer ejemplo, `videogames.ts` (6 categorías de 5 preguntas, un Daily Double en una fila de 300 a 500 y pista final completa). Verificar con `src/domain/samples/samples.test.ts`, escrito para recorrer todos los `SAMPLE_BOARDS`:
  - `validateBoard(board).ready` es `true` e `isFinalComplete(board.final)` también.
  - Hay 6 categorías con valores 100 a 500 y exactamente un Daily Double, en una fila de 300 a 500.
  - El título, la descripción y la clave no están vacíos, y las claves son únicas.
  - El tablero usa el `id` y el `now` recibidos, con `schemaVersion: BOARD_SCHEMA_VERSION`.
  - Dos llamadas dan tableros independientes: mutar uno no cambia el otro ni `SAMPLE_BOARDS`.
  - La ida y vuelta `exportBoard` → `importBoard` conserva el contenido, el Daily Double y la pista final.
- [x] 1.2 Agregar `agriculture.ts` (Agricultura) a `SAMPLE_BOARDS`, con hechos estables y verificables (design, decisión 5) y el Daily Double en otra categoría que la de videojuegos. Verificar con los mismos tests de 1.1, que ahora cubren dos ejemplos.
- [x] 1.3 Agregar `kpop.ts` (Música: K-pop) a `SAMPLE_BOARDS`, sin información privada de los artistas y sin datos que cambien con el tiempo. Verificar con los tests de 1.1 y con un test de que `SAMPLE_BOARDS` tiene exactamente los tres ejemplos, en el orden agricultura, videojuegos, K-pop.

## 2. Interfaz

- [x] 2.1 Crear `src/ui/boards/SampleDialog.tsx` (con el patrón de `ConfirmDialog`) y, en `BoardListScreen`, el botón **Crear desde ejemplo**. Elegir un ejemplo lo guarda con `saveBoard`, lo respalda con `boardBackup.backupNow`, lo pone primero en la lista y muestra `Se creó "<título>" desde el ejemplo.`. El mensaje de lista vacía pasa a "Todavía no hay tableros. Crea uno nuevo o parte desde un ejemplo.". Verificar con tests en `BoardListScreen.test.tsx`:
  - El botón abre el diálogo con los tres títulos y sus descripciones.
  - Elegir uno lo deja en `listBoards()` y primero en la lista, con el aviso.
  - Crear dos veces el mismo ejemplo da dos tableros distintos, y los existentes no cambian.
  - Escape y "Cancelar" cierran sin crear.
  - Con la lista vacía no se crea nada solo, y el mensaje menciona los ejemplos.
  - Si `saveBoard` falla, se muestra "No se pudo crear el tablero." y la lista no cambia.
  - Con `installDesktop`, crear un ejemplo llama a `backup.writeBoard`.
- [x] 2.2 Agregar a `e2e/boards.spec.ts` un e2e: crear el ejemplo de videojuegos, abrirlo y ver en el panel de Jugar que está listo y con la pista final completa. Luego eliminarlo y volver a crearlo. Verificar con `npm run test:e2e`.

## 3. Documentación

- [ ] 3.1 En el README, en "Cómo se usa", mencionar **Crear desde ejemplo** y los tres ejemplos. Listar en la descripción del PR las categorías de cada ejemplo para que el usuario revise el contenido. Verificar con `npm run lint` (Prettier) y con el CI en verde en el PR.
