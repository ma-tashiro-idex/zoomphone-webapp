-- 正しい20名のユーザーリストに更新
-- まず全ユーザーを無効化
UPDATE users SET is_active = 0, updated_at = datetime('now');

-- 正しい20名のみを有効化（存在しない場合は追加）
INSERT OR REPLACE INTO users (email, display_name, is_active, created_at, updated_at) VALUES
  ('k-murakami@idex.co.jp', '村上', 1, datetime('now'), datetime('now')),
  ('y-motoda@idex.co.jp', '元田', 1, datetime('now'), datetime('now')),
  ('n-takuma@idex.co.jp', '詫摩', 1, datetime('now'), datetime('now')),
  ('s-in@idex.co.jp', '印', 1, datetime('now'), datetime('now')),
  ('s-ohgi@idex.co.jp', '扇', 1, datetime('now'), datetime('now')),
  ('s-takao@idex.co.jp', '高尾', 1, datetime('now'), datetime('now')),
  ('k-sekimoto@idex.co.jp', '関本', 1, datetime('now'), datetime('now')),
  ('kan-yoshimura@idex.co.jp', '吉村(寛)', 1, datetime('now'), datetime('now')),
  ('hi-abe@idex.co.jp', '阿部', 1, datetime('now'), datetime('now')),
  ('s-mizukami@idex.co.jp', '水上', 1, datetime('now'), datetime('now')),
  ('k-yoshimura@idex.co.jp', '吉村', 1, datetime('now'), datetime('now')),
  ('s-yamada@idex.co.jp', '山田', 1, datetime('now'), datetime('now')),
  ('t-kusumoto@idex.co.jp', '楠本', 1, datetime('now'), datetime('now')),
  ('ma-tashiro@idex.co.jp', '田代(真)', 1, datetime('now'), datetime('now')),
  ('y-hara@idex.co.jp', '原', 1, datetime('now'), datetime('now')),
  ('m-maeda@idex.co.jp', '前田', 1, datetime('now'), datetime('now')),
  ('m-tashiro@idex.co.jp', '田代(美)', 1, datetime('now'), datetime('now')),
  ('t-iwanaga@idex.co.jp', '岩永', 1, datetime('now'), datetime('now')),
  ('k-tsuru@idex.co.jp', '鶴', 1, datetime('now'), datetime('now')),
  ('yu-tanaka@idex.co.jp', '田中(裕)', 1, datetime('now'), datetime('now'));

-- 確認：アクティブユーザーを表示
SELECT COUNT(*) as total_active FROM users WHERE is_active = 1;
SELECT email, display_name FROM users WHERE is_active = 1 ORDER BY email;
