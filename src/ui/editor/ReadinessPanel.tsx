import { useId } from 'react';
import type { BoardValidation } from '../../domain/validation';
import { describeMissing } from './missing';
import styles from './ReadinessPanel.module.css';

interface ReadinessPanelProps {
  validation: BoardValidation;
  onPlay: () => void;
}

export function ReadinessPanel({ validation, onPlay }: ReadinessPanelProps) {
  const headingId = useId();
  const missing = describeMissing(validation.missing);
  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          {validation.ready ? 'Listo para jugar' : 'Falta completar'}
        </h2>
        <button type="button" className="primary" disabled={!validation.ready} onClick={onPlay}>
          Jugar
        </button>
      </div>
      {validation.ready ? (
        <p className={styles.ready}>El tablero está completo.</p>
      ) : (
        <ul aria-label="Elementos faltantes" className={styles.list}>
          {missing.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
