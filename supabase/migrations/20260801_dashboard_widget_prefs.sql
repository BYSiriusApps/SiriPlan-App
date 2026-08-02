-- ============================================================
-- SIRIPLAN — Ana sayfa özet kutuları (widget) kişiselleştirmesi
-- Tarih: 2026-08-01
-- Supabase SQL Editor'da çalıştırılmalı
--
-- user_shortcuts (007_user_shortcuts.sql) ile aynı desen: kullanıcı +
-- organizasyon bazlı, her widget ayrı satır, göster/gizle + sıra.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  widget_key   text NOT NULL,
  visible      boolean NOT NULL DEFAULT true,
  order_index  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, widget_key)
);

CREATE INDEX IF NOT EXISTS user_dashboard_widgets_user_org ON user_dashboard_widgets(user_id, org_id);

ALTER TABLE user_dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_widgets_select" ON user_dashboard_widgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "dashboard_widgets_insert" ON user_dashboard_widgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dashboard_widgets_update" ON user_dashboard_widgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "dashboard_widgets_delete" ON user_dashboard_widgets
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
