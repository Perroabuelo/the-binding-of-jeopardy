import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { allClueKeys, clueKey, type Board, type ClueKey } from './board';
import {
  BUZZ_ANSWER_MS,
  buzzTimeRemaining,
  clueValueInPlay,
  endBoard,
  endRound,
  FINAL_TIMER_MS,
  finalClueOf,
  finalTimeRemaining,
  gameReducer,
  MAX_ROUNDS,
  MAX_TEAMS,
  maxWager,
  nextFinalTeamId,
  normalizeSession,
  sessionBoards,
  startGame,
  validateRounds,
  type BuzzState,
  type FinalPhase,
  type GameAction,
  type GameSession,
} from './game';

const T0 = 1_000;
const T1 = 2_000;
const FINAL = { category: 'Cumpleañero', question: 'Pregunta final', answer: 'Respuesta final' };

function newGame(
  teamNames: string[] = ['Equipo A', 'Equipo B'],
  board = makeCompleteBoard(),
): GameSession {
  return startGame([{ board, multiplier: 1 }], teamNames, {
    sessionId: 's1',
    now: T0,
    makeTeamId: (index) => `t${index}`,
  });
}

/** Tableros listos de 3 categorías, con id y título propios: b1 "Ronda 1", b2 "Ronda 2"… */
function roundBoards(count: number, overrides: Partial<Board> = {}): Board[] {
  return Array.from({ length: count }, (_, i) =>
    makeCompleteBoard({ id: `b${i + 1}`, title: `Ronda ${i + 1}`, ...overrides }, 3),
  );
}

/** Juego con una ronda por multiplicador, en orden, con los equipos t0 y t1. */
function roundsGame(
  multipliers: number[] = [1, 2],
  { withFinal = false, boards = roundBoards(multipliers.length) } = {},
): GameSession {
  return startGame(
    multipliers.map((multiplier, i) => ({ board: boards[i]!, multiplier })),
    ['Equipo A', 'Equipo B'],
    { sessionId: 's1', now: T0, makeTeamId: (index) => `t${index}`, withFinal },
  );
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
      startGame([{ board, multiplier: 1 }], ['Equipo A'], {
        sessionId: 's1',
        now: T0,
        makeTeamId: () => 't0',
      }),
    ).toThrow(/no está listo/);
  });

  it('impide nombres vacíos o solo con espacios', () => {
    expect(() => newGame(['Equipo A', ''])).toThrow(/equipo 2/);
    expect(() => newGame(['   '])).toThrow(/equipo 1/);
  });

  it('copia el tablero de forma independiente', () => {
    const board = makeCompleteBoard();
    const session = startGame([{ board, multiplier: 1 }], ['Equipo A'], {
      sessionId: 's1',
      now: T0,
      makeTeamId: () => 't0',
    });
    expect(session.rounds[0]!.boardSnapshot).toEqual(board);
    board.title = 'Cambiado';
    board.categories[0]!.name = 'Cambiada';
    board.categories[0]!.clues[0]!.question = 'Cambiada';
    expect(session.rounds[0]!.boardSnapshot.title).toBe('Tablero de prueba');
    expect(session.rounds[0]!.boardSnapshot.categories[0]!.name).toBe('Categoría 1');
    expect(session.rounds[0]!.boardSnapshot.categories[0]!.clues[0]!.question).toBe('Pregunta 1-1');
  });

  it('crea una sola ronda en x1', () => {
    const session = newGame();
    expect(session.rounds).toHaveLength(1);
    expect(session.rounds[0]!.multiplier).toBe(1);
    expect(session.roundIndex).toBe(0);
    expect(sessionBoards(session)).toEqual([makeCompleteBoard()]);
  });
});

describe('startGame con rondas', () => {
  const opts = { sessionId: 's1', now: T0, makeTeamId: (index: number) => `t${index}` };

  it('una sola ronda en x1 produce la misma sesión que antes', () => {
    const board = makeCompleteBoard();
    expect(startGame([{ board, multiplier: 1 }], ['Equipo A'], opts)).toEqual({
      id: 's1',
      rounds: [{ boardSnapshot: board, multiplier: 1 }],
      roundIndex: 0,
      teams: [{ id: 't0', name: 'Equipo A', score: 0 }],
      usedClues: [],
      phase: { kind: 'board' },
      finalEnabled: false,
      updatedAt: T0,
    });
  });

  it('guarda las rondas con su tablero y multiplicador, y empieza en la primera', () => {
    const session = roundsGame([1, 3, 2]);
    expect(session.rounds.map((r) => [r.boardSnapshot.id, r.multiplier])).toEqual([
      ['b1', 1],
      ['b2', 3],
      ['b3', 2],
    ]);
    expect(session.roundIndex).toBe(0);
  });

  it(`acepta ${MAX_ROUNDS} rondas y rechaza 6`, () => {
    expect(roundsGame([1, 2, 3, 4, 5]).rounds).toHaveLength(5);
    expect(() => roundsGame([1, 2, 3, 4, 5, 6])).toThrow('No se pueden tener más de 5 rondas.');
  });

  it('rechaza un tablero repetido', () => {
    const [b1, b2] = roundBoards(2);
    expect(() => roundsGame([1, 2, 3], { boards: [b1!, b2!, b1!] })).toThrow(
      'Cada ronda necesita un tablero distinto: la ronda 3 repite el de la ronda 1.',
    );
  });

  it('rechaza un tablero no listo', () => {
    const boards = roundBoards(2);
    boards[1]!.categories[0]!.clues[0]!.answer = '';
    expect(() => roundsGame([1, 2], { boards })).toThrow(
      'El tablero de la ronda 2 no está listo para jugar.',
    );
  });

  it.each([0, 11, 1.5])('rechaza el multiplicador %s', (multiplier) => {
    expect(() => roundsGame([1, multiplier])).toThrow(
      'El multiplicador de la ronda 2 va de 1 a 10, en números enteros.',
    );
  });

  it('acepta los multiplicadores 1 y 10', () => {
    expect(roundsGame([10, 1]).rounds.map((r) => r.multiplier)).toEqual([10, 1]);
  });

  it('rechaza withFinal si solo la primera ronda tiene pista final', () => {
    const boards = roundBoards(2);
    boards[0]!.final = { ...FINAL };
    expect(() => roundsGame([1, 2], { boards, withFinal: true })).toThrow(
      'El tablero de la última ronda no tiene una pista final completa para jugar el Final.',
    );
  });

  it('acepta withFinal si la última ronda tiene pista final', () => {
    const boards = roundBoards(2);
    boards[1]!.final = { ...FINAL };
    expect(roundsGame([1, 2], { boards, withFinal: true }).finalEnabled).toBe(true);
  });

  it('finalClueOf devuelve la pista final de la última ronda', () => {
    const boards = roundBoards(2);
    boards[0]!.final = { ...FINAL, question: 'De la ronda 1' };
    boards[1]!.final = { ...FINAL, question: 'De la ronda 2' };
    expect(finalClueOf(roundsGame([1, 2], { boards }))?.question).toBe('De la ronda 2');
  });
});

describe('validateRounds', () => {
  it('devuelve null con rondas válidas', () => {
    const [b1, b2] = roundBoards(2);
    expect(validateRounds([{ board: b1!, multiplier: 1 }])).toBeNull();
    expect(
      validateRounds([
        { board: b1!, multiplier: 1 },
        { board: b2!, multiplier: 2 },
      ]),
    ).toBeNull();
  });

  it('indica la ronda sin tablero', () => {
    const [b1] = roundBoards(1);
    expect(
      validateRounds([
        { board: b1!, multiplier: 1 },
        { board: null, multiplier: 2 },
      ]),
    ).toBe('Elige un tablero para la ronda 2.');
  });

  it('exige al menos una ronda', () => {
    expect(validateRounds([])).toMatch(/al menos 1 ronda/);
  });
});

describe('normalizeSession', () => {
  it('convierte una sesión con boardSnapshot en una ronda x1', () => {
    const session = play(newGame(), openClue('c0-r0'));
    const legacy: Record<string, unknown> = {
      ...session,
      boardSnapshot: session.rounds[0]!.boardSnapshot,
    };
    delete legacy.rounds;
    delete legacy.roundIndex;
    const normalized = normalizeSession(legacy);
    expect(normalized).toEqual(session);
    expect(normalized).not.toHaveProperty('boardSnapshot');
  });

  it('deja igual una sesión con rondas', () => {
    const session = newGame();
    expect(normalizeSession(session)).toBe(session);
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

describe('valores multiplicados', () => {
  /** Ronda 2 de 2, en x2, con los puntajes dados. c0-r2 (300) puede ser Daily Double. */
  function inRound2(scores: [number, number] = [0, 0], dailyDouble = false): GameSession {
    const boards = roundBoards(2);
    boards[1]!.categories[0]!.clues[2]!.dailyDouble = dailyDouble;
    const session: GameSession = { ...roundsGame([1, 2], { boards }), roundIndex: 1 };
    return play(
      session,
      { type: 'setScore', teamId: 't0', score: scores[0] },
      { type: 'setScore', teamId: 't1', score: scores[1] },
    );
  }

  it('clueValueInPlay multiplica el valor de la celda', () => {
    const session = inRound2();
    const clue = session.rounds[1]!.boardSnapshot.categories[0]!.clues[3]!;
    expect(clueValueInPlay(session, clue)).toBe(800);
    expect(clueValueInPlay(newGame(), clue)).toBe(400);
  });

  it('en x2, award sobre la celda de 400 suma 800', () => {
    const next = play(inRound2([100, 0]), openClue('c0-r3'), {
      type: 'award',
      teamId: 't0',
      direction: 1,
    });
    expect(scoreOf(next, 't0')).toBe(900);
  });

  it('en un Daily Double en x2, award sigue usando la apuesta', () => {
    const next = play(
      inRound2([1200, 0], true),
      openClue('c0-r2'),
      { type: 'placeWager', teamId: 't0', amount: 700 },
      { type: 'award', teamId: 't0', direction: 1 },
    );
    expect(scoreOf(next, 't0')).toBe(1900);
  });

  it('en x2 con un tablero de 100 a 500, maxWager usa 1000 como tope del tablero', () => {
    const session = inRound2([300, 1200], true);
    expect(maxWager(session, 't0')).toBe(1000);
    expect(maxWager(session, 't1')).toBe(1200);
    const waiting = play(session, openClue('c0-r2'));
    expect(gameReducer(waiting, { type: 'placeWager', teamId: 't0', amount: 1100 }, T1)).toBe(
      waiting,
    );
    expect(play(waiting, { type: 'placeWager', teamId: 't0', amount: 1000 }).phase).toMatchObject({
      wager: { teamId: 't0', amount: 1000 },
    });
  });
});

describe('rondas: transición', () => {
  /** Usa todas las celdas de la ronda en curso, volviendo al tablero tras cada una. */
  function playWholeRound(session: GameSession): GameSession {
    const keys = allClueKeys(session.rounds[session.roundIndex]!.boardSnapshot);
    return keys.reduce(
      (current, key) => play(current, openClue(key), { type: 'backToBoard' }),
      session,
    );
  }

  function withScore(session: GameSession, score: number): GameSession {
    return play(session, { type: 'setScore', teamId: 't0', score });
  }

  function finalOnLastBoard(count: number): Board[] {
    const boards = roundBoards(count);
    boards.at(-1)!.final = { ...FINAL };
    return boards;
  }

  it('la última celda de la ronda 1 de 2 lleva a la transición hacia la ronda 2', () => {
    const session = playWholeRound(roundsGame([1, 2]));
    expect(session.phase).toEqual({ kind: 'roundBreak', nextRoundIndex: 1 });
    expect(session.roundIndex).toBe(0);
    expect(session.usedClues).toHaveLength(15);
    expect(session.updatedAt).toBe(T1);
  });

  it('startNextRound avanza de ronda, vacía las celdas usadas y conserva los puntajes', () => {
    const inBreak = playWholeRound(withScore(roundsGame([1, 2]), 1500));
    const next = gameReducer(inBreak, { type: 'startNextRound' }, T1);
    expect(next.roundIndex).toBe(1);
    expect(next.usedClues).toEqual([]);
    expect(next.phase).toEqual({ kind: 'board' });
    expect(next.teams).toEqual(inBreak.teams);
    expect(scoreOf(next, 't0')).toBe(1500);
  });

  it('la última celda de la ronda 2 de 2 va al podio sin Final', () => {
    const inRound2 = play(playWholeRound(roundsGame([1, 2])), { type: 'startNextRound' });
    expect(playWholeRound(inRound2).phase).toEqual({ kind: 'finished' });
  });

  it('la última celda de la ronda 2 de 2 va al Final activo con puntaje positivo', () => {
    const session = withScore(
      roundsGame([1, 2], { boards: finalOnLastBoard(2), withFinal: true }),
      500,
    );
    const inRound2 = play(playWholeRound(session), { type: 'startNextRound' });
    expect(finalPhase(playWholeRound(inRound2)).participants).toEqual([
      { teamId: 't0', entryScore: 500 },
    ]);
  });

  it('finishRound desde el tablero pasa a la transición', () => {
    const next = play(
      roundsGame([1, 2, 3]),
      openClue('c0-r0'),
      { type: 'backToBoard' },
      {
        type: 'finishRound',
      },
    );
    expect(next.phase).toEqual({ kind: 'roundBreak', nextRoundIndex: 1 });
    expect(next.usedClues).toEqual(['c0-r0']);
  });

  it('finishRound con una pregunta abierta la deja usada', () => {
    const next = play(roundsGame([1, 2]), openClue('c1-r2'), { type: 'finishRound' });
    expect(next.phase).toEqual({ kind: 'roundBreak', nextRoundIndex: 1 });
    expect(next.usedClues).toEqual(['c1-r2']);
  });

  it('finishRound en la última ronda o sin rondas devuelve la misma referencia', () => {
    const lastRound = play(roundsGame([1, 2]), { type: 'finishRound' }, { type: 'startNextRound' });
    expect(lastRound.roundIndex).toBe(1);
    expect(gameReducer(lastRound, { type: 'finishRound' }, T1)).toBe(lastRound);
    const single = newGame();
    expect(gameReducer(single, { type: 'finishRound' }, T1)).toBe(single);
  });

  it('finishRound no vale en la transición, el Final ni el podio', () => {
    const inBreak = play(roundsGame([1, 2, 3]), { type: 'finishRound' });
    expect(gameReducer(inBreak, { type: 'finishRound' }, T1)).toBe(inBreak);
    const session = withScore(
      roundsGame([1, 2], { boards: finalOnLastBoard(2), withFinal: true }),
      500,
    );
    const final = play(session, { type: 'finish' });
    expect(gameReducer(final, { type: 'finishRound' }, T1)).toBe(final);
    const finished = play(roundsGame([1, 2]), { type: 'finish' });
    expect(gameReducer(finished, { type: 'finishRound' }, T1)).toBe(finished);
  });

  it('finish en la ronda 1 de 3 va al podio sin Final', () => {
    expect(play(withScore(roundsGame([1, 2, 3]), 500), { type: 'finish' }).phase).toEqual({
      kind: 'finished',
    });
  });

  it('finish en la ronda 1 de 3 va al Final con Final activo', () => {
    const session = withScore(
      roundsGame([1, 2, 3], { boards: finalOnLastBoard(3), withFinal: true }),
      500,
    );
    expect(finalPhase(play(session, { type: 'finish' })).stage).toBe('wagers');
  });

  it('finish en la transición termina el juego', () => {
    const inBreak = play(roundsGame([1, 2]), { type: 'finishRound' });
    expect(play(inBreak, { type: 'finish' }).phase).toEqual({ kind: 'finished' });
  });

  it('en la transición, las acciones del tablero no hacen nada y setScore sí', () => {
    const inBreak = play(roundsGame([1, 2]), { type: 'finishRound' });
    for (const action of [
      openClue('c1-r1'),
      { type: 'reveal' },
      { type: 'award', teamId: 't0', direction: 1 },
      { type: 'placeWager', teamId: 't0', amount: 100 },
      { type: 'backToBoard' },
      { type: 'showFinalClue' },
    ] as GameAction[]) {
      expect(gameReducer(inBreak, action, T1)).toBe(inBreak);
    }
    const scored = play(inBreak, { type: 'setScore', teamId: 't1', score: 700 });
    expect(scoreOf(scored, 't1')).toBe(700);
    expect(scored.phase).toEqual(inBreak.phase);
  });

  it('startNextRound fuera de la transición devuelve la misma referencia', () => {
    const session = roundsGame([1, 2]);
    expect(gameReducer(session, { type: 'startNextRound' }, T1)).toBe(session);
    const open = play(session, openClue('c0-r0'));
    expect(gameReducer(open, { type: 'startNextRound' }, T1)).toBe(open);
  });

  it('endRound sin ronda siguiente termina el tablero', () => {
    expect(endRound(newGame(), T1).phase).toEqual({ kind: 'finished' });
    expect(endRound(roundsGame([1, 2]), T1).phase).toEqual({
      kind: 'roundBreak',
      nextRoundIndex: 1,
    });
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

function finalBoard() {
  return makeCompleteBoard({ final: { ...FINAL } }, 3);
}

/** Juego con Final activo y los puntajes indicados, todavía en el tablero. */
function gameWithFinal(scores: Record<string, number>): GameSession {
  const names = Object.keys(scores);
  let session = startGame([{ board: finalBoard(), multiplier: 1 }], names, {
    sessionId: 's1',
    now: T0,
    makeTeamId: (index) => `t${index}`,
    withFinal: true,
  });
  names.forEach((_, i) => {
    session = play(session, { type: 'setScore', teamId: `t${i}`, score: scores[names[i]!]! });
  });
  return session;
}

function enterFinal(scores: Record<string, number>): GameSession {
  return play(gameWithFinal(scores), { type: 'finish' });
}

function finalPhase(session: GameSession): FinalPhase {
  if (session.phase.kind !== 'final') throw new Error(`Fase ${session.phase.kind}, no final`);
  return session.phase;
}

describe('Final: inicio', () => {
  it('startGame guarda finalEnabled según withFinal', () => {
    const board = finalBoard();
    const opts = { sessionId: 's1', now: T0, makeTeamId: () => 't0' };
    expect(
      startGame([{ board, multiplier: 1 }], ['A'], { ...opts, withFinal: true }).finalEnabled,
    ).toBe(true);
    expect(startGame([{ board, multiplier: 1 }], ['A'], opts).finalEnabled).toBe(false);
  });

  it('startGame rechaza withFinal sin pista final completa', () => {
    const opts = { sessionId: 's1', now: T0, makeTeamId: () => 't0', withFinal: true };
    expect(() => startGame([{ board: makeCompleteBoard(), multiplier: 1 }], ['A'], opts)).toThrow(
      /pista final/,
    );
    const incomplete = makeCompleteBoard({ final: { ...FINAL, answer: ' ' } });
    expect(() => startGame([{ board: incomplete, multiplier: 1 }], ['A'], opts)).toThrow(
      /pista final/,
    );
  });

  it('copia la pista final de forma independiente', () => {
    const board = finalBoard();
    const session = startGame([{ board, multiplier: 1 }], ['A'], {
      sessionId: 's1',
      now: T0,
      makeTeamId: () => 't0',
    });
    board.final!.question = 'Cambiada';
    expect(finalClueOf(session)).toEqual(FINAL);
  });
});

describe('Final: entrada', () => {
  it('backToBoard tras la última celda entra al Final en vez del podio', () => {
    let session = gameWithFinal({ Primos: 500 });
    const keys = allClueKeys(session.rounds[0]!.boardSnapshot);
    for (const key of keys) session = play(session, openClue(key), { type: 'backToBoard' });
    expect(session.usedClues).toHaveLength(keys.length);
    expect(session.phase).toEqual({
      kind: 'final',
      stage: 'wagers',
      participants: [{ teamId: 't0', entryScore: 500 }],
      wagers: {},
      judged: [],
      answerRevealed: false,
    });
  });

  it('finish con celdas pendientes entra al Final y deja usada la celda abierta', () => {
    const session = play(gameWithFinal({ Primos: 500 }), openClue('c0-r0'), { type: 'finish' });
    expect(finalPhase(session).stage).toBe('wagers');
    expect(session.usedClues).toEqual(['c0-r0']);
  });

  it('sin Final activo, terminar el tablero va al podio', () => {
    const session = startGame([{ board: finalBoard(), multiplier: 1 }], ['A'], {
      sessionId: 's1',
      now: T0,
      makeTeamId: () => 't0',
    });
    const next = play(session, { type: 'setScore', teamId: 't0', score: 500 }, { type: 'finish' });
    expect(next.phase).toEqual({ kind: 'finished' });
  });

  it('una sesión guardada sin finalEnabled termina sin Final', () => {
    const session = { ...gameWithFinal({ Primos: 500 }) };
    delete session.finalEnabled;
    expect(play(session, { type: 'finish' }).phase).toEqual({ kind: 'finished' });
  });

  it('participan solo los equipos con puntaje positivo, en orden ascendente y estable', () => {
    const session = enterFinal({ Primos: 1200, Tíos: 400, Cero: 0, Abuelos: 800, Neg: -200 });
    expect(finalPhase(session).participants.map((p) => p.teamId)).toEqual(['t1', 't3', 't0']);

    const tied = enterFinal({ A: 800, B: 400, C: 800, D: 400 });
    expect(finalPhase(tied).participants).toEqual([
      { teamId: 't1', entryScore: 400 },
      { teamId: 't3', entryScore: 400 },
      { teamId: 't0', entryScore: 800 },
      { teamId: 't2', entryScore: 800 },
    ]);
  });

  it('se salta el Final si ningún equipo tiene puntaje positivo', () => {
    const session = enterFinal({ Tíos: 0, Sobrinos: -200 });
    expect(session.phase).toEqual({ kind: 'finished', finalSkipped: 'noPositiveScores' });

    let byCells = gameWithFinal({ Tíos: 0 });
    for (const key of allClueKeys(byCells.rounds[0]!.boardSnapshot)) {
      byCells = play(byCells, openClue(key), { type: 'backToBoard' });
    }
    expect(byCells.phase).toEqual({ kind: 'finished', finalSkipped: 'noPositiveScores' });
  });

  it('endBoard pasa al Final con la sesión dada', () => {
    const next = endBoard(gameWithFinal({ A: 100 }), T1);
    expect(finalPhase(next).participants).toEqual([{ teamId: 't0', entryScore: 100 }]);
    expect(next.updatedAt).toBe(T1);
  });
});

describe('Final: apuestas', () => {
  const wager = (teamId: string, amount: number): GameAction => ({
    type: 'setFinalWager',
    teamId,
    amount,
  });

  it.each([0, 800])('anota una apuesta de %i con 800', (amount) => {
    const next = play(enterFinal({ Primos: 800 }), wager('t0', amount));
    expect(finalPhase(next).wagers).toEqual({ t0: amount });
  });

  it.each([801, -1, 2.5, Number.NaN])('rechaza una apuesta de %d con 800', (amount) => {
    const session = enterFinal({ Primos: 800 });
    expect(gameReducer(session, wager('t0', amount), T1)).toBe(session);
  });

  it('rechaza la apuesta de un equipo que no participa o no existe', () => {
    const session = enterFinal({ Primos: 800, Tíos: 0 });
    expect(gameReducer(session, wager('t1', 0), T1)).toBe(session);
    expect(gameReducer(session, wager('nadie', 0), T1)).toBe(session);
  });

  it('permite sobrescribir una apuesta antes de mostrar la pista', () => {
    const next = play(enterFinal({ Primos: 800 }), wager('t0', 300), wager('t0', 500));
    expect(finalPhase(next).wagers).toEqual({ t0: 500 });
  });

  it('setScore durante el Final no cambia entryScore ni el máximo de la apuesta', () => {
    const session = play(enterFinal({ Primos: 800 }), {
      type: 'setScore',
      teamId: 't0',
      score: 2000,
    });
    expect(scoreOf(session, 't0')).toBe(2000);
    expect(finalPhase(session).participants).toEqual([{ teamId: 't0', entryScore: 800 }]);
    expect(gameReducer(session, wager('t0', 801), T1)).toBe(session);
  });

  it('showFinalClue está bloqueada mientras falten apuestas', () => {
    const session = play(enterFinal({ Primos: 800, Tíos: 400 }), wager('t0', 100));
    expect(gameReducer(session, { type: 'showFinalClue' }, T1)).toBe(session);
    const shown = play(session, wager('t1', 400), { type: 'showFinalClue' });
    expect(finalPhase(shown).stage).toBe('clue');
  });

  it('con la pista mostrada, las apuestas ya no cambian', () => {
    const session = play(enterFinal({ Primos: 800 }), wager('t0', 100), {
      type: 'showFinalClue',
    });
    expect(gameReducer(session, wager('t0', 200), T1)).toBe(session);
  });

  it('en el Final, las acciones del tablero no hacen nada', () => {
    const session = enterFinal({ Primos: 800 });
    for (const action of [
      openClue('c1-r1'),
      { type: 'reveal' },
      { type: 'award', teamId: 't0', direction: 1 },
      { type: 'placeWager', teamId: 't0', amount: 100 },
      { type: 'backToBoard' },
    ] as GameAction[]) {
      expect(gameReducer(session, action, T1)).toBe(session);
    }
  });
});

describe('Final: pista y temporizador', () => {
  function inClue(): GameSession {
    return play(
      enterFinal({ Primos: 800 }),
      { type: 'setFinalWager', teamId: 't0', amount: 100 },
      { type: 'showFinalClue' },
    );
  }

  it('startFinalTimer fija el inicio y reiniciarla lo reemplaza', () => {
    const started = gameReducer(inClue(), { type: 'startFinalTimer' }, 5_000);
    expect(finalPhase(started).timerStartedAt).toBe(5_000);
    const restarted = gameReducer(started, { type: 'startFinalTimer' }, 9_000);
    expect(finalPhase(restarted).timerStartedAt).toBe(9_000);
  });

  it('startFinalTimer solo vale en la pista', () => {
    const wagers = enterFinal({ Primos: 800 });
    expect(gameReducer(wagers, { type: 'startFinalTimer' }, T1)).toBe(wagers);
  });

  it('startFinalReveal pasa a la revelación en cualquier momento de la pista', () => {
    const next = play(inClue(), { type: 'startFinalReveal' });
    expect(finalPhase(next).stage).toBe('reveal');
    const wagers = enterFinal({ Primos: 800 });
    expect(gameReducer(wagers, { type: 'startFinalReveal' }, T1)).toBe(wagers);
  });

  it.each([
    [0, 30_000],
    [10_000, 20_000],
    [30_000, 0],
    [45_000, 0],
  ])('finalTimeRemaining a los %i ms es %i', (elapsed, remaining) => {
    const started = gameReducer(inClue(), { type: 'startFinalTimer' }, 100_000);
    expect(finalTimeRemaining(started.phase, 100_000 + elapsed)).toBe(remaining);
  });

  it('finalTimeRemaining es null sin temporizador iniciado', () => {
    expect(finalTimeRemaining(inClue().phase, T1)).toBeNull();
    expect(finalTimeRemaining({ kind: 'board' }, T1)).toBeNull();
    expect(FINAL_TIMER_MS).toBe(30_000);
  });

  it('el fin del tiempo no cambia la etapa', () => {
    const started = gameReducer(inClue(), { type: 'startFinalTimer' }, 0);
    expect(gameReducer(started, { type: 'reveal' }, 60_000)).toBe(started);
    expect(finalPhase(started).stage).toBe('clue');
  });
});

describe('Final: revelación', () => {
  function inReveal(): GameSession {
    return play(
      enterFinal({ Primos: 1200, Tíos: 400, Abuelos: 800 }),
      { type: 'setFinalWager', teamId: 't0', amount: 1000 },
      { type: 'setFinalWager', teamId: 't1', amount: 400 },
      { type: 'setFinalWager', teamId: 't2', amount: 0 },
      { type: 'showFinalClue' },
      { type: 'startFinalReveal' },
    );
  }
  const judge = (teamId: string, correct: boolean): GameAction => ({
    type: 'judgeFinal',
    teamId,
    correct,
  });

  it('juzga en orden: acierto suma la apuesta y fallo la resta', () => {
    let session = inReveal();
    expect(nextFinalTeamId(finalPhase(session))).toBe('t1');
    session = play(session, judge('t1', true));
    expect(scoreOf(session, 't1')).toBe(800);
    expect(nextFinalTeamId(finalPhase(session))).toBe('t2');
    session = play(session, judge('t2', false), judge('t0', false));
    expect(scoreOf(session, 't2')).toBe(800);
    expect(scoreOf(session, 't0')).toBe(200);
    expect(finalPhase(session).judged).toEqual([
      { teamId: 't1', correct: true },
      { teamId: 't2', correct: false },
      { teamId: 't0', correct: false },
    ]);
    expect(nextFinalTeamId(finalPhase(session))).toBeUndefined();
  });

  it('fuera de turno o repetido no hace nada', () => {
    const session = inReveal();
    expect(gameReducer(session, judge('t0', true), T1)).toBe(session);
    const judged = play(session, judge('t1', true));
    expect(gameReducer(judged, judge('t1', true), T1)).toBe(judged);
  });

  it('judgeFinal no vale antes de la revelación', () => {
    const session = play(
      enterFinal({ Primos: 800 }),
      { type: 'setFinalWager', teamId: 't0', amount: 100 },
      { type: 'showFinalClue' },
    );
    expect(gameReducer(session, judge('t0', true), T1)).toBe(session);
  });

  it('revealFinalAnswer marca la respuesta revelada solo en la revelación', () => {
    const session = inReveal();
    const next = play(session, { type: 'revealFinalAnswer' });
    expect(finalPhase(next).answerRevealed).toBe(true);
    expect(gameReducer(next, { type: 'revealFinalAnswer' }, T1)).toBe(next);
    const wagers = enterFinal({ Primos: 800 });
    expect(gameReducer(wagers, { type: 'revealFinalAnswer' }, T1)).toBe(wagers);
  });

  it('finish desde el Final no aplica las apuestas pendientes', () => {
    const session = play(inReveal(), judge('t1', true), { type: 'finish' });
    expect(session.phase).toEqual({ kind: 'finished' });
    expect(session.teams.map((team) => team.score)).toEqual([1200, 800, 800]);
  });

  it('finish desde las apuestas termina el juego sin Final', () => {
    const session = play(enterFinal({ Primos: 800 }), { type: 'finish' });
    expect(session.phase).toEqual({ kind: 'finished' });
    expect(scoreOf(session, 't0')).toBe(800);
  });
});

/** Juego con pulsadores y los equipos t0, t1, t2…; la celda c0-r1 es Daily Double. */
function buzzGame(names: string[] = ['Primos', 'Tíos', 'Abuelos'], multiplier = 1): GameSession {
  const board = makeCompleteBoard();
  board.categories[0]!.clues[1]!.dailyDouble = true;
  return startGame([{ board, multiplier }], names, {
    sessionId: 's1',
    now: T0,
    makeTeamId: (index) => `t${index}`,
    withBuzzers: true,
  });
}

function buzzOf(session: GameSession): BuzzState {
  if (session.phase.kind !== 'clue' || !session.phase.buzz) {
    throw new Error(`Fase ${session.phase.kind} sin pulsadores`);
  }
  return session.phase.buzz;
}

const buzz = (teamId: string): GameAction => ({
  type: 'buzz',
  teamId,
  deviceId: `d-${teamId}`,
  deviceLabel: `Android ${teamId}`,
});
const arm: GameAction = { type: 'armBuzzers' };
const judgeBuzz = (correct: boolean): GameAction => ({ type: 'judgeBuzz', correct });

describe('Pulsadores: apertura', () => {
  it('startGame guarda buzzersEnabled según withBuzzers', () => {
    expect(buzzGame().buzzersEnabled).toBe(true);
    expect(newGame().buzzersEnabled).toBeUndefined();
  });

  it('openClue con pulsadores crea los pulsadores cerrados', () => {
    const next = play(buzzGame(), openClue('c0-r0'));
    expect(next.phase).toEqual({
      kind: 'clue',
      clueKey: 'c0-r0',
      revealed: false,
      buzz: { status: 'closed', failedTeamIds: [] },
    });
  });

  it('openClue sin pulsadores no crea buzz', () => {
    expect(play(newGame(), openClue('c0-r0')).phase).toEqual({
      kind: 'clue',
      clueKey: 'c0-r0',
      revealed: false,
    });
  });

  it('un Daily Double queda sin pulsadores después de placeWager', () => {
    const session = play(buzzGame(), openClue('c0-r1'), placeWager('t0', 100));
    expect(session.phase).toEqual({
      kind: 'clue',
      clueKey: 'c0-r1',
      revealed: false,
      wager: { teamId: 't0', amount: 100 },
    });
    expect(gameReducer(session, arm, T1)).toBe(session);
  });
});

describe('Pulsadores: armar, tocar y cerrar', () => {
  it('armBuzzers → buzz pasa a answering con el equipo y el dispositivo', () => {
    const armed = play(buzzGame(), openClue('c0-r0'), arm);
    expect(buzzOf(armed)).toEqual({ status: 'armed', failedTeamIds: [] });
    const answering = gameReducer(armed, buzz('t1'), 7_000);
    expect(buzzOf(answering)).toEqual({
      status: 'answering',
      answering: { teamId: 't1', deviceId: 'd-t1', deviceLabel: 'Android t1', startedAt: 7_000 },
      failedTeamIds: [],
    });
  });

  it('un segundo buzz devuelve la misma referencia', () => {
    const answering = play(buzzGame(), openClue('c0-r0'), arm, buzz('t1'));
    expect(gameReducer(answering, buzz('t0'), T1)).toBe(answering);
  });

  it('buzz sin armar, de un equipo inexistente o fallado no cuenta', () => {
    const closed = play(buzzGame(), openClue('c0-r0'));
    expect(gameReducer(closed, buzz('t0'), T1)).toBe(closed);
    const armed = play(closed, arm);
    expect(gameReducer(armed, buzz('nadie'), T1)).toBe(armed);
    const reopened = play(armed, buzz('t1'), judgeBuzz(false));
    expect(buzzOf(reopened).status).toBe('armed');
    expect(gameReducer(reopened, buzz('t1'), T1)).toBe(reopened);
  });

  it('closeBuzzers vuelve a cerrado sin cambiar puntajes ni fallados', () => {
    const answering = play(
      buzzGame(),
      openClue('c0-r0'),
      arm,
      buzz('t1'),
      judgeBuzz(false),
      buzz('t0'),
    );
    const closed = play(answering, { type: 'closeBuzzers' });
    expect(buzzOf(closed)).toEqual({ status: 'closed', failedTeamIds: ['t1'] });
    expect(closed.teams).toEqual(answering.teams);
    expect(gameReducer(closed, { type: 'closeBuzzers' }, T1)).toBe(closed);
    expect(buzzOf(play(closed, arm)).status).toBe('armed');
  });

  it('las acciones de pulsadores no valen sin pulsadores', () => {
    const session = play(newGame(), openClue('c0-r0'));
    const actions: GameAction[] = [arm, buzz('t0'), judgeBuzz(true), { type: 'closeBuzzers' }];
    for (const action of actions) expect(gameReducer(session, action, T1)).toBe(session);
  });
});

describe('Pulsadores: juzgar', () => {
  it('correcta suma el valor, fija el equipo que elige y cierra', () => {
    // c0-r3 vale 400
    const session = play(
      buzzGame(),
      { type: 'setScore', teamId: 't0', score: 100 },
      openClue('c0-r3'),
      arm,
      buzz('t0'),
      judgeBuzz(true),
    );
    expect(scoreOf(session, 't0')).toBe(500);
    expect(session.controlTeamId).toBe('t0');
    expect(buzzOf(session)).toEqual({ status: 'closed', failedTeamIds: [] });
  });

  it('correcta en una ronda x2 suma el valor multiplicado', () => {
    const session = play(
      buzzGame(['Primos', 'Tíos'], 2),
      { type: 'setScore', teamId: 't0', score: 100 },
      openClue('c0-r3'),
      arm,
      buzz('t0'),
      judgeBuzz(true),
    );
    expect(scoreOf(session, 't0')).toBe(900);
  });

  it('otro acierto cambia el equipo que elige', () => {
    let session = play(buzzGame(), openClue('c0-r0'), arm, buzz('t0'), judgeBuzz(true));
    session = play(session, { type: 'backToBoard' }, openClue('c1-r0'), arm, buzz('t1'));
    expect(session.controlTeamId).toBe('t0');
    expect(play(session, judgeBuzz(true)).controlTeamId).toBe('t1');
  });

  it('incorrecta resta, agrega a los fallados y rearma', () => {
    // c0-r2 vale 300
    const session = play(buzzGame(), openClue('c0-r2'), arm, buzz('t1'), judgeBuzz(false));
    expect(scoreOf(session, 't1')).toBe(-300);
    expect(buzzOf(session)).toEqual({ status: 'armed', failedTeamIds: ['t1'] });
    expect(session.controlTeamId).toBeUndefined();
  });

  it('con todos los equipos fallados queda cerrado y armBuzzers no hace nada', () => {
    const session = play(
      buzzGame(['Primos', 'Tíos']),
      openClue('c0-r0'),
      arm,
      buzz('t0'),
      judgeBuzz(false),
      buzz('t1'),
      judgeBuzz(false),
    );
    expect(buzzOf(session)).toEqual({ status: 'closed', failedTeamIds: ['t0', 't1'] });
    expect(gameReducer(session, arm, T1)).toBe(session);
  });

  it('judgeBuzz sin un equipo respondiendo no hace nada', () => {
    const armed = play(buzzGame(), openClue('c0-r0'), arm);
    expect(gameReducer(armed, judgeBuzz(true), T1)).toBe(armed);
  });

  it('award y setScore siguen funcionando con un equipo respondiendo', () => {
    const answering = play(buzzGame(), openClue('c0-r0'), arm, buzz('t1'));
    const awarded = play(answering, { type: 'award', teamId: 't2', direction: 1 });
    expect(scoreOf(awarded, 't2')).toBe(100);
    const set = play(awarded, { type: 'setScore', teamId: 't0', score: 50 });
    expect(scoreOf(set, 't0')).toBe(50);
    expect(buzzOf(set).status).toBe('answering');
  });
});

describe('Pulsadores: tiempo para responder', () => {
  it('BUZZ_ANSWER_MS es 5 s', () => {
    expect(BUZZ_ANSWER_MS).toBe(5_000);
  });

  it.each([
    [0, 5_000],
    [2_000, 3_000],
    [5_000, 0],
    [9_000, 0],
  ])('buzzTimeRemaining a los %i ms es %i', (elapsed, remaining) => {
    const answering = gameReducer(play(buzzGame(), openClue('c0-r0'), arm), buzz('t0'), 50_000);
    expect(buzzTimeRemaining(buzzOf(answering), 50_000 + elapsed)).toBe(remaining);
  });

  it('buzzTimeRemaining es null fuera de answering', () => {
    const armed = play(buzzGame(), openClue('c0-r0'), arm);
    expect(buzzTimeRemaining(buzzOf(armed), T1)).toBeNull();
    expect(buzzTimeRemaining(undefined, T1)).toBeNull();
  });

  it('con el tiempo en 0 nada cambia solo y correcta sigue sumando', () => {
    const answering = gameReducer(play(buzzGame(), openClue('c0-r0'), arm), buzz('t0'), 0);
    const revealed = gameReducer(answering, { type: 'reveal' }, 60_000);
    expect(buzzOf(revealed).status).toBe('answering');
    const judged = gameReducer(answering, judgeBuzz(true), 60_000);
    expect(scoreOf(judged, 't0')).toBe(100);
  });

  it('tras incorrecta, el siguiente buzz tiene un startedAt nuevo', () => {
    let session = gameReducer(play(buzzGame(), openClue('c0-r0'), arm), buzz('t0'), 10_000);
    session = gameReducer(session, judgeBuzz(false), 12_000);
    session = gameReducer(session, buzz('t1'), 20_000);
    expect(buzzOf(session).answering?.startedAt).toBe(20_000);
    expect(buzzTimeRemaining(buzzOf(session), 20_000)).toBe(5_000);
  });
});

describe('Pulsadores: sesión anterior', () => {
  it('una sesión sin los campos nuevos se juega sin pulsadores', () => {
    const session = { ...buzzGame() };
    delete session.buzzersEnabled;
    const opened = play(session, openClue('c0-r0'));
    expect(opened.phase).toEqual({ kind: 'clue', clueKey: 'c0-r0', revealed: false });
    expect(gameReducer(opened, arm, T1)).toBe(opened);
    expect(scoreOf(play(opened, { type: 'award', teamId: 't0', direction: 1 }), 't0')).toBe(100);
    expect(opened.controlTeamId).toBeUndefined();
  });
});

describe('Final desde el celular: apuestas', () => {
  const submit = (teamId: string, amount: number, deviceLabel = 'Android'): GameAction => ({
    type: 'submitFinalWager',
    teamId,
    amount,
    deviceId: `d-${deviceLabel}`,
    deviceLabel,
  });

  it('el primer envío queda con su origen y el segundo devuelve la misma referencia', () => {
    const first = play(enterFinal({ Primos: 800 }), submit('t0', 500, 'Android'));
    expect(finalPhase(first).wagers).toEqual({ t0: 500 });
    expect(finalPhase(first).wagerSources).toEqual({
      t0: { deviceId: 'd-Android', deviceLabel: 'Android' },
    });
    expect(first.updatedAt).toBe(T1);
    expect(gameReducer(first, submit('t0', 300, 'Android 2'), T1)).toBe(first);
  });

  it('no reemplaza una apuesta anotada por el operador', () => {
    const session = play(enterFinal({ Primos: 800 }), {
      type: 'setFinalWager',
      teamId: 't0',
      amount: 200,
    });
    expect(gameReducer(session, submit('t0', 500), T1)).toBe(session);
  });

  it.each([801, -1, 2.5, Number.NaN])('rechaza un envío de %d con 800', (amount) => {
    const session = enterFinal({ Primos: 800 });
    expect(gameReducer(session, submit('t0', amount), T1)).toBe(session);
  });

  it('rechaza el envío de un equipo que no participa o no existe', () => {
    const session = enterFinal({ Primos: 800, Tíos: 0 });
    expect(gameReducer(session, submit('t1', 0), T1)).toBe(session);
    expect(gameReducer(session, submit('nadie', 0), T1)).toBe(session);
  });

  it('solo vale durante las apuestas', () => {
    const inClue = play(enterFinal({ Primos: 800, Tíos: 400 }), submit('t0', 100), {
      type: 'showFinalClue',
    });
    expect(finalPhase(inClue).stage).toBe('wagers');
    const ready = play(inClue, submit('t1', 0), { type: 'showFinalClue' });
    expect(finalPhase(ready).stage).toBe('clue');
    expect(gameReducer(ready, submit('t1', 5), T1)).toBe(ready);
  });

  it('setFinalWager sobrescribe una apuesta enviada y borra su origen', () => {
    const session = play(
      enterFinal({ Primos: 800, Tíos: 400 }),
      submit('t0', 500),
      submit('t1', 100, 'iPhone'),
      { type: 'setFinalWager', teamId: 't0', amount: 400 },
    );
    expect(finalPhase(session).wagers).toEqual({ t0: 400, t1: 100 });
    expect(finalPhase(session).wagerSources).toEqual({
      t1: { deviceId: 'd-iPhone', deviceLabel: 'iPhone' },
    });
  });

  it('setFinalWager sin envíos no agrega wagerSources', () => {
    const session = play(enterFinal({ Primos: 800 }), {
      type: 'setFinalWager',
      teamId: 't0',
      amount: 400,
    });
    expect(finalPhase(session)).not.toHaveProperty('wagerSources');
  });
});

describe('Final desde el celular: respuestas', () => {
  const answer = (teamId: string, text: string, deviceLabel = 'Android'): GameAction => ({
    type: 'submitFinalAnswer',
    teamId,
    text,
    deviceId: `d-${deviceLabel}`,
    deviceLabel,
  });

  function inClue(): GameSession {
    return play(
      enterFinal({ Primos: 800, Tíos: 400, Sobrinos: -200 }),
      { type: 'setFinalWager', teamId: 't0', amount: 100 },
      { type: 'setFinalWager', teamId: 't1', amount: 100 },
      { type: 'showFinalClue' },
    );
  }

  it('guarda la respuesta recortada con su origen, y el primer envío queda', () => {
    const first = play(inClue(), answer('t1', '  ¿Qué es un pastel?  '));
    expect(finalPhase(first).answers).toEqual({
      t1: { text: '¿Qué es un pastel?', deviceId: 'd-Android', deviceLabel: 'Android' },
    });
    expect(gameReducer(first, answer('t1', 'Otra', 'iPhone'), T1)).toBe(first);
  });

  it('acepta hasta 200 caracteres y rechaza textos vacíos o más largos', () => {
    const session = inClue();
    expect(finalPhase(play(session, answer('t0', 'a'.repeat(200)))).answers?.t0?.text).toHaveLength(
      200,
    );
    expect(gameReducer(session, answer('t0', 'a'.repeat(201)), T1)).toBe(session);
    expect(gameReducer(session, answer('t0', '   '), T1)).toBe(session);
  });

  it('rechaza la respuesta de un equipo que no participa', () => {
    const session = inClue();
    expect(gameReducer(session, answer('t2', 'Algo'), T1)).toBe(session);
    expect(gameReducer(session, answer('nadie', 'Algo'), T1)).toBe(session);
  });

  it('vale con el temporizador corriendo y no con el temporizador en 0', () => {
    const started = gameReducer(inClue(), { type: 'startFinalTimer' }, 100_000);
    const inTime = gameReducer(started, answer('t0', 'A tiempo'), 100_000 + FINAL_TIMER_MS - 1);
    expect(finalPhase(inTime).answers?.t0?.text).toBe('A tiempo');
    expect(gameReducer(started, answer('t0', 'Tarde'), 100_000 + FINAL_TIMER_MS)).toBe(started);
  });

  it('no vale durante las apuestas ni en la revelación', () => {
    const wagers = enterFinal({ Primos: 800 });
    expect(gameReducer(wagers, answer('t0', 'Algo'), T1)).toBe(wagers);
    const reveal = play(inClue(), { type: 'startFinalReveal' });
    expect(gameReducer(reveal, answer('t0', 'Algo'), T1)).toBe(reveal);
  });
});
