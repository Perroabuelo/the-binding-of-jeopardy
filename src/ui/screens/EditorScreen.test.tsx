import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLUE_VALUES, createEmptyBoard } from '../../domain/board';
import * as db from '../../storage/db';
import { getBoard, saveBoard, StorageUnavailable } from '../../storage/db';
import { EditorScreen } from './EditorScreen';

const BOARD_ID = 'b-editor';
const CREATED_AT = 1_700_000_000_000;

async function renderEditor() {
  await saveBoard(createEmptyBoard(BOARD_ID, CREATED_AT));
  const user = userEvent.setup();
  const view = render(<EditorScreen boardId={BOARD_ID} />);
  await screen.findByLabelText('Título del tablero');
  return { user, ...view };
}

async function storedBoard() {
  const board = await getBoard(BOARD_ID);
  if (!board) throw new Error('El tablero no está guardado');
  return board;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditorScreen', () => {
  it('muestra 5 categorías vacías con celdas de 100 a 500', async () => {
    await renderEditor();
    for (let c = 1; c <= 5; c++) {
      expect(screen.getByLabelText(`Nombre de la categoría ${c}`)).toHaveValue('');
      for (const value of CLUE_VALUES) {
        expect(
          screen.getByRole('button', { name: `Categoría ${c}, ${value}, incompleta` }),
        ).toBeInTheDocument();
      }
    }
    const firstColumn = screen
      .getAllByRole('button', { name: /^Categoría 1, / })
      .map((button) => button.getAttribute('aria-label'));
    expect(firstColumn).toEqual(CLUE_VALUES.map((v) => `Categoría 1, ${v}, incompleta`));
  });

  it('avisa si el tablero no existe, con un link a la lista', async () => {
    render(<EditorScreen boardId="no-existe" />);
    expect(await screen.findByText(/No se encontró el tablero/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a la lista de tableros' })).toHaveAttribute(
      'href',
      '#/',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Editar tablero' })).toBeInTheDocument();
  });

  it('edita el título y lo guarda solo, actualizando la fecha', async () => {
    const { user } = await renderEditor();
    const title = screen.getByLabelText('Título del tablero');
    await user.type(title, 'Noche de trivia');
    expect(title).toHaveValue('Noche de trivia');
    await waitFor(async () => expect((await storedBoard()).title).toBe('Noche de trivia'));
    expect((await storedBoard()).updatedAt).toBeGreaterThan(CREATED_AT);
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados');
  });

  it('renombra una categoría', async () => {
    const { user } = await renderEditor();
    const name = screen.getByLabelText('Nombre de la categoría 1');
    await user.type(name, 'Historia familiar');
    expect(name).toHaveValue('Historia familiar');
    await waitFor(async () =>
      expect((await storedBoard()).categories[0]!.name).toBe('Historia familiar'),
    );
  });

  it('agrupa los cambios rápidos en un solo guardado', async () => {
    const spy = vi.spyOn(db, 'saveBoard');
    const { user } = await renderEditor();
    spy.mockClear();
    await user.type(screen.getByLabelText('Título del tablero'), 'Hola');
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]![0].title).toBe('Hola');
  });

  it('completa una celda, la cierra y al reabrirla conserva el texto', async () => {
    const { user } = await renderEditor();
    await user.click(screen.getByRole('button', { name: 'Categoría 2, 300, incompleta' }));

    const dialog = screen.getByRole('dialog', { name: 'Categoría 2, 300' });
    await user.type(within(dialog).getByLabelText('Pregunta'), '¿Capital de Francia?');
    await user.type(within(dialog).getByLabelText('Respuesta'), 'París');
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const cell = screen.getByRole('button', { name: 'Categoría 2, 300, completa' });
    expect(cell).toHaveFocus();
    await waitFor(async () => {
      const clue = (await storedBoard()).categories[1]!.clues[2]!;
      expect(clue).toMatchObject({ question: '¿Capital de Francia?', answer: 'París' });
    });

    await user.click(cell);
    const reopened = screen.getByRole('dialog', { name: 'Categoría 2, 300' });
    expect(within(reopened).getByLabelText('Pregunta')).toHaveValue('¿Capital de Francia?');
    expect(within(reopened).getByLabelText('Respuesta')).toHaveValue('París');
  });

  it('cierra el diálogo con Escape', async () => {
    const { user } = await renderEditor();
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 100, incompleta' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('guarda lo pendiente al desmontar', async () => {
    const { user, unmount } = await renderEditor();
    await user.type(screen.getByLabelText('Título del tablero'), 'X');
    unmount();
    await waitFor(async () => expect((await storedBoard()).title).toBe('X'));
  });

  it('avisa si falla el guardado', async () => {
    const { user } = await renderEditor();
    vi.spyOn(db, 'saveBoard').mockRejectedValue(new StorageUnavailable());
    await user.type(screen.getByLabelText('Título del tablero'), 'X');
    expect(await screen.findByRole('alert')).toHaveTextContent(/los cambios no se guardaron/);
  });
});
