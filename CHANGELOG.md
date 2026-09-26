# Registro de cambios

Todos los cambios visibles de la app se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[Versionado Semántico](https://semver.org/lang/es/). Mientras la app esté en `0.x`, una
funcionalidad nueva sube el minor y una corrección sube el patch.

## [Sin publicar]

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
