import { boardImageIds, type Board } from '../../domain/board';
import { exportBoard, exportFileName, importBoard } from '../../domain/exchange';
import { deleteImage, getImage, putImage, saveBoard } from '../../storage/db';
import { newId } from '../lib/ids';
import { blobToDataUrl, dataUrlToBlob } from '../lib/images';

/** Arma el archivo de exportación del tablero con sus imágenes y lo descarga. */
export async function downloadBoardFile(board: Board): Promise<void> {
  const images: Record<string, string> = {};
  for (const imageId of boardImageIds(board)) {
    const stored = await getImage(imageId);
    if (stored) {
      const blob = stored.blob.type ? stored.blob : new Blob([stored.blob], { type: stored.type });
      images[imageId] = await blobToDataUrl(blob);
    }
  }
  const json = exportBoard(board, images);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(board);
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Se libera después para no cortar la descarga recién iniciada.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Importa un archivo exportado como tablero nuevo. Valida y convierte todo en memoria
 * antes de escribir; si falla al guardar, intenta borrar las imágenes ya escritas.
 */
export async function importBoardFile(file: Blob): Promise<Board> {
  const text = await file.text();
  const { board, images } = importBoard(text, { makeId: newId, now: Date.now() });
  const blobs = Object.entries(images).map(
    ([id, dataUrl]) => [id, dataUrlToBlob(dataUrl)] as const,
  );

  const written: string[] = [];
  try {
    for (const [id, blob] of blobs) {
      await putImage(id, blob);
      written.push(id);
    }
    await saveBoard(board);
  } catch (error) {
    await Promise.allSettled(written.map((id) => deleteImage(id)));
    throw error;
  }
  return board;
}
