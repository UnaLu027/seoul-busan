// One-time shared update for the 2026/08/04 itinerary.
(() => {
  const REVISION = '2026-07-21-day84-v1';
  const patch = {
    date: '8/4',
    title: '廣安里・西面醫美・返台',
    revision: REVISION,
    events: [
      {
        time: '07:30–08:00',
        title: 'Hotel 1 Check-out・整理行李',
        detail: '退房後帶行李出發；請先向 Genius 西面店確認是否能寄放行李。',
        map: 'Gwangalli Hotel 1'
      },
      {
        time: '08:00–09:00',
        title: 'All Sunday Bagel 早餐',
        detail: '先吃貝果；若現場需要候位，與 Working Holiday 的順序可互換。',
        map: 'All Sunday Bagel Gwangalli'
      },
      {
        time: '09:00–10:00',
        title: 'Working Holiday 海景咖啡',
        detail: '早餐後在廣安里海景咖啡廳休息。',
        map: 'Working Holiday Gwangalli Busan'
      },
      {
        time: '10:00–10:30',
        title: '廣安里 → Genius 西面店',
        detail: '帶行李建議直接搭計程車前往。',
        map: '지니어스의원 부산'
      },
      {
        time: '10:30–13:30',
        title: 'Genius 西面店醫美',
        detail: '지니어스의원｜부산광역시 부산진구 중앙대로691번길 5, 천우빌딩 3층',
        status: '已安排',
        map: '지니어스의원 부산'
      },
      {
        time: '13:30–15:30',
        title: 'Ilhwa Jeongyeontan 八爪魚・西面午餐',
        detail: '부산광역시 부산진구 부전동 158-9',
        map: '부산광역시 부산진구 부전동 158-9',
        naver: 'https://naver.me/5JqTQtmz'
      },
      {
        time: '15:30–17:00',
        title: '廣安里逛街・Kitty 蛋糕',
        detail: '時間包含從西面移動。必去 Soteu Kitty 蛋糕，並順逛 LOYBE store、Presenthing by ADOR、粉紅家；順序依現場彈性調整。',
        map: 'Gwangalli Beach Busan',
        naver: 'https://naver.me/GM3jv5WL'
      },
      {
        time: '17:00–18:00',
        title: '廣安里 → 金海國際機場',
        detail: '帶行李直接搭計程車，前往金海機場第一航廈。',
        map: 'Gimhae International Airport Terminal 1'
      },
      {
        time: '18:00–20:00',
        title: '機場報到・托運・安檢',
        detail: '預留退稅、托運行李與安檢時間。',
        map: 'Gimhae International Airport Terminal 1'
      },
      {
        time: '20:00–21:20',
        title: '中華航空 CI187｜釜山 PUS T1 → 桃園 TPE T1',
        detail: '托運 23 kg × 2 件／人＋手提行李。',
        status: '已購票'
      }
    ]
  };

  const clonePatch = () => JSON.parse(JSON.stringify(patch));

  function upsertPlace(district, place) {
    if (!window.places) return;
    if (!Array.isArray(places[district])) places[district] = [];
    const list = places[district];
    const index = list.findIndex(item => item.naver === place.naver || item.name === place.name);
    if (index >= 0) list[index] = place;
    else list.push(place);
  }

  function addBusanPlaces() {
    if (!window.P || !window.places) return;
    upsertPlace('西面', P('Genius 西面店','醫美','已安排 8/4 進行醫美療程。','부산광역시 부산진구 중앙대로691번길 5 천우빌딩 3층','','지니어스의원 부산'));
    upsertPlace('西面', P('Ilhwa Jeongyeontan 八爪魚','餐廳','西面八爪魚午餐，安排在醫美後。','부산광역시 부산진구 부전동 158-9','https://naver.me/5JqTQtmz'));
    upsertPlace('廣安里', P('All Sunday Bagel','麵包','廣安里海景貝果店，安排為 8/4 早餐。','부산광역시 수영구 광안로61번길 28 1층','','All Sunday Bagel Gwangalli'));
    upsertPlace('廣安里', P('Soteu｜Kitty 蛋糕','甜點','8/4 廣安里必去的 Kitty 蛋糕店。','부산광역시 수영구 광안동 148-45','https://naver.me/GM3jv5WL'));
    upsertPlace('廣安里', P('LOYBE store','選物','廣安里選物店，與 Presenthing by ADOR 位於同一地址。','부산광역시 수영구 광안동 152-47','https://naver.me/FbVji7V7'));
    upsertPlace('廣安里', P('Presenthing by ADOR','香氛','香氛、飾品與禮物選物空間。','부산광역시 수영구 광안동 152-47','https://naver.me/5wrVHSiL'));
    upsertPlace('廣安里', P('粉紅家','選物','廣安里可愛文創與生活小物店。','부산광역시 수영구 광안동 153-41','https://naver.me/5t7Y4bQl'));
  }

  function applyLocalPatch(force = false) {
    if (!Array.isArray(window.itinerary)) return;
    const index = itinerary.findIndex(day => day.date === '8/4');
    if (index < 0) itinerary.push(clonePatch());
    else if (force || itinerary[index].revision !== REVISION) itinerary[index] = clonePatch();
    addBusanPlaces();
    try {
      window.renderItinerary?.();
      window.renderExplore?.();
    } catch {}
  }

  async function migrateCloud() {
    const config = window.SUPABASE_CONFIG || {};
    if (!config.url || !config.publishableKey || !window.supabase?.createClient) return;

    try {
      const client = window.supabase.createClient(config.url, config.publishableKey);
      const tripId = config.tripId || 'seoul-busan-2026';
      const { data, error } = await client
        .from('trip_shared_state')
        .select('trip_id,itinerary,updated_at')
        .eq('trip_id', tripId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return;

      const shared = Array.isArray(data.itinerary) ? JSON.parse(JSON.stringify(data.itinerary)) : [];
      const index = shared.findIndex(day => day.date === '8/4');
      if (index >= 0 && shared[index].revision === REVISION) {
        applyLocalPatch(false);
        return;
      }

      if (index >= 0) shared[index] = clonePatch();
      else shared.push(clonePatch());

      const { error: updateError } = await client
        .from('trip_shared_state')
        .update({ itinerary: shared, updated_at: new Date().toISOString() })
        .eq('trip_id', tripId);
      if (updateError) throw updateError;

      applyLocalPatch(true);
    } catch (error) {
      console.warn('8/4 shared itinerary migration could not be completed:', error);
      applyLocalPatch(false);
    }
  }

  window.DAY84_REVISION = REVISION;
  window.DAY84_PATCH = clonePatch();
  applyLocalPatch(false);
  setTimeout(migrateCloud, 1400);
})();