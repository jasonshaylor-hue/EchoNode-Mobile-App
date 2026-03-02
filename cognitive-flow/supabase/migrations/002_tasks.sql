-- Tasks extracted from brain dump hierarchies
CREATE TABLE IF NOT EXISTS tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    text NOT NULL,
  thought_id    uuid REFERENCES thoughts(id),
  title         text NOT NULL,
  priority      text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  mention_count int  NOT NULL DEFAULT 1,
  created_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_session_status_idx  ON tasks(session_id, status);
CREATE INDEX IF NOT EXISTS tasks_mention_count_idx   ON tasks(mention_count DESC);

-- Daily AI-picked focus tasks (cached per session per day)
CREATE TABLE IF NOT EXISTS daily_focus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  focus_date  date NOT NULL,
  task_ids    uuid[] NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(session_id, focus_date)
);
