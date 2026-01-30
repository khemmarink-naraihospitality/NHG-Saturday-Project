import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBoardStore } from '../store/useBoardStore';
import { supabase } from '../lib/supabase';

type PermissionAction =
    | 'view_board'
    | 'create_board'
    | 'delete_board'
    | 'manage_columns'
    | 'group_ungroup'
    | 'edit_items'
    | 'delete_items'
    | 'invite_members'
    | 'create_sub_workspace'
    | 'manage_feedback';

export const usePermission = () => {
    const { user } = useAuth();

    // Optimize state selection to avoid re-running on every board update
    const activeBoardWorkspaceId = useBoardStore(state =>
        state.boards.find(b => b.id === state.activeBoardId)?.workspaceId
    );
    const activeWorkspaceId = useBoardStore(state => state.activeWorkspaceId);
    const activeBoardId = useBoardStore(state => state.activeBoardId);
    // Find workspace owner without retrieving the whole workspace object repeatedly
    const activeWorkspaceOwnerId = useBoardStore(state =>
        state.workspaces.find(w => w.id === (activeBoardWorkspaceId || activeWorkspaceId))?.owner_id
    );

    const [userRole, setUserRole] = useState<string>('viewer');

    useEffect(() => {
        if (!user || (!activeWorkspaceId && !activeBoardId)) {
            setUserRole('viewer');
            return;
        }

        const checkPermissions = async () => {
            const targetWorkspaceId = activeBoardWorkspaceId || activeWorkspaceId;

            // 1. Check if user is workspace owner (Fastest)
            if (activeWorkspaceOwnerId === user.id) {
                setUserRole('owner');
                return;
            }

            // 2. Check board membership (Optimized: Use pre-fetched members)
            if (activeBoardId) {
                const activeMembers = useBoardStore.getState().activeBoardMembers;

                // If we have members loaded for the current board, use them!
                // Note: We might want to ensure activeBoardMembers actually corresponds to activeBoardId
                // The store update logic ensures they are set together, but let's be safe.
                if (activeMembers.length > 0) {
                    const member = activeMembers.find(m => m.user_id === user.id);
                    if (member) {
                        setUserRole(member.role);
                        return;
                    }
                    // If members are loaded but user is not in list -> they are likely not a member (or just viewer if public?)
                    // prioritizing explicit member check.
                }

                // Fallback to async check if for some reason local state is empty (shouldn't happen with new logic)
                try {
                    const { data: boardMember, error: bmError } = await supabase
                        .from('board_members')
                        .select('role')
                        .eq('board_id', activeBoardId)
                        .eq('user_id', user.id)
                        .single();

                    if (bmError && bmError.code !== 'PGRST116') {
                        console.error('Board Member Check Error:', bmError);
                    }

                    if (boardMember) {
                        setUserRole(boardMember.role);
                        return;
                    }
                } catch (err) {
                    console.error('Board Member Check Exception:', err);
                }
            }

            // 3. Check workspace membership (Fallback)
            try {
                const { data: workspaceMember } = await supabase
                    .from('workspace_members')
                    .select('role')
                    .eq('workspace_id', targetWorkspaceId)
                    .eq('user_id', user.id)
                    .single();

                if (workspaceMember) {
                    setUserRole(workspaceMember.role);
                    return;
                }
            } catch (err) {
                // Ignore 406 or PGRST116 (Not found/Not Acceptable)
                // console.warn('Workspace Check Skipped/Failed', err);
            }

            // Default to viewer if no membership found
            setUserRole('viewer');
        };

        checkPermissions();
        // Only re-run if these specific IDs change (not the whole arrays)
    }, [user?.id, activeWorkspaceId, activeBoardId, activeBoardWorkspaceId, activeWorkspaceOwnerId]);

    const can = (action: PermissionAction): boolean => {
        if (userRole === 'owner') return true;

        const permissions: Record<string, string[]> = {
            'view_board': ['viewer', 'member', 'admin', 'owner'],
            'edit_items': ['member', 'admin', 'owner'],
            'delete_items': ['member', 'admin', 'owner'],
            'manage_columns': ['member', 'admin', 'owner'],
            'group_ungroup': ['member', 'admin', 'owner'],
            'create_board': ['admin', 'owner'],
            'delete_board': ['admin', 'owner'],
            'invite_members': ['admin', 'owner'],
            'create_sub_workspace': ['admin', 'owner'],
            'manage_feedback': ['viewer', 'member', 'admin', 'owner']
        };

        return permissions[action]?.includes(userRole) || false;
    };

    return { can, role: userRole };
};
