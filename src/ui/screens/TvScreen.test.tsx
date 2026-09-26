import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startGame, type GameSession, type TvView } from '../../domain/game';
import { projectForTv } from '../../domain/projection';
import { putImage, saveSession } from '../../storage/db';
import { createMemoryBus, type MemoryBus, type SyncMessage, type SyncTransport } from '../../sync';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { OperatorScreen } from './OperatorScreen';
import { TvScreen } from './TvScreen';

// Las ventanas se comunican por un bus en memoria en lugar de BroadcastChannel.
const channels = vi.hoisted(() => ({ bus: null as MemoryBus | null }));
vi.mock('../../sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../sync')>();
  return { ...actual, createBroadcastTransport: () => channels.bus!.connect() };
});

const SESSION_ID = 'sesion-tv';

function makeSession(): GameSession {
  let n = 0;
  return startGame(makeCompleteBoard(), ['Primos', 'Tíos'], {
    sessionId: SESSION_ID,
    now: 1_700_000_000_000,
    makeTeamId: () => `equipo-${++n}`,
  });
}

let operator: SyncTransport;
let received: SyncMessage[];

/** Envía una vista como lo haría el operador y espera a que la TV la dibuje. */
async function sendView(view: TvView) {
  await act(async () => {
    operator.send({ type: 'state', view });
    await Promise.resolve();
  });
}

beforeEach(() => {
  channels.bus = createMemoryBus();
  operator = channels.bus.connect();
  received = [];
  operator.subscribe((msg) => received.push(msg));
  URL.createObjectURL = vi.fn(() => 'blob:imagen-tv');
  URL.revokeObjectURL = vi.fn();
});

describe('TvScreen', () => {
  it('muestra la pantalla de espera mientras no llega ninguna vista', async () => {
    render(<TvScreen sessionId={SESSION_ID} />);
    expect(screen.getByRole('status')).toHaveTextContent('Esperando al operador…');
    expect(screen.getByRole('heading', { level: 1, name: 'Pantalla de TV' })).toBeInTheDocument();
    await act(() => Promise.resolve());
    expect(received).toEqual([{ type: 'hello' }]);
  });

  it('en fase tablero muestra título, tablero con celdas usadas y puntajes, sin botones', async () => {
    render(<TvScreen sessionId={SESSION_ID} />);
    const session = makeSession();
    session.usedClues = ['c0-r0'];
    session.teams[0]!.score = 100;
    await sendView(projectForTv(session));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Tablero de prueba' }),
    ).toBeInTheDocument();
    const board = screen.getByRole('table', { name: 'Tablero' });
    expect(within(board).getByRole('columnheader', { name: 'Categoría 1' })).toBeInTheDocument();
    expect(within(board).getAllByRole('cell', { name: '100, usada' })).toHaveLength(1);
    expect(within(board).getAllByRole('cell', { name: '100' })).toHaveLength(5);
    expect(screen.getByRole('listitem', { name: 'Primos: 100 puntos' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Tíos: 0 puntos' })).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryByText('Esperando al operador…')).not.toBeInTheDocument();
  });

  it('con una pregunta abierta muestra pregunta, imagen y valor, pero no la respuesta', async () => {
    await putImage('imagen-1', new Blob(['png'], { type: 'image/png' }));
    const { container } = render(<TvScreen sessionId={SESSION_ID} />);
    const session = makeSession();
    session.boardSnapshot.categories[2]!.clues[1]!.imageId = 'imagen-1';
    session.phase = { kind: 'clue', clueKey: 'c2-r1', revealed: false };
    await sendView(projectForTv(session));

    const clue = screen.getByRole('region', { name: 'Pregunta' });
    expect(within(clue).getByText('Pregunta 3-2')).toBeInTheDocument();
    expect(within(clue).getByText('200')).toBeInTheDocument();
    expect(await within(clue).findByRole('img', { name: 'Imagen de la pregunta' })).toHaveAttribute(
      'src',
      'blob:imagen-tv',
    );
    // Ni siquiera oculta: la respuesta no está en el DOM.
    expect(container.innerHTML).not.toContain('Respuesta');
    expect(screen.queryByRole('region', { name: 'Respuesta' })).not.toBeInTheDocument();

    session.phase = { kind: 'clue', clueKey: 'c2-r1', revealed: true };
    await sendView(projectForTv(session));
    expect(screen.getByRole('region', { name: 'Respuesta' })).toHaveTextContent('Respuesta 3-2');
  });

  it('la imagen de la respuesta reemplaza a la de la pregunta solo al revelar', async () => {
    // Una URL distinta por carga, en orden: 1 es la pregunta y 2 la respuesta.
    let loads = 0;
    URL.createObjectURL = vi.fn(() => `blob:imagen-${++loads}`);
    await putImage('imagen-pregunta', new Blob(['p'], { type: 'image/png' }));
    await putImage('imagen-respuesta', new Blob(['rr'], { type: 'image/png' }));
    render(<TvScreen sessionId={SESSION_ID} />);
    const session = makeSession();
    const clue = session.boardSnapshot.categories[2]!.clues[1]!;
    clue.imageId = 'imagen-pregunta';
    clue.answerImageId = 'imagen-respuesta';
    session.phase = { kind: 'clue', clueKey: 'c2-r1', revealed: false };
    await sendView(projectForTv(session));

    const region = screen.getByRole('region', { name: 'Pregunta' });
    expect(
      await within(region).findByRole('img', { name: 'Imagen de la pregunta' }),
    ).toHaveAttribute('src', 'blob:imagen-1');
    expect(within(region).getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByRole('img', { name: 'Imagen de la respuesta' })).not.toBeInTheDocument();

    session.phase = { kind: 'clue', clueKey: 'c2-r1', revealed: true };
    await sendView(projectForTv(session));

    expect(
      await within(region).findByRole('img', { name: 'Imagen de la respuesta' }),
    ).toHaveAttribute('src', 'blob:imagen-2');
    expect(within(region).getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByRole('img', { name: 'Imagen de la pregunta' })).not.toBeInTheDocument();
  });

  it('con el juego terminado muestra el podio', async () => {
    render(<TvScreen sessionId={SESSION_ID} />);
    const session = makeSession();
    session.teams[1]!.score = 500;
    session.phase = { kind: 'finished' };
    await sendView(projectForTv(session));

    const podium = screen.getByRole('list', { name: 'Podio' });
    expect(
      within(podium)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Posición 1: Tíos, 500 puntos', 'Posición 2: Primos, 0 puntos']);
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
  });

  it('un click en la TV no cambia nada ni envía acciones', async () => {
    const user = userEvent.setup();
    const { container } = render(<TvScreen sessionId={SESSION_ID} />);
    await sendView(projectForTv(makeSession()));
    const before = container.innerHTML;

    const board = screen.getByRole('table', { name: 'Tablero' });
    for (const cell of within(board).getAllByRole('cell').slice(0, 5)) await user.click(cell);
    await user.click(screen.getByRole('listitem', { name: 'Primos: 0 puntos' }));
    await act(() => Promise.resolve());

    expect(container.innerHTML).toBe(before);
    expect(received.every((msg) => msg.type === 'hello')).toBe(true);
  });

  it('vuelve a la pantalla de espera cuando el operador se va', async () => {
    render(<TvScreen sessionId={SESSION_ID} />);
    await sendView(projectForTv(makeSession()));
    expect(screen.getByRole('table', { name: 'Tablero' })).toBeInTheDocument();

    await act(async () => {
      operator.send({ type: 'bye' });
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Esperando al operador…');
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
  });
});

describe('TvScreen: Daily Double', () => {
  // Categoría 3, 200 (c2-r1) es Daily Double, con imagen de pregunta.
  function dailyDoubleSession(): GameSession {
    const session = makeSession();
    const clue = session.boardSnapshot.categories[2]!.clues[1]!;
    clue.dailyDouble = true;
    clue.imageId = 'imagen-dd';
    return session;
  }

  it('anuncia el Daily Double con la categoría y el valor, sin la pregunta', async () => {
    const { container } = render(<TvScreen sessionId={SESSION_ID} />);
    const session = dailyDoubleSession();
    session.phase = { kind: 'wager', clueKey: 'c2-r1' };
    await sendView(projectForTv(session));

    const announcement = screen.getByRole('region', { name: 'Daily Double' });
    expect(within(announcement).getByText('DAILY DOUBLE!')).toBeInTheDocument();
    expect(within(announcement).getByText('Categoría 3')).toBeInTheDocument();
    expect(within(announcement).getByText('200')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Pregunta 3-2');
    expect(container.innerHTML).not.toContain('Respuesta 3-2');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Tablero' })).not.toBeInTheDocument();
  });

  it('con la apuesta muestra la pregunta, el equipo y el monto', async () => {
    await putImage('imagen-dd', new Blob(['png'], { type: 'image/png' }));
    render(<TvScreen sessionId={SESSION_ID} />);
    const session = dailyDoubleSession();
    session.phase = {
      kind: 'clue',
      clueKey: 'c2-r1',
      revealed: false,
      wager: { teamId: 'equipo-1', amount: 800 },
    };
    await sendView(projectForTv(session));

    const clue = screen.getByRole('region', { name: 'Pregunta' });
    expect(within(clue).getByText('Pregunta 3-2')).toBeInTheDocument();
    expect(within(clue).getByText('Primos apuesta 800')).toBeInTheDocument();
    expect(
      await within(clue).findByRole('img', { name: 'Imagen de la pregunta' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('DAILY DOUBLE!')).not.toBeInTheDocument();
  });

  it('en el tablero las celdas Daily Double se ven igual que las demás', async () => {
    const plain = render(<TvScreen sessionId={SESSION_ID} />);
    await sendView(projectForTv(makeSession()));
    const plainHtml = plain.container.innerHTML;
    plain.unmount();

    const marked = render(<TvScreen sessionId={SESSION_ID} />);
    await sendView(projectForTv(dailyDoubleSession()));
    expect(marked.container.innerHTML).toBe(plainHtml);
    expect(marked.container.innerHTML).not.toMatch(/DD|Daily Double/i);
  });
});

describe('operador y TV juntos', () => {
  it('la TV refleja cada cambio del operador y la respuesta solo tras revelar', async () => {
    const user = userEvent.setup();
    await saveSession(makeSession());
    const tv = within(render(<TvScreen sessionId={SESSION_ID} />).container);
    const op = within(render(<OperatorScreen sessionId={SESSION_ID} />).container);

    expect(await tv.findByRole('table', { name: 'Tablero' })).toBeInTheDocument();

    await user.click(await op.findByRole('button', { name: 'Categoría 2, 300' }));
    const clue = await tv.findByRole('region', { name: 'Pregunta' });
    expect(clue).toHaveTextContent('Pregunta 2-3');
    expect(tv.queryByText('Respuesta 2-3')).not.toBeInTheDocument();

    await user.click(op.getByRole('button', { name: 'Revelar respuesta' }));
    expect(await tv.findByText('Respuesta 2-3')).toBeInTheDocument();

    await user.click(op.getByRole('button', { name: 'Sumar 300 a Tíos' }));
    expect(await tv.findByRole('listitem', { name: 'Tíos: 300 puntos' })).toBeInTheDocument();

    await user.click(op.getByRole('button', { name: 'Volver al tablero' }));
    expect(await tv.findByRole('cell', { name: '300, usada' })).toBeInTheDocument();
  });

  it('un Daily Double se anuncia sin la pregunta y la muestra tras la apuesta', async () => {
    const user = userEvent.setup();
    const session = makeSession();
    session.boardSnapshot.categories[1]!.clues[2]!.dailyDouble = true;
    await saveSession(session);
    const tvView = render(<TvScreen sessionId={SESSION_ID} />);
    const tv = within(tvView.container);
    const op = within(render(<OperatorScreen sessionId={SESSION_ID} />).container);

    await user.click(await op.findByRole('button', { name: 'Categoría 2, 300, Daily Double' }));
    expect(await tv.findByText('DAILY DOUBLE!')).toBeInTheDocument();
    expect(tvView.container.innerHTML).not.toContain('Pregunta 2-3');

    await user.type(op.getByLabelText('Apuesta'), '400');
    await user.click(op.getByRole('button', { name: 'Registrar apuesta' }));
    const clue = await tv.findByRole('region', { name: 'Pregunta' });
    expect(clue).toHaveTextContent('Pregunta 2-3');
    expect(clue).toHaveTextContent('Primos apuesta 400');

    await user.click(op.getByRole('button', { name: 'Sumar 400 a Primos' }));
    expect(await tv.findByRole('listitem', { name: 'Primos: 400 puntos' })).toBeInTheDocument();
  });

  it('al desmontar el operador la TV pasa a espera', async () => {
    await saveSession(makeSession());
    const tv = within(render(<TvScreen sessionId={SESSION_ID} />).container);
    const op = render(<OperatorScreen sessionId={SESSION_ID} />);
    expect(await tv.findByRole('table', { name: 'Tablero' })).toBeInTheDocument();

    op.unmount();
    expect(await tv.findByRole('status')).toHaveTextContent('Esperando al operador…');
  });
});
