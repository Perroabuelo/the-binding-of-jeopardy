import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mimeType, resolveStaticPath } from './static';

const ROOT = path.resolve('/app/dist');
const BASE = '/the-binding-of-jeopardy/';

describe('resolveStaticPath', () => {
  it('sirve los archivos bajo base', () => {
    expect(resolveStaticPath(ROOT, BASE, `${BASE}assets/index-abc.js`)).toBe(
      path.join(ROOT, 'assets', 'index-abc.js'),
    );
    expect(resolveStaticPath(ROOT, BASE, `${BASE}icon.svg`)).toBe(path.join(ROOT, 'icon.svg'));
  });

  it('decodifica nombres con espacios', () => {
    expect(resolveStaticPath(ROOT, BASE, `${BASE}audio/mi%20tema.mp3`)).toBe(
      path.join(ROOT, 'audio', 'mi tema.mp3'),
    );
  });

  it('devuelve index.html para el base exacto', () => {
    expect(resolveStaticPath(ROOT, BASE, BASE)).toBe(path.join(ROOT, 'index.html'));
    expect(resolveStaticPath(ROOT, BASE, '/the-binding-of-jeopardy')).toBe(
      path.join(ROOT, 'index.html'),
    );
  });

  it('rechaza ..', () => {
    expect(resolveStaticPath(ROOT, BASE, `${BASE}../secret.txt`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}assets/../../secret.txt`)).toBeNull();
  });

  it('rechaza %2e%2e y barras codificadas', () => {
    expect(resolveStaticPath(ROOT, BASE, `${BASE}%2e%2e/secret.txt`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}%2E%2E%2Fsecret.txt`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}..%5Csecret.txt`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}%E0%A4%A`)).toBeNull();
  });

  it('rechaza rutas absolutas', () => {
    expect(resolveStaticPath(ROOT, BASE, `${BASE}/etc/passwd`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}%2Fetc%2Fpasswd`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}C:%5CWindows%5Cwin.ini`)).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, `${BASE}C:/Windows/win.ini`)).toBeNull();
  });

  it('rechaza rutas fuera de base', () => {
    expect(resolveStaticPath(ROOT, BASE, '/')).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, '/index.html')).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, '/otra-app/index.html')).toBeNull();
    expect(resolveStaticPath(ROOT, BASE, '/the-binding-of-jeopardy-otra/index.html')).toBeNull();
  });
});

describe('mimeType', () => {
  it('reconoce los tipos del build', () => {
    expect(mimeType('index.html')).toMatch(/^text\/html/);
    expect(mimeType('a.JS')).toMatch(/^text\/javascript/);
    expect(mimeType('final.mp3')).toBe('audio/mpeg');
    expect(mimeType('sin-extension')).toBe('application/octet-stream');
  });
});
