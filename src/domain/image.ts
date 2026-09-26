export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type ImageValidation =
  { ok: true } | { ok: false; reason: 'type' | 'size'; message: string };

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateImageFile(file: { type: string; size: number }): ImageValidation {
  if (!isAllowedImageType(file.type)) {
    return {
      ok: false,
      reason: 'type',
      message: 'Formato no soportado. Usa una imagen PNG, JPEG, GIF o WebP.',
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: 'size',
      message: 'La imagen es demasiado grande. El tamaño máximo es 5 MB.',
    };
  }
  return { ok: true };
}
