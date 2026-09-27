import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Team } from '../../domain/game';
import { TeamScores } from './TeamScores';

const teams: Team[] = ['Primos', 'Tíos', 'Abuelos'].map((name, i) => ({
  id: `t${i}`,
  name,
  score: i * 100,
}));

describe('TeamScores', () => {
  it('en la TV define la cantidad de equipos para ajustar la letra', () => {
    render(<TeamScores teams={teams} size="tv" />);
    const list = screen.getByRole('list', { name: 'Puntajes' });
    expect(list.style.getPropertyValue('--teams')).toBe('3');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('fuera de la TV no define la cantidad de equipos', () => {
    render(<TeamScores teams={teams} />);
    const list = screen.getByRole('list', { name: 'Puntajes' });
    expect(list.style.getPropertyValue('--teams')).toBe('');
  });
});
