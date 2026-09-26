import { describe, expect, it } from 'vitest';
import type { Team } from './game';
import { rankTeams } from './ranking';

function team(id: string, score: number): Team {
  return { id, name: `Equipo ${id}`, score };
}

function summary(teams: Team[]): [string, number][] {
  return rankTeams(teams).map(({ team, position }) => [team.id, position]);
}

describe('rankTeams', () => {
  it('ordena por puntaje de mayor a menor', () => {
    expect(summary([team('a', 100), team('b', 500), team('c', -200), team('d', 300)])).toEqual([
      ['b', 1],
      ['d', 2],
      ['a', 3],
      ['c', 4],
    ]);
  });

  it('los empatados comparten posición y se salta la siguiente', () => {
    expect(summary([team('a', 800), team('b', 800), team('c', 300)])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ]);
  });

  it('mantiene el orden original ante empates', () => {
    expect(summary([team('c', 300), team('b', 800), team('x', 300), team('a', 800)])).toEqual([
      ['b', 1],
      ['a', 1],
      ['c', 3],
      ['x', 3],
    ]);
  });

  it('un solo equipo queda en la posición 1', () => {
    expect(summary([team('a', -100)])).toEqual([['a', 1]]);
  });

  it('no muta la entrada', () => {
    const teams = [team('a', 100), team('b', 500)];
    const copy = structuredClone(teams);
    const ranked = rankTeams(teams);
    expect(teams).toEqual(copy);
    expect(ranked[0]!.team).toBe(teams[1]);
  });
});
