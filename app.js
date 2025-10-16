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
const currentUserIdSpan = document.getElementById('currentUserId');
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');

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

        // اضافه کردن event listeners برای کنترل‌ها
        expandAllBtn.addEventListener('click', expandAllNodes);
        collapseAllBtn.addEventListener('click', collapseAllNodes);
        
        // مدیریت تغییر حساب
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
    } else {
        connectWalletBtn.disabled = true;
        connectWalletBtn.textContent = '⚠️ کیف پول یافت نشد';
        walletAddressSpan.textContent = 'MetaMask نصب نیست';
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
        currentUserIdSpan.textContent = '-';
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
    connectWalletBtn.textContent = '✅ اتصال برقرار شد';
    connectWalletBtn.disabled = true;
}

// Load user info
async function loadUserInfo() {
    try {
        userInfoDiv.innerHTML = '<div class="loading">⏳ در حال بارگذاری اطلاعات کاربر...</div>';
        
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
        currentUserIdSpan.textContent = userInfo.id;
        
        // بارگذاری درخت
        await loadCompleteNetwork();
        
    } catch (error) {
        console.error('Error loading user info:', error);
        userInfoDiv.innerHTML = '<p class="error">❌ خطا در بارگذاری اطلاعات کاربر</p>';
    }
}

// Display user info
function displayUserInfo() {
    userInfoDiv.innerHTML = `
        <div class="info-item">
            <span class="info-label">شناسه کاربری:</span>
            <span class="info-value">${userInfo.id}</span>
        </div>
        <div class="info-item">
            <span class="info-label">شناسه آپلاین:</span>
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
            <span class="info-label">تعداد بالانس:</span>
            <span class="info-value">${userInfo.balanceCount}</span>
        </div>
        <div class="info-item">
            <span class="info-label">بالانس ویژه:</span>
            <span class="info-value">${userInfo.specialBalanceCount}</span>
        </div>
        <div class="info-item">
            <span class="info-label">پاداش ماینر:</span>
            <span class="info-value">${parseFloat(userInfo.totalMinerRewards).toFixed(4)} MATIC</span>
        </div>
        <div class="info-item">
            <span class="info-label">قیمت ورود:</span>
            <span class="info-value">${parseFloat(userInfo.entryPrice).toFixed(4)} MATIC</span>
        </div>
        <div class="info-item">
            <span class="info-label">وضعیت ماینر:</span>
            <span class="info-value">${userInfo.isMiner ? '✅ فعال' : '❌ غیرفعال'}</span>
        </div>
    `;
}

// تابع برای گرفتن آدرس از ID
async function getAddressFromId(userId) {
    try {
        // اگر کاربر جاری هست
        if (userId === userInfo.id) {
            return userAccount;
        }
        
        // استفاده از متد _getSpecialUserInfoForMigrateToNewFork برای گرفتن آدرس
        const userData = await contract.methods._getSpecialUserInfoForMigrateToNewFork(userId).call();
        
        if (userData.userAddress && userData.userAddress !== '0x0000000000000000000000000000000000000000') {
            return userData.userAddress;
        }
        
        // اگر آدرس پیدا نشد
        console.warn(`Address not found for user ${userId}`);
        return '0x0000000000000000000000000000000000000000';
        
    } catch (error) {
        console.error(`Error getting address for user ${userId}:`, error);
        return '0x0000000000000000000000000000000000000000';
    }
}

// ساخت درخت با قابلیت گسترش
async function buildTreeWithExpansion(rootId, maxDepth) {
    const queue = [];
    const tree = {};
    let processedCount = 0;
    const maxProcess = 200;
    
    // اضافه کردن کاربر اصلی
    queue.push({ id: rootId, level: 0 });
    
    while (queue.length > 0 && processedCount < maxProcess) {
        const { id, level } = queue.shift();
        
        if (tree[id]) continue;
        
        // اگر از عمق مجاز گذشتیم
        if (level > maxDepth) {
            tree[id] = createBasicNode(id, level, true);
            continue;
        }
        
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
            
            // فقط اگر آدرس معتبر داره، اطلاعات کامل بگیر
            if (userAddress !== '0x0000000000000000000000000000000000000000') {
                try {
                    userInfoData = await contract.methods.getUserInfo(userAddress).call();
                } catch (error) {
                    console.warn(`Could not get full info for user ${id}, using basic info`);
                }
            }
            
            // ایجاد نود
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
                rightCount: Number(userInfoData.rightCount) || 0,
                address: userAddress
            };
            
            processedCount++;
            
            // اضافه کردن فرزندان به صف اگر نود expand شده
            if (tree[id].expanded && level < maxDepth) {
                if (hasLeft && !tree[directs.leftId]) {
                    queue.push({ id: Number(directs.leftId), level: level + 1 });
                }
                if (hasRight && !tree[directs.rightId]) {
                    queue.push({ id: Number(directs.rightId), level: level + 1 });
                }
            }
            
        } catch (error) {
            console.error(`Error loading user ${id}:`, error);
            tree[id] = createBasicNode(id, level, false);
            tree[id].error = true;
        }
        
        // آپدیت پیشرفت
        if (processedCount % 5 === 0) {
            updateProgress(processedCount);
        }
    }
    
    console.log(`✅ Total nodes processed: ${processedCount}`);
    return tree;
}

// تابع کمکی برای ایجاد نود پایه
function createBasicNode(id, level, truncated = false) {
    return {
        id: Number(id),
        uplineId: 0,
        leftId: 0,
        rightId: 0,
        isCurrentUser: id === userInfo.id,
        level: level,
        hasChildren: false,
        truncated: truncated
    };
}

// نمایش پیشرفت بارگذاری
function updateProgress(count) {
    const loadingElement = treeContainer.querySelector('.loading');
    if (loadingElement) {
        loadingElement.textContent = `⏳ در حال بارگذاری... (${count} کاربر لود شد)`;
    }
}

// Load complete network
async function loadCompleteNetwork() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال بارگذاری شبکه زیرمجموعه...</div>';
        
        if (!userInfo.id) {
            throw new Error('User info not loaded');
        }

        // شروع با کاربر اصلی
        expandedNodes.clear();
        expandedNodes.add(userInfo.id); // کاربر اصلی همیشه باز باشد
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id, 3); // عمق اولیه 3
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        
    } catch (error) {
        console.error('Error loading network:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در بارگذاری شبکه</p>';
    }
}

// رندر درخت با قابلیت گسترش
function renderTreeWithExpansion(treeStructure) {
    const treeElement = document.createElement('div');
    treeElement.className = 'compact-tree';
    
    // گروه‌بندی نودها بر اساس سطح
    const levels = {};
    Object.values(treeStructure).forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    // رندر هر سطح به ترتیب
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
        const levelElement = createLevelElement(level, levels[level], treeStructure);
        treeElement.appendChild(levelElement);
        
        // اضافه کردن connector بین سطوح
        if (level < sortedLevels[sortedLevels.length - 1]) {
            const connectorLevel = createConnectorLevel(levels[level], treeStructure);
            treeElement.appendChild(connectorLevel);
        }
    });
    
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeElement);
}

// ایجاد المان سطح
function createLevelElement(level, nodes, treeStructure) {
    const levelElement = document.createElement('div');
    levelElement.className = 'tree-level';
    levelElement.setAttribute('data-level', level);
    
    // عنوان سطح
    const levelHeader = document.createElement('div');
    levelHeader.className = 'level-header';
    levelHeader.innerHTML = `<span class="level-badge">سطح ${level}</span>`;
    levelElement.appendChild(levelHeader);
    
    // container برای نودها
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

// ایجاد المان نود با قابلیت کلیک
function createNodeElement(node, treeStructure) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.setAttribute('data-user-id', node.id);
    
    const nodeBox = document.createElement('div');
    let boxClasses = 'node-box';
    if (node.isCurrentUser) boxClasses += ' current-user';
    if (node.error) boxClasses += ' error-node';
    if (node.expanded) boxClasses += ' expanded';
    if (node.hasChildren && !node.expanded) boxClasses += ' collapsed clickable-node';
    if (node.hasChildren) boxClasses += ' clickable-node';
    
    nodeBox.className = boxClasses;
    
    // ایجاد بج‌ها
    const badges = [];
    if (node.isCurrentUser) badges.push('<span class="badge current-badge">شما</span>');
    if (node.error) badges.push('<span class="badge error-badge">خطا</span>');
    if (node.hasChildren && !node.expanded) badges.push('<span class="badge expand-badge">+</span>');
    if (node.expanded) badges.push('<span class="badge expand-badge">−</span>');
    if (node.truncated) badges.push('<span class="badge expand-badge">⋯</span>');
    
    // اطلاعات خلاصه زیرمجموعه
    let childrenSummary = '';
    if (node.hasChildren && !node.expanded) {
        const leftText = node.leftId ? node.leftId : '--';
        const rightText = node.rightId ? node.rightId : '--';
        childrenSummary = `<div class="children-summary">${leftText} / ${rightText}</div>`;
    }
    
    nodeBox.innerHTML = `
        <div class="node-header">
            <div class="node-id">${node.id}</div>
            <div class="node-badges">${badges.join('')}</div>
        </div>
        <div class="node-info">
            <div class="info-line">
                <span class="info-label">آپلاین:</span>
                <span class="info-value">${node.uplineId || '---'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">زیرمجموعه چپ:</span>
                <span class="info-value">${node.leftId && node.expanded ? node.leftId : (node.leftId ? '👈' : '--')}</span>
            </div>
            <div class="info-line">
                <span class="info-label">زیرمجموعه راست:</span>
                <span class="info-value">${node.rightId && node.expanded ? node.rightId : (node.rightId ? '👉' : '--')}</span>
            </div>
            <div class="info-line">
                <span class="info-label">تعداد کل:</span>
                <span class="info-value">${node.leftCount + node.rightCount}</span>
            </div>
        </div>
        ${childrenSummary}
    `;
    
    // اضافه کردن event listener برای کلیک
    if (node.hasChildren) {
        nodeBox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNodeExpansion(node.id);
        });
    }
    
    nodeElement.appendChild(nodeBox);
    return nodeElement;
}

// ایجاد سطح connector
function createConnectorLevel(parentNodes, treeStructure) {
    const connectorLevel = document.createElement('div');
    connectorLevel.className = 'connector-level';
    
    const connectorsContainer = document.createElement('div');
    connectorsContainer.className = 'connectors-container';
    
    parentNodes.forEach(parentNode => {
        if (!parentNode.hasChildren || !parentNode.expanded) return;
        
        const parentConnectors = document.createElement('div');
        parentConnectors.className = 'parent-connectors';
        parentConnectors.setAttribute('data-parent-id', parentNode.id);
        
        if (parentNode.leftId > 0 && treeStructure[parentNode.leftId]) {
            const leftConnector = document.createElement('div');
            leftConnector.className = 'branch-connector left-connector';
            leftConnector.innerHTML = `
                <div class="connector-line"></div>
                <div class="branch-label">👈 ${parentNode.leftId}</div>
            `;
            parentConnectors.appendChild(leftConnector);
        }
        
        if (parentNode.rightId > 0 && treeStructure[parentNode.rightId]) {
            const rightConnector = document.createElement('div');
            rightConnector.className = 'branch-connector right-connector';
            rightConnector.innerHTML = `
                <div class="connector-line"></div>
                <div class="branch-label">👉 ${parentNode.rightId}</div>
            `;
            parentConnectors.appendChild(rightConnector);
        }
        
        if (parentConnectors.children.length > 0) {
            connectorsContainer.appendChild(parentConnectors);
        }
    });
    
    connectorLevel.appendChild(connectorsContainer);
    return connectorLevel;
}

// toggle expansion نود
async function toggleNodeExpansion(nodeId) {
    console.log(`Toggling expansion for node ${nodeId}`);
    
    if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId);
        console.log(`Node ${nodeId} collapsed`);
    } else {
        expandedNodes.add(nodeId);
        console.log(`Node ${nodeId} expanded`);
    }
    
    // بارگذاری مجدد درخت
    await reloadTree();
}

// باز کردن همه نودها
async function expandAllNodes() {
    console.log('Expanding all nodes');
    
    // اضافه کردن همه نودهای فعلی به expanded
    Object.keys(currentTree).forEach(id => {
        if (currentTree[id].hasChildren) {
            expandedNodes.add(Number(id));
        }
    });
    
    await reloadTree();
}

// بستن همه نودها
async function collapseAllNodes() {
    console.log('Collapsing all nodes');
    
    // فقط کاربر اصلی رو نگه دار
    expandedNodes.clear();
    expandedNodes.add(userInfo.id);
    
    await reloadTree();
}

// بارگذاری مجدد درخت
async function reloadTree() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال به‌روزرسانی درخت...</div>';
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id, 5); // افزایش عمق
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        
    } catch (error) {
        console.error('Error reloading tree:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در به‌روزرسانی درخت</p>';
    }
}