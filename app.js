const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const maps=(q,type='google')=>type==='naver'?`https://map.naver.com/p/search/${encodeURIComponent(q)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const uid=p=>`${p}${Date.now()}${Math.random().toString(16).slice(2)}`;
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const escapeHtml=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function migrateState(){
  for(const key of ['tripStateV8','tripStateV7','tripStateV6','tripStateV5','tripStateV4']){
    const raw=storage.get(key);if(!raw)continue;
    try{
      const old=JSON.parse(raw);
      return {
        ...clone(defaultState),...old,
        expenses:Array.isArray(old.expenses)?old.expenses:clone(defaultExpenses),
        packing:Array.isArray(old.packing)?old.packing:clone(packingSeed),
        bookings:Array.isArray(old.bookings)?old.bookings:clone(bookingSeed),
        entry:Array.isArray(old.entry)?old.entry:clone(entrySeed)
      };
    }catch{}
  }
  return {...clone(defaultState),entry:clone(entrySeed)};
}
let state=migrateState();
const save=()=>storage.set('tripStateV8',JSON.stringify(state));
let selectedDay=0,selectedDistrict='弘大',selectedCategory='全部',selectedPackingType='隨身物品',tripView='itinerary',prepView='bookings';

function formatTWD(n){return `NT$${Math.round(Number(n)||0).toLocaleString('zh-TW')}`}
function formatMoney(a,c){return c==='KRW'?`₩${Math.round(a).toLocaleString('ko-KR')}`:formatTWD(a)}
function setCountdown(){const d=Math.ceil((new Date('2026-07-30T01:25:00+08:00')-new Date())/86400000);$('countdown').textContent=d>0?`倒數 ${d} 天`:d===0?'今天出發':'旅程進行中'}
function showPage(page){
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===page));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='budget')renderBudget();
  if(page==='prep')renderPrep();
  if(page==='trip'){renderItinerary();renderExplore()}
}
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));

function renderHotels(){
  $('hotelList').innerHTML=hotels.map(h=>`<article class="card hotel-card">
    <h3>${escapeHtml(h.name)}</h3>
    <div class="hotel-korean">${escapeHtml(h.korean)}</div>
    <div class="hotel-detail"><span>入住</span><b>${escapeHtml(h.checkIn)}</b></div>
    <div class="hotel-detail"><span>退房</span><b>${escapeHtml(h.checkOut)}</b></div>
    <div class="hotel-detail"><span>交通</span><b>${escapeHtml(h.transit)}</b></div>
    <div class="hotel-detail"><span>韓文地址</span><b>${escapeHtml(h.address)}</b></div>
  </article>`).join('');
}

function switchTripView(view){tripView=view;document.querySelectorAll('[data-tripview]').forEach(b=>b.classList.toggle('active',b.dataset.tripview===view));$('itineraryPanel').classList.toggle('hidden',view!=='itinerary');$('explorePanel').classList.toggle('hidden',view!=='explore');view==='explore'?renderExplore():renderItinerary()}
document.querySelectorAll('[data-tripview]').forEach(b=>b.addEventListener('click',()=>switchTripView(b.dataset.tripview)));

function renderItinerary(){
  $('dayChips').innerHTML=itinerary.map((d,i)=>`<button type="button" class="chip ${i===selectedDay?'active':''}" data-day="${i}">${d.date} ${escapeHtml(d.title.split('・')[0])}</button>`).join('');
  document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{selectedDay=Number(b.dataset.day);renderItinerary()}));
  const d=itinerary[selectedDay];
  $('timeline').innerHTML=`<h3 class="serif" style="margin:0 0 22px">${d.date}｜${escapeHtml(d.title)}</h3>`+d.events.map(e=>{
    const naver=e.naver||(e.map?maps(e.map,'naver'):'');const google=e.map?maps(e.map):'';const cls=e.status==='釜山 Pass'?'pass':e.status&&e.status!=='待預約'?'booked':'';
    return `<article class="event"><div class="time">${escapeHtml(e.time)}</div><h3>${escapeHtml(e.title)}</h3>${e.detail?`<div class="event-detail">${escapeHtml(e.detail)}</div>`:''}${e.exit?`<div class="exit">🚇 ${escapeHtml(e.exit)}</div>`:''}${e.status?`<div class="status-row"><span class="tag ${cls}">${escapeHtml(e.status)}</span></div>`:''}${(naver||google)?`<div class="actions">${naver?`<a class="btn soft" target="_blank" rel="noopener" href="${naver}">NAVER</a>`:''}${google?`<a class="btn white" target="_blank" rel="noopener" href="${google}">Google Maps</a>`:''}</div>`:''}</article>`
  }).join('');
}
function districtNames(){return Object.keys(places)}
function categoryNames(){return ['全部',...new Set(places[selectedDistrict].map(p=>p.category))]}
function renderExplore(){
  $('districtSelect').innerHTML=districtNames().map(d=>`<option ${d===selectedDistrict?'selected':''}>${d}</option>`).join('');
  const cats=categoryNames();if(!cats.includes(selectedCategory))selectedCategory='全部';
  $('categorySelect').innerHTML=cats.map(c=>`<option ${c===selectedCategory?'selected':''}>${c}</option>`).join('');
  const q=$('placeSearch').value.trim().toLowerCase();
  const list=places[selectedDistrict].filter(p=>(selectedCategory==='全部'||p.category===selectedCategory)&&(!q||`${p.name} ${p.description} ${p.addressKo}`.toLowerCase().includes(q)));
  $('placeGrid').innerHTML=list.map(p=>{const query=p.addressKo||p.google||p.name;const naver=p.naver||maps(p.google||p.name,'naver');return `<article class="place-card"><h3>${escapeHtml(p.name)}</h3><span class="place-category">${escapeHtml(p.category)}</span><p>${escapeHtml(p.description)}</p><div class="address-row"><div class="address-text">${escapeHtml(p.addressKo)}</div><button class="copy-btn" type="button" onclick='copyAddress(${JSON.stringify(p.addressKo)},this)' aria-label="複製韓文地址">⧉</button></div><div class="actions"><a class="btn primary" target="_blank" rel="noopener" href="${naver}">NAVER</a><a class="btn white" target="_blank" rel="noopener" href="${maps(query)}">Google Maps</a></div></article>`}).join('')||'<article class="card">沒有符合條件的地點。</article>';
}
$('districtSelect').addEventListener('change',e=>{selectedDistrict=e.target.value;selectedCategory='全部';renderExplore()});
$('categorySelect').addEventListener('change',e=>{selectedCategory=e.target.value;renderExplore()});
$('placeSearch').addEventListener('input',renderExplore);
async function copyAddress(text,button){try{await navigator.clipboard.writeText(text);button.textContent='✓';setTimeout(()=>button.textContent='⧉',1000)}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}}

function expensePerPersonTWD(e){const raw=Number(e.amount)||0;const twd=e.currency==='KRW'?(state.rate?raw*state.rate:0):raw;return e.scope==='person'?twd:twd/2}
function renderBudget(){
  $('budgetLimit').value=state.budgetLimit;const total=state.expenses.reduce((s,e)=>s+expensePerPersonTWD(e),0);
  $('budgetTotal').textContent=state.rate?formatTWD(total):'等待匯率';$('budgetBar').style.width=`${state.budgetLimit?Math.min(100,total/state.budgetLimit*100):0}%`;$('budgetRemaining').textContent=state.rate?`剩餘 ${formatTWD(state.budgetLimit-total)}`:'韓元項目待匯率換算';
  const cats={};state.expenses.forEach(e=>cats[e.category]=(cats[e.category]||0)+expensePerPersonTWD(e));
  $('categorySummary').innerHTML=Object.entries(cats).map(([c,v])=>`<div class="category-card"><b>${escapeHtml(c)}</b><span>${state.rate?formatTWD(v):'—'}</span></div>`).join('');
  const grouped={};state.expenses.forEach(e=>(grouped[e.category]??=[]).push(e));
  $('expenseList').innerHTML=Object.entries(grouped).map(([cat,items])=>`<section class="expense-group"><h4 class="category-title">${escapeHtml(cat)}</h4>${items.map(e=>`<div class="expense-row"><div class="grow"><strong>${escapeHtml(e.name)}</strong><div class="subline">${formatMoney(e.amount,e.currency)}｜${e.scope==='person'?'每人':'兩人總價'}｜${escapeHtml(e.status)}${state.rate&&e.currency==='KRW'?`｜約 ${formatTWD(expensePerPersonTWD(e))}／人`:''}</div></div><div class="row-actions"><button class="icon-btn" type="button" onclick="editExpense('${e.id}')">✎</button><button class="icon-btn danger" type="button" onclick="deleteExpense('${e.id}')">⌫</button></div></div>`).join('')}</section>`).join('');updateConverter();
}
$('budgetLimit').addEventListener('change',e=>{state.budgetLimit=Math.max(0,Number(e.target.value)||0);save();renderBudget()});
function openExpenseModal(id=''){const e=state.expenses.find(x=>x.id===id);$('expenseModalTitle').textContent=e?'修改支出':'新增支出';$('expenseId').value=e?.id||'';$('expenseName').value=e?.name||'';$('expenseAmount').value=e?.amount||'';$('expenseCurrency').value=e?.currency||'TWD';$('expenseCategory').value=e?.category||'餐飲';$('expenseScope').value=e?.scope||'total';$('expenseStatus').value=e?.status||'已付款';$('expenseModal').classList.add('open')}
function editExpense(id){openExpenseModal(id)}
function deleteExpense(id){if(confirm('確定刪除這筆支出？')){state.expenses=state.expenses.filter(e=>e.id!==id);save();renderBudget()}}
$('expenseForm').addEventListener('submit',e=>{e.preventDefault();const id=$('expenseId').value||uid('e');const item={id,name:$('expenseName').value.trim(),amount:Number($('expenseAmount').value),currency:$('expenseCurrency').value,category:$('expenseCategory').value,scope:$('expenseScope').value,status:$('expenseStatus').value};const i=state.expenses.findIndex(x=>x.id===id);i>=0?state.expenses[i]=item:state.expenses.push(item);save();closeModal('expenseModal');renderBudget()});
async function fetchLiveRate(force=true){if(!force&&state.rate&&state.rateDate===new Date().toISOString().slice(0,10)){renderRate();return}$('rateStatus').textContent='正在取得最新 KRW／TWD 匯率…';try{const r=await fetch('https://api.frankfurter.dev/v2/rate/KRW/TWD',{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();state.rate=Number(d.rate);state.rateDate=d.date||new Date().toISOString().slice(0,10);save();renderRate();renderBudget()}catch{$('rateStatus').textContent=state.rate?`暫時無法更新，沿用 ${state.rateDate} 匯率`:'暫時無法取得即時匯率';updateConverter()}}
function renderRate(){$('rateStatus').textContent=`${state.rateDate||'最新'}｜1 KRW ≈ ${state.rate.toFixed(5)} TWD｜1 TWD ≈ ${(1/state.rate).toFixed(2)} KRW`;updateConverter()}
function updateConverter(){const a=Number($('convertAmount').value)||0;if(!state.rate){$('convertResult').textContent='等待即時匯率';return}const d=$('convertDirection').value;const r=d==='KRW_TWD'?a*state.rate:a/state.rate;$('convertResult').textContent=d==='KRW_TWD'?`${Math.round(a).toLocaleString('ko-KR')} KRW ≈ ${formatTWD(r)}`:`${formatTWD(a)} ≈ ₩${Math.round(r).toLocaleString('ko-KR')}`}
$('refreshRate').addEventListener('click',()=>fetchLiveRate(true));$('convertAmount').addEventListener('input',updateConverter);$('convertDirection').addEventListener('change',updateConverter);

function switchPrepView(view){prepView=view;document.querySelectorAll('[data-prepview]').forEach(b=>b.classList.toggle('active',b.dataset.prepview===view));$('bookingsPanel').classList.toggle('hidden',view!=='bookings');$('packingPanel').classList.toggle('hidden',view!=='packing');$('entryPanel').classList.toggle('hidden',view!=='entry');renderPrep()}
document.querySelectorAll('[data-prepview]').forEach(b=>b.addEventListener('click',()=>switchPrepView(b.dataset.prepview)));
function noteRow(item,kind,extra=''){return `<div class="note-row ${item.done?'done':''}" data-note-id="${item.id}"><input type="checkbox" ${item.done?'checked':''} onchange="toggleNote('${kind}','${item.id}')"><input class="note-input" value="${escapeHtml(item.name)}" aria-label="清單文字" oninput="renameNote('${kind}','${item.id}',this.value)" onkeydown="noteKey(event,'${kind}','${item.id}','${escapeHtml(extra)}')"></div>`}
function getNoteList(kind){return kind==='booking'?state.bookings:kind==='entry'?state.entry:state.packing}
function renderBookings(){const done=state.bookings.filter(b=>b.done).length;$('bookingProgress').textContent=`${done}/${state.bookings.length}`;$('bookingList').innerHTML=state.bookings.map(b=>noteRow(b,'booking')).join('')}
function renderEntry(){const done=state.entry.filter(b=>b.done).length;$('entryProgress').textContent=`${done}/${state.entry.length}`;$('entryList').innerHTML=state.entry.map(b=>noteRow(b,'entry')).join('')}
function renderPacking(){
  const types=['隨身物品','托運行李'];$('packingTabs').innerHTML=types.map(t=>`<button class="chip ${t===selectedPackingType?'active':''}" type="button" data-packtype="${t}">${t}</button>`).join('');
  document.querySelectorAll('[data-packtype]').forEach(b=>b.addEventListener('click',()=>{selectedPackingType=b.dataset.packtype;renderPacking()}));
  const list=state.packing.filter(p=>p.type===selectedPackingType),done=list.filter(p=>p.done).length;$('packingBar').style.width=`${list.length?done/list.length*100:0}%`;
  const grouped={};list.forEach(p=>(grouped[p.category]??=[]).push(p));
  $('packingList').innerHTML=Object.entries(grouped).map(([cat,items])=>`<section><h3 class="packing-category">${escapeHtml(cat)}</h3>${items.map(p=>noteRow(p,'packing',cat)).join('')}</section>`).join('');
}
function renderPrep(){renderBookings();renderPacking();renderEntry();const all=[...state.bookings,...state.packing,...state.entry],done=all.filter(x=>x.done).length;$('prepProgress').textContent=`${done}/${all.length}`}
function toggleNote(kind,id){const item=getNoteList(kind).find(x=>x.id===id);if(item){item.done=!item.done;save();renderPrep()}}
function renameNote(kind,id,value){const item=getNoteList(kind).find(x=>x.id===id);if(item){item.name=value;save()}}
function insertAfter(kind,id,extra=''){
  const list=getNoteList(kind),i=list.findIndex(x=>x.id===id);let item;
  if(kind==='packing'){const old=list[i];item={id:uid('p'),type:old?.type||selectedPackingType,category:extra||old?.category||'其他',name:'',done:false}}
  else item={id:uid(kind==='booking'?'b':'t'),name:'',done:false};
  list.splice(i+1,0,item);save();renderPrep();requestAnimationFrame(()=>document.querySelector(`[data-note-id="${item.id}"] .note-input`)?.focus());
}
function removeEmpty(kind,id){const list=getNoteList(kind),i=list.findIndex(x=>x.id===id);if(i<0)return;const previous=list[i-1]?.id;list.splice(i,1);save();renderPrep();if(previous)requestAnimationFrame(()=>document.querySelector(`[data-note-id="${previous}"] .note-input`)?.focus())}
function noteKey(event,kind,id,extra=''){if(event.key==='Enter'){event.preventDefault();insertAfter(kind,id,extra)}else if(event.key==='Backspace'&&event.currentTarget.value===''){event.preventDefault();removeEmpty(kind,id)}}
function appendBooking(){const item={id:uid('b'),name:'',done:false};state.bookings.push(item);save();renderPrep();requestAnimationFrame(()=>document.querySelector(`[data-note-id="${item.id}"] .note-input`)?.focus())}
function appendEntryTask(){const item={id:uid('t'),name:'',done:false};state.entry.push(item);save();renderPrep();requestAnimationFrame(()=>document.querySelector(`[data-note-id="${item.id}"] .note-input`)?.focus())}
function appendPacking(){const list=state.packing.filter(p=>p.type===selectedPackingType);const item={id:uid('p'),type:selectedPackingType,category:list.at(-1)?.category||'其他',name:'',done:false};state.packing.push(item);save();renderPrep();requestAnimationFrame(()=>document.querySelector(`[data-note-id="${item.id}"] .note-input`)?.focus())}

function renderPhrases(){$('phraseList').innerHTML=Object.entries(phrases).map(([cat,rows])=>`<section class="phrase-group"><h3 class="category-title">${escapeHtml(cat)}</h3>${rows.map(([zh,ko])=>`<div class="phrase-row"><div class="grow"><div class="phrase-korean">${escapeHtml(ko)}</div><div class="subline">${escapeHtml(zh)}</div></div><button class="icon-btn" type="button" onclick='speak(${JSON.stringify(ko)},"ko-KR")'>🔊</button></div>`).join('')}</section>`).join('')}
function speak(text,lang='ko-KR'){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.88;speechSynthesis.speak(u)}
$('swapLanguage').addEventListener('click',()=>{const s=$('translateDirection');s.value=s.value==='zh-TW|ko'?'ko|zh-TW':'zh-TW|ko'});
$('papagoButton').addEventListener('click',()=>{const text=$('translateInput').value.trim();if(!text){$('translateInput').focus();return}const [sk,tk]=$('translateDirection').value.split('|');window.open(`https://papago.naver.com/?sk=${encodeURIComponent(sk)}&tk=${encodeURIComponent(tk)}&st=${encodeURIComponent(text)}`,'_blank','noopener')});

function closeModal(id){$(id).classList.remove('open')}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
function setMomMode(on){state.mom=on;document.body.classList.toggle('mom',on);$('momToggle').textContent=on?'✓ 媽媽模式':'👩 媽媽模式';save();if(on&&document.querySelector('#budget.active'))showPage('home')}
$('momToggle').addEventListener('click',()=>setMomMode(!state.mom));

setCountdown();renderHotels();renderItinerary();renderExplore();renderBudget();renderPrep();renderPhrases();setMomMode(!!state.mom);fetchLiveRate(false);
