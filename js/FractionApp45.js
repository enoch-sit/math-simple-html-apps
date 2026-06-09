// Disable right-click
document.addEventListener('contextmenu', event => event.preventDefault());

// Disable keyboard shortcuts
document.onkeydown = function(e) {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) return false;
    if (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 85 || e.keyCode === 83)) return false;
};


/* ===== next inline <script> block ===== */

let currentWordProblemTemplate = null; 
let currentSpeed = 1.0; 
let isRearranged = false; 
let isAnimating = false;
let isRearranging = false;
let animBlocks = []; 
let preRearrangePositions = [];
let currentNL_D = 1; 
let isPhase1OrLater = false; 

// 教學引導變數
let idleTimer = null;
let hoverTimer = null;
let currentTutorialStep = 0; // 0: frac1, 1: frac2, 2: rearrange, 3: answer, 4: done

const wordProblemTemplates = [
    "一盒巧克力重 [FRAC1] 公斤，小明買了 [FRAC2] 盒。請問總共重多少公斤？",
    "一塊農田面積為 [FRAC1] 公頃，第二塊面積是第一塊的 [FRAC2] 倍。請問第二塊農田的面積是多少公頃？",
    "媽媽做一塊蛋糕需要 [FRAC1] 杯麵粉，她做了 [FRAC2] 塊蛋糕。請問總共需要多少杯麵粉？",
    "水桶容量為 [FRAC1] 公升，目前裝了 [FRAC2] 桶水。請問總共有多少公升的水？",
    "紅彩帶長 [FRAC1] 公尺，藍彩帶長度是紅彩帶的 [FRAC2] 倍。請問藍彩帶長多少公尺？"
];

// --- 教學引導相關函數 ---
function pointAtTarget(element) {
    const finger = document.getElementById('tutorial-finger');
    if (!finger || !element) return;
    const rect = element.getBoundingClientRect();
    finger.style.display = 'block';
    
    let targetX = rect.left + rect.width / 2 + window.scrollX;
    let targetY = rect.top + rect.height / 2 + window.scrollY;
    
    // 微調讓手指尖端指向目標中心
    finger.style.left = (targetX - 25) + 'px'; 
    finger.style.top = (targetY - 10) + 'px'; 
    finger.className = 'finger-clicking';
}

function hideFinger() {
    const finger = document.getElementById('tutorial-finger');
    if (finger) {
        finger.style.display = 'none';
        finger.className = '';
    }
}

function showIdleHint() {
    if (isAnimating) return;
    let target = null;
    if (currentTutorialStep === 0) target = document.getElementById('frac1-group');
    else if (currentTutorialStep === 1) target = document.getElementById('frac2-group');
    else if (currentTutorialStep === 2) target = document.getElementById('main-bar-wrap');
    else if (currentTutorialStep === 3) target = document.getElementById('ans-num');
    
    if (target && target.style.display !== 'none' && target.getBoundingClientRect().width > 0) {
        pointAtTarget(target);
    }
}

function setupHoverHints() {
    const triggers = [
        { id: 'frac1-group', step: 0 },
        { id: 'frac2-group', step: 1 },
        { id: 'main-bar-wrap', step: 2 },
        { id: 'bottom-answer-zone', step: 3 }
    ];
    
    triggers.forEach(t => {
        const el = document.getElementById(t.id);
        if (!el) return;
        el.addEventListener('mouseenter', () => {
            if (currentTutorialStep === t.step && !isAnimating) {
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => {
                    pointAtTarget(el);
                }, 1000); // 懸停 1 秒觸發
            }
        });
        el.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            hideFinger();
            if (!isAnimating) {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(showIdleHint, 3000);
            }
        });
    });
}
// ------------------------

function toggleWholeNumber() {
    const showWhole = document.getElementById('show-whole-cb').checked;
    document.getElementById('w1').style.display = showWhole ? 'inline-block' : 'none';
    document.getElementById('w2').style.display = showWhole ? 'inline-block' : 'none';
    if (!showWhole) {
        document.getElementById('w1').value = '';
        document.getElementById('w2').value = '';
        document.getElementById('ans-w').value = '';
    }
    updateUI();
}

function updateSpeed() {
    currentSpeed = parseFloat(document.getElementById('speed-slider').value);
    document.getElementById('speed-val').innerText = currentSpeed.toFixed(1);
}

function toggleNumberLine() {
    if (isPhase1OrLater) {
        let nlWrap = document.getElementById('bar1-nl');
        if (nlWrap) nlWrap.style.display = 'none';
        return;
    }

    const vals = getSafeValues();
    let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;
    renderNumberLine('bar1-nl', maxW, currentNL_D);
    
    let wrap = document.getElementById('main-bar-wrap');
    const showNL = document.getElementById('show-nl-cb').checked;
    if (showNL) {
        wrap.classList.add('continuous');
    } else {
        wrap.classList.remove('continuous');
    }
}

function getSafeValues() {
    let w1 = parseInt(document.getElementById('w1').value) || 0;
    let d1 = parseInt(document.getElementById('d1').value) || 1;
    let n1 = parseInt(document.getElementById('n1').value) || 0;
    
    let w2 = parseInt(document.getElementById('w2').value) || 0;
    let d2 = parseInt(document.getElementById('d2').value) || 1;
    let n2 = parseInt(document.getElementById('n2').value) || 0;

    if (w1 < 0) w1 = 0; if (w2 < 0) w2 = 0;
    if (d1 < 1) d1 = 1; if (d1 > 10) d1 = 10;
    if (d2 < 1) d2 = 1; if (d2 > 10) d2 = 10;
    if (n1 < 0) n1 = 0; if (n2 < 0) n2 = 0;

    if (w1 === 0 && n1 === 0) n1 = 1;
    if (w2 === 0 && n2 === 0) n2 = 1;

    return { 
        w1, n1, d1, 
        w2, n2, d2, 
        total_n1: w1 * d1 + n1, 
        total_n2: w2 * d2 + n2 
    };
}

function updateMaxWholes() {
    const vals = getSafeValues();
    let maxW = Math.max(1, Math.ceil(vals.total_n1 / vals.d1), Math.ceil((vals.total_n1 * vals.total_n2) / (vals.d1 * vals.d2)));
    document.documentElement.style.setProperty('--max-wholes', maxW);
    return maxW;
}

function updateUI() {
    const vals = getSafeValues();
    document.getElementById('d1').value = vals.d1;
    document.getElementById('d2').value = vals.d2;
    
    let wpEl = document.getElementById('word-problem');
    if (currentWordProblemTemplate) {
        let frac1Html = `<b>${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}</b>`;
        let frac2Html = `<b>${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}</b>`;
        wpEl.innerHTML = currentWordProblemTemplate.replace(/\[FRAC1\]/g, frac1Html).replace(/\[FRAC2\]/g, frac2Html);
        wpEl.style.display = 'block';
    }
}

function getFracHtml(n, d, color = "inherit") {
    return `<div class="inline-frac" style="color: ${color};"><span>${n}</span><div class="line"></div><span>${d}</span></div>`;
}

function getDisplayHtml(w, n, d, color) {
    if (w > 0) {
        return `<div style="display:inline-flex; align-items:center;">
                    <span style="color:${color}; font-size:1.8rem; font-weight:bold; margin-right:4px; line-height:1;">${w}</span>
                    ${getFracHtml(n, d, color)}
                </div>`;
    }
    return getFracHtml(n, d, color);
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function renderNumberLine(wrapId, maxW, d) {
    let nlWrap = document.getElementById(wrapId);
    if (!nlWrap) return;
    const showNL = document.getElementById('show-nl-cb').checked;
    if (!showNL) {
        nlWrap.style.display = 'none';
        return;
    }
    nlWrap.style.display = 'flex';
    nlWrap.classList.add('continuous');
    nlWrap.innerHTML = '';
    for (let i = 0; i < maxW; i++) {
        let nlUnit = document.createElement('div');
        nlUnit.className = 'nl-unit';
        let labelsHtml = '';
        for (let k = 0; k < d; k++) {
            let leftPct = (k / d) * 100;
            let valHtml = '';
            if (k === 0) {
                valHtml = `<span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i}</span>`;
            } else {
                let fracPart = `<div class="inline-frac" style="font-size:0.85em; color:var(--dark);"><span>${k}</span><div class="line"></div><span>${d}</span></div>`;
                if (i > 0) {
                    valHtml = `<div style="display: flex; align-items: center; justify-content: center;"><span style="font-weight:bold; font-size:1.05rem; margin-right:2px; color:var(--dark);">${i}</span>${fracPart}</div>`;
                } else {
                    valHtml = fracPart;
                }
            }
            labelsHtml += `<div style="position: absolute; left: ${leftPct}%; top: 0px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: 5;">
                <div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div>
                ${valHtml}
            </div>`;
        }
        if (i === maxW - 1) {
            labelsHtml += `<div style="position: absolute; left: 100%; top: 0px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: 5;">
                <div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div>
                <span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i + 1}</span>
            </div>`;
        }
        nlUnit.innerHTML = labelsHtml;
        nlWrap.appendChild(nlUnit);
    }
}

function onFrac1Click() {
    if (isAnimating) return;
    isPhase1OrLater = false; 
    currentTutorialStep = 1; // 進入下一步驟：提示點擊乘數
    
    const vals = getSafeValues();
    let A = vals.total_n1;
    let B = vals.d1;
    let maxW = updateMaxWholes();

    document.getElementById('bar1-row').style.display = 'flex';
    document.getElementById('bar1-row').classList.add('fade-in-slow');
    
    document.getElementById('label1').style.opacity = '1';
    document.getElementById('label1').innerHTML = getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)');
    
    let wrap = document.getElementById('main-bar-wrap');
    wrap.innerHTML = '';
    wrap.style.cursor = 'default';
    wrap.title = '';
    
    for (let i = 0; i < maxW; i++) {
        let unit = document.createElement('div');
        unit.className = 'bar-unit';
        for (let k = 1; k < B; k++) {
            let thickLine = document.createElement('div');
            thickLine.className = 'abs-thick-line';
            thickLine.style.left = `${(k/B)*100}%`;
            unit.appendChild(thickLine);
        }
        let startCol = i * B;
        let endCol = Math.min(startCol + B, A);
        for (let k = startCol; k < endCol; k++) {
            let block = document.createElement('div');
            block.className = 'stage0-block';
            block.style.position = 'absolute';
            block.style.left = `${((k - startCol)/B)*100}%`;
            block.style.width = `${100/B}%`;
            block.style.height = '100%';
            block.style.backgroundColor = 'var(--red)';
            block.style.opacity = '0.85';
            unit.appendChild(block);
        }
        wrap.appendChild(unit);
    }
    
    currentNL_D = B;
    toggleNumberLine();
    
    document.getElementById('drag-instruction').innerHTML = `👉 點擊 × ${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}`;
    document.getElementById('bottom-answer-zone').style.display = 'none';
    document.getElementById('bottom-answer-zone').style.opacity = '0';
}

function onFrac2Click() {
    if (isAnimating) return;
    let rowCheck = document.getElementById('bar1-row');
    if (rowCheck.style.display === 'none') {
        onFrac1Click();
        setTimeout(onFrac2Click, 1600);
        return;
    }

    isAnimating = true;
    isPhase1OrLater = true; 
    currentTutorialStep = 2; // 更新狀態避免干擾動畫
    hideFinger();
    
    document.getElementById('label1').style.opacity = '0';
    document.getElementById('bar1-nl').style.display = 'none';

    const vals = getSafeValues();
    let A = vals.total_n1, B = vals.d1;
    let C = vals.total_n2, D = vals.d2;
    let maxW = updateMaxWholes();
    
    document.getElementById('drag-instruction').innerHTML = 
        `<span id="anim-step-text" style="color:var(--blue); font-weight:bold;">準備中...</span>`;
         
    let wrap = document.getElementById('main-bar-wrap');
    wrap.innerHTML = '';
    
    animBlocks = [];
    let dashedLines = [];
    
    for (let i = 0; i < maxW; i++) {
        let unit = document.createElement('div');
        unit.className = 'bar-unit';
        unit.id = `unit-${i}`;
        
        for (let k = 0; k < B * D; k++) {
            let globalIdx = i * B * D + k;
            let state = 'empty';
            
            if (C <= D) {
                if (globalIdx < A * D) {
                    let rem = globalIdx % D;
                    state = rem < C ? 'kept' : 'discarded';
                }
            } else {
                if (globalIdx < A * D) state = 'kept';
                else if (globalIdx < A * C) state = 'added';
            }
            
            if (state !== 'empty') {
                let block = document.createElement('div');
                block.className = `sub-block`;
                block.style.position = 'absolute';
                block.style.left = `${(k/(B*D))*100}%`;
                block.style.width = `${100/(B*D)}%`;
                block.style.height = '100%';
                block.style.backgroundColor = 'var(--red)';
                block.style.opacity = state === 'added' ? '0' : '0.85';
                block.dataset.state = state;
                unit.appendChild(block);
                animBlocks.push({ el: block, state: state });
            }
        }
        
        for (let k = 1; k < B * D; k++) {
            if (k % D !== 0) {
                let thinLine = document.createElement('div');
                thinLine.className = 'abs-thin-line';
                thinLine.style.left = `${(k/(B*D))*100}%`;
                thinLine.style.height = '0%';
                thinLine.style.borderLeft = '2px dashed var(--dark)';
                thinLine.style.background = 'transparent';
                thinLine.style.transform = 'translateX(-50%)';
                unit.appendChild(thinLine);
                dashedLines.push(thinLine);
            }
        }
        
        for (let k = 1; k < B; k++) {
            let thickLine = document.createElement('div');
            thickLine.className = 'abs-thick-line';
            thickLine.style.left = `${(k/B)*100}%`;
            unit.appendChild(thickLine);
        }
        
        wrap.appendChild(unit);
    }
    
    let startTime = performance.now();
    let totalDuration = 3500 / currentSpeed; 
    
    function loop(now) {
        let t = now - startTime;
        let p = t / totalDuration;
        if (p > 1) p = 1;
        
        let stepText = "";
        
        if (p <= 0.5) {
            stepText = "第 1 步：將被乘數進一步細分";
            let h = (p / 0.5) * 100;
            dashedLines.forEach(l => l.style.height = `${h}%`);
            animBlocks.forEach(b => {
                if (b.state === 'discarded' || b.state === 'kept') b.el.style.opacity = '0.85';
                if (b.state === 'added') b.el.style.opacity = '0';
            });
        } else {
            stepText = "第 2 步：保留結果，完成乘法";
            dashedLines.forEach(l => l.style.height = `100%`);
            
            let fade_p = (p - 0.5) / 0.5;
            animBlocks.forEach(b => {
                if (b.state === 'discarded') b.el.style.opacity = `${0.85 * (1 - fade_p)}`;
                if (b.state === 'added') b.el.style.opacity = `${0.85 * fade_p}`;
                if (b.state === 'kept') b.el.style.opacity = '0.85';
            });
        }
        
        document.getElementById('anim-step-text').innerText = stepText;
        
        if (p < 1) {
            requestAnimationFrame(loop);
        } else {
            finishAnimation();
        }
    }
    
    requestAnimationFrame(loop);
}

function finishAnimation() {
    isAnimating = false;
    currentTutorialStep = 2; // 動畫結束，進入下一步驟：提示點擊長條圖
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleHint, 3000);
    
    document.getElementById('drag-instruction').innerHTML = `💡 現在，根據最終顯示的紅色方塊填寫答案吧！（可點擊長條圖重新排列方塊）`;
    
    const vals = getSafeValues();
    let A = vals.total_n1, B = vals.d1, C = vals.total_n2, D = vals.d2;
    let resultD = B * D;
    let resultN = A * C;
    
    document.getElementById('bottom-answer-zone').style.display = 'flex';
    setTimeout(() => document.getElementById('bottom-answer-zone').style.opacity = '1', 50);
    
    document.getElementById('bot-frac1').innerHTML = getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)');
    document.getElementById('bot-frac2').innerHTML = getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)');
    
    if (resultN >= resultD) {
        document.getElementById('ans-w').style.display = 'inline-block';
    } else {
        document.getElementById('ans-w').style.display = 'none';
    }
    
    document.getElementById('ans-w').value = '';
    document.getElementById('ans-num').value = '';
    document.getElementById('ans-den').value = '';
    document.getElementById('feedback').style.opacity = '0';
    
    let wrap = document.getElementById('main-bar-wrap');
    wrap.style.cursor = 'pointer';
    wrap.title = '點擊方塊重新排列';
    isRearranged = false;
    
    animBlocks = animBlocks.filter(b => {
        if (b.state === 'discarded') {
            b.el.remove();
            return false;
        }
        return true;
    });
}

function toggleRearrange() {
    if (document.getElementById('bottom-answer-zone').style.display !== 'flex') return;
    if (isRearranging) return;
    
    isRearranging = true;
    
    if (!isRearranged) {
        currentTutorialStep = 3; // 重新排列後，進入最後步驟：提示作答
    }
    
    const vals = getSafeValues();
    let B = vals.d1, D = vals.d2;
    let slotsPerUnit = B * D;
    
    let wrap = document.getElementById('main-bar-wrap');
    let wrapRect = wrap.getBoundingClientRect();
    
    if (!isRearranged) {
        preRearrangePositions = [];
        let ghosts = [];
        
        animBlocks.forEach((b) => {
            let rect = b.el.getBoundingClientRect();
            preRearrangePositions.push({ left: b.el.style.left, unit: b.el.parentElement });
            
            let ghost = document.createElement('div');
            ghost.style.position = 'absolute';
            ghost.style.left = `${rect.left - wrapRect.left}px`;
            ghost.style.top = `${rect.top - wrapRect.top}px`;
            ghost.style.width = `${rect.width}px`;
            ghost.style.height = `${rect.height}px`;
            ghost.style.backgroundColor = 'var(--red)';
            ghost.style.opacity = '0.85';
            ghost.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            ghost.style.zIndex = '100';
            wrap.appendChild(ghost);
            ghosts.push(ghost);
            
            b.el.style.visibility = 'hidden'; 
        });
        
        setTimeout(() => {
            ghosts.forEach((ghost, i) => {
                let unitIdx = Math.floor(i / slotsPerUnit);
                let rem = i % slotsPerUnit;
                let targetUnit = document.getElementById(`unit-${unitIdx}`);
                let tRect = targetUnit.getBoundingClientRect();
                
                let targetLeft = tRect.left - wrapRect.left + (rem * (tRect.width / slotsPerUnit));
                let targetTop = tRect.top - wrapRect.top;
                
                ghost.style.left = `${targetLeft}px`;
                ghost.style.top = `${targetTop}px`;
            });
        }, 50);
        
        setTimeout(() => {
            animBlocks.forEach((b, i) => {
                let unitIdx = Math.floor(i / slotsPerUnit);
                let rem = i % slotsPerUnit;
                let targetUnit = document.getElementById(`unit-${unitIdx}`);
                
                targetUnit.appendChild(b.el);
                b.el.style.left = `${(rem/slotsPerUnit)*100}%`;
                b.el.style.visibility = 'visible';
            });
            
            ghosts.forEach(g => g.remove());
            isRearranged = true;
            isRearranging = false;
        }, 650);
        
    } else {
        let ghosts = [];
        animBlocks.forEach((b) => {
            let rect = b.el.getBoundingClientRect();
            let ghost = document.createElement('div');
            ghost.style.position = 'absolute';
            ghost.style.left = `${rect.left - wrapRect.left}px`;
            ghost.style.top = `${rect.top - wrapRect.top}px`;
            ghost.style.width = `${rect.width}px`;
            ghost.style.height = `${rect.height}px`;
            ghost.style.backgroundColor = 'var(--red)';
            ghost.style.opacity = '0.85';
            ghost.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            ghost.style.zIndex = '100';
            wrap.appendChild(ghost);
            ghosts.push(ghost);
            
            b.el.style.visibility = 'hidden';
        });
        
        setTimeout(() => {
            ghosts.forEach((ghost, i) => {
                let orig = preRearrangePositions[i];
                orig.unit.appendChild(animBlocks[i].el);
                animBlocks[i].el.style.left = orig.left;
                
                let tRect = animBlocks[i].el.getBoundingClientRect();
                ghost.style.left = `${tRect.left - wrapRect.left}px`;
                ghost.style.top = `${tRect.top - wrapRect.top}px`;
            });
        }, 50);
        
        setTimeout(() => {
            animBlocks.forEach(b => b.el.style.visibility = 'visible');
            ghosts.forEach(g => g.remove());
            isRearranged = false;
            isRearranging = false;
        }, 650);
    }
}

function autoCheck() {
    currentTutorialStep = 4; // 開始輸入後停止提示
    hideFinger();
    
    const vals = getSafeValues();
    const ansWStr = document.getElementById('ans-w').value;
    const ansNStr = document.getElementById('ans-num').value;
    const ansDStr = document.getElementById('ans-den').value;
    
    if (ansNStr === "" || ansDStr === "") return;
    
    let ansW = parseInt(ansWStr) || 0;
    let ansN = parseInt(ansNStr);
    let ansD = parseInt(ansDStr);
    
    let userVal = ansW + (ansN / ansD);
    let exactN = vals.total_n1 * vals.total_n2;
    let exactD = vals.d1 * vals.d2;
    let exactVal = exactN / exactD;
    
    let fb = document.getElementById('feedback');
    
    if (Math.abs(userVal - exactVal) < 0.0001) {
        let simpleN = exactN / gcd(exactN, exactD);
        let simpleD = exactD / gcd(exactN, exactD);
        let simpleW = Math.floor(simpleN / simpleD);
        let simpleMixedN = simpleN % simpleD;
        
        let isSimplest = false;
        if (ansW === simpleW && ansN === simpleMixedN && ansD === simpleD) isSimplest = true;
        else if (ansW === 0 && ansN === simpleN && ansD === simpleD) isSimplest = true;
        
        if (isSimplest) {
            fb.innerHTML = '🎉 完全正確！而且已經是最簡化的答案了！';
        } else {
            fb.innerHTML = '🌟 答對了數值！但試試看，這個答案可以再「約分」或「轉成帶分數」喔！';
        }
        fb.style.opacity = '1'; fb.style.color = 'var(--success)';
    } else {
        fb.innerHTML = '❌ 答案不對喔！請再觀察一下紅色的方塊總數。';
        fb.style.opacity = '1'; fb.style.color = 'var(--red)';
    }
}

function randomChallenge() {
    if (isAnimating) return;
    isPhase1OrLater = false; 
    
    currentTutorialStep = 0; // 重置提示步驟
    hideFinger();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleHint, 3000);
    
    let showWhole = document.getElementById('show-whole-cb').checked;
    let w1=0, w2=0;
    
    let d1 = Math.floor(Math.random() * 4) + 2;
    let n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
    let d2 = Math.floor(Math.random() * 4) + 2;
    let n2 = Math.floor(Math.random() * (d2 - 1)) + 1;

    if (showWhole) {
        w1 = Math.floor(Math.random() * 2);
        w2 = Math.floor(Math.random() * 2);
        if (w1 === 0 && n1 === 0) n1 = 1;
        if (w2 === 0 && n2 === 0) n2 = 1;
    }

    document.getElementById('w1').value = w1 || '';
    document.getElementById('n1').value = n1;
    document.getElementById('d1').value = d1;
    document.getElementById('w2').value = w2 || '';
    document.getElementById('n2').value = n2;
    document.getElementById('d2').value = d2;
    
    currentWordProblemTemplate = wordProblemTemplates[Math.floor(Math.random() * wordProblemTemplates.length)];
    
    updateUI();
    document.getElementById('bar1-row').style.display = 'none';
    document.getElementById('drag-instruction').innerHTML = `💡 準備中...請先點擊上方的「被乘數」`;
    document.getElementById('bottom-answer-zone').style.display = 'none';
    document.getElementById('word-problem').style.display = 'block';
}

// 初始化與事件綁定
window.onload = () => {
    randomChallenge();
    setupHoverHints();
    
    // 全局事件監聽，用於重置閒置計時器並隱藏手指
    document.addEventListener('click', () => {
        hideFinger();
        if (!isAnimating) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(showIdleHint, 3000);
        }
    });
    
    document.addEventListener('mousemove', () => {
        const finger = document.getElementById('tutorial-finger');
        // 如果手指未顯示，才因應滑鼠移動重置計時（避免干擾已出現的提示）
        if (finger && finger.style.display !== 'block' && !isAnimating) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(showIdleHint, 3000);
        }
    });
    
    document.addEventListener('keydown', () => {
        hideFinger();
        if (!isAnimating) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(showIdleHint, 3000);
        }
    });
};
