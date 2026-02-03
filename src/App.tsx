import { useEffect, lazy, Suspense } from 'react';
import { slugify } from './lib/utils';
import { Sidebar } from './components/board/Sidebar'
import { BoardHeader } from './components/board/BoardHeader';
import { useBoardStore } from './store/useBoardStore'
import { Table } from './components/table/Table'
import { useUserStore } from './store/useUserStore';


import { SidePanel } from './components/ui/SidePanel';
import { TaskDetail } from './components/task/TaskDetail';
import { BatchActionsBar } from './components/table/BatchActionsBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { supabase } from './lib/supabase';

import { HomePage } from './pages/HomePage';
import { TopBar } from './components/layout/TopBar';

// Lazy load heavy pages to reduce initial bundle size
const NotificationPage = lazy(() => import('./pages/NotificationPage').then(m => ({ default: m.NotificationPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
      fontSize: '14px'
    }}>
      Loading...
    </div>
  );
}

function MainApp() {
  const activeBoardId = useBoardStore(state => state.activeBoardId);
  const activePage = useBoardStore(state => state.activePage);
  const navigateTo = useBoardStore(state => state.navigateTo);

  const boards = useBoardStore(state => state.boards);
  const activeItemId = useBoardStore(state => state.activeItemId);
  const setActiveItem = useBoardStore(state => state.setActiveItem);
  const loadUserData = useBoardStore(state => state.loadUserData);
  const isLoading = useBoardStore(state => state.isLoading);
  const subscribeToRealtime = useBoardStore(state => state.subscribeToRealtime);
  const unsubscribeFromRealtime = useBoardStore(state => state.unsubscribeFromRealtime);
  const activeWorkspaceId = useBoardStore(state => state.activeWorkspaceId);
  const activeBoard = boards.find(b => b.id === activeBoardId);
  const { session } = useAuth();
  const setUser = useUserStore(state => state.setUser); // Import setter

  useEffect(() => {
    console.log('MainApp: session changed', session);
    if (session) {
      const initUser = async () => {
        // Fetch full profile to get system_role
        const { data: profile } = await supabase.from('profiles').select('system_role').eq('id', session.user.id).single();

        // Sync UserStore with Supabase Session
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url,
          role: 'owner',
          system_role: (profile?.system_role as any) || 'user'
        });

        // Requirement: Always go to Home on fresh login
        // We force the URL to / to prevent deep linking logic from picking up stale URLs
        window.history.replaceState(null, '', '/');
        navigateTo('home');

        console.log('MainApp: calling loadUserData');
        loadUserData();
      };

      initUser();
    } else {
      // Handle logout - clear all state
      console.log('MainApp: session cleared (logged out)');
      window.history.replaceState(null, '', '/');

      // Clear board store state
      useBoardStore.setState({
        activeBoardId: null,
        activeWorkspaceId: '',
        boards: [],
        workspaces: [],
        activePage: 'home',
        activeBoardMembers: [], // Clear members to prevent showing wrong owner
        notifications: [],
        selectedItemIds: [],
        activeItemId: null
      });

      // Clear user store (setUser expects User object, use DEFAULT_USER or just skip)
      // Since we're logging out, we don't need to clear the user store explicitly
      // The AuthContext will handle the session state
    }
  }, [session]);

  // URL Sync and Popstate Handler
  useEffect(() => {
    // 1. Handle Popstate (Browser Back/Forward)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/notifications') {
        navigateTo('notifications');
      } else if (path === '/' || path === '') {
        navigateTo('home');
      }
      // Note: We don't implement full deep link parsing on popstate here for simplicity in MVP, 
      // relying on the user to reload if they paste a URL or standard navigation. 
      // But we could add it. For now, we prefer the Store state to drive the URL.
      // Exception: If back button takes us to a board URL, we should probably switch.
      // Ideally, the Store updates should push state, so back button works.
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Initial Deep Link Parsing (On Mount)
    const initPath = window.location.pathname;

    // If it's a Board URL: /:username/:workspace/:board


    if (initPath === '/notifications') {
      navigateTo('notifications');
    }


    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. Deep Link Resolution (Depends on Boards Loading)
  useEffect(() => {
    // Only run if we are in 'loading' state effectively (or just check if we have boards and activePage is default)
    // Actually, we can run this check whenever boards change, but strictly only ONCE per app load is safer to avoid overriding user navigation.
    // Let's use a session-like flag or just check if valid URL matches current state.

    if (isLoading) return; // Wait for data

    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);

    if (parts.length >= 3) {
      const targetBoardSlug = parts[2];
      // const targetWorkspaceSlug = parts[1]; // Verify workspace matches if needed

      // Find board by fuzzy slug match
      const matchedBoard = boards.find(b => slugify(b.title) === targetBoardSlug);

      if (matchedBoard && matchedBoard.id !== activeBoardId) {
        console.log('Deep Link: Found board', matchedBoard.title);
        // We also need to set the active workspace?
        // setActiveBoard will trigger workspace switch if configured?
        // useBoardStore's setActiveBoard doesn't automatically switch activeWorkspaceId usually, 
        // unless we built that. Let's check. 
        // Looking at previous specificiations, we often need to switch both.
        // But for now, setActiveBoard triggers the view.
        useBoardStore.getState().setActiveBoard(matchedBoard.id);
      }
    }
  }, [isLoading, boards]); // simplistic dependency

  // 4. State -> URL Sync
  useEffect(() => {
    if (isLoading) return;

    if (activePage === 'home') {
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', '/');
      }
    } else if (activePage === 'notifications') {
      if (window.location.pathname !== '/notifications') {
        window.history.pushState(null, '', '/notifications');
      }
    } else if (activePage === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else if (activePage === 'board' && activeBoard) {
      const workspace = useBoardStore.getState().workspaces.find(w => w.id === activeBoard.workspaceId);
      const workspaceName = workspace ? slugify(workspace.title) : 'workspace';

      const currentUser = useUserStore.getState().currentUser;
      const username = currentUser ? slugify(currentUser.name) : 'u';

      const boardName = slugify(activeBoard.title);

      const newPath = `/${username}/${workspaceName}/${boardName}`;

      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
  }, [activePage, activeBoardId, activeBoard, isLoading]);

  useEffect(() => {
    if (activeWorkspaceId) {
      subscribeToRealtime();

      // Polling Fallback to ensure consistency (30s) - running silently
      const intervalId = setInterval(() => {
        if (!document.hidden) {
          loadUserData(true);
        }
      }, 30000);

      return () => {
        unsubscribeFromRealtime();
        clearInterval(intervalId);
      };
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
        <TopBar />

        {activePage === 'admin' ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <Suspense fallback={<PageLoader />}>
              <AdminPage />
            </Suspense>
          </div>
        ) : activePage === 'notifications' ? (
          <Suspense fallback={<PageLoader />}>
            <NotificationPage />
          </Suspense>
        ) : activePage === 'board' && activeBoard ? (
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

export default App; // Ensure export exists

