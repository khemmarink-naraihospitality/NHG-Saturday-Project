import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { InviteMemberForm } from './InviteMemberForm';
import { MembersList } from './MembersList';
import { useAuth } from '../../contexts/AuthContext';

interface ShareWorkspaceModalProps {
    workspaceId: string;
    onClose: () => void;
}

export const ShareWorkspaceModal = ({ workspaceId, onClose }: ShareWorkspaceModalProps) => {
    const { user } = useAuth();
    const {
        workspaces,
        inviteToWorkspace,
        getWorkspaceMembers,
        updateMemberRole,
        removeMember
    } = useBoardStore();

    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const workspace = workspaces.find(w => w.id === workspaceId);
    const isOwner = workspace?.owner_id === user?.id;

    // Get current user's role
    const currentUserMember = members.find(m => m.user_id === user?.id);
    const currentUserRole = isOwner ? 'owner' : (currentUserMember?.role || 'viewer');

    useEffect(() => {
        loadMembers();
    }, [workspaceId]);

    const loadMembers = async () => {
        setIsLoading(true);
        const data = await getWorkspaceMembers(workspaceId);
        setMembers(data);
        setIsLoading(false);
    };

    const handleInvite = async (email: string, role: string) => {
        await inviteToWorkspace(workspaceId, email, role);
        alert('Invitation sent!');
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        await updateMemberRole(memberId, newRole, 'workspace');
        await loadMembers();
    };

    const handleRemove = async (memberId: string) => {
        if (confirm('Are you sure you want to remove this member?')) {
            await removeMember(memberId, 'workspace');
            await loadMembers();
        }
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
                            Share Workspace
                        </h2>
                        <p style={{ fontSize: '13px', color: 'hsl(var(--color-text-tertiary))' }}>
                            {workspace?.title}
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
                        Members ({members.length})
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
                            ownerId={workspace?.owner_id}
                            currentUserRole={currentUserRole}
                            onRoleChange={handleRoleChange}
                            onRemove={handleRemove}
                            type="workspace"
                        />
                    )}
                </div>
            </div>
        </>
    );
};
