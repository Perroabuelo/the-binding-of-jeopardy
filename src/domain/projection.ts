import { clueKey, getClue, type FinalClue } from './board';
import {
  FINAL_TIMER_MS,
  finalClueOf,
  nextFinalTeamId,
  type FinalPhase,
  type GameSession,
  type Team,
  type TvFinalPhase,
  type TvView,
} from './game';
import { rankTeams } from './ranking';

/**
 * Vista para la TV. Solo incluye la respuesta de la celda abierta, y su imagen, cuando ya fue
 * revelada. Nunca indica qué celdas son Daily Double, y un Daily Double sin apuesta no incluye
 * la pregunta ni sus imágenes. En el Final, ver `projectFinal`.
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
    tvPhase = {
      kind: 'finished',
      ranking: rankTeams(teams),
      ...(phase.finalSkipped && { finalSkipped: phase.finalSkipped }),
    };
  } else if (phase.kind === 'final') {
    const final = finalClueOf(session);
    if (final) tvPhase = projectFinal(phase, final, teams);
  } else if (phase.kind === 'wager') {
    const clue = getClue(board, phase.clueKey);
    if (clue) tvPhase = { kind: 'dailyDouble', clueKey: phase.clueKey, value: clue.value };
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
      const wager = phase.wager;
      const team = wager && teams.find((t) => t.id === wager.teamId);
      tvPhase = {
        kind: 'clue',
        clueKey: phase.clueKey,
        value: clue.value,
        question: clue.question,
        ...image,
        ...(phase.revealed && { answer: clue.answer }),
        ...(wager && team && { dailyDouble: { teamName: team.name, wager: wager.amount } }),
      };
    }
  }

  return { sessionId: session.id, title: board.title, categories, teams, phase: tvPhase };
}

function projectFinal(phase: FinalPhase, final: FinalClue, teams: Team[]): TvFinalPhase {
  const nameOf = (teamId: string) => teams.find((team) => team.id === teamId)?.name ?? '';
  const view: TvFinalPhase = {
    kind: 'final',
    stage: phase.stage,
    category: final.category,
    participants: phase.participants.map((p) => ({ teamId: p.teamId, name: nameOf(p.teamId) })),
    wagersReady: phase.participants.filter((p) => phase.wagers[p.teamId] !== undefined).length,
  };
  // En las apuestas la TV solo ve la categoría y quiénes juegan.
  if (phase.stage === 'wagers') return view;

  view.question = final.question;
  // La imagen de la respuesta no sale hacia la TV hasta que se revela.
  if (phase.answerRevealed && final.answerImageId !== undefined) {
    view.imageId = final.answerImageId;
    view.imageRole = 'answer';
  } else if (final.imageId !== undefined) {
    view.imageId = final.imageId;
    view.imageRole = 'question';
  }
  if (phase.answerRevealed) view.answer = final.answer;

  if (phase.stage === 'clue') {
    if (phase.timerStartedAt !== undefined) {
      view.timerEndsAt = phase.timerStartedAt + FINAL_TIMER_MS;
    }
    return view;
  }

  view.judged = phase.judged.map(({ teamId, correct }) => ({
    teamId,
    name: nameOf(teamId),
    correct,
    wager: phase.wagers[teamId] ?? 0,
    score: teams.find((team) => team.id === teamId)?.score ?? 0,
  }));
  const current = nextFinalTeamId(phase);
  if (current !== undefined) view.currentTeamName = nameOf(current);
  return view;
}
