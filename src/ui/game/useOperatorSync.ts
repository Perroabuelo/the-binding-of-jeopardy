import { useEffect, useRef } from 'react';
import type { GameSession } from '../../domain/game';
import { projectForTv } from '../../domain/projection';
import { createBroadcastTransport, createOperatorSync, type OperatorSync } from '../../sync';

/**
 * Publica la vista de la TV (projectForTv) al montar y en cada cambio de la sesión.
 * Al desmontar o cerrar la página avisa a la TV con bye.
 */
export function useOperatorSync(sessionId: string, session: GameSession | null): void {
  const sessionRef = useRef(session);
  const syncRef = useRef<OperatorSync | null>(null);
  const hasSession = session !== null;

  useEffect(() => {
    sessionRef.current = session;
  });

  useEffect(() => {
    if (!hasSession) return;
    const transport = createBroadcastTransport(sessionId);
    const sync = createOperatorSync(transport, {
      getView: () => projectForTv(sessionRef.current!),
    });
    syncRef.current = sync;
    const onPageHide = () => sync.dispose();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      sync.dispose();
      transport.close();
      if (syncRef.current === sync) syncRef.current = null;
    };
  }, [sessionId, hasSession]);

  useEffect(() => {
    if (session) syncRef.current?.publish(projectForTv(session));
  }, [session]);
}
