# 話術透視鏡

本 workspace 包含兩個彼此獨立的 Replit Website App：

- `artifacts/rhetoric-xray`：公開前台「話術透視鏡」。
- `artifacts/admin-console`：獨立後台「話術透視鏡 — 後台管理」，自己的伺服器、session、build 與 deployment URL；不是公開網站的 `/admin` route。

## 後台 App 啟動與部署

- 開發：`pnpm admin:dev`
- Production build：`pnpm admin:build`
- Production start：`pnpm admin:start`
- 健康檢查：`GET /health`
- 伺服器監聽 Replit 提供的 `PORT`（未提供時開發預設 5000）與 `0.0.0.0`。
- Library 中應以 `artifacts/admin-console` 作為第二個 Website App，顯示名稱設為「話術透視鏡 — 後台管理」。

## Replit Secrets

| 變數 | 必要 | 用途 |
|---|---:|---|
| `DATABASE_URL` | 是 | 持久化 PostgreSQL；啟動時自動 migration |
| `SESSION_SECRET` | 正式環境是 | Cookie session 簽章密鑰，建議 32+ 隨機字元 |
| `INITIAL_ADMIN_USERNAME` | 否 | 六位數超級管理員帳號，預設 `123123`（也相容 `ADMIN_USERNAME`） |
| `INITIAL_ADMIN_PASSWORD` | 否 | 六位數密碼，預設 `123123`（也相容 `ADMIN_PASSWORD`）；每次啟動重新安全雜湊 |
| `PUBLIC_API_TOKEN` | 是 | 公開前台傳送紀錄使用的 Bearer token |
| `CORS_ORIGINS` | 是 | 逗號分隔的公開前台 origin 白名單 |
| `PUBLIC_SITE_URL` | 否 | 後台「回首頁」連結 |
| `NODE_ENV` | 是 | 正式部署設為 `production`，啟用 Secure cookie |

公開前台使用 `ADMIN_API_URL=https://<後台獨立部署 URL>` 與相同 `ADMIN_API_TOKEN` 傳送分析與網址掃描紀錄。

## 安全

- bcrypt 12 rounds 密碼雜湊；PostgreSQL session store；HttpOnly / SameSite / production Secure cookie。
- 後台 API 全部有 session 與角色權限檢查；整合 API 使用 Bearer token。
- migration：`artifacts/admin-console/migrations/0001_init.sql`，啟動時可重複執行。
