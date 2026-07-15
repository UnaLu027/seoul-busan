const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const maps=(q,type='google')=>type==='naver'?`https://map.naver.com/p/search/${encodeURIComponent(q)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const uid=p=>`${p}${Date.now()}${Math.random().toString(16).slice(2)}`;

const storage={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
function migrateState(){
  const v5=storage.get('tripStateV5');
  if(v5){try{return JSON.parse(v5)}catch(e){}}
  const v4=storage.get('tripStateV4');
  if(v4){
    try{
      const old=JSON.parse(v4);
      return {...clone(defaultState),...old,expenses:(old.expenses||defaultExpenses).map(e=>({...e,scope:e.scope||'total'})),packing:old.packing||packingSeed};
    }catch(e){}
  }
  return clone(defaultState);
}
let state=migrateState();
if(!Array.isArray(state.expenses))state.expenses=clone(defaultExpenses);
if(!Array.isArray(state.packing))state.packing=clone(packingSeed);
if(!('rate' in state))state.rate=null;
const save=()=>storage.set('tripStateV5',JSON.stringify(state));
let selectedDay=0,selectedDistrict='弘大',selectedCat='全部',selectedPackingType='隨身物品',placeQuery='';

function formatTWD(n){return `NT$${Math.round(Number(n)||0).toLocaleString('zh-TW')}`}
function formatMoney(amount,currency){return currency==='KRW'?`₩${Math.round(amount).toLocaleString('ko-KR')}`:`NT$${Math.round(amount).toLocaleString('zh-TW')}`}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function decodeHtml(v=''){const t=document.createElement('textarea');t.innerHTML=v;return t.value}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='budget'){renderBudget();fetchLiveRate(false)}
  if(id==='explore')renderExplore();
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));

function renderCountdown(){
  const today=new Date();today.setHours(0,0,0,0);
  const depart=new Date('2026-07-30T00:00:00+08:00');
  const end=new Date('2026-08-05T00:00:00+08:00');
  const d=Math.ceil((depart-today)/86400000);
  $('countdown').textContent=d>0?`倒數 ${d} 天`:today<end?'旅程進行中':'旅程已結束';
}

function renderHotels(){
  $('hotelList').innerHTML=hotels.map(h=>`<article class="card hotel-card"><h3>${escapeHtml(h.name)}</h3><div class="hotel-period">${escapeHtml(h.period)}</div><dl class="hotel-details">${h.details.map(d=>`<div class="hotel-detail"><dt>${escapeHtml(d[0])}</dt><dd>${escapeHtml(d[1])}</dd></div>`).join('')}</dl></article>`).join('');
}

function statusClass(s=''){if(s.includes('Pass'))return'pass';if(s.includes('待'))return'pending';return'booked'}
function renderItinerary(){
  $('dayChips').innerHTML=itinerary.map((d,i)=>`<button class="chip ${i===selectedDay?'active':''}" type="button" data-day="${i}">${d.date} ${d.title.split('・')[0]}</button>`).join('');
  document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{selectedDay=Number(b.dataset.day);renderItinerary()}));
  const day=itinerary[selectedDay];
  $('timeline').innerHTML=`<h2 class="day-title">${day.date}｜${escapeHtml(day.title)}</h2>`+day.events.map(e=>{
    const naver=e.naver||(e.map?maps(e.map,'naver'):'');
    const google=e.map?maps(e.map):'';
    const actions=(naver||google)?`<div class="actions">${naver?`<a class="btn soft" href="${naver}" target="_blank" rel="noopener">NAVER</a>`:''}${google?`<a class="btn white" href="${google}" target="_blank" rel="noopener">Google Maps</a>`:''}</div>`:'';
    return `<div class="event"><div class="time">${escapeHtml(e.time)}</div><h3>${escapeHtml(e.title)}</h3>${e.detail?`<div class="transport">${escapeHtml(e.detail)}</div>`:''}${e.exit?`<div class="exit">🚇 ${escapeHtml(e.exit)}</div>`:''}${e.status?`<div class="tags"><span class="tag ${statusClass(e.status)}">${escapeHtml(e.status)}</span></div>`:''}${actions}</div>`;
  }).join('');
}

function renderExplore(){
  const districts=Object.keys(places);
  if(!districts.includes(selectedDistrict))selectedDistrict=districts[0];
  $('districtTabs').innerHTML=districts.map(d=>`<button type="button" class="chip ${d===selectedDistrict?'active':''}" data-district="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('');
  document.querySelectorAll('[data-district]').forEach(b=>b.addEventListener('click',()=>{selectedDistrict=b.dataset.district;selectedCat='全部';placeQuery='';$('placeSearch').value='';renderExplore()}));
  const categories=['全部',...new Set(places[selectedDistrict].map(p=>p.cat))];
  if(!categories.includes(selectedCat))selectedCat='全部';
  $('categoryTabs').innerHTML=categories.map(c=>`<button type="button" class="chip ${c===selectedCat?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{selectedCat=b.dataset.cat;renderExplore()}));
  const q=placeQuery.trim().toLowerCase();
  const list=places[selectedDistrict].filter(p=>(selectedCat==='全部'||p.cat===selectedCat)&&(!q||`${p.name} ${p.desc} ${p.address}`.toLowerCase().includes(q)));
  $('placeGrid').innerHTML=list.length?list.map(p=>{
    const naver=p.naver||maps(p.google||p.name,'naver');
    const google=maps(p.google||p.address||p.name);
    return `<article class="place-card"><div class="place-head"><h3>${escapeHtml(p.name)}</h3><span class="place-cat">${escapeHtml(p.cat)}</span></div><p>${escapeHtml(p.desc)}</p>${p.address?`<p class="place-address">${escapeHtml(p.address)}</p>`:''}<div class="actions"><a class="btn primary" href="${naver}" target="_blank" rel="noopener">NAVER</a><a class="btn white" href="${google}" target="_blank" rel="noopener">Google Maps</a></div></article>`;
  }).join(''):`<div class="empty">沒有符合條件的地點</div>`;
}
$('placeSearch').addEventListener('input',e=>{placeQuery=e.target.value;renderExplore()});

function expensePerPersonTWD(e){
  let val=Number(e.amount)||0;
  if(e.currency==='KRW'){
    if(!state.rate)return 0;
    val*=state.rate;
  }
  return e.scope==='person'?val:val/2;
}
function renderBudget(){
  $('budgetLimit').value=state.budgetLimit||0;
  const total=state.expenses.reduce((s,e)=>s+expensePerPersonTWD(e),0);
  $('budgetTotal').textContent=state.rate?formatTWD(total):'等待匯率';
  const pct=state.budgetLimit?Math.min(100,total/state.budgetLimit*100):0;
  $('budgetBar').style.width=`${pct}%`;
  const rem=(state.budgetLimit||0)-total;
  $('budgetRemaining').textContent=state.rate?(rem>=0?`尚可使用 ${formatTWD(rem)}／人`:`已超出 ${formatTWD(Math.abs(rem))}／人`):'取得即時匯率後會自動計算韓元支出。';
  const cats={};state.expenses.forEach(e=>cats[e.category]=(cats[e.category]||0)+expensePerPersonTWD(e));
  $('categorySummary').innerHTML=Object.entries(cats).map(([c,v])=>`<div class="category-card"><b>${escapeHtml(c)}</b><span>${state.rate?formatTWD(v):'—'}</span></div>`).join('');
  const grouped={};state.expenses.forEach(e=>(grouped[e.category]??=[]).push(e));
  $('expenseList').innerHTML=Object.entries(grouped).map(([cat,items])=>`<section class="expense-group"><h4 class="category-title">${escapeHtml(cat)}</h4>${items.map(e=>`<div class="expense-row"><div class="grow"><strong>${escapeHtml(e.name)}</strong><div class="subline">${formatMoney(e.amount,e.currency)}｜${e.scope==='person'?'每人':'兩人總價'}｜${escapeHtml(e.status)}${state.rate&&e.currency==='KRW'?`｜約 ${formatTWD(expensePerPersonTWD(e))}／人`:''}</div></div><div class="row-actions"><button class="icon-btn" type="button" onclick="editExpense('${e.id}')">✎</button><button class="icon-btn danger" type="button" onclick="deleteExpense('${e.id}')">⌫</button></div></div>`).join('')}</section>`).join('');
  updateConverter();
}
$('budgetLimit').addEventListener('change',e=>{state.budgetLimit=Math.max(0,Number(e.target.value)||0);save();renderBudget()});

function openExpenseModal(id=''){
  const e=state.expenses.find(x=>x.id===id);
  $('expenseModalTitle').textContent=e?'修改支出':'新增支出';
  $('expenseId').value=e?.id||'';$('expenseName').value=e?.name||'';$('expenseAmount').value=e?.amount||'';$('expenseCurrency').value=e?.currency||'TWD';$('expenseCategory').value=e?.category||'餐飲';$('expenseScope').value=e?.scope||'total';$('expenseStatus').value=e?.status||'已付款';
  $('expenseModal').classList.add('open');
}
function editExpense(id){openExpenseModal(id)}
function deleteExpense(id){if(confirm('確定刪除這筆支出？')){state.expenses=state.expenses.filter(e=>e.id!==id);save();renderBudget()}}
$('expenseForm').addEventListener('submit',e=>{e.preventDefault();const id=$('expenseId').value||uid('e');const item={id,name:$('expenseName').value.trim(),amount:Number($('expenseAmount').value),currency:$('expenseCurrency').value,category:$('expenseCategory').value,scope:$('expenseScope').value,status:$('expenseStatus').value};const idx=state.expenses.findIndex(x=>x.id===id);if(idx>=0)state.expenses[idx]=item;else state.expenses.push(item);save();closeModal('expenseModal');renderBudget()});

async function fetchLiveRate(force=true){
  if(!force&&state.rate&&state.rateDate===new Date().toISOString().slice(0,10)){renderRate();return}
  $('rateStatus').textContent='正在取得最新 KRW／TWD 匯率…';
  try{
    const r=await fetch('https://api.frankfurter.dev/v2/rate/KRW/TWD',{cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    if(!d.rate)throw new Error('No rate');
    state.rate=Number(d.rate);state.rateDate=d.date||new Date().toISOString().slice(0,10);save();renderRate();renderBudget();
  }catch(err){
    $('rateStatus').textContent=state.rate?`暫時無法更新，沿用 ${state.rateDate||'上次'} 匯率：1 KRW ≈ ${state.rate.toFixed(5)} TWD`:'暫時無法取得即時匯率，請稍後重試。';
    updateConverter();renderBudget();
  }
}
function renderRate(){$('rateStatus').textContent=`${state.rateDate||'最新'}｜1 KRW ≈ ${state.rate.toFixed(5)} TWD｜1 TWD ≈ ${(1/state.rate).toFixed(2)} KRW`;updateConverter()}
function updateConverter(){const a=Number($('convertAmount')?.value)||0;if(!state.rate){if($('convertResult'))$('convertResult').textContent='等待即時匯率';return}const dir=$('convertDirection').value;const result=dir==='KRW_TWD'?a*state.rate:a/state.rate;$('convertResult').textContent=dir==='KRW_TWD'?`${Math.round(a).toLocaleString('ko-KR')} KRW ≈ ${formatTWD(result)}`:`${formatTWD(a)} ≈ ₩${Math.round(result).toLocaleString('ko-KR')}`}
$('refreshRate').addEventListener('click',()=>fetchLiveRate(true));$('convertAmount').addEventListener('input',updateConverter);$('convertDirection').addEventListener('change',updateConverter);

function renderPacking(){
  const types=['隨身物品','托運行李'];
  $('packingTabs').innerHTML=types.map(t=>`<button class="chip ${t===selectedPackingType?'active':''}" type="button" data-packtype="${t}">${t}</button>`).join('');
  document.querySelectorAll('[data-packtype]').forEach(b=>b.addEventListener('click',()=>{selectedPackingType=b.dataset.packtype;renderPacking()}));
  const list=state.packing.filter(p=>p.type===selectedPackingType);const done=list.filter(p=>p.done).length;
  $('packingProgress').textContent=`${done}/${list.length}`;$('packingBar').style.width=`${list.length?done/list.length*100:0}%`;
  const grouped={};list.forEach(p=>(grouped[p.category]??=[]).push(p));
  $('packingList').innerHTML=Object.entries(grouped).map(([cat,items])=>`<section><h3 class="packing-category">${escapeHtml(cat)}</h3>${items.map(p=>`<div class="check-row ${p.done?'done':''}"><input type="checkbox" ${p.done?'checked':''} onchange="togglePacking('${p.id}')"><div class="grow">${escapeHtml(p.name)}</div><div class="row-actions"><button class="icon-btn" type="button" onclick="editPacking('${p.id}')">✎</button><button class="icon-btn danger" type="button" onclick="deletePacking('${p.id}')">⌫</button></div></div>`).join('')}</section>`).join('');
}
function togglePacking(id){const p=state.packing.find(x=>x.id===id);if(p){p.done=!p.done;save();renderPacking()}}
function openPackingModal(id=''){const p=state.packing.find(x=>x.id===id);$('packingModalTitle').textContent=p?'修改行李項目':'新增行李項目';$('packingId').value=p?.id||'';$('packingName').value=p?.name||'';$('packingTypeInput').value=p?.type||selectedPackingType;$('packingCategory').value=p?.category||'';$('packingModal').classList.add('open')}
function editPacking(id){openPackingModal(id)}
function deletePacking(id){if(confirm('確定刪除這個項目？')){state.packing=state.packing.filter(p=>p.id!==id);save();renderPacking()}}
$('packingForm').addEventListener('submit',e=>{e.preventDefault();const id=$('packingId').value||uid('p');const old=state.packing.find(x=>x.id===id);const item={id,type:$('packingTypeInput').value,category:$('packingCategory').value.trim(),name:$('packingName').value.trim(),done:old?.done||false};const idx=state.packing.findIndex(x=>x.id===id);if(idx>=0)state.packing[idx]=item;else state.packing.push(item);selectedPackingType=item.type;save();closeModal('packingModal');renderPacking()});

function renderPhrases(){
  $('phraseList').innerHTML=Object.entries(phrases).map(([cat,rows])=>`<section class="phrase-group"><h3 class="category-title">${escapeHtml(cat)}</h3>${rows.map(([zh,ko])=>`<div class="phrase-row"><div class="grow"><div class="phrase-korean">${escapeHtml(ko)}</div><div class="subline">${escapeHtml(zh)}</div></div><button class="btn soft" type="button" onclick='speak(${JSON.stringify(ko)},"ko-KR")'>🔊</button></div>`).join('')}</section>`).join('');
}
function speak(text,lang='ko-KR'){if(!text)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.82;window.speechSynthesis.speak(u)}

async function translateText(){
  const text=$('translateInput').value.trim();if(!text){$('translationResult').textContent='請先輸入文字。';return}
  $('translateButton').disabled=true;$('translateButton').textContent='翻譯中…';$('translationResult').textContent='正在翻譯…';
  try{
    const pair=$('translateDirection').value;
    const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
    const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();
    const translated=decodeHtml(d?.responseData?.translatedText||'');if(!translated)throw new Error('No result');
    $('translationResult').textContent=translated;
  }catch(err){$('translationResult').textContent='翻譯服務暫時無法使用，請稍後再試。';}
  finally{$('translateButton').disabled=false;$('translateButton').textContent='翻譯'}
}
$('translateButton').addEventListener('click',translateText);
$('swapLanguage').addEventListener('click',()=>{const s=$('translateDirection');s.value=s.value==='zh-TW|ko'?'ko|zh-TW':'zh-TW|ko';const old=$('translateInput').value;const result=$('translationResult').textContent;if(result&&!result.includes('翻譯結果')&&!result.includes('暫時')&&!result.includes('正在')){$('translateInput').value=result;$('translationResult').textContent=old||'翻譯結果會顯示在這裡'}});
$('speakTranslation').addEventListener('click',()=>{const t=$('translationResult').textContent;const target=$('translateDirection').value.split('|')[1];speak(t,target==='ko'?'ko-KR':'zh-TW')});
$('copyTranslation').addEventListener('click',async()=>{const t=$('translationResult').textContent;try{await navigator.clipboard.writeText(t);$('copyTranslation').textContent='已複製';setTimeout(()=>$('copyTranslation').textContent='複製',1200)}catch(e){}});

function closeModal(id){$(id).classList.remove('open')}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));

function setMomMode(on){state.mom=on;document.body.classList.toggle('mom',on);$('momToggle').textContent=on?'✓ 媽媽模式':'👩 媽媽模式';save();if(on&&document.querySelector('#budget.active'))showPage('home')}
$('momToggle').addEventListener('click',()=>setMomMode(!state.mom));

renderCountdown();renderHotels();renderItinerary();renderExplore();renderPacking();renderPhrases();setMomMode(!!state.mom);renderBudget();fetchLiveRate(false);
