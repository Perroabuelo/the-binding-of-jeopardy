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

### Daily Double

En el editor, abre una celda y marca **Daily Double**. Puedes marcar las que quieras, desde ninguna
hasta todas. El editor y el tablero del operador las señalan con **DD**, pero la TV nunca revela
dónde están.

Al abrir un Daily Double, la TV anuncia **DAILY DOUBLE!** con la categoría y el valor, sin mostrar
la pregunta. El operador ve la pregunta y la respuesta, elige qué equipo responde y registra su
apuesta. Con eso la TV muestra la pregunta junto al equipo y su apuesta, y la celda sigue como
cualquier otra. Solo ese equipo puede sumar o restar puntos, y lo que suma o resta es la apuesta.

La apuesta es un número entero de 0 hasta el puntaje del equipo o el valor más alto del tablero, lo
que sea mayor. Así, un equipo en 0 o en negativo también puede apostar hasta 500. Una vez
registrada, la apuesta no se cambia: si hubo un error, corrige el puntaje a mano.

### Final Jeopardy!

Debajo del tablero, en el editor, está la sección **Pista final**: una categoría, una pregunta y una
respuesta, cada una de las dos últimas con su imagen opcional. Es opcional y no impide jugar; el
panel de **Jugar** indica si está completa, incompleta o si el tablero no tiene pista final.

Si la pista final está completa, al configurar los equipos aparece marcada la opción **Jugar Final
Jeopardy!**. Con ella activa, al usar todas las celdas (o al terminar antes el juego) se pasa al
Final en lugar del podio:

1. **Apuestas.** Juegan solo los equipos con puntaje mayor que 0. La TV muestra la categoría y
   quiénes juegan; el operador anota en secreto la apuesta de cada equipo, de 0 a su puntaje. Se
   puede cambiar hasta mostrar la pista.
2. **Pista.** Con todas las apuestas anotadas, **Mostrar pista** la lleva a la TV. **Iniciar
   temporizador** arranca una cuenta regresiva de 30 segundos con música en la vista de operador
   (si el operador está conectado a la TV por HDMI, suena en la TV). La música se puede silenciar,
   y el temporizador reiniciar.
3. **Revelación.** Los equipos se revelan de a uno, del menor al mayor puntaje con que entraron.
   Para el equipo en turno marca **Acertó** (suma su apuesta) o **Falló** (la resta). **Mostrar
   respuesta en la TV** revela la respuesta cuando quieras.
4. **Ir al podio** termina el juego. Si nadie tenía puntaje positivo, el Final se salta y el podio
   lo avisa.

Si recargas el operador durante el Final, sigue en el mismo punto, con las apuestas, los equipos ya
juzgados y el tiempo restante; la música vuelve a sonar solo si reinicias el temporizador.

### Rondas

Al configurar los equipos, marca **Jugar con rondas** para armar una partida de 2 a 5 rondas, como
Jeopardy! y Double Jeopardy!. Cada ronda usa uno de tus tableros listos para jugar, distinto de los
de las demás rondas, y tiene su propio **multiplicador**, un número entero de 1 a 10. La ronda 1
parte con el tablero desde el que entraste, y cada ronda nueva propone como multiplicador su número
(x1, x2, x3…), que puedes cambiar. Sin marcar la opción, el juego es de una sola ronda y los valores
no se multiplican.

En cada ronda, las celdas valen su valor en el tablero por el multiplicador: en una ronda x2, la
celda de 300 vale 600. El operador y la TV muestran el valor multiplicado, y eso es lo que se suma o
resta. En un Daily Double, el tope de la apuesta usa el valor más alto de la ronda, ya multiplicado.
Los tableros no cambian: el multiplicador es de la partida. El operador y la TV muestran en qué
ronda va el juego y su multiplicador.

Al usar todas las celdas de una ronda que no es la última, la TV muestra una pantalla de transición
con la ronda siguiente, su multiplicador, el título de su tablero y los puntajes, que se mantienen
de una ronda a otra. El operador empieza la ronda con **Comenzar ronda N** cuando quiera. Al terminar
la última ronda se sigue como siempre: al Final, si está activo, o al podio. La pista final sale del
tablero de la última ronda, así que la opción **Jugar Final Jeopardy!** depende de ese tablero.

Para terminar antes hay dos opciones, y ambas piden confirmación:

- **Terminar ronda** deja las celdas que quedan y pasa a la transición hacia la ronda siguiente.
  Solo aparece si queda al menos una ronda después.
- **Terminar juego** termina la partida desde cualquier ronda, aunque queden rondas por jugar: lleva
  al Final, si está activo y hay equipos con puntaje positivo, o al podio.

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

## Créditos

La música del temporizador del Final es "Four Loop", de pauliuw (Paulius Jurgelevičius), publicada
en [OpenGameArt](https://opengameart.org/content/music-loops) con licencia
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). El detalle de los cambios está en
[`public/audio/CREDITS.md`](public/audio/CREDITS.md).

## Agradecimientos

La idea de jugar con dos pantallas, una para quien conduce y otra para la TV, salió del repositorio
[pfroud/jeopardy](https://github.com/pfroud/jeopardy). ¡Gracias!
