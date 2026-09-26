import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { createEmptyBoard } from '../../domain/board';
import * as db from '../../storage/db';
import { getBoard, listBoards, saveBoard, StorageUnavailable } from '../../storage/db';
import { BoardListScreen } from './BoardListScreen';

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedTwoBoards() {
  const quiz = makeCompleteBoard({
    id: 'b1',
    title: 'Trivia de prueba',
    updatedAt: Date.UTC(2026, 2, 14, 15),
  });
  const untitled = createEmptyBoard('b2', Date.UTC(2026, 0, 2, 12));
  await saveBoard(quiz);
  await saveBoard(untitled);
  return { quiz, untitled };
}

async function renderList() {
  render(<BoardListScreen />);
  return screen.findByRole('list', { name: 'Tableros guardados' });
}

describe('BoardListScreen', () => {
  it('muestra los tableros guardados con título y fecha de modificación', async () => {
    await seedTwoBoards();
    const list = await renderList();
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // El más reciente primero.
    expect(within(items[0]!).getByRole('link', { name: 'Trivia de prueba' })).toBeInTheDocument();
    expect(within(items[0]!).getByText(/2026/)).toHaveAttribute(
      'datetime',
      new Date(Date.UTC(2026, 2, 14, 15)).toISOString(),
    );
    expect(within(items[1]!).getByRole('link', { name: 'Tablero sin título' })).toBeInTheDocument();
  });

  it('sin tableros muestra un mensaje de lista vacía', async () => {
    render(<BoardListScreen />);
    expect(await screen.findByText(/Todavía no hay tableros/)).toBeInTheDocument();
  });

  it('el enlace de cada tablero abre su editor', async () => {
    await seedTwoBoards();
    await renderList();
    expect(screen.getByRole('link', { name: 'Trivia de prueba' })).toHaveAttribute(
      'href',
      '#/boards/b1',
    );
  });

  it('crear un tablero lo guarda y navega al editor', async () => {
    const user = userEvent.setup();
    render(<BoardListScreen />);
    await user.click(screen.getByRole('button', { name: 'Nuevo tablero' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/boards\/[^/]+$/));
    const id = decodeURIComponent(window.location.hash.replace('#/boards/', ''));
    expect(await getBoard(id)).toMatchObject({ id, title: '' });
  });

  it('cancelar la eliminación deja el tablero sin cambios', async () => {
    const user = userEvent.setup();
    const { quiz } = await seedTwoBoards();
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar tablero' });
    expect(dialog).toHaveTextContent('Trivia de prueba');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trivia de prueba' })).toBeInTheDocument();
    expect(await getBoard('b1')).toEqual(quiz);
  });

  it('Escape cierra el diálogo sin eliminar', async () => {
    const user = userEvent.setup();
    await seedTwoBoards();
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await listBoards()).toHaveLength(2);
  });

  it('confirmar la eliminación borra el tablero y lo quita de la lista', async () => {
    const user = userEvent.setup();
    await seedTwoBoards();
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar tablero' });
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Trivia de prueba' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Tablero sin título' })).toBeInTheDocument();
    expect(await getBoard('b1')).toBeNull();
  });

  it('avisa si el almacenamiento no está disponible al cargar la lista', async () => {
    vi.spyOn(db, 'listBoards').mockRejectedValue(new StorageUnavailable());
    render(<BoardListScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo acceder al almacenamiento del navegador',
    );
  });

  it('avisa si falla guardar un tablero nuevo y no navega', async () => {
    const user = userEvent.setup();
    vi.spyOn(db, 'saveBoard').mockRejectedValue(new StorageUnavailable());
    render(<BoardListScreen />);
    await user.click(screen.getByRole('button', { name: 'Nuevo tablero' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('los cambios no se guardaron');
    expect(window.location.hash).toBe('');
  });

  it('avisa si falla la eliminación y el tablero sigue en la lista', async () => {
    const user = userEvent.setup();
    await seedTwoBoards();
    vi.spyOn(db, 'deleteBoard').mockRejectedValue(new StorageUnavailable());
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('los cambios no se guardaron');
    expect(screen.getByRole('link', { name: 'Trivia de prueba' })).toBeInTheDocument();
  });
});
