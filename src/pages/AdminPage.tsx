import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useBoardStore } from '../store/useBoardStore';
import { supabase } from '../lib/supabase';
import {
    LayoutDashboard, Users, Settings,
    ShieldCheck, Activity, ArrowLeft, Building2, Trello
} from 'lucide-react';
import { UserTable } from '../components/admin/UserTable';
import { WorkspaceTable } from '../components/admin/WorkspaceTable';
import { BoardTable } from '../components/admin/BoardTable';
import { ActivityLogs } from '../components/admin/ActivityLogs';

export const AdminPage = () => {
    const { currentUser } = useUserStore();
    const { navigateTo } = useBoardStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'workspaces' | 'boards' | 'settings'>('dashboard');

    // Real Stats State
    const [stats, setStats] = useState([
        { label: 'Total Users', value: '-', icon: Users, color: '#6366f1' },
        { label: 'Active Workspaces', value: '-', icon: LayoutDashboard, color: '#10b981' },
        { label: 'System Health', value: '100%', icon: Activity, color: '#f59e0b' },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Get User Count
            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 2. Get Workspace Count
            const { count: workspaceCount } = await supabase
                .from('workspaces')
                .select('*', { count: 'exact', head: true });

            setStats([
                { label: 'Total Users', value: userCount?.toString() || '0', icon: Users, color: '#6366f1' },
                { label: 'Active Workspaces', value: workspaceCount?.toString() || '0', icon: LayoutDashboard, color: '#10b981' },
                { label: 'System Health', value: '100%', icon: Activity, color: '#f59e0b' },
            ]);
        };

        if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab]);

    if (currentUser.system_role !== 'super_admin' && currentUser.system_role !== 'it_admin') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                <ShieldCheck size={48} color="#ef4444" />
                <h2>Access Denied</h2>
                <p>You do not have permission to access the System Administration Console.</p>
                <button onClick={() => navigateTo('home')}>Go Home</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: '#1e293b',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 0'
            }}>
                <div style={{ padding: '0 24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#6366f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck size={20} color="white" />
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.5px' }}>ADMIN CONSOLE</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Super Admin Access
                    </div>
                </div>

                <nav style={{ flex: 1 }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'users', label: 'User Management', icon: Users },
                        { id: 'workspaces', label: 'Workspaces', icon: Building2 },
                        { id: 'boards', label: 'Boards', icon: Trello },
                        { id: 'settings', label: 'System Settings', icon: Settings },
                    ].map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 24px',
                                cursor: 'pointer',
                                backgroundColor: activeTab === item.id ? '#334155' : 'transparent',
                                color: activeTab === item.id ? 'white' : '#cbd5e1',
                                borderLeft: activeTab === item.id ? '3px solid #6366f1' : '3px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <item.icon size={18} />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                        </div>
                    ))}
                </nav>

                <div style={{ padding: '0 24px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                    <div
                        onClick={() => navigateTo('home')}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <ArrowLeft size={16} />
                        Back to Workera
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
                <header style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                        {activeTab === 'dashboard' ? 'Overview' : activeTab === 'users' ? 'User Management' : activeTab === 'workspaces' ? 'Workspace Management' : activeTab === 'boards' ? 'Board Management' : 'Settings'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>
                        Welcome back, {currentUser.name}. managing system as {currentUser.system_role}.
                    </p>
                </header>

                {activeTab === 'dashboard' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                            {stats.map((stat, i) => (
                                <div key={i} style={{
                                    backgroundColor: 'white',
                                    padding: '24px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px'
                                }}>
                                    <div style={{
                                        width: '48px', height: '48px',
                                        borderRadius: '12px',
                                        backgroundColor: `${stat.color}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: stat.color
                                    }}>
                                        <stat.icon size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{stat.label}</div>
                                        <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>{stat.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <ActivityLogs />
                    </div>
                )}

                {activeTab === 'users' && (
                    <div style={{ height: '600px' }}>
                        <UserTable />
                    </div>
                )}

                {activeTab === 'workspaces' && (
                    <div style={{ height: '600px' }}>
                        <WorkspaceTable />
                    </div>
                )}

                {activeTab === 'boards' && (
                    <div style={{ height: '600px' }}>
                        <BoardTable />
                    </div>
                )}
            </main>
        </div>
    );
}
