import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { InviteMemberForm } from './InviteMemberForm';
import { MembersList } from './MembersList';
import { useAuth } from '../../contexts/AuthContext';

interface ShareBoardModalProps {
    boardId: string;
    onClose: () => void;
}

export const ShareBoardModal = ({ boardId, onClose }: ShareBoardModalProps) => {
    const { user } = useAuth();
    const {
        boards,
        workspaces,
        inviteToBoard,
        getBoardMembers,
        updateMemberRole,
        removeMember
    } = useBoardStore();

    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const board = boards.find(b => b.id === boardId);
    const workspace = workspaces.find(w => w.id === board?.workspaceId);
    const isOwner = workspace?.owner_id === user?.id;

    // Get current user's role
    const currentUserMember = members.find(m => m.user_id === user?.id);
    const currentUserRole = isOwner ? 'owner' : (currentUserMember?.role || 'viewer');

    useEffect(() => {
        loadMembers();
    }, [boardId]);

    const loadMembers = async () => {
        setIsLoading(true);
        const data = await getBoardMembers(boardId);
        setMembers(data);
        setIsLoading(false);
    };

    const handleInvite = async (email: string, role: string) => {
        await inviteToBoard(boardId, email, role);
        alert('Invitation sent!');
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        await updateMemberRole(memberId, newRole, 'board');
        await loadMembers();
    };

    const handleRemove = async (memberId: string) => {
        await removeMember(memberId, 'board');
        await loadMembers();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 9998
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 9999
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid hsl(var(--color-border))'
                }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                            Share Board
                        </h2>
                        <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>
                            {board?.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--color-bg-hover))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Invite Form */}
                {(isOwner || currentUserRole === 'admin') && (
                    <InviteMemberForm onInvite={handleInvite} />
                )}

                {/* Members List */}
                <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '16px 24px',
                        fontWeight: 600,
                        fontSize: '14px',
                        borderBottom: '1px solid hsl(var(--color-border))'
                    }}>
                        Board Members ({members.length})
                    </div>

                    {isLoading ? (
                        <div style={{
                            padding: '32px',
                            textAlign: 'center',
                            color: 'hsl(var(--color-text-tertiary))'
                        }}>
                            Loading members...
                        </div>
                    ) : (
                        <MembersList
                            members={members}
                            currentUserRole={currentUserRole}
                            onRoleChange={handleRoleChange}
                            onRemove={handleRemove}
                            type="board"
                        />
                    )}
                </div>
            </div>
        </>
    );
};
