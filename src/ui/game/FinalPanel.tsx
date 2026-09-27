import { useId, useState, type FormEvent } from 'react';
import {
  FINAL_TIMER_MS,
  finalClueOf,
  nextFinalTeamId,
  type FinalParticipant,
  type FinalPhase,
  type GameAction,
  type GameSession,
  type Team,
} from '../../domain/game';
import { ClueImage } from './ClueImage';
import { FINAL_MUSIC_URL, useFinalMusic } from './useFinalMusic';
import { secondsLeft, useCountdown } from './useCountdown';
import styles from './FinalPanel.module.css';

interface FinalPanelProps {
  session: GameSession;
  phase: FinalPhase;
  dispatch: (action: GameAction) => void;
}

/** El Final en la vista de operador: apuestas, pista con temporizador y revelación. */
export function FinalPanel({ session, phase, dispatch }: FinalPanelProps) {
  const final = finalClueOf(session);
  const answerId = useId();
  if (!final) return null;
  const teamName = (teamId: string) => session.teams.find((t) => t.id === teamId)?.name ?? '';

  return (
    <section aria-label="Final Jeopardy!" className={styles.panel}>
      <h3 className={styles.heading}>Final Jeopardy!</h3>
      <p className={styles.category}>{`Categoría: ${final.category}`}</p>
      <p className={styles.question}>{final.question}</p>
      <ClueImage imageId={final.imageId} className={styles.image} />
      <section aria-labelledby={answerId} className={styles.answer}>
        <h4 id={answerId}>Respuesta</h4>
        <p>{final.answer}</p>
        <ClueImage
          imageId={final.answerImageId}
          alt="Imagen de la respuesta"
          className={styles.image}
        />
        <p className={styles.muted}>
          {phase.answerRevealed ? 'Revelada en la TV' : 'No revelada: solo la ves tú'}
        </p>
      </section>

      {phase.stage === 'wagers' && (
        <WagersStage session={session} phase={phase} dispatch={dispatch} teamName={teamName} />
      )}
      {phase.stage === 'clue' && (
        <ClueStage session={session} phase={phase} dispatch={dispatch} teamName={teamName} />
      )}
      {phase.stage === 'reveal' && (
        <RevealStage session={session} phase={phase} dispatch={dispatch} teamName={teamName} />
      )}
    </section>
  );
}

interface StageProps {
  session: GameSession;
  phase: FinalPhase;
  dispatch: (action: GameAction) => void;
  teamName: (teamId: string) => string;
}

function WagersStage({ session, phase, dispatch, teamName }: StageProps) {
  const participantIds = new Set(phase.participants.map((p) => p.teamId));
  const outside = session.teams.filter((team) => !participantIds.has(team.id));
  const allReady = phase.participants.every((p) => phase.wagers[p.teamId] !== undefined);

  return (
    <>
      <p className={styles.muted}>
        La TV muestra solo la categoría y quiénes juegan. Anota la apuesta secreta de cada equipo.
      </p>
      <ul aria-label="Apuestas del Final" className={styles.list}>
        {phase.participants.map((participant) => (
          <WagerRow
            key={participant.teamId}
            participant={participant}
            name={teamName(participant.teamId)}
            wager={phase.wagers[participant.teamId]}
            source={
              session.buzzersEnabled
                ? (phase.wagerSources?.[participant.teamId]?.deviceLabel ?? null)
                : undefined
            }
            onSubmit={(amount) =>
              dispatch({ type: 'setFinalWager', teamId: participant.teamId, amount })
            }
          />
        ))}
      </ul>
      {outside.length > 0 && (
        <section aria-label="No participan" className={styles.outside}>
          <h4>No participan</h4>
          <ul>
            {outside.map((team) => (
              <li key={team.id}>{`${team.name} (${team.score} puntos)`}</li>
            ))}
          </ul>
        </section>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className="primary"
          disabled={!allReady}
          onClick={() => dispatch({ type: 'showFinalClue' })}
        >
          Mostrar pista
        </button>
        {!allReady && <p className={styles.muted}>Faltan apuestas por anotar.</p>}
      </div>
    </>
  );
}

function WagerRow({
  participant,
  name,
  wager,
  source,
  onSubmit,
}: {
  participant: FinalParticipant;
  name: string;
  wager: number | undefined;
  /** En un juego con pulsadores: el dispositivo que envió la apuesta, o null si no la envió uno. */
  source?: string | null;
  onSubmit: (amount: number) => void;
}) {
  const inputId = useId();
  const limitId = useId();
  const [draft, setDraft] = useState(wager === undefined ? '' : String(wager));
  const max = participant.entryScore;
  const amount = Number(draft);
  const filled = draft.trim() !== '';
  const valid = filled && Number.isSafeInteger(amount) && amount >= 0 && amount <= max;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) onSubmit(amount);
  }

  return (
    <li aria-label={name}>
      <form className={styles.wager} onSubmit={submit}>
        <label htmlFor={inputId}>{`Apuesta de ${name}`}</label>
        <input
          id={inputId}
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
        <button type="submit" disabled={!valid}>
          {`Anotar apuesta de ${name}`}
        </button>
        <p id={limitId} className={filled && !valid ? styles.error : styles.muted}>
          {filled && !valid
            ? `Apuesta no válida: debe ser un número entero, mínimo 0, máximo ${max}.`
            : `Mínimo 0, máx. ${max}.`}
        </p>
        <p className={styles.status}>
          {wager === undefined ? 'Sin apuesta' : `Apuesta anotada: ${wager}`}
        </p>
        {source !== undefined && (source !== null || wager === undefined) && (
          <p className={styles.muted}>
            {source !== null ? `Enviada desde ${source}` : 'Pendiente'}
          </p>
        )}
      </form>
    </li>
  );
}

function ClueStage({ session, phase, dispatch, teamName }: StageProps) {
  const { timerStartedAt } = phase;
  const started = timerStartedAt !== undefined;
  const remaining = useCountdown(started ? timerStartedAt + FINAL_TIMER_MS : undefined);
  const { attachAudio, muted, toggleMuted, error } = useFinalMusic(
    timerStartedAt,
    remaining !== null && remaining > 0,
  );

  return (
    <>
      <p className={styles.muted}>La TV muestra la pregunta.</p>
      <p className={styles.timer} role="timer" aria-label="Tiempo restante">
        {secondsLeft(remaining ?? FINAL_TIMER_MS)}
      </p>
      {session.buzzersEnabled && (
        // Sin el texto: se lee recién en la revelación, para no decirlo en voz alta por error.
        <ul aria-label="Respuestas desde los celulares" className={styles.list}>
          {phase.participants.map(({ teamId }) => (
            <li key={teamId}>
              {`${teamName(teamId)}: ${phase.answers?.[teamId] ? 'respondió' : 'sin respuesta'}`}
            </li>
          ))}
        </ul>
      )}
      <audio ref={attachAudio} src={FINAL_MUSIC_URL} preload="auto" />
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className="primary"
          onClick={() => dispatch({ type: 'startFinalTimer' })}
        >
          {started ? 'Reiniciar temporizador' : 'Iniciar temporizador'}
        </button>
        <button type="button" onClick={toggleMuted}>
          {muted ? 'Activar música' : 'Silenciar música'}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'startFinalReveal' })}>
          Pasar a la revelación
        </button>
      </div>
    </>
  );
}

function RevealStage({ session, phase, dispatch, teamName }: StageProps) {
  const currentId = nextFinalTeamId(phase);
  const scoreOf = (teamId: string) =>
    session.teams.find((team: Team) => team.id === teamId)?.score ?? 0;

  return (
    <>
      {currentId !== undefined ? (
        <section aria-label={`En turno: ${teamName(currentId)}`} className={styles.current}>
          <h4>{`En turno: ${teamName(currentId)}`}</h4>
          <p>{`Apuesta: ${phase.wagers[currentId] ?? 0}`}</p>
          {phase.answers?.[currentId] && (
            <p className={styles.sentAnswer}>
              {`Respuesta enviada desde ${phase.answers[currentId].deviceLabel}: `}
              <strong>{phase.answers[currentId].text}</strong>
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className="primary"
              onClick={() => dispatch({ type: 'judgeFinal', teamId: currentId, correct: true })}
            >
              Acertó
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => dispatch({ type: 'judgeFinal', teamId: currentId, correct: false })}
            >
              Falló
            </button>
          </div>
        </section>
      ) : (
        <p className={styles.status}>Todos los equipos fueron juzgados.</p>
      )}
      {phase.judged.length > 0 && (
        <ol aria-label="Equipos juzgados" className={styles.list}>
          {phase.judged.map(({ teamId, correct }) => (
            <li key={teamId}>
              {`${teamName(teamId)}: ${correct ? 'acertó' : 'falló'}, apuesta ${
                phase.wagers[teamId] ?? 0
              }, puntaje ${scoreOf(teamId)}`}
            </li>
          ))}
        </ol>
      )}
      <div className={styles.actions}>
        {!phase.answerRevealed && (
          <button type="button" onClick={() => dispatch({ type: 'revealFinalAnswer' })}>
            Mostrar respuesta en la TV
          </button>
        )}
        {currentId === undefined && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'finish' })}>
            Ir al podio
          </button>
        )}
      </div>
    </>
  );
}
