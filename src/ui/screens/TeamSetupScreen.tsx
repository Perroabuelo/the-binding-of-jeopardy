import { routeHref } from '../router';

export function TeamSetupScreen({ boardId }: { boardId: string }) {
  return (
    <main className="screen" data-board-id={boardId}>
      <a href={routeHref({ name: 'editor', boardId })}>← Volver al editor</a>
      <h1>Equipos</h1>
    </main>
  );
}
