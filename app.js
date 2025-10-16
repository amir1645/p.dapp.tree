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
const refreshTreeBtn = document.getElementById('refreshTree');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const centerViewBtn = document.getElementById('centerView');
const fitToScreenBtn = document.getElementById('fitToScreen');
const resetViewBtn = document.getElementById('resetView');
const closeStatsBtn = document.getElementById('closeStats');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

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
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        centerViewBtn.addEventListener('click', centerView);
        fitToScreenBtn.addEventListener('click', fitToScreen);
        resetViewBtn.addEventListener('click', resetView);
        closeStatsBtn.addEventListener('click', closeStats);
        
        // Ethereum events
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        // Drag events
        treeContainer.addEventListener('mousedown', startDrag);
        treeContainer.addEventListener('mousemove', duringDrag);
        treeContainer.addEventListener('mouseup', endDrag);
        treeContainer.addEventListener('mouseleave', endDrag);
        treeContainer.addEventListener('wheel', handleWheel, { passive: false });
        
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

// ساخت درخت با ساختار عمودی واقعی
async function buildTreeWithExpansion(rootId) {
    const queue = [];
    const tree = {};
    let processedCount = 0;
    const maxProcess = 500;

    // همیشه کاربر اصلی expand باشه
    if (!expandedNodes.has(rootId)) {
        expandedNodes.add(rootId);
    }
    
    queue.push({ id: rootId, level: 0, position: 0 });
    
    while (queue.length > 0 && processedCount < maxProcess) {
        const { id, level, position } = queue.shift();
        
        if (tree[id]) continue;
        
        try {
            // نمایش پیشرفت
            updateLoadingProgress(processedCount, maxProcess, `در حال بارگذاری کاربر ${id}...`);
            
            // گرفتن مستقیم‌ها
            const directs = await contract.methods.getUserDirects(id).call();
            const hasLeft = directs.leftId > 0;
            const hasRight = directs.rightId > 0;
            const hasChildren = hasLeft || hasRight;
            
            console.log(`User ${id}: left=${directs.leftId}, right=${directs.rightId}, hasChildren=${hasChildren}`);
            
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
                    console.warn(`Could not get full info for user ${id}, using basic info`);
                }
            }
            
            // محاسبه موقعیت فرزندان
            const spacing = Math.pow(2, 10 - Math.min(level, 8));
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
            
            // اضافه کردن فرزندان به صف
            if (hasChildren) {
                if (hasLeft && !tree[directs.leftId] && tree[id].expanded) {
                    queue.push({ 
                        id: Number(directs.leftId), 
                        level: level + 1, 
                        position: leftPosition 
                    });
                }
                if (hasRight && !tree[directs.rightId] && tree[id].expanded) {
                    queue.push({ 
                        id: Number(directs.rightId), 
                        level: level + 1, 
                        position: rightPosition 
                    });
                }
            }
            
        } catch (error) {
            console.error(`Error loading user ${id}:`, error);
            tree[id] = createBasicNode(id, level, position, false);
            tree[id].error = true;
            processedCount++;
        }
        
        // تاخیر کوچک برای جلوگیری از block
        if (processedCount % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    console.log(`✅ Total nodes processed: ${processedCount}`, tree);
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
function updateLoadingProgress(current, total, text) {
    const percentage = Math.min(Math.round((current / total) * 100), 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    loadingText.textContent = text;
}

// Load complete network
async function loadCompleteNetwork() {
    try {
        showLoading('در حال بارگذاری شبکه زیرمجموعه...');
        
        if (!userInfo.id) {
            throw new Error('User info not loaded');
        }

        // اگر اولین بار هست، کاربر اصلی رو expand کن
        if (expandedNodes.size === 0) {
            expandedNodes.add(userInfo.id);
        }
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id);
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading network:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در بارگذاری شبکه</p>';
        hideLoading();
    }
}

// رندر درخت با ساختار عمودی
function renderTreeWithExpansion(treeStructure) {
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper';
    treeWrapper.id = 'treeWrapper';
    
    // محاسبه موقعیت‌ها برای مرکز کردن
    const allPositions = Object.values(treeStructure).map(node => node.position);
    const minPosition = allPositions.length > 0 ? Math.min(...allPositions) : 0;
    const maxPosition = allPositions.length > 0 ? Math.max(...allPositions) : 0;
    
    const levels = {};
    Object.values(treeStructure).forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    
    // ایجاد سطوح
    sortedLevels.forEach(level => {
        const levelElement = createLevelElement(level, levels[level], treeStructure);
        treeWrapper.appendChild(levelElement);
    });
    
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeWrapper);
    
    updateTreeStats(treeStructure);
    
    // اتوماتیک بزرگنمایی و مرکز کردن
    setTimeout(() => {
        autoZoomAndCenter();
    }, 500);
}

// ایجاد المان سطح
function createLevelElement(level, nodes, treeStructure) {
    const levelElement = document.createElement('div');
    levelElement.className = 'tree-level';
    levelElement.setAttribute('data-level', level);
    
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'level-nodes';
    
    // مرتب کردن نودها بر اساس موقعیت
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
    
    // موقعیت‌دهی نود
    nodeElement.style.marginLeft = `${node.position * 100}px`;
    
    const nodeBox = document.createElement('div');
    let boxClasses = 'node-box';
    if (node.isCurrentUser) boxClasses += ' current-user';
    if (node.error) boxClasses += ' error-node';
    if (node.expanded) boxClasses += ' expanded';
    if (node.hasChildren) boxClasses += ' clickable-node';
    if (node.hasChildren && !node.expanded) boxClasses += ' collapsed';
    
    nodeBox.className = boxClasses;
    
    const badges = [];
    if (node.isCurrentUser) badges.push('<span class="badge current-badge">شما</span>');
    if (node.error) badges.push('<span class="badge error-badge">خطا</span>');
    if (node.hasChildren && !node.expanded) badges.push('<span class="badge expand-badge">+</span>');
    if (node.expanded) badges.push('<span class="badge expand-badge">−</span>');
    
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
                <span class="info-label">چپ:</span>
                <span class="info-value">${node.leftId || '--'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">راست:</span>
                <span class="info-value">${node.rightId || '--'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">تعداد:</span>
                <span class="info-value">${node.leftCount + node.rightCount}</span>
            </div>
        </div>
        ${childrenSummary}
    `;
    
    // کلیک برای expand/collapse
    if (node.hasChildren) {
        nodeBox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNodeExpansion(node.id);
        });
    }
    
    nodeElement.appendChild(nodeBox);
    
    // اضافه کردن خطوط اتصال اگر expand شده و فرزند داره
    if (node.expanded && node.hasChildren) {
        addConnectionLines(nodeElement, node, treeStructure);
    }
    
    return nodeElement;
}

// اضافه کردن خطوط اتصال
function addConnectionLines(nodeElement, node, treeStructure) {
    // خط عمودی به سمت پایین
    const verticalLine = document.createElement('div');
    verticalLine.className = 'connection-line vertical-line';
    nodeElement.appendChild(verticalLine);
    
    // خطوط افقی به فرزندان
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

// تابع برای بزرگنمایی و مرکز کردن اتوماتیک
function autoZoomAndCenter() {
    const treeWrapper = document.getElementById('treeWrapper');
    if (!treeWrapper) return;
    
    // محاسبه اندازه مورد نیاز
    const treeWidth = treeWrapper.scrollWidth;
    const treeHeight = treeWrapper.scrollHeight;
    const containerWidth = treeContainer.clientWidth;
    const containerHeight = treeContainer.clientHeight;
    
    // محاسبه زوم اتوماتیک
    const zoomX = containerWidth / treeWidth * 0.9;
    const zoomY = containerHeight / treeHeight * 0.9;
    const autoZoom = Math.min(zoomX, zoomY, 1);
    
    // اعمال زوم
    currentZoom = autoZoom;
    applyZoom();
    
    // مرکز کردن
    setTimeout(() => {
        treeWrapper.scrollLeft = (treeWrapper.scrollWidth - containerWidth) / 2;
        treeWrapper.scrollTop = 0;
    }, 100);
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

// بروزرسانی درخت
async function refreshTree() {
    await reloadTree();
}

// بارگذاری مجدد درخت
async function reloadTree() {
    try {
        showLoading('در حال به‌روزرسانی درخت...');
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id);
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        hideLoading();
        
    } catch (error) {
        console.error('Error reloading tree:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در به‌روزرسانی درخت</p>';
        hideLoading();
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
    const treeWrapper = document.getElementById('treeWrapper');
    if (treeWrapper) {
        treeWrapper.scrollLeft = (treeWrapper.scrollWidth - treeContainer.clientWidth) / 2;
        treeWrapper.scrollTop = 0;
    }
}

function fitToScreen() {
    autoZoomAndCenter();
}

function resetView() {
    currentZoom = 1;
    applyZoom();
    centerView();
}

function applyZoom() {
    const treeWrapper = document.getElementById('treeWrapper');
    if (treeWrapper) {
        treeWrapper.style.transform = `scale(${currentZoom})`;
    }
}

// کنترل‌های درگ
function startDrag(e) {
    isDragging = true;
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

// کنترل اسکرول ماوس برای زوم
function handleWheel(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
}

// مدیریت لودینگ
function showLoading(text = 'در حال بارگذاری...') {
    loadingText.textContent = text;
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

// آپدیت آمار
function updateTreeStats(treeStructure) {
    const userCount = Object.keys(treeStructure).length;
    const levels = new Set(Object.values(treeStructure).map(node => node.level));
    const networkDepth = levels.size > 0 ? Math.max(...levels) + 1 : 0;
    const activeUsers = Object.values(treeStructure).filter(node => node.hasChildren).length;
    const totalChildren = Object.values(treeStructure).reduce((sum, node) => sum + node.leftCount + node.rightCount, 0);
    const expandedUsers = expandedNodes.size;
    
    document.getElementById('userCount').textContent = userCount;
    document.getElementById('networkDepth').textContent = networkDepth;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('totalChildren').textContent = totalChildren;
    document.getElementById('expandedUsers').textContent = expandedUsers;
}

// بستن آمار
function closeStats() {
    const stats = document.querySelector('.tree-stats');
    stats.style.display = 'none';
}

// باز کردن آمار (در صورت نیاز)
function openStats() {
    const stats = document.querySelector('.tree-stats');
    stats.style.display = 'block';
}