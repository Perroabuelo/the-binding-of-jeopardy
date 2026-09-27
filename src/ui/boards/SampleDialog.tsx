import { useEffect, useId, useRef } from 'react';
import type { SampleBoard } from '../../domain/samples';
import dialogStyles from '../lib/ConfirmDialog.module.css';
import styles from './SampleDialog.module.css';

interface SampleDialogProps {
  samples: readonly SampleBoard[];
  onChoose: (sample: SampleBoard) => void;
  onCancel: () => void;
}

/** Diálogo modal para elegir un tablero de ejemplo; Escape o "Cancelar" lo cierran. */
export function SampleDialog({ samples, onChoose, onCancel }: SampleDialogProps) {
  const titleId = useId();
  const optionId = useId();
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  return (
    <div className={dialogStyles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={dialogStyles.dialog}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h2 id={titleId}>Crear desde ejemplo</h2>
        <p>Elige un tablero listo para jugar. Se crea una copia que puedes editar.</p>
        <ul className={styles.options}>
          {samples.map((sample, index) => (
            <li key={sample.id}>
              <button
                type="button"
                ref={index === 0 ? firstRef : undefined}
                className={styles.option}
                aria-labelledby={`${optionId}-${sample.id}-titulo`}
                aria-describedby={`${optionId}-${sample.id}-descripcion`}
                onClick={() => onChoose(sample)}
              >
                <span id={`${optionId}-${sample.id}-titulo`} className={styles.title}>
                  {sample.title}
                </span>
                <span id={`${optionId}-${sample.id}-descripcion`} className={styles.description}>
                  {sample.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className={dialogStyles.actions}>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
