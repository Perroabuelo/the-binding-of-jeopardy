import { useEffect, useRef } from 'react';
import { projectForDevices } from '../../domain/deviceProjection';
import type { GameAction, GameSession } from '../../domain/game';
import type { DeviceEvent } from '../../net/protocol';
import { getDesktopApi } from '../../platform/desktop';

/** Traduce lo que hizo un celular a la acción del juego; el reducer decide si vale. */
export function deviceEventToAction(event: DeviceEvent): GameAction {
  const { teamId, deviceId, deviceLabel } = event;
  switch (event.type) {
    case 'buzz':
      return { type: 'buzz', teamId, deviceId, deviceLabel };
    case 'finalWager':
      return { type: 'submitFinalWager', teamId, amount: event.amount, deviceId, deviceLabel };
    case 'finalAnswer':
      return { type: 'submitFinalAnswer', teamId, text: event.text, deviceId, deviceLabel };
  }
}

/**
 * En escritorio, publica a los celulares la proyección del juego (projectForDevices) en cada
 * cambio de la sesión y null al desmontar, y aplica con `dispatch` los eventos de los celulares
 * en el orden en que llegan. En la web no hace nada.
 */
export function useDevicePublisher(
  session: GameSession | null,
  dispatch: (action: GameAction) => void,
): void {
  const dispatchRef = useRef(dispatch);

  useEffect(() => {
    dispatchRef.current = dispatch;
  });

  useEffect(() => {
    getDesktopApi()?.lan.publishGame(projectForDevices(session));
  }, [session]);

  useEffect(() => {
    const api = getDesktopApi();
    if (!api) return;
    const unsubscribe = api.lan.onDeviceEvent((event) => {
      dispatchRef.current(deviceEventToAction(event));
    });
    return () => {
      unsubscribe();
      api.lan.publishGame(null);
    };
  }, []);
}
