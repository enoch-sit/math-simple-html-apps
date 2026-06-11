// 停用預設右鍵選單，改為觸發自訂選單
document.addEventListener('contextmenu', event => {
    if (!event.target.closest('.input-card')) {
        event.preventDefault();
    }
});

// 停用鍵盤快捷鍵
document.onkeydown = function(e) {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) return false;
    if (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 85 || e.keyCode === 83)) return false;
};


/* ===== next inline <script> block ===== */

const colors = ['var(--primary)', 'var(--accent)', 'var(--success)'];

// 狀態管理 (初始數值調整為最少1，以符合新規範)
let state = [
    { format: 'fraction', w: 1, n: 1, d: 2 },
    { format: 'fraction', w: 1, n: 3, d: 4 },
    { format: 'mixed', w: 1, n: 1, d: 2 }
];
let containerWidths = [100, 100, 100]; // 每個長條圖的百分比寬度
let vOffsets = [0, 0, 0]; // 記錄每個圖表的垂直偏移量

let activeCount = 2;
let targetIndexForMenu = 0;
let showNL = true;
let pressTimer;
let isSyncMode = true; // 模式1：鎖定長度100%

// 拖拉變數
let draggingIndex = -1;
let startX = 0, startY = 0;
let initialV = 0;
let dragMode = null; // 'h' 表示橫向縮放, 'v' 表示垂直移動
let isBarTarget = false;

function init() {
    renderInputs();
    updateVisuals();
    setupGlobalDrag();

    // 點擊空白處隱藏選單
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context_menu')) {
            document.getElementById('context_menu').classList.remove('show');
        }
    });
}

function toggleSyncMode() {
    isSyncMode = !isSyncMode;
    const btn = document.getElementById('btn_toggle_sync');
    const lenControls = document.getElementById('length_controls');
    
    if (isSyncMode) {
        btn.innerText = '模式1';
        btn.classList.add('btn-active-mode');
        lenControls.style.display = 'none';
        // 強制恢復全滿且無垂直偏移
        containerWidths = [100, 100, 100];
        vOffsets = [0, 0, 0];
    } else {
        btn.innerText = '模式2';
        btn.classList.remove('btn-active-mode');
        lenControls.style.display = 'flex';
    }
    updateVisuals();
}

function changeCount(val) {
    activeCount = parseInt(val);
    for (let i = 0; i < activeCount; i++) {
        if (containerWidths[i] === undefined) containerWidths[i] = 100;
        if (vOffsets[i] === undefined) vOffsets[i] = 0;
    }
    renderInputs();
    updateVisuals();
}

function randomizeBars() {
    if (isSyncMode) return;
    for (let i = 0; i < activeCount; i++) {
        containerWidths[i] = 30 + Math.random() * 60; // 30% ~ 90%
    }
    updateVisuals();
}

function matchBars() {
    if (isSyncMode) return;
    for (let i = 0; i < activeCount; i++) {
        containerWidths[i] = 100;
    }
    updateVisuals();
}

function toggleNumberLine() {
    showNL = document.getElementById('cb_toggle_nl').checked;
    // Sync per-card checkboxes
    for (let i = 0; i < activeCount; i++) {
        const c = document.getElementById(`cb_nl_${i}`);
        if (c) c.checked = showNL;
    }
    const wrappers = document.querySelectorAll('.number-line-wrapper');
    wrappers.forEach(w => w.style.display = showNL ? 'block' : 'none');
}

// 手動輸入與防呆 (w 欄位最小0，其他欄位最小1，最大99)
function handleInput(index, field, value) {
    let val = parseInt(value);
    let minVal = (field === 'w') ? 0 : 1;
    if (isNaN(val)) val = minVal;
    if (val < minVal) val = minVal;
    if (val > 99) val = 99;

    state[index][field] = val;
    document.getElementById(`input_${index}_${field}`).value = val;
    updateVisuals();
}

// 按鈕加減控制 (w 欄位最小0，其他欄位最小1，最大99)
function stepVal(index, field, delta) {
    let el = document.getElementById(`input_${index}_${field}`);
    let val = parseInt(el.value);
    let minVal = (field === 'w') ? 0 : 1;
    if (isNaN(val)) val = minVal;
    val += delta;
    
    if (val < minVal) val = minVal;
    if (val > 99) val = 99;
    
    el.value = val;
    state[index][field] = val;
    updateVisuals();
}

// 渲染輸入區
function renderInputs() {
    const container = document.getElementById('inputs_container');
    container.innerHTML = '';

    const makeWrapper = (i, field, val, max, min=0, extraClass='') => `
        <div class="input-wrapper ${extraClass}">
            <input type="number" id="input_${i}_${field}" value="${val}" min="${field === 'w' ? 0 : 1}" max="99"
                   oninput="handleInput(${i}, '${field}', this.value)">
            <div class="stepper-btn-group">
                <button class="step-btn up" onclick="stepVal(${i}, '${field}', 1)">+</button>
                <button class="step-btn down" onclick="stepVal(${i}, '${field}', -1)">-</button>
            </div>
        </div>
    `;

    for (let i = 0; i < activeCount; i++) {
        const data = state[i];
        const card = document.createElement('div');
        card.className = 'input-card';
        card.style.borderColor = colors[i];
        
        card.addEventListener('contextmenu', (e) => showMenu(e, i));
        card.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => showMenu(e, i, true), 600);
        }, {passive: false});
        card.addEventListener('touchend', () => clearTimeout(pressTimer));
        card.addEventListener('touchmove', () => clearTimeout(pressTimer));

        let contentHtml = '';

        if (data.format === 'integer') {
            contentHtml = makeWrapper(i, 'w', data.w, 100, 0, 'wrapper-w');
        } else if (data.format === 'fraction') {
            contentHtml = `
                <div class="fraction-group">
                    ${makeWrapper(i, 'n', data.n, 100)}
                    <div class="fraction-line"></div>
                    ${makeWrapper(i, 'd', data.d, 100, 1)}
                </div>`;
        } else if (data.format === 'mixed') {
            contentHtml = `
                <div class="mixed-group">
                    ${makeWrapper(i, 'w', data.w, 100, 0, 'wrapper-w')}
                    <div class="fraction-group">
                        ${makeWrapper(i, 'n', data.n, 100)}
                        <div class="fraction-line"></div>
                        ${makeWrapper(i, 'd', data.d, 100, 1)}
                    </div>
                </div>`;
        }

        // Per-card controls row (number line toggle + format buttons)
        const fmtActive = (fmt) => data.format === fmt
            ? 'border-color:#34495e; color:#34495e; box-shadow:0 3px 0 #34495e;'
            : '';
        contentHtml += `
            <div class="card-controls">
                <label class="checkbox-label card-cb">
                    <input type="checkbox" id="cb_nl_${i}" onchange="toggleNumberLineCard(${i})" ${showNL ? 'checked' : ''}> 數線
                </label>
                <span class="card-divider"></span>
                <button class="lang-btn card-fmt-btn" onclick="setFormatCard(${i}, 'integer')" style="${fmtActive('integer')}">整數</button>
                <button class="lang-btn card-fmt-btn" onclick="setFormatCard(${i}, 'fraction')" style="${fmtActive('fraction')}">分數</button>
                <button class="lang-btn card-fmt-btn" onclick="setFormatCard(${i}, 'mixed')" style="${fmtActive('mixed')}">帶分數</button>
            </div>
        `;

        card.innerHTML = contentHtml;
        container.appendChild(card);
    }
}

// Per-card format change (no right-click needed)
function setFormatCard(index, format) {
    state[index].format = format;
    if (format === 'integer') state[index].n = 1;
    if (format === 'fraction') state[index].w = 1;
    renderInputs();
    updateVisuals();
}

// Per-card number line toggle
function toggleNumberLineCard(index) {
    const cb = document.getElementById(`cb_nl_${index}`);
    if (!cb) return;
    // Sync all per-card checkboxes and the global one
    showNL = cb.checked;
    document.getElementById('cb_toggle_nl').checked = showNL;
    // Update all per-card checkboxes
    for (let i = 0; i < activeCount; i++) {
        const c = document.getElementById(`cb_nl_${i}`);
        if (c) c.checked = showNL;
    }
    const wrappers = document.querySelectorAll('.number-line-wrapper');
    wrappers.forEach(w => w.style.display = showNL ? 'block' : 'none');
}

// Global format toggle from nav bar buttons
function setFormatGlobal(format) {
    for (let i = 0; i < activeCount; i++) {
        state[i].format = format;
        if (format === 'integer') state[i].n = 1;
        if (format === 'fraction') state[i].w = 1;
    }
    
    // Update button active states
    const btns = { integer: 'btn-fmt-integer', fraction: 'btn-fmt-fraction', mixed: 'btn-fmt-mixed' };
    Object.entries(btns).forEach(([m, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (m === format) {
            btn.style.borderColor = '#34495e';
            btn.style.color = '#34495e';
            btn.style.boxShadow = '0 3px 0 #34495e';
        } else {
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.boxShadow = '';
        }
    });

    renderInputs();
    updateVisuals();
}

// 右鍵選單邏輯 (修改：切換隱藏屬性時設定為符合新規範的1)
function showMenu(e, index, isTouch = false) {
    e.preventDefault();
    targetIndexForMenu = index;
    const menu = document.getElementById('context_menu');
    
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (isTouch && e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';
    menu.classList.add('show');
}

function setFormat(format) {
    state[targetIndexForMenu].format = format;
    
    if (format === 'integer') state[targetIndexForMenu].n = 1;
    if (format === 'fraction') state[targetIndexForMenu].w = 1;

    document.getElementById('context_menu').classList.remove('show');
    renderInputs();
    updateVisuals();
}

function getDecimalValue(data) {
    let w = data.format === 'fraction' ? 0 : data.w;
    let num = data.format === 'integer' ? 0 : data.n;
    let den = data.format === 'integer' ? 1 : data.d;
    if (den === 0) return w;
    return w + (num / den);
}

// 產生直式分數的 HTML
function getVerticalFractionHtml(data) {
    if (data.format === 'integer') {
        return `<span style="font-size: 1.4rem;">${data.w}</span>`;
    }
    if (data.format === 'fraction') {
        return `
            <span class="disp-frac">
                <span class="disp-num">${data.n}</span>
                <span class="disp-den">${data.d}</span>
            </span>
        `;
    }
    if (data.format === 'mixed') {
        return `
            <span class="disp-mixed">
                <span>${data.w}</span>
                <span class="disp-frac">
                    <span class="disp-num">${data.n}</span>
                    <span class="disp-den">${data.d}</span>
                </span>
            </span>
        `;
    }
    return '';
}

function updateVisuals() {
    const container = document.getElementById('visuals_container');
    container.innerHTML = '';

    let maxValue = 0;
    for (let i = 0; i < activeCount; i++) {
        let val = getDecimalValue(state[i]);
        if (val > maxValue) maxValue = val;
    }
    let scaleMax = Math.max(1, Math.ceil(maxValue));

    let widthsMatch = true;
    if (!isSyncMode) {
        let w0 = containerWidths[0];
        for (let i = 1; i < activeCount; i++) {
            if (Math.abs(w0 - containerWidths[i]) > 0.5) {
                widthsMatch = false;
                break;
            }
        }
    }

    for (let i = 0; i < activeCount; i++) {
        const data = state[i];
        const color = (isSyncMode || widthsMatch) ? colors[i] : '#95a5a6'; // 不一致時變灰
        const borderColor = (isSyncMode || widthsMatch) ? colors[i] : 'var(--red)';
        const shadow = (!isSyncMode && !widthsMatch) ? '0 0 8px rgba(231, 76, 60, 0.4)' : 'none';
        
        let w = data.format === 'fraction' ? 0 : data.w;
        let n = data.format === 'integer' ? 0 : data.n;
        let d = data.format === 'integer' ? 1 : data.d;

        let value = w + (n / d);
        let percent = (value / scaleMax) * 100;
        if (percent > 100) percent = 100;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'visual-item';
        itemDiv.id = `visual_item_${i}`;
        
        // 模式2允許上下自由拖移
        if (!isSyncMode) {
            itemDiv.style.position = 'relative';
            itemDiv.style.zIndex = '1';
            itemDiv.style.transform = `translateY(${vOffsets[i] || 0}px)`;
            itemDiv.style.touchAction = 'none';
            itemDiv.style.cursor = 'move';
        }

        let labelHtml = `
            <div class="bar-label" style="color: ${color}">
                <span class="color-dot" style="background: ${color}"></span>
                ${getVerticalFractionHtml(data)}
            </div>
        `;

        let totalSegments = scaleMax * d; 
        let gridHtml = '<div class="grid-overlay">';
        for(let j=1; j <= totalSegments; j++) {
            gridHtml += `<div class="segment"></div>`;
            if (j < totalSegments) {
                let isWholeNumber = (j % d === 0);
                gridHtml += `<div class="${isWholeNumber ? 'divider-thick' : 'divider-thin'}"></div>`;
            }
        }
        gridHtml += '</div>';

        let draggableClass = isSyncMode ? '' : 'draggable-bar';
        let barHtml = `
            <div class="bar-container ${draggableClass}" id="bar_container_${i}" style="border-color: ${borderColor}; width: ${containerWidths[i]}%; box-shadow: ${shadow};">
                <div class="bar-fill" style="width: ${percent}%; background: ${color};"></div>
                ${gridHtml}
            </div>
        `;

        let nlHtml = `<div class="number-line-wrapper" id="nl_wrapper_${i}" style="display: ${showNL ? 'block' : 'none'}; width: ${containerWidths[i]}%;">
                        <div class="number-line-container">
                            <div class="nl-line"></div>
                            <div class="nl-ticks-container">${generateTicks(scaleMax, d)}</div>
                        </div>
                      </div>`;

        itemDiv.innerHTML = labelHtml + barHtml + nlHtml;
        container.appendChild(itemDiv);
    }

    // 綁定整合拖拉事件（允許橫向或垂直）
    if (!isSyncMode) {
        for (let i = 0; i < activeCount; i++) {
            const itemDiv = document.getElementById(`visual_item_${i}`);
            itemDiv.addEventListener('mousedown', (e) => handleDragStart(e, i));
            itemDiv.addEventListener('touchstart', (e) => handleDragStart(e, i), {passive: false});
        }
    }

    // 模式2 不一致時的錯誤提示
    let errorHint = document.createElement('div');
    errorHint.id = 'error_hint';
    errorHint.style.color = 'var(--red)';
    errorHint.style.fontWeight = 'bold';
    errorHint.style.textAlign = 'center';
    errorHint.style.marginTop = '10px';
    errorHint.innerText = (!isSyncMode && !widthsMatch) ? "⚠️ 長條圖整體長度不一致！請拖拉邊框至相同長度，才能比較大小。" : "";
    container.appendChild(errorHint);
}

function generateTicks(scaleMax, den) {
    let html = '';
    let totalTicks = scaleMax * den;
    for (let i = 0; i <= totalTicks; i++) {
        let leftPos = (i / totalTicks) * 100;
        let isMajor = (i % den === 0);
        let wholePart = Math.floor(i / den);
        let remPart = i % den;

        let labelHtml = '';
        if (isMajor) {
            labelHtml = `<span style="font-size:1rem;">${wholePart}</span>`;
        } else {
            if (wholePart === 0) {
                labelHtml = `<span class="nl-frac"><span class="nl-num">${remPart}</span><span class="nl-line-frac"></span><span class="nl-den">${den}</span></span>`;
            } else {
                labelHtml = `<span class="nl-frac" style="flex-direction: row; gap: 3px; align-items: center;">
                                <span style="font-size:1rem;">${wholePart}</span>
                                <span style="display:inline-flex; flex-direction:column; align-items:center;">
                                    <span class="nl-num">${remPart}</span><span class="nl-line-frac"></span><span class="nl-den">${den}</span>
                                </span>
                             </span>`;
            }
        }

        html += `
            <div class="nl-tick-wrapper" style="left: ${leftPos}%;">
                <div class="nl-tick ${isMajor ? 'major' : ''}"></div>
                <div class="nl-label">${labelHtml}</div>
            </div>
        `;
    }
    return html;
}

// === 拖拉改變長度或垂直排列邏輯 ===
function setupGlobalDrag() {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, {passive: false});
    window.addEventListener('touchend', handleDragEnd);
}

function handleDragStart(e, index) {
    if (isSyncMode) return;
    draggingIndex = index;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    startX = clientX;
    startY = clientY;
    initialV = vOffsets[index] || 0;
    dragMode = null; // 重置拖移模式
    isBarTarget = (e.target && e.target.closest && e.target.closest('.bar-container') !== null);

    const container = document.getElementById(`bar_container_${index}`);
    const nlWrapper = document.getElementById(`nl_wrapper_${index}`);
    const item = document.getElementById(`visual_item_${index}`);
    
    if(container) container.style.transition = 'none';
    if(nlWrapper) nlWrapper.style.transition = 'none';
    if(item) {
        item.style.transition = 'none';
        item.style.zIndex = '10'; // 拖移時置頂
    }
}

function handleDragMove(e) {
    if (draggingIndex === -1 || isSyncMode) return;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    // 判斷移動方向 (需大於 5px 的容錯閥值)
    if (!dragMode) {
        let dx = Math.abs(clientX - startX);
        let dy = Math.abs(clientY - startY);
        if (dx > 5 || dy > 5) {
            // 如果是點擊在長條圖內，且左右滑動幅度大於上下，才判定為橫向縮放
            if (dx > dy && isBarTarget) {
                dragMode = 'h';
            } else {
                dragMode = 'v';
            }
        } else {
            return; // 等待達標
        }
    }
    
    if (dragMode === 'h') {
        const container = document.getElementById(`bar_container_${draggingIndex}`);
        if (!container) return;
        const parent = container.parentElement;
        const rect = parent.getBoundingClientRect();
        
        let x = clientX - rect.left;
        let percent = (x / rect.width) * 100;
        if (percent < 5) percent = 5;
        if (percent > 100) percent = 100;
        
        // 磁吸效果
        let snapThreshold = 3; 
        if (Math.abs(percent - 100) < snapThreshold) percent = 100;
        else {
            for (let j = 0; j < activeCount; j++) {
                if (j !== draggingIndex) {
                    if (Math.abs(percent - containerWidths[j]) < snapThreshold) {
                        percent = containerWidths[j];
                        break;
                    }
                }
            }
        }
        
        containerWidths[draggingIndex] = percent;
        updateDragStyles();

    } else if (dragMode === 'v') {
        let dy = clientY - startY;
        vOffsets[draggingIndex] = initialV + dy;
        const item = document.getElementById(`visual_item_${draggingIndex}`);
        if (item) {
            item.style.transform = `translateY(${vOffsets[draggingIndex]}px)`;
        }
    }

    if (e.type === 'touchmove') e.preventDefault();
}

function handleDragEnd(e) {
    if (draggingIndex !== -1) {
        // 如果點擊後沒有移動就放開，且點擊的是長條圖內，則執行原始的點擊設定寬度功能
        if (!dragMode && isBarTarget) {
            const container = document.getElementById(`bar_container_${draggingIndex}`);
            if (container) {
                const parent = container.parentElement;
                const rect = parent.getBoundingClientRect();
                let x = startX - rect.left;
                let percent = (x / rect.width) * 100;
                if (percent < 5) percent = 5;
                if (percent > 100) percent = 100;
                
                let snapThreshold = 3; 
                if (Math.abs(percent - 100) < snapThreshold) percent = 100;
                else {
                    for (let j = 0; j < activeCount; j++) {
                        if (j !== draggingIndex) {
                            if (Math.abs(percent - containerWidths[j]) < snapThreshold) {
                                percent = containerWidths[j];
                                break;
                            }
                        }
                    }
                }
                containerWidths[draggingIndex] = percent;
                updateDragStyles();
            }
        }

        const container = document.getElementById(`bar_container_${draggingIndex}`);
        const nlWrapper = document.getElementById(`nl_wrapper_${draggingIndex}`);
        const item = document.getElementById(`visual_item_${draggingIndex}`);
        
        if(container) container.style.transition = 'width 0.3s ease, border-color 0.3s, box-shadow 0.3s';
        if(nlWrapper) nlWrapper.style.transition = 'width 0.3s ease';
        if(item) {
            item.style.zIndex = '1';
        }
        
        draggingIndex = -1;
        dragMode = null;
    }
}

function updateDragStyles() {
    let widthsMatch = true;
    let w0 = containerWidths[0];
    for (let i = 1; i < activeCount; i++) {
        if (Math.abs(w0 - containerWidths[i]) > 0.5) {
            widthsMatch = false;
            break;
        }
    }

    for (let i = 0; i < activeCount; i++) {
        const container = document.getElementById(`bar_container_${i}`);
        const nlWrapper = document.getElementById(`nl_wrapper_${i}`);
        if (container) container.style.width = containerWidths[i] + '%';
        if (nlWrapper) nlWrapper.style.width = containerWidths[i] + '%';

        const fill = container.querySelector('.bar-fill');
        const colorDot = container.parentElement.querySelector('.color-dot');
        const label = container.parentElement.querySelector('.bar-label');

        const color = widthsMatch ? colors[i] : '#95a5a6';
        const borderColor = widthsMatch ? colors[i] : 'var(--red)';
        const shadow = !widthsMatch ? '0 0 8px rgba(231, 76, 60, 0.4)' : 'none';

        container.style.borderColor = borderColor;
        container.style.boxShadow = shadow;
        if (fill) fill.style.background = color;
        if (colorDot) colorDot.style.background = color;
        if (label) label.style.color = color;
    }

    let errorHint = document.getElementById('error_hint');
    if (errorHint) {
        errorHint.innerText = !widthsMatch ? "⚠️ 長條圖整體長度不一致！請拖拉邊框至相同長度，才能比較大小。" : "";
    }
}

// 初始化啟動
window.onload = init;
