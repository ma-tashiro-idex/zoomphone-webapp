-- t-suetsugu@idex.co.jp を追加
INSERT OR REPLACE INTO users (email, display_name, is_active, created_at, updated_at) VALUES
  ('t-suetsugu@idex.co.jp', '末次', 1, datetime('now'), datetime('now'));

-- 確認：アクティブユーザーを表示
SELECT COUNT(*) as total_active FROM users WHERE is_active = 1;
SELECT email, display_name FROM users WHERE is_active = 1 ORDER BY email;
