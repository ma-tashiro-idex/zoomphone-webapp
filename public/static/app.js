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
                userInfo.innerHTML = `
                    <div class="user-avatar">${user.email.charAt(0).toUpperCase()}</div>
                    <span>${user.email}</span>
                    <button class="logout-btn" onclick="logout()">ログアウト</button>
                `;
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
        const response = await fetch(\`\${API_BASE}/deals?email=\${encodeURIComponent(email)}\`);
        return response.ok;
    } catch (error) {
        console.error('Access verification failed:', error);
        return false;
    }
}

// API helper function
async function apiCall(endpoint, options = {}) {
    if (!currentUserEmail) {
        throw new Error('認証が必要です');
    }
    
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.append('email', currentUserEmail);
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-User-Email': currentUserEmail,
            ...options.headers
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'リクエストに失敗しました');
    }
    
    return data;
}

// Load dashboard
async function loadDashboard() {
    const appContainer = document.getElementById('app');
    
    try {
        // Fetch stats
        const statsResponse = await apiCall(\`\${API_BASE}/stats\`);
        const stats = statsResponse.data;
        
        // Fetch deals
        const dealsResponse = await apiCall(\`\${API_BASE}/deals\`);
        const deals = dealsResponse.data;
        
        // Render dashboard
        appContainer.innerHTML = \`
            <div class="card">
                <h2>📊 ダッシュボード - 2025年度</h2>
                
                <!-- Statistics -->
                <div class="stats-grid">
                    <div class="stat-card" style="background: linear-gradient(135deg, #63b3ed 0%, #4299e1 100%);">
                        <div class="stat-label">🎯 年間目標（KPI）</div>
                        <div class="stat-value">1,000</div>
                        <div class="stat-unit">ライセンス</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-label">成約ライセンス数</div>
                        <div class="stat-value">\${stats.confirmed_licenses}</div>
                        <div class="stat-unit">ライセンス</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-label">見込みライセンス数</div>
                        <div class="stat-value">\${stats.prospect_licenses}</div>
                        <div class="stat-unit">ライセンス</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-label">達成率</div>
                        <div class="stat-value">\${stats.achievement_rate}%</div>
                        <div class="stat-unit">（見込み＋成約）</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-label">目標達成まであと</div>
                        <div class="stat-value">\${stats.remaining_target}</div>
                        <div class="stat-unit">ライセンス</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-label">案件数</div>
                        <div class="stat-value">\${deals.length}</div>
                        <div class="stat-unit">件</div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="progress-bar">
                    <div class="progress-fill" style="width: \${Math.min(stats.achievement_rate, 100)}%">
                        \${stats.achievement_rate}%
                    </div>
                </div>
                
                <!-- Deals List -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; color: #2d3748;">💼 案件一覧</h3>
                <div id="dealsList">
                    \${deals.length === 0 ? 
                        '<p class="loading">まだ案件が登録されていません</p>' :
                        deals.map(deal => renderDealItem(deal)).join('')
                    }
                </div>
            </div>
        \`;
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        appContainer.innerHTML = \`
            <div class="card">
                <div class="error">
                    ❌ データの読み込みに失敗しました: \${error.message}
                </div>
            </div>
        \`;
    }
}

// Render deal item
function renderDealItem(deal) {
    const totalLicenses = deal.licenses.reduce((sum, l) => sum + l.license_count, 0);
    const licenseDetails = deal.licenses.map(l => \`\${l.license_type} × \${l.license_count}\`).join(', ');
    const date = new Date(deal.deal_date).toLocaleDateString('ja-JP');
    const statusClass = deal.status === '成約' ? 'confirmed' : 'prospect';
    const statusText = deal.status;
    
    return \`
        <div class="card" style="margin-bottom: 15px; border-left: 4px solid \${deal.status === '成約' ? '#48bb78' : '#4299e1'};">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2d3748; margin-bottom: 8px; font-size: 18px;">
                        \${deal.customer_name} 
                        <span style="display: inline-block; background: \${deal.status === '成約' ? '#c6f6d5' : '#bee3f8'}; 
                                     color: \${deal.status === '成約' ? '#22543d' : '#2c5282'}; 
                                     padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
                            \${statusText}
                        </span>
                        <span style="display: inline-block; background: #e9d8fd; color: #553c9a; 
                                     padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
                            \${deal.sales_rep}
                        </span>
                    </div>
                    <div style="color: #718096; font-size: 14px; margin-bottom: 4px;">
                        📦 合計: <strong>\${totalLicenses}ライセンス</strong>
                    </div>
                    <div style="color: #a0aec0; font-size: 13px; margin-bottom: 4px;">
                        \${licenseDetails}
                    </div>
                    <div style="color: #a0aec0; font-size: 12px;">
                        📅 登録日: \${date}
                    </div>
                </div>
            </div>
        </div>
    \`;
}

// Initialize on page load
console.log('ZoomPhone Management System v2.0 - Frontend loaded');

// テストモード: URLに ?test=true がある場合は認証をバイパス
if (window.location.search.includes('test=true')) {
    console.log('🧪 テストモード有効');
    console.log('⚠️ 認証をバイパスしています（開発用）');
    
    // テスト用のメールアドレスを設定
    currentUserEmail = 'hi-abe@idex.co.jp'; // 許可リストの最初のユーザー
    
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    
    const header = document.querySelector('header h1');
    if (header && !document.getElementById('userInfo')) {
        const userInfo = document.createElement('span');
        userInfo.id = 'userInfo';
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-avatar">T</div>
            <span>テストモード (${currentUserEmail})</span>
            <button class="logout-btn" onclick="location.href=location.pathname">終了</button>
        `;
        header.appendChild(userInfo);
    }
    
    loadDashboard();
}
