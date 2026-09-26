import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FINAL_MUSIC_ERROR,
  FINAL_MUSIC_MUTED_KEY,
  FINAL_MUSIC_URL,
  useFinalMusic,
} from './useFinalMusic';

function Harness({ startedAt, playing }: { startedAt?: number; playing: boolean }) {
  const { attachAudio, muted, toggleMuted, error } = useFinalMusic(startedAt, playing);
  return (
    <>
      <audio ref={attachAudio} src={FINAL_MUSIC_URL} data-testid="music" />
      <button type="button" onClick={toggleMuted}>
        {muted ? 'Activar música' : 'Silenciar música'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function audio() {
  return screen.getByTestId('music') as HTMLAudioElement;
}

describe('useFinalMusic', () => {
  it('reproduce desde 0 al iniciar el temporizador y otra vez al reiniciarlo', () => {
    const { rerender } = render(<Harness playing={false} />);
    expect(play).not.toHaveBeenCalled();

    rerender(<Harness startedAt={1_000} playing />);
    expect(play).toHaveBeenCalledTimes(1);
    expect(audio().currentTime).toBe(0);

    rerender(<Harness startedAt={5_000} playing />);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('se detiene al terminar el tiempo o al pasar a la revelación', () => {
    const { rerender } = render(<Harness playing={false} />);
    rerender(<Harness startedAt={1_000} playing />);
    pause.mockClear();
    rerender(<Harness startedAt={1_000} playing={false} />);
    expect(pause).toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('se detiene al desmontar', () => {
    const { rerender, unmount } = render(<Harness playing={false} />);
    rerender(<Harness startedAt={1_000} playing />);
    pause.mockClear();
    unmount();
    expect(pause).toHaveBeenCalled();
  });

  it('después de recargar con el temporizador corriendo no suena sin una acción del operador', () => {
    const { rerender } = render(<Harness startedAt={1_000} playing />);
    rerender(<Harness startedAt={1_000} playing />);
    expect(play).not.toHaveBeenCalled();

    // Reiniciar el temporizador sí la reproduce.
    rerender(<Harness startedAt={9_000} playing />);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('silencia la música y conserva la preferencia al volver a montar', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness playing={false} />);
    expect(audio().muted).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Silenciar música' }));
    expect(audio().muted).toBe(true);
    expect(localStorage.getItem(FINAL_MUSIC_MUTED_KEY)).toBe('true');
    unmount();

    render(<Harness playing={false} />);
    expect(audio().muted).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Activar música' }));
    expect(audio().muted).toBe(false);
  });

  it('funciona aunque localStorage falle', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const user = userEvent.setup();
    render(<Harness playing={false} />);
    await user.click(screen.getByRole('button', { name: 'Silenciar música' }));
    expect(audio().muted).toBe(true);
  });

  it('muestra un aviso si el navegador no deja reproducir', async () => {
    play.mockRejectedValue(new DOMException('bloqueado', 'NotAllowedError'));
    const { rerender } = render(<Harness playing={false} />);
    await act(async () => rerender(<Harness startedAt={1_000} playing />));
    expect(screen.getByRole('alert')).toHaveTextContent(FINAL_MUSIC_ERROR);
  });
});
