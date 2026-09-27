import { useEffect, useState, type FormEvent } from 'react';
import type { Board } from '../../domain/board';
import {
  MAX_MULTIPLIER,
  MAX_ROUNDS,
  MAX_TEAMS,
  MIN_MULTIPLIER,
  MIN_ROUNDS,
  startGame,
  validateRounds,
  type RoundDraft,
  type RoundSetup,
} from '../../domain/game';
import { isFinalComplete, validateBoard } from '../../domain/validation';
import { getDesktopApi } from '../../platform/desktop';
import { getBoard, listBoards, saveSession } from '../../storage/db';
import { newId } from '../lib/ids';
import { navigate, routeHref } from '../router';
import styles from './TeamSetupScreen.module.css';

type BoardState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; board: Board; readyBoards: Board[] };

/** Una ronda en el formulario: '' = sin tablero elegido; el multiplicador tal como se escribe. */
interface RoundRow {
  boardId: string;
  multiplier: string;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function parseMultiplier(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function boardLabel(board: Board): string {
  return board.title || 'Tablero sin título';
}

export function TeamSetupScreen({ boardId }: { boardId: string }) {
  const [boardState, setBoardState] = useState<BoardState>({ status: 'loading' });
  const [names, setNames] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playFinal, setPlayFinal] = useState(true);
  const [withRounds, setWithRounds] = useState(false);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  // Los pulsadores necesitan el servidor de la red local de la app de escritorio.
  const buzzersAvailable = getDesktopApi() !== null;
  const [useBuzzers, setUseBuzzers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBoard(boardId), listBoards()])
      .then(([board, boards]) => {
        if (cancelled) return;
        const readyBoards = boards.filter((b) => validateBoard(b).ready);
        setBoardState(board ? { status: 'loaded', board, readyBoards } : { status: 'missing' });
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
  const readyBoards = boardState.status === 'loaded' ? boardState.readyBoards : [];
  const ready = board ? validateBoard(board).ready : false;

  const roundDrafts: RoundDraft[] = withRounds
    ? rounds.map((row) => ({
        board: readyBoards.find((b) => b.id === row.boardId) ?? null,
        multiplier: parseMultiplier(row.multiplier),
      }))
    : [{ board, multiplier: 1 }];
  const roundsError = withRounds ? validateRounds(roundDrafts) : null;
  // El Final sale del tablero de la última ronda.
  const lastBoard = roundDrafts.at(-1)?.board;
  const finalAvailable = lastBoard ? isFinalComplete(lastBoard.final) : false;
  const withFinal = finalAvailable && playFinal;

  function setName(index: number, value: string) {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  function removeTeam(index: number) {
    setNames((current) => current.filter((_, i) => i !== index));
  }

  function toggleRounds(enabled: boolean) {
    setWithRounds(enabled);
    if (enabled && rounds.length === 0) {
      setRounds([
        { boardId, multiplier: '1' },
        { boardId: '', multiplier: '2' },
      ]);
    }
  }

  function setRound(index: number, change: Partial<RoundRow>) {
    setRounds((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!board || starting || roundsError) return;
    setError(null);
    let session;
    try {
      // Una ronda sin tablero ya la reporta validateRounds: aquí todas tienen uno.
      const setups = roundDrafts.filter((round): round is RoundSetup => round.board !== null);
      session = startGame(setups, names, {
        sessionId: newId(),
        now: Date.now(),
        makeTeamId: () => newId(),
        withFinal,
        withBuzzers: buzzersAvailable && useBuzzers,
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
      {board && <p className={styles.boardTitle}>{boardLabel(board)}</p>}
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
          <fieldset className={styles.rounds}>
            <legend className={styles.checkbox}>
              <input
                id="play-rounds"
                type="checkbox"
                checked={withRounds}
                onChange={(event) => toggleRounds(event.target.checked)}
              />
              <label htmlFor="play-rounds">Jugar con rondas</label>
            </legend>
            {withRounds && (
              <>
                <ol className={styles.roundList} aria-label="Rondas">
                  {rounds.map((row, index) => (
                    <RoundItem
                      key={index}
                      index={index}
                      row={row}
                      readyBoards={readyBoards}
                      usedElsewhere={rounds.filter((_, i) => i !== index).map((r) => r.boardId)}
                      removable={rounds.length > MIN_ROUNDS}
                      onChange={(change) => setRound(index, change)}
                      onRemove={() => setRounds((current) => current.filter((_, i) => i !== index))}
                    />
                  ))}
                </ol>
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={rounds.length >= MAX_ROUNDS}
                    onClick={() =>
                      setRounds((current) => [
                        ...current,
                        { boardId: '', multiplier: String(current.length + 1) },
                      ])
                    }
                  >
                    Agregar ronda
                  </button>
                </div>
                {rounds.length >= MAX_ROUNDS && (
                  <p className={styles.hint}>{`Máximo ${MAX_ROUNDS} rondas.`}</p>
                )}
                {roundsError && (
                  <p id="rounds-error" className={styles.error} aria-live="polite">
                    {roundsError}
                  </p>
                )}
              </>
            )}
          </fieldset>
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
                {withRounds
                  ? 'Para jugar el Final, el tablero de la última ronda necesita una pista final completa.'
                  : 'Para jugar el Final, completa la pista final del tablero en el editor.'}
              </p>
            )}
          </div>
          {buzzersAvailable && (
            <div className={styles.checkbox}>
              <input
                id="use-buzzers"
                type="checkbox"
                checked={useBuzzers}
                onChange={(event) => setUseBuzzers(event.target.checked)}
              />
              <label htmlFor="use-buzzers">Usar pulsadores</label>
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={names.length >= MAX_TEAMS}
              onClick={() => setNames((current) => [...current, ''])}
            >
              Agregar equipo
            </button>
            <button
              type="submit"
              className="primary"
              disabled={starting || roundsError !== null}
              aria-describedby={roundsError ? 'rounds-error' : undefined}
            >
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

function RoundItem({
  index,
  row,
  readyBoards,
  usedElsewhere,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  row: RoundRow;
  readyBoards: Board[];
  usedElsewhere: string[];
  removable: boolean;
  onChange: (change: Partial<RoundRow>) => void;
  onRemove: () => void;
}) {
  const number = index + 1;
  const boardSelectId = `round-board-${index}`;
  const multiplierId = `round-multiplier-${index}`;
  return (
    <li className={styles.round}>
      <span className={styles.roundName}>{`Ronda ${number}`}</span>
      <label htmlFor={boardSelectId}>{`Tablero de la ronda ${number}`}</label>
      <label htmlFor={multiplierId}>{`Multiplicador de la ronda ${number}`}</label>
      <select
        id={boardSelectId}
        value={row.boardId}
        onChange={(event) => onChange({ boardId: event.target.value })}
      >
        <option value="">Elige un tablero</option>
        {/* Solo tableros listos; los que ya usa otra ronda no se pueden elegir. */}
        {readyBoards.map((b) => (
          <option key={b.id} value={b.id} disabled={usedElsewhere.includes(b.id)}>
            {boardLabel(b)}
          </option>
        ))}
      </select>
      <input
        id={multiplierId}
        type="number"
        inputMode="numeric"
        min={MIN_MULTIPLIER}
        max={MAX_MULTIPLIER}
        step={1}
        value={row.multiplier}
        onChange={(event) => onChange({ multiplier: event.target.value })}
      />
      {removable && (
        <button type="button" className="danger" onClick={onRemove}>
          {`Quitar ronda ${number}`}
        </button>
      )}
    </li>
  );
}
