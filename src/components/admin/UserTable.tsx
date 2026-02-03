import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../store/useUserStore';
import { Search, Shield, ShieldAlert, MoreHorizontal, CheckCircle } from 'lucide-react';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    system_role: 'super_admin' | 'it_admin' | 'user';
    created_at: string;
}

export const UserTable = () => {
    const { currentUser } = useUserStore();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);

    // Delete Confirmation State
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fetchProfiles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // RLS Policy "Admins can view all profiles" must be active
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data as Profile[]);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setError(err.message || 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ system_role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setProfiles(prev => prev.map(p =>
                p.id === userId ? { ...p, system_role: newRole as any } : p
            ));
            setEditingId(null);
        } catch (err: any) {
            alert('Failed to update role: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            // Delete from auth.users (cascade will handle profiles and related data)
            const { error } = await supabase.rpc('delete_user', { user_id: userId });

            if (error) throw error;

            // Remove from local state
            setProfiles(prev => prev.filter(p => p.id !== userId));
            setDeleteConfirmId(null);
            alert('User deleted successfully');
        } catch (err: any) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header / Actions */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>
                <div>
                    <button
                        onClick={fetchProfiles}
                        style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#475569' }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading users...</div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                        Error: {error}. <br />
                        <span style={{ fontSize: '12px' }}>Please ensure you ran the `it_admin_policy.sql` script.</span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>User</th>
                                <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Role</th>
                                <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Joined</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProfiles.map(profile => (
                                <tr key={profile.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
                                                        {profile.full_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{profile.full_name || 'Unnamed User'}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{profile.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        {/* Only Allow Editing if Current User is Super Admin */}
                                        {editingId === profile.id && currentUser.system_role === 'super_admin' ? (
                                            <select
                                                value={profile.system_role || 'user'}
                                                onChange={(e) => handleRoleUpdate(profile.id, e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            >
                                                <option value="user">User</option>
                                                <option value="it_admin">IT Admin</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        ) : (
                                            <span
                                                onClick={() => {
                                                    // Only allow Super Admin to enter edit mode
                                                    if (currentUser.system_role === 'super_admin') {
                                                        setEditingId(profile.id);
                                                    }
                                                }}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px', borderRadius: '100px',
                                                    fontSize: '12px', fontWeight: 500,
                                                    cursor: currentUser.system_role === 'super_admin' ? 'pointer' : 'default',
                                                    backgroundColor: profile.system_role === 'super_admin' ? '#4f46e5' : profile.system_role === 'it_admin' ? '#0ea5e9' : '#e2e8f0',
                                                    color: profile.system_role === 'super_admin' || profile.system_role === 'it_admin' ? 'white' : '#475569'
                                                }}
                                            >
                                                {profile.system_role === 'super_admin' && <Shield size={10} />}
                                                {profile.system_role === 'it_admin' && <ShieldAlert size={10} />}
                                                {profile.system_role === 'user' || !profile.system_role ? 'User' : profile.system_role.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
                                            <CheckCircle size={14} /> Active
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 24px', fontSize: '13px', color: '#64748b' }}>
                                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        {currentUser.system_role === 'super_admin' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => setEditingId(editingId === profile.id ? null : profile.id)}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    <MoreHorizontal size={16} color="#94a3b8" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(profile.id)}
                                                    style={{
                                                        border: 'none',
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        cursor: 'pointer',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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
