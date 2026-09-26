import { clueKey, getClue } from './board';
import type { GameSession, TvView } from './game';
import { rankTeams } from './ranking';

/**
 * Vista para la TV. Solo incluye la respuesta de la celda abierta, y su imagen, cuando ya fue
 * revelada.
 */
export function projectForTv(session: GameSession): TvView {
  const { boardSnapshot: board, phase } = session;
  const teams = session.teams.map((team) => ({ ...team }));

  const categories = board.categories.map((category, c) => ({
    name: category.name,
    clues: category.clues.map((clue, r) => {
      const key = clueKey(c, r);
      return { key, value: clue.value, used: session.usedClues.includes(key) };
    }),
  }));

  let tvPhase: TvView['phase'] = { kind: 'board' };
  if (phase.kind === 'finished') {
    tvPhase = { kind: 'finished', ranking: rankTeams(teams) };
  } else if (phase.kind === 'clue') {
    const clue = getClue(board, phase.clueKey);
    if (clue) {
      // La imagen de la respuesta no sale hacia la TV hasta que se revela.
      const image =
        phase.revealed && clue.answerImageId !== undefined
          ? { imageId: clue.answerImageId, imageRole: 'answer' as const }
          : clue.imageId !== undefined
            ? { imageId: clue.imageId, imageRole: 'question' as const }
            : {};
      tvPhase = {
        kind: 'clue',
        clueKey: phase.clueKey,
        value: clue.value,
        question: clue.question,
        ...image,
        ...(phase.revealed && { answer: clue.answer }),
      };
    }
  }

  return { sessionId: session.id, title: board.title, categories, teams, phase: tvPhase };
}
