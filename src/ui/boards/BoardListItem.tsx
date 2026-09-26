import type { Board } from '../../domain/board';
import { routeHref } from '../router';
import styles from './BoardListItem.module.css';
import { boardDisplayTitle, formatUpdatedAt } from './format';

interface BoardListItemProps {
  board: Board;
  onExport: (board: Board) => void;
  onDelete: (board: Board) => void;
}

export function BoardListItem({ board, onExport, onDelete }: BoardListItemProps) {
  const title = boardDisplayTitle(board);
  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <a className={styles.title} href={routeHref({ name: 'editor', boardId: board.id })}>
          {title}
        </a>
        <span className={styles.date}>
          Modificado el{' '}
          <time dateTime={new Date(board.updatedAt).toISOString()}>
            {formatUpdatedAt(board.updatedAt)}
          </time>
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" aria-label={`Exportar ${title}`} onClick={() => onExport(board)}>
          Exportar
        </button>
        <button
          type="button"
          className="danger"
          aria-label={`Eliminar ${title}`}
          onClick={() => onDelete(board)}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}
