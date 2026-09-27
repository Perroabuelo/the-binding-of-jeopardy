import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Board } from '../../domain/board';
import { MAX_ROUNDS, MAX_TEAMS, type GameSession } from '../../domain/game';
import { getSession, saveBoard } from '../../storage/db';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { installDesktop, uninstallDesktop } from '../../../tests/fixtures/desktop';
import { App } from '../App';
import { TeamSetupScreen } from './TeamSetupScreen';

async function renderWithBoard(board = makeCompleteBoard()) {
  await saveBoard(board);
  render(<TeamSetupScreen boardId={board.id} />);
  await screen.findByRole('button', { name: 'Comenzar juego' });
  return board;
}

describe('TeamSetupScreen', () => {
  it('empieza con dos equipos vacíos', async () => {
    await renderWithBoard();
    expect(screen.getByLabelText('Nombre del equipo 1')).toHaveValue('');
    expect(screen.getByLabelText('Nombre del equipo 2')).toHaveValue('');
    expect(screen.queryByLabelText('Nombre del equipo 3')).not.toBeInTheDocument();
  });

  it('iniciar con dos equipos abre el operador con el tablero y puntajes en 0', async () => {
    const user = userEvent.setup();
    const board = makeCompleteBoard();
    await saveBoard(board);
    window.location.hash = `#/boards/${board.id}/play`;
    render(<App />);

    await user.type(await screen.findByLabelText('Nombre del equipo 1'), 'Primos');
    await user.type(screen.getByLabelText('Nombre del equipo 2'), 'Tíos');
    await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Operador' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Tablero' })).toBeInTheDocument();
    const scores = screen.getByRole('list', { name: 'Puntajes' });
    expect(within(scores).getByRole('listitem', { name: 'Primos: 0 puntos' })).toBeInTheDocument();
    expect(within(scores).getByRole('listitem', { name: 'Tíos: 0 puntos' })).toBeInTheDocument();

    const sessionId = /^#\/play\/(.+)$/.exec(window.location.hash)?.[1];
    expect(sessionId).toBeTruthy();
    const session = await getSession(decodeURIComponent(sessionId!));
    expect(session?.teams.map((team) => [team.name, team.score])).toEqual([
      ['Primos', 0],
      ['Tíos', 0],
    ]);
    expect(session?.rounds[0]!.boardSnapshot.title).toBe(board.title);
  });

  it('sin equipos no inicia e indica que se requiere al menos uno', async () => {
    const user = userEvent.setup();
    await renderWithBoard();
    await user.click(screen.getByRole('button', { name: 'Quitar equipo 2' }));
    await user.click(screen.getByRole('button', { name: 'Quitar equipo 1' }));
    await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 1 equipo/);
    expect(window.location.hash).not.toMatch(/^#\/play\//);
  });

  it('un nombre vacío impide iniciar', async () => {
    const user = userEvent.setup();
    await renderWithBoard();
    await user.type(screen.getByLabelText('Nombre del equipo 1'), 'Primos');
    await user.type(screen.getByLabelText('Nombre del equipo 2'), '   ');
    await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El equipo 2 necesita un nombre.');
    expect(window.location.hash).not.toMatch(/^#\/play\//);
  });

  it('permite agregar equipos hasta el máximo y quitar uno intermedio', async () => {
    const user = userEvent.setup();
    await renderWithBoard();
    const add = screen.getByRole('button', { name: 'Agregar equipo' });
    for (let i = 2; i < MAX_TEAMS; i++) await user.click(add);

    expect(screen.getByLabelText(`Nombre del equipo ${MAX_TEAMS}`)).toBeInTheDocument();
    expect(add).toBeDisabled();

    await user.type(screen.getByLabelText('Nombre del equipo 1'), 'Uno');
    await user.type(screen.getByLabelText('Nombre del equipo 2'), 'Dos');
    await user.click(screen.getByRole('button', { name: 'Quitar equipo 1' }));
    expect(screen.getByLabelText('Nombre del equipo 1')).toHaveValue('Dos');
    expect(add).toBeEnabled();
  });

  it('con un tablero incompleto avisa y enlaza al editor', async () => {
    const board = makeCompleteBoard({ title: '' });
    await saveBoard(board);
    render(<TeamSetupScreen boardId={board.id} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/no está listo para jugar/);
    expect(screen.getByRole('link', { name: 'Completar el tablero en el editor' })).toHaveAttribute(
      'href',
      `#/boards/${board.id}`,
    );
    expect(screen.queryByRole('button', { name: 'Comenzar juego' })).not.toBeInTheDocument();
  });

  it('avisa si el tablero no existe', async () => {
    render(<TeamSetupScreen boardId="no-existe" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el tablero.');
  });

  describe('Final Jeopardy!', () => {
    const FINAL = { category: 'Cumpleañero', question: 'Pregunta final', answer: 'Respuesta' };

    async function startWith(board = makeCompleteBoard({ final: { ...FINAL } }), uncheck = false) {
      const user = userEvent.setup();
      await renderWithBoard(board);
      if (uncheck)
        await user.click(screen.getByRole('checkbox', { name: 'Jugar Final Jeopardy!' }));
      await user.type(screen.getByLabelText('Nombre del equipo 1'), 'Primos');
      await user.click(screen.getByRole('button', { name: 'Quitar equipo 2' }));
      await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));
      await waitFor(() => expect(window.location.hash).toMatch(/^#\/play\//));
      const sessionId = /^#\/play\/(.+)$/.exec(window.location.hash)![1]!;
      return getSession(decodeURIComponent(sessionId));
    }

    it('con una pista final completa la casilla está habilitada y marcada', async () => {
      await renderWithBoard(makeCompleteBoard({ final: { ...FINAL } }));
      const checkbox = screen.getByRole('checkbox', { name: 'Jugar Final Jeopardy!' });
      expect(checkbox).toBeEnabled();
      expect(checkbox).toBeChecked();
    });

    it('marcada, la sesión se guarda con finalEnabled en true', async () => {
      const session = await startWith();
      expect(session?.finalEnabled).toBe(true);
    });

    it('desmarcada, la sesión se guarda con finalEnabled en false', async () => {
      const session = await startWith(undefined, true);
      expect(session?.finalEnabled).toBe(false);
    });

    it.each([
      ['ausente', undefined],
      ['incompleta', { ...FINAL, answer: '' }],
    ])('con la pista final %s la casilla no está disponible', async (_, final) => {
      const board = makeCompleteBoard(final ? { final } : {});
      await renderWithBoard(board);
      const checkbox = screen.getByRole('checkbox', { name: 'Jugar Final Jeopardy!' });
      expect(checkbox).toBeDisabled();
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toHaveAccessibleDescription(/completa la pista final/);
    });

    it('con la pista final incompleta el juego se inicia sin Final', async () => {
      const session = await startWith(makeCompleteBoard({ final: { ...FINAL, question: ' ' } }));
      expect(session?.finalEnabled).toBe(false);
    });
  });

  describe('rondas', () => {
    const FINAL = { category: 'Cumpleañero', question: 'Pregunta final', answer: 'Respuesta' };

    function boardNamed(id: string, title: string, overrides: Partial<Board> = {}): Board {
      return makeCompleteBoard({ id, title, ...overrides });
    }

    /** Guarda "Cumple B", "Cumple C" y un tablero no listo, abre "Cumple A" y activa rondas. */
    async function setup(main = boardNamed('a', 'Cumple A'), others?: Board[]) {
      const user = userEvent.setup();
      const boards = others ?? [
        boardNamed('b', 'Cumple B'),
        boardNamed('c', 'Cumple C'),
        boardNamed('x', 'Sin terminar', { categories: [] }),
      ];
      for (const board of boards) await saveBoard(board);
      await renderWithBoard(main);
      await user.click(screen.getByRole('checkbox', { name: 'Jugar con rondas' }));
      return user;
    }

    async function startGameWith(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText('Nombre del equipo 1'), 'Primos');
      await user.click(screen.getByRole('button', { name: 'Quitar equipo 2' }));
      await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));
      await waitFor(() => expect(window.location.hash).toMatch(/^#\/play\//));
      const sessionId = /^#\/play\/(.+)$/.exec(window.location.hash)![1]!;
      return getSession(decodeURIComponent(sessionId));
    }

    function roundsOf(session: GameSession | null) {
      return session?.rounds.map((round) => [round.boardSnapshot.id, round.multiplier]);
    }

    function optionNamed(select: HTMLElement, name: string): HTMLOptionElement {
      return within(select).getByRole('option', { name }) as HTMLOptionElement;
    }

    it('sin activar rondas, la sesión tiene una ronda x1 con el tablero actual', async () => {
      const user = userEvent.setup();
      await renderWithBoard(boardNamed('a', 'Cumple A'));
      expect(screen.getByRole('checkbox', { name: 'Jugar con rondas' })).not.toBeChecked();
      expect(screen.queryByRole('list', { name: 'Rondas' })).not.toBeInTheDocument();
      const session = await startGameWith(user);
      expect(roundsOf(session)).toEqual([['a', 1]]);
    });

    it('al activar, muestra la ronda 1 con el tablero actual y la ronda 2 en x2', async () => {
      await setup();
      expect(screen.getByLabelText('Tablero de la ronda 1')).toHaveValue('a');
      expect(screen.getByLabelText('Multiplicador de la ronda 1')).toHaveValue(1);
      expect(screen.getByLabelText('Tablero de la ronda 2')).toHaveValue('');
      expect(screen.getByLabelText('Multiplicador de la ronda 2')).toHaveValue(2);
      expect(screen.getByText('Elige un tablero para la ronda 2.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Comenzar juego' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /Quitar ronda/ })).not.toBeInTheDocument();
    });

    it('el selector no ofrece tableros no listos y deshabilita los ya elegidos', async () => {
      const user = userEvent.setup();
      await setup();
      const round2 = screen.getByLabelText('Tablero de la ronda 2');
      expect(
        within(round2).queryByRole('option', { name: 'Sin terminar' }),
      ).not.toBeInTheDocument();
      expect(optionNamed(round2, 'Cumple A').disabled).toBe(true);
      expect(optionNamed(round2, 'Cumple B').disabled).toBe(false);

      await user.selectOptions(round2, 'b');
      expect(optionNamed(screen.getByLabelText('Tablero de la ronda 1'), 'Cumple B').disabled).toBe(
        true,
      );
    });

    it('un multiplicador en 11 muestra el error y no permite comenzar', async () => {
      const user = userEvent.setup();
      await setup();
      await user.selectOptions(screen.getByLabelText('Tablero de la ronda 2'), 'b');
      expect(screen.getByRole('button', { name: 'Comenzar juego' })).toBeEnabled();

      const multiplier = screen.getByLabelText('Multiplicador de la ronda 2');
      await user.clear(multiplier);
      await user.type(multiplier, '11');

      expect(
        screen.getByText('El multiplicador de la ronda 2 va de 1 a 10, en números enteros.'),
      ).toBeInTheDocument();
      const start = screen.getByRole('button', { name: 'Comenzar juego' });
      expect(start).toBeDisabled();
      expect(start).toHaveAccessibleDescription(/va de 1 a 10/);
    });

    it('agrega rondas hasta 5, con su número como multiplicador, y permite quitarlas', async () => {
      const user = userEvent.setup();
      await setup();
      const add = screen.getByRole('button', { name: 'Agregar ronda' });
      for (let i = 2; i < MAX_ROUNDS; i++) await user.click(add);

      expect(screen.getByLabelText('Multiplicador de la ronda 5')).toHaveValue(5);
      expect(add).toBeDisabled();
      expect(screen.getByText('Máximo 5 rondas.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Quitar ronda 3' }));
      expect(screen.queryByLabelText('Tablero de la ronda 5')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Multiplicador de la ronda 4')).toHaveValue(5);
      expect(add).toBeEnabled();
    });

    it('la casilla del Final depende del tablero de la última ronda', async () => {
      const user = userEvent.setup();
      await setup(boardNamed('a', 'Cumple A', { final: { ...FINAL } }), [
        boardNamed('b', 'Cumple B'),
        boardNamed('c', 'Cumple C', { final: { ...FINAL } }),
      ]);
      const final = screen.getByRole('checkbox', { name: 'Jugar Final Jeopardy!' });
      expect(final).toBeDisabled();

      await user.selectOptions(screen.getByLabelText('Tablero de la ronda 2'), 'b');
      expect(final).toBeDisabled();
      expect(final).toHaveAccessibleDescription(/tablero de la última ronda/);

      await user.selectOptions(screen.getByLabelText('Tablero de la ronda 2'), 'c');
      expect(final).toBeEnabled();
      expect(final).toBeChecked();
    });

    it('comenzar guarda las rondas y multiplicadores elegidos', async () => {
      const user = userEvent.setup();
      await setup(undefined, [boardNamed('b', 'Cumple B', { final: { ...FINAL } })]);
      await user.selectOptions(screen.getByLabelText('Tablero de la ronda 2'), 'b');
      const multiplier = screen.getByLabelText('Multiplicador de la ronda 2');
      await user.clear(multiplier);
      await user.type(multiplier, '3');

      const session = await startGameWith(user);
      expect(roundsOf(session)).toEqual([
        ['a', 1],
        ['b', 3],
      ]);
      expect(session?.roundIndex).toBe(0);
      expect(session?.finalEnabled).toBe(true);
    });
  });
});

describe('TeamSetupScreen: pulsadores', () => {
  afterEach(() => {
    uninstallDesktop();
  });

  async function start(user: ReturnType<typeof userEvent.setup>): Promise<GameSession> {
    await user.type(screen.getByLabelText('Nombre del equipo 1'), 'Primos');
    await user.type(screen.getByLabelText('Nombre del equipo 2'), 'Tíos');
    await user.click(screen.getByRole('button', { name: 'Comenzar juego' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/play\//));
    const sessionId = decodeURIComponent(/^#\/play\/(.+)$/.exec(window.location.hash)![1]!);
    return (await getSession(sessionId))!;
  }

  it('en la web no ofrece "Usar pulsadores" y el juego queda sin pulsadores', async () => {
    const user = userEvent.setup();
    await renderWithBoard();
    expect(screen.queryByLabelText('Usar pulsadores')).not.toBeInTheDocument();
    expect((await start(user)).buzzersEnabled).toBeUndefined();
  });

  it('en escritorio la casilla aparece activada y el juego queda con pulsadores', async () => {
    const user = userEvent.setup();
    installDesktop();
    await renderWithBoard();
    expect(screen.getByLabelText('Usar pulsadores')).toBeChecked();
    expect((await start(user)).buzzersEnabled).toBe(true);
  });

  it('en escritorio, desactivada, el juego queda sin pulsadores', async () => {
    const user = userEvent.setup();
    installDesktop();
    await renderWithBoard();
    await user.click(screen.getByLabelText('Usar pulsadores'));
    expect((await start(user)).buzzersEnabled).toBeUndefined();
  });
});
