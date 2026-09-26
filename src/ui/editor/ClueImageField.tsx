import { useId, useState, type ChangeEvent } from 'react';
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '../../domain/image';
import { putImage } from '../../storage/db';
import { newId } from '../lib/ids';
import { useImageUrl } from '../lib/images';
import { deleteImageIfUnused } from './imageCleanup';
import styles from './ClueImageField.module.css';

interface ClueImageFieldProps {
  imageId: string | undefined;
  /** Fija o quita (`undefined`) la imagen de la celda; resuelve si el tablero quedó guardado. */
  onImageChange: (imageId: string | undefined) => Promise<boolean>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** La imagen anterior se borra solo tras guardar el tablero sin ella, y si nadie más la usa. */
async function replaceImage(
  onImageChange: ClueImageFieldProps['onImageChange'],
  nextId: string | undefined,
  previousId: string | undefined,
): Promise<void> {
  const saved = await onImageChange(nextId);
  if (saved && previousId) await deleteImageIfUnused(previousId).catch(() => false);
}

export function ClueImageField({ imageId, onImageChange }: ClueImageFieldProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewUrl = useImageUrl(imageId);

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Permite volver a elegir el mismo archivo.
    input.value = '';
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const previousId = imageId;
    const id = newId();
    setBusy(true);
    try {
      await putImage(id, file);
    } catch (e) {
      setError(errorMessage(e));
      return;
    } finally {
      setBusy(false);
    }
    setError(null);
    await replaceImage(onImageChange, id, previousId);
  }

  function removeImage() {
    const previousId = imageId;
    setError(null);
    void replaceImage(onImageChange, undefined, previousId);
  }

  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>Imagen (opcional)</label>
      <input
        id={inputId}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        disabled={busy}
        onChange={(e) => void onFileSelected(e)}
      />
      <p className={styles.hint}>PNG, JPEG, GIF o WebP de hasta 5 MB.</p>
      {error && <p role="alert">{error}</p>}
      {imageId && (
        <div className={styles.preview}>
          {previewUrl && (
            <img src={previewUrl} alt="Vista previa de la imagen" className={styles.image} />
          )}
          <button type="button" className="danger" onClick={removeImage}>
            Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}
