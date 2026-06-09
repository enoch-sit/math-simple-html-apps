const mainNumInput = document.getElementById('mainNum');
const circleContainer = document.getElementById('circle-container');
const singleRow = document.getElementById('single-row');

let targetTotal = 0;
let currentFactorPairs = [];
let currentFactorIndex = 0;
let currentMode = 1; // 1: 探索模式, 2: 完整排列模式

// 取得該數字的所有因數組合
function getFactorPairs(num) {
    let pairs = [];
    for (let i = 1; i <= num; i++) {
        if (num % i === 0) {
            pairs.push([i, num / i]);
        }
    }
    return pairs;
}

// 切換模式的函式
function toggleMode() {
    currentMode = currentMode === 1 ? 2 : 1;
    const btn = document.getElementById('toggleModeBtn');
    if (currentMode === 1) {
        btn.innerText = '切換至模式 2 (顯示所有排列)';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.style.boxShadow = '';
    } else {
        btn.innerText = '切換至模式 1 (探索模式)';
        btn.style.borderColor = '#e67e22';
        btn.style.color = '#e67e22';
        btn.style.boxShadow = '0 3px 0 #e67e22';
    }
    updateView();
}

// 核心渲染與視圖更新控制
function updateView() {
    let val = parseInt(mainNumInput.value);
    
    if (val > 999) {
        val = 999;
        mainNumInput.value = 999;
    }

    const f1Input = singleRow.querySelector('.factor1');
    const f2Input = singleRow.querySelector('.factor2');
    const indicator = singleRow.querySelector('.status-indicator');
    
    if (val > 0) {
        targetTotal = val;
        currentFactorPairs = getFactorPairs(val);
        
        if (currentMode === 1) {
            // 【模式 1】互動探索模式
            document.getElementById('formula-container').style.display = 'flex';
            resetToScatter(val);
            f1Input.value = 1;
            f2Input.value = val;
            handleArrange(singleRow);
            currentFactorIndex = currentFactorPairs.length > 1 ? 1 : 0;
        } else {
            // 【模式 2】直接顯示所有因數排列（縮小版）
            document.getElementById('formula-container').style.display = 'none';
            renderAllArrangements();
        }
    } else {
        targetTotal = 0;
        currentFactorPairs = [];
        currentFactorIndex = 0;
        f1Input.value = '';
        f2Input.value = '';
        singleRow.classList.remove('active', 'error', 'viewing');
        indicator.innerHTML = '';
        circleContainer.innerHTML = '';
    }
}

// 模式 2 專用：渲染所有排列組合
function renderAllArrangements() {
    circleContainer.innerHTML = '';
    circleContainer.className = ''; 
    circleContainer.style.display = 'flex';
    circleContainer.style.flexWrap = 'wrap';
    circleContainer.style.gap = '25px';
    circleContainer.style.justifyContent = 'center';
    circleContainer.style.gridTemplateColumns = '';
    circleContainer.style.gridTemplateRows = '';

    currentFactorPairs.forEach(pair => {
        const rows = pair[0];
        const cols = pair[1];

        // 建立每個排列的卡片外框
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.background = 'white';
        card.style.padding = '15px';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
        card.style.transition = 'transform 0.2s';
        
        card.onmouseenter = () => card.style.transform = 'scale(1.03)';
        card.onmouseleave = () => card.style.transform = 'none';

        // 標題顯示 (例如：2 × 3)
        const label = document.createElement('div');
        label.innerText = `${rows} × ${cols}`;
        label.style.fontSize = '18px';
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '10px';
        label.style.color = '#2c3e50';
        card.appendChild(label);

        // 建立縮小版網格
        const miniGrid = document.createElement('div');
        miniGrid.style.display = 'grid';
        
        // 根據行列多寡，動態計算適合的微型圓點尺寸，避免大型數字爆版
        let miniSize = 24; 
        if (cols > 10 || rows > 10) miniSize = 16;
        if (cols > 25 || rows > 25) miniSize = 10;
        if (cols > 50 || rows > 50) miniSize = 6;
        if (cols > 100 || rows > 100) miniSize = 3;
        
        const gap = Math.max(1, miniSize * 0.2);

        miniGrid.style.gridTemplateColumns = `repeat(${cols}, ${miniSize}px)`;
        miniGrid.style.gridTemplateRows = `repeat(${rows}, ${miniSize}px)`;
        miniGrid.style.gap = `${gap}px`;

        // 塞入圓點
        for (let i = 0; i < targetTotal; i++) {
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.style.width = `${miniSize}px`;
            circle.style.height = `${miniSize}px`;
            circle.style.border = `${Math.max(1, miniSize * 0.05)}px solid #f39c12`;
            circle.style.boxShadow = `0 ${Math.max(1, miniSize * 0.1)}px 0 #d35400`;
            circle.style.transform = 'none';
            miniGrid.appendChild(circle);
        }

        card.appendChild(miniGrid);
        circleContainer.appendChild(card);
    });
}

function setDynamicSize(rows, cols) {
    const containerW = window.innerWidth * 0.85; 
    const containerH = window.innerHeight * 0.55; 

    const maxW = containerW / (1.25 * cols - 0.25);
    const maxH = containerH / (1.25 * rows - 0.25);

    const size = Math.max(5, Math.min(45, Math.min(maxW, maxH)));
    const gap = size * 0.25;

    document.documentElement.style.setProperty('--circle-size', `${size}px`);
    document.documentElement.style.setProperty('--gap-size', `${gap}px`);
}

// 監聽整數輸入框
mainNumInput.addEventListener('input', updateView);

// 點擊「⏭」下一個因數組合的邏輯
function nextFactorPair(event) {
    event.stopPropagation();
    if (currentFactorPairs.length === 0 || targetTotal === 0) return;

    const f1Input = singleRow.querySelector('.factor1');
    const f2Input = singleRow.querySelector('.factor2');
    
    const pair = currentFactorPairs[currentFactorIndex];
    f1Input.value = pair[0];
    f2Input.value = pair[1];

    handleArrange(singleRow);

    currentFactorIndex = (currentFactorIndex + 1) % currentFactorPairs.length;
}

function swapValues(event, btnElement) {
    event.stopPropagation(); 
    
    const row = btnElement.closest('.formula-row');
    const input1 = row.querySelector('.factor1');
    const input2 = row.querySelector('.factor2');
    
    const temp = input1.value;
    input1.value = input2.value;
    input2.value = temp;

    if (input1.value !== '' && input2.value !== '') {
        handleArrange(row);
    }
}

function resetToScatter(count) {
    circleContainer.innerHTML = '';
    circleContainer.className = ''; 
    circleContainer.style.display = 'flex';
    circleContainer.style.flexWrap = 'wrap';
    circleContainer.style.gap = 'var(--gap-size)';
    circleContainer.style.justifyContent = 'center';
    circleContainer.style.gridTemplateColumns = '';
    circleContainer.style.gridTemplateRows = '';
    
    const colsEstimate = Math.ceil(Math.sqrt(count * 1.5));
    const rowsEstimate = Math.ceil(count / colsEstimate);
    setDynamicSize(rowsEstimate, colsEstimate);

    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'circle';
        div.style.transform = `rotate(${Math.random() * 40 - 20}deg)`; 
        circleContainer.appendChild(div);
    }
}

function shakeRow(element) {
    element.style.animation = "none";
    void element.offsetWidth; 
    element.style.animation = "shake 0.3s";
}

function handleArrange(row) {
    if (targetTotal === 0) return;

    const f1Input = row.querySelector('.factor1');
    const f2Input = row.querySelector('.factor2');
    const indicator = row.querySelector('.status-indicator');
    const f1 = parseInt(f1Input.value);
    const f2 = parseInt(f2Input.value);

    if (isNaN(f1) || isNaN(f2)) {
        row.classList.remove('active', 'error', 'viewing');
        indicator.innerHTML = '';
        return;
    }

    if (f1 * f2 === targetTotal) {
        row.classList.remove('error');
        row.classList.add('active', 'viewing');
        indicator.innerHTML = '<span class="status-success">✅</span>';
        applyGridLayout(f1, f2);
    } else {
        row.classList.remove('active', 'viewing');
        row.classList.add('error');
        indicator.innerHTML = '<span class="status-error">錯誤</span>';
        shakeRow(row);
        resetToScatter(targetTotal);
    }
}

function applyGridLayout(rows, cols) {
    setDynamicSize(rows, cols);

    circleContainer.className = 'grid-layout';
    circleContainer.style.display = 'grid';
    circleContainer.style.gridTemplateColumns = `repeat(${cols}, var(--circle-size))`;
    circleContainer.style.gridTemplateRows = `repeat(${rows}, var(--circle-size))`;
    circleContainer.style.gap = 'var(--gap-size)';
    circleContainer.style.justifyContent = 'center';
    
    const circles = circleContainer.querySelectorAll('.circle');
    circles.forEach(c => c.style.transform = 'none');
}
