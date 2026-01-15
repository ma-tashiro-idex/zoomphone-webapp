-- 新規ユーザー追加

-- 追加ユーザー（メールアドレスあり）
INSERT OR IGNORE INTO users (email, display_name) VALUES
  ('k-murakami@idex.co.jp', '村上'),
  ('y-motoda@idex.co.jp', '元田'),
  ('n-takuma@idex.co.jp', '詫摩'),
  ('s-in@idex.co.jp', '印'),
  ('takao-tomoko@idex.co.jp', '高尾知世'),
  ('sekimoto-kenji@idex.co.jp', '関本健二'),
  ('suetsugu-takashi@idex.co.jp', '末次孝'),
  ('yoshimura-kanako@idex.co.jp', '吉村嘉奈子');
