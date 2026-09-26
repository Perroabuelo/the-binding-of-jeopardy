import { routeHref } from '../router';

export function NotFoundScreen() {
  return (
    <main className="screen">
      <h1>Página no encontrada</h1>
      <a href={routeHref({ name: 'boards' })}>Ir a los tableros</a>
    </main>
  );
}
