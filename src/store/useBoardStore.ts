import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { arrayMove } from '@dnd-kit/sortable';
import type { Board, Item, Workspace, ItemValue, ColumnType } from '../types';

interface BoardState {
    boards: Board[];
    activeBoardId: string | null;
    selectedItemIds: string[];
    showHiddenItems: boolean;
    activeWorkspaceId: string;
    workspaces: Workspace[];
    sharedBoardIds: string[];
    activeBoardMembers: any[]; // Store members of the active board


    // Async State
    isLoading: boolean;
    isSyncing: boolean;
    error: string | null;
    loadUserData: (isSilent?: boolean) => Promise<void>;

    // Actions
    addBoard: (title: string, subWorkspaceId?: string) => Promise<void>;
    deleteBoard: (id: string) => Promise<void>;
    setActiveBoard: (id: string | null) => void;
    updateBoardTitle: (boardId: string, newTitle: string) => Promise<void>;
    duplicateBoard: (boardId: string) => Promise<void>;
    moveBoard: (activeId: string, overId: string) => void;
    duplicateBoardToWorkspace: (boardId: string, workspaceId: string) => void;
    moveBoardToWorkspace: (boardId: string, workspaceId: string) => void;

    // Workspace Actions
    addWorkspace: (title: string) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    setActiveWorkspace: (id: string) => void;
    duplicateWorkspace: (id: string) => void;
    renameWorkspace: (id: string, newTitle: string) => Promise<void>;

    // Group Actions
    addGroup: (title: string) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
    updateGroupTitle: (groupId: string, newTitle: string) => Promise<void>;
    updateGroupColor: (groupId: string, color: string) => Promise<void>;
    toggleGroup: (boardId: string, groupId: string) => void;

    // Column Actions
    addColumn: (title: string, type: ColumnType, index?: number) => Promise<void>;
    deleteColumn: (columnId: string) => Promise<void>;
    updateColumnTitle: (columnId: string, newTitle: string) => Promise<void>;
    updateColumnWidth: (columnId: string, width: number) => void;
    moveColumn: (fromIndex: number, toIndex: number) => void;
    duplicateColumn: (columnId: string) => void;
    setColumnAggregation: (columnId: string, type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none') => void;
    // Column Options
    addColumnOption: (columnId: string, label: string, color: string) => void;
    updateColumnOption: (columnId: string, optionId: string, updates: Partial<{ label: string; color: string }>) => void;
    deleteColumnOption: (columnId: string, optionId: string) => void;

    // Board View Settings
    updateBoardItemColumnTitle: (newTitle: string) => void;
    updateBoardItemColumnWidth: (width: number) => void;

    // Item Actions
    addItem: (title: string, groupId: string) => Promise<void>;
    updateItemValue: (itemId: string, columnId: string, value: any) => Promise<void>;
    updateItemTitle: (itemId: string, newTitle: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    moveItem: (activeId: string, overId: string) => void;

    // Selection & Batch Actions
    toggleItemSelection: (itemId: string, selected: boolean) => void;
    selectGroupItems: (groupId: string) => void;
    clearSelection: () => void;
    deleteSelectedItems: () => void;
    duplicateSelectedItems: () => void;
    moveSelectedItemsToGroup: (targetGroupId: string) => void;
    hideSelectedItems: () => void;
    unhideSelectedItems: () => void;

    // UI State
    toggleShowHiddenItems: () => void;
    setGroupByColumn: (columnId: string | null) => void;
    setActiveItem: (itemId: string | null) => void;
    activeItemId: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Task Updates
    addUpdate: (itemId: string, content: string, author: { name: string; id: string }) => void;
    deleteUpdate: (itemId: string, updateId: string) => void;

    // Sorting & Filtering
    setColumnSort: (columnId: string, direction: 'asc' | 'desc' | null) => void;
    setColumnFilter: (columnId: string, values: string[]) => void;
    clearColumnFilter: (columnId: string) => void;

    // Realtime Subscription
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;

    // Workspace & Board Sharing
    inviteToWorkspace: (workspaceId: string, email: string, role: string) => Promise<void>;
    inviteToBoard: (boardId: string, email: string, role: string) => Promise<void>;
    getWorkspaceMembers: (workspaceId: string) => Promise<any[]>;
    getBoardMembers: (boardId: string) => Promise<any[]>;
    updateMemberRole: (memberId: string, newRole: string, type: 'workspace' | 'board') => Promise<void>;
    removeMember: (memberId: string, type: 'workspace' | 'board') => Promise<void>;
    isLoadingMembers: boolean;

    // Phase 3: Person Picker & Mentions
    searchUsers: (query: string) => Promise<any[]>;
    inviteAndAssignUser: (boardId: string, userId: string, role: string, itemId: string, columnId: string) => Promise<void>;
    createNotification: (userId: string, type: string, content: string, entityId: string) => Promise<void>;

    // Realtime
    realtimeSubscription: any; // Using any for proper supabase channel type without heavy imports for now
}



export const useBoardStore = create<BoardState>((set, get) => ({
    boards: [],
    workspaces: [],
    sharedBoardIds: [],
    activeBoardMembers: [], // Initialize empty
    isLoadingMembers: false,

    activeBoardId: null,
    activeWorkspaceId: '',
    selectedItemIds: [],
    showHiddenItems: false,
    activeItemId: null,
    searchQuery: '',
    isLoading: true,
    isSyncing: false,
    error: null,
    realtimeSubscription: null,

    loadUserData: async (isSilent = false) => {
        if (!isSilent) {
            set({ isLoading: true, error: null });
        } else {
            set({ isSyncing: true, error: null });
        }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ isLoading: false });
                return;
            }

            const [
                { data: workspaces },
                { data: boards },
                { data: groups },
                { data: columns },
                { data: items },
                { data: sharedBoardsData }
            ] = await Promise.all([
                supabase.from('workspaces').select('*').order('order'),
                supabase.from('boards').select('*').order('order'),
                supabase.from('groups').select('*').order('order'),
                supabase.from('columns').select('*').order('order'),
                supabase.from('items').select('*').order('order'),
                supabase.from('board_members').select('board_id').eq('user_id', user.id)
            ]);

            // --- SELF HEALING: Fix 'Person' columns that are somehow 'text' type ---
            if (columns && columns.length > 0) {
                const buggedColumns = columns.filter(c => (c.title === 'Person' || c.title === 'Owner') && c.type === 'text');
                if (buggedColumns.length > 0) {
                    console.log('[AutoFix] Found bugged Person columns:', buggedColumns.length);
                    await Promise.all(buggedColumns.map(c =>
                        supabase.from('columns').update({ type: 'people', options: [] }).eq('id', c.id)
                    ));
                    // Update local reference so the app renders correctly immediately
                    buggedColumns.forEach(c => { c.type = 'people'; c.options = []; });
                }
            }
            // ---------------------------------------------------------------------

            console.log('[DEBUG] loadUserData fetched IDs:', {
                boardIds: boards?.map(b => b.id),
                itemIds: items?.map(i => i.id)
            });

            console.log('[DEBUG] loadUserData fetched:', {
                workspaces: workspaces?.length,
                boards: boards?.length,
                groups: groups?.length,
                columns: columns?.length,
                items: items?.length,
                sharedBoards: sharedBoardsData?.length
            });

            if (!workspaces || !boards) throw new Error('Failed to load core data');

            // Handle case where user has no workspace (first login)
            if (workspaces.length === 0) {
                // 0. ENSURE PROFILE EXISTS (Fix for users created before SQL trigger)
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    avatar_url: user.user_metadata?.avatar_url
                }, { onConflict: 'id' });

                if (profileError) {
                    console.error("Failed to create profile:", profileError);
                }

                const workspaceId = uuidv4();
                const boardId = uuidv4();

                // 1. Create Workspace
                const newWorkspace = { id: workspaceId, title: 'My Workspace', owner_id: user.id, order: 0 };
                const { error: wsError } = await supabase.from('workspaces').insert(newWorkspace);
                if (wsError) throw new Error(`Failed to create workspace: ${wsError.message}`);

                // 2. Create Board
                const newBoard = { id: boardId, workspace_id: workspaceId, title: 'Welcome to Workera', order: 0 };
                const { error: boardError } = await supabase.from('boards').insert(newBoard);
                if (boardError) throw new Error(`Failed to create board: ${boardError.message}`);

                // 3. Create Default Groups
                const group1Id = uuidv4();
                const group2Id = uuidv4();
                const groupsMsg = [
                    { id: group1Id, board_id: boardId, title: 'Getting Started', color: '#579bfc', order: 0 },
                    { id: group2Id, board_id: boardId, title: 'Ideas', color: '#784bd1', order: 1 }
                ];
                const { error: groupsError } = await supabase.from('groups').insert(groupsMsg);
                if (groupsError) console.error('Failed to create groups:', groupsError);

                // 4. Create ALL Column Types
                const colStatusId = uuidv4();
                const columnsMsg = [
                    {
                        id: uuidv4(), board_id: boardId, title: 'Task', type: 'text', order: 0, width: 280,
                        options: []
                    },
                    {
                        id: colStatusId, board_id: boardId, title: 'Status', type: 'status', order: 1, width: 140,
                        options: [
                            { id: uuidv4(), label: 'Done', color: '#00c875' },
                            { id: uuidv4(), label: 'Working on it', color: '#fdab3d' },
                            { id: uuidv4(), label: 'Stuck', color: '#e2445c' },
                            { id: uuidv4(), label: 'To Do', color: '#c4c4c4' },
                        ]
                    },
                    { id: uuidv4(), board_id: boardId, title: 'Due Date', type: 'date', order: 2, width: 140, options: [] },
                    { id: uuidv4(), board_id: boardId, title: 'Owner', type: 'people', order: 3, width: 140, options: [] },
                    { id: uuidv4(), board_id: boardId, title: 'Priority', type: 'dropdown', order: 4, width: 140, options: [] },
                    { id: uuidv4(), board_id: boardId, title: 'Budget', type: 'number', order: 5, width: 140, options: [] },
                    { id: uuidv4(), board_id: boardId, title: 'Files', type: 'link', order: 6, width: 140, options: [] },
                    { id: uuidv4(), board_id: boardId, title: 'Checked', type: 'checkbox', order: 7, width: 100, options: [] },
                ];
                const { error: colsError } = await supabase.from('columns').insert(columnsMsg);
                if (colsError) console.error('Failed to create columns:', colsError);

                // 5. Create Sample Items
                const item1Id = uuidv4();
                const item2Id = uuidv4();
                const itemsMsg = [
                    {
                        id: item1Id, board_id: boardId, group_id: group1Id, title: 'Explore Workera', order: 0,
                        values: { [colStatusId]: 'Working on it' }
                    },
                    {
                        id: item2Id, board_id: boardId, group_id: group1Id, title: 'Invite Team', order: 1,
                        values: { [colStatusId]: 'To Do' }
                    }
                ];
                const { error: itemsError } = await supabase.from('items').insert(itemsMsg);
                if (itemsError) console.error('Failed to create items:', itemsError);

                // Update Local State immediately
                set({
                    workspaces: [{ id: workspaceId, title: 'My Workspace', order: 0, owner_id: user.id }],
                    boards: [{
                        id: boardId,
                        workspaceId: workspaceId,
                        title: 'Welcome to Workera',
                        columns: columnsMsg.map(c => ({ ...c, type: c.type as ColumnType, options: c.options })),
                        groups: groupsMsg.map(g => ({
                            id: g.id, title: g.title, color: g.color,
                            items: itemsMsg.filter(i => i.group_id === g.id).map(i => ({
                                id: i.id, title: i.title, groupId: g.id, boardId: boardId, values: i.values, updates: []
                            }))
                        })),
                        items: itemsMsg.map(i => ({
                            id: i.id, title: i.title, groupId: i.group_id, boardId: boardId, values: i.values, updates: []
                        })),
                        itemColumnTitle: 'Item',
                        itemColumnWidth: 280
                    }],
                    isLoading: false,
                    activeWorkspaceId: workspaceId,
                    activeBoardId: boardId
                });
                return;
            }

            const fullBoards: Board[] = boards.map(b => {
                const bGroups = (groups || []).filter(g => g.board_id === b.id);
                const bColumns = (columns || []).filter(c => c.board_id === b.id);
                const bItems = (items || []).filter(i => i.board_id === b.id);

                return {
                    id: b.id,
                    workspaceId: b.workspace_id,
                    title: b.title,
                    columns: bColumns.map(c => ({
                        id: c.id,
                        title: c.title,
                        type: c.type as ColumnType,
                        width: c.width,
                        order: c.order,
                        options: c.options || [],
                        aggregation: c.aggregation
                    })),
                    // Just map groups, items are flat on board but we can also nest them if UI expects it
                    groups: bGroups.map(g => ({
                        id: g.id,
                        title: g.title,
                        color: g.color,
                        items: bItems.filter(i => i.group_id === g.id).map(i => ({
                            id: i.id,
                            title: i.title,
                            groupId: g.id,
                            boardId: b.id,
                            values: i.values || {},
                            isHidden: i.is_hidden,
                            updates: i.updates || []
                        }))
                    })),
                    items: bItems.map(i => ({
                        id: i.id,
                        title: i.title,
                        groupId: i.group_id,
                        boardId: b.id,
                        values: i.values || {},
                        isHidden: i.is_hidden,
                        updates: i.updates || []
                    })),
                    itemColumnTitle: 'Item',
                    itemColumnWidth: 280
                };
            });

            // Determine Active Workspace
            const lastWorkspaceId = localStorage.getItem('lastActiveWorkspaceId');
            const validWorkspace = workspaces.find(w => w.id === lastWorkspaceId);
            const activeWorkspaceId = validWorkspace ? validWorkspace.id : (workspaces[0]?.id || '');

            // Determine Active Board
            const lastBoardId = localStorage.getItem('lastActiveBoardId');
            const validBoard = fullBoards.find(b => b.id === lastBoardId);
            const activeBoardId = validBoard ? validBoard.id : null;

            set({
                workspaces: workspaces.map(w => ({ id: w.id, title: w.title, order: w.order, owner_id: w.owner_id })),
                boards: fullBoards,
                sharedBoardIds: sharedBoardsData?.map((r: any) => r.board_id) || [],
                isLoading: false,
                activeWorkspaceId,
                activeBoardId
            });

            // If we restored a board, fetch its members
            if (activeBoardId) {
                if (isSilent && activeBoardId === get().activeBoardId) {
                    // SILENT REFRESH: Fetch members without triggering global loading state
                    const members = await get().getBoardMembers(activeBoardId);
                    set({ activeBoardMembers: members });
                } else {
                    // INITIAL LOAD or BOARD CHANGE: Trigger full setup (with potential loading UI)
                    get().setActiveBoard(activeBoardId);
                }
            }

        } catch (e) {
            console.error(e);
            set({ error: (e as Error).message, isLoading: false, isSyncing: false });
        } finally {
            if (isSilent) set({ isSyncing: false });
        }
    },

    setActiveBoard: async (id) => {
        set({ activeBoardId: id });
        localStorage.setItem('lastActiveBoardId', id || '');
        if (id) {
            set({ isLoadingMembers: true });
            // Fetch members immediately for permission check
            const members = await get().getBoardMembers(id);
            set({ activeBoardMembers: members, isLoadingMembers: false });
        } else {
            set({ activeBoardMembers: [], isLoadingMembers: false });
        }
    },
    setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id });
        localStorage.setItem('lastActiveWorkspaceId', id);
    },
    setActiveItem: (id) => set({ activeItemId: id }),
    setSearchQuery: (q) => set({ searchQuery: q }),

    // --- Workspace Actions ---
    addWorkspace: async (title) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const newId = uuidv4();
        const { workspaces } = get();
        const order = workspaces.length;
        set({ workspaces: [...workspaces, { id: newId, title, order, owner_id: user.id }], activeWorkspaceId: newId });
        await supabase.from('workspaces').insert({ id: newId, title, owner_id: user.id, order });
    },
    deleteWorkspace: async (id) => {
        set(state => ({ workspaces: state.workspaces.filter(w => w.id !== id) }));
        await supabase.from('workspaces').delete().eq('id', id);
    },
    renameWorkspace: async (id, newTitle) => {
        set(state => ({ workspaces: state.workspaces.map(w => w.id === id ? { ...w, title: newTitle } : w) }));
        await supabase.from('workspaces').update({ title: newTitle }).eq('id', id);
    },
    duplicateWorkspace: (_id) => { /* TODO: Implement deep copy in DB */ },

    // --- Board Actions ---
    addBoard: async (title, _subWorkspaceId) => {
        const { activeWorkspaceId, boards } = get();
        if (!activeWorkspaceId) return;

        const boardId = uuidv4();
        const defaultGroups = [
            { id: uuidv4(), title: 'Group 1', color: '#579bfc', order: 0 },
            { id: uuidv4(), title: 'Group 2', color: '#784bd1', order: 1 }
        ];
        const defaultColumns = [
            { id: uuidv4(), title: 'Status', type: 'status', order: 0, width: 140, options: [{ id: uuidv4(), label: 'Done', color: '#00c875' }, { id: uuidv4(), label: 'Working', color: '#fdab3d' }, { id: uuidv4(), label: 'Stuck', color: '#e2445c' }] },
            { id: uuidv4(), title: 'Date', type: 'date', order: 1, width: 140 },
            { id: uuidv4(), title: 'Person', type: 'people', order: 2, width: 140 },
        ];

        const newBoard: Board = {
            id: boardId,
            workspaceId: activeWorkspaceId,
            title,
            columns: defaultColumns.map(c => ({ ...c, type: c.type as ColumnType, options: c.options })),
            groups: defaultGroups.map(g => ({ ...g, items: [] })),
            items: []
        };

        set({ boards: [...boards, newBoard], activeBoardId: boardId });

        await supabase.from('boards').insert({ id: boardId, workspace_id: activeWorkspaceId, title, order: boards.length });
        await supabase.from('groups').insert(defaultGroups.map(g => ({ id: g.id, board_id: boardId, title: g.title, color: g.color, order: g.order })));
        await supabase.from('columns').insert(defaultColumns.map(c => ({ id: c.id, board_id: boardId, title: c.title, type: c.type, order: c.order, width: c.width, options: c.options ? JSON.stringify(c.options) : '{}' })));

        // Add creator as owner in board_members
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('board_members').insert({
                board_id: boardId,
                user_id: user.id,
                role: 'owner'
            });

            // FIX: Update local activeBoardMembers immediately so permissions work
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            set({
                activeBoardMembers: [{
                    id: uuidv4(), // Temporary ID for the member record
                    user_id: user.id,
                    role: 'owner',
                    profiles: profile || { email: user.email, id: user.id, full_name: user.user_metadata?.full_name }
                }]
            });
        }

        // Refresh fully to get server-generated IDs/timestamps eventually
        get().loadUserData(true);

    },
    deleteBoard: async (id) => {
        set(state => ({ boards: state.boards.filter(b => b.id !== id), activeBoardId: state.activeBoardId === id ? null : state.activeBoardId }));
        await supabase.from('boards').delete().eq('id', id);
    },
    updateBoardTitle: async (boardId, newTitle) => {
        set(state => ({ boards: state.boards.map(b => b.id === boardId ? { ...b, title: newTitle } : b) }));
        await supabase.from('boards').update({ title: newTitle }).eq('id', boardId);
    },
    duplicateBoard: async (_boardId) => { /* TODO */ },
    moveBoard: async (activeId, overId) => {
        const { boards } = get();
        const activeIndex = boards.findIndex(b => b.id === activeId);
        const overIndex = boards.findIndex(b => b.id === overId);

        if (activeIndex === -1 || overIndex === -1) return;

        const newBoards = arrayMove(boards, activeIndex, overIndex);

        set({ boards: newBoards });

        // Persist
        const boardIds = newBoards.map(b => b.id);
        await supabase.rpc('reorder_boards', { _board_ids: boardIds });
    },
    duplicateBoardToWorkspace: () => { },
    moveBoardToWorkspace: () => { },

    // --- Group Actions ---
    addGroup: async (title) => {
        const { activeBoardId, boards } = get();
        if (!activeBoardId) return;
        const newId = uuidv4();
        const board = boards.find(b => b.id === activeBoardId);
        const order = board?.groups.length || 0;
        const newGroup = { id: newId, title, color: '#579bfc', items: [] };

        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, groups: [...b.groups, newGroup] } : b)
        }));
        await supabase.from('groups').insert({ id: newId, board_id: activeBoardId, title, order });
    },
    deleteGroup: async (groupId) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, groups: b.groups.filter(g => g.id !== groupId) } : b)
        }));
        await supabase.from('groups').delete().eq('id', groupId);
    },
    updateGroupTitle: async (groupId, newTitle) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, groups: b.groups.map(g => g.id === groupId ? { ...g, title: newTitle } : g) } : b)
        }));
        await supabase.from('groups').update({ title: newTitle }).eq('id', groupId);
    },
    updateGroupColor: async (groupId, color) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, groups: b.groups.map(g => g.id === groupId ? { ...g, color } : g) } : b)
        }));
        await supabase.from('groups').update({ color }).eq('id', groupId);
    },
    toggleGroup: (boardId, groupId) => {
        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== boardId) return b;
                const collapsed = b.collapsedGroups || [];
                return {
                    ...b,
                    collapsedGroups: collapsed.includes(groupId) ? collapsed.filter(id => id !== groupId) : [...collapsed, groupId]
                };
            })
        }));
    },

    // --- Column Actions ---
    addColumn: async (title, type) => {
        const { activeBoardId, boards } = get();
        if (!activeBoardId) return;
        const newId = uuidv4();
        const board = boards.find(b => b.id === activeBoardId);
        const order = board?.columns.length || 0;
        const newCol = { id: newId, title, type, width: 150, order, options: [] };

        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: [...b.columns, newCol] } : b)
        }));
        await supabase.from('columns').insert({ id: newId, board_id: activeBoardId, title, type, order });
    },
    deleteColumn: async (columnId) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({ boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: b.columns.filter(c => c.id !== columnId) } : b) }));
        await supabase.from('columns').delete().eq('id', columnId);
    },
    updateColumnTitle: async (columnId, newTitle) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({ boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, title: newTitle } : c) } : b) }));
        await supabase.from('columns').update({ title: newTitle }).eq('id', columnId);
    },
    updateColumnWidth: (columnId, width) => {
        // Optimistic only for now
        const { activeBoardId } = get();
        set(state => ({ boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, width } : c) } : b) }));
    },
    moveColumn: async (fromIndex, toIndex) => {
        const { activeBoardId, boards } = get();
        if (!activeBoardId) return;

        const board = boards.find(b => b.id === activeBoardId);
        if (!board) return;

        const newColumns = arrayMove(board.columns, fromIndex, toIndex);

        // Optimistic Update
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: newColumns } : b)
        }));

        // Persist Orders via RPC
        const columnIds = newColumns.map(c => c.id);
        await supabase.rpc('reorder_columns', {
            _board_id: activeBoardId,
            _column_ids: columnIds
        });
    },
    duplicateColumn: (_columnId) => { /* TODO */ },
    setColumnAggregation: (columnId, type) => {
        const { activeBoardId } = get();
        set(state => ({ boards: state.boards.map(b => b.id === activeBoardId ? { ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, aggregation: type } : c) } : b) }));
        // Should sync
    },
    addColumnOption: async (columnId, label, color) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        let finalOptions: any[] = [];

        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;
                return {
                    ...b,
                    columns: b.columns.map(c => {
                        if (c.id !== columnId) return c;
                        const safeOptions = Array.isArray(c.options) ? c.options : [];
                        finalOptions = [...safeOptions, { id: uuidv4(), label, color }];
                        return { ...c, options: finalOptions };
                    })
                };
            })
        }));

        if (finalOptions.length > 0) {
            await supabase.from('columns').update({ options: finalOptions }).eq('id', columnId);
        }
    },
    updateColumnOption: async (columnId, optionId, updates) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        let finalOptions: any[] = [];

        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;
                return {
                    ...b,
                    columns: b.columns.map(c => {
                        if (c.id !== columnId) return c;
                        const safeOptions = Array.isArray(c.options) ? c.options : [];
                        finalOptions = safeOptions.map(o => o.id === optionId ? { ...o, ...updates } : o);
                        return { ...c, options: finalOptions };
                    })
                };
            })
        }));

        if (finalOptions.length > 0) {
            await supabase.from('columns').update({ options: finalOptions }).eq('id', columnId);
        }
    },
    deleteColumnOption: async (columnId, optionId) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        let finalOptions: any[] = [];

        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;
                return {
                    ...b,
                    columns: b.columns.map(c => {
                        if (c.id !== columnId) return c;
                        const safeOptions = Array.isArray(c.options) ? c.options : [];
                        finalOptions = safeOptions.filter(o => o.id !== optionId);
                        return { ...c, options: finalOptions };
                    })
                };
            })
        }));

        // Allow empty array update
        await supabase.from('columns').update({ options: finalOptions }).eq('id', columnId);
    },

    // --- Item Actions ---
    addItem: async (title, groupId) => {
        const { activeBoardId, boards } = get();
        if (!activeBoardId) return;

        const newItemId = uuidv4();
        const currentBoard = boards.find(b => b.id === activeBoardId);

        if (!currentBoard) return;

        if (!currentBoard) return;


        const values: ItemValue = {};


        // Populate Default Values (Safeguarded)
        if (currentBoard.columns && Array.isArray(currentBoard.columns)) {
            currentBoard.columns.forEach(col => {
                try {
                    if (col.type === 'status') {
                        const options = Array.isArray(col.options) ? col.options : [];
                        // Priority: To Do -> New -> Working on it -> Last Option (usually Gray/Default)
                        const defaultOpt = options.find(o => o.label === 'To Do')
                            || options.find(o => o.label === 'New')
                            || options.find(o => o.label.includes('Working'))
                            || options[options.length - 1];

                        if (defaultOpt) {
                            values[col.id] = defaultOpt.label;
                        }
                    }
                } catch (err) {
                    // Ignore
                }
            });
        }

        const newItem: Item = { id: newItemId, title, groupId, boardId: activeBoardId, values, updates: [] };

        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;
                return {
                    ...b,
                    items: [...b.items, newItem],
                    groups: b.groups.map(g => g.id === groupId ? { ...g, items: [...g.items, newItem] } : g)
                };
            })
        }));

        try {
            const { error } = await supabase.from('items').insert({ id: newItemId, board_id: activeBoardId, group_id: groupId, title, values, order: currentBoard.items.length });
            if (error) {
                console.error("FAILED TO ADD ITEM:", error);
                // Revert optimistic update?
                // For now, just log it so we can see it in QA
                set({ error: error.message });
            }
        } catch (err) {
            console.error("EXCEPTION ADDING ITEM:", err);
        }
    },
    updateItemValue: async (itemId, columnId, value) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;
                const update = (i: Item) => i.id === itemId ? { ...i, values: { ...i.values, [columnId]: value } } : i;
                return { ...b, items: b.items.map(update), groups: b.groups.map(g => ({ ...g, items: g.items.map(update) })) };
            })
        }));
        // Fetch fresh state to get full values
        const item = get().boards.find(b => b.id === activeBoardId)?.items.find(i => i.id === itemId);
        if (item) {
            const { error } = await supabase.from('items').update({ values: item.values }).eq('id', itemId);
            if (error) console.error('[updateItemValue] Failed to update item:', error);
        }
    },
    updateItemTitle: async (itemId, newTitle) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? {
                ...b,
                items: b.items.map(i => i.id === itemId ? { ...i, title: newTitle } : i),
                groups: b.groups.map(g => ({ ...g, items: g.items.map(i => i.id === itemId ? { ...i, title: newTitle } : i) }))
            } : b)
        }));
        const { error } = await supabase.from('items').update({ title: newTitle }).eq('id', itemId);
        if (error) console.error('[updateItemTitle] Failed to update title:', error);
    },
    deleteItem: async (itemId) => {
        const { activeBoardId } = get();
        if (!activeBoardId) return;
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? {
                ...b,
                items: b.items.filter(i => i.id !== itemId),
                groups: b.groups.map(g => ({ ...g, items: g.items.filter(i => i.id !== itemId) }))
            } : b)
        }));
        await supabase.from('items').delete().eq('id', itemId);
    },
    moveItem: async (activeId, overId) => {
        const { activeBoardId, boards } = get();

        if (!activeBoardId || activeId === overId) {
            console.log('[DEBUG] moveItem early exit:', { activeBoardId, activeId, overId });
            return;
        }

        const board = boards.find(b => b.id === activeBoardId);
        if (!board) return;

        console.log('[DEBUG] moveItem called:', { activeId, overId });

        const activeItem = board.items.find(i => i.id === activeId);
        if (!activeItem) {
            console.error('[DEBUG] moveItem failed: activeItem not found');
            return;
        }

        // Check if dropping onto a Group ID (handling suffixes from virtual list)
        // Virtual items might have IDs like "group-header" or "group-footer"
        const normalizedOverId = overId.replace(/-header$/, '').replace(/-footer$/, '');
        const overGroup = board.groups.find(g => g.id === normalizedOverId);

        console.log('[DEBUG] moveItem resolved:', { normalizedOverId, foundGroup: !!overGroup });

        let newItems = [...board.items];
        let newGroupId = activeItem.groupId;

        if (overGroup) {
            // Case 1: Dropped onto a Group Header/Footer/Title
            newGroupId = overGroup.id;

            // Remove active item from current position
            const activeIndex = newItems.findIndex(i => i.id === activeId);
            if (activeIndex !== -1) {
                newItems.splice(activeIndex, 1);
            }

            // Find insertion point: The first item of the target group
            // We want to insert at the TOP of the target group
            const firstItemInGroupIndex = newItems.findIndex(i => i.groupId === newGroupId);

            const movedItem = { ...activeItem, groupId: newGroupId };

            if (firstItemInGroupIndex !== -1) {
                newItems.splice(firstItemInGroupIndex, 0, movedItem);
            } else {
                // Group is empty, append to end of list
                newItems.push(movedItem);
            }

        } else {
            // Case 2: Dropped onto another Item
            const overItem = board.items.find(i => i.id === overId);
            if (!overItem) return;

            if (activeItem.groupId === overItem.groupId) {
                // Same Group: Just reorder using arrayMove
                const activeIndex = board.items.findIndex(i => i.id === activeId);
                const overIndex = board.items.findIndex(i => i.id === overId);
                newItems = arrayMove(newItems, activeIndex, overIndex);
            } else {
                // Different Group: Move to new group
                newGroupId = overItem.groupId;

                // Remove active item from array
                newItems = newItems.filter(i => i.id !== activeId);

                // Find where to insert in the new group
                // We want to insert it right before the overItem
                const overIndexInNewArray = newItems.findIndex(i => i.id === overId);

                // Create moved item with new group
                const movedItem = { ...activeItem, groupId: newGroupId };

                // Insert at the position of overItem (pushing overItem down)
                newItems.splice(overIndexInNewArray, 0, movedItem);
            }
        }

        // Apply Optimistic Update
        set(state => ({
            boards: state.boards.map(b => {
                if (b.id !== activeBoardId) return b;

                // Re-index ALL items (global order maintenance)
                const updatedItems = newItems.map((item, index) => ({ ...item, order: index }));

                return {
                    ...b,
                    items: updatedItems,
                    groups: b.groups.map(g => ({
                        ...g,
                        items: updatedItems.filter(i => i.groupId === g.id)
                    }))
                };
            })
        }));

        // Persist
        // Persist
        try {
            if (activeItem.groupId !== newGroupId) {
                const { error: groupError } = await supabase.from('items').update({ group_id: newGroupId }).eq('id', activeId);
                if (groupError) console.error('[moveItem] Failed to update group:', groupError);
            }

            const itemIds = newItems.map(i => i.id);
            const { error: reorderError } = await supabase.rpc('reorder_items', {
                _board_id: activeBoardId,
                _item_ids: itemIds
            });
            if (reorderError) console.error('[moveItem] Failed to reorder items:', reorderError);
        } catch (err) {
            console.error('[moveItem] Exception during persistence:', err);
        }
    },

    // --- Selection & Batch ---
    toggleItemSelection: (itemId, selected) => {
        set(state => {
            const current = new Set(state.selectedItemIds);
            if (selected) current.add(itemId); else current.delete(itemId);
            return { selectedItemIds: Array.from(current) };
        });
    },
    selectGroupItems: (groupId) => {
        const { activeBoardId, boards } = get();
        const board = boards.find(b => b.id === activeBoardId);
        if (!board) return;
        const items = board.items.filter(i => i.groupId === groupId);
        set(state => {
            const current = new Set(state.selectedItemIds);
            items.forEach(i => current.add(i.id));
            return { selectedItemIds: Array.from(current) };
        });
    },
    clearSelection: () => set({ selectedItemIds: [] }),
    deleteSelectedItems: async () => {
        const { activeBoardId, selectedItemIds } = get();
        if (!activeBoardId) return;
        // Local
        set(state => ({
            boards: state.boards.map(b => b.id === activeBoardId ? {
                ...b,
                items: b.items.filter(i => !selectedItemIds.includes(i.id)),
                groups: b.groups.map(g => ({ ...g, items: g.items.filter(i => !selectedItemIds.includes(i.id)) }))
            } : b),
            selectedItemIds: []
        }));
        // DB
        await supabase.from('items').delete().in('id', selectedItemIds);
    },
    duplicateSelectedItems: () => { },
    moveSelectedItemsToGroup: () => { },
    hideSelectedItems: () => { },
    unhideSelectedItems: () => { },

    // --- View Options ---
    toggleShowHiddenItems: () => set(state => ({ showHiddenItems: !state.showHiddenItems })),
    setGroupByColumn: (columnId) => set(state => ({ boards: state.boards.map(b => b.id === state.activeBoardId ? { ...b, groupByColumnId: columnId } : b) })),
    updateBoardItemColumnTitle: (_t) => { },
    updateBoardItemColumnWidth: (_w) => { },

    // --- Sort & Filter ---
    setColumnSort: (columnId, direction) => set(state => ({ boards: state.boards.map(b => b.id === state.activeBoardId ? { ...b, sort: direction ? { columnId, direction } : null } : b) })),
    setColumnFilter: (columnId: string, values: string[]) => set(state => ({
        boards: state.boards.map(b => {
            if (b.id !== state.activeBoardId) return b;
            const filters = (b.filters || []).filter(f => f.columnId !== columnId);
            if (values.length) filters.push({ columnId, values });
            return { ...b, filters };
        })
    })),
    clearColumnFilter: (columnId: string) => set(state => ({ boards: state.boards.map(b => b.id === state.activeBoardId ? { ...b, filters: (b.filters || []).filter(f => f.columnId !== columnId) } : b) })),

    // --- Task Updates ---
    addUpdate: (_itemId, _content, _author) => { /* TODO Sync to DB updates column */ },
    deleteUpdate: (_itemId, _updateId) => { },

    subscribeToRealtime: () => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) {
            console.warn('[Realtime] No activeWorkspaceId, skipping subscription.');
            return;
        }

        console.log('[Realtime] Initializing subscription for workspace:', activeWorkspaceId);

        // Clean up existing
        if (get().realtimeSubscription) supabase.removeChannel(get().realtimeSubscription as any);
        // Clear any existing poll
        if ((get() as any).pollingInterval) clearInterval((get() as any).pollingInterval);

        const channel = supabase.channel(`workspace_updates:${activeWorkspaceId}`);

        // Update store with channel ref (if we added state for it) - skipping for now to keep interface clean

        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => get().loadUserData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => get().loadUserData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => get().loadUserData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => get().loadUserData(true))
            .subscribe((status) => {
                console.log('[Realtime] Subscription status:', status);

                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] ✅ Connected to Workspace updates');
                    // Stop polling if we managed to connect
                    if ((get() as any).pollingInterval) {
                        clearInterval((get() as any).pollingInterval);
                        set({ pollingInterval: null } as any);
                    }
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[Realtime] ❌ Connection issue (${status}). Starting Polling Fallback.`);

                    // Start Polling if not already running
                    if (!(get() as any).pollingInterval) {
                        console.log('[Realtime] 🔄 Fallback Polling activated (10s interval)');
                        const interval = setInterval(() => {
                            console.log('[Polling] Fetching latest data...');
                            get().loadUserData(true);
                        }, 10000);

                        // Hacky: Store interval in state (need to add type to interface strictly, but for now runtime works)
                        // Ideally we add `pollingInterval: NodeJS.Timeout | null` to BoardState
                        set({ pollingInterval: interval } as any);
                    }
                }
            });
    },

    unsubscribeFromRealtime: () => {
        supabase.removeAllChannels();
        if ((get() as any).pollingInterval) {
            clearInterval((get() as any).pollingInterval);
            set({ pollingInterval: null } as any);
        }
    },

    // --- Workspace & Board Sharing Actions ---
    inviteToWorkspace: async (workspaceId: string, email: string, role: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find user by email
        const { data: inviteeProfile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', email)
            .single();

        if (!inviteeProfile) {
            alert('User not found with that email');
            return;
        }

        // Get workspace name
        const { workspaces } = get();
        const workspace = workspaces.find(w => w.id === workspaceId);

        // Create notification
        await supabase.from('notifications').insert({
            user_id: inviteeProfile.id,
            type: 'workspace_invite',
            title: `${user.user_metadata?.full_name || user.email} invited you to a workspace`,
            message: `You've been invited to join "${workspace?.title}" as ${role}`,
            data: {
                workspace_id: workspaceId,
                inviter_id: user.id,
                role
            }
        });
    },

    inviteToBoard: async (boardId: string, email: string, role: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find user by email
        const { data: inviteeProfile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', email)
            .single();

        if (!inviteeProfile) {
            alert('User not found with that email');
            return;
        }

        // Get board name
        const { boards } = get();
        const board = boards.find(b => b.id === boardId);

        // Create notification
        await supabase.from('notifications').insert({
            user_id: inviteeProfile.id,
            type: 'board_invite',
            title: `${user.user_metadata?.full_name || user.email} invited you to a board`,
            message: `You've been invited to join "${board?.title}" as ${role}`,
            data: {
                board_id: boardId,
                inviter_id: user.id,
                role
            }
        });
    },

    getWorkspaceMembers: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('workspace_members')
            .select(`
                id,
                role,
                joined_at,
                user_id,
                profiles:user_id (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('workspace_id', workspaceId);

        if (error) {
            console.error('Error fetching workspace members:', error);
            return [];
        }

        return data || [];
    },

    getBoardMembers: async (boardId: string) => {
        const { data, error } = await supabase
            .from('board_members')
            .select(`
                id,
                role,
                joined_at,
                user_id,
                profiles:user_id (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('board_id', boardId);

        if (error) {
            console.error('Error fetching board members:', error);
            return [];
        }

        // Update activeBoardMembers if this is the active board
        if (get().activeBoardId === boardId) {
            set({ activeBoardMembers: data || [] });
        }

        return data || [];
    },

    updateMemberRole: async (memberId: string, newRole: string, type: 'workspace' | 'board') => {
        const table = type === 'workspace' ? 'workspace_members' : 'board_members';

        const { error } = await supabase
            .from(table)
            .update({ role: newRole })
            .eq('id', memberId);

        if (error) {
            console.error('Error updating member role:', error);

        }
    },

    removeMember: async (memberId: string, type: 'workspace' | 'board') => {
        const table = type === 'workspace' ? 'workspace_members' : 'board_members';

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', memberId);

        if (error) {
            console.error('Error removing member:', error);

        }
    },

    // --- Phase 3: Person Picker Actions ---
    searchUsers: async (query) => {
        if (!query) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error('searchUsers error:', error);
            return [];
        }
        return data || [];
    },

    createNotification: async (userId, type, content, entityId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('notifications').insert({
            user_id: userId,
            actor_id: user.id,
            type,
            content,
            entity_id: entityId
        });
    },

    inviteAndAssignUser: async (boardId, userId, role, itemId, columnId) => {
        const { activeBoardMembers } = get();
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        // 1. Check if Member (optimistic check from store)
        const isMember = activeBoardMembers.some(m => m.user_id === userId);

        if (!isMember) {
            // Invite First
            console.log(`[Inviting] User ${userId} to board ${boardId} as ${role}`);
            const { error: inviteError } = await supabase.from('board_members').insert({
                board_id: boardId,
                user_id: userId,
                role
            });

            if (inviteError) {
                console.error('Failed to invite user:', inviteError);
                throw new Error('Failed to invite user');
            }

            // Update local members cache immediately
            get().getBoardMembers(boardId).then(members => set({ activeBoardMembers: members }));
        }

        // 2. Assign Value
        get().updateItemValue(itemId, columnId, userId);

        // 3. Notify
        const board = get().boards.find(b => b.id === boardId);
        const boardTitle = board?.title || 'the board';

        await get().createNotification(
            userId,
            'assignment',
            `${currentUser?.user_metadata?.full_name || 'Someone'} assigned you to an item in ${boardTitle}`,
            itemId
        );
    }
}));


