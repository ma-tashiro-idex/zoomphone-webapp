-- ZoomPhone管理システム - 初期スキーマ

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 案件テーブル
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT UNIQUE NOT NULL,
  sales_rep TEXT NOT NULL,
  deal_date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('見込み', '成約')),
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'excel', 'csv_import')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ライセンステーブル（新形式のライセンス種別）
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  license_type TEXT NOT NULL CHECK(license_type IN (
    '無制限＋0ABJ',
    '無制限＋050',
    '従量制＋0ABJ',
    '従量制＋050',
    '従量制(Pro)',
    '内線のみ'
  )),
  license_count INTEGER NOT NULL CHECK(license_count > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_name);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep ON deals(sales_rep);
CREATE INDEX IF NOT EXISTS idx_deals_date ON deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_licenses_deal_id ON licenses(deal_id);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(license_type);

-- 初期許可ユーザー
INSERT INTO users (email, display_name) VALUES
  ('hi-abe@idex.co.jp', '阿部'),
  ('t-mizukami@idex.co.jp', '水上'),
  ('t-yoshimura@idex.co.jp', '吉村'),
  ('m-yamada@idex.co.jp', '山田'),
  ('tanaka@idex.co.jp', '田中'),
  ('kusumoto@idex.co.jp', '楠本'),
  ('tashiro@idex.co.jp', '田代'),
  ('hara@idex.co.jp', '原'),
  ('maeda@idex.co.jp', '前田'),
  ('s-tashiro@idex.co.jp', '田代'),
  ('iwanaga@idex.co.jp', '岩永'),
  ('tsuru@idex.co.jp', '鶴');

