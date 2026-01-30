import { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Layout, Star, Bell, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const HomePage = () => {
    const { user } = useAuth();
    const { boards, workspaces, setActiveBoard } = useBoardStore();

    // For now, simulate "Recently Visited" by just taking the first 3 boards
    // In a real app, we would sort by last_viewed_at
    const recentBoards = boards.slice(0, 3);

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    color: '#323338',
                    marginBottom: '8px'
                }}>
                    {greeting}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p style={{ color: '#676879', fontSize: '16px' }}>
                    Quickly access your recent boards and work.
                </p>
            </header>

            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Clock size={20} color="#0073ea" />
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#323338', margin: 0 }}>Recently visited</h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px'
                }}>
                    {recentBoards.length > 0 ? (
                        recentBoards.map(board => {
                            const workspace = workspaces.find(w => w.id === board.workspaceId);
                            return (
                                <div
                                    key={board.id}
                                    onClick={() => setActiveBoard(board.id)}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        border: '1px solid #e6e9ef',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        height: '160px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '6px',
                                                backgroundColor: '#f5f7fa',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Layout size={20} color="#0073ea" />
                                            </div>
                                            <Star size={16} color="#d0d4e4" />
                                        </div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#323338' }}>
                                            {board.title}
                                        </h3>
                                        <p style={{ fontSize: '13px', color: '#676879', margin: 0 }}>
                                            Work Management
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#676879' }}>
                                        <span>Workspace: {workspace?.title || 'Unknown Workspace'}</span>
                                    </div>
                                </div>
                            );
                        })
                    )
                        : (
                            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #d0d4e4' }}>
                                <p style={{ color: '#676879' }}>No boards found. Create one to get started!</p>
                            </div>
                        )}
                </div>
            </section>

            <InboxFeed />
        </div>
    );
};

// Sub-component for Feed to handle its own logic
const InboxFeed = () => {
    const { user } = useAuth();
    const { loadUserData } = useBoardStore();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) loadNotifications();
    }, [user]);

    const loadNotifications = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5); // Show latest 5 unread
        setNotifications(data || []);
        setIsLoading(false);
    };

    const handleDeclineInvite = async (notification: any) => {
        // Just delete the notification for now
        await supabase.from('notifications').delete().eq('id', notification.id);
        loadNotifications();
    };

    const handleMarkAsRead = async (notification: any) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        loadNotifications();
    };

    const handleAcceptInvite = async (notification: any) => {
        // ... (reuse logic or import if possible, but for now duplicate strictly for speed/isolation as this is a quick fix)
        // Actually, let's keep it simple. If we click accept/decline here, we should probably refactor useBoardStore to handle it
        // BUT for now, I'll just skip the action buttons in the feed or implement a simple version.
        // User asked to "Show data from Notification".
        // Let's just show the list first.
        if (notification.type === 'workspace_invite') {
            const { workspace_id, role } = notification.data;
            await supabase.from('workspace_members').insert({ workspace_id, user_id: user?.id, role });
        } else if (notification.type === 'board_invite') {
            const { board_id, role } = notification.data;
            await supabase.from('board_members').insert({ board_id, user_id: user?.id, role });
        }
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        await loadUserData(true);
        loadNotifications();
    };


    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0073ea', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600
                }}>
                    {notifications.length}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#323338', margin: 0 }}>Update feed (Inbox)</h2>
            </div>

            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e6e9ef',
                padding: '24px',
                minHeight: '100px'
            }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#676879' }}>Loading updates...</div>
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#676879', padding: '20px' }}>
                        No feedback coming
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {notifications.map(n => (
                            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', position: 'relative' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    backgroundColor: '#e6e9ef', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Bell size={20} color="#676879" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{n.title}</span>
                                        <span style={{ fontSize: '12px', color: '#676879' }}>{formatTime(n.created_at)}</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#323338', fontSize: '14px' }}>
                                        {n.message}
                                    </p>
                                    {(n.type === 'workspace_invite' || n.type === 'board_invite') && !n.is_read && (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            <button
                                                onClick={() => handleAcceptInvite(n)}
                                                style={{
                                                    backgroundColor: '#0073ea', color: 'white', border: 'none',
                                                    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
                                                }}>
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleDeclineInvite(n)}
                                                style={{
                                                    backgroundColor: 'transparent', color: '#676879', border: '1px solid #c3c6d4',
                                                    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
                                                }}>
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Hide / Mark as Read Button */}
                                <button
                                    onClick={() => handleMarkAsRead(n)}
                                    title="Mark as read / Hide"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: -10, // Adjust position
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#c3c6d4'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#323338'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#c3c6d4'}
                                >
                                    <EyeOff size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};
