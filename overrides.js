// Corrected hotel essentials and pre-departure checklist.
hotels.splice(0, hotels.length,
  {
    name:'世運明洞博塔尼克飯店',
    korean:'호텔 더 보타닉 세운 명동',
    checkIn:'7/30 15:00 後',
    checkOut:'8/1 12:00 前',
    transit:'乙支路三街站（2、3號線）12號出口；有行李時依站內電梯標示移動，出站後步行前往飯店。',
    address:'서울특별시 중구 을지로19길 23'
  },
  {
    name:'廣安里 Hotel 1',
    korean:'광안리 호텔1',
    checkIn:'8/1 16:00 後',
    checkOut:'8/4 11:00 前',
    transit:'金蓮山站（2號線）1號出口後步行約 10–12 分鐘；從釜山站拖行李時建議直接搭計程車。',
    address:'부산광역시 수영구 광안해변로 203'
  }
);

bookingSeed.splice(0, bookingSeed.length,
  ...[
    ['去程真航空 LJ734',true],
    ['回程中華航空 CI187',true],
    ['世運明洞博塔尼克飯店',true],
    ['廣安里 Hotel 1',true],
    ['KTX 首爾 → 釜山',true],
    ['釜山 Pass',true],
    ['海雲台膠囊列車',true],
    ['Touch Five',true],
    ['Yacht Holic',true],
    ['avahair',true],
    ['eSIM',true],
    ['dday 醫美',false]
  ].map((x,i)=>({id:`b${i+1}`,name:x[0],done:x[1]}))
);

const entrySeed=[
  ['確認護照效期與英文姓名拼字',false],
  ['確認台灣護照 2026 年免申請 K-ETA',false],
  ['抵達韓國前 3 天內填寫 e-Arrival Card（免費）',false],
  ['準備 e-Arrival Card：護照、Email、去回程航班、首晚住宿地址與電話',false],
  ['儲存 e-Arrival Card 申報完成畫面／申報編號',false],
  ['7/29 起確認真航空 LJ734 是否開放網路報到；若無法取得登機證，改至桃園機場櫃檯',false],
  ['8/2 20:00 起嘗試華航 CI187 預辦登機並儲存登機證',false],
  ['抵達仁川後詢問 SES 註冊櫃檯（台灣晶片護照、17 歲以上；現場辦理）',false],
  ['將兩間飯店韓文地址與電話存到手機',false],
  ['下載／更新 Papago、NAVER Map、Kakao T 與航空公司 App',false]
].map((x,i)=>({id:`t${i+1}`,name:x[0],done:x[1]}));
