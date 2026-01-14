-- ZoomPhone管理システム - 初期スキーマ
-- 正規化されたデータモデル

-- ユーザーテーブル（許可リスト管理）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ユーザーメールのインデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 案件マスターテーブル（顧客ごとに1レコード）
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT UNIQUE NOT NULL,
  sales_rep TEXT NOT NULL,
  deal_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('見込み', '成約')),
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'excel', 'csv_import')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 案件マスターのインデックス
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_name);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep ON deals(sales_rep);
CREATE INDEX IF NOT EXISTS idx_deals_date ON deals(deal_date);

-- ライセンス明細テーブル（案件ごとの複数ライセンス）
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  license_type TEXT NOT NULL CHECK(license_type IN ('無制限(0ABJ)', '無制限(050)', '従量制', '内線のみ')),
  license_count INTEGER NOT NULL CHECK(license_count > 0),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- ライセンス明細のインデックス
CREATE INDEX IF NOT EXISTS idx_licenses_deal_id ON licenses(deal_id);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(license_type);

-- 初期許可ユーザーデータ
INSERT OR IGNORE INTO users (email, display_name) VALUES 
  ('hi-abe@idex.co.jp', '阿部'),
  ('s-mizukami@idex.co.jp', '水上'),
  ('k-yoshimura@idex.co.jp', '吉村'),
  ('s-yamada@idex.co.jp', '山田'),
  ('yu-tanaka@idex.co.jp', '田中'),
  ('t-kusumoto@idex.co.jp', '楠本'),
  ('ma-tashiro@idex.co.jp', '田代'),
  ('y-hara@idex.co.jp', '原'),
  ('m-maeda@idex.co.jp', '前田'),
  ('m-tashiro@idex.co.jp', '田代'),
  ('t-iwanaga@idex.co.jp', '岩永'),
  ('k-tsuru@idex.co.jp', '鶴');
