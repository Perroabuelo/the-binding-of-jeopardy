import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getDesktopApi, type DesktopApi, type LanStatus } from '../../platform/desktop';
import { numberDeviceLabels } from './labels';
import { qrPath } from './qr';
import styles from './ConnectDevicesPanel.module.css';

/** Botón "Conectar dispositivos": solo existe en la app de escritorio. */
export function ConnectDevicesButton() {
  const desktop = getDesktopApi();
  const [open, setOpen] = useState(false);
  if (!desktop) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Conectar dispositivos
      </button>
      {open && <ConnectDevicesPanel desktop={desktop} onClose={() => setOpen(false)} />}
    </>
  );
}

function QrCode({ url }: { url: string }) {
  const { size, d } = useMemo(() => qrPath(url), [url]);
  // Margen de 4 módulos, como pide el estándar para que los lectores lo reconozcan.
  const margin = 4;
  const side = size + margin * 2;
  return (
    <svg
      role="img"
      aria-label={`Código QR de ${url}`}
      className={styles.qr}
      viewBox={`${-margin} ${-margin} ${side} ${side}`}
      shapeRendering="crispEdges"
    >
      <rect x={-margin} y={-margin} width={side} height={side} className={styles.qrLight} />
      <path d={d} className={styles.qrDark} data-testid="qr-modules" />
    </svg>
  );
}

function ConnectionHelp() {
  return (
    <details className={styles.help}>
      <summary>¿No se conectan?</summary>
      <ul>
        <li>
          <strong>Firewall de Windows:</strong> la primera vez que se abre la app, Windows pregunta
          si permite que use la red. Si se eligió &quot;Cancelar&quot;, abre &quot;Permitir una
          aplicación a través del Firewall de Windows&quot; y marca The Binding of Jeopardy en redes
          privadas.
        </li>
        <li>
          <strong>Misma red:</strong> el celular tiene que estar en la misma red wifi que este
          equipo, no con datos móviles.
        </li>
        <li>
          <strong>Redes de invitados:</strong> muchas redes de invitados aíslan a los dispositivos
          entre sí y no dejan que se conecten. Usa la red principal del router.
        </li>
      </ul>
    </details>
  );
}

function PublicNetworkWarning() {
  return (
    <div role="alert" className={styles.warning}>
      <p>
        Windows tiene esta red marcada como <strong>Pública</strong>: el firewall puede bloquear a
        los celulares. Para cambiarla a Privada:
      </p>
      <ol>
        <li>Abre Configuración → Red e Internet.</li>
        <li>Entra en Wi-Fi (o Ethernet) y elige la red a la que estás conectado.</li>
        <li>En &quot;Tipo de perfil de red&quot;, elige Privada.</li>
      </ol>
    </div>
  );
}

interface ConnectDevicesPanelProps {
  desktop: DesktopApi;
  onClose: () => void;
}

/** Dirección y QR para que los celulares se unan, con la lista de dispositivos conectados. */
export function ConnectDevicesPanel({ desktop, onClose }: ConnectDevicesPanelProps) {
  const [status, setStatus] = useState<LanStatus | null>(null);
  const [error, setError] = useState(false);
  const titleId = useId();
  const devicesId = useId();
  const selectId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    let active = true;
    const unsubscribe = desktop.lan.onStatus((next) => {
      if (active) setStatus(next);
    });
    desktop.lan
      .getStatus()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [desktop]);

  const devices = status ? numberDeviceLabels(status.devices) : [];
  const selected = status?.interfaces.find((entry) => entry.selected);

  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className={styles.header}>
          <h2 id={titleId}>Conectar dispositivos</h2>
          <button type="button" ref={closeRef} onClick={onClose}>
            Cerrar
          </button>
        </div>

        {error && <p role="alert">No se pudo obtener el estado de la conexión.</p>}
        {!status && !error && <p>Buscando la red…</p>}

        {status?.problem === 'noPort' && (
          <p role="alert">
            La conexión de dispositivos no está disponible: todos los puertos que usa la app están
            ocupados por otros programas. Puedes jugar igual, sin dispositivos.
          </p>
        )}
        {status?.problem === 'noInterface' && (
          <p role="alert">
            Este equipo no está conectado a ninguna red local. Conéctalo a una red wifi para
            conectar dispositivos.
          </p>
        )}

        {status?.url && (
          <div className={styles.join}>
            <QrCode url={status.url} />
            <div className={styles.address}>
              <p>Escanea el código con la cámara del celular o abre esta dirección:</p>
              <p className={styles.url} data-testid="lan-url">
                {status.url}
              </p>
            </div>
          </div>
        )}

        {status && status.interfaces.length > 0 && (
          <div className={styles.field}>
            <label htmlFor={selectId}>Red</label>
            <select
              id={selectId}
              value={selected?.name ?? ''}
              onChange={(event) => void desktop.lan.selectInterface(event.currentTarget.value)}
            >
              {!selected && (
                <option value="" disabled>
                  Elige una red
                </option>
              )}
              {status.interfaces.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {`${entry.name} (${entry.address})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {status?.networkCategory === 'public' && status.url && <PublicNetworkWarning />}

        {status && status.problem !== 'noPort' && (
          <section aria-labelledby={devicesId} className={styles.devices}>
            <h3 id={devicesId}>{`Dispositivos conectados: ${status.devices.length}`}</h3>
            {devices.length === 0 ? (
              <p className={styles.empty}>Todavía no se conectó ningún dispositivo.</p>
            ) : (
              <ul aria-label="Dispositivos conectados">
                {devices.map((device) => (
                  <li key={device.id}>{device.name}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <ConnectionHelp />
      </div>
    </div>
  );
}
