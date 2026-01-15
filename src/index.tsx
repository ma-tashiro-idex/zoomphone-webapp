import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env, DealCreateInput, DealUpdateInput } from './types';
import {
  getAllDeals,
  getDealByCustomerName,
  createDeal,
  updateDeal,
  deleteDeal,
  getDashboardStats,
  isEmailAllowed
} from './db';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

// Serve diagnostic page (read file directly)
app.get('/diagnose', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>診断ページ - ZoomPhone v2.0</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #1a202c; color: #e2e8f0; padding: 20px; margin: 0; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #48bb78; border-bottom: 2px solid #48bb78; padding-bottom: 10px; }
        h2 { color: #4299e1; margin-top: 30px; }
        .test-section { background: #2d3748; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-left: 10px; }
        .status.ok { background: #48bb78; color: white; }
        .status.error { background: #fc8181; color: white; }
        .status.pending { background: #fbbf24; color: #1a202c; }
        pre { background: #1a202c; padding: 15px; border-radius: 5px; overflow-x: auto; border-left: 4px solid #4299e1; }
        button { background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin: 5px; }
        button:hover { background: #3182ce; }
        .link { color: #4299e1; text-decoration: none; }
        .link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 ZoomPhone v2.0 システム診断</h1>
        
        <div class="test-section">
            <h2>📍 環境情報</h2>
            <p><strong>現在のURL:</strong> <span id="currentUrl"></span></p>
            <p><strong>ホスト名:</strong> <span id="hostname"></span></p>
            <p><strong>プロトコル:</strong> <span id="protocol"></span></p>
        </div>

        <div class="test-section">
            <h2>🌐 API接続テスト</h2>
            <div id="apiTest">
                <span class="status pending">テスト中...</span>
                <button onclick="testAPI()">再テスト</button>
            </div>
            <pre id="apiResult">テスト実行中...</pre>
        </div>

        <div class="test-section">
            <h2>🚀 アクセス方法</h2>
            <p><strong>通常モード:</strong> <a class="link" href="/" target="_blank">メインページ</a></p>
            <p><strong>テストモード:</strong> <a class="link" href="/?test=true" target="_blank">認証バイパス</a></p>
            <button onclick="window.location.href='/?test=true'" style="padding: 15px 30px; font-size: 16px; margin-top: 10px;">
                🧪 テストモードで起動
            </button>
        </div>
        
        <div class="test-section">
            <h2>🐛 ボタンテスト</h2>
            <p>このボタンをクリックして、JavaScriptが動作するか確認してください：</p>
            <button onclick="alert('✅ JavaScriptは正常に動作しています！')">
                ボタン動作テスト
            </button>
            <button onclick="testConsole()">
                コンソールログテスト
            </button>
        </div>
    </div>

    <script>
        document.getElementById('currentUrl').textContent = window.location.href;
        document.getElementById('hostname').textContent = window.location.hostname;
        document.getElementById('protocol').textContent = window.location.protocol;
        
        function testConsole() {
            console.log('✅ コンソールログテスト成功');
            alert('コンソールを確認してください（F12キー）');
        }
        
        async function testAPI() {
            const container = document.getElementById('apiTest');
            const result = document.getElementById('apiResult');
            
            container.innerHTML = '<span class="status pending">テスト中...</span>';
            result.textContent = 'APIに接続中...';
            
            try {
                const response = await fetch('/api/stats?email=hi-abe@idex.co.jp');
                const data = await response.json();
                
                if (response.ok && data.success) {
                    container.innerHTML = '<span class="status ok">成功 ✅</span>';
                    result.textContent = JSON.stringify(data, null, 2);
                } else {
                    container.innerHTML = '<span class="status error">失敗 ❌</span>';
                    result.textContent = JSON.stringify(data, null, 2);
                }
            } catch (error) {
                container.innerHTML = '<span class="status error">エラー ❌</span>';
                result.textContent = 'エラー: ' + error.message;
            }
        }
        
        // 自動テスト実行
        console.log('🔍 診断ページ読み込み完了');
        testAPI();
    </script>
</body>
</html>`);
});

// Simple authentication middleware (checks email in query/header)
// In production, use Firebase Admin SDK for proper token verification
app.use('/api/*', async (c, next) => {
  const authEmail = c.req.header('X-User-Email') || c.req.query('email');
  
  if (!authEmail) {
    return c.json({ error: '認証が必要です' }, 401);
  }

  const allowed = await isEmailAllowed(c.env.DB, authEmail);
  if (!allowed) {
    return c.json({ error: 'アクセス権限がありません' }, 403);
  }

  // Store user email in context for later use
  c.set('userEmail', authEmail);
  await next();
});

// API Routes

/**
 * GET /api/deals - Get all deals
 */
app.get('/api/deals', async (c) => {
  try {
    const fiscalYear = c.req.query('fiscalYear');
    const year = fiscalYear ? parseInt(fiscalYear) : undefined;
    const deals = await getAllDeals(c.env.DB, year);
    return c.json({ success: true, data: deals });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return c.json({ success: false, error: 'データの取得に失敗しました' }, 500);
  }
});

/**
 * GET /api/deals/:customerName - Get specific deal
 */
/**
 * GET /api/deals/:id - Get deal by ID (numeric)
 */
app.get('/api/deals/:id{[0-9]+}', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const deal = await c.env.DB.prepare(`
      SELECT d.*, 
             GROUP_CONCAT(l.license_type || '|' || l.license_count) as licenses_data
      FROM deals d
      LEFT JOIN licenses l ON d.id = l.deal_id
      WHERE d.id = ?
      GROUP BY d.id
    `).bind(id).first();
    
    if (!deal) {
      return c.json({ success: false, error: '案件が見つかりません' }, 404);
    }
    
    // Parse licenses
    const licenses = [];
    if (deal.licenses_data) {
      const licensesArray = deal.licenses_data.split(',');
      for (const licenseStr of licensesArray) {
        const [type, count] = licenseStr.split('|');
        licenses.push({
          license_type: type,
          license_count: parseInt(count)
        });
      }
    }
    
    return c.json({
      success: true,
      data: {
        id: deal.id,
        customer_name: deal.customer_name,
        sales_rep: deal.sales_rep,
        deal_date: deal.deal_date,
        status: deal.status,
        source: deal.source,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        licenses: licenses
      }
    });
  } catch (error) {
    console.error('Error fetching deal by ID:', error);
    return c.json({ success: false, error: 'データの取得に失敗しました' }, 500);
  }
});

/**
 * GET /api/deals/:customerName - Get deal by customer name
 */
app.get('/api/deals/:customerName', async (c) => {
  try {
    const customerName = c.req.param('customerName');
    const deal = await getDealByCustomerName(c.env.DB, customerName);
    
    if (!deal) {
      return c.json({ success: false, error: '案件が見つかりません' }, 404);
    }
    
    return c.json({ success: true, data: deal });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return c.json({ success: false, error: 'データの取得に失敗しました' }, 500);
  }
});

/**
 * POST /api/deals - Create new deal
 */
app.post('/api/deals', async (c) => {
  try {
    const input = await c.req.json<DealCreateInput>();
    
    // Validation
    if (!input.customer_name || !input.sales_rep || !input.status) {
      return c.json({ success: false, error: '必須項目が不足しています' }, 400);
    }
    
    // 成約の場合は成約日が必須
    if (input.status === '成約' && !input.closed_date) {
      return c.json({ success: false, error: '成約日が必要です' }, 400);
    }
    
    if (!input.licenses || input.licenses.length === 0) {
      return c.json({ success: false, error: '最低1つのライセンスが必要です' }, 400);
    }
    
    const deal = await createDeal(c.env.DB, input);
    return c.json({ success: true, data: deal }, 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    const message = error instanceof Error ? error.message : '案件の登録に失敗しました';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * PUT /api/deals/:id - Update existing deal
 */
app.put('/api/deals/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const input = await c.req.json<Omit<DealUpdateInput, 'id'>>();
    
    // Validation
    if (!input.customer_name || !input.sales_rep || !input.status) {
      return c.json({ success: false, error: '必須項目が不足しています' }, 400);
    }
    
    // 成約の場合は成約日が必須
    if (input.status === '成約' && !input.closed_date) {
      return c.json({ success: false, error: '成約日が必要です' }, 400);
    }
    
    if (!input.licenses || input.licenses.length === 0) {
      return c.json({ success: false, error: '最低1つのライセンスが必要です' }, 400);
    }
    
    const deal = await updateDeal(c.env.DB, { ...input, id });
    return c.json({ success: true, data: deal });
  } catch (error) {
    console.error('Error updating deal:', error);
    const message = error instanceof Error ? error.message : '案件の更新に失敗しました';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * DELETE /api/deals/:customerName - Delete deal
 */
/**
 * DELETE /api/deals/:id - Delete deal by ID (numeric)
 */
app.delete('/api/deals/:id{[0-9]+}', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    // Delete licenses first (foreign key constraint)
    await c.env.DB.prepare('DELETE FROM licenses WHERE deal_id = ?').bind(id).run();
    
    // Delete deal
    const result = await c.env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
      return c.json({ success: false, error: '案件が見つかりません' }, 404);
    }
    
    return c.json({ success: true, message: '案件を削除しました' });
  } catch (error) {
    console.error('Error deleting deal by ID:', error);
    return c.json({ success: false, error: '案件の削除に失敗しました' }, 500);
  }
});

/**
 * DELETE /api/deals/:customerName - Delete deal by customer name
 */
app.delete('/api/deals/:customerName', async (c) => {
  try {
    const customerName = c.req.param('customerName');
    const success = await deleteDeal(c.env.DB, customerName);
    
    if (!success) {
      return c.json({ success: false, error: '案件が見つかりません' }, 404);
    }
    
    return c.json({ success: true, message: '案件を削除しました' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return c.json({ success: false, error: '案件の削除に失敗しました' }, 500);
  }
});

/**
 * GET /api/stats - Get dashboard statistics
 */
app.get('/api/stats', async (c) => {
  try {
    const filter = c.req.query('filter') as '見込み' | '成約' | undefined;
    const fiscalYear = c.req.query('fiscal_year');
    const year = fiscalYear ? parseInt(fiscalYear) : undefined;
    const stats = await getDashboardStats(c.env.DB, filter, year);
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: '統計データの取得に失敗しました' }, 500);
  }
});

/**
 * GET /api/sales-reps - Get unique sales representatives
 */
app.get('/api/sales-reps', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT DISTINCT sales_rep FROM deals ORDER BY sales_rep
    `).all<{ sales_rep: string }>();
    
    const reps = result.results?.map(r => r.sales_rep) || [];
    return c.json({ success: true, data: reps });
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    return c.json({ success: false, error: 'データの取得に失敗しました' }, 500);
  }
});

// Default route - serve main HTML
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZoomPhone 目標達成管理システム v2.0</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    
    <link href="/static/styles.css" rel="stylesheet">
    
    <script>
        // デバッグ: ページロード時の情報
        console.log('📄 HTMLページ読み込み開始');
        console.log('🌐 URL:', window.location.href);
        console.log('📍 Hostname:', window.location.hostname);
    </script>
</head>
<body>
    <!-- Firebase認証画面 -->
    <div id="authContainer" class="auth-container">
        <div class="auth-card">
            <div class="auth-logo">📞</div>
            <h2 class="auth-title">ZoomPhone管理システム v2.0</h2>
            <p class="auth-subtitle">Googleアカウントでログインしてください</p>
            <button class="auth-btn" onclick="loginWithGoogle()">
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
            </button>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #a0aec0; margin-bottom: 10px;">
                    ⚠️ Firebaseのドメイン認証エラーが発生する場合
                </p>
                <a href="?test=true" style="display: inline-block; padding: 10px 20px; background: #f7fafc; 
                   border: 2px solid #e2e8f0; border-radius: 8px; color: #4a5568; text-decoration: none; 
                   font-size: 14px; font-weight: 600; transition: all 0.3s;">
                    🧪 テストモードで起動
                </a>
            </div>
        </div>
    </div>
    
    <div id="mainContent" style="display: none;">
        <div class="container">
            <div id="app">
                <p style="text-align: center; padding: 50px; color: #718096;">
                    Loading...
                </p>
            </div>
        </div>
    </div>
    
    <script>
        // デバッグ: スクリプト読み込み確認
        console.log('📦 メインスクリプトタグに到達');
        
        // Firebase SDK読み込み確認
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDKが読み込まれていません！');
            alert('エラー: Firebase SDKの読み込みに失敗しました。\\n\\nインターネット接続を確認してください。');
        } else {
            console.log('✅ Firebase SDK読み込み完了');
        }
        
        // app.js読み込み前の確認
        console.log('📥 app.js読み込み開始...');
    </script>
    <script src="/static/app.js"></script>
    <script>
        // app.js読み込み後の確認
        console.log('✅ app.js読み込み完了');
        
        // グローバル関数の存在確認
        if (typeof window.loginWithGoogle === 'function') {
            console.log('✅ loginWithGoogle関数が利用可能');
        } else {
            console.error('❌ loginWithGoogle関数が見つかりません！');
        }
        
        if (typeof window.logout === 'function') {
            console.log('✅ logout関数が利用可能');
        } else {
            console.error('❌ logout関数が見つかりません！');
        }
    </script>
</body>
</html>
  `);
});

export default app;
