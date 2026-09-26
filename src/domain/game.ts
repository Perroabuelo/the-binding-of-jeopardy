import { allClueKeys, getClue, type Board, type ClueKey, type ClueValue } from './board';

export const MIN_TEAMS = 1;
export const MAX_TEAMS = 8;

export interface Team {
  id: string;
  name: string;
  score: number;
}

export type GamePhase =
  { kind: 'board' } | { kind: 'clue'; clueKey: ClueKey; revealed: boolean } | { kind: 'finished' };

export interface GameSession {
  id: string;
  /** Copia del tablero al iniciar: editar el original no afecta el juego. */
  boardSnapshot: Board;
  teams: Team[];
  usedClues: ClueKey[];
  phase: GamePhase;
  /** Milisegundos desde epoch. */
  updatedAt: number;
}

export type GameAction =
  | { type: 'openClue'; clueKey: ClueKey }
  | { type: 'reveal' }
  | { type: 'award'; teamId: string; direction: 1 | -1 }
  | { type: 'setScore'; teamId: string; score: number }
  | { type: 'backToBoard' }
  | { type: 'finish' };

/** Lo que la TV necesita para dibujar. Nunca incluye respuestas no reveladas. */
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
        imageId?: string;
        /** Presente solo cuando la respuesta fue revelada. */
        answer?: string;
      }
    | { kind: 'finished'; ranking: { team: Team; position: number }[] };
}

export interface StartGameOptions {
  sessionId: string;
  now: number;
  makeTeamId: (index: number) => string;
}

function cloneBoard(board: Board): Board {
  return {
    ...board,
    categories: board.categories.map((category) => ({
      ...category,
      clues: category.clues.map((clue) => ({ ...clue })),
    })),
  };
}

export function startGame(
  board: Board,
  teamNames: readonly string[],
  { sessionId, now, makeTeamId }: StartGameOptions,
): GameSession {
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
  return {
    id: sessionId,
    boardSnapshot: cloneBoard(board),
    teams: names.map((name, index) => ({ id: makeTeamId(index), name, score: 0 })),
    usedClues: [],
    phase: { kind: 'board' },
    updatedAt: now,
  };
}

/** Celdas usadas incluyendo la que está abierta, si hay una. */
function withOpenClueUsed(session: GameSession): ClueKey[] {
  if (session.phase.kind !== 'clue') return session.usedClues;
  const key = session.phase.clueKey;
  return session.usedClues.includes(key) ? session.usedClues : [...session.usedClues, key];
}

/** Acción inválida para la fase actual => devuelve la misma referencia. */
export function gameReducer(session: GameSession, action: GameAction, now: number): GameSession {
  const { phase } = session;
  switch (action.type) {
    case 'openClue': {
      if (phase.kind !== 'board') return session;
      if (!getClue(session.boardSnapshot, action.clueKey)) return session;
      if (session.usedClues.includes(action.clueKey)) return session;
      return {
        ...session,
        phase: { kind: 'clue', clueKey: action.clueKey, revealed: false },
        updatedAt: now,
      };
    }
    case 'reveal': {
      if (phase.kind !== 'clue' || phase.revealed) return session;
      return { ...session, phase: { ...phase, revealed: true }, updatedAt: now };
    }
    case 'backToBoard': {
      if (phase.kind !== 'clue') return session;
      const usedClues = withOpenClueUsed(session);
      const allUsed = allClueKeys().every((key) => usedClues.includes(key));
      return {
        ...session,
        usedClues,
        phase: allUsed ? { kind: 'finished' } : { kind: 'board' },
        updatedAt: now,
      };
    }
    case 'finish': {
      if (phase.kind === 'finished') return session;
      return {
        ...session,
        usedClues: withOpenClueUsed(session),
        phase: { kind: 'finished' },
        updatedAt: now,
      };
    }
    default:
      return session;
  }
}
