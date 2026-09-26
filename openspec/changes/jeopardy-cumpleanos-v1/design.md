## Context

Repositorio sin código: solo contiene la configuración de OpenSpec. Ver `proposal.md` (Why) para la motivación y `specs/` para los requisitos. Las restricciones que dan forma al diseño son:

- **Sin backend**: todo corre en el navegador y se sirve como sitio estático desde GitHub Pages, bajo la ruta `/the-binding-of-jeopardy/`.
- **Dos ventanas del mismo navegador** en el mismo computador: operador en la laptop y presentación arrastrada a la TV.
- **Objetivo Chromium** (Chrome o Edge).
- **Iteración rápida**: cada parte debe poder probarse y mostrarse por separado.

## Goals / Non-Goals

**Goals:**
- Núcleo del juego como TypeScript puro, sin React ni APIs del navegador, probado exhaustivamente con tests unitarios y reutilizable por un futuro backend en el homeserver.
- Una sola fuente de verdad durante el juego (el operador) y una presentación que solo proyecta.
- Estilos 100% basados en tokens CSS, para que la estética definitiva sea un cambio aislado.
- Pipeline que bloquee el deploy ante cualquier falla.

**Non-Goals:**
- Redimensionar o comprimir imágenes: se guardan tal como se suben, con tope de 5 MB.
- Sincronización entre dispositivos distintos.
- Soporte de Firefox o Safari.
- Internacionalización: la UI está solo en español.

## Decisions

### 1. Capas y dependencias

```
  src/
    domain/     <- TS puro: modelo, validacion, maquina de estados, puntajes, podio,
                   proyeccion para TV, formato de export. Sin imports de React ni DOM.
    storage/    <- repositorio IndexedDB (tableros, imagenes, sesiones)
    sync/       <- canal entre ventanas (protocolo + transporte)
    ui/         <- React: pantallas, componentes, tema
      theme/    <- tokens CSS
```

Regla: `domain` no importa nada de las otras capas. `ui` usa `domain`, `storage` y `sync`. La regla se hace cumplir con una restricción de imports en ESLint (`no-restricted-imports` sobre `src/domain/**`).

*Alternativa descartada:* lógica dentro de componentes o hooks de React. Es más rápido al inicio, pero difícil de probar y no se reutiliza en un backend.

### 2. Stack

- **Vite + React 19 + TypeScript** en modo estricto.
- **Node 22 LTS**, fijado en `.nvmrc`.
- **npm** como gestor de paquetes.

*Alternativa:* JavaScript sin framework. Es más liviano, pero con tres vistas y estado compartido React simplifica y Testing Library encaja directo.

### 3. Ruteo con hash

Rutas:

| Ruta | Pantalla |
|---|---|
| `#/` | lista de tableros |
| `#/boards/:boardId` | editor |
| `#/play/:sessionId` | operador |
| `#/tv/:sessionId` | presentación |

GitHub Pages no tiene reescritura a `index.html`, así que con rutas por historial una recarga en `/boards/x` daría 404. El hash evita el problema y además funciona con el service worker sin configuración extra. Se implementa con un router mínimo propio (hook sobre `hashchange`) o con `wouter` en modo hash; no se necesita nada más.

*Alternativa:* truco de `404.html`. Es frágil y complica la PWA.

### 4. Modelo de datos

```ts
Board   { id, schemaVersion: 1, title, categories: Category[5], createdAt, updatedAt }
Category{ name, clues: Clue[5] }
Clue    { value: 100|200|300|400|500, question, answer, imageId?: string }

GameSession {
  id, boardSnapshot: Board, teams: { id, name, score }[],
  usedClues: string[],          // "c{cat}-r{row}"
  phase: { kind: 'board' }
       | { kind: 'clue', clueKey, revealed: boolean }
       | { kind: 'finished' },
  updatedAt
}
```

- Al iniciar el juego se copia el tablero en `boardSnapshot`, para que editarlo durante el juego no lo afecte.
- Las imágenes se guardan como `Blob` en un almacén aparte, referenciadas por `imageId`, para no reescribir megabytes en cada tecla que se edita en el tablero.
- Al eliminar un tablero se borran sus imágenes, salvo las que siga usando una sesión.

### 5. Almacenamiento: IndexedDB con `idb`

Base `jeopardy` con los almacenes `boards`, `images` y `sessions`. El repositorio expone funciones asíncronas (`listBoards`, `getBoard`, `saveBoard`, `deleteBoard`, `putImage`, `getImage`, `saveSession`, `getSession`) y convierte los errores de cuota o de no disponibilidad en un error de dominio `StorageUnavailable`, que la UI muestra como aviso.

El guardado automático del editor usa debounce de 300 ms para los textos; las imágenes se guardan de inmediato.

*Alternativa:* localStorage. Su límite de ~5 MB se llena con pocas imágenes y solo guarda strings.

### 6. Formato de exportación

Archivo `<titulo>.jeopardy.json`:

```json
{ "format": "the-binding-of-jeopardy", "schemaVersion": 1,
  "board": { ... },
  "images": { "<imageId>": "data:image/png;base64,..." } }
```

- Al importar, se valida la estructura con **zod** (formato, versión, 5x5, valores, data URLs de tipos permitidos).
- Se generan **ids nuevos** para el tablero y las imágenes, de modo que importar nunca sobrescribe.
- Todo el trabajo se hace en memoria antes de escribir. Si algo falla no se escribe nada, lo que evita importaciones a medias.

*Alternativa:* ZIP con imágenes aparte. Es más compacto, pero agrega dependencia y complejidad. Un JSON con base64 pesa ~33% más, lo que es aceptable para 25 imágenes.

### 7. Máquina de estados del juego

Es un reducer puro `gameReducer(session, action) -> session`. Acciones:

- `openClue`
- `reveal`
- `award(teamId, +1|-1)`
- `setScore(teamId, n)`
- `backToBoard`
- `finish`

```
             openClue (celda no usada)
  [board] --------------------------> [clue revealed=false]
     ^                                     |  reveal
     |                                     v
     |  backToBoard (marca usada)     [clue revealed=true]
     +-------------------------------------+
     |
     | (backToBoard con 25 usadas) o finish
     v
  [finished]  -> podio
```

- Una acción inválida para la fase actual devuelve la **misma referencia** de estado, sin excepciones. Eso lo hace fácil de probar y evita renders innecesarios.
- `award` y `setScore` son válidas en fase `clue`; `setScore` es válida en cualquier fase salvo `finished`.
- El podio se calcula con `rankTeams(teams)`, que aplica ranking de competencia estándar (1, 1, 3).

### 8. Sincronización entre ventanas: `BroadcastChannel`

Canal `jeopardy:<sessionId>`. El operador es la única fuente de verdad.

```
  OPERADOR                                   TV
  gameReducer -> session                     
     |                                       
     +-> saveSession (IndexedDB)             
     +-> projectForTv(session) --- state --> render (solo lectura)
                                  <-- hello   (al cargar/recargar la TV)
     responde con state         --- state -->
     cada 2 s                   --- ping  --> si no llega nada en 10 s o llega bye:
     pagehide                   --- bye   -->   pantalla de espera
```

- **`projectForTv`** es una función de `domain` que produce la vista de la TV. **Nunca incluye `answer` salvo que `revealed` sea verdadero**, y tampoco incluye las respuestas de las demás celdas. Así la respuesta no puede terminar en el DOM de la TV aunque haya un bug en la UI. Esta función tiene tests dedicados.
- La TV carga las imágenes por `imageId` directamente desde IndexedDB, porque es el mismo origen. Así no viajan blobs por el canal.
- El transporte se abstrae detrás de una interfaz `SyncTransport { send, subscribe, close }`. Los tests usan una implementación en memoria; en el futuro se podrá cambiar por WebSocket al homeserver.
- La TV se abre con `window.open(url, 'jeopardy-tv')`. El nombre fijo reutiliza la misma ventana si se presiona de nuevo. Si `window.open` devuelve `null`, se muestra el aviso de ventanas emergentes.

*Alternativas:* eventos `storage` de localStorage (hacks de serialización, sin blobs) y `postMessage` vía `window.opener` (se pierde si la TV se recarga o se abre por separado). `BroadcastChannel` sobrevive a ambas recargas.

### 9. Tema

- `src/ui/theme/tokens.css` define custom properties en `:root`: colores de tablero, celda, celda usada, texto, acento, tipografías y radios.
- Los componentes usan CSS Modules y **solo** `var(--token)`. No hay colores literales fuera de `tokens.css`, lo que se verifica con stylelint o con un test simple por grep.
- Tipografía y celdas de la TV escalan con `clamp()` y unidades de viewport, para leerse de lejos.
- El tema v1 es neutro (azul oscuro con texto claro y alto contraste).

### 10. PWA con `vite-plugin-pwa`

- Estrategia `generateSW`, que precachea todo el build.
- `base` y `scope` en `/the-binding-of-jeopardy/`.
- `registerType: 'prompt'` **sin** `skipWaiting` automático: la versión nueva se activa cuando se cierran todas las pestañas y la app se vuelve a abrir. Así nunca se recarga en medio de un juego, y los datos quedan intactos porque viven en IndexedDB, fuera del caché.
- La base del sitio se define en una sola constante, compartida por Vite, la PWA y Playwright, para facilitar la migración futura al homeserver, que usa la raíz `/`.

### 11. Estrategia de pruebas

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | Vitest (entorno node) | `domain/*`: validación, reducer (todas las transiciones válidas e inválidas), `rankTeams`, `projectForTv` (sin respuesta antes de revelar), export/import (ida y vuelta, archivos inválidos) |
| Repositorio | Vitest + `fake-indexeddb` | CRUD de tableros, imágenes y sesiones, borrado en cascada, mapeo de errores |
| Sync | Vitest + transporte en memoria | protocolo `hello/state/ping/bye`, timeout a pantalla de espera (con timers falsos) |
| Componentes | Vitest (jsdom) + Testing Library | editor (editar, validar, adjuntar y rechazar imagen), lista de tableros, operador (flujo de una pregunta), TV (render por fase) |
| E2E | Playwright, Chromium, contra `vite preview` del build con la base real | crear tablero, jugarlo con dos ventanas (evento `popup`), recarga de TV y de operador, exportar e importar (descarga y `setInputFiles`), offline (`context.setOffline` tras activar el SW) |

- Los selectores usan roles y etiquetas accesibles (`getByRole`, `getByLabel`) y no clases CSS, para que el cambio de estética no rompa los tests.
- Un fixture de tablero completo (`tests/fixtures/board.ts`) se reutiliza en todas las capas. **Es contenido ficticio, nunca un tablero real.**
- Los tests e2e que no prueban offline desactivan el service worker (`serviceWorkers: 'block'`), para evitar cachés entre tests.

### 12. CI/CD con GitHub Actions

Un workflow `ci.yml` que corre en `push` a cualquier rama y en `pull_request` a `main`:

```
  job checks:  npm ci -> lint (eslint + prettier --check) -> typecheck (tsc -b)
               -> test:unit (vitest run) -> build
  job e2e:     needs checks; npm ci -> playwright install --with-deps chromium
               -> build -> test:e2e; sube playwright-report si falla
  job deploy:  needs [checks, e2e]; if: push a main
               -> upload-pages-artifact(dist) -> deploy-pages
```

- Concurrencia por rama, cancelando las ejecuciones anteriores.
- Caché de npm con `actions/setup-node`.
- En el repo: Pages con fuente "GitHub Actions" y protección de `main` que exija los checks `checks` y `e2e` antes de fusionar un PR.

*Alternativa:* dos workflows separados (CI y deploy). Un solo workflow con `needs` garantiza que el deploy use exactamente el mismo commit ya verificado.

## Risks / Trade-offs

- [El navegador bloquea la ventana de TV] → aviso explícito con instrucciones, y la TV también se puede abrir pegando la URL `#/tv/:sessionId`, que la vista de operador muestra para copiar.
- [Chrome limita los timers en ventanas en segundo plano y el ping se atrasa] → timeout generoso de 10 s; además cada cambio de estado ya funciona como latido. En el uso real ambas ventanas están visibles.
- [Se llena la cuota de IndexedDB con imágenes] → tope de 5 MB por imagen, aviso `StorageUnavailable` y la exportación como respaldo. Chrome da cuotas de varios GB, así que el riesgo es bajo.
- [Filtrar la respuesta a la TV por un bug de UI] → la TV nunca recibe la respuesta antes de revelarla (proyección en `domain`), más un test unitario y un e2e que revisa el DOM.
- [Service worker sirve una versión vieja o rompe los tests] → `registerType: 'prompt'`, SW bloqueado en los e2e normales y un e2e dedicado a offline.
- [Ruta base incorrecta en Pages rompe el primer deploy] → los e2e corren contra `vite preview` con la misma base que producción.
- [Tableros armados en otro computador] → exportar e importar. Es una limitación asumida de no tener backend.
- [JSON con base64 grande (~30 MB con 25 imágenes de 1 MB)] → aceptable. Se documenta en la UI que se recomiendan imágenes livianas.

## Migration Plan

1. Configurar en GitHub: Pages con fuente "GitHub Actions" y protección de `main` que exija `checks` y `e2e`. Es manual y se hace una sola vez.
2. Trabajar en la rama `change/jeopardy-cumpleanos-v1`, que el CI verifica en cada push.
3. Abrir un PR a `main`. Al fusionarse con CI en verde, se despliega en `https://perroabuelo.github.io/the-binding-of-jeopardy/`.
4. **Rollback**: revertir el commit en `main`, lo que vuelve a desplegar la versión anterior. Los datos de los usuarios no se ven afectados porque viven en su navegador. `schemaVersion` permite migraciones futuras de los datos guardados.

## Open Questions

- Estética definitiva (¿Binding of Isaac o programa de TV?): se define en un cambio posterior y solo afecta a `tokens.css` y los assets.
- Límite de 8 equipos: se puede ajustar sin cambiar el diseño si en la fiesta se necesitan más.
