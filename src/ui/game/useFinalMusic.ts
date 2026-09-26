import { useCallback, useEffect, useRef, useState } from 'react';

export const FINAL_MUSIC_URL = `${import.meta.env.BASE_URL}audio/final-jeopardy.mp3`;
export const FINAL_MUSIC_MUTED_KEY = 'jeopardy.finalMusicMuted';
export const FINAL_MUSIC_ERROR = 'No se pudo reproducir la música.';

function readMuted(): boolean {
  try {
    return localStorage.getItem(FINAL_MUSIC_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(FINAL_MUSIC_MUTED_KEY, String(muted));
  } catch {
    // Es una comodidad del operador: si no se puede guardar, solo dura hasta recargar.
  }
}

export interface FinalMusic {
  /** Ref de callback para el elemento `<audio src={FINAL_MUSIC_URL}>` de la vista de operador. */
  attachAudio: (audio: HTMLAudioElement | null) => void;
  muted: boolean;
  toggleMuted: () => void;
  /** Aviso si el navegador no dejó reproducir la música. */
  error: string | null;
}

/**
 * Música del temporizador del Final. Suena desde el inicio cada vez que `timerStartedAt` cambia
 * mientras la vista está montada (iniciar o reiniciar), nunca por un temporizador que ya corría
 * al montar (una recarga). Se detiene cuando `playing` pasa a false y al desmontar.
 */
export function useFinalMusic(timerStartedAt: number | undefined, playing: boolean): FinalMusic {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedStartRef = useRef(timerStartedAt);
  const [muted, setMuted] = useState(readMuted);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || timerStartedAt === undefined || timerStartedAt === mountedStartRef.current) {
      return;
    }
    // El valor de montaje ya no se protege: un reinicio posterior siempre suena.
    mountedStartRef.current = undefined;
    audio.currentTime = 0;
    setError(null);
    audio.play().catch(() => setError(FINAL_MUSIC_ERROR));
  }, [timerStartedAt]);

  useEffect(() => {
    if (!playing) audioRef.current?.pause();
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const setAudio = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !muted;
    writeMuted(next);
    setMuted(next);
  }, [muted]);

  return { attachAudio: setAudio, muted, toggleMuted, error };
}
