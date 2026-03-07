-- cognitive-flow/supabase/migrations/003_add_user_id.sql
-- Replaces session_id with user_id (Supabase Auth UUID) across all tables

-- Step 1: Add user_id columns (nullable first to allow cleanup)
ALTER TABLE thoughts    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tasks       ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE daily_focus ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Performance indexes for user_id-based queries
CREATE INDEX IF NOT EXISTS thoughts_user_id_idx      ON thoughts(user_id);
CREATE INDEX IF NOT EXISTS tasks_user_status_idx     ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS daily_focus_user_date_idx ON daily_focus(user_id, focus_date);

-- Step 3: Delete legacy anonymous rows (session-based data not recoverable)
-- WARNING: This is destructive. All existing thoughts/tasks will be deleted.
DELETE FROM daily_focus WHERE user_id IS NULL;
DELETE FROM tasks       WHERE user_id IS NULL;
DELETE FROM thoughts    WHERE user_id IS NULL;

-- Step 4: Enforce NOT NULL now that orphaned rows are removed
ALTER TABLE thoughts    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE daily_focus ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Drop old session_id columns
ALTER TABLE thoughts    DROP COLUMN IF EXISTS session_id;
ALTER TABLE tasks       DROP COLUMN IF EXISTS session_id;
ALTER TABLE daily_focus DROP COLUMN IF EXISTS session_id;

-- Step 6: Fix daily_focus unique constraint (was session_id + focus_date)
ALTER TABLE daily_focus DROP CONSTRAINT IF EXISTS daily_focus_session_id_focus_date_key;
ALTER TABLE daily_focus ADD  CONSTRAINT daily_focus_user_id_focus_date_key
    UNIQUE(user_id, focus_date);
