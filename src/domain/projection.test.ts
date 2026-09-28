import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import type { ClueKey } from './board';
import { gameReducer, startGame, type GameAction, type GameSession } from './game';
import { projectForTv } from './projection';

function newGame(): GameSession {
  const board = makeCompleteBoard();
  board.categories[2]!.clues[1]!.imageId = 'img-1';
  return startGame([{ board, multiplier: 1 }], ['Equipo A', 'Equipo B'], {
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
  return session.rounds[0]!.boardSnapshot.categories.flatMap((category) =>
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
      imageRole: 'question',
    });
  });

  describe('imagen de la respuesta', () => {
    function gameWithAnswerImage(questionImage: boolean): GameSession {
      const board = makeCompleteBoard();
      const clue = board.categories[1]!.clues[3]!;
      if (questionImage) clue.imageId = 'img-pregunta';
      clue.answerImageId = 'img-respuesta';
      return startGame([{ board, multiplier: 1 }], ['Equipo A'], {
        sessionId: 's1',
        now: 0,
        makeTeamId: () => 't0',
      });
    }

    it('sin revelar no se envía: la TV recibe solo la imagen de la pregunta', () => {
      const view = projectForTv(play(gameWithAnswerImage(true), openClue('c1-r3')));
      expect(JSON.stringify(view)).not.toContain('img-respuesta');
      expect(view.phase).toMatchObject({ imageId: 'img-pregunta', imageRole: 'question' });
    });

    it('sin revelar y sin imagen de pregunta, la TV no recibe ninguna imagen', () => {
      const view = projectForTv(play(gameWithAnswerImage(false), openClue('c1-r3')));
      expect(JSON.stringify(view)).not.toContain('img-respuesta');
      expect(view.phase).not.toHaveProperty('imageId');
      expect(view.phase).not.toHaveProperty('imageRole');
    });

    it('en fase tablero no se envía', () => {
      const session = play(
        gameWithAnswerImage(true),
        openClue('c1-r3'),
        { type: 'reveal' },
        {
          type: 'backToBoard',
        },
      );
      expect(JSON.stringify(projectForTv(session))).not.toContain('img-respuesta');
    });

    it('al revelar reemplaza a la imagen de la pregunta', () => {
      const view = projectForTv(
        play(gameWithAnswerImage(true), openClue('c1-r3'), { type: 'reveal' }),
      );
      expect(view.phase).toMatchObject({ imageId: 'img-respuesta', imageRole: 'answer' });
      expect(JSON.stringify(view)).not.toContain('img-pregunta');
    });

    it('al revelar una respuesta sin imagen se mantiene la de la pregunta', () => {
      const view = projectForTv(play(newGame(), openClue('c2-r1'), { type: 'reveal' }));
      expect(view.phase).toMatchObject({
        imageId: 'img-1',
        imageRole: 'question',
        answer: 'Respuesta 3-2',
      });
    });
  });

  it('omite la imagen si la celda no tiene', () => {
    const view = projectForTv(play(newGame(), openClue('c0-r0')));
    expect(view.phase).not.toHaveProperty('imageId');
    expect(view.phase).not.toHaveProperty('imageRole');
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
      'Categoría 6',
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

describe('projectForTv: Daily Double', () => {
  // c2-r1 (200) es Daily Double y tiene imágenes de pregunta y de respuesta
  const DD: ClueKey = 'c2-r1';

  function dailyDoubleGame(): GameSession {
    const board = makeCompleteBoard();
    const clue = board.categories[2]!.clues[1]!;
    clue.dailyDouble = true;
    clue.imageId = 'img-pregunta';
    clue.answerImageId = 'img-respuesta';
    board.categories[4]!.clues[3]!.dailyDouble = true;
    return startGame([{ board, multiplier: 1 }], ['Primos', 'Tíos'], {
      sessionId: 's1',
      now: 0,
      makeTeamId: (index) => `t${index}`,
    });
  }

  it('esperando la apuesta no envía la pregunta, la respuesta ni sus imágenes', () => {
    const view = projectForTv(play(dailyDoubleGame(), openClue(DD)));
    expect(view.phase).toEqual({ kind: 'dailyDouble', clueKey: DD, value: 200 });
    const json = JSON.stringify(view);
    expect(json).not.toContain('Pregunta 3-2');
    expect(json).not.toContain('Respuesta 3-2');
    expect(json).not.toContain('img-pregunta');
    expect(json).not.toContain('img-respuesta');
  });

  it('en el tablero no identifica las celdas Daily Double', () => {
    const view = projectForTv(dailyDoubleGame());
    expect(JSON.stringify(view)).not.toContain('dailyDouble');
    for (const category of view.categories) {
      for (const clue of category.clues)
        expect(Object.keys(clue).sort()).toEqual(['key', 'used', 'value']);
    }
  });

  it('con la apuesta registrada incluye la pregunta, el equipo y el monto', () => {
    const session = play(dailyDoubleGame(), openClue(DD), {
      type: 'placeWager',
      teamId: 't0',
      amount: 400,
    });
    expect(projectForTv(session).phase).toEqual({
      kind: 'clue',
      clueKey: DD,
      value: 200,
      question: 'Pregunta 3-2',
      imageId: 'img-pregunta',
      imageRole: 'question',
      dailyDouble: { teamName: 'Primos', wager: 400 },
    });
  });

  it('una celda normal no incluye dailyDouble', () => {
    const view = projectForTv(play(dailyDoubleGame(), openClue('c0-r0')));
    expect(view.phase).not.toHaveProperty('dailyDouble');
  });
});

describe('projectForTv: Final', () => {
  const FINAL = {
    category: 'Cumpleañero',
    question: 'Pregunta final secreta',
    answer: 'Respuesta final secreta',
    imageId: 'img-final-pregunta',
    answerImageId: 'img-final-respuesta',
  };

  /** Primos 1200 apuesta 777 y Tíos 400 apuesta 333; Abuelos en 0 no juega. */
  function inWagers(): GameSession {
    let session = startGame(
      [{ board: makeCompleteBoard({ final: { ...FINAL } }), multiplier: 1 }],
      ['Primos', 'Tíos', 'Abuelos'],
      { sessionId: 's1', now: 0, makeTeamId: (index) => `t${index}`, withFinal: true },
    );
    session = play(
      session,
      { type: 'setScore', teamId: 't0', score: 1200 },
      { type: 'setScore', teamId: 't1', score: 400 },
      { type: 'finish' },
      { type: 'setFinalWager', teamId: 't0', amount: 777 },
    );
    return session;
  }

  function inClue(): GameSession {
    return play(
      inWagers(),
      { type: 'setFinalWager', teamId: 't1', amount: 333 },
      {
        type: 'showFinalClue',
      },
    );
  }

  function inReveal(): GameSession {
    return play(inClue(), { type: 'startFinalReveal' });
  }

  function expectHidden(json: string, ...texts: string[]) {
    for (const text of texts) expect(json).not.toContain(text);
  }

  it('en las apuestas envía solo la categoría, los participantes y el conteo', () => {
    const view = projectForTv(inWagers());
    expect(view.phase).toEqual({
      kind: 'final',
      stage: 'wagers',
      category: 'Cumpleañero',
      participants: [
        { teamId: 't1', name: 'Tíos' },
        { teamId: 't0', name: 'Primos' },
      ],
      wagersReady: 1,
    });
    expectHidden(
      JSON.stringify(view),
      FINAL.question,
      FINAL.answer,
      FINAL.imageId,
      FINAL.answerImageId,
      '777',
    );
  });

  it('en la pista envía la pregunta y su imagen, sin la respuesta ni los montos', () => {
    const view = projectForTv(inClue());
    expect(view.phase).toMatchObject({
      stage: 'clue',
      question: FINAL.question,
      imageId: FINAL.imageId,
      imageRole: 'question',
      wagersReady: 2,
    });
    expect(view.phase).not.toHaveProperty('timerEndsAt');
    expectHidden(JSON.stringify(view), FINAL.answer, FINAL.answerImageId, '777', '333');
  });

  it('con el temporizador iniciado envía timerEndsAt', () => {
    const session = gameReducer(inClue(), { type: 'startFinalTimer' }, 50_000);
    expect(projectForTv(session).phase).toMatchObject({ timerEndsAt: 80_000 });
  });

  it('en la revelación envía solo los montos de los equipos juzgados', () => {
    const before = projectForTv(inReveal());
    expect(before.phase).toMatchObject({ stage: 'reveal', judged: [], currentTeamName: 'Tíos' });
    expectHidden(JSON.stringify(before), '777', '333', FINAL.answer, FINAL.answerImageId);

    const view = projectForTv(
      play(inReveal(), { type: 'judgeFinal', teamId: 't1', correct: true }),
    );
    expect(view.phase).toMatchObject({
      judged: [{ teamId: 't1', name: 'Tíos', correct: true, wager: 333, score: 733 }],
      currentTeamName: 'Primos',
    });
    expectHidden(JSON.stringify(view), '777', FINAL.answer);
  });

  it('con la respuesta revelada envía la respuesta y su imagen en lugar de la de la pregunta', () => {
    const view = projectForTv(play(inReveal(), { type: 'revealFinalAnswer' }));
    expect(view.phase).toMatchObject({
      answer: FINAL.answer,
      imageId: FINAL.answerImageId,
      imageRole: 'answer',
    });
    expectHidden(JSON.stringify(view), FINAL.imageId, '777', '333');
  });

  it('con todos juzgados no hay equipo en turno', () => {
    const view = projectForTv(
      play(
        inReveal(),
        { type: 'judgeFinal', teamId: 't1', correct: false },
        { type: 'judgeFinal', teamId: 't0', correct: true },
      ),
    );
    expect(view.phase).not.toHaveProperty('currentTeamName');
    expect(view.phase).toMatchObject({
      judged: [
        { name: 'Tíos', wager: 333, score: 67 },
        { name: 'Primos', wager: 777, score: 1977 },
      ],
    });
  });

  it('en la revelación envía la respuesta enviada del equipo en turno y de los juzgados', () => {
    const answer = (teamId: string, text: string): GameAction => ({
      type: 'submitFinalAnswer',
      teamId,
      text,
      deviceId: `d-${teamId}`,
      deviceLabel: 'Android',
    });
    const answered = play(
      inClue(),
      answer('t1', 'Respuesta escrita de Tíos'),
      answer('t0', 'Respuesta escrita de Primos'),
    );
    expectHidden(
      JSON.stringify(projectForTv(answered)),
      'Respuesta escrita de Tíos',
      'Respuesta escrita de Primos',
    );

    const reveal = play(answered, { type: 'startFinalReveal' });
    const before = projectForTv(reveal);
    expect(before.phase).toMatchObject({
      currentTeamName: 'Tíos',
      currentTeamAnswer: 'Respuesta escrita de Tíos',
    });
    expectHidden(JSON.stringify(before), 'Respuesta escrita de Primos', '333', '777');

    const after = projectForTv(play(reveal, { type: 'judgeFinal', teamId: 't1', correct: true }));
    expect(after.phase).toMatchObject({
      judged: [{ name: 'Tíos', answer: 'Respuesta escrita de Tíos' }],
      currentTeamName: 'Primos',
      currentTeamAnswer: 'Respuesta escrita de Primos',
    });
  });

  it('sin respuesta enviada no hay currentTeamAnswer ni answer en los juzgados', () => {
    const view = projectForTv(
      play(inReveal(), { type: 'judgeFinal', teamId: 't1', correct: true }),
    );
    expect(view.phase).not.toHaveProperty('currentTeamAnswer');
    if (view.phase.kind !== 'final') throw new Error('no final');
    expect(view.phase.judged![0]).not.toHaveProperty('answer');
  });

  it('en el podio envía finalSkipped cuando el Final se saltó', () => {
    const session = startGame(
      [{ board: makeCompleteBoard({ final: { ...FINAL } }), multiplier: 1 }],
      ['Primos'],
      {
        sessionId: 's1',
        now: 0,
        makeTeamId: () => 't0',
        withFinal: true,
      },
    );
    const view = projectForTv(play(session, { type: 'finish' }));
    expect(view.phase).toMatchObject({ kind: 'finished', finalSkipped: 'noPositiveScores' });
    expectHidden(JSON.stringify(view), FINAL.question, FINAL.answer);
  });
});

describe('projectForTv: rondas', () => {
  /** Dos rondas: "Cumple A" en x1 y "Cumple B" en x2, con imágenes y Daily Double en c0-r2. */
  function twoRounds(): GameSession {
    const a = makeCompleteBoard({ id: 'a', title: 'Cumple A' });
    const b = makeCompleteBoard({ id: 'b', title: 'Cumple B' });
    b.categories.forEach((category, c) =>
      category.clues.forEach((clue, r) => {
        clue.question = `Pregunta B ${c}-${r}`;
        clue.answer = `Respuesta B ${c}-${r}`;
        clue.imageId = `img-b-${c}-${r}`;
        clue.answerImageId = `img-b-resp-${c}-${r}`;
      }),
    );
    b.categories[0]!.clues[2]!.dailyDouble = true;
    return startGame(
      [
        { board: a, multiplier: 1 },
        { board: b, multiplier: 2 },
      ],
      ['Primos', 'Tíos'],
      { sessionId: 's1', now: 0, makeTeamId: (index) => `t${index}` },
    );
  }

  function inRound2(): GameSession {
    return play(twoRounds(), { type: 'finishRound' }, { type: 'startNextRound' });
  }

  it('en x2, el tablero proyecta los valores de 200 a 1000', () => {
    const view = projectForTv(inRound2());
    for (const category of view.categories) {
      expect(category.clues.map((clue) => clue.value)).toEqual([200, 400, 600, 800, 1000]);
    }
  });

  it('en x2, la celda abierta de 300 proyecta 600', () => {
    const view = projectForTv(play(inRound2(), openClue('c1-r2')));
    expect(view.phase).toMatchObject({ kind: 'clue', value: 600 });
  });

  it('en x2, el Daily Double de 300 proyecta 600', () => {
    const view = projectForTv(play(inRound2(), openClue('c0-r2')));
    expect(view.phase).toEqual({ kind: 'dailyDouble', clueKey: 'c0-r2', value: 600 });
  });

  it('sin rondas no hay indicador de ronda', () => {
    expect(projectForTv(newGame())).not.toHaveProperty('round');
  });

  it('con rondas indica la ronda, el total y el multiplicador, y el título de la ronda en curso', () => {
    expect(projectForTv(twoRounds())).toMatchObject({
      title: 'Cumple A',
      round: { number: 1, count: 2, multiplier: 1 },
    });
    expect(projectForTv(inRound2())).toMatchObject({
      title: 'Cumple B',
      round: { number: 2, count: 2, multiplier: 2 },
    });
  });

  it('en la transición envía la ronda siguiente sin el contenido de sus celdas', () => {
    const view = projectForTv(play(twoRounds(), { type: 'finishRound' }));
    expect(view.phase).toEqual({
      kind: 'roundBreak',
      number: 2,
      count: 2,
      multiplier: 2,
      title: 'Cumple B',
    });
    const json = JSON.stringify(view);
    expect(json).toContain('Cumple B');
    expect(json).not.toMatch(/Pregunta B|Respuesta B|img-b/);
  });
});

describe('projectForTv: pulsadores', () => {
  function buzzGame(withBuzzers = true): GameSession {
    return startGame([{ board: makeCompleteBoard(), multiplier: 1 }], ['Primos', 'Tíos'], {
      sessionId: 's1',
      now: 0,
      makeTeamId: (index) => `t${index}`,
      withBuzzers,
    });
  }

  it('publica los pulsadores cerrados y activos', () => {
    const closed = play(buzzGame(), openClue('c0-r0'));
    expect(projectForTv(closed).phase).toMatchObject({ buzz: { status: 'closed' } });
    const armed = play(closed, { type: 'armBuzzers' });
    expect(projectForTv(armed).phase).toMatchObject({ buzz: { status: 'armed' } });
  });

  it('con un equipo respondiendo publica su nombre y answerEndsAt = startedAt + 5000', () => {
    const armed = play(buzzGame(), openClue('c0-r0'), { type: 'armBuzzers' });
    const answering = gameReducer(
      armed,
      { type: 'buzz', teamId: 't1', deviceId: 'd-secreto', deviceLabel: 'Android 2' },
      40_000,
    );
    const view = projectForTv(answering);
    expect(view.phase).toMatchObject({
      buzz: { status: 'answering', answeringTeamName: 'Tíos', answerEndsAt: 45_000 },
    });
    expect(JSON.stringify(view)).not.toContain('d-secreto');
  });

  it('publica el equipo que elige tras un acierto por pulsador', () => {
    const session = play(
      buzzGame(),
      openClue('c0-r0'),
      { type: 'armBuzzers' },
      { type: 'buzz', teamId: 't0', deviceId: 'd0', deviceLabel: 'A' },
      { type: 'judgeBuzz', correct: true },
      { type: 'backToBoard' },
    );
    expect(projectForTv(session).controlTeamName).toBe('Primos');
    expect(projectForTv(buzzGame())).not.toHaveProperty('controlTeamName');
  });

  it('publica joinQr solo con pulsadores y el QR visible', () => {
    expect(projectForTv(buzzGame())).not.toHaveProperty('joinQr');
    const shown = play(buzzGame(), { type: 'setJoinQr', visible: true });
    expect(projectForTv(shown).joinQr).toBe(true);
    const hidden = play(shown, { type: 'setJoinQr', visible: false });
    expect(projectForTv(hidden)).not.toHaveProperty('joinQr');
    // Una sesión sin pulsadores con el campo escrito a mano tampoco lo publica.
    expect(projectForTv({ ...buzzGame(false), joinQrVisible: true })).not.toHaveProperty('joinQr');
  });

  it('en un juego sin pulsadores no publica nada de pulsadores', () => {
    const view = projectForTv(play(buzzGame(false), openClue('c0-r0')));
    expect(view.phase).not.toHaveProperty('buzz');
    expect(view).not.toHaveProperty('controlTeamName');
  });
});
