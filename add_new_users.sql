-- 新規許可ユーザーの追加
INSERT OR IGNORE INTO users (email, display_name, is_active, created_at, updated_at) VALUES
  ('k-murakami@idex.co.jp', '村上', 1, datetime('now'), datetime('now')),
  ('y-motoda@idex.co.jp', '元田', 1, datetime('now'), datetime('now')),
  ('n-takuma@idex.co.jp', '詫摩', 1, datetime('now'), datetime('now')),
  ('s-in@idex.co.jp', '印', 1, datetime('now'), datetime('now')),
  ('s-ohgi@idex.co.jp', '扇', 1, datetime('now'), datetime('now')),
  ('s-takao@idex.co.jp', '高尾', 1, datetime('now'), datetime('now')),
  ('k-sekimoto@idex.co.jp', '関本', 1, datetime('now'), datetime('now')),
  ('kan-yoshimura@idex.co.jp', '吉村(寛)', 1, datetime('now'), datetime('now'));

-- 確認：全ユーザーを表示
SELECT email, display_name, is_active FROM users ORDER BY email;
