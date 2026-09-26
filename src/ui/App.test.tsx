import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { parseRoute } from './router';

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe('parseRoute', () => {
  it('reconoce cada ruta', () => {
    expect(parseRoute('')).toEqual({ name: 'boards' });
    expect(parseRoute('#/')).toEqual({ name: 'boards' });
    expect(parseRoute('#/boards/b1')).toEqual({ name: 'editor', boardId: 'b1' });
    expect(parseRoute('#/boards/b1/play')).toEqual({ name: 'teamSetup', boardId: 'b1' });
    expect(parseRoute('#/play/s1')).toEqual({ name: 'operator', sessionId: 's1' });
    expect(parseRoute('#/tv/s1')).toEqual({ name: 'tv', sessionId: 's1' });
    expect(parseRoute('#/nada')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/boards/b1/otra')).toEqual({ name: 'notFound' });
  });
});

describe('App', () => {
  it.each([
    ['#/', 'Tableros'],
    ['#/boards/b1', 'Editar tablero'],
    ['#/boards/b1/play', 'Equipos'],
    ['#/play/s1', 'Operador'],
    ['#/tv/s1', 'Pantalla de TV'],
    ['#/no-existe', 'Página no encontrada'],
  ])('en %s muestra "%s"', async (hash, heading) => {
    renderAt(hash);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
