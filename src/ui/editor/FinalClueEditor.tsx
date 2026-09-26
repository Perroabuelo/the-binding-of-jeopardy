import { useId } from 'react';
import type { FinalClue } from '../../domain/board';
import type { FinalPatch } from './boardEdits';
import { ClueImageField } from './ClueImageField';
import styles from './FinalClueEditor.module.css';

interface FinalClueEditorProps {
  final: FinalClue | undefined;
  onChange: (patch: FinalPatch) => void;
  /** Cambian la imagen y guardan de inmediato; resuelven si el guardado tuvo éxito. */
  onImageChange: (imageId: string | undefined) => Promise<boolean>;
  onAnswerImageChange: (imageId: string | undefined) => Promise<boolean>;
}

export function FinalClueEditor({
  final,
  onChange,
  onImageChange,
  onAnswerImageChange,
}: FinalClueEditorProps) {
  const headingId = useId();
  const categoryId = useId();
  const questionId = useId();
  const answerId = useId();

  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <h2 id={headingId} className={styles.heading}>
        Pista final
      </h2>
      <p className={styles.hint}>
        Opcional. Con la pista final completa se puede jugar el Final Jeopardy! al terminar el
        tablero.
      </p>

      <label htmlFor={categoryId}>Categoría de la pista final</label>
      <input
        id={categoryId}
        value={final?.category ?? ''}
        onChange={(e) => onChange({ category: e.target.value })}
      />

      <label htmlFor={questionId} className={styles.section}>
        Pregunta de la pista final
      </label>
      <textarea
        id={questionId}
        rows={3}
        value={final?.question ?? ''}
        onChange={(e) => onChange({ question: e.target.value })}
      />
      <ClueImageField
        label="Imagen de la pregunta final"
        imageId={final?.imageId}
        onImageChange={onImageChange}
      />

      <label htmlFor={answerId} className={styles.section}>
        Respuesta de la pista final
      </label>
      <textarea
        id={answerId}
        rows={2}
        value={final?.answer ?? ''}
        onChange={(e) => onChange({ answer: e.target.value })}
      />
      <ClueImageField
        label="Imagen de la respuesta final"
        imageId={final?.answerImageId}
        onImageChange={onAnswerImageChange}
      />
    </section>
  );
}
