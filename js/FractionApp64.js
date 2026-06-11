    // Disable right-click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable keyboard shortcuts
    document.onkeydown = function(e) {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) return false;
    if (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 85 || e.keyCode === 83)) return false;
};


/* ===== next inline <script> block ===== */

const isAnim = true;
const LIMITS = { den_start: 100, expand_factor: 20 };
let currentOp = '*'; 
let showNumberLine = true;
let isSyncMode = true; // 預設為模式1

let targetNum = null;  
let targetDen = null;  

function toggleSyncMode() {
    isSyncMode = !isSyncMode;
    const btn = document.getElementById('btn_toggle_sync');
    
    if (isSyncMode) {
        btn.innerText = '模式1';
        btn.classList.add('btn-active-mode');
        
        // 切換回同步時，強制對齊數值
        let val = document.getElementById('fn').value;
        manualFactorChange('fn', val);
    } else {
        btn.innerText = '模式2';
        btn.classList.remove('btn-active-mode');
        
        let fnVal = parseInt(document.getElementById('fn').value) || 1;
        let fdVal = parseInt(document.getElementById('fd').value) || 1;
        syncOpColor(currentOp, fnVal, fdVal);
        renderEverything(true);
    }
}

function generateRandomFraction() {
    let d = Math.floor(Math.random() * 11) + 2; 
    let n = Math.floor(Math.random() * d) + 1;  
    
    if (currentOp === '/') {
        let multiplier = Math.floor(Math.random() * 4) + 2; 
        
        if (d * multiplier > LIMITS.den_start) {
            multiplier = Math.floor(LIMITS.den_start / d);
            if (multiplier < 2) multiplier = 2; 
        }
        n = n * multiplier;
        d = d * multiplier;
        
        if (d > LIMITS.den_start) {
            d = LIMITS.den_start;
            n = Math.floor(d / 2);
        }
    }

    document.getElementById('n_start').value = n;
    document.getElementById('d_start').value = d;
    
    document.getElementById('fn').value = 1;
    document.getElementById('fd').value = 1;
    syncOpColor(currentOp, 1, 1);
    
    renderEverything(true);
}

function updateSpeedUI(val) {
    document.getElementById('speed_label').innerText = `動畫速度: ${Number(val).toFixed(1)} x`;
}

function toggleNumberLine() {
    showNumberLine = document.getElementById('cb_toggle_nl').checked;
    document.getElementById('number_line_wrapper').style.display = showNumberLine ? 'block' : 'none';
}

function swapFractions() {
    let n_t = document.getElementById('n_target').value;
    let d_t = document.getElementById('d_target').value;
    
    if (n_t === "?" || d_t === "?" || n_t === "" || d_t === "") {
        return;
    }
    
    let newN = parseInt(n_t);
    let newD = parseInt(d_t);
    let fnVal = parseInt(document.getElementById('fn').value) || 1;
    let fdVal = parseInt(document.getElementById('fd').value) || 1;
    
    document.getElementById('n_start').value = newN;
    document.getElementById('d_start').value = newD;
    
    currentOp = (currentOp === '*') ? '/' : '*';
    const symbol = (currentOp === '*') ? '×' : '÷';
    document.getElementById('on').innerText = symbol;
    document.getElementById('od').innerText = symbol;
    
    const btnMerge = document.getElementById('btn_merge');
    const btnSlice = document.getElementById('btn_slice');
    
    if (currentOp === '/') {
        btnMerge.disabled = true;
        btnSlice.disabled = false;
    } else {
        btnSlice.disabled = true;
        btnMerge.disabled = false;
    }
    
    document.getElementById('fn').value = fnVal;
    document.getElementById('fd').value = fdVal;
    
    syncOpColor(currentOp, fnVal, fdVal);
    renderEverything(true);
}

// 更新支援超出版面的數線繪製
function drawNumberLine(d_val, total_segments) {
    const container = document.getElementById('nl_ticks');
    if(!container) return;
    let html = '';
    for (let i = 0; i <= total_segments; i++) {
        let leftPos = (i / total_segments) * 100;
        let labelHtml = '';
        
        if (i === 0) {
            labelHtml = '0';
        } else if (i === d_val) {
            labelHtml = '1';
        } else if (i % d_val === 0) {
            labelHtml = (i / d_val).toString();
        } else {
            labelHtml = `
                <span class="nl-frac">
                    <span class="nl-num">${i}</span>
                    <span class="nl-line-frac"></span>
                    <span class="nl-den">${d_val}</span>
                </span>
            `;
        }
        
        html += `
            <div class="nl-tick-wrapper" style="left: ${leftPos}%;">
                <div class="nl-tick"></div>
                <div class="nl-label">${labelHtml}</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderQuestionBanner() {
    const banner = document.getElementById('question_banner');
    if (targetNum === null && targetDen === null) { banner.classList.remove('show'); return; }

    const n = parseInt(document.getElementById('n_start').value) || 0;
    const d = parseInt(document.getElementById('d_start').value) || 1;

    const tNumHtml = targetNum !== null ? targetNum : '<span class="q-blank">?</span>';
    const tDenHtml = targetDen !== null ? targetDen : '<span class="q-blank">?</span>';

    document.getElementById('q_equation').innerHTML = 
        '<span class="q-frac"><span class="q-num">' + n + '</span><span class="q-line"></span><span class="q-den">' + d + '</span></span>' +
        '<span>=</span>' +
        '<span class="q-frac"><span class="q-num">' + tNumHtml + '</span><span class="q-line"></span><span class="q-den">' + tDenHtml + '</span></span>';

    banner.classList.add('show');
}

function setMode(op) {
    currentOp = op;
    const symbol = (op === '*') ? '×' : '÷';
    document.getElementById('on').innerText = symbol;
    document.getElementById('od').innerText = symbol;
    
    document.getElementById('fn').value = 1;
    document.getElementById('fd').value = 1;
    
    const btnMerge = document.getElementById('btn_merge');
    const btnSlice = document.getElementById('btn_slice');
    
    if (op === '/') {
        btnMerge.disabled = true;
        btnSlice.disabled = false;
    } else {
        btnSlice.disabled = true;
        btnMerge.disabled = false;
    }
    
    syncOpColor(op, 1, 1);
    renderEverything(true);
}

function checkEmpty(el, defaultVal) {
    if (el.value === "" || isNaN(el.value)) {
        el.value = defaultVal;
        if(el.id === 'fn' || el.id === 'fd') manualFactorChange(el.id, defaultVal);
        else manualInputChange();
    }
}

function stepInput(id, delta) {
    let el = document.getElementById(id);
    let val = parseInt(el.value) || 0;
    val += delta;
    
    if (id === 'd_start' && val < 1) val = 1;
    if (id === 'n_start' && val < 0) val = 0;
    
    el.value = val;
    manualInputChange();
}

function manualInputChange() {
    let n = parseInt(document.getElementById('n_start').value);
    let d = parseInt(document.getElementById('d_start').value);
    
    if (isNaN(d) || isNaN(n)) return;

    if (d > LIMITS.den_start) d = LIMITS.den_start;
    if (d < 1) d = 1;
    if (n > d) n = d; 
    if (n < 0) n = 0;

    document.getElementById('n_start').value = n;
    document.getElementById('d_start').value = d;

    renderEverything(true);
}

function stepFactor(id, delta) {
    let val = parseInt(document.getElementById(id).value) || 1;
    val += delta;
    manualFactorChange(id, val);
}

function manualFactorChange(id, v) {
    if (v === "") return; 
    
    let val = parseInt(v) || 1;
    if(val < 1) val = 1;

    const maxLimit = currentOp === '*' ? LIMITS.expand_factor : LIMITS.den_start;
    if(val > maxLimit) val = maxLimit;

    document.getElementById(id).value = val;

    if (isSyncMode) {
        let otherId = id === 'fn' ? 'fd' : 'fn';
        document.getElementById(otherId).value = val;
    }

    let fnVal = parseInt(document.getElementById('fn').value) || 1;
    let fdVal = parseInt(document.getElementById('fd').value) || 1;

    syncOpColor(currentOp, fnVal, fdVal);
    renderEverything(true); 
}

function syncOpColor(op, fnVal, fdVal) {
    let isMismatch = !isSyncMode && (fnVal !== fdVal);
    
    let themeColor = 'var(--red)';
    let textColor = 'var(--red)';
    let baseColor = fnVal === 1 ? '#000' : (op === '*' ? 'var(--yellow)' : 'var(--success)');
    
    if (!isMismatch) {
        themeColor = baseColor;
        textColor = fnVal === 1 ? '#000' : themeColor;
    }

    document.querySelectorAll('.op-select').forEach(el => {
        el.style.borderColor = baseColor;
        el.style.color = fnVal === 1 ? '#000' : baseColor;
    });

    document.getElementById('wrap_fn').style.borderColor = isMismatch ? 'var(--red)' : baseColor;
    document.getElementById('wrap_fd').style.borderColor = isMismatch ? 'var(--red)' : (fdVal === 1 && !isMismatch ? '#000' : (op === '*' ? 'var(--yellow)' : 'var(--success)'));

    document.querySelectorAll('#wrap_fn input, #wrap_fn .step-btn, #wrap_fd input, #wrap_fd .step-btn').forEach(el => {
        el.style.color = textColor;
    });
    
    document.getElementById('group_fn').style.borderLeftColor = isMismatch ? 'var(--red)' : '#000';
    document.getElementById('group_fd').style.borderLeftColor = isMismatch ? 'var(--red)' : '#000';
}

function renderEverything(anim) {
    const n1 = parseInt(document.getElementById('n_start').value) || 2;
    const d1 = parseInt(document.getElementById('d_start').value) || 8;
    const elFn = document.getElementById('fn');
    const elFd = document.getElementById('fd');
    const fnVal = elFn && elFn.value !== "" ? parseInt(elFn.value) : 1;
    const fdVal = elFd && elFd.value !== "" ? parseInt(elFd.value) : 1;
    
    document.getElementById('ln').innerText = n1;
    document.getElementById('ld').innerText = d1;
    const errorEl = document.getElementById('error_msg');
    errorEl.innerText = "";

    let canCalculate = true;
    let isNumMismatch = !isSyncMode && (fnVal !== fdVal);

    if (currentOp === '/') {
        if(fnVal === 0 || fdVal === 0) { canCalculate = false; }
        else if(n1 % fnVal !== 0 || d1 % fdVal !== 0) {
            if (errorEl.innerText !== "") errorEl.innerText += "\n";
            errorEl.innerText += `⚠️ 錯誤：分子不能被 ${fnVal} 整除，或分母不能被 ${fdVal} 整除`;
            canCalculate = false;
        }
    }

    // 若分子分母乘除數目不同，僅顯示提示並改變 = 為 ≠，但依然計算顯示結果
    if (isNumMismatch) {
        if (errorEl.innerText !== "") errorEl.innerText += "\n";
        errorEl.innerText += "⚠️ 提示：分子和分母乘以或除以不同的數字，分數值已改變。";
    }
    
    let eqLeft = document.getElementById('eq_left');
    if (eqLeft) {
        if (isNumMismatch && canCalculate) {
            eqLeft.innerText = '≠';
            eqLeft.style.color = 'var(--red)';
        } else {
            eqLeft.innerText = '=';
            eqLeft.style.color = '#000';
        }
    }

    let n2 = canCalculate ? ((currentOp === '*') ? n1 * fnVal : n1 / fnVal) : "?";
    let d2 = canCalculate ? ((currentOp === '*') ? d1 * fdVal : d1 / fdVal) : "?";
    
    document.getElementById('n_target').value = n2;
    document.getElementById('d_target').value = d2;

    const bp = document.getElementById('bar_process');
    const gp = document.getElementById('grid_process');
    const nlContainer = document.querySelector('.number-line-container');
    const scaleWrapper = document.getElementById('scale_wrapper');

    if (canCalculate) {
        if (bp) bp.style.visibility = 'visible';
        if (gp) gp.style.visibility = 'visible';
        if (nlContainer) nlContainer.style.visibility = 'visible';
        if (scaleWrapper) scaleWrapper.style.filter = 'grayscale(0%)';
        
        drawProcess(n1, d1, n2, d2, fnVal, fdVal, currentOp, anim);
        
        let maxGrid = (currentOp === '*') ? d2 : d1;
        let ratio = n2 / d2;
        let scale = Math.max(1, ratio);
        let drawSegments = Math.max(maxGrid, Math.round(maxGrid * scale));
        
        drawNumberLine(maxGrid, drawSegments);
    } else {
        // 如果無法計算 (約分除不盡)，才套用灰階濾鏡
        if (scaleWrapper) scaleWrapper.style.filter = 'grayscale(100%)';
    }
}

// 更新長條圖繪製機制，支援延伸畫面
function drawProcess(n1, d1, n2, d2, fnVal, fdVal, op, anim) {
    const b = document.getElementById('bar_process');
    const g = document.getElementById('grid_process');
    const scaleWrapper = document.getElementById('scale_wrapper');
    if(!b || !g || !scaleWrapper) return;

    let maxGrid = (op === '*') ? d2 : d1;
    let ratio = n2 / d2;
    let scale = Math.max(1, ratio);
    let drawSegments = Math.max(maxGrid, Math.round(maxGrid * scale));

    // 動態調整外層容器寬度，若比例大於1，容器會延長 (如 125%, 200%)，從而出現捲軸
    scaleWrapper.style.width = (scale * 100) + '%';
    
    // Bar長度的比例是依照 scaleWrapper 來算
    b.style.width = ((ratio / scale) * 100) + '%';
    
    let html = '<div class="grid-overlay">';
    
    let maxFactor = Math.max(fnVal, fdVal);
    let baseAnimDuration = 4.0;
    let baseBgTimeout = 3800; 
    if (maxFactor > 3) {
        baseAnimDuration = 2.0;
        baseBgTimeout = 1800;
    }

    const speedVal = parseFloat(document.getElementById('speed_slider').value);
    let animDuration = (baseAnimDuration / speedVal) + 's';
    let bgTimeout = baseBgTimeout / speedVal;

    for(let i=1; i <= drawSegments; i++) {
        html += `<div class="segment"></div>`;

        if (i < drawSegments) {
            // 以分母的變化 (fdVal) 來決定分割線
            const isMainLine = (i % fdVal === 0 && op === '/') || (op === '*' && i % fdVal === 0);

            if (op === '*') {
                if (isMainLine || fdVal === 1) {
                    html += `<div class="divider-thick"></div>`;
                } else {
                    const hS = anim ? '0%' : '100%';
                    html += `<div class="divider-thin"><div class="anim-line" style="height:${hS}; background: var(--accent); transition: height ${animDuration} cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s;"></div></div>`;
                }
            } else {
                if (fdVal === 1) {
                    html += `<div class="divider-thick"></div>`;
                } else if (isMainLine) {
                    html += `<div class="divider-thick"></div>`;
                } else {
                    const hS = anim ? '100%' : '0%';
                    html += `<div class="divider-thin"><div class="anim-line" style="height:${hS}; background: var(--grid-dark); transition: height ${animDuration} cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s;"></div></div>`;
                }
            }
        }
    }
    html += '</div>';
    g.innerHTML = html;

    if (anim && fdVal !== 1) {
        setTimeout(() => {
            const lines = g.querySelectorAll('.anim-line');
            lines.forEach(l => {
                l.style.height = (op === '*') ? '100%' : '0%';
                if(op === '*') setTimeout(() => l.style.background = 'var(--grid-dark)', bgTimeout); 
            });
        }, 50);
    }
}

window.onload = function() {
    try { if (window.self !== window.top) document.body.classList.add('embedded'); } catch(e) { document.body.classList.add('embedded'); }

    const urlParams = new URLSearchParams(window.location.search);
    const pNum = parseInt(urlParams.get('numerator'));
    const pDen = parseInt(urlParams.get('denominator'));
    const pMode = urlParams.get('mode'); 
    const pTargetNum = urlParams.get('targetNum');
    const pTargetDen = urlParams.get('targetDen');

    if (pTargetNum !== null && pTargetNum !== '') targetNum = parseInt(pTargetNum);
    if (pTargetDen !== null && pTargetDen !== '') targetDen = parseInt(pTargetDen);

    if (!isNaN(pNum) && !isNaN(pDen) && pDen >= 1) {
        document.getElementById('n_start').value = Math.min(pNum, pDen);
        document.getElementById('d_start').value = Math.min(pDen, LIMITS.den_start);
    }

    if (pMode === 'simplify') {
        setMode('/');
    } else {
        setMode('*');
    }

    renderQuestionBanner();
    manualInputChange();

    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'set-params') {
            const p = e.data.params;
            if (p.targetNum !== undefined) targetNum = p.targetNum;
            if (p.targetDen !== undefined) targetDen = p.targetDen;
            if (p.numerator != null && p.denominator != null) {
                document.getElementById('n_start').value = Math.min(p.numerator, p.denominator);
                document.getElementById('d_start').value = Math.min(p.denominator, LIMITS.den_start);
            }
            if (p.mode === 'simplify') setMode('/');
            else setMode('*');
            renderQuestionBanner();
            manualInputChange();
        }
    });
};
