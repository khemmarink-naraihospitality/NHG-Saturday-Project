// =====================================================
// Supabase Query Helper Types
// =====================================================
// Purpose: Type-safe helpers for Supabase queries
// Reduces the need for 'any' types in store files
// =====================================================

import type { PostgrestError } from '@supabase/supabase-js';
import type {
    ProfileRow,
    WorkspaceRow,
    BoardRow,
    ItemRow,
    ActivityLogRow,
    NotificationRow,
} from './supabase';

// =====================================================
// Generic Supabase Response Types
// =====================================================

export interface SupabaseQueryResult<T> {
    data: T | null;
    error: PostgrestError | null;
}

export type SupabaseQueryData<T> = T extends { data: infer D } ? D : never;

// =====================================================
// Specific Query Response Types
// =====================================================

// Profile queries
export type ProfileQueryResult = SupabaseQueryResult<ProfileRow[]>;
export type SingleProfileQueryResult = SupabaseQueryResult<ProfileRow>;

// Workspace queries with joins
export interface WorkspaceWithOwner extends WorkspaceRow {
    profiles?: Pick<ProfileRow, 'full_name' | 'email'>;
}

export type WorkspaceQueryResult = SupabaseQueryResult<WorkspaceWithOwner[]>;

// Board queries with joins
export interface BoardWithWorkspace extends BoardRow {
    workspaces?: Pick<WorkspaceRow, 'title' | 'owner_id'> & {
        profiles?: Pick<ProfileRow, 'full_name' | 'email'>;
    };
}

export type BoardQueryResult = SupabaseQueryResult<BoardWithWorkspace[]>;

// Item queries
export type ItemQueryResult = SupabaseQueryResult<ItemRow[]>;

// Activity log queries with joins
export interface ActivityLogWithActor extends ActivityLogRow {
    profiles?: Pick<ProfileRow, 'full_name' | 'email'> | null;
}

export type ActivityLogQueryResult = SupabaseQueryResult<ActivityLogWithActor[]>;

// Notification queries
export type NotificationQueryResult = SupabaseQueryResult<NotificationRow[]>;

// =====================================================
// RPC Function Response Types
// =====================================================

export interface DeleteUserResponse {
    success: boolean;
    message?: string;
    error?: string;
    deleted_user?: {
        id: string;
        email: string;
        name: string;
    };
}

export interface LogActivityResponse {
    id: string; // UUID of the created log
}

// =====================================================
// Realtime Subscription Types
// =====================================================

export type RealtimePayloadType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = Record<string, unknown>> {
    eventType: RealtimePayloadType;
    new: T;
    old: T;
    schema: string;
    table: string;
    commit_timestamp: string;
}

export type BoardRealtimePayload = RealtimePayload<BoardRow>;
export type ItemRealtimePayload = RealtimePayload<ItemRow>;
export type WorkspaceRealtimePayload = RealtimePayload<WorkspaceRow>;

// =====================================================
// Type Guards
// =====================================================

export function isPostgrestError(error: unknown): error is PostgrestError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        'code' in error
    );
}

export function hasData<T>(result: SupabaseQueryResult<T>): result is { data: T; error: null } {
    return result.data !== null && result.error === null;
}

// =====================================================
// JSON Parsing Helpers
// =====================================================

/**
 * Safely parse JSON with type checking
 */
export function parseJSON<T = unknown>(json: string | null | undefined, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

/**
 * Type-safe JSON stringification
 */
export function stringifyJSON(value: unknown): string {
    try {
        return JSON.stringify(value);
    } catch {
        return '{}';
    }
}

// =====================================================
// Metadata Types for Activity Logs
// =====================================================

export interface RoleUpdateMetadata {
    old_role: string;
    new_role: string;
    target_email: string;
}

export interface UserSignupMetadata {
    email: string;
    full_name: string;
    system_role: string;
}

export interface UserDeletedMetadata {
    email: string;
    full_name: string;
    system_role?: string;
}

export interface WorkspaceCreatedMetadata {
    workspace_title: string;
    workspace_id: string;
}

export interface BoardCreatedMetadata {
    board_title: string;
    board_id: string;
    workspace_title: string;
    workspace_id: string;
}

export type ActivityMetadata =
    | RoleUpdateMetadata
    | UserSignupMetadata
    | UserDeletedMetadata
    | WorkspaceCreatedMetadata
    | BoardCreatedMetadata
    | Record<string, unknown>;
