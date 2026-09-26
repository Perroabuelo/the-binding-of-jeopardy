import { useRoute } from './router';
import { BoardListScreen } from './screens/BoardListScreen';
import { EditorScreen } from './screens/EditorScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { OperatorScreen } from './screens/OperatorScreen';
import { TeamSetupScreen } from './screens/TeamSetupScreen';
import { TvScreen } from './screens/TvScreen';

export function App() {
  const route = useRoute();
  switch (route.name) {
    case 'boards':
      return <BoardListScreen />;
    case 'editor':
      return <EditorScreen key={route.boardId} boardId={route.boardId} />;
    case 'teamSetup':
      return <TeamSetupScreen key={route.boardId} boardId={route.boardId} />;
    case 'operator':
      return <OperatorScreen key={route.sessionId} sessionId={route.sessionId} />;
    case 'tv':
      return <TvScreen key={route.sessionId} sessionId={route.sessionId} />;
    case 'notFound':
      return <NotFoundScreen />;
  }
}
