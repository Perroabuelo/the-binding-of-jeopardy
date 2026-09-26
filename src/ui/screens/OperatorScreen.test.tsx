import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allClueKeys } from '../../domain/board';
import { startGame, type GameSession, type TvView } from '../../domain/game';
import { getSession, putImage, saveSession } from '../../storage/db';
import { createMemoryBus, type MemoryBus, type SyncMessage } from '../../sync';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { OperatorScreen } from './OperatorScreen';

const SESSION_ID = 'sesion-prueba';

function makeSession(teamNames = ['Primos', 'Tíos'], overrides: Partial<GameSession> = {}) {
  let n = 0;
  const session = startGame(makeCompleteBoard(), teamNames, {
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
    session.boardSnapshot.categories[0]!.clues[0]!.imageId = 'imagen-1';
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
    const clue = session.boardSnapshot.categories[0]!.clues[0]!;
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

describe('OperatorScreen: Daily Double', () => {
  // Categoría 1, 200 (c0-r1) es Daily Double. Primos tiene 1200 y Tíos 300.
  function dailyDoubleSession() {
    const session = makeSession();
    session.boardSnapshot.categories[0]!.clues[1]!.dailyDouble = true;
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
