import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLUE_VALUES, createEmptyBoard } from '../../domain/board';
import * as db from '../../storage/db';
import { getBoard, getImage, saveBoard, saveSession, StorageUnavailable } from '../../storage/db';
import * as cleanup from '../editor/imageCleanup';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { EditorScreen } from './EditorScreen';

const BOARD_ID = 'b-editor';
const CREATED_AT = 1_700_000_000_000;

async function renderEditor() {
  await saveBoard(createEmptyBoard(BOARD_ID, CREATED_AT));
  // Sin filtrar por `accept`, para poder probar archivos rechazados.
  const user = userEvent.setup({ applyAccept: false });
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

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function pngFile(name = 'foto.png') {
  const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}

describe('EditorScreen: imagen por pregunta', () => {
  beforeEach(() => {
    // jsdom no implementa URL de objetos.
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
    URL.revokeObjectURL = vi.fn();
  });

  async function openFirstClue() {
    const view = await renderEditor();
    await view.user.click(screen.getByRole('button', { name: 'Categoría 1, 100, incompleta' }));
    return { ...view, dialog: screen.getByRole('dialog', { name: 'Categoría 1, 100' }) };
  }

  async function storedImageId() {
    return (await storedBoard()).categories[0]!.clues[0]!.imageId;
  }

  it('acepta solo los tipos de imagen permitidos en el selector', async () => {
    const { dialog } = await openFirstClue();
    expect(within(dialog).getByLabelText('Imagen (opcional)')).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/gif,image/webp',
    );
  });

  it('adjunta una imagen válida y muestra la vista previa', async () => {
    const { user, dialog } = await openFirstClue();
    await user.upload(within(dialog).getByLabelText('Imagen (opcional)'), pngFile());

    expect(
      await within(dialog).findByRole('img', { name: 'Vista previa de la imagen' }),
    ).toHaveAttribute('src', 'blob:vista-previa');
    await waitFor(async () => expect(await storedImageId()).toBeDefined());
    expect(await getImage((await storedImageId())!)).not.toBeNull();
  });

  it('adjunta un JPEG de 2 MB y muestra la vista previa solo en esa pregunta', async () => {
    const size = 2 * 1024 * 1024;
    const bytes = new Uint8Array(size);
    bytes.set([0xff, 0xd8, 0xff, 0xe0]);
    bytes.set([0xff, 0xd9], size - 2);
    const jpeg = new File([bytes], 'foto.jpg', { type: 'image/jpeg' });

    const { user, dialog } = await openFirstClue();
    await user.upload(within(dialog).getByLabelText('Imagen (opcional)'), jpeg);

    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    expect(
      await within(dialog).findByRole('img', { name: 'Vista previa de la imagen' }),
    ).toHaveAttribute('src', 'blob:vista-previa');
    await waitFor(async () => expect(await storedImageId()).toBeDefined());

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 200, incompleta' }));
    const other = screen.getByRole('dialog', { name: 'Categoría 1, 200' });
    expect(within(other).queryByRole('img')).not.toBeInTheDocument();
  });

  it.each([
    [
      'un PDF',
      new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' }),
      /Formato no soportado.*PNG, JPEG, GIF o WebP/,
    ],
    [
      'una imagen de más de 5 MB',
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
      /demasiado grande.*5 MB/,
    ],
    [
      'una imagen de 8 MB',
      new File([new Uint8Array(8 * 1024 * 1024)], 'enorme.png', { type: 'image/png' }),
      /demasiado grande.*5 MB/,
    ],
  ])('rechaza %s sin modificar la celda', async (_label, file, message) => {
    const { user, dialog } = await openFirstClue();
    const input = within(dialog).getByLabelText('Imagen (opcional)');
    await user.upload(input, pngFile());
    await within(dialog).findByRole('img', { name: 'Vista previa de la imagen' });
    await waitFor(async () => expect(await storedImageId()).toBeDefined());
    const before = await storedBoard();

    await user.upload(input, file);

    expect(within(dialog).getByRole('alert')).toHaveTextContent(message);
    expect(
      within(dialog).getByRole('img', { name: 'Vista previa de la imagen' }),
    ).toBeInTheDocument();
    expect(await storedBoard()).toEqual(before);
  });

  it('rechaza un archivo inválido en una celda sin imagen', async () => {
    const { user, dialog } = await openFirstClue();
    await user.upload(
      within(dialog).getByLabelText('Imagen (opcional)'),
      new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' }),
    );
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      /Formato no soportado.*PNG, JPEG, GIF o WebP/,
    );
    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument();
    expect(await storedImageId()).toBeUndefined();
  });

  it('quita la imagen y borra el archivo guardado', async () => {
    const { user, dialog } = await openFirstClue();
    await user.upload(within(dialog).getByLabelText('Imagen (opcional)'), pngFile());
    await within(dialog).findByRole('img', { name: 'Vista previa de la imagen' });
    await waitFor(async () => expect(await storedImageId()).toBeDefined());
    const imageId = (await storedImageId())!;

    await user.click(within(dialog).getByRole('button', { name: 'Quitar imagen' }));

    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Quitar imagen' })).not.toBeInTheDocument();
    await waitFor(async () => expect(await storedImageId()).toBeUndefined());
    await waitFor(async () => expect(await getImage(imageId)).toBeNull());
  });

  async function uploadAndGetId(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
    await user.upload(within(dialog).getByLabelText('Imagen (opcional)'), pngFile());
    await within(dialog).findByRole('img', { name: 'Vista previa de la imagen' });
    await waitFor(async () => expect(await storedImageId()).toBeDefined());
    return (await storedImageId())!;
  }

  it('conserva la imagen quitada si una sesión guardada la usa', async () => {
    const cleanupSpy = vi.spyOn(cleanup, 'deleteImageIfUnused');
    const { user, dialog } = await openFirstClue();
    const imageId = await uploadAndGetId(user, dialog);
    await saveSession({
      id: 'sesion-en-curso',
      boardSnapshot: await storedBoard(),
      teams: [{ id: 't1', name: 'Equipo Azul', score: 0 }],
      usedClues: [],
      phase: { kind: 'board' },
      updatedAt: CREATED_AT,
    });

    await user.click(within(dialog).getByRole('button', { name: 'Quitar imagen' }));

    await waitFor(async () => expect(await storedImageId()).toBeUndefined());
    await waitFor(() => expect(cleanupSpy).toHaveBeenCalledWith(imageId));
    expect(await cleanupSpy.mock.results[0]!.value).toBe(false);
    expect(await getImage(imageId)).not.toBeNull();
  });

  it('al reemplazar la imagen borra la anterior si nadie la usa', async () => {
    const { user, dialog } = await openFirstClue();
    const firstId = await uploadAndGetId(user, dialog);
    await user.upload(within(dialog).getByLabelText('Imagen (opcional)'), pngFile('otra.png'));
    await waitFor(async () => expect(await storedImageId()).not.toBe(firstId));
    const secondId = (await storedImageId())!;
    await waitFor(async () => expect(await getImage(firstId)).toBeNull());
    expect(await getImage(secondId)).not.toBeNull();
  });

  it('no borra la imagen quitada si falla el guardado del tablero', async () => {
    const cleanupSpy = vi.spyOn(cleanup, 'deleteImageIfUnused');
    const { user, dialog } = await openFirstClue();
    const imageId = await uploadAndGetId(user, dialog);
    vi.spyOn(db, 'saveBoard').mockRejectedValue(new StorageUnavailable());

    await user.click(within(dialog).getByRole('button', { name: 'Quitar imagen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/los cambios no se guardaron/);
    expect(cleanupSpy).not.toHaveBeenCalled();
    expect(await storedImageId()).toBe(imageId);
    expect(await getImage(imageId)).not.toBeNull();
  });
});

describe('EditorScreen: faltantes y Jugar', () => {
  async function renderSeeded(board = makeCompleteBoard()) {
    await saveBoard(board);
    const user = userEvent.setup();
    render(<EditorScreen boardId={board.id} />);
    await screen.findByLabelText('Título del tablero');
    return { user };
  }

  function incompleteBoard() {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[2]!.answer = '';
    return board;
  }

  it('habilita Jugar con el tablero completo y lleva a la configuración de equipos', async () => {
    const { user } = await renderSeeded();
    expect(screen.getByRole('heading', { name: 'Listo para jugar' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Elementos faltantes' })).not.toBeInTheDocument();
    const play = screen.getByRole('button', { name: 'Jugar' });
    expect(play).toBeEnabled();

    await user.click(play);
    await waitFor(() => expect(window.location.hash).toBe('#/boards/fixture-board/play'));
  });

  it('no va a la configuración de equipos si falla el guardado final', async () => {
    window.location.hash = '#/boards/fixture-board';
    const { user } = await renderSeeded();
    const saveSpy = vi.spyOn(db, 'saveBoard').mockRejectedValue(new StorageUnavailable());
    await user.type(screen.getByLabelText('Título del tablero'), ' nuevo');

    await user.click(screen.getByRole('button', { name: 'Jugar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/los cambios no se guardaron/);
    expect(saveSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/boards/fixture-board');
  });

  it('deshabilita Jugar y señala la celda a la que le falta la respuesta', async () => {
    await renderSeeded(incompleteBoard());
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Categoría 1, 300, incompleta' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /, incompleta$/ })).toHaveLength(1);
    const list = screen.getByRole('list', { name: 'Elementos faltantes' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Categoría 1, 300: falta la respuesta']);
  });

  it('habilita Jugar al completar lo que faltaba', async () => {
    const { user } = await renderSeeded(incompleteBoard());
    await user.click(screen.getByRole('button', { name: 'Categoría 1, 300, incompleta' }));
    const dialog = screen.getByRole('dialog', { name: 'Categoría 1, 300' });
    await user.type(within(dialog).getByLabelText('Respuesta'), 'Respuesta nueva');
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeEnabled();
  });

  it('lista lo que falta en un tablero con título y categorías vacíos', async () => {
    const board = makeCompleteBoard({ title: '  ' });
    board.categories[1]!.name = '';
    board.categories[4]!.clues[0]!.question = '';
    board.categories[4]!.clues[0]!.answer = '';
    board.categories[4]!.clues[4]!.question = '';
    await renderSeeded(board);
    const list = screen.getByRole('list', { name: 'Elementos faltantes' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Falta el título',
      'Falta el nombre de la categoría 2',
      'Categoría 5, 100: falta la pregunta y la respuesta',
      'Categoría 5, 500: falta la pregunta',
    ]);
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeDisabled();
  });
});
