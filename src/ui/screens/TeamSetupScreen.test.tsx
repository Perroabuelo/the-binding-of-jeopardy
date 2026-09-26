import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MAX_TEAMS } from '../../domain/game';
import { getSession, saveBoard } from '../../storage/db';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
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
    expect(session?.boardSnapshot.title).toBe(board.title);
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
});
