-- =====================================================
-- Complete Database Setup Script
-- =====================================================
-- Purpose: Run all SQL scripts in the correct order
-- Created: 2026-02-03
-- Usage: Copy and paste this entire file into Supabase SQL Editor
-- =====================================================

-- Note: This file combines all necessary SQL scripts for easy setup
-- Run this in your Supabase SQL Editor to set up the complete database

-- =====================================================
-- STEP 1: Activity Logs Schema
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all activity logs"
    ON activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.system_role IN ('super_admin', 'it_admin')
        )
    );

CREATE POLICY "Users can view their own activities"
    ON activity_logs FOR SELECT
    USING (actor_id = auth.uid());

CREATE POLICY "Authenticated users can create activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- RPC Function
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

GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- =====================================================
-- STEP 2: Delete User Function
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
    SELECT system_role INTO v_current_user_role
    FROM profiles WHERE id = auth.uid();

    SELECT email, full_name, system_role
    INTO v_user_email, v_user_name, v_target_user_role
    FROM profiles WHERE id = user_id;

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_current_user_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    IF user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
    END IF;

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

    DELETE FROM notifications WHERE user_id = user_id OR actor_id = user_id;
    DELETE FROM board_members WHERE user_id = user_id;
    DELETE FROM workspace_members WHERE user_id = user_id;
    DELETE FROM workspaces WHERE owner_id = user_id;
    DELETE FROM profiles WHERE id = user_id;

    RETURN jsonb_build_object('success', true, 'message', 'User deleted successfully');

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user TO authenticated;

-- =====================================================
-- STEP 3: User Signup Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO activity_logs (
        actor_id, action_type, target_type, target_id, metadata
    ) VALUES (
        NEW.id, 'user_signup', 'user', NEW.id,
        jsonb_build_object(
            'email', NEW.email,
            'full_name', NEW.full_name,
            'system_role', NEW.system_role
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_signup_log ON profiles;
CREATE TRIGGER on_user_signup_log
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_user_signup();

-- =====================================================
-- STEP 4: Workspace & Board Creation Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_workspace_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO activity_logs (
        actor_id, action_type, target_type, target_id, metadata
    ) VALUES (
        auth.uid(), 'workspace_created', 'workspace', NEW.id,
        jsonb_build_object('workspace_title', NEW.title, 'workspace_id', NEW.id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created_log ON workspaces;
CREATE TRIGGER on_workspace_created_log
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_workspace_created();

CREATE OR REPLACE FUNCTION trigger_log_board_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_title TEXT;
BEGIN
    SELECT title INTO v_workspace_title FROM workspaces WHERE id = NEW.workspace_id;
    
    INSERT INTO activity_logs (
        actor_id, action_type, target_type, target_id, metadata
    ) VALUES (
        auth.uid(), 'board_created', 'board', NEW.id,
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

DROP TRIGGER IF EXISTS on_board_created_log ON boards;
CREATE TRIGGER on_board_created_log
    AFTER INSERT ON boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_board_created();

-- =====================================================
-- Setup Complete!
-- =====================================================
-- You can now use the activity logging system.
-- All user signups, role changes, deletions, workspace and board creations
-- will be automatically logged to the activity_logs table.
-- =====================================================
