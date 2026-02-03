
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useBoardStore } from '../../store/useBoardStore';
import { usePermission } from '../../hooks/usePermission';
import { Share2 } from 'lucide-react';
import { ShareBoardModal } from '../workspace/ShareBoardModal';

interface BoardHeaderProps {
    boardId: string;
}

export const BoardHeader = ({ boardId }: BoardHeaderProps) => {
    const { can } = usePermission();

    const board = useBoardStore(state => state.boards.find(b => b.id === boardId));
    const updateBoardTitle = useBoardStore(state => state.updateBoardTitle);
    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);

    // Local state for renaming
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (board) setTitle(board.title);
    }, [board?.title]);

    // Close dropdown when clicking outside


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





    return (
        <header style={{
            minHeight: '80px', // Increased from 64px for breathing room
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px', // Added vertical padding
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>Main Table</p>
                        <span style={{ fontSize: '10px', color: 'hsl(var(--color-border))' }}>●</span>
                        <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>{board.items.length} items</p>
                    </div>

                    {/* Members & Owner Display */}
                    {(() => {
                        // FIX: Use reactive hook instead of getState() to prevent stale data
                        const activeBoardMembers = useBoardStore(state => state.activeBoardMembers);
                        const owner = activeBoardMembers.find(m => m.role === 'owner' || m.role === 'workspace_owner');
                        // Filter out owner from general members list to avoid duplication
                        // If owner is workspace_owner, they might appear as member too if logic duplicated, but usually unique by ID.
                        const otherMembers = activeBoardMembers.filter(m => m.user_id !== owner?.user_id);
                        const displayMembers = otherMembers.slice(0, 3);
                        const overflowCount = otherMembers.length - 3;

                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid hsl(var(--color-border))', paddingLeft: '12px' }}>
                                {/* Owner */}
                                {owner && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`Board Owner: ${owner.profiles?.full_name || owner.profiles?.email}`}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                backgroundColor: '#e0e7ff', overflow: 'hidden',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', color: '#3730a3', fontWeight: 'bold',
                                                border: '2px solid white',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}>
                                                {owner.profiles?.avatar_url ? (
                                                    <img src={owner.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    (owner.profiles?.full_name?.[0] || owner.profiles?.email?.[0] || '?').toUpperCase()
                                                )}
                                            </div>
                                            <div style={{
                                                position: 'absolute', bottom: -2, right: -2,
                                                width: '10px', height: '10px', backgroundColor: '#fcd34d',
                                                borderRadius: '50%', border: '1px solid white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title="Owner">
                                                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#78350f' }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(var(--color-text-secondary))', lineHeight: 1 }}>
                                                {owner.profiles?.full_name || 'Owner'}
                                            </span>
                                            <span style={{ fontSize: '9px', color: 'hsl(var(--color-text-tertiary))', marginTop: '2px' }}>
                                                Owner
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Members Stack */}
                                {(otherMembers.length > 0 || can('create_board')) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                                            {displayMembers.map((m, i) => (
                                                <div key={m.id || m.user_id} style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    backgroundColor: '#f3f4f6', overflow: 'hidden',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '10px', color: '#4b5563', fontWeight: '500',
                                                    border: '2px solid white',
                                                    marginLeft: '-8px', // Stack effect
                                                    zIndex: 10 - i,
                                                    cursor: 'pointer'
                                                }} title={m.profiles?.full_name || m.profiles?.email}>
                                                    {m.profiles?.avatar_url ? (
                                                        <img src={m.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?').toUpperCase()
                                                    )}
                                                </div>
                                            ))}
                                            {overflowCount > 0 && (
                                                <div
                                                    onClick={() => setShowShareModal(true)}
                                                    style={{
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        backgroundColor: '#f3f4f6',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '10px', color: '#6b7280', fontWeight: '500',
                                                        border: '2px solid white',
                                                        marginLeft: '-8px',
                                                        zIndex: 0,
                                                        cursor: 'pointer'
                                                    }}
                                                    title={`View ${overflowCount} more`}
                                                >
                                                    +{overflowCount}
                                                </div>
                                            )}
                                        </div>

                                        {/* Add Member Button (Small) */}
                                        {can('create_board') && (
                                            <button
                                                onClick={() => setShowShareModal(true)}
                                                style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    backgroundColor: 'transparent',
                                                    border: '1px dashed hsl(var(--color-border))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'hsl(var(--color-text-tertiary))',
                                                    cursor: 'pointer',
                                                    marginLeft: '4px',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Add member"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Right Side: Share + Notifications + Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Share Button (Keep Only) */}
                {can('create_board') && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
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
                    </motion.button>
                )}
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
