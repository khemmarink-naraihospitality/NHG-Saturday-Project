import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBoardStore } from '../../store/useBoardStore';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    data: any;
    is_read: boolean;
    created_at: string;
}

export const NotificationBell = () => {
    const { user } = useAuth();
    const { loadUserData, setActiveBoard, setActiveWorkspace } = useBoardStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    const loadNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    const markAsRead = async (notificationId: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        loadNotifications();
    };

    const handleAcceptInvite = async (notification: Notification) => {
        if (notification.type === 'workspace_invite') {
            const { workspace_id, role } = notification.data;

            // Add user to workspace_members
            const { error } = await supabase
                .from('workspace_members')
                .insert({
                    workspace_id,
                    user_id: user?.id,
                    role
                });

            if (error) {
                console.error('Error accepting workspace invite:', error);
                alert('Failed to accept invite');
                return;
            }
        } else if (notification.type === 'board_invite') {
            const { board_id, role } = notification.data;

            // Add user to board_members
            const { error } = await supabase
                .from('board_members')
                .insert({
                    board_id,
                    user_id: user?.id,
                    role
                });

            if (error) {
                console.error('Error accepting board invite:', error);
                alert('Failed to accept invite');
                return;
            }
        }

        // Mark notification as read
        await markAsRead(notification.id);

        // Reload data silently
        await loadUserData(true);
    };

    const handleDeclineInvite = async (notification: Notification) => {
        await supabase
            .from('notifications')
            .delete()
            .eq('id', notification.id);

        loadNotifications();
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: showDropdown ? 'hsl(var(--color-bg-hover))' : 'transparent',
                    color: 'hsl(var(--color-text-primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (!showDropdown) e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))';
                }}
                onMouseLeave={(e) => {
                    if (!showDropdown) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#ff3b30',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid hsl(var(--color-bg-surface))'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '360px',
                    maxWidth: '400px',
                    zIndex: 1000,
                    border: '1px solid hsl(var(--color-border))',
                    overflow: 'hidden',
                    maxHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid hsl(var(--color-border))',
                        fontWeight: 600,
                        fontSize: '16px'
                    }}>
                        Notifications
                    </div>

                    {/* Notifications List */}
                    <div style={{
                        overflowY: 'auto',
                        maxHeight: '400px'
                    }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                padding: '32px',
                                textAlign: 'center',
                                color: 'hsl(var(--color-text-tertiary))',
                                fontSize: '14px'
                            }}>
                                No notifications
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    style={{
                                        padding: '16px',
                                        borderBottom: '1px solid hsl(var(--color-border))',
                                        backgroundColor: notification.is_read ? 'transparent' : '#f0f7ff',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        if (!notification.is_read) markAsRead(notification.id);
                                        // Navigation logic
                                        if (notification.data?.board_id) {
                                            setActiveBoard(notification.data.board_id);
                                            setShowDropdown(false);
                                        } else if (notification.data?.workspace_id) {
                                            setActiveWorkspace(notification.data.workspace_id);
                                            setShowDropdown(false);
                                        }
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            fontWeight: notification.is_read ? 400 : 600,
                                            fontSize: '14px',
                                            flex: 1
                                        }}>
                                            {notification.title}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'hsl(var(--color-text-tertiary))',
                                            marginLeft: '8px',
                                            flexShrink: 0
                                        }}>
                                            {formatTime(notification.created_at)}
                                        </div>
                                    </div>

                                    {notification.message && (
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'hsl(var(--color-text-secondary))',
                                            marginBottom: '12px'
                                        }}>
                                            {notification.message}
                                        </div>
                                    )}

                                    {/* Workspace/Board Invite Actions - Show always if invite type */}
                                    {(notification.type === 'workspace_invite' || notification.type === 'board_invite') && (
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            marginTop: '12px'
                                        }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptInvite(notification);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 16px',
                                                    backgroundColor: '#0073ea',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeclineInvite(notification);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 16px',
                                                    backgroundColor: 'transparent',
                                                    color: 'hsl(var(--color-text-secondary))',
                                                    border: '1px solid hsl(var(--color-border))',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
