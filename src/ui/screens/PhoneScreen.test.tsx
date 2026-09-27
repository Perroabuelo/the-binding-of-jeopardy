import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceClientMessage, DeviceServerMessage, PhoneView } from '../../net/protocol';
import type { WsTransportStatus } from '../../net/wsTransport';
import { DEVICE_ID_KEY } from '../lan/device';
import { TEAM_ID_KEY } from '../lan/team';
import { PhoneScreen, type CreateDeviceTransport, type DeviceTransport } from './PhoneScreen';

/** Transporte falso: la prueba controla el estado de la conexión y los mensajes del servidor. */
function fakeTransport() {
  const sent: DeviceClientMessage[] = [];
  const handlers = new Set<(msg: DeviceServerMessage) => void>();
  let onStatus: (status: WsTransportStatus) => void = () => {};
  let closed = false;
  const transport: DeviceTransport = {
    send: (msg) => void sent.push(msg),
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
    close: () => {
      closed = true;
    },
  };
  const create: CreateDeviceTransport = (listener) => {
    onStatus = listener;
    listener('connecting');
    return transport;
  };
  return {
    create,
    sent,
    isClosed: () => closed,
    status: (status: WsTransportStatus) => act(() => onStatus(status)),
    receive: (msg: DeviceServerMessage) =>
      act(() => {
        for (const handler of [...handlers]) handler(msg);
      }),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('PhoneScreen', () => {
  it('muestra "Conectando…" mientras se conecta', () => {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    expect(screen.getByRole('status')).toHaveTextContent('Conectando…');
  });

  it('se presenta con su deviceId guardado y muestra "Conectado a la fiesta"', () => {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    const deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    expect(deviceId).toMatch(/^[0-9a-f]{32}$/);
    expect(fake.sent).toEqual([{ type: 'join', deviceId, label: expect.any(String) }]);

    fake.receive({ type: 'welcome', serverTime: 1 });
    expect(screen.getByRole('status')).toHaveTextContent('Conectado a la fiesta');

    // Responde los latidos.
    fake.receive({ type: 'ping', serverTime: 2 });
    expect(fake.sent.at(-1)).toEqual({ type: 'pong' });
  });

  it('muestra "Reconectando…" al perder la conexión y vuelve a conectarse solo', () => {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    fake.receive({ type: 'welcome', serverTime: 1 });

    fake.status('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');

    fake.status('open');
    expect(fake.sent.filter((msg) => msg.type === 'join')).toHaveLength(2);
    fake.receive({ type: 'welcome', serverTime: 2 });
    expect(screen.getByRole('status')).toHaveTextContent('Conectado a la fiesta');
  });

  it('sin servidor indica que se abre desde el QR', () => {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta página se abre escaneando el QR de la app de escritorio.',
    );
  });

  it('cierra la conexión al salir', () => {
    const fake = fakeTransport();
    const view = render(<PhoneScreen createTransport={fake.create} />);
    view.unmount();
    expect(fake.isClosed()).toBe(true);
  });
});

describe('PhoneScreen: equipo y pulsador', () => {
  const TEAMS = [
    { id: 'primos', name: 'Primos' },
    { id: 'tios', name: 'Tíos' },
  ];

  function gameView(overrides: Partial<PhoneView> = {}): PhoneView {
    return { sessionId: 'g1', teams: TEAMS, stage: 'board', ...overrides };
  }

  /** Conectado, con el reloj del servidor igual al local. */
  function connected() {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    fake.receive({ type: 'welcome', serverTime: Date.now() });
    return fake;
  }

  function buzzer() {
    return screen.getByRole('button', { name: /^Pulsador:/ });
  }

  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('sin juego indica que espera a que empiece', () => {
    const fake = connected();
    expect(screen.getByText('Esperando a que empiece el juego')).toBeInTheDocument();
    fake.receive({ type: 'game', view: null });
    expect(screen.getByText('Esperando a que empiece el juego')).toBeInTheDocument();
  });

  it('elegir equipo envía chooseTeam y lo guarda cuando el servidor lo confirma', async () => {
    const user = userEvent.setup();
    const fake = connected();
    fake.receive({ type: 'game', view: gameView() });
    expect(screen.getByRole('heading', { name: 'Elige tu equipo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tíos' }));
    expect(fake.sent.at(-1)).toEqual({ type: 'chooseTeam', teamId: 'tios' });

    fake.receive({ type: 'game', view: gameView({ teamId: 'tios', team: {} }) });
    expect(screen.getByRole('heading', { name: 'Equipo: Tíos' })).toBeInTheDocument();
    expect(window.localStorage.getItem(TEAM_ID_KEY)).toBe('tios');
  });

  it('una recarga envía join con el teamId guardado', () => {
    window.localStorage.setItem(TEAM_ID_KEY, 'primos');
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    expect(fake.sent[0]).toMatchObject({ type: 'join', teamId: 'primos' });
  });

  it('un juego que no reconoce el equipo guardado lo olvida y pide elegir', () => {
    window.localStorage.setItem(TEAM_ID_KEY, 'de-otro-juego');
    const fake = connected();
    fake.receive({ type: 'game', view: gameView() });
    expect(screen.getByRole('heading', { name: 'Elige tu equipo' })).toBeInTheDocument();
    expect(window.localStorage.getItem(TEAM_ID_KEY)).toBeNull();
  });

  it('funciona aunque localStorage falle', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const fake = connected();
    fake.receive({ type: 'game', view: gameView({ teamId: 'tios', team: {} }) });
    expect(screen.getByRole('heading', { name: 'Equipo: Tíos' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('cambiar de equipo pide confirmación', async () => {
    const user = userEvent.setup();
    const fake = connected();
    fake.receive({ type: 'game', view: gameView({ teamId: 'tios', team: {} }) });
    await user.click(screen.getByRole('button', { name: 'Cambiar de equipo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cambiar de equipo' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Equipo: Tíos' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cambiar de equipo' }));
    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    await user.click(screen.getByRole('button', { name: 'Primos' }));
    expect(fake.sent.at(-1)).toEqual({ type: 'chooseTeam', teamId: 'primos' });
  });

  it('muestra cada estado del pulsador según el juego', () => {
    const fake = connected();
    const mine = { teamId: 'primos', team: {} };
    fake.receive({ type: 'game', view: gameView(mine) });
    expect(buzzer()).toHaveAttribute('data-state', 'waiting');

    fake.receive({
      type: 'game',
      view: gameView({ ...mine, stage: 'clue', buzz: { status: 'closed', failedTeamIds: [] } }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'waiting');

    fake.receive({
      type: 'game',
      view: gameView({ ...mine, stage: 'clue', buzz: { status: 'armed', failedTeamIds: [] } }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'armed');
    expect(buzzer()).toHaveTextContent('¡Pulsa!');

    fake.receive({
      type: 'game',
      view: gameView({
        ...mine,
        stage: 'clue',
        buzz: { status: 'closed', failedTeamIds: [] },
        lockedUntil: Date.now() + 250,
      }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'locked');
    expect(buzzer()).toHaveTextContent('Bloqueado');

    const answering = {
      status: 'answering' as const,
      answeringTeamId: 'tios',
      answerEndsAt: Date.now() + 5_000,
      failedTeamIds: [],
    };
    fake.receive({ type: 'game', view: gameView({ ...mine, stage: 'clue', buzz: answering }) });
    expect(buzzer()).toHaveAttribute('data-state', 'answering');
    expect(buzzer()).toHaveTextContent('Responde: Tíos');

    fake.receive({
      type: 'game',
      view: gameView({
        ...mine,
        stage: 'clue',
        buzz: { ...answering, answeringTeamId: 'primos' },
        youWon: true,
      }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'won');
    expect(buzzer()).toHaveTextContent('¡Ganaste!');

    fake.receive({
      type: 'game',
      view: gameView({
        ...mine,
        stage: 'clue',
        buzz: { status: 'armed', failedTeamIds: ['primos'] },
      }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'failed');
    expect(buzzer()).toHaveTextContent('Tu equipo ya falló');
  });

  it('el bloqueo termina solo a los 250 ms', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const fake = connected();
    fake.receive({
      type: 'game',
      view: gameView({
        teamId: 'primos',
        team: {},
        stage: 'clue',
        buzz: { status: 'armed', failedTeamIds: [] },
        lockedUntil: Date.now() + 250,
      }),
    });
    expect(buzzer()).toHaveAttribute('data-state', 'locked');
    act(() => vi.advanceTimersByTime(300));
    expect(buzzer()).toHaveAttribute('data-state', 'armed');
  });

  it('la cuenta de 5 s, corregida por desfase, llega a "¡Tiempo!"', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    // El servidor va 10 s adelantado respecto del celular
    const serverNow = Date.now() + 10_000;
    fake.receive({ type: 'welcome', serverTime: serverNow });
    fake.receive({
      type: 'game',
      view: gameView({
        teamId: 'primos',
        team: {},
        stage: 'clue',
        youWon: true,
        buzz: {
          status: 'answering',
          answeringTeamId: 'primos',
          answerEndsAt: serverNow + 5_000,
          failedTeamIds: [],
        },
      }),
    });
    expect(buzzer()).toHaveTextContent('5 s');
    act(() => vi.advanceTimersByTime(2_000));
    expect(buzzer()).toHaveTextContent('3 s');
    act(() => vi.advanceTimersByTime(3_000));
    expect(buzzer()).toHaveTextContent('¡Tiempo!');
  });

  it('tocar envía buzz, también antes de tiempo, pero no con alguien respondiendo', async () => {
    const user = userEvent.setup();
    const fake = connected();
    const mine = { teamId: 'primos', team: {}, stage: 'clue' as const };
    fake.receive({
      type: 'game',
      view: gameView({ ...mine, buzz: { status: 'closed', failedTeamIds: [] } }),
    });
    await user.click(buzzer());
    expect(fake.sent.at(-1)).toEqual({ type: 'buzz' });

    fake.receive({
      type: 'game',
      view: gameView({ ...mine, buzz: { status: 'armed', failedTeamIds: [] } }),
    });
    await user.click(buzzer());
    expect(fake.sent.filter((msg) => msg.type === 'buzz')).toHaveLength(2);

    fake.receive({
      type: 'game',
      view: gameView({
        ...mine,
        buzz: { status: 'answering', answeringTeamId: 'tios', failedTeamIds: [] },
      }),
    });
    await user.click(buzzer());
    expect(fake.sent.filter((msg) => msg.type === 'buzz')).toHaveLength(2);
  });

  it('vibra al activarse los pulsadores y al ganar', () => {
    const fake = connected();
    const mine = { teamId: 'primos', team: {}, stage: 'clue' as const };
    fake.receive({
      type: 'game',
      view: gameView({ ...mine, buzz: { status: 'closed', failedTeamIds: [] } }),
    });
    expect(vibrate).not.toHaveBeenCalled();
    fake.receive({
      type: 'game',
      view: gameView({ ...mine, buzz: { status: 'armed', failedTeamIds: [] } }),
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    fake.receive({
      type: 'game',
      view: gameView({
        ...mine,
        youWon: true,
        buzz: {
          status: 'answering',
          answeringTeamId: 'primos',
          answerEndsAt: Date.now() + 5_000,
          failedTeamIds: [],
        },
      }),
    });
    expect(vibrate).toHaveBeenCalledTimes(2);
  });
});

describe('PhoneScreen: Final', () => {
  const TEAMS = [
    { id: 'primos', name: 'Primos' },
    { id: 'sobrinos', name: 'Sobrinos' },
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  function finalView(
    final: NonNullable<PhoneView['final']>,
    team: NonNullable<PhoneView['team']>['final'],
    teamId = 'primos',
  ): PhoneView {
    return { sessionId: 'g1', teams: TEAMS, stage: 'final', final, teamId, team: { final: team } };
  }

  function connected() {
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    fake.receive({ type: 'welcome', serverTime: Date.now() });
    return fake;
  }

  const WAGERS = { stage: 'wagers' as const, category: 'Cumpleañero' };

  it('una apuesta mayor al máximo se rechaza en el celular', async () => {
    const user = userEvent.setup();
    const fake = connected();
    fake.receive({
      type: 'game',
      view: finalView(WAGERS, { participating: true, maxWager: 800 }),
    });
    expect(screen.getByText('Categoría: Cumpleañero')).toBeInTheDocument();
    const input = screen.getByLabelText('Apuesta de tu equipo');
    await user.type(input, '900');
    expect(screen.getByText(/el máximo es 800/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar apuesta' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, '500');
    await user.click(screen.getByRole('button', { name: 'Enviar apuesta' }));
    expect(fake.sent.at(-1)).toEqual({ type: 'finalWager', amount: 500 });
  });

  it('una apuesta enviada muestra "Enviada por …", también en otro celular del equipo', () => {
    const fake = connected();
    fake.receive({
      type: 'game',
      view: finalView(WAGERS, {
        participating: true,
        maxWager: 800,
        wager: { amount: 500, deviceLabel: 'Android' },
      }),
    });
    expect(screen.getByText('Enviada por Android: 500')).toBeInTheDocument();
    expect(screen.queryByLabelText('Apuesta de tu equipo')).not.toBeInTheDocument();
  });

  it('una apuesta anotada por el operador se muestra sin dispositivo', () => {
    const fake = connected();
    fake.receive({
      type: 'game',
      view: finalView(WAGERS, { participating: true, maxWager: 800, wager: { amount: 400 } }),
    });
    expect(screen.getByText('Anotada: 400')).toBeInTheDocument();
  });

  it('envía la respuesta y muestra "Enviada por …"', async () => {
    const user = userEvent.setup();
    const fake = connected();
    const clue = { stage: 'clue' as const, category: 'Cumpleañero' };
    fake.receive({ type: 'game', view: finalView(clue, { participating: true, maxWager: 800 }) });
    await user.type(screen.getByLabelText('Respuesta de tu equipo'), '  ¿Qué es un pastel?  ');
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(fake.sent.at(-1)).toEqual({ type: 'finalAnswer', text: '¿Qué es un pastel?' });

    fake.receive({
      type: 'game',
      view: finalView(clue, {
        participating: true,
        maxWager: 800,
        answer: { text: '¿Qué es un pastel?', deviceLabel: 'iPhone' },
      }),
    });
    expect(screen.getByText('Enviada por iPhone: ¿Qué es un pastel?')).toBeInTheDocument();
  });

  it('la cuenta regresiva, corregida por desfase, deshabilita la respuesta en 0', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const fake = fakeTransport();
    render(<PhoneScreen createTransport={fake.create} />);
    fake.status('open');
    // El servidor va 3 s atrasado respecto del celular
    const serverNow = Date.now() - 3_000;
    fake.receive({ type: 'welcome', serverTime: serverNow });
    fake.receive({
      type: 'game',
      view: finalView(
        { stage: 'clue', category: 'Cumpleañero', timerEndsAt: serverNow + 30_000 },
        { participating: true, maxWager: 800 },
      ),
    });
    const timer = screen.getByRole('timer', { name: 'Tiempo restante' });
    expect(timer).toHaveTextContent('30');
    act(() => vi.advanceTimersByTime(10_000));
    expect(timer).toHaveTextContent('20');
    expect(screen.getByLabelText('Respuesta de tu equipo')).toBeEnabled();
    act(() => vi.advanceTimersByTime(20_000));
    expect(timer).toHaveTextContent('0');
    expect(screen.getByLabelText('Respuesta de tu equipo')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeDisabled();
    expect(screen.getByText('Se acabó el tiempo.')).toBeInTheDocument();
  });

  it('un equipo que no participa ve el aviso', () => {
    const fake = connected();
    fake.receive({
      type: 'game',
      view: finalView(WAGERS, { participating: false }, 'sobrinos'),
    });
    expect(screen.getByText('Tu equipo no juega el Final')).toBeInTheDocument();
    expect(screen.queryByLabelText('Apuesta de tu equipo')).not.toBeInTheDocument();
  });
});
