// ZoomPhone Management System v2.0 - Frontend Application

// Firebase Configuration
// NOTE: This is the PUBLIC configuration - safe to expose in frontend
const firebaseConfig = {
    apiKey: "AIzaSyC9R1mrbITko-REhh_El8ztRrnSM3-46fo",
    authDomain: "zoomphone-8eb29.firebaseapp.com",
    projectId: "zoomphone-8eb29"
};

console.log('🔥 Firebase初期化中...');
console.log('📍 現在のドメイン:', window.location.hostname);
console.log('🌐 完全なURL:', window.location.href);

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase初期化成功');
} catch (error) {
    console.error('❌ Firebase初期化エラー:', error);
    alert('Firebase初期化に失敗しました: ' + error.message);
}

const auth = firebase.auth();
console.log('🔐 Firebase Auth初期化完了');

let currentUser = null;
let currentUserEmail = null;
let isTestMode = false;

// Store all deals for filtering
let allDeals = [];

// API base URL
const API_BASE = '/api';

// Google Login (グローバルスコープに露出)
window.loginWithGoogle = function() {
    console.log('ログイン処理開始...');
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Force account selection
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('✅ ログイン成功:', result.user.email);
        })
        .catch((error) => {
            console.error('❌ ログインエラー:', error);
            console.error('エラーコード:', error.code);
            console.error('エラーメッセージ:', error.message);
            
            let errorMessage = 'ログインに失敗しました。';
            
            if (error.code === 'auth/unauthorized-domain') {
                errorMessage = '⚠️ このドメインはFirebaseで認証されていません。\n\n' +
                    '開発者へ: Firebase Console > Authentication > Settings > Authorized domains に以下を追加してください:\n' +
                    window.location.hostname;
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください。';
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'ログインがキャンセルされました。';
            } else {
                errorMessage += '\n\nエラー: ' + error.message;
            }
            
            alert(errorMessage);
        });
}

// Logout (グローバルスコープに露出)
window.logout = function() {
    if (confirm('ログアウトしますか?')) {
        auth.signOut();
    }
}

// Auth state observer
auth.onAuthStateChanged(user => {
    // テストモードの場合はFirebase認証を無視
    if (isTestMode) {
        console.log('🧪 テストモード: Firebase認証を無視');
        return;
    }
    
    console.log('🔐 認証状態変更:', user ? user.email : 'ログアウト');
    
    if (user) {
        currentUser = user;
        currentUserEmail = user.email;
        
        console.log('✅ ユーザー認証済み:', user.email);
        console.log('📧 アクセス権限確認中...');
        
        // Verify access permission with backend
        verifyAccess(user.email).then(allowed => {
            console.log('🔍 アクセス権限結果:', allowed);
            
            if (!allowed) {
                console.warn('⚠️ アクセス権限なし:', user.email);
                alert('⚠️ アクセス権限がありません\n\nこのアカウント（' + user.email + '）にはシステムへのアクセス権限が付与されていません。\n\n管理者に問い合わせてください。');
                auth.signOut();
                return;
            }
            
            console.log('✅ アクセス許可:', user.email);
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            // Add user info to header
            const header = document.querySelector('header h1');
            if (header && !document.getElementById('userInfo')) {
                const userInfo = document.createElement('span');
                userInfo.id = 'userInfo';
                userInfo.className = 'user-info';
                userInfo.innerHTML = '<div class="user-avatar">' + user.email.charAt(0).toUpperCase() + '</div>' +
                    '<span>' + user.email + '</span>' +
                    '<button class="logout-btn" onclick="logout()">ログアウト</button>';
                header.appendChild(userInfo);
            }
            
            console.log('📊 ダッシュボード読み込み開始...');
            // Load dashboard
            loadDashboard();
        }).catch(error => {
            console.error('❌ アクセス権限確認エラー:', error);
            alert('アクセス権限の確認に失敗しました: ' + error.message);
            auth.signOut();
        });
    } else {
        console.log('❌ 未認証状態');
        currentUser = null;
        currentUserEmail = null;
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
    }
});

// Verify access permission
async function verifyAccess(email) {
    try {
        const response = await fetch(API_BASE + '/deals?email=' + encodeURIComponent(email));
        return response.ok;
    } catch (error) {
        console.error('Access verification failed:', error);
        return false;
    }
}

// API helper function
async function apiCall(endpoint, options = {}) {
    console.log('📞 apiCall開始:', endpoint);
    console.log('📧 currentUserEmail:', currentUserEmail);
    
    if (!currentUserEmail) {
        console.error('❌ currentUserEmailが未設定！');
        throw new Error('認証が必要です');
    }
    
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.append('email', currentUserEmail);
    
    console.log('🌐 リクエストURL:', url.toString());
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-User-Email': currentUserEmail,
            ...options.headers
        }
    });
    
    console.log('📥 レスポンスステータス:', response.status);
    
    const data = await response.json();
    
    if (!response.ok) {
        console.error('❌ APIエラー:', data.error);
        throw new Error(data.error || 'リクエストに失敗しました');
    }
    
    console.log('✅ API成功:', endpoint);
    return data;
}

// Load dashboard
async function loadDashboard() {
    const appContainer = document.getElementById('app');
    
    try {
        // Fetch stats
        const statsResponse = await apiCall(API_BASE + '/stats');
        const stats = statsResponse.data;
        
        // Fetch deals
        const dealsResponse = await apiCall(API_BASE + '/deals');
        const deals = dealsResponse.data;
        
        // Store all deals for filtering
        allDeals = deals;
        
        // Render dashboard HTML
        let html = '<div class="card">';
        html += '<h2>📊 ダッシュボード - 2025年度</h2>';
        
        // Statistics
        html += '<div class="stats-grid">';
        html += '<div class="stat-card" style="background: linear-gradient(135deg, #63b3ed 0%, #4299e1 100%);">';
        html += '<div class="stat-label">🎯 年間目標（KPI）</div>';
        html += '<div class="stat-value">1,000</div>';
        html += '<div class="stat-unit">ライセンス</div>';
        html += '</div>';
        
        html += '<div class="stat-card">';
        html += '<div class="stat-label">成約ライセンス数</div>';
        html += '<div class="stat-value">' + stats.confirmed_licenses + '</div>';
        html += '<div class="stat-unit">ライセンス</div>';
        html += '</div>';
        
        html += '<div class="stat-card">';
        html += '<div class="stat-label">見込みライセンス数</div>';
        html += '<div class="stat-value">' + stats.prospect_licenses + '</div>';
        html += '<div class="stat-unit">ライセンス</div>';
        html += '</div>';
        
        html += '<div class="stat-card">';
        html += '<div class="stat-label">達成率</div>';
        html += '<div class="stat-value">' + stats.achievement_rate + '%</div>';
        html += '<div class="stat-unit">（見込み＋成約）</div>';
        html += '</div>';
        
        html += '<div class="stat-card">';
        html += '<div class="stat-label">目標達成まであと</div>';
        html += '<div class="stat-value">' + stats.remaining_target + '</div>';
        html += '<div class="stat-unit">ライセンス</div>';
        html += '</div>';
        
        html += '<div class="stat-card">';
        html += '<div class="stat-label">案件数</div>';
        html += '<div class="stat-value">' + deals.length + '</div>';
        html += '<div class="stat-unit">件</div>';
        html += '</div>';
        html += '</div>';
        
        // Progress Bar
        const progressWidth = Math.min(stats.achievement_rate, 100);
        html += '<div class="progress-bar">';
        html += '<div class="progress-fill" style="width: ' + progressWidth + '%">';
        html += stats.achievement_rate + '%';
        html += '</div>';
        html += '</div>';
        
        // Search and Filter Section
        html += '<div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">';
        html += '<h3 style="margin-top: 0; margin-bottom: 15px; color: #2d3748;">🔍 検索・フィルター</h3>';
        
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">';
        
        // Search by customer name
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; font-size: 14px;">顧客名検索</label>';
        html += '<input type="text" id="searchCustomer" placeholder="顧客名を入力..." onkeyup="applyFilters()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '</div>';
        
        // Filter by sales rep
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; font-size: 14px;">営業担当者</label>';
        html += '<select id="filterSalesRep" onchange="applyFilters()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '<option value="">すべて</option>';
        html += '<option value="山田">山田</option>';
        html += '<option value="阿部">阿部</option>';
        html += '</select>';
        html += '</div>';
        
        // Filter by status
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; font-size: 14px;">ステータス</label>';
        html += '<select id="filterStatus" onchange="applyFilters()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '<option value="">すべて</option>';
        html += '<option value="見込み">見込み</option>';
        html += '<option value="成約">成約</option>';
        html += '</select>';
        html += '</div>';
        
        // Date range filter
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; font-size: 14px;">登録日（開始）</label>';
        html += '<input type="date" id="filterDateFrom" onchange="applyFilters()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '</div>';
        
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; font-size: 14px;">登録日（終了）</label>';
        html += '<input type="date" id="filterDateTo" onchange="applyFilters()" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '</div>';
        
        html += '</div>';
        
        // Clear filters and results count
        html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
        html += '<div id="filterResults" style="color: #718096; font-size: 14px;">表示件数: ' + deals.length + '件 / 全' + deals.length + '件</div>';
        html += '<button onclick="clearFilters()" style="background: #e2e8f0; color: #2d3748; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">';
        html += '🔄 フィルタークリア';
        html += '</button>';
        html += '</div>';
        
        html += '</div>';
        
        // Deals List with Add, Import, Export, Template Buttons
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px; margin-bottom: 15px;">';
        html += '<h3 style="margin: 0; color: #2d3748;">💼 案件一覧</h3>';
        html += '<div style="display: flex; gap: 10px; flex-wrap: wrap;">';
        html += '<button onclick="downloadTemplate()" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        html += '📄 テンプレートDL';
        html += '</button>';
        html += '<button onclick="exportToCSV()" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        html += '📤 CSVエクスポート';
        html += '</button>';
        html += '<button onclick="showImportModal()" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        html += '📥 インポート';
        html += '</button>';
        html += '<button onclick="showAddDealModal()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        html += '➕ 新規追加';
        html += '</button>';
        html += '</div>';
        html += '</div>';
        
        html += '<div id="dealsList">';
        
        if (deals.length === 0) {
            html += '<p class="loading">まだ案件が登録されていません</p>';
        } else {
            deals.forEach(function(deal) {
                html += renderDealItem(deal);
            });
        }
        
        html += '</div>';
        html += '</div>';
        
        appContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        appContainer.innerHTML = '<div class="card"><div class="error">❌ データの読み込みに失敗しました: ' + error.message + '</div></div>';
    }
}

// Render deal item
function renderDealItem(deal) {
    const totalLicenses = deal.licenses.reduce(function(sum, l) { return sum + l.license_count; }, 0);
    const licenseDetails = deal.licenses.map(function(l) { return l.license_type + ' × ' + l.license_count; }).join(', ');
    const date = new Date(deal.deal_date).toLocaleDateString('ja-JP');
    const statusColor = deal.status === '成約' ? '#48bb78' : '#4299e1';
    const statusBg = deal.status === '成約' ? '#c6f6d5' : '#bee3f8';
    const statusTextColor = deal.status === '成約' ? '#22543d' : '#2c5282';
    
    let html = '<div class="card" style="margin-bottom: 15px; border-left: 4px solid ' + statusColor + ';">';
    html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-weight: 600; color: #2d3748; margin-bottom: 8px; font-size: 18px;">';
    html += deal.customer_name + ' ';
    html += '<span style="display: inline-block; background: ' + statusBg + '; color: ' + statusTextColor + '; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 8px;">';
    html += deal.status;
    html += '</span>';
    html += '<span style="display: inline-block; background: #e9d8fd; color: #553c9a; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 8px;">';
    html += deal.sales_rep;
    html += '</span>';
    html += '</div>';
    html += '<div style="color: #718096; font-size: 14px; margin-bottom: 4px;">';
    html += '📦 合計: <strong>' + totalLicenses + 'ライセンス</strong>';
    html += '</div>';
    html += '<div style="color: #a0aec0; font-size: 13px; margin-bottom: 4px;">';
    html += licenseDetails;
    html += '</div>';
    html += '<div style="color: #a0aec0; font-size: 12px;">';
    html += '📅 登録日: ' + date;
    html += '</div>';
    html += '</div>';
    
    // Action buttons
    html += '<div style="display: flex; gap: 8px;">';
    html += '<button onclick="editDeal(' + deal.id + ')" style="background: #4299e1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">';
    html += '✏️ 編集';
    html += '</button>';
    html += '<button onclick="deleteDeal(' + deal.id + ', \'' + deal.customer_name.replace(/'/g, "\\'") + '\')" style="background: #f56565; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">';
    html += '🗑️ 削除';
    html += '</button>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// Initialize on page load
console.log('ZoomPhone Management System v2.0 - Frontend loaded');

// テストモード: URLに ?test=true がある場合は認証をバイパス
if (window.location.search.includes('test=true')) {
    isTestMode = true;
    console.log('🧪 テストモード有効');
    console.log('⚠️ 認証をバイパスしています（開発用）');
    
    // テスト用のメールアドレスを設定
    currentUserEmail = 'hi-abe@idex.co.jp';
    console.log('📧 テストユーザー設定:', currentUserEmail);
    
    // DOM準備完了後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM準備完了');
            initTestMode();
        });
    } else {
        console.log('📄 DOM既に準備完了');
        initTestMode();
    }
}

function initTestMode() {
    console.log('🔧 テストモード初期化開始...');
    console.log('📧 currentUserEmail:', currentUserEmail);
    
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    
    const header = document.querySelector('header h1');
    if (header && !document.getElementById('userInfo')) {
        const userInfo = document.createElement('span');
        userInfo.id = 'userInfo';
        userInfo.className = 'user-info';
        userInfo.innerHTML = '<div class="user-avatar">T</div>' +
            '<span>テストモード (' + currentUserEmail + ')</span>' +
            '<button class="logout-btn" onclick="location.href=location.pathname">終了</button>';
        header.appendChild(userInfo);
    }
    
    console.log('📊 ダッシュボード読み込み開始...');
    loadDashboard();
}

console.log('✅ loginWithGoogle関数が利用可能:', typeof window.loginWithGoogle === 'function');
console.log('✅ logout関数が利用可能:', typeof window.logout === 'function');

// ===== CRUD Functions =====

// Show add deal modal
window.showAddDealModal = function() {
    const modalHtml = `
        <div id="dealModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin-top: 0; color: #2d3748;">➕ 新規案件追加</h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">顧客名 *</label>
                    <input type="text" id="customerName" placeholder="例: 株式会社サンプル" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">営業担当者 *</label>
                    <select id="salesRep" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                        <option value="">選択してください</option>
                        <option value="山田">山田</option>
                        <option value="阿部">阿部</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">登録日 *</label>
                    <input type="date" id="dealDate" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">ステータス *</label>
                    <select id="dealStatus" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                        <option value="見込み">見込み</option>
                        <option value="成約">成約</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; color: #4a5568; font-weight: 600;">ライセンス情報 *</label>
                    <div id="licenseRows"></div>
                    <button onclick="addLicenseRow()" style="background: #48bb78; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                        ➕ ライセンス追加
                    </button>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="closeModal()" style="background: #cbd5e0; color: #2d3748; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        キャンセル
                    </button>
                    <button onclick="saveDeal()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set today's date as default
    document.getElementById('dealDate').valueAsDate = new Date();
    
    // Add initial license row
    addLicenseRow();
}

// Add license row
window.addLicenseRow = function() {
    const container = document.getElementById('licenseRows');
    const rowId = 'license_' + Date.now();
    
    const rowHtml = `
        <div id="${rowId}" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <select class="licenseType" style="flex: 2; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                <option value="">種別を選択</option>
                <option value="無制限(0ABJ)">無制限(0ABJ)</option>
                <option value="無制限(050)">無制限(050)</option>
                <option value="従量制(0ABJ)">従量制(0ABJ)</option>
                <option value="従量制(050)">従量制(050)</option>
                <option value="従量制">従量制</option>
                <option value="内線のみ">内線のみ</option>
            </select>
            <input type="number" class="licenseCount" placeholder="数量" min="1" style="flex: 1; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
            <button onclick="removeLicenseRow('${rowId}')" style="background: #f56565; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                🗑️
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHtml);
}

// Remove license row
window.removeLicenseRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

// Close modal
window.closeModal = function() {
    const modal = document.getElementById('dealModal');
    if (modal) {
        modal.remove();
    }
}

// Save deal
window.saveDeal = async function() {
    try {
        // Get form values
        const customerName = document.getElementById('customerName').value.trim();
        const salesRep = document.getElementById('salesRep').value;
        const dealDate = document.getElementById('dealDate').value;
        const status = document.getElementById('dealStatus').value;
        
        // Validate
        if (!customerName || !salesRep || !dealDate) {
            alert('顧客名、営業担当者、登録日は必須です');
            return;
        }
        
        // Get licenses
        const licenseTypes = document.querySelectorAll('.licenseType');
        const licenseCounts = document.querySelectorAll('.licenseCount');
        const licenses = [];
        
        for (let i = 0; i < licenseTypes.length; i++) {
            const type = licenseTypes[i].value;
            const count = parseInt(licenseCounts[i].value);
            
            if (type && count > 0) {
                licenses.push({
                    license_type: type,
                    license_count: count
                });
            }
        }
        
        if (licenses.length === 0) {
            alert('少なくとも1つのライセンス情報を入力してください');
            return;
        }
        
        // Save to API
        console.log('📝 案件保存中...');
        await apiCall(API_BASE + '/deals', {
            method: 'POST',
            body: JSON.stringify({
                customer_name: customerName,
                sales_rep: salesRep,
                deal_date: dealDate,
                status: status,
                licenses: licenses
            })
        });
        
        console.log('✅ 案件保存成功');
        alert('✅ 案件を追加しました');
        
        // Close modal and reload dashboard
        closeModal();
        loadDashboard();
        
    } catch (error) {
        console.error('❌ 案件保存エラー:', error);
        alert('❌ 案件の保存に失敗しました: ' + error.message);
    }
}

// Edit deal
window.editDeal = async function(dealId) {
    try {
        console.log('📝 案件編集: ID=' + dealId);
        
        // Fetch deal details
        const response = await apiCall(API_BASE + '/deals/' + dealId);
        const deal = response.data;
        
        console.log('📄 案件データ取得:', deal);
        
        // Show edit modal (similar to add modal but with pre-filled data)
        const modalHtml = `
            <div id="dealModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <h2 style="margin-top: 0; color: #2d3748;">✏️ 案件編集</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">顧客名 *</label>
                        <input type="text" id="customerName" value="${deal.customer_name}" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">営業担当者 *</label>
                        <select id="salesRep" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                            <option value="山田" ${deal.sales_rep === '山田' ? 'selected' : ''}>山田</option>
                            <option value="阿部" ${deal.sales_rep === '阿部' ? 'selected' : ''}>阿部</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">登録日 *</label>
                        <input type="date" id="dealDate" value="${deal.deal_date}" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600;">ステータス *</label>
                        <select id="dealStatus" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">
                            <option value="見込み" ${deal.status === '見込み' ? 'selected' : ''}>見込み</option>
                            <option value="成約" ${deal.status === '成約' ? 'selected' : ''}>成約</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #4a5568; font-weight: 600;">ライセンス情報 *</label>
                        <div id="licenseRows"></div>
                        <button onclick="addLicenseRow()" style="background: #48bb78; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                            ➕ ライセンス追加
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeModal()" style="background: #cbd5e0; color: #2d3748; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            キャンセル
                        </button>
                        <button onclick="updateDeal(${dealId})" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            更新
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add existing licenses
        deal.licenses.forEach(function(license) {
            addLicenseRow();
            const lastRow = document.getElementById('licenseRows').lastElementChild;
            lastRow.querySelector('.licenseType').value = license.license_type;
            lastRow.querySelector('.licenseCount').value = license.license_count;
        });
        
    } catch (error) {
        console.error('❌ 案件取得エラー:', error);
        alert('❌ 案件の取得に失敗しました: ' + error.message);
    }
}

// Update deal
window.updateDeal = async function(dealId) {
    try {
        // Get form values
        const customerName = document.getElementById('customerName').value.trim();
        const salesRep = document.getElementById('salesRep').value;
        const dealDate = document.getElementById('dealDate').value;
        const status = document.getElementById('dealStatus').value;
        
        // Validate
        if (!customerName || !salesRep || !dealDate) {
            alert('顧客名、営業担当者、登録日は必須です');
            return;
        }
        
        // Get licenses
        const licenseTypes = document.querySelectorAll('.licenseType');
        const licenseCounts = document.querySelectorAll('.licenseCount');
        const licenses = [];
        
        for (let i = 0; i < licenseTypes.length; i++) {
            const type = licenseTypes[i].value;
            const count = parseInt(licenseCounts[i].value);
            
            if (type && count > 0) {
                licenses.push({
                    license_type: type,
                    license_count: count
                });
            }
        }
        
        if (licenses.length === 0) {
            alert('少なくとも1つのライセンス情報を入力してください');
            return;
        }
        
        // Update via API
        console.log('📝 案件更新中...');
        await apiCall(API_BASE + '/deals/' + dealId, {
            method: 'PUT',
            body: JSON.stringify({
                customer_name: customerName,
                sales_rep: salesRep,
                deal_date: dealDate,
                status: status,
                licenses: licenses
            })
        });
        
        console.log('✅ 案件更新成功');
        alert('✅ 案件を更新しました');
        
        // Close modal and reload dashboard
        closeModal();
        loadDashboard();
        
    } catch (error) {
        console.error('❌ 案件更新エラー:', error);
        alert('❌ 案件の更新に失敗しました: ' + error.message);
    }
}

// Delete deal
window.deleteDeal = async function(dealId, customerName) {
    if (!confirm('本当に「' + customerName + '」の案件を削除しますか？\n\nこの操作は取り消せません。')) {
        return;
    }
    
    try {
        console.log('🗑️ 案件削除中: ID=' + dealId);
        
        await apiCall(API_BASE + '/deals/' + dealId, {
            method: 'DELETE'
        });
        
        console.log('✅ 案件削除成功');
        alert('✅ 案件を削除しました');
        
        // Reload dashboard
        loadDashboard();
        
    } catch (error) {
        console.error('❌ 案件削除エラー:', error);
        alert('❌ 案件の削除に失敗しました: ' + error.message);
    }
}

// ===== Excel/CSV Import Functions =====

// Show import modal
window.showImportModal = function() {
    const modalHtml = `
        <div id="importModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin-top: 0; color: #2d3748;">📥 Excel/CSVインポート</h2>
                
                <div id="uploadArea" style="border: 3px dashed #cbd5e0; border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 20px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#4299e1'; this.style.background='#ebf8ff'" onmouseout="this.style.borderColor='#cbd5e0'; this.style.background='white'">
                    <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;" onchange="handleFileSelect(event)">
                    <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
                    <h3 style="color: #2d3748; margin-bottom: 10px;">ファイルをドラッグ&ドロップ</h3>
                    <p style="color: #718096; margin-bottom: 15px;">または</p>
                    <button onclick="document.getElementById('fileInput').click()" style="background: #4299e1; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📂 ファイルを選択
                    </button>
                    <p style="color: #a0aec0; font-size: 14px; margin-top: 15px;">対応形式: .xlsx, .xls, .csv</p>
                </div>
                
                <div id="previewArea" style="display: none;">
                    <h3 style="color: #2d3748; margin-bottom: 15px;">📋 データプレビュー</h3>
                    <div id="previewTable" style="overflow-x: auto; max-height: 400px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"></div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeImportModal()" style="background: #cbd5e0; color: #2d3748; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            キャンセル
                        </button>
                        <button onclick="importData()" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            📥 インポート実行
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;" id="closeOnlyButton">
                    <button onclick="closeImportModal()" style="background: #cbd5e0; color: #2d3748; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Setup drag and drop
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Close import modal
window.closeImportModal = function() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.remove();
    }
}

// Store parsed data globally
let parsedImportData = [];

// Handle file select
window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file
function handleFile(file) {
    console.log('📄 ファイル処理開始:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let data;
            
            if (file.name.endsWith('.csv')) {
                // CSV parsing
                data = parseCSV(e.target.result);
            } else {
                // Excel parsing
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            }
            
            console.log('✅ ファイル解析完了:', data.length + '行');
            parseImportData(data);
            
        } catch (error) {
            console.error('❌ ファイル解析エラー:', error);
            alert('ファイルの解析に失敗しました: ' + error.message);
        }
    };
    
    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

// Parse CSV
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    
    for (let line of lines) {
        if (line.trim()) {
            result.push(line.split(',').map(cell => cell.trim()));
        }
    }
    
    return result;
}

// Parse import data
function parseImportData(data) {
    if (data.length < 2) {
        alert('データが空です');
        return;
    }
    
    console.log('📊 データ解析開始:', data.length + '行');
    
    // このExcelファイルの特殊な構造に対応
    // Row 0-1: ヘッダー情報
    // Row 2-9: ライセンス情報（列1: カテゴリ, 列2: 詳細, 列3: 月額料金, 列4: 契約数）
    
    // Try to detect if this is the ZoomPhone price simulation format
    let isZoomPhoneFormat = false;
    if (data.length > 5 && data[0] && data[0].length > 1) {
        const firstCellText = String(data[0][1] || '').toLowerCase();
        if (firstCellText.includes('zoom') || firstCellText.includes('価格') || firstCellText.includes('シミュレーション')) {
            isZoomPhoneFormat = true;
            console.log('✅ ZoomPhone価格シミュレーション形式を検出');
        }
    }
    
    if (isZoomPhoneFormat) {
        parseZoomPhoneSimulation(data);
    } else {
        // 従来の汎用CSVフォーマット
        parseGenericFormat(data);
    }
}

// Parse ZoomPhone price simulation Excel format
function parseZoomPhoneSimulation(data) {
    console.log('📊 ZoomPhone価格シミュレーション形式の解析');
    
    // Extract customer name from first row (例: "株式会社〇〇〇〇御中　Zoom Phone　価格シミュレーション")
    let customerName = '不明な顧客';
    if (data[0] && data[0][1]) {
        const text = String(data[0][1]);
        const match = text.match(/(.+?)御中/);
        if (match) {
            customerName = match[1].trim();
        } else if (text.includes('株式会社') || text.includes('会社')) {
            customerName = text.split('　')[0].trim();
        }
    }
    
    console.log('👤 顧客名:', customerName);
    
    // Extract licenses from rows 4-9 (無制限0ABJ, 無制限050, 従量制0ABJ, 従量制050, 番号無し, 内線のみ)
    const licenses = [];
    
    // License type mappings
    const licenseMapping = {
        '無制限_0ABJ': '無制限(0ABJ)',
        '無制限_050': '無制限(050)',
        '従量制_0ABJ': '従量制(0ABJ)',
        '従量制_050': '従量制(050)',
        '番号無し': '従量制',
        '内線のみ': '内線のみ'
    };
    
    // Parse rows 4-9
    for (let i = 4; i <= 9; i++) {
        if (!data[i] || data[i].length < 5) continue;
        
        const category = String(data[i][1] || '').trim();
        const detail = String(data[i][2] || '').trim();
        const count = parseInt(data[i][4]);
        
        if (isNaN(count) || count <= 0) continue;
        
        let licenseType = null;
        
        // 無制限
        if (category.includes('無制限')) {
            if (detail.includes('0ABJ')) {
                licenseType = '無制限(0ABJ)';
            } else if (detail.includes('050')) {
                licenseType = '無制限(050)';
            }
        }
        // 従量制
        else if (category.includes('従量')) {
            if (detail.includes('0ABJ')) {
                licenseType = '従量制(0ABJ)';
            } else if (detail.includes('050')) {
                licenseType = '従量制(050)';
            } else if (detail.includes('番号無し')) {
                licenseType = '従量制';
            }
        }
        // 内線のみ
        else if (category.includes('内線')) {
            licenseType = '内線のみ';
        }
        
        if (licenseType) {
            licenses.push({
                license_type: licenseType,
                license_count: count
            });
            console.log('  ✅', licenseType, '×', count);
        }
    }
    
    if (licenses.length === 0) {
        alert('ライセンス情報が見つかりませんでした');
        return;
    }
    
    parsedImportData = [{
        customer_name: customerName,
        sales_rep: '山田', // Default
        deal_date: new Date().toISOString().split('T')[0],
        status: '見込み', // Default
        licenses: licenses
    }];
    
    console.log('✅ 解析完了:', parsedImportData.length + '件');
    showPreview();
}

// Parse generic CSV/Excel format
function parseGenericFormat(data) {
    console.log('📊 汎用CSVフォーマットの解析');
    
    // Find header row (contains "顧客名" or "企業名")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('顧客') || rowStr.includes('企業') || rowStr.includes('会社')) {
            headerRowIndex = i;
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        headerRowIndex = 0;
    }
    
    const headers = data[headerRowIndex];
    console.log('📋 ヘッダー行:', headers);
    
    // Find customer name column
    let customerNameCol = -1;
    for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || '').toLowerCase();
        if (header.includes('顧客') || header.includes('企業') || header.includes('会社')) {
            customerNameCol = i;
            break;
        }
    }
    
    if (customerNameCol === -1) {
        customerNameCol = 0; // Default to first column
    }
    
    console.log('👤 顧客名カラム:', customerNameCol);
    
    // Parse data rows
    parsedImportData = [];
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        
        if (!row || row.length === 0) continue;
        
        const customerName = String(row[customerNameCol] || '').trim();
        if (!customerName) continue;
        
        // Extract license info from remaining columns
        const licenses = [];
        
        for (let j = 0; j < headers.length; j++) {
            if (j === customerNameCol) continue;
            
            const header = String(headers[j] || '').trim();
            const value = row[j];
            
            if (!header || !value) continue;
            
            // Check if this is a license column
            const licenseTypes = ['無制限', '0ABJ', '050', '従量', '内線'];
            let licenseType = null;
            
            for (let type of licenseTypes) {
                if (header.includes(type)) {
                    if (header.includes('0ABJ') && header.includes('無制限')) {
                        licenseType = '無制限(0ABJ)';
                    } else if (header.includes('050') && header.includes('無制限')) {
                        licenseType = '無制限(050)';
                    } else if (header.includes('0ABJ') && header.includes('従量')) {
                        licenseType = '従量制(0ABJ)';
                    } else if (header.includes('050') && header.includes('従量')) {
                        licenseType = '従量制(050)';
                    } else if (header.includes('従量')) {
                        licenseType = '従量制';
                    } else if (header.includes('内線')) {
                        licenseType = '内線のみ';
                    }
                    break;
                }
            }
            
            if (licenseType) {
                const count = parseInt(value);
                if (!isNaN(count) && count > 0) {
                    licenses.push({
                        license_type: licenseType,
                        license_count: count
                    });
                }
            }
        }
        
        if (licenses.length > 0) {
            parsedImportData.push({
                customer_name: customerName,
                sales_rep: '山田', // Default
                deal_date: new Date().toISOString().split('T')[0],
                status: '見込み', // Default
                licenses: licenses
            });
        }
    }
    
    console.log('✅ 解析完了:', parsedImportData.length + '件');
    
    if (parsedImportData.length === 0) {
        alert('インポート可能なデータが見つかりませんでした');
        return;
    }
    
    showPreview();
}

// Show preview
function showPreview() {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('closeOnlyButton').style.display = 'none';
    document.getElementById('previewArea').style.display = 'block';
    
    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead><tr style="background: #f7fafc;">';
    html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">顧客名</th>';
    html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">ライセンス情報</th>';
    html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">合計</th>';
    html += '</tr></thead><tbody>';
    
    parsedImportData.forEach(function(item) {
        const total = item.licenses.reduce(function(sum, l) { return sum + l.license_count; }, 0);
        const licenseDetails = item.licenses.map(function(l) { return l.license_type + ' × ' + l.license_count; }).join(', ');
        
        html += '<tr style="border-bottom: 1px solid #e2e8f0;">';
        html += '<td style="padding: 12px;">' + item.customer_name + '</td>';
        html += '<td style="padding: 12px; font-size: 13px; color: #718096;">' + licenseDetails + '</td>';
        html += '<td style="padding: 12px; font-weight: 600;">' + total + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    document.getElementById('previewTable').innerHTML = html;
}

// Import data
window.importData = async function() {
    if (parsedImportData.length === 0) {
        alert('インポートするデータがありません');
        return;
    }
    
    const confirmed = confirm(parsedImportData.length + '件の案件をインポートしますか？');
    if (!confirmed) {
        return;
    }
    
    console.log('📥 インポート開始:', parsedImportData.length + '件');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < parsedImportData.length; i++) {
        try {
            const item = parsedImportData[i];
            
            await apiCall(API_BASE + '/deals', {
                method: 'POST',
                body: JSON.stringify(item)
            });
            
            successCount++;
            console.log('✅ インポート成功 (' + (i + 1) + '/' + parsedImportData.length + '): ' + item.customer_name);
            
        } catch (error) {
            errorCount++;
            console.error('❌ インポート失敗 (' + (i + 1) + '/' + parsedImportData.length + '):', error);
        }
    }
    
    console.log('📊 インポート完了: 成功=' + successCount + ', 失敗=' + errorCount);
    
    alert('✅ インポート完了\n\n成功: ' + successCount + '件\n失敗: ' + errorCount + '件');
    
    // Close modal and reload dashboard
    closeImportModal();
    loadDashboard();
}

// ===== Export & Template Functions =====

// Download template
window.downloadTemplate = function() {
    console.log('📄 テンプレートダウンロード開始');
    
    // Create template CSV with new license types
    const headers = ['顧客名', '営業担当者', '登録日', 'ステータス', '無制限(0ABJ)', '無制限(050)', '従量制(0ABJ)', '従量制(050)', '従量制', '内線のみ'];
    const exampleRow = ['サンプル株式会社', '山田', '2025-04-15', '見込み', '100', '50', '30', '20', '10', '5'];
    
    let csv = headers.join(',') + '\n';
    csv += exampleRow.join(',') + '\n';
    
    // Convert to Shift-JIS for Excel compatibility (if needed)
    downloadCSVFile(csv, 'zoomphone_template.csv');
    
    console.log('✅ テンプレートダウンロード完了');
}

// Export to CSV
window.exportToCSV = async function() {
    try {
        console.log('📤 CSVエクスポート開始');
        
        // Fetch all deals
        const response = await apiCall(API_BASE + '/deals');
        const deals = response.data;
        
        if (deals.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }
        
        // Create CSV headers with new license types
        const headers = ['顧客名', '営業担当者', '登録日', 'ステータス', '無制限(0ABJ)', '無制限(050)', '従量制(0ABJ)', '従量制(050)', '従量制', '内線のみ', '合計ライセンス数'];
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        deals.forEach(function(deal) {
            const licenseMap = {
                '無制限(0ABJ)': 0,
                '無制限(050)': 0,
                '従量制(0ABJ)': 0,
                '従量制(050)': 0,
                '従量制': 0,
                '内線のみ': 0
            };
            
            let total = 0;
            deal.licenses.forEach(function(license) {
                licenseMap[license.license_type] = license.license_count;
                total += license.license_count;
            });
            
            const row = [
                deal.customer_name,
                deal.sales_rep,
                deal.deal_date,
                deal.status,
                licenseMap['無制限(0ABJ)'],
                licenseMap['無制限(050)'],
                licenseMap['従量制(0ABJ)'],
                licenseMap['従量制(050)'],
                licenseMap['従量制'],
                licenseMap['内線のみ'],
                total
            ];
            
            csv += row.join(',') + '\n';
        });
        
        // Download
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSVFile(csv, 'zoomphone_export_' + timestamp + '.csv');
        
        console.log('✅ CSVエクスポート完了:', deals.length + '件');
        alert('✅ CSVエクスポート完了\n\n' + deals.length + '件のデータをエクスポートしました');
        
    } catch (error) {
        console.error('❌ エクスポートエラー:', error);
        alert('❌ エクスポートに失敗しました: ' + error.message);
    }
}

// Download CSV file
function downloadCSVFile(csvContent, filename) {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// ===== Search & Filter Functions =====

// Apply filters
window.applyFilters = function() {
    console.log('🔍 フィルター適用開始');
    
    // Get filter values
    const searchText = document.getElementById('searchCustomer').value.toLowerCase().trim();
    const filterSalesRep = document.getElementById('filterSalesRep').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const filterDateFrom = document.getElementById('filterDateFrom').value;
    const filterDateTo = document.getElementById('filterDateTo').value;
    
    console.log('フィルター条件:', {
        searchText: searchText,
        salesRep: filterSalesRep,
        status: filterStatus,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo
    });
    
    // Filter deals
    let filteredDeals = allDeals.filter(function(deal) {
        // Search by customer name
        if (searchText && !deal.customer_name.toLowerCase().includes(searchText)) {
            return false;
        }
        
        // Filter by sales rep
        if (filterSalesRep && deal.sales_rep !== filterSalesRep) {
            return false;
        }
        
        // Filter by status
        if (filterStatus && deal.status !== filterStatus) {
            return false;
        }
        
        // Filter by date range
        if (filterDateFrom && deal.deal_date < filterDateFrom) {
            return false;
        }
        
        if (filterDateTo && deal.deal_date > filterDateTo) {
            return false;
        }
        
        return true;
    });
    
    console.log('✅ フィルター結果:', filteredDeals.length + '件 / 全' + allDeals.length + '件');
    
    // Update deals list
    updateDealsList(filteredDeals);
    
    // Update results count
    document.getElementById('filterResults').textContent = '表示件数: ' + filteredDeals.length + '件 / 全' + allDeals.length + '件';
}

// Clear filters
window.clearFilters = function() {
    console.log('🔄 フィルタークリア');
    
    // Clear input values
    document.getElementById('searchCustomer').value = '';
    document.getElementById('filterSalesRep').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    // Show all deals
    updateDealsList(allDeals);
    
    // Update results count
    document.getElementById('filterResults').textContent = '表示件数: ' + allDeals.length + '件 / 全' + allDeals.length + '件';
}

// Update deals list
function updateDealsList(deals) {
    const dealsListContainer = document.getElementById('dealsList');
    
    if (!dealsListContainer) {
        console.warn('dealsList container not found');
        return;
    }
    
    if (deals.length === 0) {
        dealsListContainer.innerHTML = '<p class="loading">条件に一致する案件が見つかりませんでした</p>';
        return;
    }
    
    let html = '';
    deals.forEach(function(deal) {
        html += renderDealItem(deal);
    });
    
    dealsListContainer.innerHTML = html;
}
