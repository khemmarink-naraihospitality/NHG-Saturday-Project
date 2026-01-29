
import { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Share2 } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { ShareBoardModal } from '../workspace/ShareBoardModal';

interface BoardHeaderProps {
    boardId: string;
}

export const BoardHeader = ({ boardId }: BoardHeaderProps) => {
    const board = useBoardStore(state => state.boards.find(b => b.id === boardId));
    const updateBoardTitle = useBoardStore(state => state.updateBoardTitle);
    const { user, signOut } = useAuth();
    const { can } = usePermission();

    // Local state for renaming
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');

    // Profile dropdown state
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        if (board) setTitle(board.title);
    }, [board?.title]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    if (!board) return null;

    const handleRename = () => {
        if (title.trim()) {
            updateBoardTitle(boardId, title);
        } else {
            // Revert if empty
            setTitle(board.title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRename();
        if (e.key === 'Escape') {
            setTitle(board.title);
            setIsEditing(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        setShowProfileMenu(false);
    };

    // Get user avatar or initials
    const userAvatar = user?.user_metadata?.avatar_url;
    const userInitials = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User').charAt(0).toUpperCase();

    return (
        <header style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            backgroundColor: 'hsl(var(--color-bg-surface))',
            borderBottom: '1px solid hsl(var(--color-border))'
        }}>
            <div>
                {isEditing ? (
                    <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={handleKeyDown}
                        style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            border: '1px solid hsl(var(--color-brand-primary))',
                            borderRadius: '4px',
                            padding: '0 4px',
                            margin: '-1px -5px', // Adjust for border/padding to align text
                            outline: 'none',
                            background: 'white',
                            color: 'hsl(var(--color-text-primary))',
                            width: `${Math.max(title.length * 12, 100)}px`,
                            maxWidth: '400px'
                        }}
                    />
                ) : (
                    <h1
                        onClick={() => {
                            if (can('create_board')) setIsEditing(true); // Using create_board as proxy for "Manage Board" owner/admin
                        }}
                        style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            cursor: can('create_board') ? 'pointer' : 'default',
                            border: '1px solid transparent', // To match input height/layout prevent jump
                            padding: '0 4px',
                            margin: '-1px -5px'
                        }}
                        title={can('create_board') ? "Click to rename" : "Read only"}
                    >
                        {board.title}
                    </h1>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>Main Table</p>
                    <span style={{ fontSize: '10px', color: 'hsl(var(--color-border))' }}>●</span>
                    <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>{board.items.length} items</p>
                </div>
            </div>

            {/* Right Side: Share + Notifications + Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Share Button */}
                {can('create_board') && (
                    <button
                        onClick={() => setShowShareModal(true)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid hsl(var(--color-border))',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'hsl(var(--color-text-primary))',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Share board"
                    >
                        <Share2 size={16} />
                        <span>Share</span>
                    </button>
                )}

                {/* Notification Bell */}
                <NotificationBell />

                {/* Profile Dropdown */}
                <div style={{ position: 'relative' }} ref={profileMenuRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            backgroundColor: userAvatar ? 'transparent' : '#0073ea',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s',
                            padding: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title={user?.email || 'Profile'}
                    >
                        {userAvatar ? (
                            <img
                                src={userAvatar}
                                alt="Profile"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            userInitials
                        )}
                    </button>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '48px',
                            right: 0,
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            minWidth: '240px',
                            zIndex: 1000,
                            border: '1px solid hsl(var(--color-border))',
                            overflow: 'hidden'
                        }}>
                            {/* User Info */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid hsl(var(--color-border))'
                            }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    marginBottom: '4px',
                                    color: 'hsl(var(--color-text-primary))'
                                }}>
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'hsl(var(--color-text-tertiary))'
                                }}>
                                    {user?.email}
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleSignOut}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '14px',
                                    color: 'hsl(var(--color-text-primary))',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LogOut size={16} />
                                <span>Log out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Share Board Modal */}
            {showShareModal && (
                <ShareBoardModal
                    boardId={boardId}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </header>
    );
};
