import type { SampleBoard } from '.';

export const videogames: SampleBoard = {
  id: 'videojuegos',
  title: 'Videojuegos',
  description: 'Consolas, personajes, sagas clásicas, indies, Nintendo y The Binding of Isaac.',
  categories: [
    {
      name: 'Consolas',
      clues: [
        { question: '¿Qué empresa fabrica la PlayStation?', answer: 'Sony' },
        { question: '¿Cómo se llama la consola que Microsoft lanzó en 2001?', answer: 'Xbox' },
        {
          question:
            '¿Qué consola portátil de Nintendo, de 1989, venía con Tetris en muchos países?',
          answer: 'Game Boy',
        },
        { question: '¿Cuál fue la última consola de sobremesa de Sega?', answer: 'Dreamcast' },
        {
          question: '¿Qué consola de Atari, de 1977, popularizó los juegos en cartucho?',
          answer: 'Atari 2600',
        },
      ],
    },
    {
      name: 'Personajes',
      clues: [
        { question: '¿Cómo se llama el fontanero bigotudo de Nintendo?', answer: 'Mario' },
        { question: '¿De qué color es Sonic?', answer: 'Azul' },
        {
          question: '¿Cómo se llama la princesa que suele rescatar Link?',
          answer: 'Zelda',
        },
        {
          question: '¿Cómo se llama el soldado protagonista de la saga Halo?',
          answer: 'El Jefe Maestro (Master Chief)',
        },
        {
          question:
            '¿Qué personaje de Metroid sorprendió al final del primer juego al revelarse como mujer?',
          answer: 'Samus Aran',
        },
      ],
    },
    {
      name: 'Sagas clásicas',
      clues: [
        { question: '¿En qué saga se atrapan criaturas con Poké Balls?', answer: 'Pokémon' },
        {
          question: '¿Qué saga de peleas de Capcom tiene como protagonistas a Ryu y Ken?',
          answer: 'Street Fighter',
        },
        {
          question: '¿En qué saga de Square aparecen siempre los chocobos y los moguris?',
          answer: 'Final Fantasy',
        },
        {
          question: '¿Qué saga de Konami protagoniza el espía Solid Snake?',
          answer: 'Metal Gear',
          dailyDouble: true,
        },
        {
          question: '¿En qué saga la familia Belmont caza a Drácula?',
          answer: 'Castlevania',
        },
      ],
    },
    {
      name: 'Indies',
      clues: [
        {
          question: '¿En qué juego se construye con bloques y hay que cuidarse de los creepers?',
          answer: 'Minecraft',
        },
        {
          question: '¿En qué juego de 2018 una joven llamada Madeline escala una montaña?',
          answer: 'Celeste',
        },
        {
          question: '¿En qué juego de ConcernedApe se hereda la granja del abuelo?',
          answer: 'Stardew Valley',
        },
        {
          question:
            '¿Qué juego de Team Cherry sigue a un pequeño caballero por el reino de Hallownest?',
          answer: 'Hollow Knight',
        },
        {
          question: '¿En qué juego de Supergiant Games, Zagreus intenta escapar del inframundo?',
          answer: 'Hades',
        },
      ],
    },
    {
      name: 'Nintendo',
      clues: [
        {
          question: '¿Cómo se llama la consola híbrida que Nintendo lanzó en 2017?',
          answer: 'Nintendo Switch',
        },
        {
          question: '¿Qué gorila con corbata apareció por primera vez en un arcade de 1981?',
          answer: 'Donkey Kong',
        },
        {
          question: '¿Qué bolita rosada se traga a sus enemigos para copiar sus poderes?',
          answer: 'Kirby',
        },
        {
          question: '¿Qué fabricaba Nintendo cuando se fundó en 1889?',
          answer: 'Naipes (cartas hanafuda)',
        },
        { question: '¿Qué diseñador creó a Mario y a Link?', answer: 'Shigeru Miyamoto' },
      ],
    },
    {
      name: 'The Binding of Isaac',
      clues: [
        { question: '¿Cómo se llama el niño protagonista del juego?', answer: 'Isaac' },
        { question: '¿Qué dispara Isaac para atacar?', answer: 'Sus lágrimas' },
        {
          question: '¿Por dónde escapa Isaac de su madre al comienzo del juego?',
          answer: 'Por una trampilla hacia el sótano',
        },
        {
          question: '¿Quién creó el juego junto a Florian Himsl?',
          answer: 'Edmund McMillen',
        },
        {
          question: '¿Cómo se llama la nueva versión del juego lanzada en 2014?',
          answer: 'The Binding of Isaac: Rebirth',
        },
      ],
    },
  ],
  final: {
    category: 'Historia de los videojuegos',
    question:
      '¿Qué juego de Atari de 1972, inspirado en el tenis de mesa, fue el primer gran éxito comercial de los videojuegos?',
    answer: 'Pong',
  },
};
