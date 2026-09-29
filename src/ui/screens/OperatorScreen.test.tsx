import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allClueKeys } from '../../domain/board';
import { gameReducer, startGame, type GameSession, type TvView } from '../../domain/game';
import { getSession, putImage, saveSession } from '../../storage/db';
import { createMemoryBus, type MemoryBus, type SyncMessage } from '../../sync';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import {
  installDesktop,
  makeFakeDesktop,
  makeLanStatus,
  uninstallDesktop,
  type FakeDesktop,
} from '../../../tests/fixtures/desktop';
import type { DeviceGameView } from '../../domain/deviceProjection';
import { OperatorScreen } from './OperatorScreen';

const SESSION_ID = 'sesion-prueba';

function makeSession(teamNames = ['Primos', 'Tíos'], overrides: Partial<GameSession> = {}) {
  let n = 0;
  const session = startGame([{ board: makeCompleteBoard(), multiplier: 1 }], teamNames, {
    sessionId: SESSION_ID,
    now: 1_700_000_000_000,
    makeTeamId: () => `equipo-${++n}`,
  });
  return { ...session, ...overrides };
}

async function renderOperator(session: GameSession = makeSession()) {
  await saveSession(session);
  const view = render(<OperatorScreen sessionId={session.id} />);
  await screen.findByRole('list', { name: 'Puntajes' });
  return view;
}

function scoreItem(name: string, score: number) {
  return within(screen.getByRole('list', { name: 'Puntajes' })).getByRole('listitem', {
    name: `${name}: ${score} puntos`,
  });
}

// La TV se simula con un bus en memoria en lugar de BroadcastChannel.
const channels = vi.hoisted(() => ({ bus: null as MemoryBus | null }));
vi.mock('../../sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../sync')>();
  return { ...actual, createBroadcastTransport: () => channels.bus!.connect() };
});

let tvMessages: SyncMessage[];

beforeEach(() => {
  channels.bus = createMemoryBus();
  tvMessages = [];
  channels.bus.connect().subscribe((msg) => tvMessages.push(msg));
  // jsdom no implementa URLs de objeto.
  URL.createObjectURL = vi.fn(() => 'blob:imagen-prueba');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function lastTvView(): TvView | undefined {
  const states = tvMessages.filter((msg) => msg.type === 'state');
  return states.at(-1)?.view;
}

describe('conectar dispositivos', () => {
  afterEach(() => {
    uninstallDesktop();
  });

  it('en la web no ofrece "Conectar dispositivos"', async () => {
    await renderOperator();
    expect(screen.queryByRole('button', { name: 'Conectar dispositivos' })).not.toBeInTheDocument();
  });

  function buzzGame(): GameSession {
    return makeSession(['Primos', 'Tíos'], { buzzersEnabled: true });
  }

  it('en escritorio con pulsadores ofrece "Conectar dispositivos" y el QR de la TV', async () => {
    installDesktop();
    await renderOperator(buzzGame());
    expect(screen.getByRole('button', { name: 'Conectar dispositivos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar QR en la TV' })).toBeVisible();
  });

  it('en escritorio sin pulsadores no ofrece "Conectar dispositivos" ni el QR', async () => {
    installDesktop();
    await renderOperator();
    expect(screen.queryByRole('button', { name: 'Conectar dispositivos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /QR/ })).not.toBeInTheDocument();
  });

  it('en la web no ofrece el QR aunque el juego tenga pulsadores', async () => {
    await renderOperator(buzzGame());
    expect(screen.queryByRole('button', { name: 'Conectar dispositivos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /QR/ })).not.toBeInTheDocument();
  });

  it('muestra y oculta el QR en la TV, y lo guarda en la sesión', async () => {
    const user = userEvent.setup();
    installDesktop();
    await renderOperator(buzzGame());
    expect(lastTvView()).not.toHaveProperty('joinQr');

    await user.click(screen.getByRole('button', { name: 'Mostrar QR en la TV' }));
    expect(lastTvView()?.joinQr).toBe(true);
    await waitFor(async () => expect((await getSession(SESSION_ID))?.joinQrVisible).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Ocultar QR de la TV' }));
    expect(lastTvView()).not.toHaveProperty('joinQr');
    expect(screen.getByRole('button', { name: 'Mostrar QR en la TV' })).toBeVisible();
  });
});

describe('pantalla de TV desde el operador', () => {
  it('abre la TV en una ventana con nombre fijo y muestra la dirección para copiar', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    await renderOperator();
    const url = `${window.location.origin}${window.location.pathname}#/tv/${SESSION_ID}`;

    expect(screen.getByLabelText('Dirección de la pantalla de TV')).toHaveValue(url);
    expect(screen.getByLabelText('Dirección de la pantalla de TV')).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    expect(open).toHaveBeenCalledWith(url, 'jeopardy-tv');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa que se deben permitir ventanas emergentes si el navegador la bloquea', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockReturnValue(null);
    await renderOperator();

    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Permite las ventanas emergentes para este sitio/,
    );
  });

  it('publica la vista al montar y en cada cambio, sin la respuesta antes de revelar', async () => {
    const user = userEvent.setup();
    await renderOperator();
    await waitFor(() => expect(lastTvView()?.phase).toEqual({ kind: 'board' }));

    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    await waitFor(() => expect(lastTvView()?.phase.kind).toBe('clue'));
    expect(JSON.stringify(tvMessages)).not.toContain('Respuesta');

    await user.click(screen.getByRole('button', { name: 'Revelar respuesta' }));
    await waitFor(() =>
      expect(lastTvView()?.phase).toMatchObject({ kind: 'clue', answer: 'Respuesta 1-1' }),
    );
  });

  it('se despide de la TV al cerrar la página', async () => {
    await renderOperator();
    // El primer estado publicado confirma que el efecto que escucha pagehide ya corrió.
    await waitFor(() => expect(lastTvView()).toBeDefined());
    window.dispatchEvent(new Event('pagehide'));
    await waitFor(() => expect(tvMessages.at(-1)).toEqual({ type: 'bye' }));
  });
});

describe('OperatorScreen', () => {
  it('muestra el título, el tablero y los equipos con puntaje 0', async () => {
    await renderOperator();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tablero de prueba' }),
    ).toBeInTheDocument();
    expect(scoreItem('Primos', 0)).toBeInTheDocument();
    expect(scoreItem('Tíos', 0)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Categoría \d, \d00$/ })).toHaveLength(30);
  });

  it('flujo de una pregunta: abrir, revelar, sumar, volver y celda usada', async () => {
    const user = userEvent.setup();
    await renderOperator();

    await user.click(screen.getByRole('button', { name: 'Categoría 3, 200' }));
    const clue = screen.getByRole('region', { name: 'Pregunta abierta' });
    expect(within(clue).getByText('Pregunta 3-2')).toBeInTheDocument();
    expect(within(clue).getByText('Valor: 200')).toBeInTheDocument();
    const answer = within(clue).getByRole('region', { name: 'Respuesta' });
    expect(answer).toHaveTextContent('Respuesta 3-2');
    expect(answer).toHaveTextContent('No revelada');
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revelar respuesta' }));
    expect(answer).toHaveTextContent('Revelada en la TV');
    expect(screen.queryByRole('button', { name: 'Revelar respuesta' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sumar 200 a Primos' }));
    await user.click(screen.getByRole('button', { name: 'Sumar 200 a Primos' }));
    expect(scoreItem('Primos', 400)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    const used = screen.getByRole('button', { name: 'Categoría 3, 200, usada' });
    expect(used).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Categoría 3, 200' })).not.toBeInTheDocument();

    // Una celda usada no se puede volver a abrir.
    await user.click(used);
    expect(screen.queryByRole('region', { name: 'Pregunta abierta' })).not.toBeInTheDocument();

    const saved = await getSession(SESSION_ID);
    expect(saved?.usedClues).toEqual(['c2-r1']);
    expect(saved?.teams[0]?.score).toBe(400);
    expect(saved?.phase).toEqual({ kind: 'board' });
  });

  it('muestra la imagen de la pregunta', async () => {
    const user = userEvent.setup();
    const session = makeSession();
    session.rounds[0]!.boardSnapshot.categories[0]!.clues[0]!.imageId = 'imagen-1';
    await putImage('imagen-1', new Blob(['png'], { type: 'image/png' }));
    await renderOperator(session);

    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    expect(await screen.findByRole('img', { name: 'Imagen de la pregunta' })).toHaveAttribute(
      'src',
      'blob:imagen-prueba',
    );
  });

  it('muestra la imagen de la respuesta junto a la respuesta antes de revelarla', async () => {
    const user = userEvent.setup();
    const session = makeSession();
    const clue = session.rounds[0]!.boardSnapshot.categories[0]!.clues[0]!;
    clue.imageId = 'imagen-pregunta';
    clue.answerImageId = 'imagen-respuesta';
    await putImage('imagen-pregunta', new Blob(['p'], { type: 'image/png' }));
    await putImage('imagen-respuesta', new Blob(['r'], { type: 'image/png' }));
    await renderOperator(session);

    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    const answer = screen.getByRole('region', { name: 'Respuesta' });
    expect(within(answer).getByText('No revelada: solo la ves tú')).toBeInTheDocument();
    expect(
      await within(answer).findByRole('img', { name: 'Imagen de la respuesta' }),
    ).toHaveAttribute('src', 'blob:imagen-prueba');
    expect(await screen.findByRole('img', { name: 'Imagen de la pregunta' })).toBeInTheDocument();
    expect(
      within(answer).queryByRole('img', { name: 'Imagen de la pregunta' }),
    ).not.toBeInTheDocument();
  });

  it('restar puntos puede dejar un puntaje negativo', async () => {
    const user = userEvent.setup();
    await renderOperator();
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 300' }));
    await user.click(screen.getByRole('button', { name: 'Restar 300 a Tíos' }));
    expect(scoreItem('Tíos', -300)).toBeInTheDocument();
    expect(scoreItem('Primos', 0)).toBeInTheDocument();
  });

  it('permite editar un puntaje a mano', async () => {
    const user = userEvent.setup();
    await renderOperator();

    await user.click(screen.getByRole('button', { name: 'Editar puntaje de Primos' }));
    const input = screen.getByLabelText('Nuevo puntaje de Primos');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Guardar puntaje de Primos' }));
    expect(screen.getByRole('alert')).toHaveTextContent('El puntaje debe ser un número entero.');

    await user.type(input, '700');
    await user.click(screen.getByRole('button', { name: 'Guardar puntaje de Primos' }));
    expect(scoreItem('Primos', 700)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nuevo puntaje de Primos')).not.toBeInTheDocument();
    expect((await getSession(SESSION_ID))?.teams[0]?.score).toBe(700);
  });

  it('terminar pide confirmación y muestra el podio con empates', async () => {
    const user = userEvent.setup();
    const session = makeSession(['Primos', 'Tíos', 'Abuelos']);
    session.teams = session.teams.map((team, i) => ({ ...team, score: [800, 800, 300][i]! }));
    await renderOperator(session);

    await user.click(screen.getByRole('button', { name: 'Terminar juego' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('¿Terminar el juego ahora?');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Tablero' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminar juego' }));
    await user.click(screen.getByRole('button', { name: 'Sí, terminar' }));

    const podium = screen.getByRole('list', { name: 'Podio' });
    expect(
      within(podium)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual([
      'Posición 1: Primos, 800 puntos',
      'Posición 1: Tíos, 800 puntos',
      'Posición 3: Abuelos, 300 puntos',
    ]);
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terminar juego' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar puntaje/ })).not.toBeInTheDocument();
    expect((await getSession(SESSION_ID))?.phase).toEqual({ kind: 'finished' });
  });

  it('al volver tras la última celda termina el juego y muestra el podio', async () => {
    const user = userEvent.setup();
    const usedClues = allClueKeys(makeCompleteBoard()).filter((key) => key !== 'c5-r4');
    await renderOperator(makeSession(['Primos', 'Tíos'], { usedClues }));

    await user.click(screen.getByRole('button', { name: 'Categoría 6, 500' }));
    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(screen.getByRole('heading', { name: 'Podio' })).toBeInTheDocument();
  });

  it('al recargar reanuda con los mismos puntajes, celdas usadas y pregunta abierta', async () => {
    const user = userEvent.setup();
    const first = await renderOperator();
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    await user.click(screen.getByRole('button', { name: 'Sumar 100 a Primos' }));
    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    await user.click(screen.getByRole('button', { name: 'Categoría 2, 400' }));
    await user.click(screen.getByRole('button', { name: 'Restar 400 a Tíos' }));
    first.unmount();

    render(<OperatorScreen sessionId={SESSION_ID} />);
    const clue = await screen.findByRole('region', { name: 'Pregunta abierta' });
    expect(within(clue).getByText('Pregunta 2-4')).toBeInTheDocument();
    expect(scoreItem('Primos', 100)).toBeInTheDocument();
    expect(scoreItem('Tíos', -400)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(screen.getByRole('button', { name: 'Categoría 1, 100, usada' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Categoría 2, 400, usada' })).toBeDisabled();
  });

  it('avisa si la sesión no existe', async () => {
    render(<OperatorScreen sessionId="no-existe" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el juego.');
  });
});

describe('OperatorScreen: rondas', () => {
  /** Una ronda por multiplicador: "Cumple A", "Cumple B"… */
  function roundsSession(multipliers = [1, 2], overrides: Partial<GameSession> = {}) {
    let n = 0;
    const session = startGame(
      multipliers.map((multiplier, i) => ({
        board: makeCompleteBoard({ id: `b${i + 1}`, title: `Cumple ${'ABCDE'[i]}` }),
        multiplier,
      })),
      ['Primos', 'Tíos'],
      { sessionId: SESSION_ID, now: 1_700_000_000_000, makeTeamId: () => `equipo-${++n}` },
    );
    return { ...session, ...overrides };
  }

  it('muestra el indicador de ronda solo en un juego con rondas', async () => {
    const first = await renderOperator(roundsSession([1, 2]));
    expect(screen.getByText('Ronda 1 de 2 · x1')).toBeInTheDocument();
    first.unmount();

    await renderOperator(makeSession());
    expect(screen.queryByText(/^Ronda \d de \d/)).not.toBeInTheDocument();
  });

  it('en x2, el tablero, el valor y los botones usan el valor multiplicado', async () => {
    const user = userEvent.setup();
    await renderOperator(roundsSession([1, 2], { roundIndex: 1 }));
    expect(screen.getByText('Ronda 2 de 2 · x2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Cumple B' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categoría 1, 600' }));
    const clue = screen.getByRole('region', { name: 'Pregunta abierta' });
    expect(within(clue).getByText('Valor: 600')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sumar 600 a Primos' }));
    expect(scoreItem('Primos', 600)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restar 600 a Tíos' })).toBeInTheDocument();
  });

  it('terminar ronda pide confirmación y, al confirmar, muestra la transición', async () => {
    const user = userEvent.setup();
    await renderOperator(roundsSession([1, 2]));

    await user.click(screen.getByRole('button', { name: 'Terminar ronda' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('¿Terminar la ronda 1? Quedan 30 preguntas sin usar.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Tablero' })).toBeInTheDocument();
    expect((await getSession(SESSION_ID))?.phase).toEqual({ kind: 'board' });

    await user.click(screen.getByRole('button', { name: 'Terminar ronda' }));
    await user.click(screen.getByRole('button', { name: 'Sí, terminar' }));

    const transition = screen.getByRole('region', { name: 'Transición entre rondas' });
    expect(within(transition).getByRole('heading', { name: 'Ronda 2 de 2' })).toBeInTheDocument();
    expect(transition).toHaveTextContent('Multiplicador x2');
    expect(transition).toHaveTextContent('Tablero: Cumple B');
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terminar ronda' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminar juego' })).toBeInTheDocument();
    expect((await getSession(SESSION_ID))?.phase).toEqual({
      kind: 'roundBreak',
      nextRoundIndex: 1,
    });
  });

  it('terminar ronda con una pregunta abierta también pide confirmación', async () => {
    const user = userEvent.setup();
    await renderOperator(roundsSession([1, 2, 3]));
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    await user.click(screen.getByRole('button', { name: 'Terminar ronda' }));
    await user.click(screen.getByRole('button', { name: 'Sí, terminar' }));
    expect(screen.getByRole('heading', { name: 'Ronda 2 de 3' })).toBeInTheDocument();
  });

  it('en la última ronda y sin rondas no aparece terminar ronda', async () => {
    const first = await renderOperator(roundsSession([1, 2], { roundIndex: 1 }));
    expect(screen.queryByRole('button', { name: 'Terminar ronda' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminar juego' })).toBeInTheDocument();
    first.unmount();

    await renderOperator(makeSession());
    expect(screen.queryByRole('button', { name: 'Terminar ronda' })).not.toBeInTheDocument();
  });

  it('comenzar la ronda 2 muestra su tablero con todas las celdas disponibles', async () => {
    const user = userEvent.setup();
    const inBreak = gameReducer(
      roundsSession([1, 2], { usedClues: ['c0-r0', 'c1-r1'] }),
      { type: 'finishRound' },
      1,
    );
    await renderOperator(inBreak);

    await user.click(screen.getByRole('button', { name: 'Comenzar ronda 2' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Cumple B' })).toBeInTheDocument();
    expect(screen.getByText('Ronda 2 de 2 · x2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Categoría \d, \d+$/ })).toHaveLength(30);
    expect(screen.getByRole('button', { name: 'Categoría 1, 1000' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /usada/ })).not.toBeInTheDocument();
    const saved = await getSession(SESSION_ID);
    expect(saved?.roundIndex).toBe(1);
    expect(saved?.usedClues).toEqual([]);
  });

  it('al recargar en la transición la recupera', async () => {
    const inBreak = gameReducer(roundsSession([1, 2, 3]), { type: 'finishRound' }, 1);
    const first = await renderOperator(inBreak);
    first.unmount();

    render(<OperatorScreen sessionId={SESSION_ID} />);
    const transition = await screen.findByRole('region', { name: 'Transición entre rondas' });
    expect(within(transition).getByRole('heading', { name: 'Ronda 2 de 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comenzar ronda 2' })).toBeInTheDocument();
  });

  it('reanuda una sesión guardada antes de las rondas', async () => {
    const session = makeSession(['Primos', 'Tíos'], { usedClues: ['c0-r0'] });
    session.teams[0]!.score = 300;
    const legacy: Record<string, unknown> = {
      ...session,
      boardSnapshot: session.rounds[0]!.boardSnapshot,
    };
    delete legacy.rounds;
    delete legacy.roundIndex;
    await renderOperator(legacy as unknown as GameSession);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Tablero de prueba' }),
    ).toBeInTheDocument();
    expect(scoreItem('Primos', 300)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categoría 1, 100, usada' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Categoría 1, 500' })).toBeEnabled();
    expect(screen.queryByText(/^Ronda \d de \d/)).not.toBeInTheDocument();
  });
});

describe('OperatorScreen: Daily Double', () => {
  // Categoría 1, 200 (c0-r1) es Daily Double. Primos tiene 1200 y Tíos 300.
  function dailyDoubleSession() {
    const session = makeSession();
    session.rounds[0]!.boardSnapshot.categories[0]!.clues[1]!.dailyDouble = true;
    session.teams = session.teams.map((team, i) => ({ ...team, score: [1200, 300][i]! }));
    return session;
  }

  function wagerRegion() {
    return screen.getByRole('region', { name: 'Daily Double' });
  }

  async function openDailyDouble(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 200, Daily Double' }));
    return wagerRegion();
  }

  it('marca en el tablero del operador las celdas Daily Double sin usar', async () => {
    const user = userEvent.setup();
    await renderOperator(dailyDoubleSession());
    const cell = screen.getByRole('button', { name: 'Categoría 1, 200, Daily Double' });
    expect(cell).toHaveTextContent('DD');
    expect(screen.getAllByRole('button', { name: /, Daily Double$/ })).toHaveLength(1);

    await openDailyDouble(user);
    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(screen.getByRole('button', { name: 'Categoría 1, 200, usada' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /, Daily Double$/ })).not.toBeInTheDocument();
  });

  it('al abrirlo muestra pregunta y respuesta, sin revelar ni botones de puntos', async () => {
    const user = userEvent.setup();
    await renderOperator(dailyDoubleSession());
    const region = await openDailyDouble(user);

    expect(within(region).getByText('Pregunta 1-2')).toBeInTheDocument();
    expect(within(region).getByRole('region', { name: 'Respuesta' })).toHaveTextContent(
      'Respuesta 1-2',
    );
    expect(within(region).getByLabelText('Equipo que responde')).toBeInTheDocument();
    expect(within(region).getByLabelText('Apuesta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revelar respuesta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Sumar|Restar) / })).not.toBeInTheDocument();
    // La corrección manual sigue disponible.
    expect(screen.getByRole('button', { name: 'Editar puntaje de Primos' })).toBeInTheDocument();

    await waitFor(() => expect(lastTvView()?.phase.kind).toBe('dailyDouble'));
    expect(JSON.stringify(lastTvView())).not.toContain('Pregunta 1-2');
  });

  it('el máximo cambia al elegir otro equipo', async () => {
    const user = userEvent.setup();
    await renderOperator(dailyDoubleSession());
    const region = await openDailyDouble(user);

    expect(within(region).getByText('Mínimo 0, máximo 1200.')).toBeInTheDocument();
    await user.selectOptions(within(region).getByLabelText('Equipo que responde'), 'Tíos');
    expect(within(region).getByText('Mínimo 0, máximo 500.')).toBeInTheDocument();
  });

  it('deshabilita el registro con una apuesta fuera de rango e indica el máximo', async () => {
    const user = userEvent.setup();
    await renderOperator(dailyDoubleSession());
    const region = await openDailyDouble(user);
    await user.selectOptions(within(region).getByLabelText('Equipo que responde'), 'Tíos');
    const register = within(region).getByRole('button', { name: 'Registrar apuesta' });
    const amount = within(region).getByLabelText('Apuesta');

    expect(register).toBeDisabled();
    await user.type(amount, '600');
    expect(register).toBeDisabled();
    expect(amount).toHaveAccessibleDescription(/máximo 500/);
    expect(amount).toHaveAttribute('aria-invalid', 'true');

    await user.clear(amount);
    await user.type(amount, '500');
    expect(register).toBeEnabled();
  });

  it('después de registrar solo aparecen los botones del equipo que apostó', async () => {
    const user = userEvent.setup();
    await renderOperator(dailyDoubleSession());
    const region = await openDailyDouble(user);
    await user.selectOptions(within(region).getByLabelText('Equipo que responde'), 'Tíos');
    await user.type(within(region).getByLabelText('Apuesta'), '500');
    await user.click(within(region).getByRole('button', { name: 'Registrar apuesta' }));

    const clue = screen.getByRole('region', { name: 'Pregunta abierta' });
    expect(within(clue).getByText('Daily Double: Tíos apuesta 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revelar respuesta' })).toBeInTheDocument();
    const awards = screen.getByRole('list', { name: 'Asignar puntos' });
    expect(
      within(awards)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Sumar 500 a Tíos', 'Restar 500 a Tíos']);

    await user.click(screen.getByRole('button', { name: 'Restar 500 a Tíos' }));
    expect(scoreItem('Tíos', -200)).toBeInTheDocument();
    expect(scoreItem('Primos', 1200)).toBeInTheDocument();
    expect((await getSession(SESSION_ID))?.phase).toMatchObject({
      kind: 'clue',
      wager: { teamId: 'equipo-2', amount: 500 },
    });
  });

  it('al recargar esperando la apuesta sigue esperándola', async () => {
    const user = userEvent.setup();
    const first = await renderOperator(dailyDoubleSession());
    await openDailyDouble(user);
    await waitFor(async () =>
      expect((await getSession(SESSION_ID))?.phase).toEqual({ kind: 'wager', clueKey: 'c0-r1' }),
    );
    first.unmount();

    render(<OperatorScreen sessionId={SESSION_ID} />);
    const region = await screen.findByRole('region', { name: 'Daily Double' });
    expect(within(region).getByText('Pregunta 1-2')).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Registrar apuesta' })).toBeInTheDocument();
  });

  it('al recargar con la apuesta registrada conserva el equipo y el monto', async () => {
    const user = userEvent.setup();
    const first = await renderOperator(dailyDoubleSession());
    const region = await openDailyDouble(user);
    await user.type(within(region).getByLabelText('Apuesta'), '800');
    await user.click(within(region).getByRole('button', { name: 'Registrar apuesta' }));
    await waitFor(async () =>
      expect((await getSession(SESSION_ID))?.phase).toMatchObject({ wager: { amount: 800 } }),
    );
    first.unmount();

    render(<OperatorScreen sessionId={SESSION_ID} />);
    const clue = await screen.findByRole('region', { name: 'Pregunta abierta' });
    expect(within(clue).getByText('Daily Double: Primos apuesta 800')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumar 800 a Primos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /a Tíos$/ })).not.toBeInTheDocument();
  });
});

describe('OperatorScreen: Final', () => {
  const FINAL = {
    category: 'Cumpleañero',
    question: 'Pregunta final',
    answer: 'Respuesta final',
  };

  /** Primos 1200, Tíos 400, Abuelos 800 y Sobrinos 0, recién entrados al Final. */
  function finalSession(
    scores = [1200, 400, 800, 0],
    names = ['Primos', 'Tíos', 'Abuelos', 'Sobrinos'],
  ) {
    let n = 0;
    let session = startGame(
      [{ board: makeCompleteBoard({ final: { ...FINAL } }), multiplier: 1 }],
      names,
      {
        sessionId: SESSION_ID,
        now: 1_700_000_000_000,
        makeTeamId: () => `equipo-${++n}`,
        withFinal: true,
      },
    );
    session = { ...session, teams: session.teams.map((t, i) => ({ ...t, score: scores[i]! })) };
    return gameReducer(session, { type: 'finish' }, 1_700_000_000_000);
  }

  function withWagers(session: GameSession, wagers: Record<string, number>): GameSession {
    return Object.entries(wagers).reduce(
      (current, [teamId, amount]) =>
        gameReducer(current, { type: 'setFinalWager', teamId, amount }, 1),
      session,
    );
  }

  /** Apuestas: Primos 1000, Tíos 400, Abuelos 0. */
  function inClue(): GameSession {
    const session = withWagers(finalSession(), {
      'equipo-1': 1000,
      'equipo-2': 400,
      'equipo-3': 0,
    });
    return gameReducer(session, { type: 'showFinalClue' }, 1);
  }

  function inReveal(): GameSession {
    return gameReducer(inClue(), { type: 'startFinalReveal' }, 1);
  }

  function finalRegion() {
    return screen.getByRole('region', { name: 'Final Jeopardy!' });
  }

  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('en las apuestas muestra la pista, el máximo de cada participante y quiénes no participan', async () => {
    await renderOperator(finalSession());
    const region = finalRegion();
    expect(within(region).getByText('Categoría: Cumpleañero')).toBeInTheDocument();
    expect(within(region).getByText('Pregunta final')).toBeInTheDocument();
    expect(within(region).getByText('Respuesta final')).toBeInTheDocument();

    const wagers = within(region).getByRole('list', { name: 'Apuestas del Final' });
    expect(
      within(wagers)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Tíos', 'Abuelos', 'Primos']);
    expect(within(wagers).getByRole('listitem', { name: 'Primos' })).toHaveTextContent('máx. 1200');
    expect(within(wagers).getByRole('listitem', { name: 'Tíos' })).toHaveTextContent('máx. 400');

    const outside = within(region).getByRole('region', { name: 'No participan' });
    expect(outside).toHaveTextContent('Sobrinos');
    expect(outside).not.toHaveTextContent('Primos');
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
  });

  it('rechaza una apuesta mayor al puntaje e indica el máximo', async () => {
    const user = userEvent.setup();
    await renderOperator(finalSession());
    await user.type(screen.getByLabelText('Apuesta de Tíos'), '401');
    expect(screen.getByRole('button', { name: 'Anotar apuesta de Tíos' })).toBeDisabled();
    expect(screen.getByLabelText('Apuesta de Tíos')).toHaveAccessibleDescription(/máximo 400/);
  });

  it('Mostrar pista está deshabilitado hasta anotar todas las apuestas', async () => {
    const user = userEvent.setup();
    await renderOperator(finalSession());
    const show = screen.getByRole('button', { name: 'Mostrar pista' });
    for (const [name, amount] of [
      ['Tíos', '300'],
      ['Abuelos', '0'],
    ] as const) {
      await user.type(screen.getByLabelText(`Apuesta de ${name}`), amount);
      await user.click(screen.getByRole('button', { name: `Anotar apuesta de ${name}` }));
    }
    expect(show).toBeDisabled();
    // Se puede cambiar una apuesta ya anotada.
    await user.clear(screen.getByLabelText('Apuesta de Tíos'));
    await user.type(screen.getByLabelText('Apuesta de Tíos'), '400');
    await user.click(screen.getByRole('button', { name: 'Anotar apuesta de Tíos' }));
    await user.type(screen.getByLabelText('Apuesta de Primos'), '1200');
    await user.click(screen.getByRole('button', { name: 'Anotar apuesta de Primos' }));
    expect(show).toBeEnabled();

    await user.click(show);
    expect(screen.getByRole('button', { name: 'Iniciar temporizador' })).toBeInTheDocument();
    const stored = await getSession(SESSION_ID);
    expect(stored?.phase).toMatchObject({
      stage: 'clue',
      wagers: { 'equipo-1': 1200, 'equipo-2': 400, 'equipo-3': 0 },
    });
  });

  it('el temporizador reproduce la música, avanza y al llegar a 0 la detiene', async () => {
    await renderOperator(inClue());
    const timer = screen.getByRole('timer', { name: 'Tiempo restante' });
    expect(timer).toHaveTextContent('30');
    expect(play).not.toHaveBeenCalled();

    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar temporizador' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Reiniciar temporizador' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(10_000));
    expect(timer).toHaveTextContent('20');
    pause.mockClear();
    act(() => vi.advanceTimersByTime(25_000));
    expect(timer).toHaveTextContent('0');
    expect(pause).toHaveBeenCalled();
    // Sigue en la pista hasta que el operador pase a la revelación.
    expect(screen.getByRole('button', { name: 'Pasar a la revelación' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar temporizador' }));
    expect(play).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(1_000));
    expect(timer).toHaveTextContent('29');
  });

  it('silenciar la música no detiene la cuenta regresiva', async () => {
    const user = userEvent.setup();
    const { container } = await renderOperator(inClue());
    await user.click(screen.getByRole('button', { name: 'Iniciar temporizador' }));
    await user.click(screen.getByRole('button', { name: 'Silenciar música' }));
    expect(container.querySelector('audio')!.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Activar música' })).toBeInTheDocument();
  });

  it('Acertó y Falló solo aparecen para el equipo en turno, en orden', async () => {
    const user = userEvent.setup();
    await renderOperator(inReveal());
    expect(screen.getAllByRole('button', { name: 'Acertó' })).toHaveLength(1);
    const turn = screen.getByRole('region', { name: 'En turno: Tíos' });
    expect(turn).toHaveTextContent('Apuesta: 400');

    await user.click(within(turn).getByRole('button', { name: 'Acertó' }));
    expect(scoreItem('Tíos', 800)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'En turno: Abuelos' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Equipos juzgados' })).toHaveTextContent(
      'Tíos: acertó, apuesta 400, puntaje 800',
    );
    expect(screen.queryByRole('button', { name: 'Ir al podio' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Falló' }));
    await user.click(screen.getByRole('button', { name: 'Falló' }));
    expect(scoreItem('Primos', 200)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acertó' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar respuesta en la TV' }));
    expect(lastTvView()?.phase).toMatchObject({ answer: 'Respuesta final' });

    await user.click(screen.getByRole('button', { name: 'Ir al podio' }));
    expect(screen.getByRole('heading', { name: 'Podio' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Podio' }))
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual([
      'Posición 1: Tíos, 800 puntos',
      'Posición 1: Abuelos, 800 puntos',
      'Posición 3: Primos, 200 puntos',
      'Posición 4: Sobrinos, 0 puntos',
    ]);
  });

  it('terminar durante el Final pide confirmación y no aplica las apuestas pendientes', async () => {
    const user = userEvent.setup();
    await renderOperator(inReveal());
    await user.click(screen.getByRole('button', { name: 'Terminar juego' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Las apuestas de los equipos sin juzgar no se aplicarán',
    );
    await user.click(screen.getByRole('button', { name: 'Sí, terminar' }));
    expect(scoreItemInPodium('Primos', 1200)).toBeInTheDocument();
    expect(scoreItemInPodium('Tíos', 400)).toBeInTheDocument();
  });

  it('el podio avisa que el Final se saltó', async () => {
    await saveSession(finalSession([0, -200], ['Tíos', 'Sobrinos']));
    render(<OperatorScreen sessionId={SESSION_ID} />);
    expect(await screen.findByRole('heading', { name: 'Podio' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'El Final se saltó porque ningún equipo tenía puntaje positivo.',
    );
  });

  it('al recargar en las apuestas conserva las anotadas y las pendientes', async () => {
    const first = await renderOperator(withWagers(finalSession(), { 'equipo-2': 300 }));
    first.unmount();
    render(<OperatorScreen sessionId={SESSION_ID} />);
    const tios = await screen.findByRole('listitem', { name: 'Tíos' });
    expect(tios).toHaveTextContent('Apuesta anotada: 300');
    expect(screen.getByLabelText('Apuesta de Tíos')).toHaveValue(300);
    expect(screen.getByRole('listitem', { name: 'Primos' })).toHaveTextContent('Sin apuesta');
    expect(screen.getByRole('button', { name: 'Mostrar pista' })).toBeDisabled();
  });

  it('al recargar con el temporizador a los 10 s sigue con unos 20 s y sin música', async () => {
    const session = gameReducer(inClue(), { type: 'startFinalTimer' }, Date.now() - 10_000);
    await renderOperator(session);
    expect(screen.getByRole('timer', { name: 'Tiempo restante' })).toHaveTextContent(/^(20|19)$/);
    expect(screen.getByRole('button', { name: 'Reiniciar temporizador' })).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });

  describe('envíos desde los celulares', () => {
    const withBuzzers = (session: GameSession): GameSession => ({
      ...session,
      buzzersEnabled: true,
    });
    const submitWager = (teamId: string, amount: number, deviceLabel: string) => ({
      type: 'submitFinalWager' as const,
      teamId,
      amount,
      deviceId: `d-${deviceLabel}`,
      deviceLabel,
    });
    const submitAnswer = (teamId: string, text: string, deviceLabel: string) => ({
      type: 'submitFinalAnswer' as const,
      teamId,
      text,
      deviceId: `d-${deviceLabel}`,
      deviceLabel,
    });

    it('en las apuestas muestra "Enviada desde …" o "Pendiente" y deja el campo manual', async () => {
      const session = gameReducer(
        withBuzzers(finalSession()),
        submitWager('equipo-1', 500, 'Android'),
        1,
      );
      await renderOperator(withWagers(session, { 'equipo-2': 100 }));
      const primos = screen.getByRole('listitem', { name: 'Primos' });
      expect(primos).toHaveTextContent('Apuesta anotada: 500');
      expect(primos).toHaveTextContent('Enviada desde Android');
      expect(screen.getByRole('listitem', { name: 'Abuelos' })).toHaveTextContent('Pendiente');
      // Anotada a mano: ni enviada ni pendiente
      const tios = screen.getByRole('listitem', { name: 'Tíos' });
      expect(tios).not.toHaveTextContent('Enviada desde');
      expect(tios).not.toHaveTextContent('Pendiente');
      expect(screen.getByLabelText('Apuesta de Primos')).toBeEnabled();
    });

    it('corregir a mano una apuesta enviada quita "Enviada desde"', async () => {
      const user = userEvent.setup();
      const session = gameReducer(
        withBuzzers(finalSession()),
        submitWager('equipo-1', 500, 'Android'),
        1,
      );
      await renderOperator(session);
      await user.clear(screen.getByLabelText('Apuesta de Primos'));
      await user.type(screen.getByLabelText('Apuesta de Primos'), '400');
      await user.click(screen.getByRole('button', { name: 'Anotar apuesta de Primos' }));
      const primos = screen.getByRole('listitem', { name: 'Primos' });
      expect(primos).toHaveTextContent('Apuesta anotada: 400');
      expect(primos).not.toHaveTextContent('Enviada desde');
    });

    it('sin pulsadores no muestra el origen de las apuestas', async () => {
      await renderOperator(finalSession());
      expect(finalRegion()).not.toHaveTextContent('Pendiente');
    });

    it('en la pista marca qué equipos respondieron, sin mostrar el texto', async () => {
      const session = gameReducer(
        withBuzzers(inClue()),
        submitAnswer('equipo-2', '¿Qué es un pastel?', 'iPhone'),
        Date.now(),
      );
      await renderOperator(session);
      const list = screen.getByRole('list', { name: 'Respuestas desde los celulares' });
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Tíos: respondió', 'Abuelos: sin respuesta', 'Primos: sin respuesta']);
      expect(document.body).not.toHaveTextContent('¿Qué es un pastel?');
    });

    it('en la revelación muestra la respuesta enviada del equipo en turno', async () => {
      let session = gameReducer(
        withBuzzers(inClue()),
        submitAnswer('equipo-2', '¿Qué es un pastel?', 'iPhone'),
        Date.now(),
      );
      session = gameReducer(session, { type: 'startFinalReveal' }, 1);
      await renderOperator(session);
      const current = screen.getByRole('region', { name: 'En turno: Tíos' });
      expect(current).toHaveTextContent('Respuesta enviada desde iPhone: ¿Qué es un pastel?');
      expect(within(current).getByRole('button', { name: 'Acertó' })).toBeInTheDocument();
    });
  });

  it('al recargar en la revelación sigue con el siguiente equipo sin rejuzgar', async () => {
    const session = gameReducer(
      inReveal(),
      { type: 'judgeFinal', teamId: 'equipo-2', correct: true },
      1,
    );
    await renderOperator(session);
    expect(screen.getByRole('region', { name: 'En turno: Abuelos' })).toBeInTheDocument();
    expect(scoreItem('Tíos', 800)).toBeInTheDocument();
  });
});

function scoreItemInPodium(name: string, score: number) {
  return within(screen.getByRole('list', { name: 'Podio' })).getByRole('listitem', {
    name: new RegExp(`${name}, ${score} puntos$`),
  });
}

describe('OperatorScreen: publicación a los celulares', () => {
  afterEach(() => {
    uninstallDesktop();
  });

  function buzzSession(): GameSession {
    return makeSession(['Primos', 'Tíos'], { buzzersEnabled: true });
  }

  /** Pregunta c0-r0 abierta con los pulsadores activos. */
  function armedSession(): GameSession {
    const opened = gameReducer(buzzSession(), { type: 'openClue', clueKey: 'c0-r0' }, 1);
    return gameReducer(opened, { type: 'armBuzzers' }, 1);
  }

  const buzzEvent = (teamId: string, deviceId: string) => ({
    type: 'buzz' as const,
    teamId,
    deviceId,
    deviceLabel: deviceId,
  });

  function lastPublished(fake: FakeDesktop): DeviceGameView | null | undefined {
    const calls = vi.mocked(fake.api.lan.publishGame).mock.calls;
    return calls.at(-1)?.[0];
  }

  it('dos toques en el mismo instante dejan como ganador al primero', async () => {
    const fake = installDesktop();
    await renderOperator(armedSession());
    await waitFor(() => expect(lastPublished(fake)?.common.buzz?.status).toBe('armed'));

    act(() => {
      fake.emitDeviceEvent(buzzEvent('equipo-2', 'celu-tios'));
      fake.emitDeviceEvent(buzzEvent('equipo-1', 'celu-primos'));
    });

    await waitFor(() =>
      expect(lastPublished(fake)?.common.buzz).toMatchObject({
        status: 'answering',
        answeringTeamId: 'equipo-2',
      }),
    );
    expect(lastPublished(fake)?.answeringDeviceId).toBe('celu-tios');
    await waitFor(async () => {
      const saved = await getSession(SESSION_ID);
      expect(saved?.phase).toMatchObject({ buzz: { answering: { teamId: 'equipo-2' } } });
    });
  });

  it('publica la proyección en cada cambio y null al desmontar', async () => {
    const user = userEvent.setup();
    const fake = installDesktop();
    const view = await renderOperator(buzzSession());
    await waitFor(() => expect(lastPublished(fake)?.common.stage).toBe('board'));

    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    await waitFor(() =>
      expect(lastPublished(fake)?.common).toMatchObject({
        stage: 'clue',
        buzz: { status: 'closed' },
      }),
    );
    expect(JSON.stringify(vi.mocked(fake.api.lan.publishGame).mock.calls)).not.toMatch(
      /Pregunta|Respuesta|Categoría/,
    );

    view.unmount();
    expect(lastPublished(fake)).toBeNull();
    expect(fake.api.lan.onDeviceEvent).toHaveBeenCalledTimes(1);
  });

  it('un envío del Final desde un celular llega al reducer', async () => {
    const fake = installDesktop();
    const board = makeCompleteBoard({
      final: { category: 'Cumple', question: 'Pregunta final', answer: 'Respuesta final' },
    });
    let n = 0;
    let session = startGame([{ board, multiplier: 1 }], ['Primos'], {
      sessionId: SESSION_ID,
      now: 1,
      makeTeamId: () => `equipo-${++n}`,
      withFinal: true,
      withBuzzers: true,
    });
    session = gameReducer(session, { type: 'setScore', teamId: 'equipo-1', score: 800 }, 1);
    session = gameReducer(session, { type: 'finish' }, 1);
    await renderOperator(session);

    act(() => {
      fake.emitDeviceEvent({
        type: 'finalWager',
        teamId: 'equipo-1',
        amount: 500,
        deviceId: 'celu-1',
        deviceLabel: 'Android',
      });
    });
    await waitFor(() =>
      expect(lastPublished(fake)?.perTeam['equipo-1']?.final?.wager).toEqual({
        amount: 500,
        deviceLabel: 'Android',
      }),
    );
  });

  it('en la web no publica nada', async () => {
    const fake = makeFakeDesktop();
    await renderOperator(buzzSession());
    await waitFor(() => expect(lastTvView()).toBeDefined());
    expect(fake.api.lan.publishGame).not.toHaveBeenCalled();
    expect(fake.api.lan.onDeviceEvent).not.toHaveBeenCalled();
  });
});

describe('OperatorScreen: pulsadores', () => {
  afterEach(() => {
    vi.useRealTimers();
    uninstallDesktop();
  });

  /** Primos (equipo-1), Tíos (equipo-2) y Abuelos (equipo-3), con pulsadores; c0-r1 es Daily Double. */
  function buzzSession(): GameSession {
    const session = makeSession(['Primos', 'Tíos', 'Abuelos'], { buzzersEnabled: true });
    session.rounds[0]!.boardSnapshot.categories[0]!.clues[1]!.dailyDouble = true;
    return session;
  }

  function buzzRegion() {
    return screen.getByRole('region', { name: 'Pulsadores' });
  }

  function answering(teamId: string, at = Date.now()): GameSession {
    let session = gameReducer(buzzSession(), { type: 'openClue', clueKey: 'c0-r2' }, at);
    session = gameReducer(session, { type: 'armBuzzers' }, at);
    return gameReducer(
      session,
      { type: 'buzz', teamId, deviceId: 'celu', deviceLabel: 'Android 2' },
      at,
    );
  }

  it('activar y cerrar los pulsadores', async () => {
    const user = userEvent.setup();
    installDesktop();
    await renderOperator(buzzSession());
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    await user.click(within(buzzRegion()).getByRole('button', { name: 'Activar pulsadores' }));
    expect(within(buzzRegion()).getByRole('status')).toHaveTextContent('Pulsadores activos…');
    await user.click(within(buzzRegion()).getByRole('button', { name: 'Cerrar pulsadores' }));
    expect(
      within(buzzRegion()).getByRole('button', { name: 'Activar pulsadores' }),
    ).toBeInTheDocument();
    expect(scoreItem('Primos', 0)).toBeInTheDocument();
  });

  it('con un equipo respondiendo muestra quién, la cuenta de 5 s y el valor en juego', async () => {
    await renderOperator(answering('equipo-2'));
    const region = buzzRegion();
    expect(within(region).getByRole('status')).toHaveTextContent('Responde: Tíos (Android 2)');
    expect(region).toHaveTextContent('5 s');
    expect(within(region).getByRole('button', { name: 'Correcta (+300)' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Incorrecta (−300)' })).not.toHaveAttribute(
      'data-highlighted',
    );
    expect(within(region).getByRole('button', { name: 'Cerrar pulsadores' })).toBeInTheDocument();
    // Los botones manuales siguen disponibles
    expect(screen.getByRole('button', { name: 'Sumar 300 a Abuelos' })).toBeInTheDocument();
  });

  it('a los 5 s muestra ¡Tiempo! y resalta Incorrecta sin cambiar puntajes', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const session = answering('equipo-2');
    await saveSession(session);
    render(<OperatorScreen sessionId={session.id} />);
    await vi.waitFor(() => screen.getByRole('region', { name: 'Pulsadores' }));
    act(() => vi.advanceTimersByTime(2_000));
    expect(buzzRegion()).toHaveTextContent('3 s');
    act(() => vi.advanceTimersByTime(3_000));
    expect(buzzRegion()).toHaveTextContent('¡Tiempo!');
    expect(screen.getByRole('button', { name: 'Incorrecta (−300)' })).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    expect(scoreItem('Tíos', 0)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correcta (+300)' })).toBeEnabled();
  });

  it('Incorrecta resta, reabre y deja visibles los fallados', async () => {
    const user = userEvent.setup();
    await renderOperator(answering('equipo-2'));
    await user.click(screen.getByRole('button', { name: 'Incorrecta (−300)' }));
    expect(scoreItem('Tíos', -300)).toBeInTheDocument();
    expect(within(buzzRegion()).getByRole('status')).toHaveTextContent('Pulsadores activos…');
    expect(buzzRegion()).toHaveTextContent('Fallaron: Tíos');
  });

  it('Correcta suma, cierra y muestra quién elige', async () => {
    const user = userEvent.setup();
    await renderOperator(answering('equipo-1'));
    expect(screen.queryByText(/^Elige:/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Correcta (+300)' }));
    expect(scoreItem('Primos', 300)).toBeInTheDocument();
    expect(screen.getByText('Elige: Primos')).toBeInTheDocument();
    expect(
      within(buzzRegion()).getByRole('button', { name: 'Activar pulsadores' }),
    ).toBeInTheDocument();
  });

  it('en un Daily Double no aparece Activar pulsadores', async () => {
    const user = userEvent.setup();
    await renderOperator(buzzSession());
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 200, Daily Double' }));
    await user.type(screen.getByLabelText('Apuesta'), '100');
    await user.click(screen.getByRole('button', { name: 'Registrar apuesta' }));
    expect(screen.getByRole('region', { name: 'Pregunta abierta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activar pulsadores' })).not.toBeInTheDocument();
  });

  it('sin pulsadores no aparece Activar pulsadores', async () => {
    const user = userEvent.setup();
    await renderOperator(makeSession());
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100' }));
    expect(screen.queryByRole('region', { name: 'Pulsadores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activar pulsadores' })).not.toBeInTheDocument();
  });

  it('la lista de dispositivos muestra el equipo de cada uno', async () => {
    const user = userEvent.setup();
    installDesktop(
      makeFakeDesktop(
        makeLanStatus({
          devices: [
            { deviceId: 'a', label: 'Android', connectedAt: 1, teamId: 'equipo-2' },
            { deviceId: 'b', label: 'iPhone', connectedAt: 2 },
          ],
        }),
      ),
    );
    await renderOperator(buzzSession());
    await user.click(screen.getByRole('button', { name: 'Conectar dispositivos' }));
    const list = await screen.findByRole('list', { name: 'Dispositivos conectados' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Android · Tíos', 'iPhone · Sin equipo']);
  });
});
