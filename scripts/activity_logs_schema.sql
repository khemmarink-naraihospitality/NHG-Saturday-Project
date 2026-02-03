-- =====================================================
-- Activity Logs Schema
-- =====================================================
-- Purpose: Track all significant user actions in the system
-- Created: 2026-02-03
-- =====================================================

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admins and IT Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
    ON activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.system_role IN ('super_admin', 'it_admin')
        )
    );

-- Policy: Users can view their own activities
CREATE POLICY "Users can view their own activities"
    ON activity_logs FOR SELECT
    USING (actor_id = auth.uid());

-- Policy: System can insert activity logs (authenticated users only)
CREATE POLICY "Authenticated users can create activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RPC Function: log_activity
-- =====================================================
-- Purpose: Centralized function to log activities
-- Usage: SELECT log_activity('user_signup', 'user', 'uuid', '{"key": "value"}'::jsonb);
-- =====================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_action_type TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        metadata
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_target_type,
        p_target_id,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE activity_logs IS 'Stores all significant user actions for audit trail';
COMMENT ON COLUMN activity_logs.actor_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action: user_signup, role_updated, user_deleted, workspace_created, board_created, etc.';
COMMENT ON COLUMN activity_logs.target_type IS 'Type of target entity: user, workspace, board, etc.';
COMMENT ON COLUMN activity_logs.target_id IS 'ID of the target entity';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional context data in JSON format';
COMMENT ON FUNCTION log_activity IS 'Centralized function to create activity log entries';
