-- ローカル環境用：yu-tanaka@idex.co.jp を削除
UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE email = 'yu-tanaka@idex.co.jp';

-- 確認：アクティブなユーザーのみ表示
SELECT COUNT(*) as active_users FROM users WHERE is_active = 1;
SELECT email, display_name, is_active FROM users WHERE email = 'yu-tanaka@idex.co.jp';
