import { useEffect, useId, useState, type FormEvent } from 'react';
import { allClueKeys, getClue, parseClueKey, type Clue, type ClueKey } from '../../domain/board';
import {
  currentRound,
  gameReducer,
  maxWager,
  type GameAction,
  type GameSession,
} from '../../domain/game';
import { projectForTv } from '../../domain/projection';
import { rankTeams } from '../../domain/ranking';
import { getSession, saveSession } from '../../storage/db';
import { BoardGrid } from '../game/BoardGrid';
import { ClueImage } from '../game/ClueImage';
import { FinalPanel } from '../game/FinalPanel';
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
          <h2 className={styles.title}>{currentRound(session).boardSnapshot.title}</h2>
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
              dailyDoubles={dailyDoubleKeys(session)}
              onOpen={(clueKey) => dispatch({ type: 'openClue', clueKey })}
            />
          )}
          {session.phase.kind === 'wager' && (
            <WagerPanel key={session.phase.clueKey} session={session} dispatch={dispatch} />
          )}
          {session.phase.kind === 'clue' && <CluePanel session={session} dispatch={dispatch} />}
          {session.phase.kind === 'final' && (
            <FinalPanel session={session} phase={session.phase} dispatch={dispatch} />
          )}
          {session.phase.kind === 'finished' && (
            <Podium ranking={rankTeams(session.teams)} finalSkipped={session.phase.finalSkipped} />
          )}
          {session.phase.kind !== 'finished' && !allFinalJudged(session) && (
            <div className={styles.finish}>
              {confirmingFinish ? (
                <div
                  role="alertdialog"
                  aria-labelledby={finishQuestionId}
                  className={styles.confirm}
                >
                  <p id={finishQuestionId}>{finishQuestion(session)}</p>
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

function finishQuestion(session: GameSession): string {
  if (session.phase.kind === 'final') {
    return '¿Terminar el juego ahora? Las apuestas de los equipos sin juzgar no se aplicarán.';
  }
  return `¿Terminar el juego ahora? Quedan ${pendingCount(session)} preguntas sin usar.`;
}

/** En la revelación con todos juzgados se va al podio con "Ir al podio". */
function allFinalJudged(session: GameSession): boolean {
  const { phase } = session;
  return phase.kind === 'final' && phase.judged.length === phase.participants.length;
}

function pendingCount(session: GameSession): number {
  const total = currentRound(session).boardSnapshot.categories.reduce(
    (n, c) => n + c.clues.length,
    0,
  );
  return total - session.usedClues.length;
}

function dailyDoubleKeys(session: GameSession): Set<ClueKey> {
  const board = currentRound(session).boardSnapshot;
  return new Set(allClueKeys(board).filter((key) => getClue(board, key)?.dailyDouble === true));
}

interface OpenClue {
  clue: Clue;
  categoryName: string | undefined;
}

function findOpenClue(session: GameSession, key: ClueKey): OpenClue | null {
  const board = currentRound(session).boardSnapshot;
  const clue = getClue(board, key);
  const position = parseClueKey(key);
  if (!clue || !position) return null;
  return { clue, categoryName: board.categories[position.categoryIndex]?.name };
}

/** Pregunta, respuesta y sus imágenes, que solo ve el operador. */
function ClueDetails({ clue, categoryName, answerState }: OpenClue & { answerState: string }) {
  const answerId = useId();
  return (
    <>
      <p className={styles.clueMeta}>
        <span>{categoryName}</span> · <span>{`Valor: ${clue.value}`}</span>
      </p>
      <p className={styles.question}>{clue.question}</p>
      <ClueImage imageId={clue.imageId} className={styles.image} />
      <section aria-labelledby={answerId} className={styles.answer}>
        <h3 id={answerId}>Respuesta</h3>
        <p>{clue.answer}</p>
        <ClueImage
          imageId={clue.answerImageId}
          alt="Imagen de la respuesta"
          className={styles.image}
        />
        <p className={styles.revealState}>{answerState}</p>
      </section>
    </>
  );
}

function WagerPanel({
  session,
  dispatch,
}: {
  session: GameSession;
  dispatch: (action: GameAction) => void;
}) {
  const teamSelectId = useId();
  const amountId = useId();
  const limitId = useId();
  const [teamId, setTeamId] = useState(session.teams[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const { phase } = session;
  if (phase.kind !== 'wager') return null;
  const open = findOpenClue(session, phase.clueKey);
  if (!open) return null;

  // Se recalcula con cada cambio de equipo o de puntaje; el reducer valida con la misma función.
  const max = maxWager(session, teamId);
  const amount = Number(draft);
  const filled = draft.trim() !== '';
  const valid = filled && Number.isSafeInteger(amount) && amount >= 0 && amount <= max;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) dispatch({ type: 'placeWager', teamId, amount });
  }

  return (
    <section aria-label="Daily Double" className={styles.clue}>
      <h3 className={styles.dailyDouble}>Daily Double</h3>
      <ClueDetails {...open} answerState="La TV muestra el anuncio, sin la pregunta" />
      <form className={styles.wager} onSubmit={submit}>
        <label htmlFor={teamSelectId}>Equipo que responde</label>
        <select id={teamSelectId} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {session.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <label htmlFor={amountId}>Apuesta</label>
        <input
          id={amountId}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={draft}
          aria-describedby={limitId}
          aria-invalid={filled && !valid}
          onChange={(e) => setDraft(e.target.value)}
        />
        <p id={limitId} className={filled && !valid ? styles.wagerError : styles.wagerLimit}>
          {filled && !valid
            ? `Apuesta no válida: debe ser un número entero, mínimo 0, máximo ${max}.`
            : `Mínimo 0, máximo ${max}.`}
        </p>
        <div className={styles.actions}>
          <button type="submit" className="primary" disabled={!valid}>
            Registrar apuesta
          </button>
          <button type="button" onClick={() => dispatch({ type: 'backToBoard' })}>
            Volver al tablero
          </button>
        </div>
      </form>
    </section>
  );
}

function CluePanel({
  session,
  dispatch,
}: {
  session: GameSession;
  dispatch: (action: GameAction) => void;
}) {
  const { phase } = session;
  if (phase.kind !== 'clue') return null;
  const open = findOpenClue(session, phase.clueKey);
  if (!open) return null;
  const { wager } = phase;
  const wagerTeam = wager && session.teams.find((team) => team.id === wager.teamId);
  // En un Daily Double solo suma o resta el equipo que apostó, y lo que apostó.
  const awardTeams = wager
    ? session.teams.filter((team) => team.id === wager.teamId)
    : session.teams;
  const points = wager ? wager.amount : open.clue.value;

  return (
    <section aria-label="Pregunta abierta" className={styles.clue}>
      {wager && (
        <p className={styles.dailyDouble}>
          {`Daily Double: ${wagerTeam?.name ?? ''} apuesta ${wager.amount}`}
        </p>
      )}
      <ClueDetails
        {...open}
        answerState={phase.revealed ? 'Revelada en la TV' : 'No revelada: solo la ves tú'}
      />
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
        {awardTeams.map((team) => (
          <li key={team.id} className={styles.award}>
            <span>{team.name}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'award', teamId: team.id, direction: 1 })}
            >
              {`Sumar ${points} a ${team.name}`}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => dispatch({ type: 'award', teamId: team.id, direction: -1 })}
            >
              {`Restar ${points} a ${team.name}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
