import type { SampleBoard } from '.';

export const kpop: SampleBoard = {
  id: 'kpop',
  title: 'Música: K-pop',
  description: 'Grupos, canciones, solistas, debuts, fandoms y cultura coreana.',
  categories: [
    {
      name: 'Grupos',
      clues: [
        {
          question:
            '¿Qué grupo de siete integrantes forman RM, Jin, Suga, j-hope, Jimin, V y Jungkook?',
          answer: 'BTS',
        },
        {
          question: '¿Qué grupo femenino forman Jisoo, Jennie, Rosé y Lisa?',
          answer: 'BLACKPINK',
        },
        {
          question: '¿Qué grupo de JYP, de 2015, reúne integrantes de Corea, Japón y Taiwán?',
          answer: 'TWICE',
        },
        {
          question:
            '¿Qué grupo de trece integrantes se divide en unidades de hip hop, vocal y performance?',
          answer: 'SEVENTEEN',
        },
        {
          question: '¿Qué grupo de SM debutó en 2020 con avatares virtuales llamados "ae"?',
          answer: 'aespa',
        },
      ],
    },
    {
      name: 'Canciones',
      clues: [
        {
          question:
            '¿Qué canción de PSY fue en 2012 el primer video de YouTube en pasar mil millones de vistas?',
          answer: 'Gangnam Style',
        },
        {
          question:
            '¿Qué canción en inglés, de 2020, fue el primer número 1 de BTS en el Billboard Hot 100?',
          answer: 'Dynamite',
        },
        {
          question:
            '¿Qué canción de BLACKPINK, de 2018, imita en su estribillo el sonido de disparos?',
          answer: 'DDU-DU DDU-DU',
        },
        {
          question:
            "¿Qué canción de Girls' Generation, de 2009, es famosa por su baile de piernas?",
          answer: 'Gee',
        },
        {
          question:
            '¿Con qué canción Wonder Girls fue en 2009 el primer grupo coreano en entrar al Billboard Hot 100?',
          answer: 'Nobody',
        },
      ],
    },
    {
      name: 'Solistas',
      clues: [
        {
          question: '¿Qué integrante de BLACKPINK lanzó "Money" como solista en 2021?',
          answer: 'Lisa',
        },
        { question: '¿Qué integrante de BTS lanzó "Seven" en 2023?', answer: 'Jungkook' },
        {
          question:
            '¿Qué cantante, apodada "la hermanita de la nación", canta "Good Day" y "Palette"?',
          answer: 'IU',
        },
        {
          question: '¿Qué líder de BIGBANG lanzó como solista "Heartbreaker" y "Crooked"?',
          answer: 'G-Dragon',
        },
        {
          question: '¿Qué cantante debutó en 2000 con solo 13 años y luego triunfó en Japón?',
          answer: 'BoA',
        },
      ],
    },
    {
      name: 'Debuts',
      clues: [
        { question: '¿En qué año debutó BTS: 2013 o 2017?', answer: '2013' },
        { question: '¿En qué año debutó BLACKPINK?', answer: '2016' },
        { question: '¿Con qué canción debutó TWICE en 2015?', answer: 'Like Ooh-Ahh' },
        {
          question: '¿En qué programa de competencia de 2015 se formó TWICE?',
          answer: 'SIXTEEN',
        },
        {
          question:
            '¿Qué grupo de SM, de 1996, se considera uno de los primeros grupos de ídolos del K-pop?',
          answer: 'H.O.T.',
          dailyDouble: true,
        },
      ],
    },
    {
      name: 'Fandoms',
      clues: [
        { question: '¿Cómo se llama el fandom de BTS?', answer: 'ARMY' },
        { question: '¿Cómo se llama el fandom de BLACKPINK?', answer: 'BLINK' },
        { question: '¿Cómo se llama el fandom de TWICE?', answer: 'ONCE' },
        { question: '¿Cómo se llama el fandom de SEVENTEEN?', answer: 'CARAT' },
        { question: '¿Cómo se llama el fandom de EXO?', answer: 'EXO-L' },
      ],
    },
    {
      name: 'Cultura coreana',
      clues: [
        {
          question:
            '¿Cómo se llama el acompañamiento de verduras fermentadas, sobre todo repollo, típico de Corea?',
          answer: 'Kimchi',
        },
        { question: '¿Cuál es la capital de Corea del Sur?', answer: 'Seúl' },
        { question: '¿Cómo se llama el alfabeto coreano?', answer: 'Hangul' },
        { question: '¿Cómo se llama el traje tradicional coreano?', answer: 'Hanbok' },
        {
          question: '¿Qué rey creó el alfabeto coreano en el siglo XV?',
          answer: 'Sejong el Grande',
        },
      ],
    },
  ],
  final: {
    category: 'Historia del K-pop',
    question:
      '¿Qué trío de 1992 se considera el inicio del K-pop moderno por mezclar rap y baile con el pop coreano?',
    answer: 'Seo Taiji and Boys',
  },
};
