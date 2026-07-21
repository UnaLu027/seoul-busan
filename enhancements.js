// Enhancements loaded after the original app so they can extend its UI safely.
const phraseEmoji={
  '餐廳':'🍴','咖啡':'☕','購物':'🛍️','計程車':'🚕','交通':'🚇','飯店':'🏨','髮廊':'💇','醫美':'💆','緊急':'🆘'
};
let selectedPhraseCategory=Object.keys(phrases)[0]||'餐廳';

function renderPhrases(){
  const tabs=document.getElementById('phraseCategoryTabs');
  const list=document.getElementById('phraseList');
  if(!tabs||!list)return;
  const categories=Object.keys(phrases);
  if(!categories.includes(selectedPhraseCategory))selectedPhraseCategory=categories[0];
  tabs.innerHTML=categories.map(category=>`<button type="button" class="phrase-category-button ${category===selectedPhraseCategory?'active':''}" data-phrase-category="${escapeHtml(category)}">${phraseEmoji[category]||'💬'} ${escapeHtml(category)}</button>`).join('');
  tabs.querySelectorAll('[data-phrase-category]').forEach(button=>button.addEventListener('click',()=>{
    selectedPhraseCategory=button.dataset.phraseCategory;
    renderPhrases();
  }));
  const rows=phrases[selectedPhraseCategory]||[];
  list.innerHTML=rows.map(([zh,ko])=>`<div class="phrase-row"><div class="grow"><div class="phrase-korean">${escapeHtml(ko)}</div><div class="subline">${escapeHtml(zh)}</div></div><div class="phrase-tools"><button class="icon-btn" type="button" onclick='speak(${JSON.stringify(ko)},"ko-KR")' aria-label="播放韓文">🔊</button><button class="icon-btn" type="button" onclick='copyPhrase(${JSON.stringify(ko)},this)' aria-label="複製韓文">⧉</button></div></div>`).join('');
}

async function copyText(text,button){
  try{
    await navigator.clipboard.writeText(text);
  }catch{
    const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
  }
  if(button){const old=button.textContent;button.textContent='✓';setTimeout(()=>button.textContent=old,1000)}
}
function copyPhrase(text,button){copyText(text,button)}

async function translateViaGoogle(text,source,target){
  const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('Google translation failed');
  const data=await response.json();
  const translated=(data?.[0]||[]).map(part=>part?.[0]||'').join('').trim();
  if(!translated)throw new Error('Empty translation');
  return translated;
}
async function translateViaMemory(text,source,target){
  const pair=`${source}|${target}`;
  const response=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`,{cache:'no-store'});
  if(!response.ok)throw new Error('Fallback translation failed');
  const data=await response.json();
  const translated=decodeHtml(data?.responseData?.translatedText||'').trim();
  if(!translated)throw new Error('Empty fallback translation');
  return translated;
}
async function translateInsideApp(){
  const input=document.getElementById('translateInput');
  const result=document.getElementById('translationResult');
  const button=document.getElementById('translateNowButton');
  const text=input.value.trim();
  if(!text){input.focus();return}
  const [source,target]=document.getElementById('translateDirection').value.split('|');
  button.disabled=true;button.textContent='翻譯中…';result.classList.add('loading');result.textContent='正在翻譯…';
  try{
    let translated;
    try{translated=await translateViaGoogle(text,source,target)}catch{translated=await translateViaMemory(text,source,target)}
    result.textContent=translated;
  }catch{
    result.textContent='目前無法取得翻譯，請改用 Papago 按鈕。';
  }finally{
    result.classList.remove('loading');button.disabled=false;button.textContent='立即翻譯';
  }
}

document.getElementById('translateNowButton')?.addEventListener('click',translateInsideApp);
document.getElementById('translateInput')?.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key==='Enter')translateInsideApp();
});
document.getElementById('speakTranslation')?.addEventListener('click',()=>{
  const text=document.getElementById('translationResult').textContent.trim();
  if(!text||text==='翻譯結果會顯示在這裡')return;
  const target=document.getElementById('translateDirection').value.split('|')[1];
  speak(text,target==='ko'?'ko-KR':'zh-TW');
});
document.getElementById('copyTranslation')?.addEventListener('click',event=>{
  const text=document.getElementById('translationResult').textContent.trim();
  if(!text||text==='翻譯結果會顯示在這裡')return;
  copyText(text,event.currentTarget);
});

// Update previously saved booking labels without deleting the user's other edits.
try{
  state.bookings.forEach(item=>{
    if(item.name==='世運明洞博塔尼克飯店'||item.name==='Hotel Botanik')item.name='Hotel The Botanik Sewoon';
  });
  save();
}catch{}
renderHotels();
renderPhrases();

// Load the optional shared-cloud layer. It also provides local itinerary editing
// when Supabase has not been configured yet.
(function loadCloudLayer(){
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='cloud-sync.css';
  document.head.appendChild(style);

  const loadScript=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.body.appendChild(script);
  });

  (async()=>{
    try{await loadScript('supabase-config.js')}catch(error){console.warn('Supabase config could not be loaded',error)}
    try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')}catch(error){console.warn('Supabase library could not be loaded; local editing remains available',error)}
    try{await loadScript('cloud-sync.js')}catch(error){console.error('Cloud editor could not be loaded',error)}
  })();
})();
