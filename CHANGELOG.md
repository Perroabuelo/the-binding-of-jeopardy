# Registro de cambios

Todos los cambios visibles de la app se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[Versionado Semántico](https://semver.org/lang/es/). Mientras la app esté en `0.x`, una
funcionalidad nueva sube el minor y una corrección sube el patch.

## [Sin publicar]

### Corregido

- En el editor, las cajas de texto de la pregunta y la respuesta ya no se achican ni muestran una
  barra de desplazamiento en ventanas bajas, como la de la app de escritorio. Si el contenido no
  cabe, se desplaza el diálogo completo.

## [1.3.0] - 2026-09-28

### Agregado

- El código QR para unirse con el celular ahora aparece en la TV, donde todos lo ven. El operador
  lo muestra y lo oculta con el botón **Mostrar QR en la TV**.

### Cambiado

- La pantalla **Conectar dispositivos** del operador queda para elegir la red, ver los
  dispositivos conectados y la ayuda de conexión.
- El QR y la pantalla de dispositivos aparecen solo en juegos con pulsadores.

## [1.2.1] - 2026-09-27

### Corregido

- En la TV, el tablero y los puntajes ahora caben completos en la pantalla, sin que se corten los
  puntajes abajo.

## [1.2.0] - 2026-09-27

### Agregado

- Nuevo botón **Crear desde ejemplo** en la lista de tableros: trae tres tableros listos para
  jugar, de agricultura, videojuegos y K-pop.
- Cada ejemplo incluye un Daily Double y una pista final, y se puede editar como cualquier tablero.

## [1.1.0] - 2026-09-27

### Agregado

- Pulsadores: en la app de escritorio, cada invitado escanea el QR, elige su equipo y usa su
  celular como botón.
- El operador activa los pulsadores después de leer la pregunta. Si alguien toca antes, queda
  bloqueado un instante.
- El equipo que pulsa tiene 5 segundos para responder, con la cuenta regresiva a la vista de todos.
- Una respuesta incorrecta resta los puntos y le da la oportunidad a los demás equipos.
- En la TV se ve qué equipo responde y quién elige la siguiente pregunta.
- En el Final, cada equipo envía su apuesta y su respuesta en secreto desde el celular. Ya no hace
  falta papel.

## [1.0.0] - 2026-09-26

Primera versión de escritorio. No hay cambios incompatibles para la web.

### Agregado

- Nueva app de escritorio para Windows: instálala desde GitHub Releases y juega sin depender del
  navegador.
- La pantalla de TV se abre sola en el segundo monitor y a pantalla completa.
- Conecta celulares escaneando un QR en la misma red wifi. Es la base para los pulsadores que
  vienen en la próxima versión.
- Tus tableros se respaldan automáticamente en `DocumentosThe Binding of JeopardyRespaldos`.
- La versión web sigue funcionando como siempre.

## [0.6.0] - 2026-09-26

### Agregado

- Rondas: arma una partida de 2 a 5 rondas, cada una con uno de tus tableros y su propio
  multiplicador (por ejemplo, Double Jeopardy! con los valores al doble).
- Entre ronda y ronda, la TV muestra una pantalla de transición y los puntajes se mantienen.
- El Final Jeopardy! sale del tablero de la última ronda.
- Ahora puedes terminar solo la ronda en curso, o el juego completo.

## [0.5.0] - 2026-09-26

### Agregado

- Final Jeopardy!: agrega una pista final a tu tablero y actívala al iniciar el juego. Los equipos
  con puntaje positivo apuestan en secreto, responden en 30 s con música y se revelan del último al
  primero.
- El Final se salta solo si ningún equipo tiene puntaje positivo.

## [0.4.0] - 2026-09-26

### Agregado

- Daily Double: marca las celdas que quieras en el editor. Al abrirlas, la TV anuncia "DAILY
  DOUBLE!" y el equipo apuesta antes de ver la pista.
- La apuesta va de 0 hasta el puntaje del equipo o el valor más alto del tablero, lo que sea mayor.
  Los equipos en 0 o negativos también pueden apostar.

## [0.3.0] - 2026-09-26

### Agregado

- Los tableros pueden tener entre 3 y 8 categorías. Los tableros nuevos se crean con 6, como en el
  Jeopardy original.
- Las categorías se pueden reordenar con flechas en el editor.

## [0.2.0] - 2026-09-26

### Agregado

- Las respuestas ahora pueden tener su propia imagen, que aparece en la TV al revelar la respuesta.

## [0.1.0] - 2026-09-25

### Agregado

- Tableros de 5 categorías y 25 preguntas con respuesta, que se guardan solos en el navegador.
- Imagen opcional por pregunta (PNG, JPEG, GIF o WebP de hasta 5 MB).
- Aviso de lo que falta para jugar y botón **Jugar** cuando el tablero está completo.
- Configuración de 1 a 8 equipos.
- Vista de operador con la respuesta a la vista, revelado a pedido y puntajes que se suman o
  restan.
- Pantalla de TV para los invitados, sincronizada con el operador y sin la respuesta hasta que se
  revela.
- Podio al terminar el juego.
- El juego sigue donde estaba si se recarga cualquiera de las dos ventanas.
- Exportar e importar tableros a un archivo, para respaldarlos o llevarlos a otro computador.
- Funcionamiento sin conexión después de abrir la app una vez.
