# Supabase 雲端同步設定

網站已具備共同編輯與即時同步程式。完成以下一次性設定後，行程、票券預訂、行李清單與入境清單會共用同一份資料。

## 1. 建立 Supabase 專案

1. 登入 Supabase Dashboard。
2. 建立一個新專案。
3. 等待資料庫建立完成。

## 2. 建立共同資料表

1. 在 Supabase 左側開啟 **SQL Editor**。
2. 開啟本儲存庫的 `supabase-setup.sql`。
3. 複製全部 SQL，貼到 SQL Editor 後執行。

這份 SQL 會：

- 建立 `trip_shared_state` 資料表。
- 開啟 Row Level Security。
- 只允許網站讀寫 `seoul-busan-2026` 這一筆旅程資料。
- 將資料表加入 Supabase Realtime。

## 3. 取得前端公開設定

在 Supabase 專案的 **Connect** 或 **API Keys** 頁面取得：

- Project URL
- Publishable key（舊專案可能顯示 anon key）

不要使用 `service_role`、secret key 或任何可繞過 RLS 的金鑰。

## 4. 填入網站設定

修改 `supabase-config.js`：

```js
window.SUPABASE_CONFIG = {
  url: '你的 Project URL',
  publishableKey: '你的 Publishable key',
  tripId: 'seoul-busan-2026'
};
```

提交後，GitHub Pages 會重新部署。網站上的狀態會由「僅此裝置（雲端待設定）」變成「雲端已同步」。

## 共同編輯範圍

- 每日行程與日期
- 行程時間、名稱、交通註解、地鐵出口、狀態與地圖資料
- 票券與預訂 Checklist
- 隨身物品與托運行李 Checklist
- 入境與登機 Checklist

旅行預算目前仍保留為各裝置自己的資料，不會分享給其他人。

## 權限提醒

目前設計為公開共同編輯：知道網站網址的人都能修改共同資料。若需要限制只有家人可以改，可再加入登入或共同編輯密碼。
