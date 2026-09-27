import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { projectForDevices } from './deviceProjection';
import { gameReducer, startGame, type GameAction, type GameSession } from './game';

const FINAL = { category: 'Cumpleañero', question: 'Pregunta final', answer: 'Respuesta final' };

/** Primos (t0), Tíos (t1) y Sobrinos (t2), con pulsadores y Final; c0-r1 es Daily Double. */
function buzzGame({ withBuzzers = true } = {}): GameSession {
  const board = makeCompleteBoard({ final: { ...FINAL } });
  board.categories[0]!.clues[1]!.dailyDouble = true;
  return startGame([{ board, multiplier: 1 }], ['Primos', 'Tíos', 'Sobrinos'], {
    sessionId: 's1',
    now: 0,
    makeTeamId: (index) => `t${index}`,
    withFinal: true,
    withBuzzers,
  });
}

function play(session: GameSession, ...actions: GameAction[]): GameSession {
  return actions.reduce((current, action) => gameReducer(current, action, 1_000), session);
}

function textsOf(session: GameSession): string[] {
  const board = session.rounds[0]!.boardSnapshot;
  return [
    board.title,
    ...board.categories.flatMap((category) => [
      category.name,
      ...category.clues.flatMap((clue) => [clue.question, clue.answer]),
    ]),
    FINAL.question,
    FINAL.answer,
  ];
}

/** Primos 1234 y Tíos 567 juegan el Final; Sobrinos en -200 no. */
function inFinal(): GameSession {
  return play(
    buzzGame(),
    { type: 'setScore', teamId: 't0', score: 1234 },
    { type: 'setScore', teamId: 't1', score: 567 },
    { type: 'setScore', teamId: 't2', score: -200 },
    { type: 'finish' },
  );
}

const submitWager = (teamId: string, amount: number, deviceLabel: string): GameAction => ({
  type: 'submitFinalWager',
  teamId,
  amount,
  deviceId: `d-${deviceLabel}`,
  deviceLabel,
});

describe('projectForDevices', () => {
  it('sin sesión o sin pulsadores es null', () => {
    expect(projectForDevices(null)).toBeNull();
    expect(projectForDevices(buzzGame({ withBuzzers: false }))).toBeNull();
  });

  it('en el tablero envía los equipos sin puntajes', () => {
    const session = play(buzzGame(), { type: 'setScore', teamId: 't0', score: 4321 });
    const view = projectForDevices(session)!;
    expect(view.common).toEqual({
      sessionId: 's1',
      teams: [
        { id: 't0', name: 'Primos' },
        { id: 't1', name: 'Tíos' },
        { id: 't2', name: 'Sobrinos' },
      ],
      stage: 'board',
    });
    expect(view.perTeam).toEqual({ t0: {}, t1: {}, t2: {} });
    expect(JSON.stringify(view)).not.toContain('4321');
  });

  it('con una pregunta abierta no contiene textos del tablero ni puntajes', () => {
    const session = play(
      buzzGame(),
      { type: 'setScore', teamId: 't1', score: 4321 },
      { type: 'openClue', clueKey: 'c2-r3' },
      { type: 'armBuzzers' },
      { type: 'reveal' },
    );
    const json = JSON.stringify(projectForDevices(session));
    for (const text of textsOf(session)) expect(json).not.toContain(text);
    expect(json).not.toContain('4321');
    expect(json).not.toContain('Categoría');
  });

  it('publica el estado de los pulsadores con el equipo que responde y answerEndsAt', () => {
    let session = play(buzzGame(), { type: 'openClue', clueKey: 'c0-r0' });
    expect(projectForDevices(session)!.common).toMatchObject({
      stage: 'clue',
      buzz: { status: 'closed', failedTeamIds: [] },
    });
    session = play(session, { type: 'armBuzzers' });
    session = gameReducer(
      session,
      { type: 'buzz', teamId: 't1', deviceId: 'd1', deviceLabel: 'Android 2' },
      7_000,
    );
    const { common } = projectForDevices(session)!;
    expect(common.buzz).toEqual({
      status: 'answering',
      answeringTeamId: 't1',
      answerEndsAt: 12_000,
      failedTeamIds: [],
    });
    // Nunca el dispositivo que ganó: eso lo agrega el hub a cada socket
    expect(JSON.stringify(common)).not.toContain('d1');
    expect(JSON.stringify(common)).not.toContain('Android 2');
  });

  it('publica los fallados y el equipo que elige', () => {
    const session = play(
      buzzGame(),
      { type: 'openClue', clueKey: 'c0-r0' },
      { type: 'armBuzzers' },
      { type: 'buzz', teamId: 't1', deviceId: 'd1', deviceLabel: 'A' },
      { type: 'judgeBuzz', correct: false },
      { type: 'buzz', teamId: 't0', deviceId: 'd0', deviceLabel: 'B' },
      { type: 'judgeBuzz', correct: true },
    );
    const { common } = projectForDevices(session)!;
    expect(common.buzz).toEqual({ status: 'closed', failedTeamIds: ['t1'] });
    expect(common.controlTeamId).toBe('t0');
  });

  it('un Daily Double sale como dailyDouble y sin pulsadores', () => {
    const waiting = play(buzzGame(), { type: 'openClue', clueKey: 'c0-r1' });
    expect(projectForDevices(waiting)!.common.stage).toBe('dailyDouble');
    const wagered = play(waiting, { type: 'placeWager', teamId: 't0', amount: 100 });
    expect(projectForDevices(wagered)!.common).not.toHaveProperty('buzz');
    expect(projectForDevices(wagered)!.common.stage).toBe('dailyDouble');
  });

  it('en el Final envía la categoría, y el máximo de apuesta es el entryScore del equipo', () => {
    const view = projectForDevices(inFinal())!;
    expect(view.common.final).toEqual({ stage: 'wagers', category: 'Cumpleañero' });
    expect(view.perTeam).toEqual({
      t0: { final: { participating: true, maxWager: 1234 } },
      t1: { final: { participating: true, maxWager: 567 } },
      t2: { final: { participating: false } },
    });
    expect(JSON.stringify(view.common)).not.toContain(FINAL.question);
  });

  it('cada perTeam no contiene montos ni textos de otros equipos', () => {
    let session = play(
      inFinal(),
      submitWager('t0', 1111, 'Android'),
      { type: 'setFinalWager', teamId: 't1', amount: 555 },
      { type: 'showFinalClue' },
      { type: 'startFinalTimer' },
    );
    session = play(
      session,
      {
        type: 'submitFinalAnswer',
        teamId: 't0',
        text: 'Respuesta de Primos',
        deviceId: 'd0',
        deviceLabel: 'Android',
      },
      {
        type: 'submitFinalAnswer',
        teamId: 't1',
        text: 'Respuesta de Tíos',
        deviceId: 'd1',
        deviceLabel: 'iPhone',
      },
    );
    const view = projectForDevices(session)!;
    expect(view.perTeam.t0).toEqual({
      final: {
        participating: true,
        maxWager: 1234,
        wager: { amount: 1111, deviceLabel: 'Android' },
        answer: { text: 'Respuesta de Primos', deviceLabel: 'Android' },
      },
    });
    // Anotada por el operador: sin dispositivo
    expect(view.perTeam.t1!.final!.wager).toEqual({ amount: 555 });
    const primos = JSON.stringify(view.perTeam.t0);
    const tios = JSON.stringify(view.perTeam.t1);
    const sobrinos = JSON.stringify(view.perTeam.t2);
    expect(primos).not.toMatch(/555|567|Tíos|iPhone/);
    expect(tios).not.toMatch(/1111|1234|Primos|Android/);
    expect(sobrinos).not.toMatch(/1111|1234|555|567|Respuesta/);
    const common = JSON.stringify(view.common);
    expect(common).not.toMatch(/1111|1234|555|567|Respuesta de/);
    expect(view.common.final).toEqual({
      stage: 'clue',
      category: 'Cumpleañero',
      timerEndsAt: 31_000,
    });
  });
});
