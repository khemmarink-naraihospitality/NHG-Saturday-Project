import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';

interface PersonPickerProps {
    currentValue: string[]; // Array of user_ids (even if single select for now, keeps it flexible)
    position: { top: number; bottom: number; left: number; width: number };
    onSelect: (userId: string) => void; // Toggle selection
    onClose: () => void;
}

export const PersonPicker = ({ currentValue = [], position, onSelect, onClose }: PersonPickerProps) => {
    const { activeBoardMembers } = useBoardStore();
    const [searchTerm, setSearchTerm] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    // Filter members
    const filteredMembers = activeBoardMembers.filter(m => {
        const name = m.profiles.full_name || '';
        const email = m.profiles.email || '';
        const search = searchTerm.toLowerCase();
        return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
    });

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

    // Position logic (reuse from DropdownPicker)
    const canFitBelow = window.innerHeight - position.bottom > 300;
    const listTop = canFitBelow ? position.bottom + 4 : position.top - 304;

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: listTop,
                left: position.left,
                width: Math.max(position.width, 260),
                zIndex: 9999,
                backgroundColor: 'hsl(var(--color-bg-surface))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '300px',
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
                        placeholder="Search members..."
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
                {filteredMembers.length > 0 ? (
                    filteredMembers.map(member => {
                        const isSelected = currentValue.includes(member.user_id);
                        const initial = (member.profiles.full_name || member.profiles.email || '?')[0].toUpperCase();

                        return (
                            <div
                                key={member.user_id}
                                onClick={() => onSelect(member.user_id)}
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
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: member.profiles.avatar_url ? 'transparent' : '#0073ea',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {member.profiles.avatar_url ? (
                                        <img src={member.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        initial
                                    )}
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.profiles.full_name || member.profiles.email}
                                    </div>
                                </div>

                                {isSelected && <Check size={14} className="text-brand-primary" />}
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'hsl(var(--color-text-tertiary))', fontSize: '13px' }}>
                        No members found.
                        <br />
                        <span style={{ fontSize: '11px' }}>Invite them to board first.</span>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
