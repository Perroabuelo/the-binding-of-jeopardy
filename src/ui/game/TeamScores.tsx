import { useState, type CSSProperties, type FormEvent } from 'react';
import type { Team } from '../../domain/game';
import styles from './TeamScores.module.css';

export interface TeamScoresProps {
  teams: Team[];
  /** Sin `onSetScore` los puntajes son de solo lectura. */
  onSetScore?: (teamId: string, score: number) => void;
  size?: 'normal' | 'tv';
}

export function TeamScores({ teams, onSetScore, size = 'normal' }: TeamScoresProps) {
  return (
    <ul
      aria-label="Puntajes"
      className={`${styles.list} ${size === 'tv' ? styles.tv : ''}`}
      // En la TV la letra se achica según la cantidad de equipos, para que quepan en una fila.
      style={size === 'tv' ? ({ '--teams': teams.length } as CSSProperties) : undefined}
    >
      {teams.map((team) => (
        <li key={team.id} className={styles.team} aria-label={`${team.name}: ${team.score} puntos`}>
          <span className={styles.name}>{team.name}</span>
          <span className={`${styles.score} ${team.score < 0 ? styles.negative : ''}`}>
            {team.score}
          </span>
          {onSetScore && <ScoreEditor team={team} onSetScore={onSetScore} />}
        </li>
      ))}
    </ul>
  );
}

function ScoreEditor({
  team,
  onSetScore,
}: {
  team: Team;
  onSetScore: (teamId: string, score: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        className={styles.edit}
        onClick={() => {
          setDraft(String(team.score));
          setError(null);
        }}
      >
        {`Editar puntaje de ${team.name}`}
      </button>
    );
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const score = Number(draft);
    if ((draft ?? '').trim() === '' || !Number.isSafeInteger(score)) {
      setError('El puntaje debe ser un número entero.');
      return;
    }
    onSetScore(team.id, score);
    setDraft(null);
  }

  const inputId = `score-${team.id}`;
  return (
    <form className={styles.editor} onSubmit={save} noValidate>
      <label htmlFor={inputId}>{`Nuevo puntaje de ${team.name}`}</label>
      <input
        id={inputId}
        type="number"
        step={100}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className="primary">
        {`Guardar puntaje de ${team.name}`}
      </button>
      <button type="button" onClick={() => setDraft(null)}>
        Cancelar
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
