-- =====================================================
-- Trigger: Auto-log User Signups
-- =====================================================
-- Purpose: Automatically log when a new user signs up
-- Created: 2026-02-03
-- =====================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_log_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the user signup
    INSERT INTO activity_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        metadata
    ) VALUES (
        NEW.id,  -- The new user is the actor
        'user_signup',
        'user',
        NEW.id,
        jsonb_build_object(
            'email', NEW.email,
            'full_name', NEW.full_name,
            'system_role', NEW.system_role
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_user_signup_log ON profiles;

CREATE TRIGGER on_user_signup_log
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_user_signup();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION trigger_log_user_signup IS 'Trigger function that logs new user signups to activity_logs';
COMMENT ON TRIGGER on_user_signup_log ON profiles IS 'Automatically logs when a new user profile is created';
