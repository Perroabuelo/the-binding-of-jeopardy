import type { Board } from '../../domain/board';

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' });

export function boardDisplayTitle(board: Board): string {
  return board.title.trim() || 'Tablero sin título';
}

export function formatUpdatedAt(timestamp: number): string {
  return dateFormat.format(timestamp);
}
