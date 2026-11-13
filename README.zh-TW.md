# Vibe Arcade

[English](README.md) · [简体中文](README.zh-CN.md) · 繁體中文 · [日本語](README.ja.md) · [한국어](README.ko.md)

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade 是一份人工整理的遊戲索引，收錄大家主要靠向 AI 模型下提示做出來、並發布在 X 上的遊戲。每個條目記錄製作遊戲的模型、作者、原始貼文及其按讚數，以及遊玩連結。這個儲存庫存放遊戲資料和展示它們的網站；遊戲本身仍屬於各自的作者，託管在他們自己的位址上。

## 收錄標準

符合以下三項的遊戲會被收錄：

- **主要由 AI 製作。** 程式碼、美術或音效由 AI 模型生成，而且作者說明了用的是哪個模型。
- **瀏覽器即玩。** 點一下就能玩，不必安裝，也沒有註冊牆。只有原始碼儲存庫或影片的遊戲也可以收錄，會另外標示。
- **發布在 X 上。** 每個條目都連結到作者的原始貼文，按讚數也取自這則貼文。

不限模型，不限引擎。按讚數是條目上次更新時的快照，不是即時數字。

## 提交遊戲

- 填寫 [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) issue 表單。表單需要遊戲名稱、作者的 X 帳號、貼文、連結、類型、模型和一句英文簡介。提交者不必是作者本人。
- 或者把遊戲連同可玩的連結發到 X 上，並標記 [@suzukaze_haduki](https://x.com/suzukaze_haduki)。

每筆提交都由策展人核對，封面取自貼文，條目的十種語言文字也由策展人撰寫。也歡迎直接發 pull request 新增遊戲檔案；簡介必須備齊十種語言，因為缺少任何一種，目錄都會拒絕這個條目。

## 遊戲檔案格式

每款遊戲是一個 JSON 檔案，位於 `packages/catalog/data/games/<slug>.json`，由 [`game.schema.json`](packages/catalog/data/schema/game.schema.json) 和目錄的測試驗證。以下是 [`saltline.json`](packages/catalog/data/games/saltline.json)，它用到了除 `creatorUrl` 之外的全部欄位（`creatorUrl` 的用法見 [`lanternfall.json`](packages/catalog/data/games/lanternfall.json)）：

```json
{
  "$schema": "../schema/game.schema.json",
  "slug": "saltline",
  "name": "Saltline",
  "creator": "felixrieseberg",
  "genre": "Shooter",
  "link": {
    "type": "play",
    "url": "https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp"
  },
  "post": "2119925633564463609",
  "likes": 14391,
  "model": "Claude Fable 5.2",
  "cover": "saltline.webp",
  "summary": {
    "en": "One-shot FPS. Models, sounds and textures all generated in code, no human feedback.",
    "zh-CN": "一次性提示生成的 FPS。模型、音效、纹理全部用代码生成，无人工反馈。",
    "zh-TW": "一次性提示生成的 FPS。模型、音效、材質全部用程式碼生成，無人工回饋。",
    "ja": "ワンショットで作られたFPS。モデル・音・テクスチャはすべてコード生成、人の手直しなし。",
    "ko": "원샷 프롬프트로 만든 FPS. 모델, 사운드, 텍스처 모두 코드로 생성, 사람 피드백 없음.",
    "es": "FPS hecho con prompts de una sola vez. Modelos, sonidos y texturas generados en código, sin feedback humano.",
    "fr": "Un FPS fait en prompts uniques. Modèles, sons et textures générés en code, sans retour humain.",
    "de": "Ein One-Shot-Shooter. Modelle, Sounds und Texturen komplett im Code erzeugt, ohne menschliches Feedback.",
    "pt-BR": "Um FPS feito com prompts únicos. Modelos, sons e texturas gerados em código, sem feedback humano.",
    "ru": "FPS из одноразовых промптов. Модели, звуки и текстуры сгенерированы кодом, без участия человека."
  },
  "pitch": {
    "en": "A first-person shooter built from one-shot prompts with no human feedback. Models, sounds and textures are all generated in code.",
    "zh-CN": "一款由一次性提示、无人工反馈做出的第一人称射击游戏。模型、音效和纹理全部由代码生成。",
    "zh-TW": "一款由一次性提示、無人工回饋做出的第一人稱射擊遊戲。模型、音效和材質全部由程式碼生成。",
    "ja": "人のフィードバックなし、ワンショットのプロンプトで作られたFPS。モデル・サウンド・テクスチャはすべてコードで生成。",
    "ko": "사람의 피드백 없이 원샷 프롬프트로 만든 1인칭 슈터. 모델, 사운드, 텍스처 모두 코드로 생성했습니다.",
    "es": "Un shooter en primera persona creado con prompts únicos, sin feedback humano. Modelos, sonidos y texturas generados en código.",
    "fr": "Un FPS construit à partir de prompts uniques, sans retour humain. Modèles, sons et textures sont tous générés en code.",
    "de": "Ein Ego-Shooter aus One-Shot-Prompts, ohne menschliches Feedback. Modelle, Sounds und Texturen sind komplett im Code erzeugt.",
    "pt-BR": "Um FPS criado com prompts únicos, sem feedback humano. Modelos, sons e texturas foram todos gerados em código.",
    "ru": "Шутер от первого лица, созданный одноразовыми промптами без участия человека. Модели, звуки и текстуры сгенерированы кодом."
  },
  "notes": {
    "time": "8h",
    "cost": "~$550",
    "tokens": "2.7M out · 445M in"
  }
}
```

| 欄位 | 必填 | 含義 |
| --- | --- | --- |
| `$schema` | 是 | 固定為 `../schema/game.schema.json`。 |
| `slug` | 是 | 去掉 `.json` 的檔名，也是遊戲在網站上的位址：名稱轉小寫，每一段 `a-z`、`0-9` 以外的連續字元換成一個連字號，頭尾不留連字號。`Portals: Endless Worlds` 對應 `portals-endless-worlds`。 |
| `name` | 是 | 遊戲名稱，依作者的寫法。 |
| `creator` | 是 | 作者的 X 帳號，不帶 `@`。 |
| `creatorUrl` | 否 | 作者頁面不是其 X 個人頁時填寫。不填則連結到 `https://x.com/<creator>`。 |
| `genre` | 是 | `Shooter`、`Racing`、`Action`、`Exploration`、`Sandbox`、`Story & sim`、`Puzzle & toys` 其中之一。 |
| `link.type` | 是 | `play` 表示能在瀏覽器裡執行的遊戲，`source` 表示原始碼儲存庫，`watch` 表示只能在影片裡看到的遊戲。 |
| `link.url` | `play` 和 `source` 必填 | 遊玩位址或原始碼位址。`watch` 條目可以不填，此時連結到貼文。 |
| `post` | 是 | 作者在 X 上的貼文 id，也就是貼文位址結尾的那串數字，寫成字串，因為它超出了 JSON 數字能表示的範圍。遊戲顯示的日期由這個 id 算出。 |
| `likes` | 是 | 條目上次更新時貼文的按讚數，整數。 |
| `model` | 是 | 製作遊戲所用的 AI 模型，依作者的稱呼。 |
| `cover` | 是 | 封面檔名 `<slug>.webp`：一張 960x600 的圖片，放在 `apps/web/public/covers/`。 |
| `summary` | 是 | 卡片上的一句話簡介，十種語言齊全。 |
| `pitch` | 否 | 遊戲詳情頁和入選精選時顯示的較長介紹，十種語言齊全。 |
| `notes` | 否 | 作者公布的製作數據，原樣照錄：可以有 `time`、`cost`、`tokens`、`prompts`、`lines`、`size`、`agents`，以及生成遊戲所用的提示詞 `prompt`。顯示為遊戲的「製作數據」。 |

## 語言

網站和每款遊戲的簡介都有十種語言：English（`en`，預設）、简体中文（`zh-CN`）、繁體中文（`zh-TW`）、日本語（`ja`）、한국어（`ko`）、Español（`es`）、Français（`fr`）、Deutsch（`de`）、Português（`pt-BR`）和 Русский（`ru`）。英文使用不帶參數的位址，其他語言使用 `?lang=<code>`。介面文案在 `packages/catalog/locales/<code>.json`，每種語言一個檔案，鍵相同。

## 儲存庫結構

一個 pnpm monorepo，包含兩個套件：

```text
apps/web/                  @vibe-arcade/web：網站，TanStack Start（React 19），在 Cloudflare Workers 上算繪
  src/                     路由、元件和樣式
  public/covers/           遊戲封面，<slug>.webp
  public/videos/           遊戲的無聲短片，<slug>.mp4；hero/<slug>.mp4 供首屏播放
  public/avatars/          創作者頭像，<handle>.webp
  public/fonts/            自行託管的網頁字型
  og/                      在建置時繪製分享圖的 Vite 外掛
  scripts/                 fetch-covers.ts、fetch-media.ts、site-icons.ts、banner.ts
  wrangler.jsonc           Cloudflare Workers 設定
packages/catalog/          @vibe-arcade/catalog：資料以及由它衍生的一切
  data/games/              每款遊戲一個 JSON 檔案
  data/schema/             game.schema.json
  data/meta.json           資料最後變更的日期，即網站上的「最近更新」，以及本週精選
  data/media.json          哪些遊戲有短片、哪些創作者有頭像，由 fetch-media.ts 寫入
  locales/                 介面文案，每種語言一個檔案
  src/                     載入與驗證、篩選、語言、網站常數
.github/
  ISSUE_TEMPLATE/          Submit a game 表單
  workflows/ci.yml         在每個 pull request 和 main 上做型別檢查、測試和建置
  workflows/links.yml      每週檢查所有遊戲連結
```

每週的[連結檢查](.github/workflows/links.yml)會請求每款遊戲的遊玩或原始碼連結，並維護一個標題為「Dead game links」的 issue，列出不再回應的連結。它從不修改資料。

## 開發

需要 Node.js 24 或更新版本，以及 pnpm。

```sh
pnpm install     # 安裝相依套件
pnpm dev         # 在本機執行網站
pnpm test        # 執行兩個套件的測試
pnpm typecheck   # 對兩個套件做型別檢查
pnpm build       # 建置網站，包含分享圖
```

`apps/web` 裡有三個指令碼，它們寫出的檔案需要提交：

```sh
pnpm --filter @vibe-arcade/web covers   # 從每款遊戲的 X 貼文抓取封面到 public/covers/
pnpm --filter @vibe-arcade/web media    # 從每款遊戲的 X 貼文剪出短片並抓取創作者頭像（需要 ffmpeg）
pnpm --filter @vibe-arcade/web icons    # 依 public/favicon.svg 重新產生圖示
pnpm --filter @vibe-arcade/web banner   # 重新產生本檔案頂端的 .github/assets/banner.png
```

`covers` 會保留已存在的封面，除非加上 `--force`；可以傳入 slug 來限定範圍；加上 `--likes` 還會更新遊戲檔案裡的按讚數；只要有按讚數變動，它就把 `packages/catalog/data/meta.json` 裡的日期（網站上顯示的「最近更新」）改成當天。新增遊戲時，這個日期需要手動修改。`media` 從每款遊戲貼文的影片裡剪出六秒無聲短片存入 `public/videos/`，為按讚最多的六款再剪一段更大的供首屏播放，並把親自發文的創作者的頭像存入 `public/avatars/`。它把結果列在 `packages/catalog/data/media.json` 裡，這個檔案要和媒體檔案一起提交。它同樣會保留已存在的檔案，除非加上 `--force`，也可以傳入 slug。本週精選是 `meta.json` 裡 `picks` 下的 slug，手動維護。

## 部署

網站執行在 Cloudflare Workers 上，用 wrangler 部署：

```sh
pnpm run deploy
```

這道指令會建置網站，並依 [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc) 執行 `wrangler deploy`；需要登入 Cloudflare，並有權存取其中指定的帳號。網站的公開位址是 [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts) 裡的 `SITE_URL` 常數，只在這一處定義：canonical 連結、網站地圖和分享圖都從那裡讀取。

## 致謝

遊戲、名稱、封面、短片和商標歸各自的作者所有。封面和短片取自作者在 X 上發布的貼文，頭像是他們的 X 頭像。作者如需修改或下架條目，可以在 X 上聯絡 [@suzukaze_haduki](https://x.com/suzukaze_haduki)，或開一個 issue。Vibe Arcade 是一份社群索引，與 Anthropic 或其他任何模型廠商均無關聯。

Vibe Arcade 是 [Wiz Games](https://wiz.games) 的專案，由 [@suzukaze_haduki](https://x.com/suzukaze_haduki) 策展。

## 授權

程式碼以 [MIT 授權條款](LICENSE)釋出。該授權不涵蓋遊戲及其封面、短片，也不涵蓋創作者的頭像。
