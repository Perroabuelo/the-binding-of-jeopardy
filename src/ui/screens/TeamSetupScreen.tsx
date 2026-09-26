import { useEffect, useState, type FormEvent } from 'react';
import type { Board } from '../../domain/board';
import { MAX_TEAMS, startGame } from '../../domain/game';
import { isFinalComplete, validateBoard } from '../../domain/validation';
import { getBoard, saveSession } from '../../storage/db';
import { newId } from '../lib/ids';
import { navigate, routeHref } from '../router';
import styles from './TeamSetupScreen.module.css';

type BoardState =
  { status: 'loading' } | { status: 'missing' } | { status: 'loaded'; board: Board };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function TeamSetupScreen({ boardId }: { boardId: string }) {
  const [boardState, setBoardState] = useState<BoardState>({ status: 'loading' });
  const [names, setNames] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playFinal, setPlayFinal] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBoard(boardId)
      .then((board) => {
        if (cancelled) return;
        setBoardState(board ? { status: 'loaded', board } : { status: 'missing' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setBoardState({ status: 'missing' });
        setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const board = boardState.status === 'loaded' ? boardState.board : null;
  const ready = board ? validateBoard(board).ready : false;
  const finalAvailable = board ? isFinalComplete(board.final) : false;
  const withFinal = finalAvailable && playFinal;

  function setName(index: number, value: string) {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  function removeTeam(index: number) {
    setNames((current) => current.filter((_, i) => i !== index));
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!board || starting) return;
    setError(null);
    let session;
    try {
      session = startGame(board, names, {
        sessionId: newId(),
        now: Date.now(),
        makeTeamId: () => newId(),
        withFinal,
      });
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    setStarting(true);
    try {
      await saveSession(session);
      navigate({ name: 'operator', sessionId: session.id });
    } catch (e) {
      setError(errorMessage(e));
      setStarting(false);
    }
  }

  return (
    <main className="screen" data-board-id={boardId}>
      <a href={routeHref({ name: 'editor', boardId })}>← Volver al editor</a>
      <h1>Equipos</h1>
      {board && <p className={styles.boardTitle}>{board.title || 'Tablero sin título'}</p>}
      {boardState.status === 'missing' && !error && <p role="alert">No se encontró el tablero.</p>}
      {board && !ready && (
        <div role="alert">
          <p>
            El tablero no está listo para jugar: completa el título, las categorías y todas las
            preguntas y respuestas.
          </p>
          <a href={routeHref({ name: 'editor', boardId })}>Completar el tablero en el editor</a>
        </div>
      )}
      {board && ready && (
        <form className={styles.form} onSubmit={start} noValidate>
          <ol className={styles.teams}>
            {names.map((name, index) => {
              const inputId = `team-name-${index}`;
              return (
                <li key={index} className={styles.team}>
                  <label htmlFor={inputId}>{`Nombre del equipo ${index + 1}`}</label>
                  <input
                    id={inputId}
                    type="text"
                    value={name}
                    maxLength={40}
                    onChange={(event) => setName(index, event.target.value)}
                  />
                  <button type="button" className="danger" onClick={() => removeTeam(index)}>
                    {`Quitar equipo ${index + 1}`}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className={styles.final}>
            <div className={styles.checkbox}>
              <input
                id="play-final"
                type="checkbox"
                checked={withFinal}
                disabled={!finalAvailable}
                aria-describedby={finalAvailable ? undefined : 'play-final-hint'}
                onChange={(event) => setPlayFinal(event.target.checked)}
              />
              <label htmlFor="play-final">Jugar Final Jeopardy!</label>
            </div>
            {!finalAvailable && (
              <p id="play-final-hint" className={styles.hint}>
                Para jugar el Final, completa la pista final del tablero en el editor.
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={names.length >= MAX_TEAMS}
              onClick={() => setNames((current) => [...current, ''])}
            >
              Agregar equipo
            </button>
            <button type="submit" className="primary" disabled={starting}>
              Comenzar juego
            </button>
          </div>
          {names.length >= MAX_TEAMS && (
            <p className={styles.hint}>{`Máximo ${MAX_TEAMS} equipos.`}</p>
          )}
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
