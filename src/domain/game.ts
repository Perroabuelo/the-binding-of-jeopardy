import {
  allClueKeys,
  getClue,
  maxClueValue,
  type Board,
  type ClueKey,
  type ClueValue,
  type FinalClue,
} from './board';
import { isFinalComplete, validateBoard } from './validation';

export const MIN_TEAMS = 1;
export const MAX_TEAMS = 8;
/** Con "Jugar con rondas" activo. Sin rondas, el juego tiene una sola. */
export const MIN_ROUNDS = 2;
export const MAX_ROUNDS = 5;
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 10;
/** Duración del temporizador del Final. */
export const FINAL_TIMER_MS = 30_000;

export interface Team {
  id: string;
  name: string;
  score: number;
}

export interface Wager {
  teamId: string;
  amount: number;
}

export type FinalStage = 'wagers' | 'clue' | 'reveal';

export interface FinalParticipant {
  teamId: string;
  /** Puntaje al entrar al Final: es el máximo de su apuesta. */
  entryScore: number;
}

export interface FinalPhase {
  kind: 'final';
  stage: FinalStage;
  /** Fijados al entrar, ya en orden de revelación (puntaje ascendente, estable). */
  participants: FinalParticipant[];
  /** Apuestas anotadas por id de equipo. */
  wagers: Record<string, number>;
  /** Milisegundos desde epoch; se reemplaza al reiniciar el temporizador. */
  timerStartedAt?: number;
  judged: { teamId: string; correct: boolean }[];
  answerRevealed: boolean;
}

export type FinalSkipReason = 'noPositiveScores';

export type GamePhase =
  | { kind: 'board' }
  /** Daily Double abierto que espera la apuesta. */
  | { kind: 'wager'; clueKey: ClueKey }
  | {
      kind: 'clue';
      clueKey: ClueKey;
      revealed: boolean;
      /** Presente solo en un Daily Double. */
      wager?: Wager;
    }
  | FinalPhase
  | { kind: 'finished'; finalSkipped?: FinalSkipReason };

export interface GameRound {
  /** Copia del tablero al iniciar: editar el original no afecta el juego. */
  boardSnapshot: Board;
  /** Entero de MIN_MULTIPLIER a MAX_MULTIPLIER. */
  multiplier: number;
}

export interface GameSession {
  id: string;
  /** Una sola en un juego sin rondas. */
  rounds: GameRound[];
  /** Ronda en curso, desde 0. */
  roundIndex: number;
  teams: Team[];
  /** Celdas usadas de la ronda en curso. */
  usedClues: ClueKey[];
  phase: GamePhase;
  /** Se juega el Final al terminar el tablero. Ausente = false. */
  finalEnabled?: boolean;
  /** Milisegundos desde epoch. */
  updatedAt: number;
}

export type GameAction =
  | { type: 'openClue'; clueKey: ClueKey }
  | { type: 'placeWager'; teamId: string; amount: number }
  | { type: 'reveal' }
  | { type: 'award'; teamId: string; direction: 1 | -1 }
  | { type: 'setScore'; teamId: string; score: number }
  | { type: 'backToBoard' }
  | { type: 'finish' }
  | { type: 'setFinalWager'; teamId: string; amount: number }
  | { type: 'showFinalClue' }
  | { type: 'startFinalTimer' }
  | { type: 'startFinalReveal' }
  | { type: 'judgeFinal'; teamId: string; correct: boolean }
  | { type: 'revealFinalAnswer' };

/** Lo que la TV necesita para dibujar. Nunca incluye respuestas no reveladas. */
export type TvImageRole = 'question' | 'answer';

export interface TvView {
  sessionId: string;
  title: string;
  categories: { name: string; clues: { key: ClueKey; value: ClueValue; used: boolean }[] }[];
  teams: Team[];
  phase:
    | { kind: 'board' }
    | {
        kind: 'clue';
        clueKey: ClueKey;
        value: ClueValue;
        question: string;
        /** La imagen que muestra la TV: la de la respuesta solo después de revelarla. */
        imageId?: string;
        /** Presente junto a `imageId`: de qué parte de la celda es la imagen. */
        imageRole?: TvImageRole;
        /** Presente solo cuando la respuesta fue revelada. */
        answer?: string;
        /** Presente solo en un Daily Double con apuesta. */
        dailyDouble?: { teamName: string; wager: number };
      }
    /** Daily Double que espera la apuesta: sin pregunta, imágenes ni respuesta. */
    | { kind: 'dailyDouble'; clueKey: ClueKey; value: ClueValue }
    | TvFinalPhase
    | {
        kind: 'finished';
        ranking: { team: Team; position: number }[];
        finalSkipped?: FinalSkipReason;
      };
}

/**
 * El Final en la TV. La pregunta y su imagen salen desde la etapa `clue`, la respuesta solo
 * cuando fue revelada, y el monto de una apuesta solo cuando su equipo fue juzgado.
 */
export interface TvFinalPhase {
  kind: 'final';
  stage: FinalStage;
  category: string;
  participants: { teamId: string; name: string }[];
  /** Cuántos participantes tienen apuesta anotada. Nunca los montos. */
  wagersReady: number;
  question?: string;
  imageId?: string;
  imageRole?: TvImageRole;
  /** Milisegundos desde epoch en que el temporizador llega a 0. */
  timerEndsAt?: number;
  judged?: { teamId: string; name: string; correct: boolean; wager: number; score: number }[];
  /** Equipo en turno durante la revelación. */
  currentTeamName?: string;
  answer?: string;
}

/** Tablero y multiplicador de una ronda al iniciar el juego. */
export interface RoundSetup {
  board: Board;
  multiplier: number;
}

/** Una ronda en armado: puede no tener tablero todavía. */
export interface RoundDraft {
  board: Board | null;
  multiplier: number;
}

export interface StartGameOptions {
  sessionId: string;
  now: number;
  makeTeamId: (index: number) => string;
  /** Jugar el Final. Exige una pista final completa. */
  withFinal?: boolean;
}

function cloneBoard(board: Board): Board {
  return {
    ...board,
    categories: board.categories.map((category) => ({
      ...category,
      clues: category.clues.map((clue) => ({ ...clue })),
    })),
    ...(board.final && { final: { ...board.final } }),
  };
}

/**
 * Primer problema de las rondas, o null si se puede jugar con ellas: de 1 a MAX_ROUNDS rondas,
 * cada una con un tablero listo y distinto, y un multiplicador entero de 1 a 10.
 */
export function validateRounds(rounds: readonly RoundDraft[]): string | null {
  if (rounds.length < 1) return 'Se requiere al menos 1 ronda para iniciar el juego.';
  if (rounds.length > MAX_ROUNDS) return `No se pueden tener más de ${MAX_ROUNDS} rondas.`;
  const single = rounds.length === 1;
  for (const [index, { board, multiplier }] of rounds.entries()) {
    const name = `la ronda ${index + 1}`;
    if (!board) return `Elige un tablero para ${name}.`;
    if (!validateBoard(board).ready) {
      return single
        ? 'El tablero no está listo para jugar.'
        : `El tablero de ${name} no está listo para jugar.`;
    }
    const repeated = rounds.findIndex((other) => other.board?.id === board.id);
    if (repeated < index) {
      return `Cada ronda necesita un tablero distinto: ${name} repite el de la ronda ${repeated + 1}.`;
    }
    if (
      !Number.isInteger(multiplier) ||
      multiplier < MIN_MULTIPLIER ||
      multiplier > MAX_MULTIPLIER
    ) {
      return `El multiplicador de ${name} va de ${MIN_MULTIPLIER} a ${MAX_MULTIPLIER}, en números enteros.`;
    }
  }
  return null;
}

/** Sin rondas se llama con una sola ronda en x1. */
export function startGame(
  rounds: readonly RoundSetup[],
  teamNames: readonly string[],
  { sessionId, now, makeTeamId, withFinal = false }: StartGameOptions,
): GameSession {
  const roundsError = validateRounds(rounds);
  if (roundsError) throw new Error(roundsError);
  if (teamNames.length < MIN_TEAMS) {
    throw new Error(`Se requiere al menos ${MIN_TEAMS} equipo para iniciar el juego.`);
  }
  if (teamNames.length > MAX_TEAMS) {
    throw new Error(`No se pueden tener más de ${MAX_TEAMS} equipos.`);
  }
  const names = teamNames.map((name) => name.trim());
  const emptyIndex = names.findIndex((name) => name === '');
  if (emptyIndex !== -1) {
    throw new Error(`El equipo ${emptyIndex + 1} necesita un nombre.`);
  }
  if (withFinal && !isFinalComplete(rounds.at(-1)!.board.final)) {
    throw new Error(
      rounds.length === 1
        ? 'El tablero no tiene una pista final completa para jugar el Final.'
        : 'El tablero de la última ronda no tiene una pista final completa para jugar el Final.',
    );
  }
  return {
    id: sessionId,
    rounds: rounds.map(({ board, multiplier }) => ({
      boardSnapshot: cloneBoard(board),
      multiplier,
    })),
    roundIndex: 0,
    teams: names.map((name, index) => ({ id: makeTeamId(index), name, score: 0 })),
    usedClues: [],
    phase: { kind: 'board' },
    finalEnabled: withFinal,
    updatedAt: now,
  };
}

/** Ronda en curso. */
export function currentRound(session: GameSession): GameRound {
  return session.rounds[session.roundIndex]!;
}

/** Tableros de todas las rondas de la sesión. */
export function sessionBoards(session: GameSession): Board[] {
  return session.rounds.map((round) => round.boardSnapshot);
}

/**
 * Acepta una sesión guardada con la forma anterior a las rondas (`{ boardSnapshot }`) y la
 * devuelve como un juego de una ronda en x1. Una sesión con `rounds` se devuelve igual.
 */
export function normalizeSession(raw: unknown): GameSession {
  const stored = raw as GameSession & { boardSnapshot?: Board };
  if (stored.rounds !== undefined || stored.boardSnapshot === undefined) return stored;
  const { boardSnapshot, ...rest } = stored;
  return { ...rest, rounds: [{ boardSnapshot, multiplier: 1 }], roundIndex: 0 };
}

/** Pista final con la que se juega el Final de la sesión: la del tablero de la última ronda. */
export function finalClueOf(session: GameSession): FinalClue | undefined {
  return session.rounds.at(-1)?.boardSnapshot.final;
}

/**
 * Termina el tablero: sin Final pasa al podio. Con Final, entran los equipos con puntaje mayor
 * que 0, en orden de revelación; si no hay ninguno, el Final se salta.
 */
export function endBoard(session: GameSession, now: number): GameSession {
  if (!session.finalEnabled) return { ...session, phase: { kind: 'finished' }, updatedAt: now };
  const participants = session.teams
    .filter((team) => team.score > 0)
    .map((team) => ({ teamId: team.id, entryScore: team.score }))
    // sort es estable: los empates respetan el orden en que se definieron los equipos
    .sort((a, b) => a.entryScore - b.entryScore);
  if (participants.length === 0) {
    return {
      ...session,
      phase: { kind: 'finished', finalSkipped: 'noPositiveScores' },
      updatedAt: now,
    };
  }
  return {
    ...session,
    phase: {
      kind: 'final',
      stage: 'wagers',
      participants,
      wagers: {},
      judged: [],
      answerRevealed: false,
    },
    updatedAt: now,
  };
}

/**
 * Milisegundos que le quedan al temporizador del Final, entre 0 y FINAL_TIMER_MS.
 * null si no hay un temporizador iniciado.
 */
export function finalTimeRemaining(phase: GamePhase, now: number): number | null {
  if (phase.kind !== 'final' || phase.timerStartedAt === undefined) return null;
  return Math.min(FINAL_TIMER_MS, Math.max(0, phase.timerStartedAt + FINAL_TIMER_MS - now));
}

/** Siguiente participante sin juzgar en la revelación, o undefined si no queda ninguno. */
export function nextFinalTeamId(phase: FinalPhase): string | undefined {
  return phase.participants[phase.judged.length]?.teamId;
}

/**
 * Apuesta máxima de un Daily Double para el equipo: su puntaje o el valor más alto del tablero,
 * lo que sea mayor. Si el equipo no existe, devuelve el valor más alto del tablero.
 */
export function maxWager(session: GameSession, teamId: string): number {
  const team = session.teams.find((t) => t.id === teamId);
  const boardMax = maxClueValue(currentRound(session).boardSnapshot);
  return team ? Math.max(team.score, boardMax) : boardMax;
}

/** Celdas usadas incluyendo la que está abierta, si hay una. */
function withOpenClueUsed(session: GameSession): ClueKey[] {
  if (session.phase.kind !== 'clue' && session.phase.kind !== 'wager') return session.usedClues;
  const key = session.phase.clueKey;
  return session.usedClues.includes(key) ? session.usedClues : [...session.usedClues, key];
}

/** Acción inválida para la fase actual => devuelve la misma referencia. */
export function gameReducer(session: GameSession, action: GameAction, now: number): GameSession {
  const { phase } = session;
  switch (action.type) {
    case 'openClue': {
      if (phase.kind !== 'board') return session;
      const clue = getClue(currentRound(session).boardSnapshot, action.clueKey);
      if (!clue) return session;
      if (session.usedClues.includes(action.clueKey)) return session;
      return {
        ...session,
        phase: clue.dailyDouble
          ? { kind: 'wager', clueKey: action.clueKey }
          : { kind: 'clue', clueKey: action.clueKey, revealed: false },
        updatedAt: now,
      };
    }
    case 'placeWager': {
      if (phase.kind !== 'wager') return session;
      if (!session.teams.some((team) => team.id === action.teamId)) return session;
      const { amount } = action;
      if (!Number.isSafeInteger(amount) || amount < 0) return session;
      if (amount > maxWager(session, action.teamId)) return session;
      return {
        ...session,
        phase: {
          kind: 'clue',
          clueKey: phase.clueKey,
          revealed: false,
          wager: { teamId: action.teamId, amount },
        },
        updatedAt: now,
      };
    }
    case 'reveal': {
      if (phase.kind !== 'clue' || phase.revealed) return session;
      return { ...session, phase: { ...phase, revealed: true }, updatedAt: now };
    }
    case 'backToBoard': {
      if (phase.kind !== 'clue' && phase.kind !== 'wager') return session;
      const usedClues = withOpenClueUsed(session);
      const allUsed = allClueKeys(currentRound(session).boardSnapshot).every((key) =>
        usedClues.includes(key),
      );
      if (allUsed) return endBoard({ ...session, usedClues }, now);
      return { ...session, usedClues, phase: { kind: 'board' }, updatedAt: now };
    }
    case 'finish': {
      if (phase.kind === 'finished') return session;
      // Desde el Final se termina sin aplicar las apuestas pendientes
      if (phase.kind === 'final')
        return { ...session, phase: { kind: 'finished' }, updatedAt: now };
      return endBoard({ ...session, usedClues: withOpenClueUsed(session) }, now);
    }
    case 'setFinalWager': {
      if (phase.kind !== 'final' || phase.stage !== 'wagers') return session;
      const participant = phase.participants.find((p) => p.teamId === action.teamId);
      if (!participant) return session;
      const { amount } = action;
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > participant.entryScore) {
        return session;
      }
      return {
        ...session,
        phase: { ...phase, wagers: { ...phase.wagers, [action.teamId]: amount } },
        updatedAt: now,
      };
    }
    case 'showFinalClue': {
      if (phase.kind !== 'final' || phase.stage !== 'wagers') return session;
      if (!phase.participants.every((p) => phase.wagers[p.teamId] !== undefined)) return session;
      return { ...session, phase: { ...phase, stage: 'clue' }, updatedAt: now };
    }
    case 'startFinalTimer': {
      if (phase.kind !== 'final' || phase.stage !== 'clue') return session;
      return { ...session, phase: { ...phase, timerStartedAt: now }, updatedAt: now };
    }
    case 'startFinalReveal': {
      if (phase.kind !== 'final' || phase.stage !== 'clue') return session;
      return { ...session, phase: { ...phase, stage: 'reveal' }, updatedAt: now };
    }
    case 'judgeFinal': {
      if (phase.kind !== 'final' || phase.stage !== 'reveal') return session;
      if (nextFinalTeamId(phase) !== action.teamId) return session;
      const wager = phase.wagers[action.teamId] ?? 0;
      const scored = updateTeamScore(
        session,
        action.teamId,
        (score) => score + (action.correct ? wager : -wager),
        now,
      );
      if (scored === session) return session;
      return {
        ...scored,
        phase: {
          ...phase,
          judged: [...phase.judged, { teamId: action.teamId, correct: action.correct }],
        },
      };
    }
    case 'revealFinalAnswer': {
      if (phase.kind !== 'final' || phase.stage !== 'reveal' || phase.answerRevealed) {
        return session;
      }
      return { ...session, phase: { ...phase, answerRevealed: true }, updatedAt: now };
    }
    case 'award': {
      if (phase.kind !== 'clue') return session;
      const clue = getClue(currentRound(session).boardSnapshot, phase.clueKey);
      if (!clue) return session;
      if (phase.wager && phase.wager.teamId !== action.teamId) return session;
      const points = phase.wager ? phase.wager.amount : clue.value;
      return updateTeamScore(
        session,
        action.teamId,
        (score) => score + action.direction * points,
        now,
      );
    }
    case 'setScore': {
      if (phase.kind === 'finished') return session;
      if (!Number.isSafeInteger(action.score)) return session;
      return updateTeamScore(session, action.teamId, () => action.score, now);
    }
  }
}

function updateTeamScore(
  session: GameSession,
  teamId: string,
  update: (score: number) => number,
  now: number,
): GameSession {
  if (!session.teams.some((team) => team.id === teamId)) return session;
  return {
    ...session,
    teams: session.teams.map((team) =>
      team.id === teamId ? { ...team, score: update(team.score) } : team,
    ),
    updatedAt: now,
  };
}
