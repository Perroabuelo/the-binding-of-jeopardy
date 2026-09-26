# The Binding of Jeopardy

Juego estilo Jeopardy para jugar en casa con dos pantallas: una vista de operador para quien conduce
y una vista de presentación para la TV. Los tableros (preguntas, respuestas e imágenes) se guardan
solo en el navegador de quien los crea.

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
