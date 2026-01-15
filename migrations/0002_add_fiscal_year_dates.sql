-- 年度対応：deal_dateをupdated_atとclosed_dateに分割

-- 1. 新しいカラムを追加
ALTER TABLE deals ADD COLUMN closed_date DATE;

-- 2. 既存データの移行
-- 成約案件: closed_dateにdeal_dateをコピー
UPDATE deals SET closed_date = deal_date WHERE status = '成約';

-- 3. インデックス追加
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_closed_date ON deals(closed_date);

-- 4. 古いインデックスを削除
DROP INDEX IF EXISTS idx_deals_date;
