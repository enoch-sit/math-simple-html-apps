let FIXED_UNIT_WIDTH = 150; 

const inputArea = document.getElementById('inputArea');
const contextMenu = document.getElementById('customContextMenu');
let longPressTimer;

inputArea.oncontextmenu = function(e) {
    e.preventDefault();
    showMenu(e.pageX, e.pageY);
};

inputArea.ontouchstart = function(e) {
    longPressTimer = setTimeout(() => {
        showMenu(e.touches[0].pageX, e.touches[0].pageY);
    }, 600);
};
inputArea.ontouchend = function() { clearTimeout(longPressTimer); };

function showMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

window.onclick = function() { contextMenu.style.display = 'none'; };

function setMode(mode) {
    const wholeInp = document.getElementById('inputWhole');
    const numInp = document.getElementById('inputNum');
    const denInp = document.getElementById('inputDen');
    const fracPart = document.getElementById('fractionPart');
    
    wholeInp.value = 1;
    numInp.value = 1;
    denInp.value = 1;
    
    if (mode === 'whole') {
        wholeInp.style.display = 'block';
        fracPart.style.display = 'none';
    } else if (mode === 'fraction') {
        wholeInp.style.display = 'none';
        fracPart.style.display = 'inline-flex';
    } else {
        wholeInp.style.display = 'block';
        fracPart.style.display = 'inline-flex';
    }

    // Update toggle button active state
    const btns = { whole: 'btn-mode-whole', fraction: 'btn-mode-fraction', mixed: 'btn-mode-mixed' };
    Object.entries(btns).forEach(([m, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (m === mode) {
            btn.style.borderColor = '#34495e';
            btn.style.color = '#34495e';
            btn.style.boxShadow = '0 3px 0 #34495e';
        } else {
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.boxShadow = '';
        }
    });

    updateUI();
}

function updateUI() {
    let wholeStr = document.getElementById('inputWhole').value;
    let whole = parseInt(wholeStr);
    if (isNaN(whole) || whole < 0) { whole = 1; document.getElementById('inputWhole').value = 1; }
    else if (whole > 100) { whole = 100; document.getElementById('inputWhole').value = 100; }

    let numStr = document.getElementById('inputNum').value;
    let num = parseInt(numStr);
    if (num <= 0) { num = 1; document.getElementById('inputNum').value = 1; }
    else if (isNaN(num)) { num = 1; } 
    else if (num > 100) { num = 100; document.getElementById('inputNum').value = 100; }

    let denStr = document.getElementById('inputDen').value;
    let den = parseInt(denStr);
    if (den <= 0) { den = 1; document.getElementById('inputDen').value = 1; }
    else if (isNaN(den)) { den = 1; } 
    else if (den > 100) { den = 100; document.getElementById('inputDen').value = 100; }
    
    let actualW = whole;
    let actualN = num;

    if (document.getElementById('inputWhole').style.display === 'none') {
        actualW = 0;
    }
    if (document.getElementById('fractionPart').style.display === 'none') {
        actualN = 0;
    }

    const barHeight = parseInt(document.getElementById('heightSlider').value);
    FIXED_UNIT_WIDTH = parseInt(document.getElementById('widthSlider').value) || 150;

    renderBars(actualW, actualN, den, barHeight);
    renderText(actualW, actualN, den);
}

function handleCellClick(clickedTotalCells, d) {
    const wholeInp = document.getElementById('inputWhole');
    const numInp = document.getElementById('inputNum');
    const fracPart = document.getElementById('fractionPart');

    if (wholeInp.style.display === 'none') {
        // Fraction mode: numerator = total cells clicked
        numInp.value = clickedTotalCells;
    } else if (fracPart.style.display === 'none') {
        // Integer mode: round up to nearest whole
        let w = Math.ceil(clickedTotalCells / d);
        wholeInp.value = Math.max(w, 1);
    } else {
        // Mixed mode: whole + remainder
        let w = Math.floor(clickedTotalCells / d);
        let n = clickedTotalCells % d;
        
        if (n === 0) {
            // Clicked exactly on a whole boundary (e.g. at "1" or "2")
            wholeInp.value = w;
            numInp.value = 1;
        } else {
            wholeInp.value = w;
            numInp.value = n;
        }
    }
    updateUI();
}

function renderBars(w, n, d, height) {
    const container = document.getElementById('barsDisplay');
    container.innerHTML = '';

    let displayD = d;
    let totalFilledCells = (w * d) + n;

    // Integer mode: no grid lines, each unit = 1 whole
    if (n === 0) {
        displayD = 1;
        totalFilledCells = w;
    }

    const totalUnitsNeeded = Math.max(Math.ceil(totalFilledCells / displayD), 1);
    
    // Set --max-wholes for the continuous bar layout
    container.style.setProperty('--max-wholes', totalUnitsNeeded);

    // Bar row
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap-container continuous';
    barWrap.style.width = (FIXED_UNIT_WIDTH * totalUnitsNeeded) + 'px';

    for (let u = 0; u < totalUnitsNeeded; u++) {
        const unit = document.createElement('div');
        unit.className = 'bar-unit';
        unit.style.height = Math.max(height, 10) + 'px';

        // Calculate fill percentage for this unit
        let filledInThisUnit = 0;
        if (totalFilledCells > u * displayD) {
            filledInThisUnit = Math.min(displayD, totalFilledCells - (u * displayD));
        }
        const fillPct = (filledInThisUnit / displayD) * 100;

        // Bar fill
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = fillPct + '%';
        fill.style.backgroundColor = 'var(--primary-red, #ff3333)';
        unit.appendChild(fill);

        // Grid overlay with thin lines (clickable segments on top)
        const grid = document.createElement('div');
        grid.className = 'grid-overlay';
        
        if (displayD > 1) {
            for (let k = 1; k < displayD; k++) {
                const line = document.createElement('div');
                line.className = 'abs-thin-line';
                line.style.left = (k / displayD * 100) + '%';
                grid.appendChild(line);
            }
        }
        unit.appendChild(grid);

        // Clickable segments (invisible but cover the bar for interaction)
        for (let i = 0; i < displayD; i++) {
            const seg = document.createElement('div');
            seg.style.position = 'absolute';
            seg.style.left = (i / displayD * 100) + '%';
            seg.style.width = (100 / displayD) + '%';
            seg.style.height = '100%';
            seg.style.top = '0';
            seg.style.zIndex = '10';
            seg.style.cursor = 'pointer';
            const cellIndex = (u * displayD) + i + 1;
            seg.onclick = () => handleCellClick(cellIndex, displayD);
            unit.appendChild(seg);
        }

        barWrap.appendChild(unit);
    }
    container.appendChild(barWrap);

    // Number line row
    const nlWrap = document.createElement('div');
    nlWrap.className = 'nl-wrap-container continuous';
    nlWrap.style.width = (FIXED_UNIT_WIDTH * totalUnitsNeeded) + 'px';

    for (let u = 0; u < totalUnitsNeeded; u++) {
        const nlUnit = document.createElement('div');
        nlUnit.className = 'nl-unit';
        nlUnit.style.position = 'relative';
        nlUnit.style.height = '40px';

        let labelsHtml = '';
        for (let i = 0; i <= displayD; i++) {
            // Skip end label if not last unit (avoid duplicate at boundary)
            if (i === displayD && u < totalUnitsNeeded - 1) continue;

            let valWhole = u, valRem = i;
            if (i === displayD) { valWhole = u + 1; valRem = 0; }

            const leftPct = (i / displayD * 100);
            let labelContent = '';
            
            if (valRem === 0) {
                labelContent = `<span style="font-weight:bold; font-size:15px; color:var(--integer-green, #009900);">${valWhole}</span>`;
            } else {
                const fracHtml = `<span class="nl-frac"><span class="nl-num" style="color:var(--primary-red, #ff3333);">${valRem}</span><span class="nl-line-frac"></span><span class="nl-den" style="color:var(--bar-border-color, #2c3e50);">${displayD}</span></span>`;
                if (valWhole === 0) {
                    labelContent = fracHtml;
                } else {
                    labelContent = `<span style="display:inline-flex; align-items:center; gap:2px;"><span style="font-weight:bold; font-size:15px; color:var(--integer-green, #009900);">${valWhole}</span>${fracHtml}</span>`;
                }
            }

            // Tick mark + label
            labelsHtml += `<div class="nl-tick-wrapper" style="position:absolute; left:${leftPct}%; top:0;">
                <div class="nl-tick"></div>
                <div class="nl-label">${labelContent}</div>
            </div>`;
        }

        // The axis line
        labelsHtml = `<div class="nl-line" style="position:absolute; top:5px; left:0; width:100%;"></div>` + labelsHtml;
        nlUnit.innerHTML = labelsHtml;
        nlWrap.appendChild(nlUnit);
    }
    container.appendChild(nlWrap);
}

function renderText(w, n, d) {
    const div = document.getElementById('explanationText');
    const totalNum = w * d + n;
    const actualW = Math.floor(totalNum / d), actualN = totalNum % d;
    
    let type = "分數";
    if (w > 0 && n > 0) {
        type = "帶分數";
    } else if (n === 0) {
        type = "整數";
    } else if (w === 0 && n > 0) {
        if (n < d) {
            type = "真分數";
        } else {
            type = "假分數";
        }
    }

    let convertHtml = '';
    
    const fFrac = (nu, de) => `<span class="nl-frac" style="font-size:1.1rem;"><span class="nl-num" style="color:var(--primary-red, #ff3333);">${nu}</span><span class="nl-line-frac"></span><span class="nl-den" style="color:var(--bar-border-color, #2c3e50);">${de}</span></span>`;
    const fMix = (wh, nu, de) => `<span style="display:inline-flex; align-items:center; gap:4px;"><span style="font-weight:bold; font-size:1.1em; color:var(--integer-green, #009900);">${wh}</span>${fFrac(nu, de)}</span>`;

    if (totalNum > 0 && !(w === 0 && n === totalNum)) {
        convertHtml += `<div style="display:flex; align-items:center; margin-bottom:8px;">轉換為分數：<div style="margin-left:10px;">${fFrac(totalNum, d)}</div></div>`;
    }
    if (actualW > 0 && actualN > 0 && !(w === actualW && n === actualN)) {
        convertHtml += `<div style="display:flex; align-items:center; margin-bottom:8px;">轉換為帶分數：<div style="margin-left:10px;">${fMix(actualW, actualN, d)}</div></div>`;
    }
    if (actualN === 0 && !(w === actualW && n === 0)) {
        convertHtml += `<div style="margin-bottom:8px;">轉換為整數：<strong style="color:var(--integer-green, #009900); margin-left:10px; font-size:1.1em;">${actualW}</strong></div>`;
    }

    let currentValHtml = '';
    if (w > 0 && n > 0) {
        currentValHtml = fMix(w, n, d);
    } else if (n > 0) {
        currentValHtml = fFrac(n, d);
    } else {
        currentValHtml = `<strong style="color:var(--integer-green, #009900); font-size:1.1em;">${w}</strong>`;
    }

    div.innerHTML = `
        <div class="info-title">數值轉換與解析</div>
        <div style="margin-top: 10px; margin-bottom: 15px; font-size: 1.05em;">
            <div style="display:flex; align-items:center; min-height:30px; margin-bottom: 8px;">${currentValHtml}</div>
            <div>類型：<strong>${type}</strong></div>
        </div>
        <div style="margin-bottom:15px;">${convertHtml}</div>
    `;
}

updateUI();
