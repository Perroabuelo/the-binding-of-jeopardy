import { useEffect, useState } from 'react';
import {
  isDeviceServerMessage,
  type DeviceClientMessage,
  type DeviceServerMessage,
} from '../../net/protocol';
import { createWebSocketTransport, type WsTransportStatus } from '../../net/wsTransport';
import type { SyncTransport } from '../../sync';
import { deviceLabel, getDeviceId, lanSocketUrl } from '../lan/device';
import styles from './JoinScreen.module.css';

/** El servidor manda un latido por segundo: sin noticias en 5 s, se reconecta. */
const IDLE_TIMEOUT_MS = 5000;

export type DeviceTransport = SyncTransport<DeviceServerMessage, DeviceClientMessage>;
export type CreateDeviceTransport = (
  onStatus: (status: WsTransportStatus) => void,
) => DeviceTransport;

const createLanTransport: CreateDeviceTransport = (onStatus) =>
  createWebSocketTransport<DeviceServerMessage, DeviceClientMessage>(
    lanSocketUrl(window.location.href),
    { isMessage: isDeviceServerMessage, onStatus, idleTimeoutMs: IDLE_TIMEOUT_MS },
  );

type JoinState = 'connecting' | 'connected' | 'reconnecting' | 'noServer';

const STATE_TEXT: Record<JoinState, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado a la fiesta',
  reconnecting: 'Reconectando…',
  noServer: 'Esta página se abre escaneando el QR de la app de escritorio.',
};

/** Página mínima del celular: se conecta a la app de escritorio por la red local. */
export function JoinScreen({
  createTransport = createLanTransport,
}: {
  createTransport?: CreateDeviceTransport;
}) {
  const [state, setState] = useState<JoinState>('connecting');

  useEffect(() => {
    const deviceId = getDeviceId();
    const label = deviceLabel(navigator.userAgent);
    let everConnected = false;
    let transport: DeviceTransport | null = null;

    transport = createTransport((status) => {
      if (status === 'open') {
        // Se presenta en cada conexión, también al reconectarse.
        transport?.send({ type: 'join', deviceId, label });
      } else if (status === 'reconnecting') {
        // Si nunca se conectó, probablemente no hay app de escritorio detrás (p. ej. en Pages).
        setState(everConnected ? 'reconnecting' : 'noServer');
      }
    });
    const unsubscribe = transport.subscribe((msg) => {
      if (msg.type === 'welcome') {
        everConnected = true;
        setState('connected');
      } else if (msg.type === 'ping') {
        transport?.send({ type: 'pong' });
      }
    });
    return () => {
      unsubscribe();
      transport?.close();
    };
  }, [createTransport]);

  return (
    <main className={`screen ${styles.join}`}>
      <h1>Unirse a la fiesta</h1>
      <p role="status" className={styles.status} data-state={state}>
        {STATE_TEXT[state]}
      </p>
      {state === 'connected' && (
        <p className={styles.hint}>Deja esta página abierta durante el juego.</p>
      )}
    </main>
  );
}
