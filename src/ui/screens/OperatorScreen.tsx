import { useEffect, useId, useState } from 'react';
import { getClue, parseClueKey } from '../../domain/board';
import { gameReducer, type GameAction, type GameSession } from '../../domain/game';
import { projectForTv } from '../../domain/projection';
import { rankTeams } from '../../domain/ranking';
import { getSession, saveSession } from '../../storage/db';
import { BoardGrid } from '../game/BoardGrid';
import { ClueImage } from '../game/ClueImage';
import { Podium } from '../game/Podium';
import { TeamScores } from '../game/TeamScores';
import { TvLauncher } from '../game/TvLauncher';
import { useOperatorSync } from '../game/useOperatorSync';
import { routeHref } from '../router';
import styles from './OperatorScreen.module.css';

type SessionState =
  { status: 'loading' } | { status: 'missing' } | { status: 'loaded'; session: GameSession };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function OperatorScreen({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const finishQuestionId = useId();

  useEffect(() => {
    let cancelled = false;
    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        setState(session ? { status: 'loaded', session } : { status: 'missing' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({ status: 'missing' });
        setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const session = state.status === 'loaded' ? state.session : null;
  useOperatorSync(sessionId, session);

  function dispatch(action: GameAction) {
    if (!session) return;
    const next = gameReducer(session, action, Date.now());
    if (next === session) return;
    setState({ status: 'loaded', session: next });
    // Se guarda en cada cambio: una recarga reanuda en el mismo punto.
    saveSession(next).catch((e: unknown) => setError(errorMessage(e)));
  }

  return (
    <main className="screen" data-session-id={sessionId}>
      <a href={routeHref({ name: 'boards' })}>← Tableros</a>
      <h1>Operador</h1>
      {error && <p role="alert">{error}</p>}
      {state.status === 'missing' && !error && (
        <p role="alert">
          No se encontró el juego. Puede que se haya borrado o que el enlace esté mal.
        </p>
      )}
      {session && (
        <>
          <h2 className={styles.title}>{session.boardSnapshot.title}</h2>
          <TvLauncher sessionId={sessionId} />
          {session.phase.kind !== 'finished' && (
            <section aria-label="Equipos" className={styles.section}>
              <TeamScores
                teams={session.teams}
                onSetScore={(teamId, score) => dispatch({ type: 'setScore', teamId, score })}
              />
            </section>
          )}
          {session.phase.kind === 'board' && (
            <BoardGrid
              categories={projectForTv(session).categories}
              onOpen={(clueKey) => dispatch({ type: 'openClue', clueKey })}
            />
          )}
          {session.phase.kind === 'clue' && <CluePanel session={session} dispatch={dispatch} />}
          {session.phase.kind === 'finished' && <Podium ranking={rankTeams(session.teams)} />}
          {session.phase.kind !== 'finished' && (
            <div className={styles.finish}>
              {confirmingFinish ? (
                <div
                  role="alertdialog"
                  aria-labelledby={finishQuestionId}
                  className={styles.confirm}
                >
                  <p id={finishQuestionId}>
                    {`¿Terminar el juego ahora? Quedan ${pendingCount(session)} preguntas sin usar.`}
                  </p>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setConfirmingFinish(false);
                      dispatch({ type: 'finish' });
                    }}
                  >
                    Sí, terminar
                  </button>
                  <button type="button" onClick={() => setConfirmingFinish(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className="danger" onClick={() => setConfirmingFinish(true)}>
                  Terminar juego
                </button>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function pendingCount(session: GameSession): number {
  const total = session.boardSnapshot.categories.reduce((n, c) => n + c.clues.length, 0);
  return total - session.usedClues.length;
}

function CluePanel({
  session,
  dispatch,
}: {
  session: GameSession;
  dispatch: (action: GameAction) => void;
}) {
  const answerId = useId();
  const { phase } = session;
  if (phase.kind !== 'clue') return null;
  const clue = getClue(session.boardSnapshot, phase.clueKey);
  const position = parseClueKey(phase.clueKey);
  if (!clue || !position) return null;
  const category = session.boardSnapshot.categories[position.categoryIndex];

  return (
    <section aria-label="Pregunta abierta" className={styles.clue}>
      <p className={styles.clueMeta}>
        <span>{category?.name}</span> · <span>{`Valor: ${clue.value}`}</span>
      </p>
      <p className={styles.question}>{clue.question}</p>
      <ClueImage imageId={clue.imageId} className={styles.image} />
      <section aria-labelledby={answerId} className={styles.answer}>
        <h3 id={answerId}>Respuesta</h3>
        <p>{clue.answer}</p>
        <p className={styles.revealState}>
          {phase.revealed ? 'Revelada en la TV' : 'No revelada: solo la ves tú'}
        </p>
      </section>
      <div className={styles.actions}>
        {!phase.revealed && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'reveal' })}>
            Revelar respuesta
          </button>
        )}
        <button type="button" onClick={() => dispatch({ type: 'backToBoard' })}>
          Volver al tablero
        </button>
      </div>
      <ul aria-label="Asignar puntos" className={styles.awards}>
        {session.teams.map((team) => (
          <li key={team.id} className={styles.award}>
            <span>{team.name}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'award', teamId: team.id, direction: 1 })}
            >
              {`Sumar ${clue.value} a ${team.name}`}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => dispatch({ type: 'award', teamId: team.id, direction: -1 })}
            >
              {`Restar ${clue.value} a ${team.name}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
