// iOS Chinese IME safeguard: do not sync or re-render while Zhuyin is composing.
(() => {
  const editableSelector = '.note-input, .cloud-field input, .cloud-field textarea';
  let composing = false;
  let pendingPrepRender = false;
  let pendingItineraryRender = false;

  const isEditable = target => target instanceof Element && target.matches(editableSelector);
  const hasActiveEditor = () => composing || isEditable(document.activeElement);

  const originalRenderPrep = window.renderPrep;
  if (typeof originalRenderPrep === 'function') {
    window.renderPrep = function (...args) {
      if (hasActiveEditor()) {
        pendingPrepRender = true;
        return;
      }
      pendingPrepRender = false;
      return originalRenderPrep.apply(this, args);
    };
  }

  const originalRenderItinerary = window.renderItinerary;
  if (typeof originalRenderItinerary === 'function') {
    window.renderItinerary = function (...args) {
      if (hasActiveEditor()) {
        pendingItineraryRender = true;
        return;
      }
      pendingItineraryRender = false;
      return originalRenderItinerary.apply(this, args);
    };
  }

  function flushDeferredRenders() {
    if (hasActiveEditor()) return;
    if (pendingPrepRender && typeof originalRenderPrep === 'function') {
      pendingPrepRender = false;
      originalRenderPrep();
    }
    if (pendingItineraryRender && typeof originalRenderItinerary === 'function') {
      pendingItineraryRender = false;
      originalRenderItinerary();
    }
  }

  document.addEventListener('compositionstart', event => {
    if (!isEditable(event.target)) return;
    composing = true;
    event.target.dataset.imeComposing = 'true';
  }, true);

  // Inline oninput handlers trigger cloud writes. Block only unfinished
  // composition events; the visible text remains in the native input element.
  document.addEventListener('input', event => {
    if (!isEditable(event.target)) return;
    if (event.isComposing || event.target.dataset.imeComposing === 'true') {
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('compositionend', event => {
    if (!isEditable(event.target)) return;
    delete event.target.dataset.imeComposing;
    composing = false;

    // Safari does not consistently fire a final input event after
    // compositionend, so dispatch one after the selected text exists.
    const target = event.target;
    setTimeout(() => {
      if (!target.isConnected) return;
      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }, 0);
  }, true);

  document.addEventListener('focusout', event => {
    if (!isEditable(event.target)) return;
    setTimeout(flushDeferredRenders, 180);
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushDeferredRenders();
  });

  // Load the one-time shared itinerary update after the app and cloud client
  // are ready. The migration is revision-tagged, so later front-end edits are
  // not repeatedly overwritten.
  if (!document.querySelector('script[data-day84-migration]')) {
    const migration = document.createElement('script');
    migration.src = 'day84-migration.js';
    migration.dataset.day84Migration = 'true';
    document.body.appendChild(migration);
  }
})();

// Entry and boarding information is reference material, not a checklist.
// Render it as responsive guide cards so long Traditional Chinese text wraps on mobile.
(() => {
  const groups = [
    {
      icon: '🛂',
      title: '入境申報',
      items: [
        ['確認護照資料', '檢查護照效期，並確認機票、住宿預訂上的英文姓名與護照完全相同。'],
        ['K-ETA', '目前台灣護照旅客適用 2026 年暫時免申請安排；出發前仍可再確認最新規定。'],
        ['e-Arrival Card', '抵達韓國前 3 天內免費填寫，準備護照、Email、去回程航班，以及首晚住宿地址與電話。'],
        ['完成後保存', '填寫完成後，將確認畫面或申報編號截圖存到手機，入境時較方便查找。']
      ],
      actions: [
        ['填寫 e-Arrival Card', 'https://www.e-arrivalcard.go.kr/portal/main/index.do', 'primary']
      ]
    },
    {
      icon: '✈️',
      title: '航空報到',
      items: [
        ['真航空 LJ734', '7/29 起確認是否開放網路報到；若無法取得行動登機證，直接到桃園機場櫃檯辦理即可。'],
        ['中華航空 CI187', '8/2 20:00 起嘗試預辦登機，完成後將登機證儲存在手機中。'],
        ['重要資料', '將航班、訂位代碼、兩間飯店的韓文地址與聯絡電話集中存放，離線時也能查看。']
      ],
      actions: []
    },
    {
      icon: '🇰🇷',
      title: '抵達韓國後',
      items: [
        ['SES 自動通關', '抵達仁川後可依現場資格與櫃檯指示詢問註冊；這不是出發前在線上完成的程序。'],
        ['交通與翻譯 App', '出發前下載或更新 Papago、NAVER Map、Kakao T，以及真航空與中華航空 App。'],
        ['飯店資料', '將 Hotel The Botanik Sewoon 與廣安里 Hotel 1 的韓文地址和電話存到手機。']
      ],
      actions: [
        ['查看 SES', 'https://www.ses.go.kr/', 'white']
      ]
    }
  ];

  function injectEntryGuideStyles() {
    if (document.getElementById('entryGuideStyles')) return;
    const style = document.createElement('style');
    style.id = 'entryGuideStyles';
    style.textContent = `
      .entry-guide{display:grid;gap:14px;min-width:0}
      .entry-guide-card{padding:18px;min-width:0;overflow:hidden}
      .entry-guide-heading{display:flex;align-items:center;gap:10px;margin-bottom:14px}
      .entry-guide-heading span{font-size:1.35rem;line-height:1}
      .entry-guide-heading h3{margin:0;font-size:1.08rem}
      .entry-guide-list{display:grid;gap:0}
      .entry-guide-item{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;padding:13px 0;border-top:1px solid #e8eef3;min-width:0}
      .entry-guide-item:first-child{border-top:0;padding-top:2px}
      .entry-guide-number{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--mist);color:var(--navy);font-size:.72rem;font-weight:700;margin-top:2px}
      .entry-guide-copy{min-width:0}
      .entry-guide-copy strong{display:block;margin-bottom:4px;font-size:.92rem}
      .entry-guide-copy p{margin:0;color:var(--muted);font-size:.82rem;line-height:1.75;white-space:normal;overflow-wrap:anywhere;word-break:normal}
      .entry-guide-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
      .entry-guide-actions .btn{min-width:0;text-align:center}
      body.mom .entry-guide-heading h3{font-size:1.28rem}
      body.mom .entry-guide-copy strong{font-size:1.08rem}
      body.mom .entry-guide-copy p{font-size:1rem}
      @media(max-width:430px){
        .entry-guide-card{padding:16px 15px}
        .entry-guide-item{grid-template-columns:25px minmax(0,1fr);gap:9px}
        .entry-guide-actions{display:grid;grid-template-columns:1fr}
        .entry-guide-actions .btn{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function renderEntryGuide() {
    const panel = document.getElementById('entryPanel');
    if (!panel) return;
    panel.innerHTML = `<div class="entry-guide">${groups.map(group => `
      <article class="card entry-guide-card">
        <div class="entry-guide-heading"><span>${group.icon}</span><h3 class="serif">${group.title}</h3></div>
        <div class="entry-guide-list">${group.items.map((item, index) => `
          <div class="entry-guide-item">
            <span class="entry-guide-number">${index + 1}</span>
            <div class="entry-guide-copy"><strong>${item[0]}</strong><p>${item[1]}</p></div>
          </div>`).join('')}</div>
        ${group.actions.length ? `<div class="entry-guide-actions">${group.actions.map(action => `<a class="btn ${action[2]}" href="${action[1]}" target="_blank" rel="noopener">${action[0]}</a>`).join('')}</div>` : ''}
      </article>`).join('')}</div>`;
  }

  injectEntryGuideStyles();

  // Replace the original checklist renderer while preserving the existing
  // IME-safe render wrapper and cloud updates for the other two checklists.
  window.renderEntry = renderEntryGuide;
  const previousRenderPrep = window.renderPrep;
  if (typeof previousRenderPrep === 'function') {
    window.renderPrep = function (...args) {
      const result = previousRenderPrep.apply(this, args);
      const all = [...state.bookings, ...state.packing];
      const done = all.filter(item => item.done).length;
      const progress = document.getElementById('prepProgress');
      if (progress) progress.textContent = `${done}/${all.length}`;
      renderEntryGuide();
      return result;
    };
  }

  renderEntryGuide();
  window.renderPrep?.();
})();