-- User-personalized dashboard shortcuts
CREATE TABLE IF NOT EXISTS user_shortcuts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  href         text NOT NULL,
  label        text NOT NULL,
  icon_name    text NOT NULL DEFAULT 'Zap',
  color        text NOT NULL DEFAULT 'var(--primary)',
  order_index  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_shortcuts_user_org ON user_shortcuts(user_id, org_id);

ALTER TABLE user_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shortcuts_select" ON user_shortcuts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "shortcuts_insert" ON user_shortcuts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shortcuts_update" ON user_shortcuts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "shortcuts_delete" ON user_shortcuts
  FOR DELETE USING (auth.uid() = user_id);
