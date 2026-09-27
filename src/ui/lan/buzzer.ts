import { remainingWithOffset } from '../../net/clock';
import type { PhoneView } from '../../net/protocol';

export type BuzzerState =
  | { kind: 'waiting' }
  | { kind: 'armed' }
  | { kind: 'locked' }
  | { kind: 'won'; remaining: number | null }
  | { kind: 'answering'; teamName: string; remaining: number | null }
  | { kind: 'failed' };

/**
 * Estado del pulsador de un celular unido a un equipo. Las horas de la vista están en el reloj
 * del servidor: se comparan con `localNow` corregida por `offset`.
 */
export function buzzerState(view: PhoneView, localNow: number, offset: number): BuzzerState {
  const { buzz, teamId } = view;
  if (view.stage !== 'clue' || !buzz) return { kind: 'waiting' };
  if (buzz.status === 'answering') {
    const remaining =
      buzz.answerEndsAt !== undefined
        ? remainingWithOffset(buzz.answerEndsAt, localNow, offset)
        : null;
    if (view.youWon) return { kind: 'won', remaining };
    const team = view.teams.find((t) => t.id === buzz.answeringTeamId);
    return { kind: 'answering', teamName: team?.name ?? '', remaining };
  }
  if (teamId !== undefined && buzz.failedTeamIds.includes(teamId)) return { kind: 'failed' };
  if (
    view.lockedUntil !== undefined &&
    remainingWithOffset(view.lockedUntil, localNow, offset) > 0
  ) {
    return { kind: 'locked' };
  }
  return buzz.status === 'armed' ? { kind: 'armed' } : { kind: 'waiting' };
}
