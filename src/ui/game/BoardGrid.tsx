import type { CSSProperties } from 'react';
import type { ClueKey } from '../../domain/board';
import type { TvView } from '../../domain/game';
import styles from './BoardGrid.module.css';

export interface BoardGridProps {
  categories: TvView['categories'];
  /** Sin `onOpen` el tablero es de solo lectura: no hay botones ni handlers. */
  onOpen?: (key: ClueKey) => void;
  size?: 'normal' | 'tv';
}

export function BoardGrid({ categories, onOpen, size = 'normal' }: BoardGridProps) {
  const rowCount = Math.max(0, ...categories.map((category) => category.clues.length));
  const rows = Array.from({ length: rowCount }, (_, r) => r);
  return (
    <table
      aria-label="Tablero"
      className={`${styles.grid} ${size === 'tv' ? styles.tv : ''}`}
      data-columns={categories.length}
      style={{ '--columns': categories.length } as CSSProperties}
    >
      <thead>
        <tr>
          {categories.map((category, c) => (
            <th key={c} scope="col" className={styles.category}>
              {category.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r}>
            {categories.map((category, c) => {
              const clue = category.clues[r];
              if (!clue) return <td key={c} />;
              const label = `${category.name}, ${clue.value}${clue.used ? ', usada' : ''}`;
              const cellClass = `${styles.cell} ${clue.used ? styles.used : ''}`;
              return (
                <td key={c}>
                  {onOpen ? (
                    <button
                      type="button"
                      className={cellClass}
                      aria-label={label}
                      disabled={clue.used}
                      onClick={() => onOpen(clue.key)}
                    >
                      {clue.used ? '' : clue.value}
                    </button>
                  ) : (
                    <div className={cellClass}>
                      {clue.used ? (
                        <span className={styles.srOnly}>{`${clue.value}, usada`}</span>
                      ) : (
                        clue.value
                      )}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
