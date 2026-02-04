import { LayoutDashboard, Plus, Trash2, Home, ChevronDown, Search, LayoutGrid, MoreHorizontal, Edit2, Copy, GripVertical, ChevronRight, Users } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';
import { useUserStore } from '../../store/useUserStore';

import { usePermission } from '../../hooks/usePermission';
// import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ShareWorkspaceModal } from '../workspace/ShareWorkspaceModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableBoardItem = ({
    board,
    activeBoardId,
    setActiveBoard,
    editingBoardId,
    setEditingBoardId,
    editTitle,
    setEditTitle,
    handleRename,
    handleContextMenu,
    can
}: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: board.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as 'relative',
        zIndex: isDragging ? 999 : 'auto'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx('sidebar-item', { active: activeBoardId === board.id })}
            onClick={() => setActiveBoard(board.id)}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (can('create_board')) {
                    setEditingBoardId(board.id);
                    setEditTitle(board.title);
                }
            }}
        >
            <div
                {...attributes}
                {...listeners}
                style={{ marginRight: '8px', cursor: 'grab', color: '#ccc', display: 'flex', alignItems: 'center', outline: 'none' }}
                onClick={(e) => e.stopPropagation()} // Prevent setting active board when clicking handle? Maybe okay.
            >
                <GripVertical size={14} />
            </div>

            <LayoutDashboard size={16} />
            {
                editingBoardId === board.id ? (
                    <input
                        autoFocus
                        type="text"
                        className="sidebar-item-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRename(board.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(board.id);
                            if (e.key === 'Escape') setEditingBoardId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="sidebar-item-label">{board.title}</span>
                )
            }

            {/* Board 3-Dot Menu */}
            <div className="sidebar-item-action" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal
                    size={16}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleContextMenu(e, board.id, rect);
                    }}
                />
            </div>
        </div >
    );
};

export const Sidebar = () => {
    const {
        boards, activeBoardId, addBoard, setActiveBoard, deleteBoard, updateBoardTitle, moveBoard, duplicateBoardToWorkspace, moveBoardToWorkspace,
        workspaces, activeWorkspaceId, setActiveWorkspace, addWorkspace, deleteWorkspace, duplicateWorkspace, renameWorkspace, sharedBoardIds, navigateTo
    } = useBoardStore();

    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [newWorkspaceTitle, setNewWorkspaceTitle] = useState('');

    // Deletion State
    const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
    const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);

    // Renaming State
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Workspace Renaming
    const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
    const [editWorkspaceTitle, setEditWorkspaceTitle] = useState('');

    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

    // Context Menus
    const [activeBoardMenu, setActiveBoardMenu] = useState<string | null>(null);
    const [activeWorkspaceMenu, setActiveWorkspaceMenu] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [activeSubmenu, setActiveSubmenu] = useState<'move' | 'duplicate' | null>(null);

    // Tab state: 'my-workspaces' | 'shared'
    const [activeTab, setActiveTab] = useState<'my-workspaces' | 'shared'>('my-workspaces');

    // Share workspace modal
    const [shareWorkspaceId, setShareWorkspaceId] = useState<string | null>(null);


    // Permission Debug
    const { currentUser } = useUserStore();
    const { can } = usePermission();
    // const { user } = useAuth(); // useAuth provides Supabase user, not our App user with system_role

    // Use currentUser from store which has system_role
    const user = currentUser;

    // Filter workspaces based on active tab
    const filteredWorkspaces = activeTab === 'my-workspaces'
        ? workspaces.filter(w => w.owner_id === user?.id)
        : workspaces.filter(w => w.owner_id !== user?.id);

    const activeWorkspace = filteredWorkspaces.find(w => w.id === activeWorkspaceId) || filteredWorkspaces[0];

    // Filter boards based on Tab
    const filteredBoards = activeTab === 'shared'
        ? boards.filter(b => {
            const isShared = sharedBoardIds.includes(b.id);
            const workspace = workspaces.find(w => w.id === b.workspaceId);
            // Show in Shared ONLY if I am NOT the workspace owner (avoid duplication)
            return isShared && workspace?.owner_id !== user?.id;
        })
        : boards.filter(b => b.workspaceId === activeWorkspace?.id); // Safe check activeWorkspace existence

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveBoardMenu(null);
            setActiveWorkspaceMenu(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);



    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newWorkspaceTitle.trim() && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await addWorkspace(newWorkspaceTitle);
                setNewWorkspaceTitle('');
                setIsCreatingWorkspace(false);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleRename = (boardId: string) => {
        if (editTitle.trim()) {
            updateBoardTitle(boardId, editTitle);
        }
        setEditingBoardId(null);
    };

    const handleRenameWorkspace = (workspaceId: string) => {
        if (editWorkspaceTitle.trim()) {
            renameWorkspace(workspaceId, editWorkspaceTitle);
        }
        setEditingWorkspaceId(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            moveBoard(active.id as string, over.id as string);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header" style={{ padding: '0 16px', marginBottom: '12px', width: '100%', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div
                    onClick={() => navigateTo('home')}
                    style={{
                        marginBottom: '16px',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #0073ea 0%, #00c875 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        <LayoutGrid size={20} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#323338', letterSpacing: '-0.5px' }}>NHG Saturday.com</span>
                </div>



                {/* Admin Link (Only for System Admins) */}
                {(user?.system_role === 'super_admin' || user?.system_role === 'it_admin') && (
                    <div style={{ padding: '0 4px', marginBottom: '8px' }}>
                        <button
                            onClick={() => navigateTo('admin')}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #6366f1',
                                borderRadius: '4px',
                                backgroundColor: '#e0e7ff',
                                color: '#4338ca',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(99, 102, 241, 0.1)'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            <span>Admin Console</span>
                        </button>
                    </div>
                )}

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '4px',
                    backgroundColor: '#f6f7fb',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    width: '100%'
                }}>
                    <button
                        onClick={() => setActiveTab('my-workspaces')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: activeTab === 'my-workspaces' ? 'white' : 'transparent',
                            color: activeTab === 'my-workspaces' ? '#323338' : '#676879',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'my-workspaces' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        My Workspaces
                    </button>
                    <button
                        onClick={() => setActiveTab('shared')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: activeTab === 'shared' ? 'white' : 'transparent',
                            color: activeTab === 'shared' ? '#323338' : '#676879',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'shared' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Users size={14} />
                        <span>Shared</span>
                    </button>
                </div>

                {/* Workspace Selector - Always Show */}
                <div style={{ display: 'flex', gap: '8px', position: 'relative', width: '100%' }}>
                    <div
                        className="workspace-switcher-trigger"
                        onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            border: '1px solid #c3c6d4',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            position: 'relative',
                            minWidth: 0
                        }}
                    >
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            backgroundColor: activeTab === 'shared' ? '#6b7280' : '#579bfc',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 600,
                            position: 'relative',
                            flexShrink: 0
                        }}>
                            {activeTab === 'shared' ? <Users size={14} /> : activeWorkspace?.title.charAt(0).toUpperCase()}
                            <div style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                backgroundColor: '#323338',
                                borderRadius: '50%',
                                padding: '2px',
                                display: 'flex'
                            }}>
                                <Home size={8} color="white" />
                            </div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#323338', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeTab === 'shared' ? 'Shared with me' : (activeWorkspace?.title || 'Loading...')}
                        </span>
                        <ChevronDown size={16} color="#676879" style={{ flexShrink: 0 }} />
                    </div>

                    <button
                        className="workspace-add-btn"
                        style={{
                            width: '38px',
                            height: '38px',
                            backgroundColor: '#0073ea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                        onClick={() => setIsCreating(true)}
                        title="Create New Board"
                    >
                        <Plus size={24} />
                    </button>
                    {isWorkspaceDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            width: '300px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                            border: '1px solid #e6e9ef',
                            zIndex: 1000,
                            marginTop: '8px',
                            padding: '16px'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#676879' }} />
                                <input
                                    type="text"
                                    placeholder="Search for a workspace"
                                    style={{
                                        width: '100%',
                                        padding: '8px 8px 8px 30px',
                                        borderRadius: '4px',
                                        border: '1px solid #c3c6d4', // Lighter border
                                        backgroundColor: 'white', // Explicit white bg
                                        fontSize: '13px',
                                        outline: 'none',
                                        color: '#323338'
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#676879' }}>
                                {activeTab === 'shared' ? 'Shared with me' : 'My workspaces'}
                            </div>

                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredWorkspaces.map(ws => (
                                    <div
                                        key={ws.id}
                                        onClick={() => {
                                            setActiveWorkspace(ws.id);
                                            setIsWorkspaceDropdownOpen(false);
                                        }}
                                        className="workspace-item-row"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '8px',
                                            backgroundColor: ws.id === activeWorkspaceId ? '#e5f4ff' : 'transparent',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginBottom: '4px',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ws.id === activeWorkspaceId ? '#e5f4ff' : '#f5f6f8'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ws.id === activeWorkspaceId ? '#e5f4ff' : 'transparent'}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            backgroundColor: '#579bfc',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            flexShrink: 0
                                        }}>
                                            {ws.title.charAt(0).toUpperCase()}
                                        </div>

                                        {editingWorkspaceId === ws.id ? (
                                            <input
                                                autoFocus
                                                value={editWorkspaceTitle}
                                                onChange={(e) => setEditWorkspaceTitle(e.target.value)}
                                                onBlur={() => handleRenameWorkspace(ws.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameWorkspace(ws.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                                            />
                                        ) : (
                                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '14px', color: '#323338', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.title}</span>
                                                {ws.owner_id !== user?.id && (
                                                    <span style={{ fontSize: '10px', backgroundColor: '#e6f4ff', color: '#0073ea', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>Shared</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Workspace Menu Trigger */}
                                        <div className="workspace-actions" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal
                                                size={16}
                                                className="action-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setMenuPosition({ top: rect.bottom, left: rect.left });
                                                    setActiveWorkspaceMenu(activeWorkspaceMenu === ws.id ? null : ws.id);
                                                    setActiveBoardMenu(null);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Fixed Position Workspace Menu */}
                            {activeWorkspaceMenu && (
                                <div
                                    className="context-menu"
                                    style={{
                                        position: 'fixed',
                                        top: menuPosition.top,
                                        left: menuPosition.left,
                                        backgroundColor: 'white',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        borderRadius: '4px',
                                        padding: '4px',
                                        zIndex: 9999, // Ensure it's on top of everything
                                        width: '160px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {workspaces.find(w => w.id === activeWorkspaceMenu)?.owner_id === user?.id && (
                                        <div className="menu-item" onClick={() => {
                                            setShareWorkspaceId(activeWorkspaceMenu);
                                            setActiveWorkspaceMenu(null);
                                        }}>
                                            <Users size={14} /> Share
                                        </div>
                                    )}
                                    <div className="menu-item" onClick={() => {
                                        const ws = workspaces.find(w => w.id === activeWorkspaceMenu);
                                        if (ws) {
                                            setEditingWorkspaceId(ws.id);
                                            setEditWorkspaceTitle(ws.title);
                                        }
                                        setActiveWorkspaceMenu(null);
                                    }}>
                                        <Edit2 size={14} /> Rename
                                    </div>
                                    <div className="menu-item" onClick={() => {
                                        duplicateWorkspace(activeWorkspaceMenu);
                                        setActiveWorkspaceMenu(null);
                                    }}>
                                        <Copy size={14} /> Duplicate
                                    </div>
                                    <div className="menu-item delete" onClick={() => {
                                        setWorkspaceToDelete(activeWorkspaceMenu);
                                        setActiveWorkspaceMenu(null);
                                    }}>
                                        <Trash2 size={14} /> Delete
                                    </div>
                                </div>
                            )}

                            {activeTab !== 'shared' && (
                                <div style={{ borderTop: '1px solid #e6e9ef', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#323338', fontSize: '14px' }}
                                        onClick={() => {
                                            setIsCreatingWorkspace(true);
                                            setIsWorkspaceDropdownOpen(false);
                                        }}
                                    >
                                        <Plus size={16} /> Add workspace
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                {/* Workspace Creation Modal */}
                {isCreatingWorkspace && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000
                    }} onClick={() => setIsCreatingWorkspace(false)}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '8px',
                            width: '320px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Create Workspace</h3>
                            <form onSubmit={handleCreateWorkspace}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Workspace Name (e.g. Marketing)"
                                    value={newWorkspaceTitle}
                                    onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        marginBottom: '16px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingWorkspace(false)}
                                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '6px 12px',
                                            background: isSubmitting ? '#ccc' : '#0073ea',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <div className="sidebar-content">
                {isCreating && (
                    <div className="sidebar-item" style={{ paddingLeft: '12px', cursor: 'default' }}>
                        <div style={{ width: '22px' }} /> {/* Spacer for alignment with GripVertical */}
                        <LayoutDashboard size={16} color="#0073ea" />
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (newBoardTitle.trim()) {
                                    addBoard(newBoardTitle);
                                    setNewBoardTitle('');
                                    setIsCreating(false);
                                }
                            }}
                            style={{ flex: 1, display: 'flex' }}
                        >
                            <input
                                autoFocus
                                type="text"
                                placeholder="New Board"
                                className="sidebar-item-input"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                onBlur={() => {
                                    if (newBoardTitle.trim()) {
                                        addBoard(newBoardTitle);
                                        setNewBoardTitle('');
                                    }
                                    setIsCreating(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                        </form>
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredBoards.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {filteredBoards.map((board) => (
                            <SortableBoardItem
                                key={board.id}
                                board={board}
                                activeBoardId={activeBoardId}
                                setActiveBoard={setActiveBoard}
                                editingBoardId={editingBoardId}
                                setEditingBoardId={setEditingBoardId}
                                editTitle={editTitle}
                                setEditTitle={setEditTitle}
                                handleRename={handleRename}
                                handleContextMenu={(e: any, id: string, rect: DOMRect) => {
                                    e.stopPropagation();
                                    setMenuPosition({ top: rect.bottom, left: rect.left });
                                    setActiveBoardMenu(activeBoardMenu === id ? null : id);
                                    setActiveWorkspaceMenu(null);
                                }}
                                can={can}
                                setBoardToDelete={setBoardToDelete}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {filteredBoards.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#676879', fontSize: '13px' }}>
                        {activeTab === 'shared' ? 'No boards shared yet' : 'No boards found'}
                    </div>
                )}

                {/* Draw Board Context Menu Outside of SortableItem to avoid transform issues */}
                {activeBoardMenu && (
                    <div className="context-menu" style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '4px',
                        padding: '4px',
                        zIndex: 9999,
                        width: '200px'
                    }} onClick={(e) => e.stopPropagation()}
                        onMouseLeave={() => setActiveSubmenu(null)}
                    >
                        <div className="menu-item" onClick={() => {
                            const b = boards.find(b => b.id === activeBoardMenu);
                            if (b) {
                                setEditingBoardId(b.id);
                                setEditTitle(b.title);
                            }
                            setActiveBoardMenu(null);
                        }} onMouseEnter={() => setActiveSubmenu(null)}>
                            <Edit2 size={14} /> Rename
                        </div>

                        {/* Move To Submenu Trigger */}
                        <div
                            className="menu-item"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}
                            onMouseEnter={() => setActiveSubmenu('move')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LayoutDashboard size={14} /> Move to
                            </div>
                            <ChevronRight size={14} />

                            {/* Submenu List */}
                            {activeSubmenu === 'move' && (
                                <div style={{
                                    position: 'absolute',
                                    left: '100%',
                                    top: 0,
                                    width: '180px',
                                    backgroundColor: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    marginLeft: '4px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {workspaces.map(ws => (
                                        <div
                                            key={ws.id}
                                            className="menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveBoardToWorkspace(activeBoardMenu, ws.id);
                                                setActiveBoardMenu(null);
                                                setActiveSubmenu(null);
                                            }}
                                        >
                                            {ws.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Duplicate To Submenu Trigger */}
                        <div
                            className="menu-item"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}
                            onMouseEnter={() => setActiveSubmenu('duplicate')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Copy size={14} /> Duplicate to
                            </div>
                            <ChevronRight size={14} />

                            {/* Submenu List */}
                            {activeSubmenu === 'duplicate' && (
                                <div style={{
                                    position: 'absolute',
                                    left: '100%',
                                    top: 0,
                                    width: '180px',
                                    backgroundColor: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    marginLeft: '4px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {workspaces.map(ws => (
                                        <div
                                            key={ws.id}
                                            className="menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                duplicateBoardToWorkspace(activeBoardMenu, ws.id);
                                                setActiveBoardMenu(null);
                                                setActiveSubmenu(null);
                                            }}
                                        >
                                            {ws.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>



                        <div className="menu-item delete" onClick={() => {
                            setBoardToDelete(activeBoardMenu);
                            setActiveBoardMenu(null);
                        }} onMouseEnter={() => setActiveSubmenu(null)}>
                            <Trash2 size={14} /> Delete
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Modal for Board Deletion */}
            <ConfirmModal
                isOpen={!!boardToDelete}
                title="Delete Board"
                message="Are you sure you want to delete this board? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    if (boardToDelete) deleteBoard(boardToDelete);
                    setBoardToDelete(null);
                }}
                onCancel={() => setBoardToDelete(null)}
            />

            {/* Confirm Modal for Workspace Deletion */}
            <ConfirmModal
                isOpen={!!workspaceToDelete}
                title="Delete Workspace"
                message="Are you sure you want to delete this workspace? All boards inside it will be deleted! This action cannot be undone."
                confirmText="Delete Workspace"
                variant="danger"
                onConfirm={() => {
                    if (workspaceToDelete) deleteWorkspace(workspaceToDelete);
                    setWorkspaceToDelete(null);
                }}
                onCancel={() => setWorkspaceToDelete(null)}
            />

            {/* Debug Role Switcher - HIDDEN as per user request (Owner/Admin is default) */}
            {/* <div style={{
                marginTop: 'auto',
                padding: '16px',
                borderTop: '1px solid hsl(var(--color-border))',
                fontSize: '12px',
                color: 'hsl(var(--color-text-secondary))'
            }}>
                <div style={{ marginBottom: '8px', fontWeight: 500 }}>DEBUG: Current Role</div>
                <select
                    value={currentUser.role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{
                        width: '100%',
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid hsl(var(--color-border))'
                    }}
                >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                </select>
            </div> */}

            <style>{`
                .workspace-item-row:hover .action-icon {
                    opacity: 1;
                }
                .action-icon {
                    opacity: 0;
                    margin-left: auto;
                    color: #676879;
                    border-radius: 4px;
                    padding: 2px;
                }
                .action-icon:hover {
                    background-color: rgba(0,0,0,0.05);
                    color: #323338;
                }
                .context-menu {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                }
                .menu-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #323338;
                    border-radius: 4px;
                }
                .menu-item:hover {
                    background-color: #f5f6f8;
                }
                .menu-item.delete {
                    color: #e2445c;
                }
                .menu-item.delete:hover {
                    background-color: #fff0f0;
                }
            `}</style>

            {/* Share Workspace Modal */}
            {shareWorkspaceId && (
                <ShareWorkspaceModal
                    workspaceId={shareWorkspaceId}
                    onClose={() => setShareWorkspaceId(null)}
                />
            )}
        </aside>
    );
};
