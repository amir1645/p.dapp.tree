// ساخت درخت با ساختار عمودی واقعی - نسخه اصلاح شده
async function buildTreeWithExpansion(rootId) {
    const queue = [];
    const tree = {};
    let processedCount = 0;
    const maxProcess = 1000; // کاهش برای عملکرد بهتر

    // همیشه کاربر اصلی expand باشه
    expandedNodes.add(rootId);
    
    queue.push({ id: rootId, level: 0, position: 0 });
    
    while (queue.length > 0 && processedCount < maxProcess) {
        const { id, level, position } = queue.shift();
        
        if (tree[id]) continue;
        
        try {
            // اول مستقیم‌ها رو بگیر
            const directs = await contract.methods.getUserDirects(id).call();
            const hasLeft = directs.leftId > 0;
            const hasRight = directs.rightId > 0;
            const hasChildren = hasLeft || hasRight;
            
            console.log(`User ${id}: left=${directs.leftId}, right=${directs.rightId}, hasChildren=${hasChildren}`);
            
            // اطلاعات کاربر رو بگیر
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
            const spacing = Math.pow(2, 8 - Math.min(level, 6)); // فاصله منطقی‌تر
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
            
            // همیشه فرزندان مستقیم رو اضافه کن، اما فقط اگر expand شده باشن نمایش بده
            if (hasChildren) {
                if (hasLeft && !tree[directs.leftId]) {
                    queue.push({ 
                        id: Number(directs.leftId), 
                        level: level + 1, 
                        position: leftPosition 
                    });
                }
                if (hasRight && !tree[directs.rightId]) {
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
        
        // نمایش پیشرفت
        if (processedCount % 10 === 0) {
            updateProgress(processedCount);
        }
        
        // تاخیر کوچک برای جلوگیری از block
        if (processedCount % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`✅ Total nodes processed: ${processedCount}`, tree);
    return tree;
}

// رندر درخت با ساختار عمودی - نسخه اصلاح شده
function renderTreeWithExpansion(treeStructure) {
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'tree-wrapper';
    treeWrapper.id = 'treeWrapper';
    
    // محاسبه عرض مورد نیاز بر اساس موقعیت‌ها
    const allPositions = Object.values(treeStructure).map(node => node.position);
    const minPosition = Math.min(...allPositions);
    const maxPosition = Math.max(...allPositions);
    const requiredWidth = (maxPosition - minPosition) * 100 + 2000; // padding
    
    treeWrapper.style.minWidth = `${requiredWidth}px`;
    
    const levels = {};
    Object.values(treeStructure).forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    
    // محاسبه مرکز برای تراز وسط
    const centerOffset = -(minPosition + maxPosition) / 2 * 100;
    
    sortedLevels.forEach(level => {
        const levelElement = createLevelElement(level, levels[level], treeStructure, centerOffset);
        treeWrapper.appendChild(levelElement);
    });
    
    treeContainer.innerHTML = '';
    treeContainer.appendChild(treeWrapper);
    
    updateTreeStats(treeStructure);
    
    // اتوماتیک بزرگنمایی و مرکز کردن
    autoZoomAndCenter();
}

// ایجاد المان سطح - نسخه اصلاح شده
function createLevelElement(level, nodes, treeStructure, centerOffset) {
    const levelElement = document.createElement('div');
    levelElement.className = 'tree-level';
    levelElement.setAttribute('data-level', level);
    
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'level-nodes';
    nodesContainer.style.transform = `translateX(${centerOffset}px)`;
    
    // مرتب کردن نودها بر اساس موقعیت
    nodes.sort((a, b) => a.position - b.position).forEach(node => {
        const nodeElement = createNodeElement(node, treeStructure);
        nodesContainer.appendChild(nodeElement);
    });
    
    levelElement.appendChild(nodesContainer);
    return levelElement;
}

// ایجاد المان نود - نسخه اصلاح شده
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
    
    // نمایش اطلاعات بهتر
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

// اضافه کردن خطوط اتصال - نسخه اصلاح شده
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

// تابع جدید برای بزرگنمایی و مرکز کردن اتوماتیک
function autoZoomAndCenter() {
    const treeWrapper = document.getElementById('treeWrapper');
    if (!treeWrapper) return;
    
    // محاسبه اندازه مورد نیاز
    const treeWidth = treeWrapper.scrollWidth;
    const treeHeight = treeWrapper.scrollHeight;
    const containerWidth = treeContainer.clientWidth;
    const containerHeight = treeContainer.clientHeight;
    
    // محاسبه زوم اتوماتیک
    const zoomX = containerWidth / treeWidth * 0.8;
    const zoomY = containerHeight / treeHeight * 0.8;
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

// toggle expansion نود - نسخه اصلاح شده
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

// بارگذاری مجدد درخت - نسخه اصلاح شده
async function reloadTree() {
    try {
        treeContainer.innerHTML = '<div class="loading">⏳ در حال به‌روزرسانی درخت...</div>';
        
        const treeStructure = await buildTreeWithExpansion(userInfo.id);
        currentTree = treeStructure;
        
        renderTreeWithExpansion(treeStructure);
        
    } catch (error) {
        console.error('Error reloading tree:', error);
        treeContainer.innerHTML = '<p class="error">❌ خطا در به‌روزرسانی درخت</p>';
    }
}

// کنترل‌های زوم - نسخه اصلاح شده
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

function applyZoom() {
    const treeWrapper = document.getElementById('treeWrapper');
    if (treeWrapper) {
        treeWrapper.style.transform = `scale(${currentZoom})`;
        treeWrapper.style.transformOrigin = 'center top';
    }
}