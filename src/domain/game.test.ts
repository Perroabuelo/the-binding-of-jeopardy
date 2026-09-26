import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { allClueKeys, clueKey, type ClueKey } from './board';
import {
  gameReducer,
  MAX_TEAMS,
  maxWager,
  startGame,
  type GameAction,
  type GameSession,
} from './game';

const T0 = 1_000;
const T1 = 2_000;

function newGame(
  teamNames: string[] = ['Equipo A', 'Equipo B'],
  board = makeCompleteBoard(),
): GameSession {
  return startGame(board, teamNames, {
    sessionId: 's1',
    now: T0,
    makeTeamId: (index) => `t${index}`,
  });
}

function play(session: GameSession, ...actions: GameAction[]): GameSession {
  return actions.reduce((current, action) => gameReducer(current, action, T1), session);
}

function openClue(key: ClueKey): GameAction {
  return { type: 'openClue', clueKey: key };
}

describe('startGame', () => {
  it('inicia con los equipos en 0 y la fase tablero', () => {
    const session = newGame(['Equipo A', 'Equipo B']);
    expect(session.id).toBe('s1');
    expect(session.teams).toEqual([
      { id: 't0', name: 'Equipo A', score: 0 },
      { id: 't1', name: 'Equipo B', score: 0 },
    ]);
    expect(session.usedClues).toEqual([]);
    expect(session.phase).toEqual({ kind: 'board' });
    expect(session.updatedAt).toBe(T0);
  });

  it('recorta los espacios de los nombres', () => {
    expect(newGame(['  Equipo A  ']).teams[0]!.name).toBe('Equipo A');
  });

  it('permite entre 1 y 8 equipos', () => {
    expect(newGame(['Solo']).teams).toHaveLength(1);
    const eight = Array.from({ length: MAX_TEAMS }, (_, i) => `Equipo ${i + 1}`);
    expect(newGame(eight).teams).toHaveLength(8);
  });

  it('impide iniciar sin equipos', () => {
    expect(() => newGame([])).toThrow(/al menos 1 equipo/);
  });

  it('impide iniciar con más de 8 equipos', () => {
    const nine = Array.from({ length: MAX_TEAMS + 1 }, (_, i) => `Equipo ${i + 1}`);
    expect(() => newGame(nine)).toThrow(/más de 8/);
  });

  it('impide iniciar con un tablero incompleto', () => {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[0]!.answer = '';
    expect(() =>
      startGame(board, ['Equipo A'], { sessionId: 's1', now: T0, makeTeamId: () => 't0' }),
    ).toThrow(/no está listo/);
  });

  it('impide nombres vacíos o solo con espacios', () => {
    expect(() => newGame(['Equipo A', ''])).toThrow(/equipo 2/);
    expect(() => newGame(['   '])).toThrow(/equipo 1/);
  });

  it('copia el tablero de forma independiente', () => {
    const board = makeCompleteBoard();
    const session = startGame(board, ['Equipo A'], {
      sessionId: 's1',
      now: T0,
      makeTeamId: () => 't0',
    });
    expect(session.boardSnapshot).toEqual(board);
    board.title = 'Cambiado';
    board.categories[0]!.name = 'Cambiada';
    board.categories[0]!.clues[0]!.question = 'Cambiada';
    expect(session.boardSnapshot.title).toBe('Tablero de prueba');
    expect(session.boardSnapshot.categories[0]!.name).toBe('Categoría 1');
    expect(session.boardSnapshot.categories[0]!.clues[0]!.question).toBe('Pregunta 1-1');
  });
});

describe('gameReducer: transiciones válidas', () => {
  it('openClue abre una celda no usada sin revelar', () => {
    const session = newGame();
    const next = gameReducer(session, openClue('c2-r1'), T1);
    expect(next.phase).toEqual({ kind: 'clue', clueKey: 'c2-r1', revealed: false });
    expect(next.updatedAt).toBe(T1);
    expect(session.phase).toEqual({ kind: 'board' });
  });

  it('reveal revela la respuesta de la celda abierta', () => {
    const next = play(newGame(), openClue('c0-r0'), { type: 'reveal' });
    expect(next.phase).toEqual({ kind: 'clue', clueKey: 'c0-r0', revealed: true });
    expect(next.updatedAt).toBe(T1);
  });

  it('backToBoard tras revelar marca la celda como usada', () => {
    const next = play(newGame(), openClue('c0-r0'), { type: 'reveal' }, { type: 'backToBoard' });
    expect(next.phase).toEqual({ kind: 'board' });
    expect(next.usedClues).toEqual(['c0-r0']);
  });

  it('backToBoard sin revelar también marca la celda como usada', () => {
    const next = play(newGame(), openClue('c0-r0'), { type: 'backToBoard' });
    expect(next.phase).toEqual({ kind: 'board' });
    expect(next.usedClues).toEqual(['c0-r0']);
  });

  it('finish desde el tablero termina el juego', () => {
    const session = newGame();
    const next = gameReducer(session, { type: 'finish' }, T1);
    expect(next.phase).toEqual({ kind: 'finished' });
    expect(next.usedClues).toEqual([]);
    expect(next.updatedAt).toBe(T1);
  });

  it('finish con una pregunta abierta la deja usada', () => {
    const next = play(newGame(), openClue('c3-r4'), { type: 'finish' });
    expect(next.phase).toEqual({ kind: 'finished' });
    expect(next.usedClues).toEqual(['c3-r4']);
  });

  it.each([
    [3, 15],
    [5, 25],
    [6, 30],
    [8, 40],
  ])(
    'con %i categorías termina automáticamente al volver con las %i celdas usadas',
    (count, total) => {
      const board = makeCompleteBoard({}, count);
      const keys = allClueKeys(board);
      let session = newGame(undefined, board);
      for (const key of keys.slice(0, -1)) {
        session = play(session, openClue(key), { type: 'backToBoard' });
        expect(session.phase).toEqual({ kind: 'board' });
      }
      session = play(session, openClue(keys.at(-1)!), { type: 'backToBoard' });
      expect(session.phase).toEqual({ kind: 'finished' });
      expect(session.usedClues).toHaveLength(total);
    },
  );

  it('con 8 categorías no termina a las 25 celdas usadas', () => {
    const board = makeCompleteBoard({}, 8);
    let session = newGame(undefined, board);
    for (const key of allClueKeys(board).slice(0, 25)) {
      session = play(session, openClue(key), { type: 'backToBoard' });
    }
    expect(session.phase).toEqual({ kind: 'board' });
    expect(session.usedClues).toHaveLength(25);
  });
});

describe('gameReducer: acciones inválidas devuelven la misma referencia', () => {
  it('no reabre una celda usada', () => {
    const session = play(newGame(), openClue('c0-r0'), { type: 'backToBoard' });
    expect(gameReducer(session, openClue('c0-r0'), T1)).toBe(session);
  });

  it('ignora claves de celda inválidas', () => {
    const session = newGame();
    expect(gameReducer(session, openClue('c6-r0'), T1)).toBe(session);
    expect(gameReducer(session, openClue('c0-r9'), T1)).toBe(session);
    expect(gameReducer(session, openClue('x' as ClueKey), T1)).toBe(session);
  });

  it('en el tablero ignora reveal y backToBoard', () => {
    const session = newGame();
    expect(gameReducer(session, { type: 'reveal' }, T1)).toBe(session);
    expect(gameReducer(session, { type: 'backToBoard' }, T1)).toBe(session);
  });

  it('con una pregunta abierta ignora openClue', () => {
    const session = play(newGame(), openClue('c0-r0'));
    expect(gameReducer(session, openClue(clueKey(1, 1)), T1)).toBe(session);
  });

  it('ignora reveal si la respuesta ya fue revelada', () => {
    const session = play(newGame(), openClue('c0-r0'), { type: 'reveal' });
    expect(gameReducer(session, { type: 'reveal' }, T1)).toBe(session);
  });

  it('en el juego terminado ignora todas las acciones', () => {
    const session = play(newGame(), { type: 'finish' });
    const actions: GameAction[] = [
      openClue('c0-r0'),
      { type: 'reveal' },
      { type: 'backToBoard' },
      { type: 'finish' },
    ];
    for (const action of actions) {
      expect(gameReducer(session, action, T1)).toBe(session);
    }
  });
});

function scoreOf(session: GameSession, teamId: string): number | undefined {
  return session.teams.find((team) => team.id === teamId)?.score;
}

describe('gameReducer: award', () => {
  it('suma el valor de la pregunta abierta', () => {
    // c0-r3 vale 400; el equipo parte con 100
    const session = play(
      newGame(),
      { type: 'setScore', teamId: 't0', score: 100 },
      openClue('c0-r3'),
    );
    const next = gameReducer(session, { type: 'award', teamId: 't0', direction: 1 }, T1);
    expect(scoreOf(next, 't0')).toBe(500);
    expect(scoreOf(next, 't1')).toBe(0);
    expect(next.updatedAt).toBe(T1);
  });

  it('resta el valor y permite puntajes negativos', () => {
    const next = play(newGame(), openClue('c1-r2'), { type: 'award', teamId: 't1', direction: -1 });
    expect(scoreOf(next, 't1')).toBe(-300);
  });

  it('funciona con la respuesta revelada y se puede repetir', () => {
    const next = play(
      newGame(),
      openClue('c0-r0'),
      { type: 'reveal' },
      { type: 'award', teamId: 't0', direction: 1 },
      { type: 'award', teamId: 't0', direction: 1 },
      { type: 'award', teamId: 't1', direction: 1 },
    );
    expect(scoreOf(next, 't0')).toBe(200);
    expect(scoreOf(next, 't1')).toBe(100);
  });

  it('es inválida fuera de la fase de pregunta', () => {
    const action: GameAction = { type: 'award', teamId: 't0', direction: 1 };
    const board = newGame();
    expect(gameReducer(board, action, T1)).toBe(board);
    const finished = play(newGame(), { type: 'finish' });
    expect(gameReducer(finished, action, T1)).toBe(finished);
  });

  it('ignora un equipo inexistente', () => {
    const session = play(newGame(), openClue('c0-r0'));
    expect(gameReducer(session, { type: 'award', teamId: 'nope', direction: 1 }, T1)).toBe(session);
  });
});

describe('gameReducer: setScore', () => {
  it('fija el puntaje en la fase tablero', () => {
    const next = play(newGame(), { type: 'setScore', teamId: 't0', score: 700 });
    expect(scoreOf(next, 't0')).toBe(700);
    expect(next.updatedAt).toBe(T1);
  });

  it('fija el puntaje con una pregunta abierta', () => {
    const next = play(newGame(), openClue('c0-r0'), {
      type: 'setScore',
      teamId: 't1',
      score: -200,
    });
    expect(scoreOf(next, 't1')).toBe(-200);
    expect(next.phase).toEqual({ kind: 'clue', clueKey: 'c0-r0', revealed: false });
  });

  it('es inválida con el juego terminado', () => {
    const session = play(newGame(), { type: 'finish' });
    expect(gameReducer(session, { type: 'setScore', teamId: 't0', score: 5 }, T1)).toBe(session);
  });

  it('ignora un equipo inexistente', () => {
    const session = newGame();
    expect(gameReducer(session, { type: 'setScore', teamId: 'nope', score: 5 }, T1)).toBe(session);
  });

  it('rechaza puntajes que no son enteros finitos', () => {
    const session = newGame();
    for (const score of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(gameReducer(session, { type: 'setScore', teamId: 't0', score }, T1)).toBe(session);
    }
  });
});

// c0-r1 (200) es Daily Double
const DD: ClueKey = 'c0-r1';

function dailyDoubleGame(scores: number[] = [0, 0]): GameSession {
  const board = makeCompleteBoard();
  board.categories[0]!.clues[1]!.dailyDouble = true;
  const names = ['Primos', 'Tíos', 'Sobrinos', 'Abuelos'].slice(0, scores.length);
  return play(
    newGame(names, board),
    ...scores.map((score, i): GameAction => ({ type: 'setScore', teamId: `t${i}`, score })),
  );
}

function placeWager(teamId: string, amount: number): GameAction {
  return { type: 'placeWager', teamId, amount };
}

describe('Daily Double: apertura', () => {
  it('openClue sobre un Daily Double pasa a la espera de apuesta', () => {
    const next = play(dailyDoubleGame(), openClue(DD));
    expect(next.phase).toEqual({ kind: 'wager', clueKey: DD });
    expect(next.updatedAt).toBe(T1);
  });

  it('openClue sobre una celda normal abre la pregunta como siempre', () => {
    const next = play(dailyDoubleGame(), openClue('c0-r0'));
    expect(next.phase).toEqual({ kind: 'clue', clueKey: 'c0-r0', revealed: false });
  });

  it('en la espera de apuesta, reveal y award no hacen nada', () => {
    const session = play(dailyDoubleGame(), openClue(DD));
    expect(gameReducer(session, { type: 'reveal' }, T1)).toBe(session);
    expect(gameReducer(session, { type: 'award', teamId: 't0', direction: 1 }, T1)).toBe(session);
    expect(gameReducer(session, openClue('c1-r1'), T1)).toBe(session);
  });

  it('volver al tablero sin apostar marca la celda usada sin cambiar puntajes', () => {
    const session = dailyDoubleGame([100, 200]);
    const next = play(session, openClue(DD), { type: 'backToBoard' });
    expect(next.phase).toEqual({ kind: 'board' });
    expect(next.usedClues).toEqual([DD]);
    expect(next.teams).toEqual(session.teams);
  });

  it('terminar desde la espera de apuesta marca la celda usada', () => {
    const next = play(dailyDoubleGame(), openClue(DD), { type: 'finish' });
    expect(next.phase).toEqual({ kind: 'finished' });
    expect(next.usedClues).toEqual([DD]);
  });

  it('setScore sigue disponible en la espera de apuesta', () => {
    const next = play(dailyDoubleGame(), openClue(DD), {
      type: 'setScore',
      teamId: 't1',
      score: 50,
    });
    expect(scoreOf(next, 't1')).toBe(50);
    expect(next.phase).toEqual({ kind: 'wager', clueKey: DD });
  });
});

describe('Daily Double: maxWager', () => {
  it('es el puntaje del equipo o el valor más alto del tablero, lo que sea mayor', () => {
    const session = dailyDoubleGame([1200, 300, -400]);
    expect(maxWager(session, 't0')).toBe(1200);
    expect(maxWager(session, 't1')).toBe(500);
    expect(maxWager(session, 't2')).toBe(500);
  });
});

describe('Daily Double: placeWager', () => {
  it('registra una apuesta de 0', () => {
    const next = play(dailyDoubleGame(), openClue(DD), placeWager('t0', 0));
    expect(next.phase).toEqual({
      kind: 'clue',
      clueKey: DD,
      revealed: false,
      wager: { teamId: 't0', amount: 0 },
    });
    expect(next.updatedAt).toBe(T1);
  });

  it('registra una apuesta dentro del puntaje (1200 → 1000)', () => {
    const next = play(dailyDoubleGame([1200]), openClue(DD), placeWager('t0', 1000));
    expect(next.phase).toMatchObject({ kind: 'clue', wager: { teamId: 't0', amount: 1000 } });
  });

  it('permite apostar el puntaje completo', () => {
    const next = play(dailyDoubleGame([1200]), openClue(DD), placeWager('t0', 1200));
    expect(next.phase).toMatchObject({ wager: { amount: 1200 } });
  });

  it.each([300, -400])('con %i puntos permite apostar hasta el tope del tablero (500)', (score) => {
    const next = play(dailyDoubleGame([score]), openClue(DD), placeWager('t0', 500));
    expect(next.phase).toMatchObject({ kind: 'clue', wager: { teamId: 't0', amount: 500 } });
  });

  it.each([600, -100, 2.5, Number.NaN])('rechaza la apuesta %s', (amount) => {
    const session = play(dailyDoubleGame([300]), openClue(DD));
    expect(gameReducer(session, placeWager('t0', amount), T1)).toBe(session);
  });

  it('rechaza un equipo inexistente', () => {
    const session = play(dailyDoubleGame(), openClue(DD));
    expect(gameReducer(session, placeWager('nope', 100), T1)).toBe(session);
  });

  it('se ignora fuera de la espera de apuesta, incluso con la apuesta ya registrada', () => {
    const board = dailyDoubleGame();
    expect(gameReducer(board, placeWager('t0', 100), T1)).toBe(board);
    const normal = play(dailyDoubleGame(), openClue('c0-r0'));
    expect(gameReducer(normal, placeWager('t0', 100), T1)).toBe(normal);
    const placed = play(dailyDoubleGame(), openClue(DD), placeWager('t0', 100));
    expect(gameReducer(placed, placeWager('t1', 200), T1)).toBe(placed);
  });

  it('después de apostar se puede revelar y volver al tablero', () => {
    const next = play(
      dailyDoubleGame(),
      openClue(DD),
      placeWager('t0', 100),
      { type: 'reveal' },
      { type: 'backToBoard' },
    );
    expect(next.phase).toEqual({ kind: 'board' });
    expect(next.usedClues).toEqual([DD]);
  });
});

describe('Daily Double: award', () => {
  it('un acierto suma la apuesta, no el valor de la celda (+1000 → 2200)', () => {
    const next = play(dailyDoubleGame([1200]), openClue(DD), placeWager('t0', 1000), {
      type: 'award',
      teamId: 't0',
      direction: 1,
    });
    expect(scoreOf(next, 't0')).toBe(2200);
  });

  it('un fallo resta la apuesta (-500 → -200)', () => {
    const next = play(dailyDoubleGame([0, 300]), openClue(DD), placeWager('t1', 500), {
      type: 'award',
      teamId: 't1',
      direction: -1,
    });
    expect(scoreOf(next, 't1')).toBe(-200);
  });

  it('ignora a los equipos que no apostaron', () => {
    const session = play(dailyDoubleGame([1200, 300]), openClue(DD), placeWager('t0', 1000));
    expect(gameReducer(session, { type: 'award', teamId: 't1', direction: 1 }, T1)).toBe(session);
    expect(gameReducer(session, { type: 'award', teamId: 't1', direction: -1 }, T1)).toBe(session);
  });

  it('setScore sigue disponible para cualquier equipo', () => {
    const next = play(dailyDoubleGame([1200, 300]), openClue(DD), placeWager('t0', 1000), {
      type: 'setScore',
      teamId: 't1',
      score: 0,
    });
    expect(scoreOf(next, 't1')).toBe(0);
  });
});
