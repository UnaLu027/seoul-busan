const $=id=>document.getElementById(id);
const maps=(q,type='google')=>type==='naver'?`https://map.naver.com/p/search/${encodeURIComponent(q)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
let state=JSON.parse(localStorage.getItem('tripStateV4')||'null')||structuredClone(defaultState);
const save=()=>localStorage.setItem('tripStateV4',JSON.stringify(state));
let selectedDay=0,selectedDistrict='弘大',selectedCat='全部',selectedPackingType='隨身物品';

function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===id));scrollTo(0,0)}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('momToggle').onclick=()=>{document.body.classList.toggle('mom');$('momToggle').textContent=document.body.classList.contains('mom')?'✓ 媽媽模式':'👩 媽媽模式'};

function renderDays(){$('dayChips').innerHTML=itinerary.map((d,i)=>`<button class="chip ${i===selectedDay?'active':''}" onclick="selectedDay=${i};renderDays();renderTimeline()">${d.date} ${d.title.split('・')[0]}</button>`).join('')}
function renderTimeline(){const d=itinerary[selectedDay];$('timeline').innerHTML=`<h3 class="serif" style="margin-top:0">${d.date}｜${d.title}</h3>`+d.events.map(e=>`<div class="event"><div class="time">${e[0]}</div><h3>${e[1]}</h3>${e[2]?`<div class="transport">${e[2]}</div>`:''}${e[4]?`<div class="exit">🚇 ${e[4]}</div>`:''}${e[3]?`<div class="tags"><span class="tag ${e[3].includes('Pass')?'pass':'booked'}">${e[3]}</span></div>`:''}<div class="actions"><a class="btn soft" target="_blank" rel="noopener" href="${maps(e[1],'naver')}">NAVER</a><a class="btn white" target="_blank" rel="noopener" href="${maps(e[1])}">Google</a></div></div>`).join('')}

function renderDistricts(){$('districtTabs').innerHTML=Object.keys(places).map(d=>`<button class="chip ${d===selectedDistrict?'active':''}" onclick="selectedDistrict='${d}';selectedCat='全部';renderDistricts();renderCategories();renderPlaces()">${d}</button>`).join('')}
function renderCategories(){const cats=['全部',...new Set(places[selectedDistrict].map(x=>x[1]))];$('categoryTabs').innerHTML=cats.map(c=>`<button class="chip ${c===selectedCat?'active':''}" onclick="selectedCat='${c}';renderCategories();renderPlaces()">${c}</button>`).join('')}
function renderPlaces(){const rows=places[selectedDistrict].filter(x=>selectedCat==='全部'||x[1]===selectedCat);$('placeGrid').innerHTML=rows.map(p=>`<article class="place-card"><div class="place-top"><div><h3>${p[0]}</h3><p>${p[2]}</p></div><span class="place-cat">${p[1]}</span></div><div class="photo-note"><b>實景照片：</b>為避免錯放其他分店或未授權圖片，請從 NAVER 店頁查看該地點實際店面與最新照片。</div><div class="actions"><a class="btn primary" target="_blank" rel="noopener" href="${maps(p[0]+' '+selectedDistrict,'naver')}">NAVER 實景照</a><a class="btn white" target="_blank" rel="noopener" href="${maps(p[0]+' '+selectedDistrict)}">Google Maps</a></div></article>`).join('')}

const twd=e=>e.currency==='KRW'?e.amount*state.rate:e.amount;
function renderBudget(){
 $('budgetLimit').value=state.budget;$('homeBudget').textContent='NT$'+Number(state.budget).toLocaleString();
 const total=state.expenses.reduce((s,e)=>s+twd(e),0)/2;$('budgetTotal').textContent='NT$'+Math.round(total).toLocaleString();$('budgetBar').style.width=Math.min(100,total/state.budget*100)+'%';
 const grouped={};state.expenses.forEach(e=>(grouped[e.category]??=[]).push(e));
 const sums=Object.fromEntries(Object.entries(grouped).map(([k,v])=>[k,v.reduce((s,e)=>s+twd(e),0)/2]));
 $('categorySummary').innerHTML=Object.entries(sums).map(([k,v])=>`<div class="cat-row"><span>${k}</span><div class="bar"><i style="width:${total?Math.min(100,v/total*100):0}%"></i></div><b>NT$${Math.round(v).toLocaleString()}</b></div>`).join('');
 $('expenseList').innerHTML=Object.entries(grouped).map(([k,rows])=>`<div class="expense-group"><h3>${k}</h3>${rows.map(e=>`<div class="expense-row"><div class="grow"><b>${e.name}</b><div class="sub">${e.status}・${e.currency} ${Number(e.amount).toLocaleString()}・人均約 NT$${Math.round(twd(e)/2).toLocaleString()}</div></div><button class="icon-btn" onclick="editExpense(${e.id})">✎</button><button class="icon-btn danger" onclick="deleteExpense(${e.id})">×</button></div>`).join('')}</div>`).join('')}
$('budgetLimit').onchange=e=>{state.budget=Number(e.target.value)||0;save();renderBudget()};
function openExpenseModal(){$('expenseModal').classList.add('open');$('expenseForm').reset();$('expenseId').value='';$('expenseModalTitle').textContent='新增支出'}
function editExpense(id){const e=state.expenses.find(x=>x.id===id);openExpenseModal();$('expenseModalTitle').textContent='修改支出';$('expenseId').value=e.id;$('expenseName').value=e.name;$('expenseAmount').value=e.amount;$('expenseCurrency').value=e.currency;$('expenseCategory').value=e.category;$('expenseStatus').value=e.status}
$('expenseForm').onsubmit=e=>{e.preventDefault();const obj={id:Number($('expenseId').value)||Date.now(),name:$('expenseName').value,amount:Number($('expenseAmount').value),currency:$('expenseCurrency').value,category:$('expenseCategory').value,status:$('expenseStatus').value};const i=state.expenses.findIndex(x=>x.id===obj.id);i>=0?state.expenses[i]=obj:state.expenses.push(obj);save();closeModal('expenseModal');renderBudget()};
function deleteExpense(id){if(confirm('確定刪除？')){state.expenses=state.expenses.filter(x=>x.id!==id);save();renderBudget()}}

function renderPackingTabs(){$('packingTabs').innerHTML=['隨身物品','托運行李'].map(t=>`<button class="chip ${t===selectedPackingType?'active':''}" onclick="selectedPackingType='${t}';renderPackingTabs();renderPacking()">${t}</button>`).join('')}
function renderPacking(){const rows=state.packing.filter(x=>x.type===selectedPackingType),groups={};rows.forEach(x=>(groups[x.cat]??=[]).push(x));$('packingList').innerHTML=Object.entries(groups).map(([k,v])=>`<div class="packing-group"><h3>${k}</h3>${v.map(x=>`<div class="check-row ${x.done?'done':''}"><input type="checkbox" ${x.done?'checked':''} onchange="togglePacking(${x.id})"><div class="grow">${x.name}</div><button class="icon-btn" onclick="editPacking(${x.id})">✎</button><button class="icon-btn danger" onclick="deletePacking(${x.id})">×</button></div>`).join('')}</div>`).join('');const done=state.packing.filter(x=>x.done).length;$('packingProgress').textContent=`${done}/${state.packing.length}`;$('packingBar').style.width=(state.packing.length?done/state.packing.length*100:0)+'%'}
function openPackingModal(){$('packingModal').classList.add('open');$('packingForm').reset();$('packingId').value='';$('packingTypeInput').value=selectedPackingType;$('packingModalTitle').textContent='新增行李項目'}
function editPacking(id){const x=state.packing.find(y=>y.id===id);openPackingModal();$('packingModalTitle').textContent='修改行李項目';$('packingId').value=x.id;$('packingName').value=x.name;$('packingTypeInput').value=x.type;$('packingCategory').value=x.cat}
$('packingForm').onsubmit=e=>{e.preventDefault();const obj={id:Number($('packingId').value)||Date.now(),type:$('packingTypeInput').value,cat:$('packingCategory').value||'其他',name:$('packingName').value,done:false};const i=state.packing.findIndex(x=>x.id===obj.id);if(i>=0){obj.done=state.packing[i].done;state.packing[i]=obj}else state.packing.push(obj);save();closeModal('packingModal');renderPackingTabs();renderPacking()};
function togglePacking(id){const x=state.packing.find(y=>y.id===id);x.done=!x.done;save();renderPacking()}
function deletePacking(id){if(confirm('確定刪除？')){state.packing=state.packing.filter(x=>x.id!==id);save();renderPacking()}}

function renderPhrases(){$('phraseList').innerHTML=Object.entries(phrases).map(([k,v])=>`<h3 class="category-title">${k}</h3>${v.map(p=>`<div class="phrase-row"><div class="grow"><div class="phrase-korean">${p[0]}</div><div class="sub">${p[1]}</div></div><button class="icon-btn" onclick="speak(${JSON.stringify(p[0])})">🔊</button></div>`).join('')}`).join('')}
function speak(t){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=.78;speechSynthesis.speak(u)}
function closeModal(id){$(id).classList.remove('open')}
document.querySelectorAll('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('open')});
const depart=new Date('2026-07-30T01:25:00+08:00'),now=new Date();$('countdown').textContent=now<depart?`倒數 ${Math.ceil((depart-now)/86400000)} 天`:'旅程進行中';
renderDays();renderTimeline();renderDistricts();renderCategories();renderPlaces();renderBudget();renderPackingTabs();renderPacking();renderPhrases();