# ZoomPhone 目標達成管理システム v2.0

## 📌 プロジェクト概要

ZoomPhoneライセンスの販売管理システム。年間1,000ライセンスのKPI達成を目指す営業チーム向けの管理ツールです。

### 🎯 主な特徴

- **セキュアなアーキテクチャ**: 機密情報をバックエンドで管理
- **正規化されたデータベース**: Cloudflare D1で効率的なデータ管理
- **フロントエンド・バックエンド分離**: メンテナンス性の高い構造
- **Firebase認証**: Googleアカウントでセキュアなログイン
- **リアルタイム統計**: 案件・ライセンス数を即座に把握

## 🏗️ アーキテクチャ

### 旧システムの問題点
- ❌ 単一HTMLファイル（3000行）- メンテナンス困難
- ❌ フロントエンドに機密情報露出 - セキュリティリスク
- ❌ 非正規化データ - スケーラビリティ不足

### 新アーキテクチャ
```
📦 ZoomPhone v2.0
├── 🌐 Frontend (Vanilla JS + TailwindCSS)
│   ├── Firebase認証（クライアント側）
│   ├── ダッシュボードUI
│   └── Chart.js可視化
│
├── ⚡ Backend (Hono on Cloudflare Workers)
│   ├── /api/deals - 案件CRUD API
│   ├── /api/stats - 統計API
│   ├── /api/sales-reps - 担当者一覧
│   └── 認証ミドルウェア（許可リスト検証）
│
└── 💾 Database (Cloudflare D1 - SQLite)
    ├── users テーブル（許可ユーザー管理）
    ├── deals テーブル（案件マスター）
    └── licenses テーブル（ライセンス明細）
```

## 📊 データベーススキーマ

### users テーブル
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
```

### deals テーブル（案件マスター）
```sql
CREATE TABLE deals (
  id INTEGER PRIMARY KEY,
  customer_name TEXT UNIQUE NOT NULL,
  sales_rep TEXT NOT NULL,
  deal_date TEXT NOT NULL,
  status TEXT CHECK(status IN ('見込み', '成約')),
  source TEXT CHECK(source IN ('manual', 'excel', 'csv_import')),
  created_at TEXT,
  updated_at TEXT
);
```

### licenses テーブル（ライセンス明細）
```sql
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY,
  deal_id INTEGER NOT NULL,
  license_type TEXT CHECK(license_type IN ('無制限(0ABJ)', '無制限(050)', '従量制', '内線のみ')),
  license_count INTEGER NOT NULL CHECK(license_count > 0),
  created_at TEXT,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

## 🚀 ローカル開発環境

### 前提条件
- Node.js 18+
- npm または yarn

### セットアップ手順

```bash
# 依存関係のインストール
npm install

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# テストデータのシード
npm run db:seed

# プロジェクトビルド
npm run build

# PM2で開発サーバー起動
pm2 start ecosystem.config.cjs

# サーバー確認
curl http://localhost:3000
```

### 開発用コマンド

```bash
# ローカル開発（Viteホットリロード）
npm run dev

# サンドボックス環境（Wrangler + D1ローカル）
npm run dev:sandbox

# データベースコンソール
npm run db:console:local

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

```bash
# 1. D1データベースを本番環境に作成
npx wrangler d1 create zoomphone-db

# 2. wrangler.jsonc の database_id を更新
# （出力されたIDをコピーして設定）

# 3. 本番マイグレーション
npm run db:migrate:prod

# 4. Cloudflare Pagesプロジェクト作成
npx wrangler pages project create zoomphone-webapp --production-branch main

# 5. ビルドとデプロイ
npm run deploy
```

### 環境変数の設定

```bash
# Firebaseの秘密鍵を設定（本番環境でFirebase Admin SDKを使う場合）
npx wrangler pages secret put FIREBASE_PROJECT_ID --project-name zoomphone-webapp
npx wrangler pages secret put FIREBASE_PRIVATE_KEY --project-name zoomphone-webapp
npx wrangler pages secret put FIREBASE_CLIENT_EMAIL --project-name zoomphone-webapp
```

## 📖 API仕様

### 認証
すべてのAPIエンドポイントは認証が必要です：
- ヘッダー: `X-User-Email: user@example.com`
- または、クエリパラメータ: `?email=user@example.com`

### エンドポイント

#### `GET /api/deals`
全案件を取得

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_name": "サンプル株式会社",
      "sales_rep": "山田",
      "deal_date": "2025-04-15",
      "status": "成約",
      "source": "manual",
      "licenses": [
        {
          "id": 1,
          "deal_id": 1,
          "license_type": "無制限(0ABJ)",
          "license_count": 50
        }
      ]
    }
  ]
}
```

#### `POST /api/deals`
新規案件を作成

**リクエストボディ:**
```json
{
  "customer_name": "新規株式会社",
  "sales_rep": "山田",
  "deal_date": "2025-12-01",
  "status": "見込み",
  "licenses": [
    {
      "license_type": "無制限(0ABJ)",
      "license_count": 30
    }
  ]
}
```

#### `GET /api/stats`
統計情報を取得

**クエリパラメータ:**
- `filter` (optional): `見込み` | `成約`

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "total_licenses": 255,
    "confirmed_licenses": 170,
    "prospect_licenses": 85,
    "achievement_rate": 25,
    "remaining_target": 830,
    "deal_count": 4,
    "first_half": {
      "confirmed": 120,
      "prospect": 40,
      "total": 160
    },
    "second_half": {
      "confirmed": 50,
      "prospect": 45,
      "total": 95
    },
    "license_breakdown": {
      "無制限(0ABJ)": 150,
      "無制限(050)": 55,
      "従量制": 35,
      "内線のみ": 15
    }
  }
}
```

## 🔒 セキュリティ対策

### 実装済み
- ✅ Firebase認証（Googleアカウント）
- ✅ 許可リスト（D1データベースで管理）
- ✅ API認証ミドルウェア
- ✅ CORS設定
- ✅ SQL Injection対策（プリペアドステートメント）

### 今後の改善（推奨）
- 🔜 Firebase Admin SDK統合（サーバーサイドトークン検証）
- 🔜 レート制限
- 🔜 監査ログ
- 🔜 CSRFトークン

## 📈 パフォーマンス

### 改善点
- ✅ 正規化されたデータベース → クエリ効率UP
- ✅ インデックス設定 → 高速検索
- ✅ Cloudflare Edge Network → 低レイテンシ
- ✅ D1ローカルモード → 開発速度UP

## 🛠️ トラブルシューティング

### ポート3000が使用中
```bash
# ポートをクリーンアップ
npm run clean-port

# または
fuser -k 3000/tcp
```

### データベースリセット
```bash
# ローカルD1をリセット
npm run db:reset
```

### PM2ログ確認
```bash
# リアルタイムログ
pm2 logs zoomphone-webapp

# 過去50行のログ
pm2 logs zoomphone-webapp --nostream --lines 50
```

## 📝 TODO

- [ ] Firebase Admin SDK統合
- [ ] Excel/CSVインポート機能の実装
- [ ] 案件編集・削除UI
- [ ] グラフ可視化の追加
- [ ] モバイル対応の改善
- [ ] テストコードの追加

## 👥 許可ユーザー

現在のシステムアクセス許可リスト：
- hi-abe@idex.co.jp
- s-mizukami@idex.co.jp
- k-yoshimura@idex.co.jp
- s-yamada@idex.co.jp
- yu-tanaka@idex.co.jp
- t-kusumoto@idex.co.jp
- ma-tashiro@idex.co.jp
- y-hara@idex.co.jp
- m-maeda@idex.co.jp
- m-tashiro@idex.co.jp
- t-iwanaga@idex.co.jp
- k-tsuru@idex.co.jp

## 📄 ライセンス

社内使用専用

---

## 🔗 公開URL

**サンドボックス開発環境**: https://3000-ijz0yod8dxtsy5iq1w4h0-c81df28e.sandbox.novita.ai

**本番環境**: （デプロイ後に更新）

---

**最終更新**: 2026-01-14
**バージョン**: 2.0.0
