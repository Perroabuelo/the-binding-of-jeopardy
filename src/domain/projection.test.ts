import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import type { ClueKey } from './board';
import { gameReducer, startGame, type GameAction, type GameSession } from './game';
import { projectForTv } from './projection';

function newGame(): GameSession {
  const board = makeCompleteBoard();
  board.categories[2]!.clues[1]!.imageId = 'img-1';
  return startGame(board, ['Equipo A', 'Equipo B'], {
    sessionId: 's1',
    now: 0,
    makeTeamId: (index) => `t${index}`,
  });
}

function play(session: GameSession, ...actions: GameAction[]): GameSession {
  return actions.reduce((current, action) => gameReducer(current, action, 1), session);
}

function openClue(key: ClueKey): GameAction {
  return { type: 'openClue', clueKey: key };
}

function allAnswers(session: GameSession): string[] {
  return session.boardSnapshot.categories.flatMap((category) =>
    category.clues.map((clue) => clue.answer),
  );
}

function answersIn(json: string, session: GameSession): string[] {
  return allAnswers(session).filter((answer) => json.includes(answer));
}

describe('projectForTv', () => {
  it('en fase tablero no contiene ninguna respuesta', () => {
    const session = play(newGame(), openClue('c0-r0'), { type: 'backToBoard' });
    const json = JSON.stringify(projectForTv(session));
    expect(answersIn(json, session)).toEqual([]);
  });

  it('con la pregunta abierta sin revelar no contiene ninguna respuesta', () => {
    const session = play(newGame(), openClue('c2-r1'));
    const view = projectForTv(session);
    expect(answersIn(JSON.stringify(view), session)).toEqual([]);
    expect(view.phase).not.toHaveProperty('answer');
  });

  it('con la respuesta revelada contiene solo la respuesta de la celda abierta', () => {
    const session = play(newGame(), openClue('c2-r1'), { type: 'reveal' });
    const view = projectForTv(session);
    expect(answersIn(JSON.stringify(view), session)).toEqual(['Respuesta 3-2']);
    expect(view.phase).toMatchObject({ kind: 'clue', answer: 'Respuesta 3-2' });
  });

  it('incluye pregunta, valor e imagen de la celda abierta', () => {
    const view = projectForTv(play(newGame(), openClue('c2-r1')));
    expect(view.phase).toEqual({
      kind: 'clue',
      clueKey: 'c2-r1',
      value: 200,
      question: 'Pregunta 3-2',
      imageId: 'img-1',
    });
  });

  it('omite la imagen si la celda no tiene', () => {
    const view = projectForTv(play(newGame(), openClue('c0-r0')));
    expect(view.phase).not.toHaveProperty('imageId');
  });

  it('incluye título, categorías, valores y equipos', () => {
    const session = play(newGame(), { type: 'setScore', teamId: 't1', score: 300 });
    const view = projectForTv(session);
    expect(view.sessionId).toBe('s1');
    expect(view.title).toBe('Tablero de prueba');
    expect(view.categories.map((category) => category.name)).toEqual([
      'Categoría 1',
      'Categoría 2',
      'Categoría 3',
      'Categoría 4',
      'Categoría 5',
    ]);
    expect(view.categories[1]!.clues.map((clue) => clue.value)).toEqual([100, 200, 300, 400, 500]);
    expect(view.categories[1]!.clues[3]!.key).toBe('c1-r3');
    expect(view.teams).toEqual([
      { id: 't0', name: 'Equipo A', score: 0 },
      { id: 't1', name: 'Equipo B', score: 300 },
    ]);
  });

  it('marca como usadas solo las celdas usadas', () => {
    const session = play(newGame(), openClue('c0-r0'), { type: 'backToBoard' }, openClue('c4-r2'), {
      type: 'backToBoard',
    });
    const used = projectForTv(session)
      .categories.flatMap((category) => category.clues)
      .filter((clue) => clue.used)
      .map((clue) => clue.key);
    expect(used).toEqual(['c0-r0', 'c4-r2']);
  });

  it('con el juego terminado incluye el ranking', () => {
    const session = play(
      newGame(),
      { type: 'setScore', teamId: 't1', score: 800 },
      { type: 'finish' },
    );
    const view = projectForTv(session);
    expect(view.phase).toEqual({
      kind: 'finished',
      ranking: [
        { team: { id: 't1', name: 'Equipo B', score: 800 }, position: 1 },
        { team: { id: 't0', name: 'Equipo A', score: 0 }, position: 2 },
      ],
    });
    expect(answersIn(JSON.stringify(view), session)).toEqual([]);
  });
});
