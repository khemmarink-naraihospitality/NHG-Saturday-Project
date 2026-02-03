-- =====================================================
-- Delete User Function with Activity Logging
-- =====================================================
-- Purpose: Safely delete a user and all related data with audit trail
-- Created: 2026-02-03
-- =====================================================

CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email TEXT;
    v_user_name TEXT;
    v_current_user_role TEXT;
    v_target_user_role TEXT;
    v_result JSONB;
BEGIN
    -- Get current user's role
    SELECT system_role INTO v_current_user_role
    FROM profiles
    WHERE id = auth.uid();

    -- Get target user's info
    SELECT email, full_name, system_role
    INTO v_user_email, v_user_name, v_target_user_role
    FROM profiles
    WHERE id = user_id;

    -- Check if user exists
    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Permission check: Only super_admin can delete users
    -- And cannot delete yourself
    IF v_current_user_role != 'super_admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied. Only Super Admins can delete users.'
        );
    END IF;

    IF user_id = auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete your own account'
        );
    END IF;

    -- Log the deletion before actually deleting
    PERFORM log_activity(
        'user_deleted',
        'user',
        user_id,
        jsonb_build_object(
            'email', v_user_email,
            'full_name', v_user_name,
            'system_role', v_target_user_role
        )
    );

    -- Delete user's related data (cascade should handle most, but explicit for clarity)
    -- Note: Adjust these based on your actual schema
    
    -- Delete notifications
    DELETE FROM notifications WHERE user_id = user_id OR actor_id = user_id;
    
    -- Delete board memberships
    DELETE FROM board_members WHERE user_id = user_id;
    
    -- Delete workspace memberships
    DELETE FROM workspace_members WHERE user_id = user_id;
    
    -- Transfer or delete workspaces owned by this user
    -- Option 1: Delete workspaces (and cascade to boards, items, etc.)
    DELETE FROM workspaces WHERE owner_id = user_id;
    
    -- Option 2: Transfer to another admin (uncomment if preferred)
    -- UPDATE workspaces 
    -- SET owner_id = (SELECT id FROM profiles WHERE system_role = 'super_admin' LIMIT 1)
    -- WHERE owner_id = user_id;

    -- Delete profile (this should cascade to auth.users via trigger or policy)
    DELETE FROM profiles WHERE id = user_id;

    -- Delete from auth.users (requires admin privileges)
    -- Note: This might need to be done via Supabase Admin API instead
    -- For now, we'll just delete the profile and let Supabase handle auth cleanup

    v_result := jsonb_build_object(
        'success', true,
        'message', 'User deleted successfully',
        'deleted_user', jsonb_build_object(
            'id', user_id,
            'email', v_user_email,
            'name', v_user_name
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
-- (The function itself checks for super_admin role)
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION delete_user IS 'Deletes a user and all related data. Only Super Admins can execute. Logs the deletion to activity_logs.';
