import { describe, expect, it } from 'vitest';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, validateImageFile } from './image';

const MB = 1024 * 1024;

describe('validateImageFile', () => {
  it('permite PNG, JPEG, GIF y WebP con tope de 5 MB', () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
    expect(MAX_IMAGE_BYTES).toBe(5 * MB);
  });

  it.each(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])('acepta %s', (type) => {
    expect(validateImageFile({ type, size: 2 * MB })).toEqual({ ok: true });
  });

  it('rechaza un PDF por formato', () => {
    const result = validateImageFile({ type: 'application/pdf', size: 100_000 });
    expect(result).toMatchObject({ ok: false, reason: 'type' });
    if (!result.ok) expect(result.message).toMatch(/PNG, JPEG, GIF o WebP/);
  });

  it('rechaza un tipo vacío', () => {
    expect(validateImageFile({ type: '', size: 10 })).toMatchObject({ ok: false, reason: 'type' });
  });

  it('rechaza una imagen de 8 MB por tamaño', () => {
    const result = validateImageFile({ type: 'image/jpeg', size: 8 * MB });
    expect(result).toMatchObject({ ok: false, reason: 'size' });
    if (!result.ok) expect(result.message).toMatch(/5 MB/);
  });

  it('acepta una imagen de exactamente 5 MB', () => {
    expect(validateImageFile({ type: 'image/png', size: 5 * MB })).toEqual({ ok: true });
  });

  it('rechaza una imagen de 5 MB más un byte', () => {
    expect(validateImageFile({ type: 'image/png', size: 5 * MB + 1 })).toMatchObject({
      ok: false,
      reason: 'size',
    });
  });

  it('informa el formato antes que el tamaño', () => {
    expect(validateImageFile({ type: 'application/pdf', size: 8 * MB })).toMatchObject({
      ok: false,
      reason: 'type',
    });
  });
});
