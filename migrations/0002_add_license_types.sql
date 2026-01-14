-- ライセンス種別の追加: 従量制(0ABJ)と従量制(050)

-- 既存のlicensesテーブルを一時テーブルにバックアップ
CREATE TABLE licenses_backup AS SELECT * FROM licenses;

-- licensesテーブルを削除
DROP TABLE licenses;

-- 新しいライセンス種別を含むテーブルを再作成
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  license_type TEXT NOT NULL CHECK(license_type IN ('無制限(0ABJ)', '無制限(050)', '従量制(0ABJ)', '従量制(050)', '従量制', '内線のみ')),
  license_count INTEGER NOT NULL CHECK(license_count > 0),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- バックアップからデータを復元
INSERT INTO licenses SELECT * FROM licenses_backup;

-- バックアップテーブルを削除
DROP TABLE licenses_backup;

-- インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_licenses_deal_id ON licenses(deal_id);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(license_type);
