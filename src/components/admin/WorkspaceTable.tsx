import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, RefreshCw } from 'lucide-react';

interface WorkspaceRow {
    id: string;
    title: string;
    created_at: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
}

export const WorkspaceTable = () => {
    const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
    const [filteredWorkspaces, setFilteredWorkspaces] = useState<WorkspaceRow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkspaces = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch workspaces with owner info
            const { data, error: fetchError } = await supabase
                .from('workspaces')
                .select(`
                    id,
                    title,
                    created_at,
                    owner_id,
                    profiles!workspaces_owner_id_fkey (
                        full_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const mapped: WorkspaceRow[] = (data || []).map((ws: any) => ({
                id: ws.id,
                title: ws.title,
                created_at: ws.created_at,
                owner_id: ws.owner_id,
                owner_name: ws.profiles?.full_name || 'Unknown',
                owner_email: ws.profiles?.email || 'N/A'
            }));

            setWorkspaces(mapped);
            setFilteredWorkspaces(mapped);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredWorkspaces(workspaces);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredWorkspaces(
                workspaces.filter(ws =>
                    ws.title.toLowerCase().includes(query) ||
                    ws.owner_name.toLowerCase().includes(query) ||
                    ws.owner_email.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, workspaces]);

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Search size={18} color="#64748b" />
                    <input
                        type="text"
                        placeholder="Search workspaces..."
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
                    onClick={fetchWorkspaces}
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
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading workspaces...</div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workspace</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Owner</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkspaces.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        No workspaces found
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkspaces.map((ws) => (
                                    <tr key={ws.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>{ws.title}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: '14px', color: '#0f172a' }}>{ws.owner_name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{ws.owner_email}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b' }}>
                                            {new Date(ws.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
