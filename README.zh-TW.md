# Awesome NSGo

[![Website](https://img.shields.io/badge/website-awesomensgo.dev-007aff)](https://awesomensgo.dev)
[![CI](https://github.com/yldm-tech/awesome-nsgo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-nsgo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-nsgo)](LICENSE)

把圍繞 [NSGo](https://github.com/oneo-me/nsgo) 的應用、套件、元件和文件收集在一個網站裡：**[awesomensgo.dev](https://awesomensgo.dev)**。NSGo 是 [ONEO](https://github.com/oneo-me) 開發、以 Go 為後端的跨平台原生 UI 引擎：應用邏輯、響應式圖和版面配置都在 Go 中執行，應用用 Go 或 TSX 寫一次即可。它在 iOS 及其 App Clip、tvOS、watchOS、Android、macOS、Windows、Linux 和 Web 上以各平台自己的原生視圖繪製，Go 應用還能在微信、QQ、支付寶和抖音小程式裡執行。NSGo 仍在早期階段，尚未發布正式版本，也沒有穩定的 API。

Awesome NSGo 是 yldm-tech 維護的非官方社群目錄，不是 NSGo 的官方網站；官網是 [oneo-me.github.io/nsgo](https://oneo-me.github.io/nsgo/)。

[English](README.md) · [简体中文](README.zh-CN.md) · 繁體中文 · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Awesome NSGo](.github/assets/banner.png)](https://awesomensgo.dev)

## 網站內容

- **作品**：用 NSGo 打造的應用，可依名稱、最新或最熱門排序，並依分類、語言（Go 或 TSX）和平台（macOS、Windows、Linux、iOS、Android、Web 或小程式）篩選。每款都有自己的頁面，包含完整介紹、截圖（專案有提供時）、用 Go 還是 TSX 撰寫、支援的平台、分類、收錄時間，以及同一作者的其他作品。
- **外掛**：NSGo 的官方套件（都在 `github.com/oneo-me/nsgo` 這個模組裡，包括桌面視窗與系統匣、行動裝置分頁列、國際化、Lucide 圖示、圖表、資料表格、編輯器、終端機視圖、小工具、測試等）以及社群套件，各自標明適用於 Go、TSX 還是兩者，另有 `nsgo` 命令列工具。
- **UI 元件**：為 NSGo 應用打造的元件庫、主題與圖示。
- **狀態管理**：NSGo 內建的 signal、memo 和 context，以及為 NSGo 應用打造的狀態管理函式庫。
- **範本**：開發 NSGo 應用的起點，首先是 `nsgo init` 內建的 `go`、`tsx` 和 `mixed` 三個範本。
- **AI 工具**：幫助 AI 程式設計助理開發 NSGo 應用的 agent skill、MCP 服務與規則。
- **文件**：NSGo 官方文件、社群文章和官方資源（官網、元件參考、線上展示、範例和 NSH）。
- 用 <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> **搜尋**全部內容；想收錄某個專案時，提交表單會替你寫好條目。

網站支援簡體中文、繁體中文、英語、日語和韓語。每個頁面在每種語言下都有獨立網址（`?lang=en`），由伺服器端渲染，並帶有 hreflang 連結和 sitemap。篩選、排序和分頁也都記在網址裡（`/showcase?cat=dev&sort=newest`），分享出去的連結開啟的就是同一個畫面。

## 技術實作

pnpm monorepo，由 [TanStack Start](https://tanstack.com/start) 執行在 [Cloudflare Workers](https://workers.cloudflare.com) 上：

| 路徑 | 內容 |
|---|---|
| `apps/web` | 網站：React 19、TanStack Start（伺服器端渲染），以及帶 `@cloudflare/vite-plugin` 的 Vite。`wrangler.jsonc` 把它部署到 `awesomensgo.dev`。 |
| `packages/catalog` | 資料：`data/*.json`（應用、UI 元件、狀態方案、範本、AI 工具、外掛、文章、指南）及其 JSON Schema，五種語言的介面文案，搜尋與提交表單的條目。測試會驗證每個條目。 |
| `packages/enrich` | 補全提交 bot 開的 PR：從專案倉庫取應用圖示，截圖優先用表單裡上傳的圖片或填的連結、否則從倉庫取，並用 Claude 寫五種語言的文案。由 `.github/workflows/enrich-submission.yml` 執行。`.github/workflows/verify.yml` 每週還會核驗所有已收錄專案的倉庫，倉庫有變化的條目各開一個 PR：倉庫被刪除、轉為私有或被停用時下架條目，被改名或轉移時更新條目，補上缺少的 homepage，專案有了自己的圖片後替換臨時圖；倉庫被封存或不再用 NSGo 建置（`go.mod` 不再依賴 `github.com/oneo-me/nsgo`）時只在執行摘要裡列出。`.github/workflows/prune.yml` 每週還會開一個彙總 PR，提議下架達不到收錄標準的條目：收錄滿 30 天後評分低於 20、超過 180 天沒有提交、倉庫已封存或不再用 NSGo 建置；維護者合併才生效，保留過的條目不會再被提議。 |

應用圖示來自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)，由它的 CDN 提供；它未收錄的少數應用使用 `apps/web/public/icons/` 裡的官方圖示。

每個應用頁都有一張分享卡片：1200×630 的 PNG，包含應用的圖示、名稱、作者和截圖，連結預覽會顯示它。`vite build` 把卡片產生到 `/og/`（程式碼在 `apps/web/og`），所以 bot 新增的應用在部署時就有自己的卡片。產生卡片需要連網：建置時會下載 ai-logo 圖示，名稱裡有非拉丁文字時還會從 Google Fonts 取字形。

## 本機開發

需要 Node.js 24 或更新版本，以及 pnpm。

```sh
pnpm install
pnpm dev          # 本機網站，由 Workers 執行環境渲染
pnpm test         # catalog 測試
pnpm typecheck
pnpm build
pnpm preview      # 在 Workers 執行環境中執行正式建置
```

`pnpm deploy` 會用 Wrangler 建置並部署，需要一個包含 `apps/web/wrangler.jsonc` 中網域 zone 的 Cloudflare 帳戶。

表單的直接提交透過安裝在本倉庫上的 GitHub App 完成，前面有 Cloudflare Turnstile 人機驗證和依 IP 的限流。給這個 App 開 *Contents* 和 *Pull requests* 的讀寫權限，把它的私鑰轉成 PKCS#8（`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`），然後在 `apps/web` 下用 `wrangler secret put` 設定四個 secret：`GITHUB_APP_ID`、`GITHUB_APP_PRIVATE_KEY`（PKCS#8 檔案）、`TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`。四個都設好之前，表單只提供 GitHub 連結。本機測試時，把 Turnstile 的[測試金鑰](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)寫進 `apps/web/.dev.vars`。

穩定版 Chrome 只有透過 origin trial，才會為本站訪客開啟 WebMCP，提交表單的工具也隨之可用。在 [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/) 為正式網站的 origin（`https://awesomensgo.dev`）註冊 WebMCP 試用，然後在 `apps/web` 下用 `wrangler secret put WEBMCP_ORIGIN_TRIAL` 設定拿到的 token：此後每個頁面都會在 `<meta http-equiv="origin-trial">` 標籤裡帶上它，不設定就不帶。token 隨試用結束而失效，屆時重新註冊，或刪掉這個 secret。

作品、UI 元件、狀態管理、範本和 AI 工具都需要截圖。訪客填好倉庫連結後，表單會請 Worker（`/api/shot`）依 submission workflow 自己的規則（`packages/enrich/src/source.ts`）檢查倉庫裡有沒有它會採用的截圖；沒有，或者作品沒有倉庫時，表單會要求提供一張，Worker 也會拒絕沒有截圖的提交。訪客可以上傳圖片（PNG、JPEG 或 WebP，5 MB 以內，寬度至少 600 像素；應用的截圖可以是直向的手機畫面），也可以填圖片連結。上傳的圖片會以 `submissions/<slug>.<ext>` 提交到 PR 的分支上並顯示在 PR 裡，workflow 把它轉成站點用的 WebP 後刪除。這項檢查依 IP 限流，每分鐘 20 次。

bot 開出 PR 後，*Complete submission* workflow 會補上表單問不到的內容：應用圖示，依 NSGo 的查找方式取（`nsgo.yaml` 裡的 `icon.png`，路徑相對於該檔案，沒有則用它旁邊的 `assets/Icon.png`；`nsgo init` 不會產生圖示，所以從沒加過圖示的應用這裡也取不到）、README 裡第一張不是圖示或其他方形 logo 的截圖（直向的手機截圖也算），以及五種語言的簡介和介紹。UI 元件和狀態管理也會照同樣的方式補截圖，並從倉庫設定裡補 homepage；表單填了預設值的欄位（應用在作品集裡的分組 `group`，沒有另寫分類時分類隨分組而定、應用的 `platforms`、UI 元件的 `tag` 和 `surface`、外掛的 `surface`、狀態管理和外掛的 `tags`）由模型在寫文案時一併選定。它會跑 catalog 檢查，以 bot 身分推到同一分支，並在 PR 裡留言說明做了什麼；合併前仍需維護者審核。需要在倉庫的 Actions 設定裡配置 secret：`SUBMIT_APP_PRIVATE_KEY`（App 的 PKCS#8 私鑰，與 Worker 用的相同）、`LLM_API_KEY`（Anthropic Messages API 的金鑰），走閘道時再加 `LLM_BASE_URL`；以及變數 `SUBMIT_APP_CLIENT_ID`（App 的 Client ID）。變數 `LLM_MODEL` 可以換模型（預設 `claude-opus-5-5`）。沒有 `LLM_API_KEY` 時文案維持提交時的樣子。

透過表單的 Issue 連結送來的 Issue，會由 *Submission issue* workflow（`.github/workflows/issue-submission.yml`）開出同樣的 PR：它像 Worker 檢查貼上的條目那樣檢查這筆條目，包括所需的截圖和 16 KB 的上限，然後讓 bot 開出 PR（*Complete submission* 會在這個 PR 上執行），條目的收錄時間記為 Issue 的開啟時間，最後把 PR 連結留言到 Issue 上並關閉它。無法收錄的條目會收到一則留言，說明要改什麼，編輯 Issue 後會重新檢查；每個 Issue 上 bot 只保留一則留言。沒有表單產生的路徑行及其下方 json 程式碼區塊的 Issue 不會被處理。Issue 只需要 GitHub 帳號，不經過人機驗證，所以除了共用的 20 個待審提交上限之外，bot 對同一個人的 Issue 最多同時保留 2 個開啟的 PR。它使用同樣的 `SUBMIT_APP_PRIVATE_KEY` 和 `SUBMIT_APP_CLIENT_ID`；讀取、留言和關閉 Issue 用的是 workflow 自己的 token，所以 App 不需要 Issue 權限。要手動重新檢查某個 Issue，用它的編號執行這個 workflow 即可。

## 收錄專案

每個條目都是 [`packages/catalog/data`](packages/catalog/data) 下單獨的一個 JSON 檔案，放在所屬類別的目錄裡，以 `slug` 命名：

| 檔案 | 內容 |
|---|---|
| `apps/<slug>.json` | 用 NSGo 做的應用 |
| `ui/<slug>.json` | UI 元件庫 |
| `state/<slug>.json` | 狀態管理 |
| `templates/<slug>.json` | 範本 |
| `ai/<slug>.json` | AI 工具 |
| `plugins/<slug>.json` | 外掛 |
| `articles/<slug>.json` | 文章 |
| `docs/<slug>.json` | NSGo 官方指南 |

新增方式有兩種：

- **在網站上：** 點「提交」填表，或者直接貼上整條 JSON 條目，然後提交：不需要 GitHub 帳號，網站的 bot 會替你開 PR。有 GitHub 帳號的話，也可以把產生的條目提交為 Issue，網站的 bot 會把它變成同樣的 PR，或在 GitHub 編輯器裡開啟為這個條目新建的檔案自己加上。支援 [WebMCP](https://webmachinelearning.github.io/webmcp/) 的瀏覽器裡，AI 代理可以替你檢查條目、填好表單，由你核對後提交。
- **在倉庫裡：** 在所屬類別的目錄下加一個檔案，然後提 PR。

一個應用的檔案 `apps/my-app.json` 長這樣：

```json
{
  "$schema": "../schema/app.schema.json",
  "slug": "my-app",
  "name": "My App",
  "author": "your-github-login",
  "kind": "go",
  "platforms": ["mac", "win", "linux", "ios", "android"],
  "url": "https://my-app.dev",
  "repo": "you/my-app",
  "summary": { "en": "One line about the app.", "ja": "アプリの一行説明。" },
  "description": { "en": "A few sentences for the app's page." },
  "added": "2026-11-04T12:00:00Z"
}
```

- 檔名與 `slug` 相同。`added` 是條目加入網站的時間（UTC），網站 bot 會自動填寫，手動新增時寫目前時間。除官方指南外每個類別都有這個欄位：作品集可以依它把最新的應用排在前面，UI 元件庫、狀態管理、範本、AI 工具、文章和社群外掛依它從早到晚排列；官方外掛和官方指南依名稱排列。每個條目一個檔案，所以同時新增條目的多個 PR 不會互相衝突。
- 其他類別的檔案同樣在欄位外帶 `$schema`、`slug` 和 `added`（官方指南沒有 `added`），具體欄位見 `data/schema/` 裡對應的 schema。
- `kind` 表示應用用什麼寫：Go 寫的填 `go`，TSX 寫的填 `tsx`。`platforms` 列出應用能執行的平台，從 `mac`、`win`、`linux`、`ios`、`android`、`web`、`miniprogram` 中至少選一個。缺少這兩個欄位時 CI 會報錯。
- `url` 是應用首頁：官網，沒有官網就填倉庫網址，不要求在 GitHub 上。開源應用再用 `repo` 填 GitHub 倉庫（`owner/name`），閉源應用不填。
- 文字欄位依語言各寫一份。`en` 必填；`zh-CN`、`zh-TW`、`ja`、`ko` 可選，缺少的語言顯示英文。
- 每個檔案都在 `$schema` 裡指向自己的 JSON Schema（在 `data/schema/`），VS Code 等編輯器會在你輸入時補全並檢查欄位。
- 連結必須是 https。截圖請把寬約 1200px 的 WebP 放進 `apps/web/public/shots/`，並寫 `"screenshot": "my-app.webp"`。應用圖示寫 `"icon": { "ailogo": "<id>" }`，id 來自 [ai-logo](https://github.com/yldm-tech/ai-logo)；用應用自己的圖示時，把 128px 的 WebP 放進 `apps/web/public/icons/`，並寫 `"icon": { "file": "my-app.webp" }`。不寫則顯示字母圖示。
- `pnpm test` 會驗證每個條目，出錯時指出檔案、條目和欄位。CI 會在每個 PR 上執行它。

介面文案在 `packages/catalog/locales/`，每種語言一個 JSON 檔案，鍵完全相同。`zh-CN.json` 是基準：新增的鍵要同時加進其餘四個檔案；缺鍵或 `{x}`/`{n}` 佔位符不一致時，`pnpm typecheck` 和 `pnpm test` 會報錯。

## 致謝

- [NSGo](https://github.com/oneo-me/nsgo) 由 [ONEO](https://github.com/oneo-me) 開發（Apache-2.0），是 [NSH](https://nsh.dev) 的 Go 移植版。官方作品、外掛、範本和指南的資料以它的倉庫和[官網](https://oneo-me.github.io/nsgo/)為準。本站與 ONEO 沒有關聯，也未獲其背書。
- 應用圖示來自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)（MIT，分支自 LobeHub 的 [lobe-icons](https://github.com/lobehub/lobe-icons)）或應用自己的圖示；NSGo 官方作品的截圖來自 oneo-me/nsgo 的 `docs/public/cases`，其餘來自各專案的 README。兩者都歸各應用作者所有，名稱和標誌是其商標，僅用於識別。

## 授權

程式碼以 [MIT 授權](LICENSE) 發布。
