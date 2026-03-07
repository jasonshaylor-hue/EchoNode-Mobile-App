-- cognitive-flow/supabase/migrations/004_rls_policies.sql
-- Row Level Security: users can only access their own data

-- ═══════════════════════════════════════════
-- Enable RLS on all three tables
-- ═══════════════════════════════════════════
ALTER TABLE thoughts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_focus ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════
-- thoughts table
-- ═══════════════════════════════════════════
CREATE POLICY "thoughts_select_own"
  ON thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "thoughts_insert_own"
  ON thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "thoughts_update_own"
  ON thoughts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "thoughts_delete_own"
  ON thoughts FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- tasks table
-- ═══════════════════════════════════════════
CREATE POLICY "tasks_select_own"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- daily_focus table
-- ═══════════════════════════════════════════
CREATE POLICY "daily_focus_select_own"
  ON daily_focus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "daily_focus_insert_own"
  ON daily_focus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_focus_update_own"
  ON daily_focus FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_focus_delete_own"
  ON daily_focus FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- Revoke anon access — authentication required
-- (Service role bypasses RLS automatically)
-- ═══════════════════════════════════════════
REVOKE SELECT, INSERT, UPDATE, DELETE ON thoughts    FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON tasks       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON daily_focus FROM anon;
