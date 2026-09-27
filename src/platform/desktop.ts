/**
 * API que expone la app de escritorio (preload de Electron) en `window.jeopardyDesktop`.
 * En la versión web no existe: la UI decide qué mostrar solo con `getDesktopApi()`.
 */

export interface LanInterface {
  name: string;
  address: string;
  selected: boolean;
}

export interface LanDevice {
  deviceId: string;
  label: string;
  connectedAt: number;
  /** Equipo al que está unido, en un juego con pulsadores. */
  teamId?: string;
}

export type NetworkCategory = 'public' | 'private' | 'domain' | 'unknown';

export interface LanStatus {
  /** `null`: sin interfaz o sin puerto. */
  url: string | null;
  port: number | null;
  interfaces: LanInterface[];
  networkCategory: NetworkCategory;
  devices: LanDevice[];
  problem?: 'noInterface' | 'noPort';
}

export interface BackupFile {
  boardId: string;
  fileName: string;
  json: string;
}

export interface DesktopApi {
  version: string;
  openTv(sessionId: string): Promise<void>;
  lan: {
    getStatus(): Promise<LanStatus>;
    /** Devuelve la función para desuscribirse. */
    onStatus(listener: (status: LanStatus) => void): () => void;
    selectInterface(name: string): Promise<void>;
  };
  backup: {
    writeBoard(file: BackupFile): Promise<void>;
    trashBoard(boardId: string): Promise<void>;
    openFolder(): Promise<void>;
  };
}

/** Canales IPC entre el preload y el proceso principal. */
export type DesktopIpcChannel =
  | 'jeopardy:version'
  | 'jeopardy:open-tv'
  | 'jeopardy:lan-status'
  | 'jeopardy:lan-status-changed'
  | 'jeopardy:lan-select-interface'
  | 'jeopardy:backup-write'
  | 'jeopardy:backup-trash'
  | 'jeopardy:backup-open-folder';

export const DESKTOP_API_KEY = 'jeopardyDesktop';

declare global {
  interface Window {
    jeopardyDesktop?: DesktopApi;
  }
}

export function getDesktopApi(): DesktopApi | null {
  if (typeof window === 'undefined') return null;
  return window.jeopardyDesktop ?? null;
}
