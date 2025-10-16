// Contract ABI
const CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserInfo",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "uint256", "name": "uplineId", "type": "uint256"},
            {"internalType": "uint256", "name": "leftCount", "type": "uint256"},
            {"internalType": "uint256", "name": "rightCount", "type": "uint256"},
            {"internalType": "uint256", "name": "saveLeft", "type": "uint256"},
            {"internalType": "uint256", "name": "saveRight", "type": "uint256"},
            {"internalType": "uint256", "name": "balanceCount", "type": "uint256"},
            {"internalType": "uint256", "name": "specialBalanceCount", "type": "uint256"},
            {"internalType": "uint256", "name": "totalMinerRewards", "type": "uint256"},
            {"internalType": "uint256", "name": "entryPrice", "type": "uint256"},
            {"internalType": "bool", "name": "isMiner", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "userId", "type": "uint256"}],
        "name": "getUserDirects",
        "outputs": [
            {"internalType": "uint256", "name": "leftId", "type": "uint256"},
            {"internalType": "uint256", "name": "rightId", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "userId", "type": "uint256"}],
        "name": "_getSpecialUserInfoForMigrateToNewFork",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "address", "name": "userAddress", "type": "address"},
            {"internalType": "uint256", "name": "leftCount", "type": "uint256"},
            {"internalType": "uint256", "name": "rightCount", "type": "uint256"},
            {"internalType": "uint256", "name": "saveLeft", "type": "uint256"},
            {"internalType": "uint256", "name": "saveRight", "type": "uint256"},
            {"internalType": "uint256", "name": "balanceCount", "type": "uint256"},
            {"internalType": "address", "name": "upline", "type": "address"},
            {"internalType": "uint256", "name": "specialBalanceCount", "type": "uint256"},
            {"internalType": "uint256", "name": "totalMinerRewards", "type": "uint256"},
            {"internalType": "uint256", "name": "entryPrice", "type": "uint256"},
            {"internalType": "bool", "name": "isMiner", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const CONTRACT_ADDRESS = "0x166dd205590240c90ca4e0e545ad69db47d8f22f";

// Global variables
let web3;
let contract;
let userAccount;
let userInfo = {};
let currentTree = {};
let expandedNodes = new Set();

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletAddressSpan = document.getElementById('walletAddress');
const userInfoDiv = document.getElementById('userInfo');
const treeContainer = document.getElementById('treeContainer');
const userCountSpan = document.getElementById('userCount');
const networkDepthSpan = document.getElementById('networkDepth');
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');
const refreshTreeBtn = document.getElementById('refreshTree');

// Initialize
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        try {
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateWalletUI();
                await loadUserInfo();
            }
        } catch (error) {
            console.log('No connected accounts');
        }

        // Event listeners
        expandAllBtn.addEventListener('click', expandAllNodes);
        collapseAllBtn.addEventListener('click', collapseAllNodes);
        refreshTreeBtn.addEventListener('click', refreshTree);
        
        // Ethereum events
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
    } else {
        connectWalletBtn.disabled = true;
        connectWalletBtn.textContent = '⚠️ متامسک یافت نشد';
        walletAddressSpan.textContent = 'اتصال ممکن نیست';
    }
});

// مدیریت تغییر حساب
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        userAccount = null;
        connectWalletBtn.textContent = '🔗 اتصال کیف پول';
        connectWalletBtn.disabled = false;
        walletAddressSpan.textContent = 'اتصال برقرار نشده';
        userInfoDiv.innerHTML = '<p>لطفاً کیف پول خود را متصل کنید</p>';
        treeContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🌳</div><p>پس از اتصال کیف پول، شبکه شما اینجا نمایش داده می‌شود</p></div>';
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        updateWalletUI();
        await loadUserInfo();
    }
}

function handleChainChanged() {
    window.location.reload();
}

// Connect wallet
connectWalletBtn.addEventListener('click', async () => {
    try {
        connectWalletBtn.textContent = '⏳ در حال اتصال...';
        connectWalletBtn.disabled = true;
        
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        userAccount = accounts[0];
        
        updateWalletUI();
        await loadUserInfo();
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('❌ خطا در اتصال کیف پول');
        connectWalletBtn.textContent = '🔗 اتصال کیف پول';
        connectWalletBtn.disabled = false;
    }
});

// Update wallet UI
function updateWalletUI() {
    const shortAddress = userAccount.substring(0, 6) + '...' + userAccount.substring(userAccount.length - 4);
    walletAddressSpan.textContent = shortAddress;
    connectWalletBtn.textContent = '✅ متصل شد';
    connectWalletBtn.disabled = true;
}

// Load user info
async function loadUserInfo() {
    try {
        userInfoDiv.innerHTML = '<div class="loading">⏳ در حال بارگذاری اطلاعات...</div>';
        
        const result = await contract.methods.getUserInfo(userAccount).call();
        
        userInfo = {
            id: Number(result.id),
            uplineId: Number(result.uplineId),
            leftCount: Number(result.leftCount),
            rightCount: Number(result.rightCount),
            saveLeft: Number(result.saveLeft),
            saveRight: Number(result.saveRight),
            balanceCount: Number(result.balanceCount),
            specialBalanceCount: Number(result.specialBalanceCount),
            totalMinerRewards: web3.utils.fromWei(result.totalMinerRewards, 'ether'),
            entryPrice: web3.utils.fromWei(result.entryPrice, 'ether'),
            isMiner: result.isMiner
        };
        
        displayUserInfo();
        await loadNetwork();
        
    } catch (error) {
        console.error('Error loading user info:', error);
        userInfoDiv.innerHTML = '<p class="error">❌ خطا در بارگذاری اطلاعات</p>';
    }
}

// Display user info
function displayUserInfo() {
    userInfoDiv.innerHTML = `
        <div class="info-item">
            <span class="info-label">شناسه شما:</span>
            <span class="info-value">${userInfo.id}</span>
        </div>
        <div class="info-item">
            <span class="info-label">آپلاین:</span>
            <span class="info-value">${userInfo.uplineId}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تعداد چپ:</span>
            <span class="info-value">${userInfo.leftCount}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تعداد راست:</span>
            <span class="info-value">${userInfo.rightCount}</span>
        </div>
        <div class="info-item">
            <span class="info-label">ذخیره چپ:</span>
            <span class="info-value">${userInfo.saveLeft}</span>
        </div>
        <div class="info-item">
            <span class="info-label">ذخیره راست:</span>
            <span class="info-value">${userInfo.saveRight}</span>
        </div>
        <div class="info-item">
            <span class="info-label">بالانس:</span>
            <span class="info-value">${userInfo.balanceCount}</span>
        </div>
        <div class="info-item">
            <span class="info-label">پاداش ماینر:</span>
            <span class="info-value">${parseFloat(userInfo.totalMinerRewards).toFixed(2)} MATIC</span>
        </div>
        <div class="info-item">
            <span class="info-label">وضعیت:</span>
            <span class="info-value">${userInfo.isMiner ? '✅ ماینر' : '👤 کاربر'}</span>
        </div>
    `;
}

// تابع برای گرفتن آدرس از ID
async function getAddressFromId(userId) {
    try {
        if (userId === userInfo.id) {
            return userAccount;
        }
        
        const userData = await contract.methods._getSpecialUserInfoForMigrateToNewFork(userId).call();
        
        if (userData.userAddress && userData.userAddress !== '0x0000000000000000000000000000000000000000') {
            return userData.userAddress;
        }
        
        return '0x0000000000000000000000000000000000000000';
        
    } catch (error) {
        console.error(`Error getting address for user ${userId}:`, error);
        return '0x0000000000000000000000000000000000000000';
    }
}

// ساخت درخت ساده
async function buildTree(rootId) {
    const queue = [];
    const tree = {};
    let processedCount = 0;
    const maxProcess = 200;

    // همیشه کاربر اصلی expand باشه
    if (!expandedNodes.has(rootId)) {
        expandedNodes.add(rootId);
    }
    
    queue.push({ id: rootId, level: 0 });
    
    while (queue.length > 0 && processedCount < maxProcess) {
        const { id, level } = queue.shift();
        
        if (tree[id]) continue;
        
        try {
            // گرفتن مستقیم‌ها
            const directs = await contract.methods.getUserDirects(id).call();
            const hasLeft = directs.leftId > 0;
            const hasRight = directs.rightId > 0;
            const hasChildren = hasLeft || hasRight;
            
            // گرفتن اطلاعات کاربر
            const userAddress = await getAddressFromId(id);
            let userInfoData = {
                uplineId: 0,
                leftCount: 0,
                rightCount: 0
            };
            
            if (userAddress !== '0x0000000000000000000000000000000000000000') {
                try {
                    userInfoData = await contract.methods.getUserInfo(userAddress).call();
                } catch (error) {
                    console.warn(`Could not get full info for user ${id}`);
                }
            }
            
            tree[id] = {
                id: Number(id),
                uplineId: Number(userInfoData.uplineId),
                leftId: Number(directs.leftId),
                rightId: Number(directs.rightId),
                isCurrentUser: id === userInfo.id,
                level: level,
                hasChildren: hasChildren,
                expanded: expandedNodes.has(id),
                leftCount: Number(userInfoData.leftCount) || 0,
                rightCount: Number(userInfoData.rightCount) || 0
            };
            
            processedCount++;
            
            // اضافه کردن فرزندان به صف اگر expand شده
            if (hasChildren && tree[id].expanded) {
                if (hasLeft && !tree[directs.leftId]) {
                    queue.push({ 
                        id: Number(directs.leftId), 
                        level: level + 1
                    });
                }
                if (hasRight && !tree[directs.rightId]) {
                    queue.push({ 
                        id: Number(directs.rightId), 
                        level: level + 1
                    });
                }
            }
            
        } catch (error) {
            console.error(`Error loading user ${id}:`, error);
            tree[id] = {
                id: Number(id),
                uplineId: 0,
                leftId: 0,
                rightId: 0,
                isCurrentUser: id === userInfo.id,
                level: level,
                hasChildren: false,
                expanded: false,
                error: true
            };
            processedCount++;
        }
    }
    
    console.log(`✅ کاربران لود شده: ${processedCount}`);
    return tree;
}

// Load network
async function loadNetwork() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال بارگذاری شبکه...</div>';
        
        if (!userInfo.id) {
            throw new Error('User info not loaded');
        }

        const treeStructure = await buildTree(userInfo.id);
        currentTree = treeStructure;
        
        renderTree(treeStructure);
        
    } catch (error) {
        console.error('Error loading network:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در بارگذاری شبکه</p>';
    }
}

// رندر درخت ساده
function renderTree(treeStructure) {
    const treeElement = document.createElement('div');
    treeElement.className = 'tree';
    
    // گروه‌بندی نودها بر اساس سطح
    const levels = {};
    Object.values(treeStructure).forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    // رندر هر سطح
    Object.keys(levels).sort((a, b) => a - b).forEach(level => {
        const levelElement = createLevelElement(level, levels[level], treeStructure);
        treeElement.appendChild(levelElement);
        
        // اضافه کردن connector بین سطوح
        if (level < Math.max(...Object.keys(levels))) {
            const connector = document.createElement('div');
            connector.className = 'connector';
            connector.innerHTML = '<div class="connector-line"></div>';
            treeElement.appendChild(connector);
        }
    });
    
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeElement);
    
    updateStats(treeStructure);
}

// ایجاد المان سطح
function createLevelElement(level, nodes, treeStructure) {
    const levelElement = document.createElement('div');
    levelElement.className = 'tree-level';
    
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'level-nodes';
    
    // مرتب کردن و رندر نودها
    nodes.sort((a, b) => a.id - b.id).forEach(node => {
        const nodeElement = createNodeElement(node, treeStructure);
        nodesContainer.appendChild(nodeElement);
    });
    
    levelElement.appendChild(nodesContainer);
    return levelElement;
}

// ایجاد المان نود
function createNodeElement(node, treeStructure) {
    const nodeElement = document.createElement('div');
    let nodeClasses = 'node';
    if (node.isCurrentUser) nodeClasses += ' current-user';
    if (node.expanded) nodeClasses += ' expanded';
    if (node.hasChildren && !node.expanded) nodeClasses += ' collapsed';
    
    nodeElement.className = nodeClasses;
    
    const badges = [];
    if (node.isCurrentUser) badges.push('<span class="badge current-badge">شما</span>');
    if (node.hasChildren && !node.expanded) badges.push('<span class="badge expand-badge">+</span>');
    if (node.expanded) badges.push('<span class="badge expand-badge">−</span>');
    
    let childrenSummary = '';
    if (node.hasChildren && !node.expanded) {
        const leftText = node.leftId ? node.leftId : '--';
        const rightText = node.rightId ? node.rightId : '--';
        childrenSummary = `<div class="children-summary">${leftText} / ${rightText}</div>`;
    }
    
    nodeElement.innerHTML = `
        <div class="node-header">
            <div class="node-id">${node.id}</div>
            <div class="node-badges">${badges.join('')}</div>
        </div>
        <div class="node-info">
            <div class="info-line">
                <span class="info-label">آپ:</span>
                <span class="info-value">${node.uplineId || '--'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">چپ:</span>
                <span class="info-value">${node.leftId || '--'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">راست:</span>
                <span class="info-value">${node.rightId || '--'}</span>
            </div>
        </div>
        ${childrenSummary}
    `;
    
    // کلیک برای expand/collapse
    if (node.hasChildren) {
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNodeExpansion(node.id);
        });
    }
    
    return nodeElement;
}

// toggle expansion نود
async function toggleNodeExpansion(nodeId) {
    if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId);
    } else {
        expandedNodes.add(nodeId);
    }
    
    await reloadTree();
}

// باز کردن همه نودها
async function expandAllNodes() {
    Object.keys(currentTree).forEach(id => {
        if (currentTree[id].hasChildren) {
            expandedNodes.add(Number(id));
        }
    });
    
    await reloadTree();
}

// بستن همه نودها
async function collapseAllNodes() {
    expandedNodes.clear();
    expandedNodes.add(userInfo.id);
    
    await reloadTree();
}

// بروزرسانی درخت
async function refreshTree() {
    await reloadTree();
}

// بارگذاری مجدد درخت
async function reloadTree() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال بروزرسانی...</div>';
        
        const treeStructure = await buildTree(userInfo.id);
        currentTree = treeStructure;
        
        renderTree(treeStructure);
        
    } catch (error) {
        console.error('Error reloading tree:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در بروزرسانی</p>';
    }
}

// آپدیت آمار
function updateStats(treeStructure) {
    const userCount = Object.keys(treeStructure).length;
    const levels = new Set(Object.values(treeStructure).map(node => node.level));
    const networkDepth = levels.size;
    
    userCountSpan.textContent = userCount;
    networkDepthSpan.textContent = networkDepth;
}