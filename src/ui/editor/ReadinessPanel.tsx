import { useId } from 'react';
import type { FinalClue } from '../../domain/board';
import { isFinalComplete, type BoardValidation } from '../../domain/validation';
import { describeMissing } from './missing';
import styles from './ReadinessPanel.module.css';

interface ReadinessPanelProps {
  validation: BoardValidation;
  final: FinalClue | undefined;
  onPlay: () => void;
}

function finalStatusText(final: FinalClue | undefined): string {
  if (!final) return 'Pista final: sin pista final (es opcional).';
  if (isFinalComplete(final)) return 'Pista final: completa.';
  return 'Pista final: incompleta. Falta la categoría, la pregunta o la respuesta para jugar el Final.';
}

export function ReadinessPanel({ validation, final, onPlay }: ReadinessPanelProps) {
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
      <p className={styles.final}>{finalStatusText(final)}</p>
    </section>
  );
}
