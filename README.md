# The Binding of Jeopardy

Juego estilo Jeopardy para jugar en casa con dos pantallas: una vista de operador para quien conduce
y una vista de presentación para la TV. Los tableros (preguntas, respuestas e imágenes) se guardan
solo en el navegador de quien los crea.

## Modalidades

La misma app se usa de dos formas:

- **Web**: se abre en el navegador desde
  [GitHub Pages](https://perroabuelo.github.io/the-binding-of-jeopardy/) y funciona sin conexión
  después de la primera visita. No conecta celulares.
- **Escritorio (Windows)**: una app que se instala desde
  [GitHub Releases](https://github.com/Perroabuelo/the-binding-of-jeopardy/releases). Funciona sin
  internet desde la primera vez, abre la TV sola en el segundo monitor a pantalla completa,
  conecta celulares por la red wifi escaneando un QR para usarlos como pulsadores y respalda los
  tableros en disco.

Los tableros de la web y los del escritorio están separados (ver
[Traer tableros de la web](#traer-tableros-de-la-web)).

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

### Tableros de ejemplo

Para probar la app sin escribir preguntas, usa **Crear desde ejemplo** en la lista de tableros y
elige uno de los tres ejemplos: **Agricultura**, **Videojuegos** o **Música: K-pop**. Cada uno trae
6 categorías completas, un Daily Double y la pista final, así que está listo para jugar, también
como ronda de una partida con rondas. Se crea una copia que puedes editar, exportar o eliminar como
cualquier tablero. Si la eliminas, puedes volver a crearla cuando quieras.

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

## App de escritorio (Windows)

### Instalación

1. Descarga el instalador `The-Binding-of-Jeopardy-Setup-X.Y.Z.exe` de la última versión en
   [GitHub Releases](https://github.com/Perroabuelo/the-binding-of-jeopardy/releases).
2. Ábrelo. Se instala para tu usuario, sin pedir permisos de administrador, y deja un acceso
   directo en el escritorio y en el menú Inicio.
3. Como el instalador no está firmado, Windows puede mostrar **"Windows protegió tu PC"**. Elige
   **Más información** → **Ejecutar de todas formas**.

Para actualizar, instala la versión nueva encima de la anterior: los tableros, sus imágenes y los
respaldos se conservan. Si la app ya está abierta, abrirla de nuevo solo trae su ventana al frente.

### Pantalla de TV

**Abrir pantalla de TV** abre la TV en el otro monitor a pantalla completa. Con un solo monitor se
abre como una ventana normal: arrástrala a la TV y usa F11 para la pantalla completa. Al cerrar la
ventana del operador se cierran la TV y la app.

### Conectar celulares

En la vista de operador, **Conectar dispositivos** muestra una dirección y un código QR. Los
celulares que estén en la **misma red wifi** lo escanean con la cámara y aparecen en la lista de
dispositivos conectados. No se necesita internet. En un juego con pulsadores, la lista muestra
el equipo de cada celular o **Sin equipo**.

Si ningún celular logra conectarse:

- **Firewall de Windows**: la primera vez que se abre la app, Windows pregunta si permite que use
  la red. Acepta al menos para redes privadas. Si elegiste "Cancelar", abre "Permitir una
  aplicación a través del Firewall de Windows" y marca The Binding of Jeopardy en redes privadas.
- **Red Pública**: si Windows tiene la red marcada como Pública, el firewall bloquea a los
  celulares y la app lo avisa. Cámbiala en Configuración → Red e Internet → Wi-Fi (o Ethernet) →
  tu red → **Tipo de perfil de red: Privada**.
- **Redes de invitados**: muchas redes de invitados aíslan a los dispositivos entre sí. Conecta el
  equipo y los celulares a la red principal del router.
- **Otra red**: si el equipo tiene VPN, WSL o máquinas virtuales, puede que la app haya elegido la
  red equivocada. Elige la del wifi en el selector **Red**.

### Pulsadores

Al configurar los equipos en la app de escritorio aparece la opción **Usar pulsadores**, marcada
por defecto. Con ella, los celulares de los invitados funcionan como pulsadores. La versión web no
tiene pulsadores: ahí el operador sigue sumando y restando a mano.

1. **Unirse.** Cada invitado escanea el QR de **Conectar dispositivos** y elige su equipo en el
   celular. Varios celulares pueden estar en el mismo equipo, y cualquiera de ellos pulsa por el
   equipo. **Cambiar de equipo** está siempre disponible en el celular. Si el celular se recarga o
   se reconecta, vuelve solo a su equipo.
2. **Activar.** Con una pregunta abierta, el operador la lee y presiona **Activar pulsadores**. Recién
   entonces el botón del celular dice **¡Pulsa!** (y vibra, si el celular lo permite), y la TV
   muestra **¡Pulsadores activos!**. Un celular que toca antes queda bloqueado un instante (0,25 s).
3. **Primer toque.** Gana el primer toque que llega a la app. El operador, la TV y los celulares
   muestran qué equipo responde, con una cuenta regresiva de 5 segundos. Al llegar a 0 muestran
   **¡Tiempo!** y el operador ve resaltado **Incorrecta**, pero no se descuenta nada solo: basta con
   empezar a responder a tiempo, y eso lo decide el operador.
4. **Juzgar.** **Correcta** suma el valor de la pregunta (con el multiplicador de la ronda) y cierra
   los pulsadores. Ese equipo queda indicado como el que **elige** la siguiente pregunta, en el
   operador y en la TV. **Incorrecta** resta el valor y reabre los pulsadores para los equipos que
   todavía no fallaron en esa pregunta; si no queda ninguno, se cierran. **Cerrar pulsadores** los
   cierra sin tocar los puntajes, y los botones para sumar y restar a mano siguen disponibles.

En un Daily Double no hay pulsadores: responde el equipo que apostó, como siempre.

**Final desde el celular.** En el Final, los celulares de cada equipo que juega muestran la
categoría y un formulario para la apuesta, con su máximo. Después de mostrar la pista, un formulario
para la respuesta escrita, con la cuenta regresiva de 30 segundos. El primer envío de cada equipo
queda fijo: los demás celulares del equipo ven "Enviada por …". El operador ve quién ya apostó y
respondió (sin leer la respuesta antes de tiempo), puede anotar o corregir apuestas a mano (por
ejemplo, para un equipo sin celular) y, en la revelación, ve la respuesta del equipo en turno para
juzgarla. La TV muestra esa respuesta recién cuando el equipo está en turno. Un equipo sin celular
escribe en papel como antes.

Los celulares nunca reciben las preguntas, las respuestas, los puntajes ni lo que envió otro
equipo.

**Sugerencia:** el celular no puede mantener la pantalla encendida solo desde la página. Antes de
jugar, sube el tiempo de apagado de pantalla del celular (o déjalo en "Nunca" durante la fiesta).
Si la pantalla se apaga, al encenderla la página se reconecta y muestra el estado actual.

### Respaldos

Cada tablero se respalda solo en `DocumentosThe Binding of JeopardyRespaldos`, como un archivo
de intercambio (`.jeopardy.json`, con sus imágenes). Hay un archivo por tablero, que se reemplaza
en cada guardado. Los respaldos de los tableros eliminados pasan a la subcarpeta `eliminados`.
**Abrir carpeta de respaldos**, en la lista de tableros, abre la carpeta. Para restaurar un
respaldo, usa **Importar tablero**.

### Traer tableros de la web

La web y el escritorio guardan sus tableros por separado. Para pasar un tablero de uno a otro,
usa **Exportar** en la lista de tableros de la web e **Importar tablero** en el escritorio (o al
revés).

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

App de escritorio (en Windows):

```bash
npm run desktop           # build web + proceso principal, y abre la app con Electron
npm run test:e2e:desktop  # Playwright _electron (requiere npm run build:desktop antes)
npm run dist:desktop      # instalador en release/ (requiere npm run build:desktop antes)
node scripts/make-icon.mjs  # regenera build/icon.ico desde public/icon.svg
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
3. `desktop`: en Windows, compila la app de escritorio, corre sus e2e y verifica que empaqueta.
4. `deploy`: solo en push a `main` y si `checks` y `e2e` pasan; publica `dist/` en GitHub
   Pages. No depende de `desktop`, así que un problema del escritorio no bloquea la web.

`.github/workflows/release.yml` corre con cada tag `vX.Y.Z`: verifica que el tag coincida con la
versión de `package.json`, reutiliza el CI completo y publica el instalador en GitHub Releases con
las notas del CHANGELOG.

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
