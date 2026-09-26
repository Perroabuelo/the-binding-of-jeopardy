import { useEffect, useState } from 'react';
import { parseClueKey } from '../../domain/board';
import { FINAL_TIMER_MS, type TvFinalPhase, type TvView } from '../../domain/game';
import { createBroadcastTransport, createTvSync } from '../../sync';
import { BoardGrid } from '../game/BoardGrid';
import { ClueImage } from '../game/ClueImage';
import { Podium } from '../game/Podium';
import { TeamScores } from '../game/TeamScores';
import { secondsLeft, useCountdown } from '../game/useCountdown';
import styles from './TvScreen.module.css';

/**
 * Presentación de solo lectura: dibuja SOLO a partir de la TvView que publica el operador,
 * que nunca trae respuestas sin revelar. No hay controles que cambien el juego.
 */
export function TvScreen({ sessionId }: { sessionId: string }) {
  const [view, setView] = useState<TvView | null>(null);

  useEffect(() => {
    const transport = createBroadcastTransport(sessionId);
    const sync = createTvSync(transport, {
      onView: setView,
      onWaiting: () => setView(null),
    });
    return () => {
      sync.dispose();
      transport.close();
    };
  }, [sessionId]);

  return (
    <main className={styles.tv} data-session-id={sessionId}>
      <h1 className={styles.srOnly}>Pantalla de TV</h1>
      {view ? <TvContent view={view} /> : <Waiting />}
    </main>
  );
}

function Waiting() {
  return (
    <div className={styles.waiting}>
      <p role="status">Esperando al operador…</p>
    </div>
  );
}

function TvContent({ view }: { view: TvView }) {
  const { phase } = view;
  return (
    <>
      <h2 className={styles.title}>{view.title}</h2>
      {phase.kind === 'board' && <BoardGrid categories={view.categories} size="tv" />}
      {phase.kind === 'dailyDouble' && <TvDailyDouble view={view} phase={phase} />}
      {phase.kind === 'clue' && <TvClue view={view} phase={phase} />}
      {phase.kind === 'final' && <TvFinal phase={phase} />}
      {phase.kind === 'finished' ? (
        <Podium ranking={phase.ranking} size="tv" finalSkipped={phase.finalSkipped} />
      ) : (
        <TeamScores teams={view.teams} size="tv" />
      )}
    </>
  );
}

type CluePhase = Extract<TvView['phase'], { kind: 'clue' }>;
type DailyDoublePhase = Extract<TvView['phase'], { kind: 'dailyDouble' }>;

function categoryName(view: TvView, key: string): string | undefined {
  const position = parseClueKey(key);
  return position ? view.categories[position.categoryIndex]?.name : undefined;
}

/** Anuncio del Daily Double: la vista no trae la pregunta hasta que se registra la apuesta. */
function TvDailyDouble({ view, phase }: { view: TvView; phase: DailyDoublePhase }) {
  const category = categoryName(view, phase.clueKey);
  return (
    <section aria-label="Daily Double" className={styles.clue}>
      <p className={styles.dailyDouble}>DAILY DOUBLE!</p>
      <p className={styles.clueMeta}>
        {category !== undefined && <span>{category}</span>}
        <span className={styles.value}>{phase.value}</span>
      </p>
    </section>
  );
}

function TvClue({ view, phase }: { view: TvView; phase: CluePhase }) {
  const category = categoryName(view, phase.clueKey);
  return (
    <section aria-label="Pregunta" className={styles.clue}>
      <p className={styles.clueMeta}>
        {category !== undefined && <span>{category}</span>}
        <span className={styles.value}>{phase.value}</span>
      </p>
      {phase.dailyDouble && (
        <p className={styles.wager}>
          {`${phase.dailyDouble.teamName} apuesta ${phase.dailyDouble.wager}`}
        </p>
      )}
      <p className={styles.question}>{phase.question}</p>
      <ClueImage
        imageId={phase.imageId}
        alt={phase.imageRole === 'answer' ? 'Imagen de la respuesta' : 'Imagen de la pregunta'}
        className={styles.image}
      />
      {phase.answer !== undefined && (
        <section aria-label="Respuesta" className={styles.answer}>
          <p>{phase.answer}</p>
        </section>
      )}
    </section>
  );
}

/** El Final: la vista trae solo lo que la etapa permite mostrar. */
function TvFinal({ phase }: { phase: TvFinalPhase }) {
  return (
    <section aria-label="Final Jeopardy!" className={styles.clue}>
      <p className={styles.finalTitle}>FINAL JEOPARDY!</p>
      <p className={styles.clueMeta}>{phase.category}</p>
      {phase.stage === 'wagers' && (
        <>
          <p className={styles.wager}>
            {`Juegan: ${phase.participants.map((p) => p.name).join(', ')}`}
          </p>
          <p className={styles.finalStatus}>
            {`Apuestas anotadas: ${phase.wagersReady} de ${phase.participants.length}`}
          </p>
        </>
      )}
      {phase.question !== undefined && <p className={styles.question}>{phase.question}</p>}
      <ClueImage
        imageId={phase.imageId}
        alt={phase.imageRole === 'answer' ? 'Imagen de la respuesta' : 'Imagen de la pregunta'}
        className={styles.image}
      />
      {phase.stage === 'clue' && phase.timerEndsAt !== undefined && (
        <TvCountdown endsAt={phase.timerEndsAt} />
      )}
      {phase.answer !== undefined && (
        <section aria-label="Respuesta" className={styles.answer}>
          <p>{phase.answer}</p>
        </section>
      )}
      {phase.stage === 'reveal' && (
        <>
          {phase.judged && phase.judged.length > 0 && (
            <ol aria-label="Resultados del Final" className={styles.judged}>
              {phase.judged.map((team) => (
                <li key={team.teamId}>
                  {`${team.name}: ${team.correct ? 'acertó' : 'falló'} · apuesta ${team.wager} · ${team.score} puntos`}
                </li>
              ))}
            </ol>
          )}
          {phase.currentTeamName !== undefined && (
            <p className={styles.wager}>{`En turno: ${phase.currentTeamName}`}</p>
          )}
        </>
      )}
    </section>
  );
}

function TvCountdown({ endsAt }: { endsAt: number }) {
  const remaining = useCountdown(endsAt);
  return (
    <p className={styles.countdown} role="timer" aria-label="Tiempo restante">
      {secondsLeft(remaining ?? FINAL_TIMER_MS)}
    </p>
  );
}
