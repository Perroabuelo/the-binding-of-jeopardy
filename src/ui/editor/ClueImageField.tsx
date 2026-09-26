import { useId, useState, type ChangeEvent } from 'react';
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '../../domain/image';
import { deleteImage, putImage } from '../../storage/db';
import { newId } from '../lib/ids';
import { useImageUrl } from '../lib/images';
import styles from './ClueImageField.module.css';

interface ClueImageFieldProps {
  imageId: string | undefined;
  /** Fija o quita (`undefined`) la imagen de la celda. */
  onImageChange: (imageId: string | undefined) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
    onImageChange(id);
    if (previousId) void deleteImage(previousId).catch(() => {});
  }

  function removeImage() {
    const previousId = imageId;
    setError(null);
    onImageChange(undefined);
    if (previousId) void deleteImage(previousId).catch(() => {});
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
