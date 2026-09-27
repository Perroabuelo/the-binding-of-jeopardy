import { useEffect, useState } from 'react';
import { boardBackup, type BoardBackup } from './boardBackup';
import styles from './BackupNotice.module.css';

/** Aviso no bloqueante cuando falla un respaldo en disco: se puede seguir editando. */
export function BackupNotice({ backup = boardBackup }: { backup?: BoardBackup }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => backup.onFailure(setMessage), [backup]);

  if (!message) return null;
  return (
    <div role="alert" className={styles.notice}>
      <p>{message}</p>
      <button type="button" onClick={() => setMessage(null)}>
        Cerrar aviso
      </button>
    </div>
  );
}
