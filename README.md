# 📞 ZoomPhone 目標達成管理システム v2.0

## 📌 プロジェクト概要

ZoomPhoneライセンスの販売管理システム。年度別の目標管理と営業活動の見える化を実現する営業チーム向けの管理ツールです。

### 🎯 主な特徴

- **年度別目標管理**: 2024-2026年度の目標値設定と達成率の可視化
- **成約・見込み案件管理**: 成約日・最終更新日による適切な日付管理
- **リアルタイムダッシュボード**: プログレスバーアニメーション＋カウントアップエフェクト
- **営業担当者別実績**: メンバーごとの成約・見込みライセンス数をランキング表示
- **検索・フィルター機能**: 顧客名、年度、営業担当者、ステータスで絞り込み
- **成約時のおめでとうアニメーション**: 紙吹雪エフェクトで達成感を演出
- **セキュアなアーキテクチャ**: Firebase認証とCloudflare D1データベース
- **CSVエクスポート・インポート**: データの一括管理に対応

## 🏗️ アーキテクチャ

```
📦 ZoomPhone v2.0
├── 🌐 Frontend (Vanilla JS + TailwindCSS)
│   ├── Firebase認証（Googleアカウント）
│   ├── 年度別ダッシュボード
│   ├── プログレスバーアニメーション
│   ├── おめでとうエフェクト
│   ├── 検索・フィルター機能
│   └── CSV エクスポート・インポート
│
├── ⚡ Backend (Hono on Cloudflare Workers)
│   ├── /api/deals - 案件CRUD API
│   ├── /api/stats - 年度別統計API
│   ├── /api/sales-reps - 担当者一覧
│   └── 認証ミドルウェア
│
└── 💾 Database (Cloudflare D1 - SQLite)
    ├── deals テーブル（案件マスター）
    └── licenses テーブル（ライセンス明細）
```

## ✨ 主要機能

### 1. 年度別集計
- 2024年度: 1,240ライセンス目標
- 2025年度: 1,000ライセンス目標
- 2026年度: 目標未設定（???表示）
- 4月始まりの年度管理

### 2. 日付管理
- **成約案件**: 成約日（closed_date）で集計
- **見込み案件**: 最終更新日（updated_at）で集計
- 年度フィルタリングに適切に対応

### 3. アニメーション
- **プログレスバー**: 0%から目標値までスムーズに伸びる（1.5秒）
- **数値カウントアップ**: 0から実際の数値まで滑らかにカウント
- **目標達成エフェクト**: 達成率100%以上でパルスエフェクト
- **おめでとうアニメーション**: 見込み→成約時に紙吹雪＋フェードアウト

### 4. 営業担当者別実績
- 成約ライセンス数・案件数
- 見込みライセンス数・案件数
- 合計ライセンス数
- ランキング形式で表示

### 5. 検索・フィルター
- 顧客名検索
- 年度絞り込み（2024-2026）
- 営業担当者フィルター
- ステータスフィルター（成約/見込み）
- 並び替え（日付/ライセンス数/顧客名）

## 📊 データベーススキーマ

### deals テーブル
```sql
CREATE TABLE deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT UNIQUE NOT NULL,
  sales_rep TEXT NOT NULL,
  status TEXT CHECK(status IN ('見込み', '成約')) NOT NULL,
  closed_date TEXT,              -- 成約日（成約時のみ）
  source TEXT CHECK(source IN ('manual', 'excel', 'csv_import')) DEFAULT 'manual',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### licenses テーブル
```sql
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  license_type TEXT CHECK(license_type IN (
    '無制限＋0ABJ', '無制限＋050', 
    '従量制＋0ABJ', '従量制＋050', 
    '従量制（Pro）', '内線のみ'
  )) NOT NULL,
  license_count INTEGER NOT NULL CHECK(license_count > 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

## 🚀 ローカル開発環境

### 前提条件
- Node.js 18+
- npm または yarn
- PM2（グローバルインストール推奨）

### セットアップ手順

```bash
# 依存関係のインストール
npm install

# Gitリポジトリ初期化
npm run git:init

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# テストデータのシード
npm run db:seed

# プロジェクトビルド
npm run build

# PM2で開発サーバー起動
pm2 start ecosystem.config.cjs

# サーバー確認
npm run test
```

### 開発用コマンド

```bash
# ビルド＆再起動
npm run build && pm2 restart zoomphone-webapp

# ポートクリーンアップ
npm run clean-port

# データベースコンソール
npm run db:console:local

# データベースリセット
npm run db:reset

# ログ確認
pm2 logs zoomphone-webapp --nostream

# PM2サービス管理
pm2 list
pm2 restart zoomphone-webapp
pm2 stop zoomphone-webapp
pm2 delete zoomphone-webapp
```

## 🌍 本番デプロイ

### Cloudflare Pages へのデプロイ

#### 1. Cloudflare API Key設定（必須）
```bash
# Deploy タブで Cloudflare API Key を設定
# https://dash.cloudflare.com/profile/api-tokens
```

#### 2. D1データベース作成
```bash
# 本番D1データベース作成
npx wrangler d1 create zoomphone-production

# 出力されたdatabase_idをwrangler.jsonc に設定
```

#### 3. マイグレーション実行
```bash
# 本番環境にマイグレーション適用
npm run db:migrate:prod
```

#### 4. Cloudflare Pagesプロジェクト作成
```bash
# プロジェクト作成（mainブランチを本番ブランチに設定）
npx wrangler pages project create zoomphone-webapp \
  --production-branch main \
  --compatibility-date 2024-01-01
```

#### 5. デプロイ実行
```bash
# ビルドしてデプロイ
npm run deploy:prod
```

### 環境変数の設定

```bash
# Firebase設定（オプション - サーバーサイド認証を使う場合）
npx wrangler pages secret put FIREBASE_PROJECT_ID --project-name zoomphone-webapp
npx wrangler pages secret put FIREBASE_PRIVATE_KEY --project-name zoomphone-webapp
npx wrangler pages secret put FIREBASE_CLIENT_EMAIL --project-name zoomphone-webapp
```

### カスタムドメイン設定（オプション）

```bash
# カスタムドメインを追加
npx wrangler pages domain add example.com --project-name zoomphone-webapp
```

## 📖 API仕様

### 認証
すべてのAPIエンドポイントは認証が必要です：
- ヘッダー: `X-User-Email: user@example.com`
- または、クエリパラメータ: `?email=user@example.com`

### エンドポイント

#### `GET /api/deals`
全案件を取得（ライセンス情報含む）

#### `GET /api/deals/:id`
特定案件の詳細を取得

#### `POST /api/deals`
新規案件を作成

**リクエストボディ:**
```json
{
  "customer_name": "新規株式会社",
  "sales_rep": "山田",
  "status": "成約",
  "closed_date": "2025-01-15",
  "licenses": [
    {
      "license_type": "無制限＋0ABJ",
      "license_count": 30
    }
  ]
}
```

#### `PUT /api/deals/:id`
案件を更新

#### `DELETE /api/deals/:id`
案件を削除（関連ライセンスも削除）

#### `GET /api/stats?fiscal_year=2025`
年度別統計情報を取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "total_licenses": 255,
    "confirmed_licenses": 170,
    "prospect_licenses": 85,
    "achievement_rate": 17,
    "remaining_target": 830,
    "deal_count": 4
  }
}
```

#### `GET /api/sales-reps`
営業担当者一覧を取得

## 🔒 セキュリティ対策

### 実装済み
- ✅ Firebase認証（Googleアカウント）
- ✅ 許可メールアドレスリスト
- ✅ API認証ミドルウェア
- ✅ CORS設定
- ✅ SQL Injection対策（プリペアドステートメント）
- ✅ XSS対策（テキストエスケープ）
- ✅ テキスト選択無効化（アニメーション部分）

## 📈 パフォーマンス

### 最適化済み
- ✅ Cloudflare Edge Network（低レイテンシ）
- ✅ D1データベース（SQLiteベース）
- ✅ インデックス設定（高速検索）
- ✅ アニメーション最適化（60FPS）
- ✅ 正規化されたデータ構造

## 🎨 UI/UXの特徴

### デザイン
- シンプルでクリーンなインターフェース
- システム名を中央寄せで大きく表示（36px、太字）
- ユーザー情報を右上に控えめに表示
- ログアウトボタンを赤色で目立たせる
- コンパクトな案件一覧（日付を顧客名と同じ行に配置）

### アニメーション
- プログレスバーのスムーズな伸長（1.5秒）
- 数値のカウントアップ（0から実際の値まで）
- 目標達成時のパルスエフェクト
- 見込み→成約時の紙吹雪＋おめでとうメッセージ
- フェードイン・フェードアウト（0.5秒）

## 🛠️ トラブルシューティング

### ポート3000が使用中
```bash
npm run clean-port
# または
fuser -k 3000/tcp
```

### データベースリセット
```bash
npm run db:reset
```

### PM2ログ確認
```bash
# リアルタイムログ
pm2 logs zoomphone-webapp

# 過去のログ
pm2 logs zoomphone-webapp --nostream --lines 50
```

### ビルドエラー
```bash
# distディレクトリ削除してクリーンビルド
rm -rf dist && npm run build
```

## 📝 開発履歴

### v2.0.0 (2026-01-15) - 本番リリース
- ✅ 年度別集計機能（2024-2026）
- ✅ 年度別目標値設定
- ✅ 成約日・最終更新日による日付管理
- ✅ プログレスバーアニメーション
- ✅ 数値カウントアップアニメーション
- ✅ 成約時のおめでとうアニメーション
- ✅ 検索・フィルター機能
- ✅ 営業担当者別実績テーブル
- ✅ CSVエクスポート・インポート
- ✅ システム名中央寄せ
- ✅ ログアウトボタン追加
- ✅ コンパクトな案件一覧レイアウト

## 🔮 今後の拡張案（部長からのフィードバック）

### 短中長期の案件見える化（将来実装予定）
- 予想成約時期フィールド追加
- 期間別案件分布（短期/中期/長期）
- 確度（ホット度）管理
- 営業ステージ管理
- チーム戦略サマリー
- メンバー別ポートフォリオ

## 👥 許可ユーザー

現在のシステムアクセス許可リスト（合計24名）：

### 既存ユーザー（12名）
- hi-abe@idex.co.jp（阿部）
- hara@idex.co.jp（原）
- iwanaga@idex.co.jp（岩永）
- kusumoto@idex.co.jp（楠本）
- m-yamada@idex.co.jp（山田）
- maeda@idex.co.jp（前田）
- s-tashiro@idex.co.jp（田代）
- t-mizukami@idex.co.jp（水上）
- t-yoshimura@idex.co.jp（吉村）
- tanaka@idex.co.jp（田中）
- tashiro@idex.co.jp（田代）
- tsuru@idex.co.jp（鶴）

### 新規追加ユーザー（12名）
- k-murakami@idex.co.jp（村上）⭐ NEW
- y-motoda@idex.co.jp（元田）⭐ NEW
- n-takuma@idex.co.jp（詫摩）⭐ NEW
- s-in@idex.co.jp（印）⭐ NEW
- s-ohgi@idex.co.jp（扇）⭐ NEW
- s-takao@idex.co.jp（高尾）⭐ NEW
- k-sekimoto@idex.co.jp（関本）⭐ NEW
- kan-yoshimura@idex.co.jp（吉村(寛)）⭐ NEW
- takao-tomoko@idex.co.jp（高尾知世）
- sekimoto-kenji@idex.co.jp（関本健二）
- suetsugu-takashi@idex.co.jp（末次孝）
- yoshimura-kanako@idex.co.jp（吉村嘉奈子）

## 📄 ライセンス

社内使用専用

---

## 🔗 公開URL

**開発環境（サンドボックス）**: https://3000-ijz0yod8dxtsy5iq1w4h0-c81df28e.sandbox.novita.ai/?test=true

**本番環境**: （デプロイ後に更新）

---

**最終更新**: 2026-01-15  
**バージョン**: 2.0.0  
**ステータス**: ✅ 本番リリース準備完了
