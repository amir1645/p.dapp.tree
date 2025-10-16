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
let currentZoom = 1;
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletAddressSpan = document.getElementById('walletAddress');
const userInfoDiv = document.getElementById('userInfo');
const treeContainer = document.getElementById('treeContainer');
const currentUserIdSpan = document.getElementById('currentUserId');
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const centerViewBtn = document.getElementById('centerView');
const fitToScreenBtn = document.getElementById('fitToScreen');

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
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        centerViewBtn.addEventListener('click', centerView);
        fitToScreenBtn.addEventListener('click', fitToScreen);
        
        // Ethereum events
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        // Drag events
        treeContainer.addEventListener('mousedown', startDrag);
        treeContainer.addEventListener('mousemove', duringDrag);
        treeContainer.addEventListener('mouseup', endDrag);
        treeContainer.addEventListener('mouseleave', endDrag);
        
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
        if (userId === userInfo.id) {
            return userAccount;
        }
        
        const userData = await contract.methods._getSpecialUserInfoForMigrateToNewFork(userId).call();
        
        if (userData.userAddress && userData.userAddress !== '0x0000000000000000000000000000000000000000') {
            return userData.userAddress;
        }
        
        console.warn(`Address not found for user ${userId}`);
        return '0x0000000000000000000000000000000000000000';
        
    } catch (error) {
        console.error(`Error getting address for user ${userId}:`, error);
        return '0x0000000000000000000000000000000000000000';
    }
}

// ساخت درخت با ساختار عمودی واقعی - بدون محدودیت
async function buildTreeWithExpansion(rootId) {
    const queue = [];
    const tree = {};
    let processedCount = 0;
    const maxProcess = 10000;

    queue.push({ id: rootId, level: 0, position: 0 });
    
    while (queue.length > 0 && processedCount < maxProcess) {
        const { id, level, position } = queue.shift();
        
        if (tree[id]) continue;
        
        try {
            const directs = await contract.methods.getUserDirects(id).call();
            const hasLeft = directs.leftId > 0;
            const hasRight = directs.rightId > 0;
            const hasChildren = hasLeft || hasRight;
            
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
                    console.warn(`Could not get full info for user ${id}, using basic info`);
                }
            }
            
            const spacing = Math.pow(2, 12 - Math.min(level, 10));
            const leftPosition = position - spacing;
            const rightPosition = position + spacing;
            
            tree[id] = {
                id: Number(id),
                uplineId: Number(userInfoData.uplineId),
                leftId: Number(directs.leftId),
                rightId: Number(directs.rightId),
                isCurrentUser: id === userInfo.id,
                level: level,
                position: position,
                hasChildren: hasChildren,
                expanded: expandedNodes.has(id),
                leftCount: Number(userInfoData.leftCount) || 0,
                rightCount: Number(userInfoData.rightCount) || 0,
                address: userAddress,
                leftPosition: leftPosition,
                rightPosition: rightPosition
            };
            
            processedCount++;
            
            if (tree[id].expanded && hasChildren) {
                if (hasLeft && !tree[directs.leftId]) {
                    queue.push({ id: Number(directs.leftId), level: level + 1, position: leftPosition });
                }
                if (hasRight && !tree[directs.rightId]) {
                    queue.push({ id: Number(directs.rightId), level: level + 1, position: rightPosition });
                }
            }
            
        } catch (error) {
            console.error(`Error loading user ${id}:`, error);
            tree[id] = createBasicNode(id, level, position, false);
            tree[id].error = true;
        }
        
        if (processedCount % 20 === 0) {
            updateProgress(processedCount);
        }
        
        if (processedCount % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    console.log(`✅ Total nodes processed: ${processedCount}`);
    return tree;
}

// تابع کمکی برای ایجاد نود پایه
function createBasicNode(id, level, position, truncated = false) {
    return {
        id: Number(id),
        uplineId: 0,
        leftId: 0,
        rightId: 0,
        isCurrentUser: id === userInfo.id,
        level: level,
        position: position,
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
        treeContainer.innerHTML = '<div class="loading">⏳ در حال بارگذاری تمام شبکه زیرمجموعه...</div>';
        
        if (!userInfo.id) {
            throw new Error('User info not loaded');
        }

        expandedNodes.clear();
        expandedNodes.add(userInfo.id);
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id);
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        
    } catch (error) {
        console.error('Error loading network:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در بارگذاری شبکه</p>';
    }
}

// رندر درخت با ساختار عمودی
function renderTreeWithExpansion(treeStructure) {
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper';
    
    const levels = {};
    Object.values(treeStructure).forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
        const levelElement = createLevelElement(level, levels[level], treeStructure);
        treeWrapper.appendChild(levelElement);
    });
    
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeWrapper);
    
    updateTreeStats(treeStructure);
    
    setTimeout(() => {
        treeWrapper.scrollLeft = treeWrapper.scrollWidth / 2 - treeContainer.clientWidth / 2;
        treeWrapper.scrollTop = 0;
    }, 100);
}

// ایجاد المان سطح
function createLevelElement(level, nodes, treeStructure) {
    const levelElement = document.createElement('div');
    levelElement.className = 'tree-level';
    levelElement.setAttribute('data-level', level);
    
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'level-nodes';
    
    nodes.sort((a, b) => a.position - b.position).forEach(node => {
        const nodeElement = createNodeElement(node, treeStructure);
        nodesContainer.appendChild(nodeElement);
    });
    
    levelElement.appendChild(nodesContainer);
    return levelElement;
}

// ایجاد المان نود
function createNodeElement(node, treeStructure) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.setAttribute('data-user-id', node.id);
    nodeElement.setAttribute('data-level', node.level);
    
    nodeElement.style.marginLeft = `${node.position * 100}px`;
    
    const nodeBox = document.createElement('div');
    let boxClasses = 'node-box';
    if (node.isCurrentUser) boxClasses += ' current-user';
    if (node.error) boxClasses += ' error-node';
    if (node.expanded) boxClasses += ' expanded';
    if (node.hasChildren && !node.expanded) boxClasses += ' collapsed clickable-node';
    if (node.hasChildren) boxClasses += ' clickable-node';
    
    nodeBox.className = boxClasses;
    
    const badges = [];
    if (node.isCurrentUser) badges.push('<span class="badge current-badge">شما</span>');
    if (node.error) badges.push('<span class="badge error-badge">خطا</span>');
    if (node.hasChildren && !node.expanded) badges.push('<span class="badge expand-badge">+</span>');
    if (node.expanded) badges.push('<span class="badge expand-badge">−</span>');
    if (node.truncated) badges.push('<span class="badge expand-badge">⋯</span>');
    
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
    
    if (node.hasChildren) {
        nodeBox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNodeExpansion(node.id);
        });
    }
    
    nodeElement.appendChild(nodeBox);
    
    if (node.hasChildren && node.expanded) {
        addConnectionLines(nodeElement, node, treeStructure);
    }
    
    return nodeElement;
}

// اضافه کردن خطوط اتصال
function addConnectionLines(nodeElement, node, treeStructure) {
    const verticalLine = document.createElement('div');
    verticalLine.className = 'connection-line vertical-line';
    nodeElement.appendChild(verticalLine);
    
    const horizontalLines = document.createElement('div');
    horizontalLines.className = 'horizontal-lines';
    
    if (node.leftId && treeStructure[node.leftId]) {
        const leftLine = document.createElement('div');
        leftLine.className = 'horizontal-line left';
        horizontalLines.appendChild(leftLine);
    }
    
    if (node.rightId && treeStructure[node.rightId]) {
        const rightLine = document.createElement('div');
        rightLine.className = 'horizontal-line right';
        horizontalLines.appendChild(rightLine);
    }
    
    if (horizontalLines.children.length > 0) {
        nodeElement.appendChild(horizontalLines);
    }
}

// toggle expansion نود
async function toggleNodeExpansion(nodeId) {
    console.log(`Toggling expansion for node ${nodeId}`);
    
    if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId);
    } else {
        expandedNodes.add(nodeId);
    }
    
    await reloadTree();
}

// باز کردن همه نودها
async function expandAllNodes() {
    console.log('Expanding all nodes');
    
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
    
    expandedNodes.clear();
    expandedNodes.add(userInfo.id);
    
    await reloadTree();
}

// بارگذاری مجدد درخت
async function reloadTree() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال به‌روزرسانی تمام درخت...</div>';
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id);
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        
    } catch (error) {
        console.error('Error reloading tree:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در به‌روزرسانی درخت</p>';
    }
}

// کنترل‌های زوم و ناوبری
function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.2, 3);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.2, 0.3);
    applyZoom();
}

function centerView() {
    const treeWrapper = document.querySelector('.tree-wrapper');
    if (treeWrapper) {
        treeWrapper.scrollLeft = treeWrapper.scrollWidth / 2 - treeContainer.clientWidth / 2;
        treeWrapper.scrollTop = 0;
    }
}

function fitToScreen() {
    currentZoom = 1;
    applyZoom();
    centerView();
}

function applyZoom() {
    const treeWrapper = document.querySelector('.tree-wrapper');
    if (treeWrapper) {
        treeWrapper.style.transform = `scale(${currentZoom})`;
        treeWrapper.style.transformOrigin = 'center top';
    }
}

// کنترل‌های درگ
function startDrag(e) {
    isDragging = true;
    const treeWrapper = document.querySelector('.tree-wrapper');
    startX = e.pageX - treeContainer.offsetLeft;
    startY = e.pageY - treeContainer.offsetTop;
    scrollLeft = treeContainer.scrollLeft;
    scrollTop = treeContainer.scrollTop;
    treeContainer.style.cursor = 'grabbing';
}

function duringDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - treeContainer.offsetLeft;
    const y = e.pageY - treeContainer.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    treeContainer.scrollLeft = scrollLeft - walkX;
    treeContainer.scrollTop = scrollTop - walkY;
}

function endDrag() {
    isDragging = false;
    treeContainer.style.cursor = 'grab';
}

// آپدیت آمار
function updateTreeStats(treeStructure) {
    const userCount = Object.keys(treeStructure).length;
    const levels = new Set(Object.values(treeStructure).map(node => node.level));
    const networkDepth = Math.max(...levels);
    
    document.getElementById('userCount').textContent = userCount;
    document.getElementById('networkDepth').textContent = networkDepth + 1;
    document.getElementById('currentLevel').textContent = networkDepth + 1;
}