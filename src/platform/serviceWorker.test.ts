import { describe, expect, it } from 'vitest';
import { shouldRegisterServiceWorker } from './serviceWorker';

describe('shouldRegisterServiceWorker', () => {
  it('lo registra en la web segura', () => {
    expect(shouldRegisterServiceWorker({ desktop: false, secureContext: true })).toBe(true);
  });

  it('no lo registra en la app de escritorio', () => {
    expect(shouldRegisterServiceWorker({ desktop: true, secureContext: true })).toBe(false);
  });

  it('no lo registra en http://IP (contexto no seguro)', () => {
    expect(shouldRegisterServiceWorker({ desktop: false, secureContext: false })).toBe(false);
  });
});
