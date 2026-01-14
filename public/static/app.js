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
        
        // 9段階の達成率別メッセージシステム
        const rate = stats.achievement_rate;
        let progressTheme = 'normal';
        let progressStatus = '📈 順調に進行中';
        let progressMessage = '目標に向かって着実に進んでいます！';
        let showConfetti = false;
        let exceedAmount = 0;
        
        // メッセージのランダム選択関数
        function getRandomMessage(messages) {
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        // 9段階の判定とメッセージ
        if (rate < 30) {
            // 0-29%: スタートダッシュ（青）
            progressTheme = 'start';
            progressStatus = '🚀 スタートダッシュ！';
            progressMessage = getRandomMessage([
                '良いスタートを切りました！この調子で！',
                '順調な滑り出しです！勢いをキープしましょう！',
                '素晴らしい始まり！このペースを維持しよう！',
                '最初の一歩は成功！続けて頑張りましょう！',
                'スタートダッシュ成功！勢いに乗っています！'
            ]);
        } else if (rate >= 30 && rate < 50) {
            // 30-49%: 順調に進行中（緑）
            progressTheme = 'normal';
            progressStatus = '📈 順調に進行中';
            progressMessage = getRandomMessage([
                '順調に進んでいます！この調子で！',
                '良いペースです！勢いに乗っています！',
                '目標に向かって着実に前進中！',
                'チーム全員で協力して進めています！',
                '予定通りに進行中！このまま頑張りましょう！'
            ]);
        } else if (rate >= 50 && rate < 75) {
            // 50-74%: 折り返し通過（黄）
            progressTheme = 'halfway';
            progressStatus = '🎯 折り返し通過';
            progressMessage = getRandomMessage([
                '半分を超えました！後半戦も全力で！',
                '折り返し地点通過！引き続き頑張りましょう！',
                '後半戦スタート！ラストスパートの準備を！',
                '半分達成！残りも同じペースで進みましょう！',
                '中間地点通過！ゴールまであと半分！'
            ]);
        } else if (rate >= 75 && rate < 90) {
            // 75-89%: ラストスパート（橙）
            progressTheme = 'sprint';
            progressStatus = '🔥 ラストスパート！';
            progressMessage = getRandomMessage([
                'あと一息！ゴール間近です！',
                'ラストスパート！全力で駆け抜けよう！',
                '目標まであと少し！踏ん張りどころです！',
                'ゴールが見えてきた！最後まで全力で！',
                '残り僅か！チーム一丸となって突破しよう！'
            ]);
        } else if (rate >= 90 && rate < 100) {
            // 90-99%: カウントダウン（赤）
            progressTheme = 'countdown';
            progressStatus = '⚡ カウントダウン';
            progressMessage = getRandomMessage([
                '💥 もうすぐ達成！全員で追い込み！',
                'カウントダウン開始！あと少しで目標達成！',
                '最後の追い込み！全力疾走でゴールへ！',
                'ゴール直前！最後まで気を抜かずに！',
                'あと僅か！全員の力を合わせて達成しよう！'
            ]);
        } else if (rate >= 100 && rate < 101) {
            // 100%: 目標達成（紫）+ 花吹雪
            progressTheme = 'achieved';
            progressStatus = '🎉 目標達成！！！';
            progressMessage = getRandomMessage([
                '🌟 素晴らしいチームワークでした！',
                '🏆 おめでとうございます！見事に達成！',
                '🎊 目標クリア！皆さんのおかげです！',
                '✨ 完璧な達成！チーム全員に拍手！',
                '🌈 やりました！素晴らしい成果です！'
            ]);
            showConfetti = true;
        } else if (rate >= 101 && rate < 110) {
            // 101-109%: 目標超過（虹）
            progressTheme = 'exceed';
            progressStatus = '🚀 目標超過！';
            exceedAmount = stats.total_licenses - 1000;
            progressMessage = getRandomMessage([
                '素晴らしい成果！目標を超えました！',
                '期待以上の結果！チームの底力を見せました！',
                '目標を上回る快挙！素晴らしい！',
                '予想を超える成果！皆さんの努力が実りました！',
                '目標突破！チームの結束力が勝利を呼びました！'
            ]);
            showConfetti = true;
        } else if (rate >= 110 && rate < 120) {
            // 110-119%: 大幅超過（金）
            progressTheme = 'major-exceed';
            progressStatus = '🏆 大幅目標超過！';
            exceedAmount = stats.total_licenses - 1000;
            progressMessage = getRandomMessage([
                '圧倒的な成果！驚異的な達成率です！',
                '大幅超過達成！チームの力は無限大！',
                '想像を超える成果！歴史的快挙です！',
                '記録的な達成！全員が主役です！',
                '驚異的なパフォーマンス！素晴らしい！'
            ]);
            showConfetti = true;
        } else {
            // 120%+: 驚異的達成（虹アニメ）
            progressTheme = 'legendary';
            progressStatus = '👑 驚異的達成！';
            exceedAmount = stats.total_licenses - 1000;
            progressMessage = getRandomMessage([
                '💎 記録的！歴史に残る偉業です！',
                '伝説級の達成！チームの名が刻まれます！',
                '前人未到の領域！圧巻のパフォーマンス！',
                '奇跡的な成果！全員が英雄です！',
                '史上最高の達成！チームの伝説が始まります！'
            ]);
            showConfetti = true;
        }
        
        // グラデーション色の定義（9段階）
        const themeColors = {
            'start': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',        // 青
            'normal': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',       // 緑
            'halfway': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',      // 黄
            'sprint': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',       // 橙
            'countdown': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',    // 赤
            'achieved': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',     // 紫
            'exceed': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',       // シアン（虹色）
            'major-exceed': 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)', // 金
            'legendary': 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)' // 虹アニメ
        };
        
        const themeShadows = {
            'start': '0 8px 16px rgba(59, 130, 246, 0.3)',
            'normal': '0 8px 16px rgba(16, 185, 129, 0.3)',
            'halfway': '0 8px 16px rgba(245, 158, 11, 0.3)',
            'sprint': '0 8px 16px rgba(249, 115, 22, 0.3)',
            'countdown': '0 8px 16px rgba(239, 68, 68, 0.3)',
            'achieved': '0 8px 16px rgba(168, 85, 247, 0.3)',
            'exceed': '0 8px 16px rgba(6, 182, 212, 0.3)',
            'major-exceed': '0 8px 16px rgba(245, 158, 11, 0.4)',
            'legendary': '0 8px 20px rgba(236, 72, 153, 0.5)'
        };
        
        // 花吹雪アニメーションのCSS
        const confettiStyles = showConfetti ? `
            <style>
                @keyframes confetti-fall {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .confetti {
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: #f0f;
                    top: -10px;
                    animation: confetti-fall 3s linear infinite;
                    z-index: 9999;
                }
                @keyframes rainbow-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .rainbow-animated {
                    background-size: 200% 200%;
                    animation: rainbow-animation 3s ease infinite;
                }
            </style>
        ` : '';
        
        // 花吹雪要素の生成
        const confettiHtml = showConfetti ? Array.from({length: 30}, function(_, i) {
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
            const color = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = 3 + Math.random() * 2;
            return '<div class="confetti" style="left: ' + left + '%; background: ' + color + '; animation-delay: ' + delay + 's; animation-duration: ' + duration + 's;"></div>';
        }).join('') : '';
        
        // Render modern dashboard HTML
        let html = confettiStyles + confettiHtml + '<div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">';
        
        // Filter section
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">';
        html += '<h2 style="color: #0284c7; font-size: 24px; margin: 0;">📈 進捗ダッシュボード</h2>';
        html += '<div style="display: flex; gap: 10px; align-items: center;">';
        html += '<span style="font-weight: 600; color: #475569; font-size: 14px;">表示切替：</span>';
        html += '<select id="displayMode" onchange="changeDisplayMode()" style="padding: 10px 20px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 600; background: white; cursor: pointer;">';
        html += '<option value="all">見込み＋成約</option>';
        html += '<option value="confirmed">成約のみ</option>';
        html += '<option value="prospect">見込みのみ</option>';
        html += '</select>';
        html += '</div>';
        html += '</div>';
        
        // Main progress card
        const rainbowClass = progressTheme === 'legendary' ? ' rainbow-animated' : '';
        html += '<div class="' + rainbowClass + '" style="background: ' + themeColors[progressTheme] + '; padding: 35px; border-radius: 15px; margin-bottom: 30px; box-shadow: ' + themeShadows[progressTheme] + '; color: white;">';
        html += '<div style="font-size: 28px; font-weight: bold; margin-bottom: 20px;">' + progressStatus + '</div>';
        
        // 目標超過の場合は特別表示
        if (exceedAmount > 0) {
            html += '<div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; text-align: center;">';
            html += '🌟 目標超過: +' + exceedAmount + 'ライセンス 🌟';
            html += '</div>';
        }
        
        // Progress grid (2x2) - 写真と同じデザイン
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">';
        
        // 1. 年間目標（左上）
        html += '<div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px);">';
        html += '<div style="font-size: 14px; opacity: 0.95; margin-bottom: 10px; font-weight: 600;">年間目標</div>';
        html += '<div style="font-size: 32px; font-weight: bold; line-height: 1;">1,000<span style="font-size: 16px; opacity: 0.9; margin-left: 8px;">ライセンス</span></div>';
        html += '</div>';
        
        // 2. 現在の総ライセンス数（右上）
        html += '<div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px);">';
        html += '<div style="font-size: 14px; opacity: 0.95; margin-bottom: 10px; font-weight: 600;">現在の総ライセンス数</div>';
        html += '<div style="font-size: 32px; font-weight: bold; line-height: 1;">' + stats.total_licenses + '<span style="font-size: 16px; opacity: 0.9; margin-left: 8px;">ライセンス</span>';
        // 成約と見込みの内訳を小さく表示
        html += '<div style="font-size: 12px; opacity: 0.85; margin-top: 6px;">成約: ' + stats.confirmed_licenses + ' / 見込み: ' + stats.prospect_licenses + '</div>';
        html += '</div>';
        html += '</div>';
        
        // 3. 目標達成まであと（左下）
        html += '<div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px);">';
        html += '<div style="font-size: 14px; opacity: 0.95; margin-bottom: 10px; font-weight: 600;">目標達成まで</div>';
        if (stats.remaining_target > 0) {
            html += '<div style="font-size: 32px; font-weight: bold; line-height: 1;">あと' + stats.remaining_target + '<span style="font-size: 16px; opacity: 0.9; margin-left: 8px;">ライセンス</span></div>';
        } else {
            html += '<div style="font-size: 28px; font-weight: bold; line-height: 1;">🎊 達成済み</div>';
        }
        html += '</div>';
        
        // 4. 達成率（右下）
        html += '<div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px);">';
        html += '<div style="font-size: 14px; opacity: 0.95; margin-bottom: 10px; font-weight: 600;">達成率</div>';
        html += '<div style="font-size: 32px; font-weight: bold; line-height: 1;">' + stats.achievement_rate + '<span style="font-size: 16px; opacity: 0.9; margin-left: 8px;">%</span></div>';
        html += '</div>';
        
        html += '</div>';
        
        // Progress Bar
        const progressWidth = Math.min(stats.achievement_rate, 100);
        html += '<div style="margin-bottom: 20px;">';
        html += '<div style="background: rgba(255, 255, 255, 0.2); height: 30px; border-radius: 15px; overflow: hidden; position: relative;">';
        html += '<div style="height: 100%; background: rgba(255, 255, 255, 0.9); border-radius: 15px; width: ' + progressWidth + '%; display: flex; align-items: center; justify-content: flex-end; padding-right: 15px; font-weight: bold; color: #1e40af; font-size: 14px; transition: width 1s ease;">';
        html += stats.total_licenses + ' / 1,000';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Motivation message
        html += '<div style="font-size: 18px; font-weight: 600; text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.15); border-radius: 10px; backdrop-filter: blur(10px);">';
        html += progressMessage;
        html += '</div>';
        
        html += '</div>';
        
        // Statistics cards
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">';
        
        html += '<div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #10b981; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); transition: transform 0.3s;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
        html += '<span style="font-size: 16px; color: #64748b; font-weight: 600;">目標達成まであと</span>';
        html += '<span style="font-size: 28px;">🎯</span>';
        html += '</div>';
        html += '<div style="font-size: 36px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">' + stats.remaining_target + '</div>';
        html += '<div style="font-size: 14px; color: #94a3b8;">ライセンス</div>';
        html += '</div>';
        
        html += '<div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #3b82f6; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); transition: transform 0.3s;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
        html += '<span style="font-size: 16px; color: #64748b; font-weight: 600;">案件数</span>';
        html += '<span style="font-size: 28px;">💼</span>';
        html += '</div>';
        html += '<div style="font-size: 36px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">' + deals.length + '</div>';
        html += '<div style="font-size: 14px; color: #94a3b8;">件</div>';
        html += '</div>';
        
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
                <option value="無制限＋0ABJ">無制限＋0ABJ</option>
                <option value="無制限＋050">無制限＋050</option>
                <option value="従量制＋0ABJ">従量制＋0ABJ</option>
                <option value="従量制＋050">従量制＋050</option>
                <option value="従量制(Pro)">従量制(Pro)</option>
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
        '無制限_0ABJ': '無制限＋0ABJ',
        '無制限_050': '無制限＋050',
        '従量制_0ABJ': '従量制＋0ABJ',
        '従量制_050': '従量制＋050',
        '番号無し': '従量制(Pro)',
        '内線のみ': '内線のみ'
    };
    
    // Parse rows 4-9 with plan name inheritance
    let currentPlan = ''; // Track the current plan name
    for (let i = 4; i <= 9; i++) {
        if (!data[i] || data[i].length < 5) continue;
        
        const planName = String(data[i][1] || '').trim();
        const detail = String(data[i][2] || '').trim();
        const count = parseInt(data[i][4]);
        
        if (isNaN(count) || count <= 0) continue;
        
        // If planName is not empty, update currentPlan
        if (planName) {
            currentPlan = planName;
        }
        
        let licenseType = null;
        
        console.log('Row ' + i + ': currentPlan="' + currentPlan + '", detail="' + detail + '", count=' + count);
        
        // 無制限
        if (currentPlan.includes('無制限')) {
            if (detail.includes('0ABJ')) {
                licenseType = '無制限＋0ABJ';
            } else if (detail.includes('050')) {
                licenseType = '無制限＋050';
            }
        }
        // 従量制
        else if (currentPlan.includes('従量')) {
            if (detail.includes('0ABJ')) {
                licenseType = '従量制＋0ABJ';
            } else if (detail.includes('050')) {
                licenseType = '従量制＋050';
            } else if (detail.includes('番号無し')) {
                licenseType = '従量制(Pro)';
            }
        }
        // 内線のみ
        else if (currentPlan.includes('内線')) {
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
                        licenseType = '無制限＋0ABJ';
                    } else if (header.includes('050') && header.includes('無制限')) {
                        licenseType = '無制限＋050';
                    } else if (header.includes('0ABJ') && header.includes('従量')) {
                        licenseType = '従量制＋0ABJ';
                    } else if (header.includes('050') && header.includes('従量')) {
                        licenseType = '従量制＋050';
                    } else if (header.includes('従量') || header.includes('Pro')) {
                        licenseType = '従量制(Pro)';
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
    
    let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
    
    parsedImportData.forEach(function(item, index) {
        const total = item.licenses.reduce(function(sum, l) { return sum + l.license_count; }, 0);
        
        html += '<div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #f7fafc;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
        html += '<h3 style="margin: 0; color: #2d3748;">案件 #' + (index + 1) + '</h3>';
        html += '<button onclick="removePreviewItem(' + index + ')" style="background: #f56565; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">🗑️ 削除</button>';
        html += '</div>';
        
        // 基本情報（編集可能）
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">';
        
        // 顧客名
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">顧客名</label>';
        html += '<input type="text" id="preview_customer_' + index + '" value="' + item.customer_name + '" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '</div>';
        
        // 営業担当者
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">営業担当者</label>';
        html += '<select id="preview_sales_rep_' + index + '" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '<option value="山田"' + (item.sales_rep === '山田' ? ' selected' : '') + '>山田</option>';
        html += '<option value="阿部"' + (item.sales_rep === '阿部' ? ' selected' : '') + '>阿部</option>';
        html += '</select>';
        html += '</div>';
        
        // 登録日
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">登録日</label>';
        html += '<input type="date" id="preview_date_' + index + '" value="' + item.deal_date + '" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '</div>';
        
        // ステータス
        html += '<div>';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 600; color: #4a5568;">ステータス</label>';
        html += '<select id="preview_status_' + index + '" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
        html += '<option value="見込み"' + (item.status === '見込み' ? ' selected' : '') + '>見込み</option>';
        html += '<option value="成約"' + (item.status === '成約' ? ' selected' : '') + '>成約</option>';
        html += '</select>';
        html += '</div>';
        
        html += '</div>';
        
        // ライセンス情報（編集可能）
        html += '<div style="margin-top: 15px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<label style="font-weight: 600; color: #4a5568;">ライセンス情報</label>';
        html += '<button onclick="addPreviewLicense(' + index + ')" style="background: #48bb78; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;">➕ ライセンス追加</button>';
        html += '</div>';
        
        html += '<div id="preview_licenses_' + index + '" style="display: flex; flex-direction: column; gap: 10px;">';
        
        item.licenses.forEach(function(license, licenseIndex) {
            html += '<div style="display: flex; gap: 10px; align-items: center;">';
            html += '<select id="preview_license_type_' + index + '_' + licenseIndex + '" style="flex: 2; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
            html += '<option value="無制限＋0ABJ"' + (license.license_type === '無制限＋0ABJ' ? ' selected' : '') + '>無制限＋0ABJ</option>';
            html += '<option value="無制限＋050"' + (license.license_type === '無制限＋050' ? ' selected' : '') + '>無制限＋050</option>';
            html += '<option value="従量制＋0ABJ"' + (license.license_type === '従量制＋0ABJ' ? ' selected' : '') + '>従量制＋0ABJ</option>';
            html += '<option value="従量制＋050"' + (license.license_type === '従量制＋050' ? ' selected' : '') + '>従量制＋050</option>';
            html += '<option value="従量制(Pro)"' + (license.license_type === '従量制(Pro)' ? ' selected' : '') + '>従量制(Pro)</option>';
            html += '<option value="内線のみ"' + (license.license_type === '内線のみ' ? ' selected' : '') + '>内線のみ</option>';
            html += '</select>';
            html += '<input type="number" id="preview_license_count_' + index + '_' + licenseIndex + '" value="' + license.license_count + '" min="1" style="flex: 1; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px;">';
            html += '<button onclick="removePreviewLicense(' + index + ', ' + licenseIndex + ')" style="background: #f56565; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">🗑️</button>';
            html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
        
        // 合計表示
        html += '<div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #cbd5e0; text-align: right;">';
        html += '<span style="font-weight: 600; color: #2d3748;">合計ライセンス数: </span>';
        html += '<span id="preview_total_' + index + '" style="font-size: 18px; font-weight: 700; color: #2b6cb0;">' + total + '</span>';
        html += '</div>';
        
        html += '</div>';
    });
    
    html += '</div>';
    
    document.getElementById('previewTable').innerHTML = html;
}

// Remove preview item
window.removePreviewItem = function(index) {
    if (confirm('この案件をプレビューから削除しますか？')) {
        parsedImportData.splice(index, 1);
        displayPreview();
    }
};

// Add preview license
window.addPreviewLicense = function(index) {
    if (!parsedImportData[index].licenses) {
        parsedImportData[index].licenses = [];
    }
    parsedImportData[index].licenses.push({
        license_type: '無制限＋0ABJ',
        license_count: 1
    });
    displayPreview();
};

// Remove preview license
window.removePreviewLicense = function(itemIndex, licenseIndex) {
    if (parsedImportData[itemIndex].licenses.length > 1) {
        parsedImportData[itemIndex].licenses.splice(licenseIndex, 1);
        displayPreview();
    } else {
        alert('最低1つのライセンスが必要です');
    }
};

// Sync preview edits back to parsedImportData
function syncPreviewEdits() {
    parsedImportData.forEach(function(item, index) {
        // Update basic info
        const customerInput = document.getElementById('preview_customer_' + index);
        const salesRepSelect = document.getElementById('preview_sales_rep_' + index);
        const dateInput = document.getElementById('preview_date_' + index);
        const statusSelect = document.getElementById('preview_status_' + index);
        
        if (customerInput) item.customer_name = customerInput.value;
        if (salesRepSelect) item.sales_rep = salesRepSelect.value;
        if (dateInput) item.deal_date = dateInput.value;
        if (statusSelect) item.status = statusSelect.value;
        
        // Update licenses
        item.licenses.forEach(function(license, licenseIndex) {
            const typeSelect = document.getElementById('preview_license_type_' + index + '_' + licenseIndex);
            const countInput = document.getElementById('preview_license_count_' + index + '_' + licenseIndex);
            
            if (typeSelect) license.license_type = typeSelect.value;
            if (countInput) license.license_count = parseInt(countInput.value) || 1;
        });
    });
    
    console.log('✅ プレビュー編集を反映しました:', parsedImportData);
}

// Check for duplicates
async function checkDuplicates() {
    const response = await apiCall(API_BASE + '/deals');
    const existingDeals = response.data || [];
    
    const existingNames = new Set(existingDeals.map(function(d) { return d.customer_name; }));
    
    const duplicates = [];
    parsedImportData.forEach(function(item, index) {
        if (existingNames.has(item.customer_name)) {
            duplicates.push({
                index: index,
                customer_name: item.customer_name,
                action: 'overwrite' // default action
            });
        }
    });
    
    return duplicates;
}

// Show duplicate warning dialog
function showDuplicateDialog(duplicates) {
    return new Promise(function(resolve) {
        let html = '<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">';
        html += '<div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">';
        html += '<h2 style="margin: 0 0 20px 0; color: #e53e3e;">⚠️ 重複案件が検出されました</h2>';
        html += '<p style="margin-bottom: 20px; color: #718096;">以下の案件は既に登録されています。各案件の処理方法を選択してください：</p>';
        
        html += '<div style="margin-bottom: 20px;">';
        html += '<button onclick="selectAllOverwrite()" style="background: #f56565; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-size: 14px;">全て上書き</button>';
        html += '<button onclick="selectAllSkip()" style="background: #718096; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">全てスキップ</button>';
        html += '</div>';
        
        html += '<div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">';
        
        duplicates.forEach(function(dup, i) {
            html += '<div style="border: 2px solid #feb2b2; border-radius: 8px; padding: 15px; background: #fff5f5;">';
            html += '<div style="font-weight: 600; color: #742a2a; margin-bottom: 10px;">📋 ' + dup.customer_name + '</div>';
            html += '<div style="display: flex; gap: 10px;">';
            html += '<label style="flex: 1; cursor: pointer;"><input type="radio" name="dup_action_' + i + '" value="overwrite" checked onchange="updateDuplicateAction(' + i + ', \'overwrite\')"> 上書きする</label>';
            html += '<label style="flex: 1; cursor: pointer;"><input type="radio" name="dup_action_' + i + '" value="skip" onchange="updateDuplicateAction(' + i + ', \'skip\')"> スキップする</label>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        
        html += '<div style="display: flex; gap: 10px; justify-content: flex-end;">';
        html += '<button onclick="cancelDuplicateDialog()" style="background: #718096; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">キャンセル</button>';
        html += '<button onclick="confirmDuplicateDialog()" style="background: #48bb78; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">確定してインポート</button>';
        html += '</div>';
        
        html += '</div></div>';
        
        const dialogDiv = document.createElement('div');
        dialogDiv.id = 'duplicateDialog';
        dialogDiv.innerHTML = html;
        document.body.appendChild(dialogDiv);
        
        window.duplicateDialogResolve = resolve;
        window.currentDuplicates = duplicates;
    });
}

window.updateDuplicateAction = function(index, action) {
    window.currentDuplicates[index].action = action;
};

window.selectAllOverwrite = function() {
    window.currentDuplicates.forEach(function(dup, i) {
        dup.action = 'overwrite';
        const radio = document.querySelector('input[name="dup_action_' + i + '"][value="overwrite"]');
        if (radio) radio.checked = true;
    });
};

window.selectAllSkip = function() {
    window.currentDuplicates.forEach(function(dup, i) {
        dup.action = 'skip';
        const radio = document.querySelector('input[name="dup_action_' + i + '"][value="skip"]');
        if (radio) radio.checked = true;
    });
};

window.cancelDuplicateDialog = function() {
    const dialog = document.getElementById('duplicateDialog');
    if (dialog) dialog.remove();
    window.duplicateDialogResolve(null);
};

window.confirmDuplicateDialog = function() {
    const dialog = document.getElementById('duplicateDialog');
    if (dialog) dialog.remove();
    window.duplicateDialogResolve(window.currentDuplicates);
};

// Import data
window.importData = async function() {
    if (parsedImportData.length === 0) {
        alert('インポートするデータがありません');
        return;
    }
    
    // Sync edits before importing
    syncPreviewEdits();
    
    // Check for duplicates
    console.log('🔍 重複チェック中...');
    const duplicates = await checkDuplicates();
    
    if (duplicates.length > 0) {
        console.log('⚠️ 重複案件が見つかりました:', duplicates.length + '件');
        const result = await showDuplicateDialog(duplicates);
        
        if (!result) {
            console.log('❌ インポートがキャンセルされました');
            return;
        }
        
        // Apply actions
        const duplicateMap = {};
        result.forEach(function(dup) {
            duplicateMap[dup.customer_name] = dup.action;
        });
        
        // Filter out skipped items
        parsedImportData = parsedImportData.filter(function(item) {
            return duplicateMap[item.customer_name] !== 'skip';
        });
        
        console.log('📊 処理予定:', parsedImportData.length + '件（上書き: ' + result.filter(function(d) { return d.action === 'overwrite'; }).length + '件, スキップ: ' + result.filter(function(d) { return d.action === 'skip'; }).length + '件）');
    }
    
    if (parsedImportData.length === 0) {
        alert('インポートする案件がありません（全てスキップされました）');
        return;
    }
    
    const confirmed = confirm(parsedImportData.length + '件の案件をインポートしますか？');
    if (!confirmed) {
        return;
    }
    
    console.log('📥 インポート開始:', parsedImportData.length + '件');
    
    let successCount = 0;
    let errorCount = 0;
    let overwriteCount = 0;
    
    for (let i = 0; i < parsedImportData.length; i++) {
        try {
            const item = parsedImportData[i];
            
            // Check if this is an overwrite case
            const isOverwrite = duplicates.some(function(d) { 
                return d.customer_name === item.customer_name && d.action === 'overwrite'; 
            });
            
            if (isOverwrite) {
                // Get existing deal by customer name
                console.log('🔄 上書き中:', item.customer_name);
                const existingResponse = await apiCall(API_BASE + '/deals/' + encodeURIComponent(item.customer_name));
                
                if (existingResponse.success && existingResponse.data) {
                    const existingDeal = existingResponse.data;
                    
                    // Update existing deal
                    await apiCall(API_BASE + '/deals/' + existingDeal.id, {
                        method: 'PUT',
                        body: JSON.stringify({
                            customer_name: item.customer_name,
                            sales_rep: item.sales_rep,
                            deal_date: item.deal_date,
                            status: item.status,
                            licenses: item.licenses
                        })
                    });
                    
                    overwriteCount++;
                    successCount++;
                    console.log('✅ 上書き成功 (' + (i + 1) + '/' + parsedImportData.length + '): ' + item.customer_name);
                } else {
                    throw new Error('既存案件の取得に失敗しました');
                }
            } else {
                // Create new deal
                await apiCall(API_BASE + '/deals', {
                    method: 'POST',
                    body: JSON.stringify(item)
                });
                
                successCount++;
                console.log('✅ 新規作成成功 (' + (i + 1) + '/' + parsedImportData.length + '): ' + item.customer_name);
            }
            
        } catch (error) {
            errorCount++;
            console.error('❌ インポート失敗 (' + (i + 1) + '/' + parsedImportData.length + '):', error);
        }
    }
    
    let resultMessage = 'インポート完了\n成功: ' + successCount + '件';
    if (overwriteCount > 0) {
        resultMessage += '（うち上書き: ' + overwriteCount + '件）';
    }
    if (errorCount > 0) {
        resultMessage += '\n失敗: ' + errorCount + '件';
    }
    
    alert(resultMessage);
    console.log('📊 インポート完了: 成功=' + successCount + ', 上書き=' + overwriteCount + ', 失敗=' + errorCount);
    
    // Close modal and reload dashboard
    closeImportModal();
    loadDashboard();
}

// ===== Export & Template Functions =====

// Download template
window.downloadTemplate = function() {
    console.log('📄 テンプレートダウンロード開始');
    
    // Create template CSV with new license types
    const headers = ['顧客名', '営業担当者', '登録日', 'ステータス', '無制限＋0ABJ', '無制限＋050', '従量制＋0ABJ', '従量制＋050', '従量制(Pro)', '内線のみ'];
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
        const headers = ['顧客名', '営業担当者', '登録日', 'ステータス', '無制限＋0ABJ', '無制限＋050', '従量制＋0ABJ', '従量制＋050', '従量制(Pro)', '内線のみ', '合計ライセンス数'];
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        deals.forEach(function(deal) {
            const licenseMap = {
                '無制限＋0ABJ': 0,
                '無制限＋050': 0,
                '従量制＋0ABJ': 0,
                '従量制＋050': 0,
                '従量制(Pro)': 0,
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
                licenseMap['無制限＋0ABJ'],
                licenseMap['無制限＋050'],
                licenseMap['従量制＋0ABJ'],
                licenseMap['従量制＋050'],
                licenseMap['従量制(Pro)'],
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

// Change display mode (all/confirmed/prospect)
window.changeDisplayMode = async function() {
    const mode = document.getElementById('displayMode').value;
    console.log('🔄 表示モード変更:', mode);
    
    try {
        // Fetch stats with filter
        const statsResponse = await apiCall(API_BASE + '/stats?filter=' + (mode === 'all' ? '' : mode === 'confirmed' ? '成約' : '見込み'));
        const stats = statsResponse.data;
        
        // Update all stats dynamically without reloading
        // This would require updating the DOM elements
        // For simplicity, we reload the entire dashboard
        loadDashboard();
    } catch (error) {
        console.error('❌ 表示モード変更エラー:', error);
    }
};

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
