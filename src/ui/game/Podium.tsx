import { useId } from 'react';
import type { RankedTeam } from '../../domain/ranking';
import styles from './Podium.module.css';

export interface PodiumProps {
  ranking: RankedTeam[];
  size?: 'normal' | 'tv';
}

/** Podio con posiciones compartidas en empates (las calcula rankTeams). */
export function Podium({ ranking, size = 'normal' }: PodiumProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={size === 'tv' ? styles.tv : ''}>
      <h2 id={headingId} className={styles.heading}>
        Podio
      </h2>
      <ol aria-label="Podio" className={styles.list}>
        {ranking.map(({ team, position }) => (
          <li
            key={team.id}
            className={`${styles.item} ${position === 1 ? styles.first : ''}`}
            aria-label={`Posición ${position}: ${team.name}, ${team.score} puntos`}
          >
            <span className={styles.position}>{position}.º</span>{' '}
            <span className={styles.name}>{team.name}</span>{' '}
            <span className={styles.score}>{team.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
