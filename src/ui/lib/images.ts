import { useEffect, useState } from 'react';
import { getImage } from '../../storage/db';

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Data URL inválida.');
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

/** URL de objeto para mostrar una imagen guardada; se libera al desmontar o cambiar de id. */
export function useImageUrl(imageId: string | undefined): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!imageId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    getImage(imageId)
      .then((stored) => {
        if (cancelled || !stored) return;
        objectUrl = URL.createObjectURL(stored.blob);
        setLoaded({ id: imageId, url: objectUrl });
      })
      .catch(() => {
        // Sin imagen: la celda se muestra sin ella.
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);
  return imageId && loaded?.id === imageId ? loaded.url : null;
}
