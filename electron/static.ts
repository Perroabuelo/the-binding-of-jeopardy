import path from 'node:path';

/**
 * Resuelve la ruta de una URL a un archivo dentro de `root` (la carpeta `dist/`).
 * Solo se sirven rutas bajo `base`; el `base` exacto cae en `index.html`.
 * Devuelve `null` si la ruta sale de `root`, no está bajo `base` o está mal codificada.
 */
export function resolveStaticPath(root: string, base: string, urlPath: string): string | null {
  const baseNoSlash = base.replace(/\/$/, '');
  if (urlPath === base || urlPath === baseNoSlash) return path.join(root, 'index.html');
  if (!urlPath.startsWith(base)) return null;

  let relative: string;
  try {
    relative = decodeURIComponent(urlPath.slice(base.length));
  } catch {
    return null;
  }
  if (relative === '' || relative.includes('\0') || relative.includes('\\')) return null;
  if (relative.startsWith('/') || path.isAbsolute(relative) || /^[a-zA-Z]:/.test(relative)) {
    return null;
  }
  const segments = relative.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return null;
  }

  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...segments);
  if (!resolved.startsWith(resolvedRoot + path.sep)) return null;
  return resolved;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export function mimeType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
