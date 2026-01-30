import { useEffect } from 'react';
import { Sidebar } from './components/board/Sidebar'
import { BoardHeader } from './components/board/BoardHeader';
import { useBoardStore } from './store/useBoardStore'
import { Table } from './components/table/Table'


import { SidePanel } from './components/ui/SidePanel';
import { TaskDetail } from './components/task/TaskDetail';
import { BatchActionsBar } from './components/table/BatchActionsBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';

import { HomePage } from './pages/HomePage';

function MainApp() {
  const { activeBoardId, boards, activeItemId, setActiveItem, loadUserData, isLoading, subscribeToRealtime, unsubscribeFromRealtime, activeWorkspaceId } = useBoardStore();
  const activeBoard = boards.find(b => b.id === activeBoardId);
  const { session } = useAuth();

  useEffect(() => {
    console.log('MainApp: session changed', session);
    if (session) {
      console.log('MainApp: calling loadUserData');
      loadUserData();
    }
  }, [session]);

  useEffect(() => {
    if (activeWorkspaceId) {
      subscribeToRealtime();
    }
    return () => unsubscribeFromRealtime();
  }, [activeWorkspaceId]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'hsl(var(--color-bg-canvas))' }}>
        {activeBoard ? (
          <>
            <BoardHeader boardId={activeBoard.id} />
            <div style={{ flex: 1, overflow: 'hidden', padding: '0', display: 'flex', flexDirection: 'column' }}>
              <Table boardId={activeBoard.id} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <HomePage />
          </div>
        )}

        {/* Task Detail Side Panel */}
        <SidePanel isOpen={!!activeItemId} onClose={() => setActiveItem(null)}>
          {activeItemId && <TaskDetail itemId={activeItemId} onClose={() => setActiveItem(null)} />}
        </SidePanel>

        <BatchActionsBar />
      </main>
    </div>
  )
}

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <MainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App

