import type { SampleBoard } from '.';

export const agriculture: SampleBoard = {
  id: 'agricultura',
  title: 'Agricultura',
  description:
    'Cultivos, frutales, suelos y riego, maquinaria, plagas y enfermedades, e historia de la agricultura.',
  categories: [
    {
      name: 'Cultivos',
      clues: [
        { question: '¿Qué cereal se cultiva en campos inundados?', answer: 'El arroz' },
        {
          question: '¿De qué planta se obtiene la mayor parte del azúcar del mundo?',
          answer: 'La caña de azúcar',
        },
        {
          question: '¿De qué cordillera es originaria la papa?',
          answer: 'De los Andes',
        },
        {
          question: '¿Qué legumbre es la oleaginosa más cultivada del mundo?',
          answer: 'La soya (soja)',
        },
        {
          question: '¿Qué cereal domesticaron los pueblos de Mesoamérica a partir del teosinte?',
          answer: 'El maíz',
        },
      ],
    },
    {
      name: 'Frutales',
      clues: [
        { question: '¿De qué fruta se hace el vino?', answer: 'De la uva' },
        {
          question: '¿Qué fruta amarilla crece en racimos cuyos grupos se llaman "manos"?',
          answer: 'El plátano (banana)',
        },
        {
          question:
            '¿Cómo se llama la técnica de unir una rama de una planta a otra para que crezcan juntas?',
          answer: 'Injerto',
        },
        {
          question: '¿Qué fruta, originaria de Mesoamérica, se llama palta en Chile?',
          answer: 'El aguacate',
        },
        {
          question:
            '¿Cómo se llama la acumulación de frío que muchos frutales necesitan en invierno para brotar bien?',
          answer: 'Horas frío',
        },
      ],
    },
    {
      name: 'Suelos y riego',
      clues: [
        {
          question: '¿Cómo se llama el abono que se hace descomponiendo restos orgánicos?',
          answer: 'Compost',
        },
        {
          question: '¿Qué sistema de riego entrega el agua gota a gota junto a cada planta?',
          answer: 'Riego por goteo',
        },
        { question: '¿Qué indica el pH de un suelo?', answer: 'Su acidez o alcalinidad' },
        {
          question: '¿Qué nutrientes indican las letras N, P y K de un fertilizante?',
          answer: 'Nitrógeno, fósforo y potasio',
          dailyDouble: true,
        },
        {
          question:
            '¿Cómo se llama el suelo con proporciones equilibradas de arena, limo y arcilla?',
          answer: 'Suelo franco',
        },
      ],
    },
    {
      name: 'Maquinaria',
      clues: [
        {
          question: '¿Qué vehículo agrícola tira de arados y remolques?',
          answer: 'El tractor',
        },
        {
          question: '¿Qué máquina corta, trilla y limpia el grano en una sola pasada?',
          answer: 'La cosechadora',
        },
        {
          question: '¿Qué herramienta da vuelta la tierra antes de sembrar?',
          answer: 'El arado',
        },
        {
          question: '¿Qué máquina deja las semillas en hileras, a una distancia pareja?',
          answer: 'La sembradora',
        },
        {
          question: '¿Qué herrero estadounidense creó en 1837 un arado de acero?',
          answer: 'John Deere',
        },
      ],
    },
    {
      name: 'Plagas y enfermedades',
      clues: [
        {
          question: '¿Qué pequeño insecto chupa la savia y es plaga común de los rosales?',
          answer: 'El pulgón',
        },
        {
          question: '¿Qué insecto de puntos negros es un aliado porque se come a los pulgones?',
          answer: 'La chinita (mariquita)',
        },
        {
          question: '¿Qué tipo de producto se usa para combatir los hongos?',
          answer: 'Un fungicida',
        },
        {
          question: '¿Qué enfermedad de la papa causó la gran hambruna de Irlanda en el siglo XIX?',
          answer: 'El tizón tardío',
        },
        {
          question:
            '¿Cómo se llama la estrategia que combina control biológico, cultural y químico de plagas?',
          answer: 'Manejo integrado de plagas (MIP)',
        },
      ],
    },
    {
      name: 'Historia de la agricultura',
      clues: [
        {
          question: '¿Qué animal, además del caballo, tiraba del arado antes de los tractores?',
          answer: 'El buey',
        },
        {
          question: '¿En qué región de Medio Oriente nació la agricultura hace unos 10.000 años?',
          answer: 'La Media Luna Fértil',
        },
        {
          question: '¿Qué sistema mesoamericano cultiva juntos maíz, frijol y calabaza?',
          answer: 'La milpa',
        },
        {
          question:
            '¿Cómo se llaman las terrazas de cultivo que construían los incas en las laderas?',
          answer: 'Andenes',
        },
        {
          question: '¿Qué agrónomo, Nobel de la Paz en 1970, impulsó la Revolución Verde?',
          answer: 'Norman Borlaug',
        },
      ],
    },
  ],
  final: {
    category: 'Técnicas de cultivo',
    question:
      '¿Cómo se llama el cultivo de plantas sin suelo, con las raíces en agua con nutrientes?',
    answer: 'Hidroponía',
  },
};
