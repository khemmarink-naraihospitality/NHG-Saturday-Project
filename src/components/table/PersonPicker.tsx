import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuth } from '../../contexts/AuthContext';

interface PersonPickerProps {
    currentValue: string[]; // Array of user_ids
    position: { top: number; bottom: number; left: number; width: number };
    onSelect: (userId: string) => void;
    onClose: () => void;
    boardId: string;
    itemId: string;
    columnId: string;
}

export const PersonPicker = ({ currentValue = [], position, onSelect, onClose, boardId, itemId, columnId }: PersonPickerProps) => {
    const { activeBoardMembers, searchUsers, inviteAndAssignUser } = useBoardStore();
    const { } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Invite Flow State
    const [inviteCandidate, setInviteCandidate] = useState<any | null>(null);
    const [inviteRole, setInviteRole] = useState('viewer');

    const menuRef = useRef<HTMLDivElement>(null);

    // Filter MEMBERS
    const filteredMembers = activeBoardMembers.filter(m => {
        const name = m.profiles.full_name || '';
        const email = m.profiles.email || '';
        const search = searchTerm.toLowerCase();
        return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
    });

    // SEARCH (Debounced)
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            const users = await searchUsers(searchTerm);

            // Filter out users who are ALREADY members (so we don't duplicate them in the "Other Users" list)
            const memberIds = new Set(activeBoardMembers.map(m => m.user_id));
            const nonMembers = users.filter(u => !memberIds.has(u.id));

            setSearchResults(nonMembers);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, activeBoardMembers]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSelectUser = async (targetUser: any, isMember: boolean) => {
        if (isMember) {
            // Direct Assignment
            onSelect(targetUser.id || targetUser.user_id); // Handle both profile and member objects
        } else {
            // Trigger Invite Flow
            setInviteCandidate(targetUser);
        }
    };

    const confirmInvite = async () => {
        if (!inviteCandidate) return;

        await inviteAndAssignUser(boardId, inviteCandidate.id, inviteRole, itemId, columnId);

        // Close picker after invite
        setInviteCandidate(null);
        onClose();
    };


    // Position logic
    const canFitBelow = window.innerHeight - position.bottom > 350;
    const listTop = canFitBelow ? position.bottom + 4 : position.top - 354;

    // --- RENDER INVITE CONFIRMATION ---
    if (inviteCandidate) {
        return createPortal(
            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    top: listTop, // Keep same position as simple picker
                    left: position.left,
                    width: 320,
                    zIndex: 9999,
                    backgroundColor: 'white',
                    border: '1px solid hsl(var(--color-border))',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Share Board?</h3>
                    <button onClick={() => setInviteCandidate(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>

                <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: 1.4 }}>
                    <strong>{inviteCandidate.full_name || inviteCandidate.email}</strong> is not a member of this board.
                    <br />
                    Share this board with them to assign this item?
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Role</label>
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="viewer">Viewer (Read Only)</option>
                        <option value="editor">Editor</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setInviteCandidate(null)}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmInvite}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#0073ea', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                    >
                        Invite & Assign
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: listTop,
                left: position.left,
                width: Math.max(position.width, 280),
                zIndex: 9999,
                backgroundColor: 'hsl(var(--color-bg-surface))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '350px',
                overflow: 'hidden'
            }}
        >
            {/* Search */}
            <div style={{ padding: '8px', borderBottom: '1px solid hsl(var(--color-border))' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    backgroundColor: 'hsl(var(--color-bg-base))',
                    borderRadius: '4px',
                    border: '1px solid hsl(var(--color-border))'
                }}>
                    <Search size={14} className="text-tertiary mr-2" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            width: '100%',
                            fontSize: '13px'
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>

                {/* SECTION: Board Members */}
                <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>
                    Board Members
                </div>
                {filteredMembers.map(member => {
                    const isSelected = currentValue.includes(member.user_id);
                    const initial = (member.profiles.full_name || member.profiles.email || '?')[0]?.toUpperCase();

                    return (
                        <div
                            key={member.user_id}
                            onClick={() => handleSelectUser(member, true)}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '2px',
                                backgroundColor: isSelected ? 'hsl(var(--color-bg-subtle))' : 'transparent',
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))'; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                backgroundColor: member.profiles.avatar_url ? 'transparent' : '#0073ea',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 600, overflow: 'hidden', flexShrink: 0
                            }}>
                                {member.profiles.avatar_url ? (
                                    <img src={member.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%' }} />
                                ) : initial}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member.profiles.full_name || member.profiles.email}
                                </div>
                            </div>
                            {isSelected && <Check size={14} className="text-brand-primary" />}
                        </div>
                    );
                })}

                {/* SECTION: Search Results (Non-Members) */}
                {searchTerm && searchResults.length > 0 && (
                    <>
                        <div style={{ padding: '8px 8px 4px', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', borderTop: '1px solid #eee', marginTop: '4px' }}>
                            Other People
                        </div>
                        {searchResults.map(user => {
                            const initial = (user.full_name || user.email || '?')[0]?.toUpperCase();
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelectUser(user, false)}
                                    style={{
                                        padding: '6px 8px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '2px',
                                        backgroundColor: 'transparent',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        backgroundColor: user.avatar_url ? 'transparent' : '#784bd1', // Different color for non-members
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: 600, overflow: 'hidden', flexShrink: 0
                                    }}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%' }} />
                                        ) : initial}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.full_name || user.email}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#999' }}>Invite to Board</div>
                                    </div>
                                    <UserPlus size={14} color="#999" />
                                </div>
                            );
                        })}
                    </>
                )}

                {/* No results */}
                {filteredMembers.length === 0 && (!searchTerm || searchResults.length === 0) && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'hsl(var(--color-text-tertiary))', fontSize: '13px' }}>
                        {isSearching ? 'Searching...' : 'No users found.'}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
