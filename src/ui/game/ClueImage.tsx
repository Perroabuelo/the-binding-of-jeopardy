import { useImageUrl } from '../lib/images';

/** Imagen de una pregunta leída de IndexedDB; no dibuja nada si no hay o no se pudo cargar. */
export function ClueImage({ imageId, className }: { imageId?: string; className?: string }) {
  const url = useImageUrl(imageId);
  if (!url) return null;
  return <img src={url} alt="Imagen de la pregunta" className={className} />;
}
