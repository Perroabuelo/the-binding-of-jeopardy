import { routeHref } from '../router';

export function EditorScreen({ boardId }: { boardId: string }) {
  return (
    <main className="screen" data-board-id={boardId}>
      <a href={routeHref({ name: 'boards' })}>← Tableros</a>
      <h1>Editar tablero</h1>
    </main>
  );
}
