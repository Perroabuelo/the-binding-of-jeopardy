import type { Board, ClueKey, ClueValue } from './board';

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
