import { useEffect, useId, useRef, type CSSProperties, type MouseEvent } from 'react';
import { MAX_CATEGORIES, MIN_CATEGORIES, type Board } from '../../domain/board';
import { isClueComplete } from './boardEdits';
import styles from './BoardGrid.module.css';

type Direction = 'left' | 'right';

interface BoardGridProps {
  board: Board;
  onRenameCategory: (categoryIndex: number, name: string) => void;
  onOpenClue: (
    categoryIndex: number,
    rowIndex: number,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  onAddCategory: () => void;
  onMoveCategory: (from: number, to: number) => void;
  onRemoveCategory: (categoryIndex: number) => void;
}

export function BoardGrid({
  board,
  onRenameCategory,
  onOpenClue,
  onAddCategory,
  onMoveCategory,
  onRemoveCategory,
}: BoardGridProps) {
  const idPrefix = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAfterMoveRef = useRef<{ index: number; dir: Direction } | null>(null);
  const columns = board.categories.length;

  // Las columnas usan el índice como key, así que el foco se lleva a mano a la columna movida.
  // Si la flecha quedó deshabilitada en el extremo, el foco pasa a la otra flecha.
  useEffect(() => {
    if (!focusAfterMoveRef.current) return;
    const { index, dir } = focusAfterMoveRef.current;
    focusAfterMoveRef.current = null;
    const other: Direction = dir === 'left' ? 'right' : 'left';
    const find = (d: Direction) =>
      gridRef.current?.querySelector<HTMLButtonElement>(
        `[data-column="${index}"][data-move="${d}"]:not(:disabled)`,
      );
    (find(dir) ?? find(other))?.focus();
  });

  function move(c: number, dir: Direction) {
    const to = dir === 'left' ? c - 1 : c + 1;
    focusAfterMoveRef.current = { index: to, dir };
    onMoveCategory(c, to);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <div
          ref={gridRef}
          className={styles.grid}
          style={{ '--columns': columns } as CSSProperties}
        >
          {board.categories.map((category, c) => {
            const inputId = `${idPrefix}-category-${c}`;
            return (
              <div key={c} className={styles.column}>
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.tool}
                    data-column={c}
                    data-move="left"
                    aria-label={`Mover categoría ${c + 1} a la izquierda`}
                    disabled={c === 0}
                    onClick={() => move(c, 'left')}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    data-column={c}
                    data-move="right"
                    aria-label={`Mover categoría ${c + 1} a la derecha`}
                    disabled={c === columns - 1}
                    onClick={() => move(c, 'right')}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label={`Quitar categoría ${c + 1}`}
                    disabled={columns <= MIN_CATEGORIES}
                    onClick={() => onRemoveCategory(c)}
                  >
                    Quitar
                  </button>
                </div>
                <label htmlFor={inputId} className={styles.categoryLabel}>
                  Nombre de la categoría {c + 1}
                </label>
                <input
                  id={inputId}
                  className={styles.categoryName}
                  value={category.name}
                  onChange={(e) => onRenameCategory(c, e.target.value)}
                />
                {category.clues.map((clue, r) => {
                  const complete = isClueComplete(clue);
                  return (
                    <button
                      key={r}
                      type="button"
                      className={complete ? styles.cell : `${styles.cell} ${styles.incomplete}`}
                      aria-label={`Categoría ${c + 1}, ${clue.value}, ${complete ? 'completa' : 'incompleta'}`}
                      onClick={(event) => onOpenClue(c, r, event)}
                    >
                      <span className={styles.value}>{clue.value}</span>
                      <span className={styles.state} aria-hidden="true">
                        {complete ? '✓ Completa' : 'Incompleta'}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <button type="button" disabled={columns >= MAX_CATEGORIES} onClick={onAddCategory}>
        Agregar categoría
      </button>
    </div>
  );
}
