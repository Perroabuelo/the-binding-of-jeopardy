import { useEffect, useState } from 'react';

export type Route =
  | { name: 'boards' }
  | { name: 'editor'; boardId: string }
  | { name: 'teamSetup'; boardId: string }
  | { name: 'operator'; sessionId: string }
  | { name: 'tv'; sessionId: string }
  /** Página del celular en la red local. */
  | { name: 'join' }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'boards' };
  const [head, id, tail] = parts;
  if (head === 'boards' && id && parts.length === 2) return { name: 'editor', boardId: id };
  if (head === 'boards' && id && tail === 'play' && parts.length === 3) {
    return { name: 'teamSetup', boardId: id };
  }
  if (head === 'play' && id && parts.length === 2) return { name: 'operator', sessionId: id };
  if (head === 'tv' && id && parts.length === 2) return { name: 'tv', sessionId: id };
  if (head === 'unirse' && parts.length === 1) return { name: 'join' };
  return { name: 'notFound' };
}

export function routeHref(route: Exclude<Route, { name: 'notFound' }>): string {
  switch (route.name) {
    case 'boards':
      return '#/';
    case 'editor':
      return `#/boards/${encodeURIComponent(route.boardId)}`;
    case 'teamSetup':
      return `#/boards/${encodeURIComponent(route.boardId)}/play`;
    case 'operator':
      return `#/play/${encodeURIComponent(route.sessionId)}`;
    case 'tv':
      return `#/tv/${encodeURIComponent(route.sessionId)}`;
    case 'join':
      return '#/unirse';
  }
}

export function navigate(route: Exclude<Route, { name: 'notFound' }>): void {
  window.location.hash = routeHref(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
