(() => {
  const config = window.SUPABASE_CONFIG || {};
  const tripId = config.tripId || 'seoul-busan-2026';
  const localDraftKey = `tripSharedDraft:${tripId}`;
  let client = null;
  let channel = null;
  let editMode = false;
  let applyingRemote = false;
  let saveTimer = null;
  let lastWrittenAt = '';

  const originalRenderItinerary = window.renderItinerary;

  function statusMarkup() {
    return '<span class="cloud-status-dot"></span><span class="cloud-status-text">僅此裝置</span>';
  }

  function installToolbars() {
    const tripHead = document.querySelector('#trip .page-head');
    if (tripHead && !document.getElementById('tripCloudToolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'tripCloudToolbar';
      toolbar.className = 'cloud-toolbar';
      toolbar.innerHTML = `<div class="cloud-status" data-cloud-status>${statusMarkup()}</div><div class="cloud-toolbar-actions"><button class="cloud-edit-btn secondary" id="addTripDay" type="button" hidden>＋ 新增一天</button><button class="cloud-edit-btn" id="itineraryEditToggle" type="button">編輯行程</button></div>`;
      tripHead.appendChild(toolbar);
      document.getElementById('itineraryEditToggle').addEventListener('click', toggleItineraryEdit);
      document.getElementById('addTripDay').addEventListener('click', addTripDay);
    }

    const prepHead = document.querySelector('#prep .page-head');
    if (prepHead && !document.getElementById('prepCloudToolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'prepCloudToolbar';
      toolbar.className = 'cloud-toolbar';
      toolbar.innerHTML = `<div class="cloud-status" data-cloud-status>${statusMarkup()}</div><div class="cloud-toolbar-actions"><span class="sub">共同清單</span></div>`;
      const segmented = prepHead.querySelector('.prep-segments');
      segmented ? segmented.insertAdjacentElement('afterend', toolbar) : prepHead.appendChild(toolbar);
    }
  }

  function setStatus(mode, text) {
    document.querySelectorAll('[data-cloud-status]').forEach(el => {
      el.classList.remove('online', 'syncing', 'error');
      if (mode) el.classList.add(mode);
      const label = el.querySelector('.cloud-status-text');
      if (label) label.textContent = text;
    });
  }

  function snapshot() {
    return {
      trip_id: tripId,
      itinerary: clone(itinerary),
      bookings: clone(state.bookings),
      packing: clone(state.packing),
      entry_tasks: clone(state.entry),
      updated_at: new Date().toISOString()
    };
  }

  function saveLocalDraft() {
    try {
      localStorage.setItem(localDraftKey, JSON.stringify(snapshot()));
    } catch {}
  }

  function restoreLocalDraft() {
    try {
      const raw = localStorage.getItem(localDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Array.isArray(draft.itinerary)) itinerary.splice(0, itinerary.length, ...clone(draft.itinerary));
      if (Array.isArray(draft.bookings)) state.bookings = clone(draft.bookings);
      if (Array.isArray(draft.packing)) state.packing = clone(draft.packing);
      if (Array.isArray(draft.entry_tasks)) state.entry = clone(draft.entry_tasks);
      save();
    } catch {}
  }

  function applyRemote(row) {
    if (!row) return;
    applyingRemote = true;
    try {
      if (Array.isArray(row.itinerary)) itinerary.splice(0, itinerary.length, ...clone(row.itinerary));
      if (Array.isArray(row.bookings)) state.bookings = clone(row.bookings);
      if (Array.isArray(row.packing)) state.packing = clone(row.packing);
      if (Array.isArray(row.entry_tasks)) state.entry = clone(row.entry_tasks);
      if (selectedDay >= itinerary.length) selectedDay = Math.max(0, itinerary.length - 1);
      save();
      saveLocalDraft();
      window.renderItinerary();
      renderPrep();
    } finally {
      applyingRemote = false;
    }
  }

  async function pushCloud() {
    if (!client || applyingRemote) return;
    const data = snapshot();
    lastWrittenAt = data.updated_at;
    setStatus('syncing', '正在同步…');
    const { error } = await client.from('trip_shared_state').upsert(data, { onConflict: 'trip_id' });
    if (error) {
      console.error('Cloud sync failed:', error);
      setStatus('error', '同步失敗，已保留在此裝置');
      return;
    }
    setStatus('online', '雲端已同步');
  }

  function scheduleCloudSave() {
    saveLocalDraft();
    if (!client || applyingRemote) return;
    clearTimeout(saveTimer);
    setStatus('syncing', '等待同步…');
    saveTimer = setTimeout(pushCloud, 650);
  }

  function wrapChecklistFunction(name) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const result = original.apply(this, args);
      scheduleCloudSave();
      return result;
    };
  }

  function installChecklistHooks() {
    ['toggleNote', 'renameNote', 'insertAfter', 'removeEmpty', 'appendBooking', 'appendEntryTask', 'appendPacking'].forEach(wrapChecklistFunction);
  }

  function toggleItineraryEdit() {
    editMode = !editMode;
    if (tripView !== 'itinerary') switchTripView('itinerary');
    const toggle = document.getElementById('itineraryEditToggle');
    const addDay = document.getElementById('addTripDay');
    toggle.textContent = editMode ? '完成編輯' : '編輯行程';
    toggle.classList.toggle('secondary', editMode);
    addDay.hidden = !editMode;
    window.renderItinerary();
  }

  function field(label, value, attrs = '') {
    return `<label class="cloud-field"><span>${label}</span><input ${attrs} value="${escapeHtml(value || '')}"></label>`;
  }

  function textareaField(label, value, attrs = '') {
    return `<label class="cloud-field full"><span>${label}</span><textarea ${attrs}>${escapeHtml(value || '')}</textarea></label>`;
  }

  function renderEditableItinerary() {
    const dayChips = document.getElementById('dayChips');
    const timeline = document.getElementById('timeline');
    dayChips.innerHTML = itinerary.map((day, index) => `<button type="button" class="chip ${index === selectedDay ? 'active' : ''}" data-cloud-day="${index}">${escapeHtml(day.date || '日期')} ${escapeHtml((day.title || '').split('・')[0])}</button>`).join('');
    dayChips.querySelectorAll('[data-cloud-day]').forEach(button => button.addEventListener('click', () => {
      selectedDay = Number(button.dataset.cloudDay);
      renderEditableItinerary();
    }));

    const day = itinerary[selectedDay];
    if (!day) {
      timeline.innerHTML = '<div class="cloud-empty">尚未建立行程。請點「新增一天」。</div>';
      return;
    }

    const events = Array.isArray(day.events) ? day.events : (day.events = []);
    timeline.innerHTML = `
      <div class="editable-day">
        ${field('日期', day.date, `oninput="cloudUpdateDay('date',this.value)"`)}
        ${field('當日標題', day.title, `oninput="cloudUpdateDay('title',this.value)"`)}
      </div>
      ${events.map((event, index) => `
        <article class="editable-event">
          <div class="editable-event-grid">
            ${field('時間', event.time, `oninput="cloudUpdateEvent(${index},'time',this.value)"`)}
            ${field('行程名稱', event.title, `oninput="cloudUpdateEvent(${index},'title',this.value)"`)}
            ${textareaField('註解／交通', event.detail, `oninput="cloudUpdateEvent(${index},'detail',this.value)"`)}
            ${textareaField('地鐵出口', event.exit, `oninput="cloudUpdateEvent(${index},'exit',this.value)"`)}
            ${field('狀態標籤', event.status, `oninput="cloudUpdateEvent(${index},'status',this.value)"`)}
            ${field('地圖搜尋名稱', event.map, `oninput="cloudUpdateEvent(${index},'map',this.value)"`)}
            ${textareaField('NAVER 連結（選填）', event.naver, `oninput="cloudUpdateEvent(${index},'naver',this.value)"`)}
          </div>
          <div class="editable-event-actions"><button class="delete-event" type="button" onclick="cloudDeleteEvent(${index})">刪除此行程</button></div>
        </article>`).join('')}
      <button class="add-event-button" type="button" onclick="cloudAddEvent()">＋ 新增行程</button>
      ${itinerary.length > 1 ? '<button class="add-day-button delete-event" type="button" onclick="cloudDeleteCurrentDay()">刪除這一天</button>' : ''}`;
  }

  window.renderItinerary = function () {
    if (editMode) renderEditableItinerary();
    else originalRenderItinerary();
  };

  window.cloudUpdateDay = function (key, value) {
    const day = itinerary[selectedDay];
    if (!day) return;
    day[key] = value;
    scheduleCloudSave();
  };

  window.cloudUpdateEvent = function (index, key, value) {
    const event = itinerary[selectedDay]?.events?.[index];
    if (!event) return;
    event[key] = value;
    scheduleCloudSave();
  };

  window.cloudAddEvent = function () {
    const day = itinerary[selectedDay];
    if (!day) return;
    if (!Array.isArray(day.events)) day.events = [];
    day.events.push({ time: '', title: '新行程', detail: '', exit: '', status: '', map: '', naver: '' });
    scheduleCloudSave();
    renderEditableItinerary();
  };

  window.cloudDeleteEvent = function (index) {
    const day = itinerary[selectedDay];
    if (!day || !Array.isArray(day.events)) return;
    if (!confirm('確定刪除這個行程？')) return;
    day.events.splice(index, 1);
    scheduleCloudSave();
    renderEditableItinerary();
  };

  function addTripDay() {
    itinerary.push({ date: '', title: '新的一天', events: [] });
    selectedDay = itinerary.length - 1;
    scheduleCloudSave();
    renderEditableItinerary();
  }

  window.cloudDeleteCurrentDay = function () {
    if (itinerary.length <= 1 || !confirm('確定刪除這一天和其中所有行程？')) return;
    itinerary.splice(selectedDay, 1);
    selectedDay = Math.max(0, selectedDay - 1);
    scheduleCloudSave();
    renderEditableItinerary();
  };

  async function initializeCloud() {
    const hasConfig = Boolean(config.url && config.publishableKey);
    if (!hasConfig || !window.supabase?.createClient) {
      setStatus('', '僅此裝置（雲端待設定）');
      return;
    }

    try {
      client = window.supabase.createClient(config.url, config.publishableKey);
      setStatus('syncing', '連接雲端…');
      const { data, error } = await client.from('trip_shared_state').select('*').eq('trip_id', tripId).maybeSingle();
      if (error) throw error;
      if (data) {
        applyRemote(data);
      } else {
        await pushCloud();
      }

      channel = client.channel(`trip-${tripId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_shared_state', filter: `trip_id=eq.${tripId}` }, payload => {
          const row = payload.new;
          if (!row || row.updated_at === lastWrittenAt) return;
          applyRemote(row);
          setStatus('online', '收到最新共同編輯');
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') setStatus('online', '雲端已同步');
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setStatus('error', '即時連線中斷');
        });
    } catch (error) {
      console.error('Cloud initialization failed:', error);
      client = null;
      setStatus('error', '雲端尚未完成設定');
    }
  }

  restoreLocalDraft();
  installToolbars();
  installChecklistHooks();
  window.renderItinerary();
  renderPrep();
  initializeCloud();

  window.addEventListener('beforeunload', () => {
    saveLocalDraft();
    if (channel && client) client.removeChannel(channel);
  });
})();
