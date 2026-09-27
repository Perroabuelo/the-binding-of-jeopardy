import { useEffect, useRef, useState } from 'react';
import { addOffsetSample, averageOffset, offsetSample } from '../../net/clock';
import {
  isDeviceServerMessage,
  type DeviceClientMessage,
  type DeviceServerMessage,
  type PhoneView,
} from '../../net/protocol';
import { createWebSocketTransport, type WsTransportStatus } from '../../net/wsTransport';
import type { SyncTransport } from '../../sync';
import { secondsLeft } from '../game/useCountdown';
import { buzzerState, type BuzzerState } from '../lan/buzzer';
import { deviceLabel, getDeviceId, lanSocketUrl } from '../lan/device';
import { clearTeamId, readTeamId, saveTeamId } from '../lan/team';
import { ConfirmDialog } from '../lib/ConfirmDialog';
import styles from './PhoneScreen.module.css';

/** El servidor manda un latido por segundo: sin noticias en 5 s, se reconecta. */
const IDLE_TIMEOUT_MS = 5000;
/** Cada cuánto se redibujan las cuentas regresivas y el fin del bloqueo. */
const TICK_MS = 100;
const VIBRATION_MS = 200;

export type DeviceTransport = SyncTransport<DeviceServerMessage, DeviceClientMessage>;
export type CreateDeviceTransport = (
  onStatus: (status: WsTransportStatus) => void,
) => DeviceTransport;

const createLanTransport: CreateDeviceTransport = (onStatus) =>
  createWebSocketTransport<DeviceServerMessage, DeviceClientMessage>(
    lanSocketUrl(window.location.href),
    { isMessage: isDeviceServerMessage, onStatus, idleTimeoutMs: IDLE_TIMEOUT_MS },
  );

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'noServer';

const CONNECTION_TEXT: Record<ConnectionState, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado a la fiesta',
  reconnecting: 'Reconectando…',
  noServer: 'Esta página se abre escaneando el QR de la app de escritorio.',
};

function vibrate(): void {
  try {
    navigator.vibrate?.(VIBRATION_MS);
  } catch {
    // Sin vibración: no pasa nada.
  }
}

/** Redibuja cada TICK_MS mientras `active`, para las cuentas regresivas. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Página del celular (`#/unirse`): se conecta a la app de escritorio por la red local, elige su
 * equipo y funciona como pulsador.
 */
export function PhoneScreen({
  createTransport = createLanTransport,
}: {
  createTransport?: CreateDeviceTransport;
}) {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  /** undefined: todavía no llegó ningún estado del juego. */
  const [view, setView] = useState<PhoneView | null | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [confirmingChange, setConfirmingChange] = useState(false);
  const transportRef = useRef<DeviceTransport | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    const label = deviceLabel(navigator.userAgent);
    let everConnected = false;
    let samples: number[] = [];
    const addSample = (serverTime: number) => {
      samples = addOffsetSample(samples, offsetSample(serverTime, Date.now()));
      setOffset(averageOffset(samples));
    };

    const transport = createTransport((status) => {
      if (status === 'open') {
        // Se presenta en cada conexión, también al reconectarse, con el equipo que eligió antes.
        const teamId = readTeamId();
        transport.send({ type: 'join', deviceId, label, ...(teamId !== null && { teamId }) });
      } else if (status === 'reconnecting') {
        // Si nunca se conectó, probablemente no hay app de escritorio detrás (p. ej. en Pages).
        setConnection(everConnected ? 'reconnecting' : 'noServer');
      }
    });
    transportRef.current = transport;
    const unsubscribe = transport.subscribe((msg) => {
      switch (msg.type) {
        case 'welcome':
          everConnected = true;
          addSample(msg.serverTime);
          setConnection('connected');
          break;
        case 'ping':
          addSample(msg.serverTime);
          transport.send({ type: 'pong' });
          break;
        case 'game':
          setView(msg.view);
          if (msg.view?.teamId !== undefined) saveTeamId(msg.view.teamId);
          // Con un juego en curso que no lo reconoce (p. ej. uno nuevo), vuelve a elegir.
          else if (msg.view) clearTeamId();
          break;
      }
    });
    return () => {
      unsubscribe();
      transport.close();
      if (transportRef.current === transport) transportRef.current = null;
    };
  }, [createTransport]);

  function send(msg: DeviceClientMessage) {
    transportRef.current?.send(msg);
  }

  function chooseTeam(teamId: string) {
    setChoosing(false);
    send({ type: 'chooseTeam', teamId });
  }

  const team = view?.teams.find((t) => t.id === view.teamId);

  return (
    <main className={`screen ${styles.phone}`}>
      {!view && <h1>Unirse a la fiesta</h1>}
      <p role="status" className={styles.connection} data-state={connection}>
        {CONNECTION_TEXT[connection]}
      </p>
      {connection === 'connected' && !view && (
        <p className={styles.waiting}>Esperando a que empiece el juego</p>
      )}
      {view && (!team || choosing) && (
        <section aria-labelledby="choose-team" className={styles.teams}>
          <h1 id="choose-team">Elige tu equipo</h1>
          <ul>
            {view.teams.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => chooseTeam(t.id)}>
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
          {choosing && (
            <button type="button" onClick={() => setChoosing(false)}>
              Cancelar
            </button>
          )}
        </section>
      )}
      {view && team && !choosing && (
        <>
          <h1 className={styles.team}>{`Equipo: ${team.name}`}</h1>
          <Buzzer
            // Se vuelve a montar con cada bloqueo o toque ganador: su reloj parte de ese momento.
            key={`${view.lockedUntil ?? ''}-${view.buzz?.answerEndsAt ?? ''}`}
            view={view}
            offset={offset}
            onBuzz={() => send({ type: 'buzz' })}
          />
          <div className={styles.footer}>
            <button type="button" onClick={() => setConfirmingChange(true)}>
              Cambiar de equipo
            </button>
            <p className={styles.hint}>
              Sugerencia: ajusta el tiempo de pantalla del celular para que no se apague durante el
              juego.
            </p>
          </div>
        </>
      )}
      {confirmingChange && (
        <ConfirmDialog
          title="Cambiar de equipo"
          message={`Dejarás de pulsar por ${team?.name ?? 'tu equipo'}.`}
          confirmLabel="Cambiar"
          onConfirm={() => {
            setConfirmingChange(false);
            setChoosing(true);
          }}
          onCancel={() => setConfirmingChange(false)}
        />
      )}
    </main>
  );
}

function countdownText(remaining: number | null): string {
  if (remaining === null) return '';
  return remaining === 0 ? '¡Tiempo!' : `${secondsLeft(remaining)} s`;
}

function Buzzer({ view, offset, onBuzz }: { view: PhoneView; offset: number; onBuzz: () => void }) {
  const ticking =
    view.lockedUntil !== undefined || (view.stage === 'clue' && view.buzz?.status === 'answering');
  const now = useNow(ticking);
  const state = buzzerState(view, now, offset);
  const previous = useRef<BuzzerState['kind'] | null>(null);

  useEffect(() => {
    if (state.kind !== previous.current && (state.kind === 'armed' || state.kind === 'won')) {
      vibrate();
    }
    previous.current = state.kind;
  }, [state.kind]);

  // Solo se puede tocar mientras no hay nadie respondiendo: antes de tiempo, el servidor lo bloquea.
  const tappable = state.kind === 'waiting' || state.kind === 'armed' || state.kind === 'locked';
  let text: string;
  let detail = '';
  switch (state.kind) {
    case 'waiting':
      text = 'Esperando…';
      break;
    case 'armed':
      text = '¡Pulsa!';
      break;
    case 'locked':
      text = 'Bloqueado';
      detail = 'Tocaste antes de tiempo';
      break;
    case 'won':
      text = '¡Ganaste!';
      detail = countdownText(state.remaining);
      break;
    case 'answering':
      text = `Responde: ${state.teamName}`;
      detail = countdownText(state.remaining);
      break;
    case 'failed':
      text = 'Tu equipo ya falló';
      break;
  }

  return (
    <button
      type="button"
      className={styles.buzzer}
      data-state={state.kind}
      aria-label={`Pulsador: ${text}`}
      aria-disabled={!tappable}
      onClick={() => {
        if (tappable) onBuzz();
      }}
    >
      <span className={styles.buzzerText}>{text}</span>
      {detail && (
        <span className={styles.buzzerDetail} aria-live="polite">
          {detail}
        </span>
      )}
    </button>
  );
}
