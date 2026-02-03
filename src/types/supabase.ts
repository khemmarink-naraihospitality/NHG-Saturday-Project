// =====================================================
// Supabase Database Types
// =====================================================
// Purpose: Type-safe definitions for Supabase database schema
// Auto-generated types should be replaced with actual Supabase CLI output
// For now, we define them manually based on the schema
// =====================================================

import type { User } from '@supabase/supabase-js';

// =====================================================
// Database Tables
// =====================================================

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: ProfileRow;
                Insert: ProfileInsert;
                Update: ProfileUpdate;
            };
            workspaces: {
                Row: WorkspaceRow;
                Insert: WorkspaceInsert;
                Update: WorkspaceUpdate;
            };
            boards: {
                Row: BoardRow;
                Insert: BoardInsert;
                Update: BoardUpdate;
            };
            items: {
                Row: ItemRow;
                Insert: ItemInsert;
                Update: ItemUpdate;
            };
            activity_logs: {
                Row: ActivityLogRow;
                Insert: ActivityLogInsert;
                Update: ActivityLogUpdate;
            };
            notifications: {
                Row: NotificationRow;
                Insert: NotificationInsert;
                Update: NotificationUpdate;
            };
        };
        Functions: {
            log_activity: {
                Args: {
                    p_action_type: string;
                    p_target_type?: string;
                    p_target_id?: string;
                    p_metadata?: Record<string, unknown>;
                };
                Returns: string; // UUID
            };
            delete_user: {
                Args: {
                    user_id: string;
                };
                Returns: {
                    success: boolean;
                    message?: string;
                    error?: string;
                };
            };
        };
    };
}

// =====================================================
// Profile Types
// =====================================================

export type SystemRole = 'user' | 'it_admin' | 'super_admin';

export interface ProfileRow {
    id: string;
    email: string;
    full_name: string;
    system_role: SystemRole;
    created_at: string;
    avatar_url?: string;
}

export type ProfileInsert = Omit<ProfileRow, 'created_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;

// =====================================================
// Workspace Types
// =====================================================

export interface WorkspaceRow {
    id: string;
    title: string;
    owner_id: string;
    order: number;
    created_at: string;
    updated_at: string;
}

export type WorkspaceInsert = Omit<WorkspaceRow, 'id' | 'created_at' | 'updated_at'>;
export type WorkspaceUpdate = Partial<WorkspaceInsert>;

// =====================================================
// Board Types
// =====================================================

export interface BoardRow {
    id: string;
    workspace_id: string;
    title: string;
    columns: BoardColumn[];
    groups: BoardGroup[];
    created_at: string;
    updated_at: string;
}

export interface BoardColumn {
    id: string;
    title: string;
    type: 'text' | 'status' | 'date' | 'number' | 'dropdown' | 'checkbox' | 'link' | 'people';
    options?: Array<{ id: string; label: string; color: string }>;
    width?: number;
    order: number;
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
}

export interface BoardGroup {
    id: string;
    title: string;
    color: string;
}

export type BoardInsert = Omit<BoardRow, 'id' | 'created_at' | 'updated_at'>;
export type BoardUpdate = Partial<BoardInsert>;

// =====================================================
// Item Types
// =====================================================

export interface ItemRow {
    id: string;
    board_id: string;
    group_id: string;
    title: string;
    values: Record<string, unknown>;
    order: number;
    created_at: string;
    updated_at: string;
}

export type ItemInsert = Omit<ItemRow, 'id' | 'created_at' | 'updated_at'>;
export type ItemUpdate = Partial<ItemInsert>;

// =====================================================
// Activity Log Types
// =====================================================

export type ActivityAction =
    | 'user_signup'
    | 'user_deleted'
    | 'role_updated'
    | 'workspace_created'
    | 'board_created'
    | 'item_created'
    | 'item_updated'
    | 'item_deleted';

export interface ActivityLogRow {
    id: string;
    created_at: string;
    actor_id: string | null;
    action_type: ActivityAction;
    target_type: string | null;
    target_id: string | null;
    metadata: Record<string, unknown>;
}

export type ActivityLogInsert = Omit<ActivityLogRow, 'id' | 'created_at'>;
export type ActivityLogUpdate = Partial<ActivityLogInsert>;

// =====================================================
// Notification Types
// =====================================================

export type NotificationType = 'mention' | 'assignment' | 'access_granted' | 'workspace_invite' | 'board_invite';

export interface NotificationRow {
    id: string;
    user_id: string;
    actor_id: string | null;
    type: NotificationType;
    content: string | null;
    entity_id: string | null;
    is_read: boolean;
    created_at: string;
}

export type NotificationInsert = Omit<NotificationRow, 'id' | 'created_at'>;
export type NotificationUpdate = Partial<NotificationInsert>;

// =====================================================
// Query Response Types
// =====================================================

export interface ProfileWithRelations extends ProfileRow {
    // Add relations if needed
}

export interface WorkspaceWithRelations extends WorkspaceRow {
    profiles?: ProfileRow;
    boards?: BoardRow[];
}

export interface BoardWithRelations extends BoardRow {
    workspaces?: WorkspaceRow;
    items?: ItemRow[];
}

export interface ActivityLogWithProfile extends ActivityLogRow {
    profiles?: ProfileRow;
}

// =====================================================
// Helper Types
// =====================================================

export type SupabaseUser = User;

export interface SupabaseError {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
}

export interface SupabaseResponse<T> {
    data: T | null;
    error: SupabaseError | null;
}
