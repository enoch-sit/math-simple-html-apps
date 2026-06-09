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
let s1 = 1; 
let s2 = 1; 
let bar1Visible = false;
let bar2Visible = false;
let currentSpeed = 1.0; 
let isCommonDenomReady = false; 
let trashedCount = 0; 

const wordProblemTemplates = [
    "小明原本有 [FRAC1] 塊披薩，吃掉了 [FRAC2] 塊。請問還剩下多少塊披薩？",
    "第一塊農田面積為 [FRAC1] 公頃，第二塊面積比第一塊少 [FRAC2] 公頃。請問第二塊農田的面積是多少公頃？",
    "媽媽買了 [FRAC1] 公斤的蘋果，送給鄰居 [FRAC2] 公斤。請問還剩下多少公斤？",
    "水桶裡原有 [FRAC1] 公升的水，倒出了 [FRAC2] 公升。請問現在水桶裡還剩下多少公升的水？",
    "紅彩帶長 [FRAC1] 公尺，藍彩帶長 [FRAC2] 公尺。請問紅彩帶比藍彩帶長多少公尺？"
];

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
    let duration = 0.6 / currentSpeed;
    document.documentElement.style.setProperty('--anim-time', duration + 's');
}

function toggleNumberLine() {
    const showNL = document.getElementById('show-nl-cb').checked;
    ['bar1', 'bar2', 'error', 'final'].forEach(prefix => {
        let nlWrap = document.getElementById(prefix === 'error' ? 'error-nl-wrap' : (prefix === 'final' ? 'final-nl' : `${prefix}-nl`));
        
        if (nlWrap && nlWrap.innerHTML.trim() !== '') {
            if (showNL) {
                nlWrap.style.display = 'flex';
                nlWrap.classList.add('continuous');
            } else {
                nlWrap.style.display = 'none';
            }
        }
    });
}

function toggleTrashContent() {
    let tc = document.getElementById('trash-content');
    let btn = document.getElementById('toggle-trash-btn');
    if (!tc || !btn) return;
    if (tc.style.display === 'none') {
        tc.style.display = 'flex'; 
        btn.innerText = '隱藏內容';
    } else {
        tc.style.display = 'none';
        btn.innerText = '顯示內容';
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
    if (d1 < 1) d1 = 1; if (d1 > 100) d1 = 100;
    if (d2 < 1) d2 = 1; if (d2 > 100) d2 = 100;
    if (n1 < 0) n1 = 0; if (n2 < 0) n2 = 0;

    if (w1 === 0 && n1 === 0) n1 = 1;
    if (w2 === 0 && n2 === 0) n2 = 1;

    return { w1, n1, d1, w2, n2, d2, total_n1: w1 * d1 + n1, total_n2: w2 * d2 + n2 };
}

function enforceInputLimits() {
    const safe = getSafeValues();
    document.getElementById('d1').value = safe.d1;
    document.getElementById('d2').value = safe.d2;
}

function updateMaxWholes() {
    const vals = getSafeValues();
    let wholes1 = Math.max(1, Math.ceil(vals.total_n1 / vals.d1));
    let wholes2 = Math.max(1, Math.ceil(vals.total_n2 / vals.d2));
    document.documentElement.style.setProperty('--max-wholes', Math.max(wholes1, wholes2));
}

function getFracHtml(n, d, color = "inherit") {
    return `<div class="inline-frac" style="color: ${color};"><span>${n}</span><div class="line"></div><span>${d}</span></div>`;
}

function getDisplayHtml(w, n, d, color) {
    if (w > 0) return `<div style="display:inline-flex; align-items:center;"><span style="color:${color}; font-size:1.8rem; font-weight:bold; margin-right:4px; line-height:1;">${w}</span>${getFracHtml(n, d, color)}</div>`;
    return getFracHtml(n, d, color);
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a * b) / gcd(a, b); }

function onFrac1Click() {
    let fArea = document.getElementById('final-answer-area');
    if (fArea) { fArea.style.opacity = '0'; fArea.style.display = 'none'; }
    let row = document.getElementById('bar1-row');
    
    // 確保重置任何由於平滑隱藏動畫造成的 inline styles
    if (row) {
        row.style.maxHeight = ''; row.style.minHeight = '50px'; row.style.overflow = '';
        row.style.opacity = '1'; row.style.margin = ''; row.style.padding = ''; row.style.transition = '';
        row.style.display = 'flex';
    }
    
    s1 = 1; trashedCount = 0;
    renderBar(1, 'none');
    row.classList.remove('fade-in-slow'); void row.offsetWidth; row.classList.add('fade-in-slow');
    bar1Visible = true;
    checkCommonDenom();
}

function onFrac2Click() {
    let fArea = document.getElementById('final-answer-area');
    if (fArea) { fArea.style.opacity = '0'; fArea.style.display = 'none'; }
    let row = document.getElementById('bar2-row');
    
    // 確保重置任何由於平滑隱藏動畫造成的 inline styles
    if (row) {
        row.style.maxHeight = ''; row.style.minHeight = '50px'; row.style.overflow = '';
        row.style.opacity = '1'; row.style.margin = ''; row.style.padding = ''; row.style.transition = '';
        row.style.display = 'flex';
    }
    
    s2 = 1; trashedCount = 0;
    renderBar(2, 'none');
    row.classList.remove('fade-in-slow'); void row.offsetWidth; row.classList.add('fade-in-slow');
    bar2Visible = true;
    checkCommonDenom();
}

function applyTool(num, action) {
    let changed = false;
    let old_s = num === 1 ? s1 : s2;

    if (num === 1) {
        if (action === 'expand') { s1++; changed = true; }
        else if (action === 'simplify' && s1 > 1) { s1--; changed = true; }
    } else {
        if (action === 'expand') { s2++; changed = true; }
        else if (action === 'simplify' && s2 > 1) { s2--; changed = true; }
    }

    if (changed) {
        renderBar(num, action, old_s);
        setTimeout(checkCommonDenom, 650 / currentSpeed);
    }
}

function applyGridAnimation(gridContainer, d, s, old_s, action) {
    let animTimeMs = (0.6 / currentSpeed) * 1000;
    let halfAnimMs = animTimeMs / 2;
    gridContainer.innerHTML = '';
    let html = '<div class="grid-overlay">';

    for (let k = 1; k < d; k++) html += `<div class="abs-thick-line" style="left: ${(k/d)*100}%;"></div>`;

    if (action === 'simplify') {
        for (let k = 0; k < d; k++) {
            let remove_j = Math.floor(old_s / 2);
            for (let j = 1; j < old_s; j++) {
                let oldLeftPct = ((k * old_s + j) / (d * old_s)) * 100;
                let lineId = `line_${Math.random().toString(36).substr(2, 5)}`;
                if (j === remove_j) {
                    html += `<div id="${lineId}" class="abs-thin-line removed-line" style="left: ${oldLeftPct}%; height: 100%; transition: height ${halfAnimMs}ms ease-in;"></div>`;
                } else {
                    let new_j = j < remove_j ? j : j - 1;
                    let newLeftPct = ((k * s + new_j) / (d * s)) * 100;
                    html += `<div id="${lineId}" class="abs-thin-line retained-line" style="left: ${oldLeftPct}%; height: 100%; transition: left ${halfAnimMs}ms ease-out;" data-target-left="${newLeftPct}%"></div>`;
                }
            }
        }
        html += '</div>';
        gridContainer.innerHTML = html;
        setTimeout(() => { gridContainer.querySelectorAll('.removed-line').forEach(l => l.style.height = '0%'); }, 50);
        setTimeout(() => { gridContainer.querySelectorAll('.retained-line').forEach(l => l.style.left = l.getAttribute('data-target-left')); }, 50 + halfAnimMs);
    } else if (action === 'expand') {
        for (let k = 0; k < d; k++) {
            for (let j = 1; j < s; j++) {
                html += `<div class="abs-thin-line expand-anim-line" style="left: ${((k * s + j) / (d * s)) * 100}%; height: 0%; background: var(--orange); transition: height ${animTimeMs}ms cubic-bezier(0.4, 0, 0.2, 1), background-color ${animTimeMs}ms;"></div>`;
            }
        }
        html += '</div>';
        gridContainer.innerHTML = html;
        setTimeout(() => { gridContainer.querySelectorAll('.expand-anim-line').forEach(l => { l.style.height = '100%'; setTimeout(() => l.style.background = 'var(--dark)', animTimeMs); }); }, 50);
    } else {
        for (let k = 0; k < d; k++) {
            for (let j = 1; j < s; j++) {
                html += `<div class="abs-thin-line" style="left: ${((k * s + j) / (d * s)) * 100}%;"></div>`;
            }
        }
        html += '</div>';
        gridContainer.innerHTML = html;
    }
}

function renderBar(num, action = 'none', old_s = 1) {
    const vals = getSafeValues();
    const showNL = document.getElementById('show-nl-cb').checked;
    let total_n = num === 1 ? vals.total_n1 : vals.total_n2;
    let d = num === 1 ? vals.d1 : vals.d2;
    let w = num === 1 ? vals.w1 : vals.w2;
    let n = num === 1 ? vals.n1 : vals.n2;
    let s = num === 1 ? s1 : s2;
    let color = num === 1 ? 'var(--red)' : 'var(--blue)';
    let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;

    let label = document.getElementById(`label${num}`);
    let wrap = document.getElementById(`bar${num}-wrap`);
    let nlWrap = document.getElementById(`bar${num}-nl`);

    if(label) label.innerHTML = getDisplayHtml(w, n * s, d * s, color);

    if(wrap) {
        wrap.classList.add('continuous');
        if (action === 'none') {
            wrap.innerHTML = '';
            for (let i = 0; i < maxW; i++) {
                let unit = document.createElement('div');
                unit.className = 'bar-unit';
                unit.innerHTML = `<div class="bar-fill"></div><div class="bar-grid"></div>`;
                wrap.appendChild(unit);
            }
        }
        let units = wrap.querySelectorAll('.bar-unit');
        units.forEach((unit, idx) => {
            let fill = unit.querySelector('.bar-fill');
            let grid = unit.querySelector('.bar-grid');
            let pct = (Math.max(0, Math.min(d * s, (total_n * s) - (idx * d * s))) / (d * s)) * 100;
            if (fill) { fill.style.width = `${pct}%`; fill.style.backgroundColor = color; }
            if (grid) applyGridAnimation(grid, d, s, old_s, action);
        });
    }

    if(nlWrap) {
        nlWrap.innerHTML = '';
        for (let i = 0; i < maxW; i++) {
            let nlUnit = document.createElement('div');
            nlUnit.className = 'nl-unit';
            let labelsHtml = '';
            let currentD = d * s;
            for (let k = 0; k < currentD; k++) {
                let valHtml = (k === 0) ? `<span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i}</span>` : `<div class="inline-frac" style="font-size:0.85em; color:var(--dark);"><span>${k}</span><div class="line"></div><span>${currentD}</span></div>`;
                if (k > 0 && i > 0) valHtml = `<div style="display: flex; align-items: center; justify-content: center;"><span style="font-weight:bold; font-size:1.05rem; margin-right:2px; color:var(--dark);">${i}</span>${valHtml}</div>`;
                labelsHtml += `<div style="position: absolute; left: ${(k / currentD) * 100}%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div>${valHtml}</div>`;
            }
            if (i === maxW - 1) labelsHtml += `<div style="position: absolute; left: 100%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div><span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i + 1}</span></div>`;
            nlUnit.innerHTML = labelsHtml;
            nlWrap.appendChild(nlUnit);
        }
        nlWrap.classList.add('continuous');
        if (showNL) { nlWrap.style.display = 'flex'; } 
        else { nlWrap.style.display = 'none'; }
    }

    if (action !== 'none') {
        setTimeout(() => { if ((num === 1 ? s1 : s2) === s) renderBar(num, 'none'); }, 50 + (0.6 / currentSpeed) * 1000);
    }
}

function convertBarToDraggable(num, cd, color) {
    let units = document.getElementById(`bar${num}-wrap`).querySelectorAll('.bar-unit');
    const vals = getSafeValues();
    let total_n = num === 1 ? vals.total_n1 : vals.total_n2;
    let s = num === 1 ? s1 : s2;
    
    units.forEach((unit, uIdx) => {
        if (unit.querySelector('.bar-fill')) unit.querySelector('.bar-fill').style.display = 'none'; 
        let clamped = Math.max(0, Math.min(cd, (total_n * s) - (uIdx * cd)));
        
        Array.from(unit.childNodes).forEach(child => { if (!child.classList.contains('bar-grid') && !child.classList.contains('bar-fill')) unit.removeChild(child); });
        unit.style.display = 'flex'; unit.style.flexDirection = 'row';

        if (clamped > 0) {
            let block = document.createElement('div');
            block.className = 'drag-block';
            block.id = `drag-${num}-${uIdx}-whole`;
            block.style.width = `${(clamped / cd) * 100}%`;
            block.style.height = '100%';
            block.style.backgroundColor = color;
            block.style.opacity = '0.85';
            if (num === 1) { block.draggable = true; block.style.cursor = 'grab'; }
            block.style.position = 'relative'; block.style.boxSizing = 'border-box';
            block.style.borderRight = (isCommonDenomReady && clamped === cd) ? '1px solid rgba(255,255,255,0.4)' : 'none';
            block.style.zIndex = '1';
            block.setAttribute('data-pieces', clamped); 
            
            if (num === 1) {
                block.ondragstart = (e) => { e.dataTransfer.setData('text/plain', block.id); setTimeout(() => block.style.opacity = '0.4', 0); };
                block.ondragend = (e) => { if (block.draggable) block.style.opacity = '0.85'; };
                block.onclick = () => { if (block.draggable) { if (isCommonDenomReady) trashPieces(block, num, cd); else triggerErrorMerge(); } };
            }
            if (unit.querySelector('.bar-grid')) unit.insertBefore(block, unit.querySelector('.bar-grid')); else unit.appendChild(block);
        }
    });
}

function triggerErrorMerge() {
    document.getElementById('drag-instruction').innerHTML = `⚠️ 分母不同，無法直接相減！請先點擊「擴分/約分」尋找公共的分母。`;
    showErrorMergeBar();
}

function showErrorMergeBar() {
    const errArea = document.getElementById('error-merge-area');
    if (!errArea) return;
    errArea.style.display = 'flex';
    
    const wrap = document.getElementById('error-bar-wrap');
    const nlWrap = document.getElementById('error-nl-wrap');
    const showNL = document.getElementById('show-nl-cb').checked;
    const vals = getSafeValues();
    let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;
    
    wrap.innerHTML = ''; nlWrap.innerHTML = '';
    
    if (document.getElementById('error-label')) {
        document.getElementById('error-label').innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:5px; flex-wrap:wrap; font-size:1.8rem;">${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}<span style="font-weight:bold; color:var(--dark); font-size:1.8rem;">-</span>${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}<span style="font-weight:bold; color:var(--dark); font-size:1.8rem;">?</span></div>`;
    }
    
    for (let i = 0; i < maxW; i++) {
        let unit = document.createElement('div');
        unit.className = 'bar-unit';
        let pct1 = Math.max(0, Math.min(100, ((vals.total_n1 - (i * vals.d1)) / vals.d1) * 100));
        let pct2 = Math.max(0, Math.min(100, ((vals.total_n2 - (i * vals.d2)) / vals.d2) * 100));
        let grids = '<div class="grid-overlay">';
        for(let k = 1; k < vals.d1; k++) grids += `<div class="abs-thin-line" style="left:${(k/vals.d1)*100}%; height: 100%; top: 0;"></div>`;
        for(let k = 1; k < vals.d2; k++) grids += `<div class="abs-thin-line" style="left:${(k/vals.d2)*100}%; height: 100%; top: 0;"></div>`;
        grids += '</div>';

        unit.innerHTML = `<div class="bar-fill" style="width: ${pct1}%; background-color: var(--red); opacity: 0.85; height: 100%; top: 0; position: absolute; left: 0; z-index: 1;"></div><div class="bar-fill" style="width: ${pct2}%; background-color: var(--blue); opacity: 0.85; height: 100%; top: 0; position: absolute; left: 0; z-index: 2;"></div>${grids}`;
        wrap.appendChild(unit);
        
        let nlUnit = document.createElement('div');
        nlUnit.className = 'nl-unit';
        let labelsHtml = (i === 0) ? `<div style="position: absolute; left: 0%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div><span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">0</span></div>` : '';
        labelsHtml += `<div style="position: absolute; left: 100%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div><span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i + 1}</span></div>`;
        
        let f1 = vals.total_n1 / vals.d1, f2 = vals.total_n2 / vals.d2;
        if (f1 > i && f1 <= i + 1) labelsHtml += `<div style="position: absolute; left: ${(f1 - i) * 100}%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 6;"><div style="width: 2px; height: 10px; background: var(--red); margin-bottom: 2px;"></div><div style="transform: scale(0.85); transform-origin: top center; background: rgba(255,255,255,0.85); border-radius: 4px; padding: 2px; white-space:nowrap;">${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}</div></div>`;
        if (f2 > i && f2 <= i + 1) labelsHtml += `<div style="position: absolute; left: ${(f2 - i) * 100}%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 6;"><div style="width: 2px; height: 10px; background: var(--blue); margin-bottom: 2px;"></div><div style="transform: scale(0.85); transform-origin: top center; background: rgba(255,255,255,0.85); border-radius: 4px; padding: 2px; white-space:nowrap;">${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}</div></div>`;
        nlUnit.innerHTML = labelsHtml;
        nlWrap.appendChild(nlUnit);
    }

    wrap.classList.add('continuous'); nlWrap.classList.add('continuous');
    if (showNL) { nlWrap.style.display = 'flex'; } 
    else { nlWrap.style.display = 'none'; }
}

function showFinalAnswerBar() {
    const vals = getSafeValues();
    const cd = vals.d1 * s1;
    const finalParts = (vals.total_n1 * s1) - (vals.total_n2 * s2);
    const area = document.getElementById('final-answer-area'), wrap = document.getElementById('final-wrap'), nlWrap = document.getElementById('final-nl'), showNL = document.getElementById('show-nl-cb').checked;
    let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;

    wrap.innerHTML = ''; nlWrap.innerHTML = '';
    document.getElementById('final-label').innerHTML = `<div style="font-weight:bold; color:var(--dark); font-size:1.1rem; margin-bottom:5px;">剩餘</div>`;

    for (let i = 0; i < maxW; i++) {
        let unit = document.createElement('div'); unit.className = 'bar-unit';
        let pct = Math.max(0, Math.min(100, ((finalParts - (i * cd)) / cd) * 100));
        let grids = '<div class="grid-overlay">';
        for(let k = 1; k < cd; k++) grids += `<div class="abs-thin-line" style="left:${(k/cd)*100}%;"></div>`;
        grids += '</div>';

        unit.innerHTML = `<div class="bar-fill" style="width: ${pct}%; background-color: var(--red); opacity: 0.85; height: 100%; top: 0; position: absolute; left: 0;"></div>${grids}`;
        wrap.appendChild(unit);

        let nlUnit = document.createElement('div'); nlUnit.className = 'nl-unit';
        let labelsHtml = (i === 0) ? `<div style="position: absolute; left: 0%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div><span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">0</span></div>` : '';
        labelsHtml += `<div style="position: absolute; left: 100%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 5;"><div style="width: 2px; height: 6px; background: var(--dark); margin-bottom: 2px;"></div><span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i + 1}</span></div>`;
        
        if ((finalParts / cd) > i && (finalParts / cd) <= i + 1) {
            labelsHtml += `<div style="position: absolute; left: ${((finalParts / cd) - i) * 100}%; top: 0px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 6;"><div style="width: 2px; height: 10px; background: var(--red); margin-bottom: 2px;"></div><div style="transform: scale(0.85); transform-origin: top center; background: rgba(255,255,255,0.85); border-radius: 4px; padding: 2px; font-weight: bold; color: var(--red);">?</div></div>`;
        }
        nlUnit.innerHTML = labelsHtml; nlWrap.appendChild(nlUnit);
    }

    wrap.classList.add('continuous'); nlWrap.classList.add('continuous');
    if (showNL) { nlWrap.style.display = 'flex'; } 
    else { nlWrap.style.display = 'none'; }
    area.style.display = 'flex'; setTimeout(() => { area.style.opacity = '1'; }, 50);
}

function updateLabelsDuringDrag(cd) {
    const vals = getSafeValues();
    let rem1 = (vals.total_n1 * s1) - trashedCount;
    if (document.getElementById('label1')) document.getElementById('label1').innerHTML = getDisplayHtml(Math.floor(rem1 / cd), rem1 % cd, cd, 'var(--red)');
    let rem2 = (vals.total_n2 * s2) - trashedCount;
    if (document.getElementById('label2')) document.getElementById('label2').innerHTML = getDisplayHtml(Math.floor(rem2 / cd), rem2 % cd, cd, 'var(--blue)');
}

function animateToTrash(el, rect = null, isClone = false, durationMs = 3000) {
    let trash = document.getElementById('trash-can');
    let startRect = rect || el.getBoundingClientRect();
    let clone = isClone ? el : el.cloneNode(true);
    if (!isClone) el.style.display = 'none';
    
    clone.style.position = 'fixed'; clone.style.left = startRect.left + 'px'; clone.style.top = startRect.top + 'px';
    clone.style.width = startRect.width + 'px'; clone.style.height = startRect.height + 'px'; clone.style.margin = '0';
    clone.style.zIndex = '1000'; clone.style.transition = `all ${durationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`; clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    
    requestAnimationFrame(() => { requestAnimationFrame(() => {
        let tRect = trash.getBoundingClientRect();
        clone.style.left = (tRect.left + tRect.width/2 - startRect.width/2) + 'px';
        clone.style.top = (tRect.top + tRect.height/2 - startRect.height/2) + 'px';
        clone.style.transform = 'scale(0.1)'; clone.style.opacity = '0';
    }); });
    setTimeout(() => { clone.remove(); }, durationMs + 50);
}

function trashPieces(block, num, cd) {
    if (num !== 1) return;
    const vals = getSafeValues();
    let p = parseInt(block.getAttribute('data-pieces')), p_actual = Math.min(p, (vals.total_n2 * s2) - trashedCount);
    if (p_actual <= 0) return;

    let animDuration = 3000 / currentSpeed;

    if (p_actual === p) { animateToTrash(block, null, false, animDuration); } 
    else {
        let origRect = block.getBoundingClientRect(), remW = origRect.width * (p_actual / p), remL = origRect.left + origRect.width - remW;
        block.setAttribute('data-pieces', p - p_actual); block.style.width = ((p - p_actual) / cd * 100) + '%';
        let tPart = block.cloneNode(true); tPart.style.width = ((p_actual) / cd * 100) + '%'; tPart.style.position = 'fixed'; tPart.style.left = remL + 'px'; tPart.style.top = origRect.top + 'px';
        animateToTrash(tPart, { left: remL, top: origRect.top, width: remW, height: origRect.height }, true, animDuration);
    }

    let bar2Blocks = Array.from(document.querySelectorAll('[id^="drag-2-"]')).reverse();
    let leftToTrash = p_actual;

    for (let b2 of bar2Blocks) {
        if (leftToTrash <= 0) break;
        if (b2.style.display === 'none') continue;
        let b2_p = parseInt(b2.getAttribute('data-pieces'));
        if (b2_p <= leftToTrash) { animateToTrash(b2, null, false, animDuration); leftToTrash -= b2_p; } 
        else {
            let oRect = b2.getBoundingClientRect(), rW = oRect.width * (leftToTrash / b2_p), rL = oRect.left + oRect.width - rW;
            b2.setAttribute('data-pieces', b2_p - leftToTrash); b2.style.width = ((b2_p - leftToTrash) / cd * 100) + '%';
            let b2Temp = b2.cloneNode(true); b2Temp.style.width = (leftToTrash / cd * 100) + '%'; b2Temp.style.position = 'fixed'; b2Temp.style.left = rL + 'px'; b2Temp.style.top = oRect.top + 'px';
            animateToTrash(b2Temp, { left: rL, top: oRect.top, width: rW, height: oRect.height }, true, animDuration);
            leftToTrash = 0;
        }
    }

    trashedCount += p_actual;
    updateTrashTooltip(cd); updateLabelsDuringDrag(cd); 

    // --- 優化平滑折疊動畫 ---
    if (trashedCount === (vals.total_n2 * s2)) {
        setTimeout(() => { 
            let row1 = document.getElementById('bar1-row');
            let row2 = document.getElementById('bar2-row');
            
            [row1, row2].forEach(row => {
                if (row) {
                    row.style.overflow = 'hidden';
                    row.style.maxHeight = row.scrollHeight + 'px';
                    // 使用平滑過渡讓高度和外距歸零
                    row.style.transition = 'max-height 0.8s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease, margin 0.8s ease, padding 0.8s ease';
                }
            });
            
            // 強制瀏覽器重繪 (Reflow)，讓上一行的 maxHeight 設定生效
            void document.body.offsetHeight; 
            
            [row1, row2].forEach(row => {
                if (row) {
                    row.style.opacity = '0';
                    row.style.maxHeight = '0px';
                    row.style.minHeight = '0px';
                    row.style.margin = '0';
                    row.style.padding = '0';
                }
            });

            // 動畫結束後完全隱藏節點
            setTimeout(() => { 
                if(row1) row1.style.display = 'none'; 
                if(row2) row2.style.display = 'none'; 
            }, 850);

            showFinalAnswerBar(); showAnswerZone(); 
        }, animDuration + 50);
    }
}

function updateTrashTooltip(cd) {
    let tooltip = document.getElementById('trash-content');
    if (!tooltip) return; 
    if (trashedCount === 0 || !isCommonDenomReady) { tooltip.innerHTML = "<div style='text-align:center; color:#7f8c8d; padding:10px; font-weight:normal;'>目前垃圾桶是空的</div>"; return; }
    let w = Math.floor(trashedCount / cd), n = trashedCount % cd, fracHtml = '';
    if (w > 0 && n === 0) fracHtml = `<b>${w}</b> 個整數`;
    else if (w > 0) fracHtml = `<b>${w}</b> 個整數 和 <div class="inline-frac"><span>${n}</span><div class="line"></div><span>${cd}</span></div>`;
    else fracHtml = `<div class="inline-frac"><span>${n}</span><div class="line"></div><span>${cd}</span></div>`;
    
    let genMini = (count, color) => {
        if (cd <= 0) return '';
        let html = '<div class="bar-wrap-container continuous" style="margin-top: 8px;">';
        for (let i = 0; i < (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1); i++) {
            let fillPct = (i < Math.floor(count / cd)) ? 100 : ((i === Math.floor(count / cd) && (count % cd) > 0) ? ((count % cd) / cd) * 100 : 0);
            html += `<div class="bar-unit" style="background: transparent;">${fillPct > 0 ? `<div class="bar-fill" style="width:${fillPct}%; background-color:${color}; opacity: 0.85;"></div>` : ''}<div class="grid-overlay">${Array.from({length: cd-1}, (_, k) => `<div class="abs-thin-line" style="left:${((k+1)/cd)*100}%;"></div>`).join('')}</div></div>`;
        }
        return html + '</div>';
    };
    tooltip.innerHTML = `<div style="margin-bottom: 15px;"><div style="padding: 0 15px;"><span style="color:var(--red); font-weight:bold;">被減數 (紅) 已丟棄: ${fracHtml}</span></div>${genMini(trashedCount, 'var(--red)')}</div><div><div style="padding: 0 15px;"><span style="color:var(--blue); font-weight:bold;">減數 (藍) 已對消: ${fracHtml}</span></div>${genMini(trashedCount, 'var(--blue)')}</div>`;
}

function showAnswerZone() {
    const vals = getSafeValues(); let cd1 = vals.d1 * s1;
    document.getElementById('bottom-answer-zone').style.display = 'flex'; setTimeout(() => { document.getElementById('bottom-answer-zone').style.opacity = '1'; }, 50);
    document.getElementById('bot-frac1').innerHTML = getDisplayHtml(vals.w1, vals.n1 * s1, cd1, 'var(--red)');
    document.getElementById('bot-frac2').innerHTML = getDisplayHtml(vals.w2, vals.n2 * s2, cd1, 'var(--blue)');
    
    if (document.getElementById('tools1')) document.getElementById('tools1').style.visibility = 'hidden';
    if (document.getElementById('tools2')) document.getElementById('tools2').style.visibility = 'hidden';

    const exactN = (vals.total_n1 * vals.d2) - (vals.total_n2 * vals.d1);
    if (exactN >= (vals.d1 * vals.d2)) { document.getElementById('ans-w').style.display = 'inline-block'; } 
    else { document.getElementById('ans-w').style.display = 'none'; document.getElementById('ans-w').value = ''; }

    document.getElementById('bot-public-unit').innerHTML = `💡 公共分數單位為： <b style="display:inline-flex; align-items:center; vertical-align:middle;">${getFracHtml(1, cd1, 'var(--dark)')}</b>`;
    document.getElementById('drag-instruction').innerHTML = `💡 減去完畢！請填寫下方最終答案！`;
}

function setupSubtraction(cd1, cd2) {
    if (document.getElementById('trash-area')) document.getElementById('trash-area').style.display = 'flex'; 
    convertBarToDraggable(1, cd1, 'var(--red)'); convertBarToDraggable(2, cd2, 'var(--blue)');
    updateTrashTooltip(cd1);
    
    let wrap1 = document.getElementById('bar1-wrap'), wrap2 = document.getElementById('bar2-wrap');
    let dragOver = (e) => { e.preventDefault(); e.currentTarget.style.opacity = '0.7'; };
    let dragLeave = (e) => { e.currentTarget.style.opacity = '1'; };

    if (isCommonDenomReady) {
        wrap2.ondragover = dragOver; wrap2.ondragleave = dragLeave;
        wrap2.ondrop = (e) => { e.preventDefault(); wrap2.style.opacity = '1'; let el = document.getElementById(e.dataTransfer.getData('text/plain')); if (el && el.classList.contains('drag-block')) trashPieces(el, 1, cd1); };
        wrap1.ondragover = null; wrap1.ondrop = null; wrap1.ondragleave = null;
    } else {
        let dropErr = (e) => { e.preventDefault(); e.currentTarget.style.opacity = '1'; triggerErrorMerge(); };
        wrap1.ondragover = dragOver; wrap1.ondragleave = dragLeave; wrap1.ondrop = dropErr;
        wrap2.ondragover = dragOver; wrap2.ondragleave = dragLeave; wrap2.ondrop = dropErr;
    }
}

function checkCommonDenom() {
    if (!bar1Visible || !bar2Visible) return;
    document.getElementById('bar1-row').style.display = 'flex'; document.getElementById('bar2-row').style.display = 'flex';
    if (document.getElementById('tools1')) document.getElementById('tools1').style.visibility = 'visible';
    if (document.getElementById('tools2')) document.getElementById('tools2').style.visibility = 'visible';

    const vals = getSafeValues(); let cd1 = vals.d1 * s1, cd2 = vals.d2 * s2;
    isCommonDenomReady = (cd1 === cd2 && cd1 > 0);
    if (document.getElementById('trash-area')) document.getElementById('trash-area').style.display = 'flex';

    setupSubtraction(cd1, cd2);
    document.getElementById('bottom-answer-zone').style.opacity = '0'; setTimeout(() => { document.getElementById('bottom-answer-zone').style.display = 'none'; }, 300);

    if (isCommonDenomReady) {
        document.getElementById('drag-instruction').innerHTML = `💡 分母相同了！請點擊被減數的色塊，或將它拖入下方「減數長條圖」中扣除！`;
        document.getElementById('label1').style.opacity = '0'; document.getElementById('label2').style.opacity = '0';
    } else {
        document.getElementById('drag-instruction').innerHTML = `💡 試著將兩條長條圖拖拉在一起相減，看看會發生什麼事？（或點擊「擴/約分」讓分母相同）`;
        document.getElementById('label1').style.opacity = '1'; document.getElementById('label2').style.opacity = '1';
    }
}

function updateUI() {
    const valsInput = getSafeValues();
    if (valsInput.total_n1 / valsInput.d1 < valsInput.total_n2 / valsInput.d2) {
        document.getElementById('w1').value = valsInput.w2; document.getElementById('n1').value = valsInput.n2; document.getElementById('d1').value = valsInput.d2;
        document.getElementById('w2').value = valsInput.w1; document.getElementById('n2').value = valsInput.n1; document.getElementById('d2').value = valsInput.d1;
    }
    enforceInputLimits(); updateMaxWholes(); 
    const vals = getSafeValues(); s1 = 1; s2 = 1; bar1Visible = false; bar2Visible = false; isCommonDenomReady = false; trashedCount = 0;

    let wpEl = document.getElementById('word-problem');
    if (currentWordProblemTemplate) {
        wpEl.innerHTML = currentWordProblemTemplate.replace(/\[FRAC1\]/g, `<b>${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}</b>`).replace(/\[FRAC2\]/g, `<b>${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}</b>`);
        wpEl.style.display = 'block';
    } else wpEl.style.display = 'none';
    
    ['ans-w', 'ans-num', 'ans-den'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ans-w').style.display = 'none'; document.getElementById('feedback').style.opacity = '0';
    document.getElementById('bottom-answer-zone').style.display = 'none'; document.getElementById('bottom-answer-zone').style.opacity = '0';
    
    document.getElementById('anim-area').innerHTML = `
        <div id="bar1-row" style="display:none; position:relative; width:100%; min-height:50px; align-items:center; justify-content:space-between;">
            <div id="label1" style="width:15%; text-align:center; transition: opacity 0.5s; opacity: 1;"></div>
            <div class="bars-column"><div id="bar1-wrap" class="bar-wrap-container"></div><div id="bar1-nl" class="nl-wrap-container" style="display:none;"></div></div>
            <div id="tools1" style="width:15%; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; visibility:visible;">
                <button class="tool-btn" onclick="applyTool(1, 'expand')">➕ 擴分</button><button class="tool-btn" onclick="applyTool(1, 'simplify')">➖ 約分</button>
            </div>
        </div>
        <div id="bar2-row" style="display:none; position:relative; width:100%; min-height:50px; align-items:center; justify-content:space-between;">
            <div id="label2" style="width:15%; text-align:center; transition: opacity 0.5s; opacity: 1;"></div>
            <div class="bars-column"><div id="bar2-wrap" class="bar-wrap-container"></div><div id="bar2-nl" class="nl-wrap-container" style="display:none;"></div></div>
            <div id="tools2" style="width:15%; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; visibility:visible;">
                <button class="tool-btn" onclick="applyTool(2, 'expand')">➕ 擴分</button><button class="tool-btn" onclick="applyTool(2, 'simplify')">➖ 約分</button>
            </div>
        </div>
        <div id="error-merge-area" style="display:none; position:relative; width:100%; min-height:50px; align-items:center; justify-content:space-between;">
            <div id="error-label" style="width:15%; text-align:center;"></div>
            <div class="bars-column"><div id="error-bar-wrap" class="bar-wrap-container"></div><div id="error-nl-wrap" class="nl-wrap-container" style="display:none; margin-top:2px;"></div></div>
            <div style="width:15%;"></div>
        </div>
        <div id="final-answer-area" style="display:none; opacity:0; position:relative; width:100%; min-height:50px; margin-bottom:5px; align-items:center; justify-content:space-between; transition: opacity 1s;">
            <div id="final-label" style="width:15%; text-align:center;"></div>
            <div class="bars-column"><div id="final-wrap" class="bar-wrap-container"></div><div id="final-nl" class="nl-wrap-container" style="display:none; margin-top:2px;"></div></div>
            <div style="width:15%;"></div>
        </div>
        <div id="trash-area" style="display:none; position:relative; width:100%; min-height:50px; align-items:flex-start; justify-content:space-between; border-top: 2px dashed #ccc; padding-top: 5px;">
            <div style="width:15%; display: flex; flex-direction: column; align-items: center; gap: 5px;"><div id="trash-can" style="font-size: 3rem;">🗑️</div><div style="font-weight:bold; color:var(--dark); font-size:1rem;">垃圾桶</div><button id="toggle-trash-btn" class="tool-btn" style="font-size: 0.85rem; padding: 4px 8px; width: auto;" onclick="toggleTrashContent()">隱藏內容</button></div>
            <div id="trash-content" class="bars-column" style="background: white; padding: 15px 0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); border: 1px solid #eee;"><div style='text-align:center; color:#7f8c8d; padding:10px; font-weight:normal;'>目前垃圾桶是空的</div></div>
            <div style="width:15%;"></div>
        </div>
    `;
    renderBar(1, 'none'); renderBar(2, 'none');
    document.getElementById('drag-instruction').innerHTML = `💡 點擊上方分數，顯示圖形！`;
}

function randomChallenge() {
    let d1 = Math.floor(Math.random() * 5) + 3, d2 = Math.floor(Math.random() * 5) + 3; 
    while(d2 === d1) d2 = Math.floor(Math.random() * 5) + 3; 
    let total1 = Math.floor(Math.random() * (d1 * 3)) + 2, total2 = Math.floor(Math.random() * (d2 * 2)) + 1;
    if (total1/d1 < total2/d2) { [total1, total2] = [total2, total1]; [d1, d2] = [d2, d1]; }
    
    let w1 = '', n1 = total1, w2 = '', n2 = total2;
    if (document.getElementById('show-whole-cb').checked) {
        w1 = Math.floor(total1/d1); n1 = total1 % d1; if (n1 === 0 && w1 > 0) { w1--; n1 = d1; } 
        w2 = Math.floor(total2/d2); n2 = total2 % d2; if (n2 === 0 && w2 > 0) { w2--; n2 = d2; }
        if(w1 === 0) w1 = ''; if(w2 === 0) w2 = '';
    }
    document.getElementById('w1').value = w1; document.getElementById('n1').value = n1; document.getElementById('d1').value = d1;
    document.getElementById('w2').value = w2; document.getElementById('n2').value = n2; document.getElementById('d2').value = d2;
    currentWordProblemTemplate = wordProblemTemplates[Math.floor(Math.random() * wordProblemTemplates.length)];
    updateUI();
}

function autoCheck() {
    const vals = getSafeValues();
    const ansW = parseInt(document.getElementById('ans-w').value) || 0;
    let ansN = parseInt(document.getElementById('ans-num').value), ansD = parseInt(document.getElementById('ans-den').value);
    if (document.getElementById('ans-num').value === "" && document.getElementById('ans-den').value === "") { ansN = 0; ansD = 1; }
    const fb = document.getElementById('feedback');

    if (!isNaN(ansN) && !isNaN(ansD) && ansD !== 0) {
        const userVal = (ansW * ansD + ansN) / ansD;
        const exactN = (vals.total_n1 * vals.d2) - (vals.total_n2 * vals.d1), exactD = vals.d1 * vals.d2;
        const divisor = exactN === 0 ? 1 : gcd(Math.abs(exactN), exactD);
        const simpleImproperN = exactN / divisor, simpleD = exactD / divisor, simpleW = Math.floor(simpleImproperN / simpleD), simpleMixedN = simpleImproperN % simpleD;

        if (Math.abs(userVal - (exactN / exactD)) < 0.0001) {
            let isSimplest = false;
            if (exactN === 0 && ansW === 0 && ansN === 0) isSimplest = true;
            else if (ansW === 0 && ansN === simpleImproperN && ansD === simpleD) isSimplest = true;
            else if (ansW === simpleW && ansN === simpleMixedN && ansD === simpleD) isSimplest = true;
            else if (ansN === 0 && ansW === simpleW && simpleMixedN === 0) isSimplest = true;

            let msg = isSimplest ? '🎉 完全正確！而且已經是最簡化的答案了！' : '🌟 答對了數值！但試試看，這個答案可以再「約分」或「轉成帶分數」喔！';
            if ((vals.d1 * s1) !== lcm(vals.d1, vals.d2) && exactN !== 0) msg += '<br><span style="color:var(--orange); font-size:1rem; font-weight:normal;">（提示：你通分時使用的分母不是最小公倍數喔！雖然算得對，但數字會比較大。）</span>';

            fb.style.opacity = '1'; fb.style.color = 'var(--success)'; fb.innerHTML = msg;
        } else { fb.style.opacity = '1'; fb.style.color = 'var(--red)'; fb.innerText = '👀 答案不對喔，再檢查一下整數和分子相減的結果！'; }
    } else { fb.style.opacity = '0'; }
}

// --- 教學動畫提示系統 (閒置3秒或懸停互動區1秒觸發) ---
let hintAnimId = 0;
let idleTimer = null;
let hoverTimer = null;
let isHintPlaying = false;

function interruptHint() {
    hintAnimId++;
    isHintPlaying = false;
    let finger = document.getElementById('hint-finger');
    if (finger) {
        finger.style.display = 'none';
        finger.style.opacity = '0';
    }
}

function resetIdleTimer() {
    interruptHint();
    clearTimeout(idleTimer);
    clearTimeout(hoverTimer);
    // 設定閒置3秒自動觸發提示
    idleTimer = setTimeout(playHintAnimation, 3000);
}

// 監聽全局互動以重置計時器
document.addEventListener('mousemove', (e) => {
    if (isHintPlaying) interruptHint();
    
    clearTimeout(idleTimer);
    idleTimer = setTimeout(playHintAnimation, 3000);

    clearTimeout(hoverTimer);
    // 定義哪些區塊是可互動的
    let interactiveSelectors = ['.mixed-frac', '.drag-block', '.tool-btn', '.bar-wrap-container'];
    let isInteractive = interactiveSelectors.some(sel => e.target.closest(sel));
    
    // 如果滑鼠「指住」這些區域停留 1 秒，也觸發提示
    if (isInteractive) {
        hoverTimer = setTimeout(playHintAnimation, 1000);
    }
});
document.addEventListener('mousedown', resetIdleTimer);
document.addEventListener('touchstart', resetIdleTimer);
document.addEventListener('keydown', resetIdleTimer);
document.addEventListener('mouseout', () => clearTimeout(hoverTimer));

function delay(ms, myAnimId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (myAnimId === hintAnimId) resolve();
            else reject(new Error('interrupted'));
        }, ms);
    });
}

async function playHintAnimation() {
    if (isHintPlaying) return;
    
    let step = -1;
    // 智慧判斷當下要引導的步驟
    if (!bar1Visible || !bar2Visible) {
        step = 0; // 階段 0: 一開始點擊兩個分數
    } else if (!isCommonDenomReady) {
        let errArea = document.getElementById('error-merge-area');
        if (errArea && errArea.style.display !== 'flex') {
            step = 1; // 階段 1: 拖拉合併未通分母之長條圖
        } else {
            step = 2; // 階段 2: 點擊擴分或約分
        }
    } else {
        let ansZone = document.getElementById('bottom-answer-zone');
        if (ansZone && ansZone.style.display !== 'flex') {
            step = 3; // 階段 3: 拖拉合併已通分母之長條圖
        }
    }

    if (step === -1) return;

    isHintPlaying = true;
    let currentAnimId = hintAnimId;
    
    let finger = document.getElementById('hint-finger');
    if (!finger) {
        finger = document.createElement('div');
        finger.id = 'hint-finger';
        finger.innerHTML = '👆';
        finger.style.position = 'fixed';
        finger.style.fontSize = '4rem';
        finger.style.zIndex = '10000';
        finger.style.pointerEvents = 'none';
        finger.style.filter = 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))';
        finger.style.transformOrigin = 'top left';
        document.body.appendChild(finger);
    }

    finger.style.transition = 'none';
    finger.style.transform = 'translate(0px, 0px) scale(1)';
    finger.style.opacity = '0';
    finger.style.display = 'block';

    try {
        if (step === 0) {
            let target = !bar1Visible ? document.getElementById('frac1-group') : document.getElementById('frac2-group');
            let rect = target.getBoundingClientRect();
            finger.style.left = (rect.left + rect.width/2 - 20) + 'px';
            finger.style.top = (rect.top + rect.height/2 + 10) + 'px';
            
            await delay(50, currentAnimId);
            finger.style.transition = 'opacity 0.3s'; finger.style.opacity = '1';
            await delay(400, currentAnimId);
            
            finger.style.transition = 'transform 0.2s';
            finger.style.transform = 'translate(0px, -15px) scale(0.8)'; // 模擬按下
            await delay(200, currentAnimId);
            finger.style.transform = 'translate(0px, 0px) scale(1)'; // 模擬放開
            await delay(400, currentAnimId);
            
        } else if (step === 1 || step === 3) {
            // 找尋紅色的色塊與藍色的容器進行拖拉展示
            let sourceBlocks = Array.from(document.querySelectorAll('#bar1-wrap .drag-block'));
            let source = sourceBlocks.find(b => b.style.display !== 'none');
            let dest = document.getElementById('bar2-wrap');
            
            if (!source || !dest) throw new Error('element not found');
            
            let sRect = source.getBoundingClientRect(), dRect = dest.getBoundingClientRect();
            finger.style.left = (sRect.left + sRect.width/2 - 20) + 'px';
            finger.style.top = (sRect.top + sRect.height/2 + 10) + 'px';
            
            await delay(50, currentAnimId);
            finger.style.transition = 'opacity 0.3s'; finger.style.opacity = '1';
            await delay(400, currentAnimId);
            
            finger.style.transition = 'transform 0.2s';
            finger.style.transform = 'translate(0px, -15px) scale(0.8)'; // 抓取
            await delay(300, currentAnimId);
            
            finger.style.transition = 'left 1s ease-in-out, top 1s ease-in-out, transform 1s';
            finger.style.left = (dRect.left + dRect.width/2 - 20) + 'px';
            finger.style.top = (dRect.top + dRect.height/2 + 10) + 'px';
            await delay(1100, currentAnimId);
            
            finger.style.transition = 'transform 0.2s';
            finger.style.transform = 'translate(0px, 0px) scale(1)'; // 放開
            await delay(400, currentAnimId);
            
        } else if (step === 2) {
            let target = document.querySelector('#tools1 .tool-btn'); 
            if (!target) throw new Error('element not found');
            let rect = target.getBoundingClientRect();
            
            finger.style.left = (rect.left + rect.width/2 - 20) + 'px';
            finger.style.top = (rect.top + rect.height/2 + 10) + 'px';
            
            await delay(50, currentAnimId);
            finger.style.transition = 'opacity 0.3s'; finger.style.opacity = '1';
            await delay(400, currentAnimId);
            
            finger.style.transition = 'transform 0.2s';
            finger.style.transform = 'translate(0px, -15px) scale(0.8)'; // 模擬按下
            await delay(200, currentAnimId);
            finger.style.transform = 'translate(0px, 0px) scale(1)'; // 模擬放開
            await delay(400, currentAnimId);
        }
        
        finger.style.transition = 'opacity 0.3s';
        finger.style.opacity = '0';
        await delay(300, currentAnimId);
        
    } catch(e) {
        // 被使用者的滑鼠打斷時靜默處理
    }
    finger.style.display = 'none';
    isHintPlaying = false;
}

window.onload = () => {
    updateSpeed(); toggleWholeNumber(); updateUI();
    resetIdleTimer();
};
