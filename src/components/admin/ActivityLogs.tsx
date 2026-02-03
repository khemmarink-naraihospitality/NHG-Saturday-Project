import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, User, Briefcase, Trello, Trash2, Shield } from 'lucide-react';

interface ActivityLog {
    id: string;
    created_at: string;
    actor_id: string | null;
    action_type: string;
    target_type: string | null;
    target_id: string | null;
    metadata: any;
    actor_name?: string;
    actor_email?: string;
}

const ACTION_ICONS: Record<string, any> = {
    user_signup: User,
    workspace_created: Briefcase,
    board_created: Trello,
    user_deleted: Trash2,
    role_updated: Shield,
};

const ACTION_LABELS: Record<string, string> = {
    user_signup: 'User Signup',
    workspace_created: 'Workspace Created',
    board_created: 'Board Created',
    user_deleted: 'User Deleted',
    role_updated: 'Role Updated',
};

export const ActivityLogs = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('activity_logs')
                .select(`
                    *,
                    profiles!activity_logs_actor_id_fkey (
                        full_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (fetchError) throw fetchError;

            const mapped: ActivityLog[] = (data || []).map((log: any) => ({
                ...log,
                actor_name: log.profiles?.full_name || 'System',
                actor_email: log.profiles?.email || 'N/A'
            }));

            setLogs(mapped);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (actionType: string) => {
        if (actionType.includes('delete')) return '#dc2626';
        if (actionType.includes('created')) return '#10b981';
        if (actionType.includes('updated')) return '#f59e0b';
        return '#6366f1';
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Recent Activity</h3>
                <button
                    onClick={fetchLogs}
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

            {/* Logs List */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading activity logs...</div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                    Error: {error}
                    <div style={{ fontSize: '12px', marginTop: '8px', color: '#64748b' }}>
                        Make sure you've run the activity_logs_schema.sql script
                    </div>
                </div>
            ) : logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No activity logs yet</div>
            ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {logs.map((log) => {
                        const Icon = ACTION_ICONS[log.action_type] || User;
                        const color = getActionColor(log.action_type);

                        return (
                            <div
                                key={log.id}
                                style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}
                            >
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        backgroundColor: `${color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <Icon size={18} color={color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                                        {ACTION_LABELS[log.action_type] || log.action_type}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                        by {log.actor_name} ({log.actor_email})
                                    </div>
                                    {log.metadata && (() => {
                                        const meta = log.metadata;
                                        let description = '';

                                        switch (log.action_type) {
                                            case 'role_updated':
                                                description = `Changed role from ${meta.old_role || 'N/A'} to ${meta.new_role || 'N/A'} for ${meta.target_email || 'user'}`;
                                                break;
                                            case 'user_signup':
                                                description = `New user: ${meta.full_name || 'Unknown'} (${meta.email || 'N/A'}) as ${meta.system_role || 'user'}`;
                                                break;
                                            case 'user_deleted':
                                                description = `Deleted user: ${meta.full_name || 'Unknown'} (${meta.email || 'N/A'})`;
                                                break;
                                            case 'workspace_created':
                                                description = `Created workspace: "${meta.workspace_title || 'Untitled'}"`;
                                                break;
                                            case 'board_created':
                                                description = `Created board: "${meta.board_title || 'Untitled'}" in workspace "${meta.workspace_title || 'Unknown'}"`;
                                                break;
                                            default:
                                                description = JSON.stringify(meta);
                                        }

                                        return (
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                                {description}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
