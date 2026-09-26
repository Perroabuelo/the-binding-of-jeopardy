import { useId, useRef, useState } from 'react';
import { addCategory, moveCategory } from '../../domain/board';
import { validateBoard } from '../../domain/validation';
import { BoardGrid } from '../editor/BoardGrid';
import { ClueDialog } from '../editor/ClueDialog';
import { ReadinessPanel } from '../editor/ReadinessPanel';
import { withCategoryName, withClue, withTitle, type CluePatch } from '../editor/boardEdits';
import { useBoardEditor, type SaveStatus } from '../editor/useBoardEditor';
import { navigate, routeHref } from '../router';
import styles from './EditorScreen.module.css';

const SAVE_STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Guardando…',
  saved: 'Cambios guardados',
  error: '',
};

interface OpenCell {
  categoryIndex: number;
  rowIndex: number;
}

export function EditorScreen({ boardId }: { boardId: string }) {
  const { load, saveStatus, saveError, update, flush } = useBoardEditor(boardId);
  const [openCell, setOpenCell] = useState<OpenCell | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  function closeDialog() {
    setOpenCell(null);
    void flush();
    returnFocusRef.current?.focus();
  }

  function changeClue(cell: OpenCell, patch: CluePatch) {
    update((board) => withClue(board, cell.categoryIndex, cell.rowIndex, patch));
  }

  let content;
  if (load.status === 'loading') {
    content = <p>Cargando tablero…</p>;
  } else if (load.status === 'notFound') {
    content = (
      <p>
        No se encontró el tablero.{' '}
        <a href={routeHref({ name: 'boards' })}>Ir a la lista de tableros</a>
      </p>
    );
  } else if (load.status === 'error') {
    content = <p role="alert">{load.message}</p>;
  } else {
    const { board } = load;
    const category = openCell ? board.categories[openCell.categoryIndex] : undefined;
    const clue = openCell ? category?.clues[openCell.rowIndex] : undefined;
    content = (
      <>
        {saveError && <p role="alert">{saveError}</p>}
        <p role="status" className={styles.status}>
          {SAVE_STATUS_TEXT[saveStatus]}
        </p>

        <div className={styles.titleField}>
          <label htmlFor={titleId}>Título del tablero</label>
          <input
            id={titleId}
            className={styles.titleInput}
            value={board.title}
            onChange={(e) => {
              const title = e.target.value;
              update((b) => withTitle(b, title));
            }}
          />
        </div>

        <BoardGrid
          board={board}
          onRenameCategory={(c, name) => update((b) => withCategoryName(b, c, name))}
          onOpenClue={(categoryIndex, rowIndex, event) => {
            returnFocusRef.current = event.currentTarget;
            setOpenCell({ categoryIndex, rowIndex });
          }}
          onAddCategory={() => update(addCategory)}
          onMoveCategory={(from, to) => update((b) => moveCategory(b, from, to))}
        />

        <ReadinessPanel
          validation={validateBoard(board)}
          onPlay={async () => {
            // Si falla el guardado queda el aviso y no se juega con una versión vieja.
            if (await flush()) navigate({ name: 'teamSetup', boardId: board.id });
          }}
        />

        {openCell && category && clue && (
          <ClueDialog
            categoryIndex={openCell.categoryIndex}
            categoryName={category.name}
            clue={clue}
            onChange={(patch) => changeClue(openCell, patch)}
            onImageChange={(imageId) => {
              changeClue(openCell, { imageId });
              return flush();
            }}
            onAnswerImageChange={(answerImageId) => {
              changeClue(openCell, { answerImageId });
              return flush();
            }}
            onClose={closeDialog}
          />
        )}
      </>
    );
  }

  return (
    <main className="screen">
      <a href={routeHref({ name: 'boards' })}>← Tableros</a>
      <h1>Editar tablero</h1>
      {content}
    </main>
  );
}
