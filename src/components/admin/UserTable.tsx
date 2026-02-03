import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../store/useUserStore';
import { Search, RefreshCw, MoreHorizontal, Trash2, Shield, Edit3 } from 'lucide-react';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    system_role: 'user' | 'it_admin' | 'super_admin';
    created_at: string;
}

const ROLE_HIERARCHY = {
    'user': 1,
    'it_admin': 2,
    'super_admin': 3
};

const ROLE_LABELS = {
    'user': 'User',
    'it_admin': 'IT Admin',
    'super_admin': 'Super Admin'
};

export const UserTable = () => {
    const { currentUser } = useUserStore();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Popover State
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const [popoverOpenUpward, setPopoverOpenUpward] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Delete Confirmation State
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Role Change State
    const [roleChangeModal, setRoleChangeModal] = useState<{ userId: string; currentRole: string } | null>(null);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            alert('Failed to fetch users: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setOpenPopoverId(null);
            }
        };

        if (openPopoverId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openPopoverId]);

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const targetUser = profiles.find(p => p.id === userId);
            const oldRole = targetUser?.system_role;

            const { error } = await supabase
                .from('profiles')
                .update({ system_role: newRole })
                .eq('id', userId);

            if (error) throw error;

            // Log the activity
            await supabase.rpc('log_activity', {
                p_action_type: 'role_updated',
                p_target_type: 'user',
                p_target_id: userId,
                p_metadata: {
                    old_role: oldRole,
                    new_role: newRole,
                    target_email: targetUser?.email
                }
            });

            setProfiles(prev => prev.map(p =>
                p.id === userId ? { ...p, system_role: newRole as any } : p
            ));
            setRoleChangeModal(null);
            setOpenPopoverId(null);
        } catch (err: any) {
            alert('Failed to update role: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const { error } = await supabase.rpc('delete_user', { user_id: userId });

            if (error) throw error;

            setProfiles(prev => prev.filter(p => p.id !== userId));
            setDeleteConfirmId(null);
            setOpenPopoverId(null);
            alert('User deleted successfully');
        } catch (err: any) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    const canModifyUser = (targetRole: string) => {
        const currentRoleLevel = ROLE_HIERARCHY[currentUser.system_role as keyof typeof ROLE_HIERARCHY] || 0;
        const targetRoleLevel = ROLE_HIERARCHY[targetRole as keyof typeof ROLE_HIERARCHY] || 0;
        return currentRoleLevel > targetRoleLevel;
    };

    const filteredProfiles = profiles.filter(p =>
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Search size={18} color="#64748b" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            flex: 1,
                            color: '#0f172a'
                        }}
                    />
                </div>
                <button
                    onClick={fetchProfiles}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#475569'
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div style={{ overflow: 'visible' }}>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProfiles.map((profile) => (
                                <tr key={profile.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>{profile.full_name || 'Unknown'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{profile.email}</div>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            backgroundColor: profile.system_role === 'super_admin' ? '#dbeafe' : profile.system_role === 'it_admin' ? '#fef3c7' : '#f1f5f9',
                                            color: profile.system_role === 'super_admin' ? '#1e40af' : profile.system_role === 'it_admin' ? '#92400e' : '#475569'
                                        }}>
                                            {ROLE_LABELS[profile.system_role] || profile.system_role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                            Active
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 24px', fontSize: '13px', color: '#64748b' }}>
                                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '12px 24px', position: 'relative' }}>
                                        {(() => {
                                            // Don't show button for current user's own account
                                            if (profile.id === currentUser.id) {
                                                return null;
                                            }

                                            const currentRoleLevel = ROLE_HIERARCHY[currentUser.system_role as keyof typeof ROLE_HIERARCHY] || 0;
                                            const targetRoleLevel = ROLE_HIERARCHY[profile.system_role as keyof typeof ROLE_HIERARCHY] || 0;
                                            const canModify = currentRoleLevel > targetRoleLevel;
                                            const isDisabled = currentRoleLevel < targetRoleLevel;

                                            return (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            if (isDisabled) return;

                                                            if (openPopoverId === profile.id) {
                                                                setOpenPopoverId(null);
                                                            } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                                const spaceAbove = rect.top;

                                                                // If less than 250px space below, open upward
                                                                setPopoverOpenUpward(spaceBelow < 250 && spaceAbove > spaceBelow);
                                                                setOpenPopoverId(profile.id);
                                                            }
                                                        }}
                                                        disabled={isDisabled}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            opacity: isDisabled ? 0.4 : 1
                                                        }}
                                                    >
                                                        <MoreHorizontal size={16} color={isDisabled ? '#cbd5e1' : '#94a3b8'} />
                                                    </button>

                                                    {/* Popover Menu */}
                                                    {openPopoverId === profile.id && canModify && (
                                                        <div
                                                            ref={popoverRef}
                                                            style={{
                                                                position: 'absolute',
                                                                ...(popoverOpenUpward ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }),
                                                                right: '0',
                                                                backgroundColor: 'white',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                                                zIndex: 9999,
                                                                minWidth: '200px',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {/* Change Role */}
                                                            {canModifyUser(profile.system_role) && (
                                                                <button
                                                                    onClick={() => {
                                                                        setRoleChangeModal({ userId: profile.id, currentRole: profile.system_role });
                                                                        setOpenPopoverId(null);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px 16px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        textAlign: 'left',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '10px',
                                                                        fontSize: '14px',
                                                                        color: '#0f172a',
                                                                        transition: 'background-color 0.15s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <Edit3 size={16} color="#64748b" />
                                                                    Change Role
                                                                </button>
                                                            )}

                                                            {/* Promote to Super Admin */}
                                                            {currentUser.system_role === 'super_admin' && profile.system_role !== 'super_admin' && (
                                                                <button
                                                                    onClick={() => handleRoleUpdate(profile.id, 'super_admin')}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px 16px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        textAlign: 'left',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '10px',
                                                                        fontSize: '14px',
                                                                        color: '#0f172a',
                                                                        transition: 'background-color 0.15s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <Shield size={16} color="#6366f1" />
                                                                    Promote to Super Admin
                                                                </button>
                                                            )}

                                                            {/* Delete */}
                                                            {canModifyUser(profile.system_role) && (
                                                                <>
                                                                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                                                                    <button
                                                                        onClick={() => {
                                                                            setDeleteConfirmId(profile.id);
                                                                            setOpenPopoverId(null);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 16px',
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            textAlign: 'left',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            fontSize: '14px',
                                                                            color: '#dc2626',
                                                                            transition: 'background-color 0.15s'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                        Delete User
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Role Change Modal */}
            {roleChangeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                            Change User Role
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                            Select a new role for this user:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {(['user', 'it_admin', 'super_admin'] as const).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => handleRoleUpdate(roleChangeModal.userId, role)}
                                    disabled={role === roleChangeModal.currentRole}
                                    style={{
                                        padding: '12px 16px',
                                        border: role === roleChangeModal.currentRole ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        backgroundColor: role === roleChangeModal.currentRole ? '#eef2ff' : 'white',
                                        cursor: role === roleChangeModal.currentRole ? 'default' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#0f172a',
                                        textAlign: 'left',
                                        opacity: role === roleChangeModal.currentRole ? 0.7 : 1
                                    }}
                                >
                                    {ROLE_LABELS[role]} {role === roleChangeModal.currentRole && '(Current)'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setRoleChangeModal(null)}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#475569'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                            Confirm Delete User
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                            Are you sure you want to delete this user? This action cannot be undone and will remove all their data.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#475569'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteUser(deleteConfirmId)}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500
                                }}
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
