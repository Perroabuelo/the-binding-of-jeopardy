import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDesktop, uninstallDesktop } from '../../../tests/fixtures/desktop';
import { TvLauncher } from './TvLauncher';

afterEach(() => {
  uninstallDesktop();
  vi.restoreAllMocks();
});

describe('TvLauncher en escritorio', () => {
  it('abre la TV con la API de escritorio y no muestra la dirección', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    const open = vi.spyOn(window, 'open');
    render(<TvLauncher sessionId="sesion-1" />);

    expect(screen.queryByLabelText('Dirección de la pantalla de TV')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    expect(api.openTv).toHaveBeenCalledWith('sesion-1');
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa si no se pudo abrir, sin mencionar ventanas emergentes', async () => {
    const user = userEvent.setup();
    const { api } = installDesktop();
    vi.mocked(api.openTv).mockRejectedValue(new Error('falló'));
    render(<TvLauncher sessionId="sesion-1" />);

    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo abrir la pantalla de TV');
    expect(alert).not.toHaveTextContent(/ventanas emergentes/);
  });
});

describe('TvLauncher en la web', () => {
  it('abre una ventana con nombre fijo y muestra la dirección', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    render(<TvLauncher sessionId="sesion-1" />);
    const url = `${window.location.origin}${window.location.pathname}#/tv/sesion-1`;

    expect(screen.getByLabelText('Dirección de la pantalla de TV')).toHaveValue(url);
    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    expect(open).toHaveBeenCalledWith(url, 'jeopardy-tv');
  });

  it('avisa si el navegador bloquea la ventana', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(<TvLauncher sessionId="sesion-1" />);

    await user.click(screen.getByRole('button', { name: 'Abrir pantalla de TV' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Permite las ventanas emergentes/);
  });
});
