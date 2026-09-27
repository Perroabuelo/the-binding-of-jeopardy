export interface ServiceWorkerContext {
  /** Corre dentro de la app de escritorio. */
  desktop: boolean;
  /** `window.isSecureContext`: falso en `http://IP` (el celular en la red local). */
  secureContext: boolean;
}

/**
 * El service worker (modo sin conexión) es solo para la web. El escritorio ya trae sus
 * archivos, y en la red local (`http://IP`) no hay contexto seguro.
 */
export function shouldRegisterServiceWorker({
  desktop,
  secureContext,
}: ServiceWorkerContext): boolean {
  return !desktop && secureContext;
}
