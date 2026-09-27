import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { installDesktop, uninstallDesktop } from '../../../tests/fixtures/desktop';
import { backupFileName } from '../../domain/backup';
import { createEmptyBoard } from '../../domain/board';
import { exportBoard } from '../../domain/exchange';
import * as db from '../../storage/db';
import {
  getBoard,
  getImage,
  listBoards,
  putImage,
  saveBoard,
  StorageUnavailable,
} from '../../storage/db';
import { blobToDataUrl, dataUrlToBlob } from '../lib/images';
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

  it('si la eliminación se guarda pero recargar la lista fallaría, igual la quita sin avisar error', async () => {
    const user = userEvent.setup();
    await seedTwoBoards();
    const realList = db.listBoards;
    vi.spyOn(db, 'listBoards')
      .mockImplementationOnce(() => realList())
      .mockRejectedValue(new StorageUnavailable());
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    // El aviso siempre está en la página: hay que esperar su texto, no el elemento.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Se eliminó "Trivia de prueba"'),
    );
    expect(screen.queryByRole('link', { name: 'Trivia de prueba' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tablero sin título' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function boardWithImage() {
  const board = makeCompleteBoard({ id: 'src', title: 'Trivia con imagen' });
  board.categories[0]!.clues[0]!.imageId = 'img-1';
  return board;
}

function exportedFile(name = 'Trivia con imagen.jeopardy.json') {
  const json = exportBoard(boardWithImage(), { 'img-1': PNG_DATA_URL });
  return new File([json], name, { type: 'application/json' });
}

/**
 * Los Blob de jsdom no sobreviven al clonado de fake-indexeddb, así que las imágenes
 * se guardan en memoria; la ida y vuelta real con IndexedDB la cubre el e2e.
 */
function stubImageStore() {
  const images = new Map<string, db.StoredImage>();
  vi.spyOn(db, 'putImage').mockImplementation(async (id, blob) => {
    images.set(id, { id, blob, type: blob.type });
  });
  vi.spyOn(db, 'getImage').mockImplementation(async (id) => images.get(id) ?? null);
  vi.spyOn(db, 'deleteImage').mockImplementation(async (id) => {
    images.delete(id);
  });
  return images;
}

describe('BoardListScreen: exportar e importar', () => {
  it('importar un archivo válido crea un tablero nuevo con sus imágenes', async () => {
    const user = userEvent.setup();
    stubImageStore();
    await seedTwoBoards();
    await renderList();
    await user.upload(screen.getByLabelText('Importar tablero'), exportedFile());

    expect(await screen.findByRole('link', { name: 'Trivia con imagen' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Se importó "Trivia con imagen"');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const boards = await listBoards();
    expect(boards).toHaveLength(3);
    const imported = boards.find((b) => b.title === 'Trivia con imagen')!;
    expect(imported.id).not.toBe('src');
    expect(imported.categories.map((c) => c.name)).toEqual(
      boardWithImage().categories.map((c) => c.name),
    );
    const imageId = imported.categories[0]!.clues[0]!.imageId!;
    expect(imageId).not.toBe('img-1');
    const image = await getImage(imageId);
    expect(image?.type).toBe('image/png');
    expect(await blobToDataUrl(image!.blob)).toBe(PNG_DATA_URL);
  });

  it('importar el mismo archivo dos veces crea dos tableros distintos', async () => {
    const user = userEvent.setup();
    render(<BoardListScreen />);
    const input = screen.getByLabelText('Importar tablero');
    await user.upload(input, exportedFile());
    await screen.findByRole('link', { name: 'Trivia con imagen' });
    await user.upload(input, exportedFile());
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'Trivia con imagen' })).toHaveLength(2),
    );
    const ids = (await listBoards()).map((b) => b.id);
    expect(new Set(ids).size).toBe(2);
  });

  it.each([
    ['un archivo que no es JSON', 'esto no es un tablero', 'no es un JSON válido'],
    ['un JSON de otro formato', '{"format":"otro"}', 'no es un tablero exportado'],
    [
      'un tablero dañado',
      exportBoard(boardWithImage(), { 'img-1': PNG_DATA_URL }).replace('"Categoría 1"', '1'),
      'no es válido',
    ],
  ])('importar %s muestra un aviso y no guarda nada', async (_label, content, message) => {
    const user = userEvent.setup();
    await seedTwoBoards();
    const before = await listBoards();
    const putImageSpy = vi.spyOn(db, 'putImage');
    const saveBoardSpy = vi.spyOn(db, 'saveBoard');
    await renderList();
    await user.upload(
      screen.getByLabelText('Importar tablero'),
      new File([content], 'malo.json', { type: 'application/json' }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo importar el tablero.');
    expect(alert).toHaveTextContent(message);
    expect(putImageSpy).not.toHaveBeenCalled();
    expect(saveBoardSpy).not.toHaveBeenCalled();
    expect(await listBoards()).toEqual(before);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('si falla guardar el tablero importado, avisa y borra las imágenes escritas', async () => {
    const user = userEvent.setup();
    const images = stubImageStore();
    vi.spyOn(db, 'saveBoard').mockRejectedValue(new StorageUnavailable());
    render(<BoardListScreen />);
    await user.upload(screen.getByLabelText('Importar tablero'), exportedFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('los cambios no se guardaron');
    expect(db.putImage).toHaveBeenCalledTimes(1);
    expect(db.deleteImage).toHaveBeenCalledWith(vi.mocked(db.putImage).mock.calls[0]![0]);
    expect(images.size).toBe(0);
    expect(await listBoards()).toEqual([]);
  });

  it('si la importación se guarda pero recargar la lista fallaría, lo muestra sin avisar error', async () => {
    const user = userEvent.setup();
    stubImageStore();
    await seedTwoBoards();
    const realList = db.listBoards;
    vi.spyOn(db, 'listBoards')
      .mockImplementationOnce(() => realList())
      .mockRejectedValue(new StorageUnavailable());
    const list = await renderList();
    await user.upload(screen.getByLabelText('Importar tablero'), exportedFile());
    // El aviso siempre está en la página: hay que esperar su texto, no el elemento.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Se importó "Trivia con imagen"'),
    );
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole('link', { name: 'Trivia con imagen' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await realList()).toHaveLength(3);
  });

  it('exportar descarga un archivo con el tablero y sus imágenes', async () => {
    const user = userEvent.setup();
    const board = boardWithImage();
    stubImageStore();
    await saveBoard(board);
    await putImage('img-1', dataUrlToBlob(PNG_DATA_URL));

    let exported: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;
      return 'blob:exportado';
    });
    const revokeObjectURL = vi.fn();
    // jsdom no implementa URLs de objeto.
    const originalUrl = {
      createObjectURL: URL.createObjectURL,
      revokeObjectURL: URL.revokeObjectURL,
    };
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    onTestFinished(() => {
      Object.assign(URL, originalUrl);
    });
    const clicked: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.getAttribute('href')!, download: this.download });
    });

    await renderList();
    await user.click(screen.getByRole('button', { name: 'Exportar Trivia con imagen' }));

    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0]).toEqual({
      href: 'blob:exportado',
      download: 'Trivia con imagen.jeopardy.json',
    });
    const file = JSON.parse(await exported!.text());
    expect(file.board).toEqual(board);
    expect(file.images).toEqual({ 'img-1': PNG_DATA_URL });
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:exportado'));
    expect(screen.getByRole('status')).toHaveTextContent('Se exportó "Trivia con imagen"');
  });

  it('si falta una imagen al exportar, avisa y no descarga nada', async () => {
    const user = userEvent.setup();
    await saveBoard(boardWithImage());
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Exportar Trivia con imagen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo exportar el tablero.');
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe('BoardListScreen: respaldo en escritorio', () => {
  afterEach(() => {
    uninstallDesktop();
  });

  it('en la web no ofrece abrir la carpeta de respaldos', async () => {
    await seedTwoBoards();
    await renderList();
    expect(
      screen.queryByRole('button', { name: 'Abrir carpeta de respaldos' }),
    ).not.toBeInTheDocument();
  });

  it('en escritorio abre la carpeta de respaldos', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    await seedTwoBoards();
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Abrir carpeta de respaldos' }));
    expect(api.backup.openFolder).toHaveBeenCalledTimes(1);
  });

  it('eliminar un tablero mueve su respaldo a eliminados', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    await seedTwoBoards();
    await renderList();
    await user.click(screen.getByRole('button', { name: 'Eliminar Trivia de prueba' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(api.backup.trashBoard).toHaveBeenCalledWith('b1'));
  });

  it('importar un tablero lo respalda de inmediato', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    stubImageStore();
    await seedTwoBoards();
    await renderList();
    await user.upload(screen.getByLabelText('Importar tablero'), exportedFile());
    await screen.findByText('Se importó "Trivia con imagen".');
    await waitFor(() => expect(api.backup.writeBoard).toHaveBeenCalledTimes(1));
    const [file] = vi.mocked(api.backup.writeBoard).mock.calls[0]!;
    const imported = (await listBoards()).find((board) => board.title === 'Trivia con imagen')!;
    expect(file.boardId).toBe(imported.id);
    expect(file.fileName).toBe(backupFileName(imported));
    // El respaldo es un archivo de exportación completo, con la imagen.
    expect(file.json).toContain(PNG_DATA_URL);
  });

  it('crear un tablero lo respalda de inmediato', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    render(<BoardListScreen />);
    await user.click(await screen.findByRole('button', { name: 'Nuevo tablero' }));
    await waitFor(() => expect(api.backup.writeBoard).toHaveBeenCalledTimes(1));
  });
});
