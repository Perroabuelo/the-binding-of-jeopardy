import { useId, type KeyboardEvent } from 'react';
import type { Clue } from '../../domain/board';
import type { CluePatch } from './boardEdits';
import styles from './ClueDialog.module.css';

interface ClueDialogProps {
  categoryIndex: number;
  categoryName: string;
  clue: Clue;
  onChange: (patch: CluePatch, options?: { immediate?: boolean }) => void;
  onClose: () => void;
}

export function ClueDialog({
  categoryIndex,
  categoryName,
  clue,
  onChange,
  onClose,
}: ClueDialogProps) {
  const titleId = useId();
  const questionId = useId();
  const answerId = useId();

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className={styles.overlay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className={styles.title}>
          Categoría {categoryIndex + 1}, {clue.value}
        </h2>
        {categoryName.trim() !== '' && <p className={styles.subtitle}>{categoryName}</p>}

        <label htmlFor={questionId}>Pregunta</label>
        <textarea
          id={questionId}
          rows={3}
          autoFocus
          value={clue.question}
          onChange={(e) => onChange({ question: e.target.value })}
        />

        <label htmlFor={answerId}>Respuesta</label>
        <textarea
          id={answerId}
          rows={2}
          value={clue.answer}
          onChange={(e) => onChange({ answer: e.target.value })}
        />

        <div className={styles.actions}>
          <button type="button" className="primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
