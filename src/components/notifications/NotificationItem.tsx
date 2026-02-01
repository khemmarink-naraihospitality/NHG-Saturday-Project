
import { formatDistanceToNow } from 'date-fns';
import { useBoardStore } from '../../store/useBoardStore';
import type { Notification } from '../../types';
import { Check, X, Bell, UserPlus, FileText, MessageSquare } from 'lucide-react';
import { useState } from 'react';


interface NotificationItemProps {
    notification: Notification;
    onClose?: () => void;
}

export const NotificationItem = ({ notification, onClose }: NotificationItemProps) => {
    const { markNotificationAsRead, handleAcceptInvite, handleDeclineInvite, dismissNotification, setActiveBoard, setActiveWorkspace, setActiveItem } = useBoardStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const isInvite = notification.type === 'workspace_invite' || notification.type === 'board_invite';
    const isAssignment = notification.type === 'assignment';
    const isMention = notification.type === 'mention';

    const handleAction = async (action: 'accept' | 'decline') => {
        setIsProcessing(true);
        try {
            if (action === 'accept') {
                await handleAcceptInvite(notification);
            } else {
                await handleDeclineInvite(notification);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClick = () => {
        if (!notification.is_read) {
            markNotificationAsRead(notification.id);
        }

        // Navigation Logic
        if (notification.data?.board_id) {
            setActiveBoard(notification.data.board_id);
            // If linked to an item (mention/assignment), open it
            if (notification.entity_id) {
                // Short delay to allow board switch to register if needed, 
                // though Zustand updates are sync usually. 
                // However, switching board might trigger data fetch.
                // But setActiveItem just sets ID, so it should be fine.
                setActiveItem(notification.entity_id);
            }
            if (onClose) onClose();
        } else if (notification.data?.workspace_id) {
            setActiveWorkspace(notification.data.workspace_id);
            if (onClose) onClose();
        }
    };

    const getIcon = () => {
        if (isInvite) return <UserPlus size={16} color="#3b82f6" />;
        if (isAssignment) return <FileText size={16} color="#22c55e" />;
        if (isMention) return <MessageSquare size={16} color="#f97316" />;
        return <Bell size={16} color="#6b7280" />;
    };

    return (
        <div
            onClick={handleClick}
            style={{
                padding: '16px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: !notification.is_read ? '#eff6ff' : 'transparent',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
                if (notification.is_read) e.currentTarget.style.backgroundColor = '#f9fafb';
                // Show dismiss button on hover (requires separate state or CSS approach, using opacity for now)
                const dismissBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement;
                if (dismissBtn) dismissBtn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                if (notification.is_read) e.currentTarget.style.backgroundColor = 'transparent';
                const dismissBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement;
                if (dismissBtn) dismissBtn.style.opacity = '0';
            }}
        >
            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Icon/Avatar Placeholder */}
                <div style={{
                    marginTop: '4px', flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                    {getIcon()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{
                            fontSize: '14px', color: '#111827', paddingRight: '24px', margin: 0,
                            fontWeight: !notification.is_read ? 600 : 400
                        }}>
                            {notification.title || notification.content}
                        </p>
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }).replace('about ', '')}
                        </span>
                    </div>

                    {notification.message && (
                        <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {notification.message}
                        </p>
                    )}

                    {/* Invite Actions */}
                    {isInvite && (!notification.status || notification.status === 'pending') && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => handleAction('accept')}
                                disabled={isProcessing}
                                style={{
                                    flex: 1, padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none',
                                    borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                {isProcessing ? '...' : <><Check size={12} /> Accept</>}
                            </button>
                            <button
                                onClick={() => handleAction('decline')}
                                disabled={isProcessing}
                                style={{
                                    flex: 1, padding: '6px 12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db',
                                    borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <X size={12} /> Decline
                            </button>
                        </div>
                    )}

                    {/* Status Feedback */}
                    {notification.status && notification.status !== 'pending' && (
                        <div style={{
                            marginTop: '8px', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', width: 'fit-content',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            backgroundColor: notification.status === 'accepted' ? '#dcfce7' : '#fee2e2',
                            color: notification.status === 'accepted' ? '#15803d' : '#b91c1c'
                        }}>
                            {notification.status === 'accepted' ? <Check size={10} /> : <X size={10} />}
                            {notification.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </div>
                    )}
                </div>

                {/* Unread Indicator */}
                {!notification.is_read && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                )}

                {/* Group Hover Dismiss Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                    }}
                    className="dismiss-btn"
                    style={{
                        position: 'absolute', top: '8px', right: '8px', padding: '6px', border: 'none', background: 'transparent',
                        color: '#9ca3af', borderRadius: '6px', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s'
                    }}
                    title="Dismiss"
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};
