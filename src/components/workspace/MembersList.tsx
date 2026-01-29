import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RoleSelector } from './RoleSelector';
import { useAuth } from '../../contexts/AuthContext';

interface Member {
    id: string;
    role: string;
    user_id: string;
    profiles: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

interface MembersListProps {
    members: Member[];
    ownerId?: string;
    currentUserRole: string;
    onRoleChange: (memberId: string, newRole: string) => Promise<void>;
    onRemove: (memberId: string) => Promise<void>;
    type: 'workspace' | 'board';
}

export const MembersList = ({
    members,
    ownerId,
    currentUserRole,
    onRoleChange,
    onRemove,
    type
}: MembersListProps) => {
    const { user } = useAuth();
    const [deletePopover, setDeletePopover] = useState<{
        memberId: string;
        top: number;
        left: number;
    } | null>(null);

    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
    const isOwner = currentUserRole === 'owner';

    const getMemberDisplayRole = (member: Member) => {
        if (type === 'workspace' && member.user_id === ownerId) {
            return 'owner';
        }
        return member.role;
    };

    const canChangeRole = (member: Member) => {
        const memberRole = getMemberDisplayRole(member);

        // Can't change owner role
        if (memberRole === 'owner') return false;

        // Only owner can change admin roles
        if (memberRole === 'admin' && !isOwner) return false;

        // Can't change your own role
        if (member.user_id === user?.id) return false;

        return canManageMembers;
    };

    const canRemoveMember = (member: Member) => {
        const memberRole = getMemberDisplayRole(member);

        // Can't remove owner
        if (memberRole === 'owner') return false;

        // Only owner can remove admins
        if (memberRole === 'admin' && !isOwner) return false;

        // Can't remove yourself
        if (member.user_id === user?.id) return false;

        return canManageMembers;
    };

    const handleDeleteClick = (memberId: string, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate position carefully
        // Default: Open to the left of the button
        let left = rect.right - 240; // width of popover is 240px

        // Ensure it doesn't go off screen left
        if (left < 10) left = 10;

        setDeletePopover({
            memberId,
            top: rect.bottom + 4,
            left: left
        });
    };

    return (
        <div style={{
            maxHeight: '300px',
            overflowY: 'auto'
        }}>
            {members.length === 0 ? (
                <div style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'hsl(var(--color-text-tertiary))',
                    fontSize: '14px'
                }}>
                    No members yet
                </div>
            ) : (
                members.map(member => {
                    const displayRole = getMemberDisplayRole(member);
                    const memberName = member.profiles.full_name || member.profiles.email.split('@')[0];
                    const initials = memberName.charAt(0).toUpperCase();

                    return (
                        <div
                            key={member.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderBottom: '1px solid hsl(var(--color-border))'
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: member.profiles.avatar_url ? 'transparent' : '#0073ea',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {member.profiles.avatar_url ? (
                                    <img
                                        src={member.profiles.avatar_url}
                                        alt={memberName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    initials
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 500,
                                    fontSize: '14px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {memberName}
                                    {member.user_id === user?.id && (
                                        <span style={{ color: 'hsl(var(--color-text-tertiary))', marginLeft: '8px' }}>
                                            (You)
                                        </span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'hsl(var(--color-text-tertiary))',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {member.profiles.email}
                                </div>
                            </div>

                            {/* Role Selector */}
                            <RoleSelector
                                value={displayRole}
                                onChange={(newRole) => onRoleChange(member.id, newRole)}
                                disabled={!canChangeRole(member)}
                                allowedRoles={displayRole === 'owner' ? ['owner'] : ['viewer', 'member', 'admin']}
                            />

                            {/* Remove Button */}
                            {canRemoveMember(member) && (
                                <button
                                    onClick={(e) => handleDeleteClick(member.id, e)}
                                    style={{
                                        padding: '8px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: 'hsl(var(--color-text-tertiary))',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fee';
                                        e.currentTarget.style.color = '#d00';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'hsl(var(--color-text-tertiary))';
                                    }}
                                    title="Remove member"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    );
                })
            )}

            {/* Delete Confirmation Popover - PORTALED */}
            {deletePopover && createPortal(
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999
                        }}
                        onClick={() => setDeletePopover(null)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: deletePopover.top,
                        left: deletePopover.left,
                        zIndex: 10000,
                        backgroundColor: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        border: '1px solid hsl(var(--color-border))',
                        width: '240px'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                            Remove member?
                        </h4>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'hsl(var(--color-text-secondary))' }}>
                            Are you sure you want to remove this member?
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeletePopover(null)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid hsl(var(--color-border))',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onRemove(deletePopover.memberId);
                                    setDeletePopover(null);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    backgroundColor: '#ff3b30',
                                    color: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
