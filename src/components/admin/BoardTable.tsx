import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, RefreshCw } from 'lucide-react';

interface BoardRow {
    id: string;
    title: string;
    created_at: string;
    owner_id: string;
    workspace_id: string;
    owner_name: string;
    owner_email: string;
    workspace_title: string;
}

export const BoardTable = () => {
    const [boards, setBoards] = useState<BoardRow[]>([]);
    const [filteredBoards, setFilteredBoards] = useState<BoardRow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBoards = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch boards with owner and workspace info
            const { data, error: fetchError } = await supabase
                .from('boards')
                .select(`
                    id,
                    title,
                    created_at,
                    owner_id,
                    workspace_id,
                    profiles!boards_owner_id_fkey (
                        full_name,
                        email
                    ),
                    workspaces!boards_workspace_id_fkey (
                        title
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const mapped: BoardRow[] = (data || []).map((board: any) => ({
                id: board.id,
                title: board.title,
                created_at: board.created_at,
                owner_id: board.owner_id,
                workspace_id: board.workspace_id,
                owner_name: board.profiles?.full_name || 'Unknown',
                owner_email: board.profiles?.email || 'N/A',
                workspace_title: board.workspaces?.title || 'Unknown Workspace'
            }));

            setBoards(mapped);
            setFilteredBoards(mapped);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredBoards(boards);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredBoards(
                boards.filter(board =>
                    board.title.toLowerCase().includes(query) ||
                    board.owner_name.toLowerCase().includes(query) ||
                    board.workspace_title.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, boards]);

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Search size={18} color="#64748b" />
                    <input
                        type="text"
                        placeholder="Search boards..."
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
                    onClick={fetchBoards}
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
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading boards...</div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Board</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workspace</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Owner</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBoards.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        No boards found
                                    </td>
                                </tr>
                            ) : (
                                filteredBoards.map((board) => (
                                    <tr key={board.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>{board.title}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: '14px', color: '#64748b' }}>{board.workspace_title}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: '14px', color: '#0f172a' }}>{board.owner_name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{board.owner_email}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b' }}>
                                            {new Date(board.created_at).toLocaleDateString()}
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
