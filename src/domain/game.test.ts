import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { allClueKeys, clueKey, type ClueKey } from './board';
import { gameReducer, MAX_TEAMS, startGame, type GameAction, type GameSession } from './game';

const T0 = 1_000;
const T1 = 2_000;

function newGame(teamNames: string[] = ['Equipo A', 'Equipo B']): GameSession {
  return startGame(makeCompleteBoard(), teamNames, {
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

  it('termina automáticamente al volver al tablero con las 25 celdas usadas', () => {
    const keys = allClueKeys();
    let session = newGame();
    for (const key of keys.slice(0, -1)) {
      session = play(session, openClue(key), { type: 'backToBoard' });
      expect(session.phase).toEqual({ kind: 'board' });
    }
    session = play(session, openClue(keys.at(-1)!), { type: 'backToBoard' });
    expect(session.phase).toEqual({ kind: 'finished' });
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
    expect(gameReducer(session, openClue('c5-r0'), T1)).toBe(session);
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
