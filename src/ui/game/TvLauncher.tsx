import { useId, useState } from 'react';
import { routeHref } from '../router';
import styles from './TvLauncher.module.css';

export const TV_WINDOW_NAME = 'jeopardy-tv';

/** URL absoluta de la TV, para abrirla o copiarla en otra ventana. */
function tvUrl(sessionId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${routeHref({ name: 'tv', sessionId })}`;
}

export function TvLauncher({ sessionId }: { sessionId: string }) {
  const [blocked, setBlocked] = useState(false);
  const inputId = useId();
  const url = tvUrl(sessionId);

  function openTv() {
    // El nombre fijo reutiliza la misma ventana si ya está abierta.
    const opened = window.open(url, TV_WINDOW_NAME);
    setBlocked(opened === null);
  }

  return (
    <section aria-label="Pantalla de TV" className={styles.launcher}>
      <button type="button" className="primary" onClick={openTv}>
        Abrir pantalla de TV
      </button>
      <div className={styles.url}>
        <label htmlFor={inputId}>Dirección de la pantalla de TV</label>
        <input
          id={inputId}
          type="text"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      {blocked && (
        <p role="alert" className={styles.blocked}>
          El navegador bloqueó la ventana de TV. Permite las ventanas emergentes para este sitio
          (desde el ícono en la barra de direcciones) y vuelve a presionar &quot;Abrir pantalla de
          TV&quot;, o copia la dirección de arriba y ábrela en otra ventana.
        </p>
      )}
    </section>
  );
}
