# The Binding of Jeopardy

Juego estilo Jeopardy para jugar en casa con dos pantallas: una vista de operador para quien conduce
y una vista de presentación para la TV. Los tableros (preguntas, respuestas e imágenes) se guardan
solo en el navegador de quien los crea.

## Cómo se usa

1. Abre la app en Chrome o Edge y crea un tablero con **Nuevo tablero**.
2. Completa el título, las categorías y sus preguntas con su respuesta. Un tablero nuevo trae 6
   categorías de 5 preguntas (100 a 500); puedes dejarlo entre 3 y 8 con **Agregar categoría** y
   **Quitar**, y reordenarlas con las flechas. Cada pregunta y cada respuesta puede tener su propia
   imagen (PNG, JPEG, GIF o WebP de hasta 5 MB). Todo se guarda solo.
3. Cuando el tablero está completo, **Jugar** te lleva a configurar los equipos (de 1 a 8).
4. En la vista de operador, **Abrir pantalla de TV** abre la ventana para los invitados: arrástrala
   a la TV y ponla en pantalla completa (F11). Si el navegador bloquea la ventana, permite las
   ventanas emergentes para el sitio o abre la dirección que muestra el operador.
5. El operador ve la respuesta (y su imagen) antes que nadie, la revela cuando quiere y suma o
   resta puntos. Al revelar, la imagen de la respuesta reemplaza en la TV a la de la pregunta. Si
   recargas cualquiera de las dos ventanas, el juego sigue donde estaba.

Los tableros viven solo en el navegador donde se crearon. Para llevarlos a otro computador o
respaldarlos, usa **Exportar** e **Importar tablero** en la lista. Después de abrir la app una vez
con conexión, funciona sin internet.

## Desarrollo

Requiere Node 22 (ver `.nvmrc`).

```bash
npm ci
npm run dev          # servidor de desarrollo
npm run lint         # ESLint + Prettier
npm run typecheck    # TypeScript
npm test             # Vitest (unitarias y componentes)
npm run test:e2e     # Playwright (Chromium); la primera vez: npx playwright install chromium
npm run build        # build de producción en dist/
```

## Flujo de trabajo

- Cada cambio de OpenSpec vive en su rama `change/<nombre-del-cambio>`, creada desde `main`.
- Un commit por tarea, con lint, typecheck y tests pasando.
- Se integra a `main` solo mediante PR con el CI en verde.
- Cada propuesta declara sus notas de versión. Al archivar el cambio pasan a
  [`CHANGELOG.md`](CHANGELOG.md), se sube la versión en `package.json` y se crea el tag `vX.Y.Z`
  sobre el merge a `main`.

## CI y deploy

`.github/workflows/ci.yml` corre en cada push y en cada PR a `main`:

1. `checks`: lint, typecheck, tests unitarios y build.
2. `e2e`: Playwright en Chromium contra el build servido bajo la ruta base real.
3. `deploy`: solo en push a `main` y si los anteriores pasan; publica `dist/` en GitHub Pages.

### Configuración manual en GitHub (una vez)

1. **Settings → Pages → Source: "GitHub Actions"**. No uses las plantillas sugeridas (Jekyll o
   Static HTML): el deploy lo hace el workflow del repo.
2. **Settings → Branches → regla para `main`**: exigir PR y los checks `checks` y `e2e` antes de
   fusionar. Los checks aparecen en la lista después de la primera ejecución del CI.

La app queda publicada en `https://perroabuelo.github.io/the-binding-of-jeopardy/`.

## Privacidad

El repositorio es público. Nunca commitees tableros reales ni sus exportaciones (`*.jeopardy.json`):
los fixtures de pruebas usan solo contenido ficticio.

## Agradecimientos

La idea de jugar con dos pantallas, una para quien conduce y otra para la TV, salió del repositorio
[pfroud/jeopardy](https://github.com/pfroud/jeopardy). ¡Gracias!
