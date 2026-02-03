-- =====================================================
-- Triggers: Auto-log Workspace and Board Creation
-- =====================================================
-- Purpose: Automatically log when workspaces or boards are created
-- Created: 2026-02-03
-- =====================================================

-- =====================================================
-- Workspace Creation Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_workspace_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the workspace creation
    INSERT INTO activity_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        metadata
    ) VALUES (
        auth.uid(),  -- Current user creating the workspace
        'workspace_created',
        'workspace',
        NEW.id,
        jsonb_build_object(
            'workspace_title', NEW.title,
            'workspace_id', NEW.id
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on workspaces table
DROP TRIGGER IF EXISTS on_workspace_created_log ON workspaces;

CREATE TRIGGER on_workspace_created_log
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_workspace_created();

-- =====================================================
-- Board Creation Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_board_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_title TEXT;
BEGIN
    -- Get workspace title
    SELECT title INTO v_workspace_title
    FROM workspaces
    WHERE id = NEW.workspace_id;

    -- Log the board creation
    INSERT INTO activity_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        metadata
    ) VALUES (
        auth.uid(),  -- Current user creating the board
        'board_created',
        'board',
        NEW.id,
        jsonb_build_object(
            'board_title', NEW.title,
            'board_id', NEW.id,
            'workspace_title', COALESCE(v_workspace_title, 'Unknown'),
            'workspace_id', NEW.workspace_id
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on boards table
DROP TRIGGER IF EXISTS on_board_created_log ON boards;

CREATE TRIGGER on_board_created_log
    AFTER INSERT ON boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_board_created();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION trigger_log_workspace_created IS 'Trigger function that logs workspace creation to activity_logs';
COMMENT ON FUNCTION trigger_log_board_created IS 'Trigger function that logs board creation to activity_logs';
COMMENT ON TRIGGER on_workspace_created_log ON workspaces IS 'Automatically logs when a new workspace is created';
COMMENT ON TRIGGER on_board_created_log ON boards IS 'Automatically logs when a new board is created';
