import { useImageUrl } from '../lib/images';

interface ClueImageProps {
  imageId?: string;
  alt?: string;
  className?: string;
}

/** Imagen de una celda leída de IndexedDB; no dibuja nada si no hay o no se pudo cargar. */
export function ClueImage({ imageId, alt = 'Imagen de la pregunta', className }: ClueImageProps) {
  const url = useImageUrl(imageId);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
