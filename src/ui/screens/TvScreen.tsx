import { useEffect, useState } from 'react';
import { parseClueKey } from '../../domain/board';
import type { TvView } from '../../domain/game';
import { createBroadcastTransport, createTvSync } from '../../sync';
import { BoardGrid } from '../game/BoardGrid';
import { ClueImage } from '../game/ClueImage';
import { Podium } from '../game/Podium';
import { TeamScores } from '../game/TeamScores';
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
      {phase.kind === 'clue' && <TvClue view={view} phase={phase} />}
      {phase.kind === 'finished' ? (
        <Podium ranking={phase.ranking} size="tv" />
      ) : (
        <TeamScores teams={view.teams} size="tv" />
      )}
    </>
  );
}

type CluePhase = Extract<TvView['phase'], { kind: 'clue' }>;

function TvClue({ view, phase }: { view: TvView; phase: CluePhase }) {
  const position = parseClueKey(phase.clueKey);
  const category = position ? view.categories[position.categoryIndex] : undefined;
  return (
    <section aria-label="Pregunta" className={styles.clue}>
      <p className={styles.clueMeta}>
        {category && <span>{category.name}</span>}
        <span className={styles.value}>{phase.value}</span>
      </p>
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
