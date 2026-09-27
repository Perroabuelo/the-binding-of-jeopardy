import {
  BUZZ_ANSWER_MS,
  FINAL_TIMER_MS,
  finalClueOf,
  type FinalStage,
  type GameSession,
} from './game';

export type DeviceStage = 'board' | 'clue' | 'dailyDouble' | 'roundBreak' | 'final' | 'finished';

/** Lo que ven todos los celulares. Nunca preguntas, respuestas, imágenes, categorías del tablero ni puntajes. */
export interface DeviceCommonView {
  sessionId: string;
  teams: { id: string; name: string }[];
  stage: DeviceStage;
  buzz?: {
    status: 'closed' | 'armed' | 'answering';
    answeringTeamId?: string;
    /** Milisegundos desde epoch, en el reloj del operador. */
    answerEndsAt?: number;
    failedTeamIds: string[];
  };
  controlTeamId?: string;
  final?: { stage: FinalStage; category: string; timerEndsAt?: number };
}

/** Lo que ven solo los celulares de un equipo. */
export interface DeviceTeamView {
  final?: {
    participating: boolean;
    /** Puntaje con que el equipo entró al Final. */
    maxWager?: number;
    /** Sin `deviceLabel`: la anotó el operador. */
    wager?: { amount: number; deviceLabel?: string };
    answer?: { text: string; deviceLabel: string };
  };
}

export interface DeviceGameView {
  common: DeviceCommonView;
  /** Por id de equipo: cada celular recibe solo la entrada de su equipo. */
  perTeam: Record<string, DeviceTeamView>;
}

/**
 * Vista del juego para los celulares, o null si no hay un juego con pulsadores en curso.
 * `common` va a todos; `perTeam[x]` solo contiene datos del equipo `x`.
 */
export function projectForDevices(session: GameSession | null): DeviceGameView | null {
  if (!session?.buzzersEnabled) return null;
  const { phase } = session;
  const common: DeviceCommonView = {
    sessionId: session.id,
    teams: session.teams.map(({ id, name }) => ({ id, name })),
    stage: 'board',
    ...(session.controlTeamId !== undefined && { controlTeamId: session.controlTeamId }),
  };
  const perTeam: Record<string, DeviceTeamView> = Object.fromEntries(
    session.teams.map((team) => [team.id, {}]),
  );

  switch (phase.kind) {
    case 'board':
    case 'roundBreak':
    case 'finished':
      common.stage = phase.kind;
      break;
    case 'wager':
      common.stage = 'dailyDouble';
      break;
    case 'clue': {
      common.stage = phase.wager ? 'dailyDouble' : 'clue';
      const { buzz } = phase;
      if (buzz) {
        common.buzz = {
          status: buzz.status,
          failedTeamIds: [...buzz.failedTeamIds],
          ...(buzz.answering && {
            answeringTeamId: buzz.answering.teamId,
            answerEndsAt: buzz.answering.startedAt + BUZZ_ANSWER_MS,
          }),
        };
      }
      break;
    }
    case 'final': {
      common.stage = 'final';
      common.final = {
        stage: phase.stage,
        category: finalClueOf(session)?.category ?? '',
        ...(phase.stage === 'clue' &&
          phase.timerStartedAt !== undefined && {
            timerEndsAt: phase.timerStartedAt + FINAL_TIMER_MS,
          }),
      };
      for (const team of session.teams) {
        const participant = phase.participants.find((p) => p.teamId === team.id);
        if (!participant) {
          perTeam[team.id] = { final: { participating: false } };
          continue;
        }
        const amount = phase.wagers[team.id];
        const source = phase.wagerSources?.[team.id];
        const answer = phase.answers?.[team.id];
        perTeam[team.id] = {
          final: {
            participating: true,
            maxWager: participant.entryScore,
            ...(amount !== undefined && {
              wager: { amount, ...(source && { deviceLabel: source.deviceLabel }) },
            }),
            ...(answer && { answer: { text: answer.text, deviceLabel: answer.deviceLabel } }),
          },
        };
      }
      break;
    }
  }
  return { common, perTeam };
}
