import type { Team } from './game';

export interface RankedTeam {
  team: Team;
  position: number;
}

/** Ranking de competencia estándar (800, 800, 300 => 1, 1, 3); estable ante empates. */
export function rankTeams(teams: readonly Team[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const ranked: RankedTeam[] = [];
  sorted.forEach((team, index) => {
    const previous = ranked[index - 1];
    const position = previous && previous.team.score === team.score ? previous.position : index + 1;
    ranked.push({ team, position });
  });
  return ranked;
}
