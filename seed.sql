-- ZoomPhone管理システム - テストデータ

-- テスト案件データ
INSERT OR IGNORE INTO deals (customer_name, sales_rep, deal_date, status, source) VALUES 
  ('サンプル株式会社', '山田', '2025-04-15', '成約', 'manual'),
  ('テスト商事株式会社', '阿部', '2025-05-20', '見込み', 'excel'),
  ('モックエンタープライズ', '山田', '2025-06-10', '成約', 'manual'),
  ('デモコーポレーション', '阿部', '2025-11-05', '見込み', 'csv_import');

-- テストライセンスデータ
-- サンプル株式会社（deal_id: 1）
INSERT OR IGNORE INTO licenses (deal_id, license_type, license_count) VALUES 
  (1, '無制限(0ABJ)', 50),
  (1, '従量制', 20);

-- テスト商事株式会社（deal_id: 2）
INSERT OR IGNORE INTO licenses (deal_id, license_type, license_count) VALUES 
  (2, '無制限(050)', 30),
  (2, '内線のみ', 10);

-- モックエンタープライズ（deal_id: 3）
INSERT OR IGNORE INTO licenses (deal_id, license_type, license_count) VALUES 
  (3, '無制限(0ABJ)', 100);

-- デモコーポレーション（deal_id: 4）
INSERT OR IGNORE INTO licenses (deal_id, license_type, license_count) VALUES 
  (4, '無制限(050)', 25),
  (4, '従量制', 15),
  (4, '内線のみ', 5);
