import { useId, type KeyboardEvent } from 'react';
import type { Clue } from '../../domain/board';
import type { CluePatch } from './boardEdits';
import { ClueImageField } from './ClueImageField';
import styles from './ClueDialog.module.css';

interface ClueDialogProps {
  categoryIndex: number;
  categoryName: string;
  clue: Clue;
  onChange: (patch: CluePatch) => void;
  /** Cambian la imagen y guardan de inmediato; resuelven si el guardado tuvo éxito. */
  onImageChange: (imageId: string | undefined) => Promise<boolean>;
  onAnswerImageChange: (imageId: string | undefined) => Promise<boolean>;
  onClose: () => void;
}

export function ClueDialog({
  categoryIndex,
  categoryName,
  clue,
  onChange,
  onImageChange,
  onAnswerImageChange,
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
        <ClueImageField
          label="Imagen de la pregunta"
          imageId={clue.imageId}
          onImageChange={onImageChange}
        />

        <label htmlFor={answerId} className={styles.section}>
          Respuesta
        </label>
        <textarea
          id={answerId}
          rows={2}
          value={clue.answer}
          onChange={(e) => onChange({ answer: e.target.value })}
        />

        <ClueImageField
          label="Imagen de la respuesta"
          imageId={clue.answerImageId}
          onImageChange={onAnswerImageChange}
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
