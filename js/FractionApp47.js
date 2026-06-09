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
 
 // 全域變數管控
 let bar3BlocksCount = 0; // 用於追蹤合併區域的總格數
 let isCommonDenomReady = false; // 追蹤是否已通分母
 let barErrorModeValue = 0; // 追蹤錯誤模式下的數值比例
 let moved1 = 0; // 追蹤 frac1 被移到 bar3 的片段數
 let moved2 = 0; // 追蹤 frac2 被移到 bar3 的片段數
 
 // 紀錄色塊拖曳的歷史順序與大小
 let mergedBlocks = []; 

 // --- 教學動畫邏輯 ---
 let inactivityTimer = null;
 let hoverTimer = null;
 let tutorialInterval = null;
 let isTutorialRunning = false;
 let animationTimeouts = []; // 儲存動畫排程，確保能乾淨中斷

 // 動畫排程小幫手
 const delay = (fn, ms) => animationTimeouts.push(setTimeout(fn, ms));

 function stopTutorial() {
     clearInterval(tutorialInterval);
     // 清除所有尚未執行的動畫排程，防止小手亂飄
     animationTimeouts.forEach(t => clearTimeout(t));
     animationTimeouts = [];
     isTutorialRunning = false;
     
     let hand = document.getElementById('tutorial-hand');
     if (hand) {
         hand.style.transition = 'opacity 0.2s';
         hand.style.opacity = '0';
     }
 }

 function resetInactivityTimer(e) {
     stopTutorial(); // 只要有動作就中斷正在播放的動畫
     clearTimeout(inactivityTimer);
     clearTimeout(hoverTimer);

     // 1. 全域待機 3 秒觸發
     inactivityTimer = setTimeout(startTutorialAnimation, 3000);

     // 2. 指住不動 (Hover still) 1 秒觸發：若鼠標停在互動元素上
     if (e && e.type === 'mousemove' && e.target && e.target.closest) {
         if (e.target.closest('.tool-btn, .mixed-frac, .drag-block, .bar-wrap-container, #bottom-answer-zone')) {
             hoverTimer = setTimeout(startTutorialAnimation, 1000);
         }
     }
 }

 // 監聽全域事件，只要滑鼠或鍵盤有動靜就重置
 ['mousemove', 'mousedown', 'keydown', 'touchstart', 'dragstart', 'input', 'change'].forEach(evt => {
     document.addEventListener(evt, resetInactivityTimer, { passive: true });
 });

 function startTutorialAnimation() {
     if (isTutorialRunning) return;
     isTutorialRunning = true;
     runTutorialStep();
     // 每 4.5 秒循環一次 (給 3 秒的動畫留足夠的緩衝空間)
     tutorialInterval = setInterval(runTutorialStep, 4500);
 }

 function runTutorialStep() {
     // 如果學生已經答對且顯示綠色正確訊息，不再顯示手指
     let fb = document.getElementById('feedback');
     if (fb && fb.style.opacity === '1' && fb.style.color === 'var(--success)') return; 

     const vals = getSafeValues();
     let hand = document.getElementById('tutorial-hand');
     if (!hand) return;

     let startEl = null;
     let endEl = null;
     let action = 'click'; 

     let totalNeeded = (vals.total_n1 * s1) + (vals.total_n2 * s2);
     
     // 判斷當前邏輯階段來決定提示哪裡
     if (!bar1Visible) {
         startEl = document.getElementById('frac1-group');
     } else if (!bar2Visible) {
         startEl = document.getElementById('frac2-group');
     } else if (!isCommonDenomReady) {
         let errorRow = document.getElementById('bar-error-row');
         if (errorRow && errorRow.style.display === 'flex') {
             // 已出現錯誤列 -> 提示擴分
             let cd1 = vals.d1 * s1;
             let cd2 = vals.d2 * s2;
             if (cd1 < cd2) {
                 let btns = document.querySelectorAll('#bar1-row .tool-btn');
                 if(btns.length > 0) startEl = btns[0]; 
             } else {
                 let btns = document.querySelectorAll('#bar2-row .tool-btn');
                 if(btns.length > 0) startEl = btns[0];
             }
         } else {
             // 還沒出現錯誤列 -> 提示互相拖拉
             startEl = document.querySelector('#bar1-wrap .drag-block') || document.querySelector('#bar2-wrap .drag-block');
             if (startEl) {
                 endEl = startEl.closest('#bar1-wrap') ? document.getElementById('bar2-wrap') : document.getElementById('bar1-wrap');
                 action = 'drag';
             }
         }
     } else if (isCommonDenomReady && bar3BlocksCount < totalNeeded) {
         // 已通分 -> 提示拖拉小格到下方
         startEl = document.querySelector('#bar1-wrap .drag-block') || document.querySelector('#bar2-wrap .drag-block');
         endEl = document.getElementById('bar3-wrap');
         action = 'drag';
     } else if (isCommonDenomReady && bar3BlocksCount === totalNeeded) {
         // 合併完成 -> 提示點擊輸入答案
         startEl = document.getElementById('ans-num');
         if (!startEl || startEl.style.display === 'none') return;
     }

     if (!startEl) return;

     let startRect = startEl.getBoundingClientRect();
     let startX = startRect.left + startRect.width / 2 + window.scrollX;
     let startY = startRect.top + startRect.height / 2 + window.scrollY;

     // 瞬間把手勢擺到起點
     hand.style.transition = 'none';
     hand.style.left = `${startX}px`;
     hand.style.top = `${startY}px`;
     hand.style.transform = 'translate(-20%, -10%) scale(1)'; 
     hand.style.opacity = '1';

     void hand.offsetWidth; // 觸發重繪

     // --- 將動畫拉長為 ~3秒，讓學生能慢慢看清楚 ---
     if (action === 'click') {
         hand.style.transition = 'transform 0.5s ease';
         delay(() => { hand.style.transform = 'translate(-20%, -10%) scale(0.8)'; }, 1000); // 1秒：手指壓下
         delay(() => { hand.style.transform = 'translate(-20%, -10%) scale(1)'; }, 1500);   // 1.5秒：手指抬起
         delay(() => { hand.style.opacity = '0'; }, 3000);                                  // 3秒：動畫結束隱藏
     } else if (action === 'drag' && endEl) {
         let endRect = endEl.getBoundingClientRect();
         let endX = endRect.left + endRect.width / 2 + window.scrollX;
         let endY = endRect.top + endRect.height / 2 + window.scrollY;

         delay(() => {
             hand.style.transition = 'transform 0.4s ease';
             hand.style.transform = 'translate(-20%, -10%) scale(0.8)'; // 1秒：手指壓下 (抓取)
             
             delay(() => {
                 // 1.4秒開始移動，花費 1.2秒 抵達目的地
                 hand.style.transition = 'left 1.2s cubic-bezier(0.25, 1, 0.5, 1), top 1.2s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s';
                 hand.style.left = `${endX}px`;
                 hand.style.top = `${endY}px`;
                 
                 delay(() => {
                     hand.style.transform = 'translate(-20%, -10%) scale(1)'; // 2.6秒：手指抬起 (放開)
                     delay(() => { hand.style.opacity = '0'; }, 400);         // 3秒：動畫結束隱藏
                 }, 1200);
             }, 400);
         }, 1000);
     }
 }
 // -----------------------------------------

 const wordProblemTemplates = [
     "小明吃了 [FRAC1] 塊披薩，小紅吃了 [FRAC2] 塊。請問他們共吃了多少塊披薩？",
     "第一塊農田面積為 [FRAC1] 公頃，第二塊為 [FRAC2] 公頃。請問兩塊農田的面積共是多少公頃？",
     "媽媽買了 [FRAC1] 公斤的蘋果和 [FRAC2] 公斤的橘子。請問水果總共有多少公斤？",
     "水桶裡原有 [FRAC1] 公升的水，又加入了 [FRAC2] 公升。請問現在水桶裡共有多少公升的水？",
     "紅彩帶長 [FRAC1] 公尺，藍彩帶長 [FRAC2] 公尺。請問兩條彩帶接在一起共長多少公尺？"
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
     if (bar1Visible) renderBar(1, 'none');
     if (bar2Visible) renderBar(2, 'none');
     
     const vals = getSafeValues();
     let cd1 = vals.d1 * s1;
     
     // 更新正確合併列的數線
     let bar3Row = document.getElementById('bar3-row');
     if (bar3Row && bar3Row.style.display !== 'none') {
         let wrap3 = document.getElementById('bar3-wrap');
         const showNL = document.getElementById('show-nl-cb').checked;
         if (showNL) wrap3.classList.add('continuous');
         else wrap3.classList.remove('continuous');
         
         if (isCommonDenomReady) {
             renderBar3NumberLine(cd1);
         }
     }

     // 更新錯誤合併列的數線
     let errorRow = document.getElementById('bar-error-row');
     if (errorRow && errorRow.style.display !== 'none') {
         let errorNl = document.getElementById('bar-error-nl');
         const showNL = document.getElementById('show-nl-cb').checked;
         if (showNL) {
             errorNl.style.display = 'flex';
         } else {
             errorNl.style.display = 'none';
         }
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

     return { 
         w1, n1, d1, 
         w2, n2, d2, 
         total_n1: w1 * d1 + n1, 
         total_n2: w2 * d2 + n2 
     };
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
     let maxW = Math.max(wholes1, wholes2);
     
     let sumN = vals.total_n1 * vals.d2 + vals.total_n2 * vals.d1;
     let sumD = vals.d1 * vals.d2;
     let wholesSum = Math.max(1, Math.ceil(sumN / sumD));
     
     maxW = Math.max(maxW, wholesSum);

     document.documentElement.style.setProperty('--max-wholes', maxW);
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
 function lcm(a, b) { return (a * b) / gcd(a, b); }

 function onFrac1Click() {
     let row = document.getElementById('bar1-row');
     row.style.display = 'flex';
     s1 = 1;
     
     moved1 = 0; moved2 = 0; bar3BlocksCount = 0; mergedBlocks = [];
     isCommonDenomReady = false;
     let bar3Row = document.getElementById('bar3-row');
     if (bar3Row) bar3Row.style.display = 'none';
     let botZone = document.getElementById('bottom-answer-zone');
     if (botZone) { botZone.style.display = 'none'; botZone.style.opacity = '0'; }
     if (bar2Visible) renderBar(2, 'none'); 

     renderBar(1, 'none');
     row.classList.remove('fade-in-slow');
     void row.offsetWidth;
     row.classList.add('fade-in-slow');
     bar1Visible = true;
     checkCommonDenom();
 }

 function onFrac2Click() {
     let row = document.getElementById('bar2-row');
     row.style.display = 'flex';
     s2 = 1;
     
     moved1 = 0; moved2 = 0; bar3BlocksCount = 0; mergedBlocks = [];
     isCommonDenomReady = false;
     let bar3Row = document.getElementById('bar3-row');
     if (bar3Row) bar3Row.style.display = 'none';
     let botZone = document.getElementById('bottom-answer-zone');
     if (botZone) { botZone.style.display = 'none'; botZone.style.opacity = '0'; }
     if (bar1Visible) renderBar(1, 'none'); 

     renderBar(2, 'none');
     row.classList.remove('fade-in-slow');
     void row.offsetWidth;
     row.classList.add('fade-in-slow');
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
         moved1 = 0;
         moved2 = 0;
         bar3BlocksCount = 0;
         mergedBlocks = [];
         isCommonDenomReady = false; 

         let bar3Row = document.getElementById('bar3-row');
         if (bar3Row) bar3Row.style.display = 'none';
         let botZone = document.getElementById('bottom-answer-zone');
         if (botZone) { botZone.style.display = 'none'; botZone.style.opacity = '0'; }

         let other_num = num === 1 ? 2 : 1;
         if ((num === 1 && bar2Visible) || (num === 2 && bar1Visible)) {
             renderBar(other_num, 'none');
         }

         renderBar(num, action, old_s);
         setTimeout(checkCommonDenom, 650 / currentSpeed);
     }
 }

 function applyGridAnimation(gridContainer, d, s, old_s, action) {
     let animTimeMs = (0.6 / currentSpeed) * 1000;
     let halfAnimMs = animTimeMs / 2;

     gridContainer.innerHTML = '';
     let html = '<div class="grid-overlay">';

     for (let k = 1; k < d; k++) {
         html += `<div class="abs-thick-line" style="left: ${(k/d)*100}%;"></div>`;
     }

     if (action === 'simplify') {
         for (let k = 0; k < d; k++) {
             let remove_j = Math.floor(old_s / 2);
             for (let j = 1; j < old_s; j++) {
                 let oldLeftPct = ((k * old_s + j) / (d * old_s)) * 100;
                 let lineId = `line_${Math.random().toString(36).substr(2, 5)}`;
                 
                 if (j === remove_j) {
                     html += `<div id="${lineId}" class="abs-thin-line removed-line" style="left: ${oldLeftPct}%; top: 0; height: 100%; transition: height ${halfAnimMs}ms ease-in;"></div>`;
                 } else {
                     let new_j = j < remove_j ? j : j - 1;
                     let newLeftPct = ((k * s + new_j) / (d * s)) * 100;
                     html += `<div id="${lineId}" class="abs-thin-line retained-line" style="left: ${oldLeftPct}%; top: 0; height: 100%; transition: left ${halfAnimMs}ms ease-out;" data-target-left="${newLeftPct}%"></div>`;
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
                 let leftPct = ((k * s + j) / (d * s)) * 100;
                 html += `<div class="abs-thin-line expand-anim-line" style="left: ${leftPct}%; height: 0%; top: 0; background: var(--orange); transition: height ${animTimeMs}ms cubic-bezier(0.4, 0, 0.2, 1), background-color ${animTimeMs}ms;"></div>`;
             }
         }
         html += '</div>';
         gridContainer.innerHTML = html;

         setTimeout(() => {
             gridContainer.querySelectorAll('.expand-anim-line').forEach(l => {
                 l.style.height = '100%';
                 setTimeout(() => l.style.background = 'var(--dark)', animTimeMs);
             });
         }, 50);

     } else {
         for (let k = 0; k < d; k++) {
             for (let j = 1; j < s; j++) {
                 let leftPct = ((k * s + j) / (d * s)) * 100;
                 html += `<div class="abs-thin-line" style="left: ${leftPct}%;"></div>`;
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

     if(label) {
         label.innerHTML = getDisplayHtml(w, n * s, d * s, color);
     }

     if(wrap) {
         if (showNL) wrap.classList.add('continuous');
         else wrap.classList.remove('continuous');

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

             let filled_parts = (total_n * s) - (idx * d * s);
             let clamped = Math.max(0, Math.min(d * s, filled_parts));
             let pct = (clamped / (d * s)) * 100;
             
             if (fill) {
                 fill.style.width = `${pct}%`;
                 fill.style.backgroundColor = color;
             }

             if (grid) applyGridAnimation(grid, d, s, old_s, action);
         });
     }

     if(nlWrap) {
         if (showNL) {
             nlWrap.style.display = 'flex';
             nlWrap.classList.add('continuous');
             nlWrap.innerHTML = '';
             for (let i = 0; i < maxW; i++) {
                 let nlUnit = document.createElement('div');
                 nlUnit.className = 'nl-unit';
                 let labelsHtml = '';
                 let currentD = d * s;
                 for (let k = 0; k < currentD; k++) {
                     let leftPct = (k / currentD) * 100;
                     let valHtml = '';
                     if (k === 0) {
                         valHtml = `<span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i}</span>`;
                     } else {
                         let fracPart = `<div class="inline-frac" style="font-size:0.85em; color:var(--dark);"><span>${k}</span><div class="line"></div><span>${currentD}</span></div>`;
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
         } else {
             nlWrap.style.display = 'none';
             nlWrap.innerHTML = '';
         }
     }

     if (action !== 'none') {
         let animTimeMs = (0.6 / currentSpeed) * 1000;
         setTimeout(() => {
             let current_s = num === 1 ? s1 : s2;
             if (current_s === s) renderBar(num, 'none'); 
         }, 50 + animTimeMs);
     }
 }

 function renderBar3NumberLine(cd) {
     let nlWrap = document.getElementById('bar3-nl');
     if (!nlWrap) return;

     const showNL = document.getElementById('show-nl-cb').checked;
     if (!showNL || !isCommonDenomReady) {
         nlWrap.style.display = 'none';
         nlWrap.innerHTML = '';
         return;
     }

     nlWrap.style.display = 'flex';
     nlWrap.classList.add('continuous');
     nlWrap.innerHTML = '';

     let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;

     for (let i = 0; i < maxW; i++) {
         let nlUnit = document.createElement('div');
         nlUnit.className = 'nl-unit';
         let labelsHtml = '';
         
         for (let k = 0; k < cd; k++) {
             let totalIdx = i * cd + k;
             let leftPct = (k / cd) * 100;
             
             let isCurrentCount = (totalIdx === bar3BlocksCount);
             let showLabel = (totalIdx <= bar3BlocksCount);
             
             let valHtml = '';
             if (showLabel) {
                 let labelColor = isCurrentCount && totalIdx !== 0 ? 'var(--red)' : 'var(--dark)';
                 let labelScale = isCurrentCount && totalIdx !== 0 ? 'transform: scale(1.15); font-weight: bold; transition: 0.3s;' : 'transition: 0.3s;';
                 
                 if (k === 0) {
                     valHtml = `<span style="font-weight:bold; font-size:1.1rem; color:${labelColor}; ${labelScale}">${i}</span>`;
                 } else {
                     let fracPart = `<div class="inline-frac" style="font-size:0.85em; color:${labelColor}; ${labelScale}"><span>${k}</span><div class="line"></div><span>${cd}</span></div>`;
                     if (i > 0) {
                         valHtml = `<div style="display: flex; align-items: center; justify-content: center;"><span style="font-weight:bold; font-size:1.05rem; margin-right:2px; color:${labelColor}; ${labelScale}">${i}</span>${fracPart}</div>`;
                     } else {
                         valHtml = fracPart;
                     }
                 }
             }
             
             let tickColor = (totalIdx <= bar3BlocksCount && totalIdx !== 0) ? 'var(--red)' : 'var(--dark)';
             let tickHeight = isCurrentCount && totalIdx !== 0 ? '8px' : '6px';
             let tickWidth = isCurrentCount && totalIdx !== 0 ? '3px' : '2px';
             let zIndex = isCurrentCount ? 10 : 5;

             labelsHtml += `<div style="position: absolute; left: ${leftPct}%; top: 0px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: ${zIndex};">
                 <div style="width: ${tickWidth}; height: ${tickHeight}; background: ${tickColor}; margin-bottom: 2px; transition: 0.3s;"></div>
                 ${valHtml}
             </div>`;
         }

         if (i === maxW - 1) {
             let maxTotalIdx = maxW * cd;
             let isCurrentCount = (maxTotalIdx === bar3BlocksCount);
             let showLabel = (maxTotalIdx <= bar3BlocksCount);
             let valHtml = '';
             if (showLabel) {
                 let labelColor = isCurrentCount ? 'var(--red)' : 'var(--dark)';
                 let labelScale = isCurrentCount ? 'transform: scale(1.15); font-weight: bold; transition: 0.3s;' : 'transition: 0.3s;';
                 valHtml = `<span style="font-weight:bold; font-size:1.1rem; color:${labelColor}; ${labelScale}">${maxW}</span>`;
             }
             let tickColor = (maxTotalIdx <= bar3BlocksCount) ? 'var(--red)' : 'var(--dark)';
             let tickHeight = isCurrentCount ? '8px' : '6px';
             let tickWidth = isCurrentCount ? '3px' : '2px';
             let zIndex = isCurrentCount ? 10 : 5;

             labelsHtml += `<div style="position: absolute; left: 100%; top: 0px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: ${zIndex};">
                 <div style="width: ${tickWidth}; height: ${tickHeight}; background: ${tickColor}; margin-bottom: 2px; transition: 0.3s;"></div>
                 ${valHtml}
             </div>`;
         }

         nlUnit.innerHTML = labelsHtml;
         nlWrap.appendChild(nlUnit);
     }
 }

 function updateDragDropState(cd) {
     convertBarToDraggable(1, cd, 'var(--red)', moved1);
     convertBarToDraggable(2, cd, 'var(--blue)', moved2);
     renderBar3Draggable(cd);
 }

 function convertBarToDraggable(num, cd, color, movedPieces = 0) {
     let wrap = document.getElementById(`bar${num}-wrap`);
     let units = wrap.querySelectorAll('.bar-unit');
     
     const vals = getSafeValues();
     let total_n = num === 1 ? vals.total_n1 : vals.total_n2;
     let s = num === 1 ? s1 : s2;
     
     let remaining_pieces = (total_n * s) - movedPieces;
     
     units.forEach((unit, uIdx) => {
         let existingBlocks = unit.querySelectorAll('.drag-block');
         existingBlocks.forEach(b => b.remove());

         let fill = unit.querySelector('.bar-fill');
         if (fill) fill.style.display = 'none'; 
         
         unit.style.display = 'flex';
         unit.style.flexDirection = 'row';
         
         let pieces_in_this_unit = Math.max(0, Math.min(cd, remaining_pieces - uIdx * cd));
         let grid = unit.querySelector('.bar-grid');

         if (pieces_in_this_unit === cd || !isCommonDenomReady) {
             let block = document.createElement('div');
             block.className = 'drag-block';
             block.id = `drag-${num}-${uIdx}-whole`;
             block.style.width = `${(pieces_in_this_unit / cd) * 100}%`;
             block.style.height = '100%';
             block.style.backgroundColor = color;
             block.style.opacity = '0.85';
             block.draggable = true;
             block.style.cursor = 'grab';
             block.style.position = 'relative';
             block.style.boxSizing = 'border-box';
             block.style.borderRight = isCommonDenomReady && pieces_in_this_unit === cd ? '1px solid rgba(255,255,255,0.4)' : 'none';
             block.style.zIndex = '1';
             block.setAttribute('data-pieces', pieces_in_this_unit); 
             
             block.ondragstart = (e) => {
                 let dragData = JSON.stringify({ source_num: num, pieces: pieces_in_this_unit });
                 e.dataTransfer.setData('text/plain', dragData);
                 setTimeout(() => block.style.opacity = '0.4', 0);
             };
             block.ondragend = (e) => {
                 if (block.draggable) block.style.opacity = '0.85';
             };

             block.onclick = () => {
                 if (block.draggable) {
                     if (isCommonDenomReady) {
                         if (num === 1) moved1 += pieces_in_this_unit; else moved2 += pieces_in_this_unit;
                         mergedBlocks.push({ num: num, pieces: pieces_in_this_unit });
                         updateDragDropState(cd);
                     }
                     else triggerErrorMerge();
                 }
             };

             if (pieces_in_this_unit > 0) { 
                 if (grid) unit.insertBefore(block, grid);
                 else unit.appendChild(block);
             }

         } else {
             let pieceWidth = 100 / cd;
             for (let i = 0; i < pieces_in_this_unit; i++) {
                 let block = document.createElement('div');
                 block.className = 'drag-block';
                 block.id = `drag-${num}-${uIdx}-${i}`;
                 block.style.width = `${pieceWidth}%`;
                 block.style.height = '100%';
                 block.style.backgroundColor = color;
                 block.style.opacity = '0.85';
                 block.draggable = true;
                 block.style.cursor = 'grab';
                 block.style.position = 'relative';
                 block.style.boxSizing = 'border-box';
                 block.style.borderRight = isCommonDenomReady ? '1px solid rgba(255,255,255,0.4)' : 'none';
                 block.style.zIndex = '1';
                 block.setAttribute('data-pieces', 1); 
                 
                 block.ondragstart = (e) => {
                     let dragData = JSON.stringify({ source_num: num, pieces: 1 });
                     e.dataTransfer.setData('text/plain', dragData);
                     setTimeout(() => block.style.opacity = '0.4', 0);
                 };
                 block.ondragend = (e) => {
                     if (block.draggable) block.style.opacity = '0.85';
                 };

                 block.onclick = () => {
                     if (block.draggable) {
                         if (isCommonDenomReady) {
                             if (num === 1) moved1 += 1; else moved2 += 1;
                             mergedBlocks.push({ num: num, pieces: 1 });
                             updateDragDropState(cd);
                         }
                         else triggerErrorMerge();
                     }
                 };

                 if (grid) unit.insertBefore(block, grid);
                 else unit.appendChild(block);
             }
         }
     });
 }

 function renderBar3Draggable(cd) {
     let wrap3 = document.getElementById('bar3-wrap');
     let units = wrap3.querySelectorAll('.bar-unit');
     
     units.forEach(unit => {
         let existingBlocks = unit.querySelectorAll('.drag-block');
         existingBlocks.forEach(b => b.remove());
     });

     bar3BlocksCount = moved1 + moved2;

     let currentUnitIdx = 0;
     let spaceInCurrentUnit = cd;

     for (let i = 0; i < mergedBlocks.length; i++) {
         let mBlock = mergedBlocks[i];
         let piecesRemaining = mBlock.pieces;
         let color = mBlock.num === 1 ? 'var(--red)' : 'var(--blue)';

         while (piecesRemaining > 0) {
             if (currentUnitIdx >= units.length) break; 

             let unit = units[currentUnitIdx];
             let grid = unit.querySelector('.bar-grid');

             let piecesToPlace = Math.min(piecesRemaining, spaceInCurrentUnit);

             let block = document.createElement('div');
             block.className = 'drag-block';
             block.style.width = `${(piecesToPlace / cd) * 100}%`;
             block.style.height = '100%';
             block.style.backgroundColor = color;
             block.style.opacity = '1';
             block.style.borderRight = '1px solid rgba(255,255,255,0.2)';
             block.style.position = 'relative';
             block.style.boxSizing = 'border-box';
             block.style.zIndex = '1';
             block.style.cursor = 'pointer';
             // block.title = '點擊退回原處'; // 移除 title 防止懸停顯示預設文字
             
             let targetIndex = i; 
             block.onclick = () => {
                 let removed = mergedBlocks.splice(targetIndex, 1)[0];
                 if (removed.num === 1) moved1 -= removed.pieces;
                 else moved2 -= removed.pieces;
                 updateDragDropState(cd);
             };

             if (grid) unit.insertBefore(block, grid);
             else unit.appendChild(block);

             piecesRemaining -= piecesToPlace;
             spaceInCurrentUnit -= piecesToPlace;

             if (spaceInCurrentUnit === 0) {
                 currentUnitIdx++;
                 spaceInCurrentUnit = cd;
             }
         }
     }

     renderBar3NumberLine(cd);
     
     const vals = getSafeValues();
     let totalNeeded = (vals.total_n1 * s1) + (vals.total_n2 * s2);
     checkAllDropped(totalNeeded);
 }

 function triggerErrorMerge() {
     let errorRow = document.getElementById('bar-error-row');
     
     errorRow.style.display = 'flex';
     
     errorRow.classList.remove('fade-in-slow');
     void errorRow.offsetWidth; 
     errorRow.classList.add('fade-in-slow');
     
     let wrapError = document.getElementById('bar-error-wrap');
     wrapError.innerHTML = '';
     wrapError.classList.add('continuous'); 
     
     const vals = getSafeValues();
     let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;
     
     for (let i = 0; i < maxW; i++) {
         let unit = document.createElement('div');
         unit.className = 'bar-unit';
         unit.style.display = 'flex';
         unit.style.flexDirection = 'row';
         wrapError.appendChild(unit);
     }

     let labelError = document.getElementById('label-error');
     labelError.innerHTML = `<div style="display:inline-flex; align-items:center;">${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}<span style="margin: 0 5px;">+</span>${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}</div><span style="font-size:0.8rem; color:var(--red); margin-top:5px;">(分母不同，無格線)</span>`;
     
     let nlWrap = document.getElementById('bar-error-nl');
     if (nlWrap) {
         const showNL = document.getElementById('show-nl-cb').checked;
         nlWrap.style.display = showNL ? 'flex' : 'none'; 
         nlWrap.innerHTML = ''; 
         
         let val1 = (vals.w1 * vals.d1 + vals.n1) / vals.d1;
         let val2 = (vals.w2 * vals.d2 + vals.n2) / vals.d2;
         let sumVal = val1 + val2;

         for (let i = 0; i < maxW; i++) {
             let nlUnit = document.createElement('div');
             nlUnit.className = 'nl-unit';
             let labelsHtml = '';

             const addTick = (val, html, isMajor = false, zIndex = 10) => {
                 let leftPct = (val - i) * 100;
                 let tickHeight = isMajor ? '8px' : '6px';
                 labelsHtml += `<div style="position: absolute; left: ${leftPct}%; top: 0px; transform: translateX(-50%); display: flex; align-items: center; justify-content: flex-start; flex-direction: column; z-index: ${zIndex};">
                     <div style="width: 2px; height: ${tickHeight}; background: var(--dark); margin-bottom: 2px;"></div>
                     ${html}
                 </div>`;
             };

             if (i === 0) {
                 addTick(0, `<span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">0</span>`, true, 5);
             }

             addTick(i + 1, `<span style="font-weight:bold; font-size:1.1rem; color:var(--dark);">${i + 1}</span>`, true, 5);

             if (val1 > i && val1 < i + 1) {
                 let f1Html = getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)');
                 addTick(val1, f1Html, false, 10);
             }

             if (sumVal > i && sumVal < i + 1) {
                 let f1Html = getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)');
                 let f2Html = getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)');
                 let sumText = `<div style="display:flex; align-items:center; gap:3px; white-space:nowrap;">${f1Html} <span style="color:var(--dark);">+</span> ${f2Html}</div>`;
                 addTick(sumVal, sumText, false, 10);
             }

             nlUnit.innerHTML = labelsHtml;
             nlWrap.appendChild(nlUnit);
         }
     }

     barErrorModeValue = 0;

     let blocks = document.querySelectorAll('.drag-block');
     blocks.forEach(block => {
         if (block.id && block.id.startsWith('drag-1')) moveToBarErrorMode(block);
     });
     blocks.forEach(block => {
         if (block.id && block.id.startsWith('drag-2')) moveToBarErrorMode(block);
     });
     
     document.getElementById('drag-instruction').innerHTML = `💡 發現了嗎？因為「分母」不相同，無法用相同的格線算出來。<br>請試著在上方的算式點擊「擴分/約分」尋找公共的分母！`;
 }

 function moveToBarErrorMode(block) {
     let num = block.id.split('-')[1]; 
     let cd = num === '1' ? (getSafeValues().d1 * s1) : (getSafeValues().d2 * s2);
     let pieces = parseInt(block.getAttribute('data-pieces')) || 1;
     let blockVal = pieces / cd;

     let remainingValToPlace = blockVal;
     
     while (remainingValToPlace > 0.0001) {
         let targetUnitIdx = Math.floor(barErrorModeValue);
         let currentUnitFilled = barErrorModeValue - targetUnitIdx;
         let spaceInUnit = 1.0 - currentUnitFilled;

         let valToPlaceNow = Math.min(remainingValToPlace, spaceInUnit);
         
         let wrapError = document.getElementById('bar-error-wrap');
         let targetUnit = wrapError.querySelectorAll('.bar-unit')[targetUnitIdx];
         
         if (targetUnit) {
             let pieceNode = document.createElement('div');
             pieceNode.style.width = `${valToPlaceNow * 100}%`;
             pieceNode.style.height = '100%';
             pieceNode.style.backgroundColor = block.style.backgroundColor;
             pieceNode.style.opacity = '1';
             pieceNode.style.borderRight = 'none'; 
             pieceNode.style.position = 'relative';
             pieceNode.style.boxSizing = 'border-box';
             pieceNode.style.zIndex = '1';
             
             targetUnit.appendChild(pieceNode);
         }
         
         barErrorModeValue += valToPlaceNow;
         remainingValToPlace -= valToPlaceNow;
     }
 }

 function setupDragAndDrop(cd1, cd2) {
     let row3 = document.getElementById('bar3-row');
     let wrap3 = document.getElementById('bar3-wrap');
     let wrap1 = document.getElementById('bar1-wrap');
     let wrap2 = document.getElementById('bar2-wrap');
     let wrapError = document.getElementById('bar-error-wrap');
     
     const vals = getSafeValues();
     let maxW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-wholes')) || 1;

     if (isCommonDenomReady) {
         let isFirstShow = row3.style.display !== 'flex';
         row3.style.display = 'flex';
         if (isFirstShow) {
             row3.classList.remove('fade-in-slow');
             void row3.offsetWidth;
             row3.classList.add('fade-in-slow');
         }

         wrap3.style.outline = '3px dashed var(--orange)';
         wrap3.style.backgroundColor = '#fafafa';
         wrap3.innerHTML = '';
         
         const showNL = document.getElementById('show-nl-cb').checked;
         if (showNL) wrap3.classList.add('continuous');
         else wrap3.classList.remove('continuous');
         
         for (let i = 0; i < maxW; i++) {
             let unit = document.createElement('div');
             unit.className = 'bar-unit';
             unit.style.display = 'flex';
             unit.style.flexDirection = 'row';
             let grid = document.createElement('div');
             grid.className = 'bar-grid';
             unit.appendChild(grid);
             wrap3.appendChild(unit);
         }
         
         let label3 = document.getElementById('label3');
         label3.innerHTML = `合併結果<span style="font-size:0.8rem; color:var(--orange); margin-top:5px;">(點擊或拖拉)</span>`;
         wrap3.querySelectorAll('.bar-grid').forEach(gridContainer => {
             applyGridAnimation(gridContainer, cd1, 1, 1, 'none'); 
         });

         moved1 = 0;
         moved2 = 0;
         mergedBlocks = [];
         updateDragDropState(cd1);
         
         wrap3.ondragover = (e) => { 
             e.preventDefault(); 
             wrap3.style.backgroundColor = '#eef9f1';
         };
         wrap3.ondragleave = (e) => {
             wrap3.style.backgroundColor = '#fafafa';
         };
         
         wrap3.ondrop = (e) => {
             e.preventDefault();
             wrap3.style.backgroundColor = '#fafafa';
             
             let rawData = e.dataTransfer.getData('text/plain');
             if (!rawData) return;
             
             try {
                 let data = JSON.parse(rawData);
                 let num = parseInt(data.source_num);
                 let pieces = parseInt(data.pieces);
                 
                 if (isNaN(num) || isNaN(pieces)) return; 
                 
                 if (num === 1) moved1 += pieces;
                 else if (num === 2) moved2 += pieces;
                 else return; 
                 
                 mergedBlocks.push({ num: num, pieces: pieces });
                 updateDragDropState(cd1);
             } catch(err) {
                 console.error("Drop Data Error:", err);
             }
         };
         
         wrap1.ondragover = null; wrap1.ondrop = null; wrap1.ondragleave = null;
         wrap2.ondragover = null; wrap2.ondrop = null; wrap2.ondragleave = null;
         if (wrapError) {
             wrapError.ondragover = null; wrapError.ondrop = null; wrapError.ondragleave = null;
         }

     } else {
         row3.style.display = 'none'; 
         convertBarToDraggable(1, cd1, 'var(--red)', 0);
         convertBarToDraggable(2, cd2, 'var(--blue)', 0);

         let dragOverHandler = (e) => { e.preventDefault(); e.currentTarget.style.opacity = '0.7'; };
         let dragLeaveHandler = (e) => { e.currentTarget.style.opacity = '1'; };
         let dropHandler = (e) => {
             e.preventDefault();
             e.currentTarget.style.opacity = '1';
             triggerErrorMerge();
         };

         wrap1.ondragover = dragOverHandler; wrap1.ondragleave = dragLeaveHandler; wrap1.ondrop = dropHandler;
         wrap2.ondragover = dragOverHandler; wrap2.ondragleave = dragLeaveHandler; wrap2.ondrop = dropHandler;
         
         if (wrapError) {
             wrapError.ondragover = dragOverHandler; 
             wrapError.ondragleave = dragLeaveHandler; 
             wrapError.ondrop = dropHandler;
         }
     }
 }

function checkAllDropped(totalNeeded) {
     if (!isCommonDenomReady) return;

     if (bar3BlocksCount === totalNeeded && totalNeeded !== 0) {
         const vals = getSafeValues();
         let cd1 = vals.d1 * s1;
         
         // 顯示作答區
         document.getElementById('bottom-answer-zone').style.display = 'flex';
         setTimeout(() => { document.getElementById('bottom-answer-zone').style.opacity = '1'; }, 50);
         
         document.getElementById('bot-frac1').innerHTML = getDisplayHtml(vals.w1, vals.n1 * s1, cd1, 'var(--red)');
         document.getElementById('bot-frac2').innerHTML = getDisplayHtml(vals.w2, vals.n2 * s2, cd1, 'var(--blue)');
         
         document.getElementById('bar3-wrap').style.outline = '3px solid transparent';

         const exactN = (vals.total_n1 * vals.d2) + (vals.total_n2 * vals.d1);
         const exactD = vals.d1 * vals.d2;
         
         let hint = "";
         if (exactN >= exactD) {
             document.getElementById('ans-w').style.display = 'inline-block';
             hint = " (可填帶分數或假分數)";
         } else {
             document.getElementById('ans-w').style.display = 'none';
             document.getElementById('ans-w').value = '';
         }

         document.getElementById('bot-public-unit').innerHTML = `💡 公共分數單位為： <b style="display:inline-flex; align-items:center; vertical-align:middle;">${getFracHtml(1, cd1, 'var(--dark)')}</b>`;
         document.getElementById('drag-instruction').innerHTML = `💡 太棒了！全部合併完成，請填寫下方最終答案！${hint}`;

         // ================================================================
         // 👇 核心修改：漸漸消失 -> 移除空間 -> 鎖定結果不可修改 👇
         // ================================================================
         const bar1Row = document.getElementById('bar1-row');
         const bar2Row = document.getElementById('bar2-row');
         const bar3Wrap = document.getElementById('bar3-wrap');
         const errorWrap = document.getElementById('bar-error-wrap');

         // 1. 鎖定合併結果區與錯誤區，使其不可再被點擊或修改
         if (bar3Wrap) bar3Wrap.style.pointerEvents = 'none';
         if (errorWrap) errorWrap.style.pointerEvents = 'none';

         // 2. 讓原本的分數列漸漸消失，並在 0.8 秒後釋放空間
         [bar1Row, bar2Row].forEach(row => {
             if (row) {
                 row.classList.remove('fade-in-slow'); // 移除原本的 CSS 動畫限制
                 row.style.transition = 'opacity 0.8s ease-in-out';
                 row.style.opacity = '0';
                 row.style.pointerEvents = 'none'; // 立即禁止操作

                 // 重要：等淡出動畫跑完後，將 display 設為 none 以釋放空間
                 setTimeout(() => {
                     row.style.display = 'none';
                 }, 800); 
             }
         });
         // ================================================================
         // 👆 修改結束 👆
         // ================================================================

     } else {
         // 原有的未完成邏輯
         document.getElementById('bar3-wrap').style.outline = '3px dashed var(--orange)';
         document.getElementById('bottom-answer-zone').style.opacity = '0';
         setTimeout(() => { 
             if (bar3BlocksCount !== totalNeeded) {
                 document.getElementById('bottom-answer-zone').style.display = 'none'; 
             }
         }, 300);
         document.getElementById('drag-instruction').innerHTML = `💡 分母相同了！請將上方的色塊「拖拉」或「點擊」到下方合併結果區。`;
     }
 }

 function checkCommonDenom() {
     if (!bar1Visible || !bar2Visible) return;
     const vals = getSafeValues();
     let cd1 = vals.d1 * s1;
     let cd2 = vals.d2 * s2;

     isCommonDenomReady = (cd1 === cd2 && cd1 > 0);

     setupDragAndDrop(cd1, cd2);

     document.getElementById('bottom-answer-zone').style.opacity = '0';
     setTimeout(() => { document.getElementById('bottom-answer-zone').style.display = 'none'; }, 300);

     if (isCommonDenomReady) {
         document.getElementById('drag-instruction').innerHTML = `💡 分母相同了！請將上方的色塊「拖拉」或「點擊」到下方合併結果區。`;
     } else {
         let errorRow = document.getElementById('bar-error-row');
         if (errorRow && errorRow.style.display === 'flex') {
             document.getElementById('drag-instruction').innerHTML = `💡 發現了嗎？因為「分母」不相同，無法用相同的格線算出來。<br>請試著在上方的算式點擊「擴分/約分」尋找公共的分母！`;
         } else {
             document.getElementById('drag-instruction').innerHTML = `💡 試著將兩條長條圖拖拉在一起合併，看看會發生什麼事？（或點擊「擴/約分」讓分母相同）`;
         }
     }
 }

 function updateUI() {
     enforceInputLimits();
     updateMaxWholes(); 
     const vals = getSafeValues();
     
     s1 = 1; s2 = 1;
     bar1Visible = false; bar2Visible = false;
     isCommonDenomReady = false;
     moved1 = 0; 
     moved2 = 0; 
     mergedBlocks = [];

     let wpEl = document.getElementById('word-problem');
     if (currentWordProblemTemplate) {
         let frac1Html = `<b>${getDisplayHtml(vals.w1, vals.n1, vals.d1, 'var(--red)')}</b>`;
         let frac2Html = `<b>${getDisplayHtml(vals.w2, vals.n2, vals.d2, 'var(--blue)')}</b>`;
         wpEl.innerHTML = currentWordProblemTemplate.replace(/\[FRAC1\]/g, frac1Html).replace(/\[FRAC2\]/g, frac2Html);
         wpEl.style.display = 'block';
     } else {
         wpEl.style.display = 'none';
     }
     
     document.getElementById('ans-w').value = ''; 
     document.getElementById('ans-w').style.display = 'none'; 
     document.getElementById('ans-num').value = ''; 
     document.getElementById('ans-den').value = '';
     document.getElementById('feedback').style.opacity = '0';
     document.getElementById('bottom-answer-zone').style.display = 'none';
     document.getElementById('bottom-answer-zone').style.opacity = '0';
     
     const animArea = document.getElementById('anim-area');
     animArea.innerHTML = `
         <div id="bar1-row" style="display:none; position:relative; width:100%; min-height:80px; align-items:center; justify-content:space-between;">
             <div id="label1" style="width:15%; text-align:center;"></div>
             <div class="bars-column">
                 <div id="bar1-wrap" class="bar-wrap-container"></div>
                 <div id="bar1-nl" class="nl-wrap-container" style="display:none;"></div>
             </div>
             <div style="width:15%; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                 <button class="tool-btn" onclick="applyTool(1, 'expand')">➕ 擴分</button>
                 <button class="tool-btn" onclick="applyTool(1, 'simplify')">➖ 約分</button>
             </div>
         </div>
         <div id="bar2-row" style="display:none; position:relative; width:100%; min-height:80px; align-items:center; justify-content:space-between;">
             <div id="label2" style="width:15%; text-align:center;"></div>
             <div class="bars-column">
                 <div id="bar2-wrap" class="bar-wrap-container"></div>
                 <div id="bar2-nl" class="nl-wrap-container" style="display:none;"></div>
             </div>
             <div style="width:15%; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                 <button class="tool-btn" onclick="applyTool(2, 'expand')">➕ 擴分</button>
                 <button class="tool-btn" onclick="applyTool(2, 'simplify')">➖ 約分</button>
             </div>
         </div>

         <div id="bar-error-row" style="display:none; position:relative; width:100%; min-height:80px; align-items:center; justify-content:space-between; margin-top: 10px; padding-top: 15px; border-top: 2px dashed #ccc;">
             <div id="label-error" style="width:15%; text-align:center; font-weight:bold; color:var(--dark); font-size:1.1rem; display:flex; flex-direction:column; align-items:center;">
                 未通分合併
             </div>
             <div class="bars-column">
                 <div id="bar-error-wrap" class="bar-wrap-container droppable-area" style="min-height: 50px; outline: 3px dashed var(--red); background-color: #fafafa; border-radius: 4px;"></div>
                 <div id="bar-error-nl" class="nl-wrap-container continuous" style="display:none;"></div>
             </div>
             <div style="width:15%;"></div>
         </div>
         
         <div id="bar3-row" style="display:none; position:relative; width:100%; min-height:80px; align-items:center; justify-content:space-between; margin-top: 10px; padding-top: 15px; border-top: 2px dashed #ccc;">
             <div id="label3" style="width:15%; text-align:center; font-weight:bold; color:var(--dark); font-size:1.1rem; display:flex; flex-direction:column; align-items:center;">
                 合併結果
                 <span style="font-size:0.8rem; color:var(--orange); margin-top:5px;">(點擊或拖拉)</span>
             </div>
             <div class="bars-column">
                 <div id="bar3-wrap" class="bar-wrap-container droppable-area" style="min-height: 50px; outline: 3px dashed var(--orange); outline-offset: 4px; border-radius: 4px; transition: 0.3s;"></div>
                 <div id="bar3-nl" class="nl-wrap-container" style="display:none;"></div>
             </div>
             <div style="width:15%;"></div>
         </div>
     `;
     
     renderBar(1, 'none');
     renderBar(2, 'none');
     document.getElementById('drag-instruction').innerHTML = `💡 點擊上方分數，顯示圖形！`;
     resetInactivityTimer(); // 重置待機教學計時器
 }

 function randomChallenge() {
     let d1 = Math.floor(Math.random() * 5) + 3; 
     let d2 = Math.floor(Math.random() * 5) + 3; 
     while(d2 === d1) { d2 = Math.floor(Math.random() * 5) + 3; }
     
     let n1 = Math.floor(Math.random() * (d1 * 2)) + 1; 
     let n2 = Math.floor(Math.random() * d2) + 1; 
     
     let w1 = '';
     let w2 = '';

     const showWhole = document.getElementById('show-whole-cb').checked;
     if (showWhole && Math.random() > 0.5 && n1 >= d1) {
         w1 = Math.floor(n1 / d1);
         n1 = n1 % d1;
         if (n1 === 0) n1 = 1; 
     }

     document.getElementById('w1').value = w1; 
     document.getElementById('n1').value = n1; 
     document.getElementById('d1').value = d1;
     document.getElementById('w2').value = w2; 
     document.getElementById('n2').value = n2; 
     document.getElementById('d2').value = d2;
     
     currentWordProblemTemplate = wordProblemTemplates[Math.floor(Math.random() * wordProblemTemplates.length)];
     updateUI();
 }

 function autoCheck() {
     const vals = getSafeValues();
     const ansWStr = document.getElementById('ans-w').value;
     const ansNStr = document.getElementById('ans-num').value;
     const ansDStr = document.getElementById('ans-den').value;

     const ansW = parseInt(ansWStr) || 0;
     let ansN = parseInt(ansNStr);
     let ansD = parseInt(ansDStr);

     if (ansNStr === "" && ansDStr === "") {
         ansN = 0;
         ansD = 1;
     }

     const fb = document.getElementById('feedback');

     if (!isNaN(ansN) && !isNaN(ansD) && ansD !== 0) {
         const userTotalN = ansW * ansD + ansN;
         const userVal = userTotalN / ansD;

         const exactN = (vals.total_n1 * vals.d2) + (vals.total_n2 * vals.d1);
         const exactD = vals.d1 * vals.d2;
         const exactVal = exactN / exactD;

         const divisor = gcd(exactN, exactD);
         const simpleImproperN = exactN / divisor;
         const simpleD = exactD / divisor;

         const simpleW = Math.floor(simpleImproperN / simpleD);
         const simpleMixedN = simpleImproperN % simpleD;

         let currentD = vals.d1 * s1;
         let LcmD = lcm(vals.d1, vals.d2);

         if (Math.abs(userVal - exactVal) < 0.0001) {
             let msg = "";
             let isSimplest = false;

             if (ansW === 0 && ansN === simpleImproperN && ansD === simpleD) isSimplest = true;
             if (ansW === simpleW && ansN === simpleMixedN && ansD === simpleD) isSimplest = true;
             if (ansN === 0 && ansW === simpleW && simpleMixedN === 0) isSimplest = true;

             if (isSimplest) {
                 msg = '🎉 完全正確！而且已經是最簡化的答案了！';
             } else {
                 msg = '🌟 答對了數值！但試試看，這個答案可以再「約分」或「轉成帶分數」喔！';
             }
             
             if (currentD !== LcmD) {
                 msg += '<br><span style="color:var(--orange); font-size:1rem; font-weight:normal;">（提示：你通分時使用的分母不是最小公倍數喔！雖然算得對，但數字會比較大。）</span>';
             }

             fb.style.opacity = '1'; fb.style.color = 'var(--success)'; 
             fb.innerHTML = msg;
         } else { 
             fb.style.opacity = '1'; fb.style.color = 'var(--red)'; 
             fb.innerText = '👀 答案不對喔，再檢查一下整數和分子相加的結果！'; 
         }
     } else { fb.style.opacity = '0'; }
 }

 window.onload = () => {
     updateSpeed(); 
     toggleWholeNumber(); 
     updateUI();
     resetInactivityTimer(); // 啟動待機偵測
 };
