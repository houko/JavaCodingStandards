# Awesome NSGo

[![Website](https://img.shields.io/badge/website-awesomensgo.dev-007aff)](https://awesomensgo.dev)
[![CI](https://github.com/yldm-tech/awesome-nsgo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-nsgo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-nsgo)](LICENSE)

把围绕 [NSGo](https://github.com/oneo-me/nsgo) 的应用、包、组件和文档收集在一个站点里：**[awesomensgo.dev](https://awesomensgo.dev)**。NSGo 是 [ONEO](https://github.com/oneo-me) 开发的、以 Go 为后端的跨平台原生 UI 引擎：应用逻辑、响应式图和布局都在 Go 中运行，应用用 Go 或 TSX 写一次即可。它在 iOS 及其 App Clip（轻 App）、tvOS、watchOS、Android、macOS、Windows、Linux 和 Web 上用各平台自己的原生视图绘制，Go 应用还能运行在微信、QQ、支付宝和抖音小程序里。NSGo 还处在早期，尚未发布正式版本，也没有稳定的 API。

Awesome NSGo 是 yldm-tech 维护的非官方社区目录，不是 NSGo 的官方网站；官网是 [oneo-me.github.io/nsgo](https://oneo-me.github.io/nsgo/)。

[English](README.md) · 简体中文 · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Awesome NSGo](.github/assets/banner.png)](https://awesomensgo.dev)

## 站点内容

- **作品**：用 NSGo 做的应用，可按名称、最新或最热排序，并按分类、语言（Go 或 TSX）和平台（macOS、Windows、Linux、iOS、Android、Web 或小程序）筛选。每款都有自己的页面，包含完整介绍、截图（项目提供时）、用 Go 还是 TSX 编写、支持的平台、分类、收录时间，以及同一作者的其他作品。
- **插件**：NSGo 的官方包（都在 `github.com/oneo-me/nsgo` 这个模块里，包括桌面窗口与托盘、移动端标签栏、国际化、Lucide 图标、图表、数据表格、编辑器、终端视图、小组件、测试等）以及社区包，各自标明适用于 Go、TSX 还是两者，另有 `nsgo` 命令行工具。
- **UI 组件**：为 NSGo 应用做的组件库、主题与图标。
- **状态管理**：NSGo 自带的 signal、memo 和 context，以及为 NSGo 应用做的状态管理库。
- **模板**：开发 NSGo 应用的起点，首先是 `nsgo init` 自带的 `go`、`tsx` 和 `mixed` 三个模板。
- **AI 工具**：帮助 AI 编程助手开发 NSGo 应用的 agent skill、MCP 服务与规则。
- **文档**：NSGo 官方文档、社区文章和官方资源（官网、组件参考、在线演示、示例和 NSH）。
- 用 <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> **搜索**全部内容；想收录某个项目时，提交表单会替你写好条目。

站点支持简体中文、繁体中文、英语、日语和韩语。每个页面在每种语言下都有独立地址（`?lang=en`），由服务端渲染，并带有 hreflang 链接和 sitemap。筛选、排序和标签页也都记在地址里（`/showcase?cat=dev&sort=newest`），分享出去的链接打开的就是同一个视图。

## 技术实现

pnpm monorepo，由 [TanStack Start](https://tanstack.com/start) 运行在 [Cloudflare Workers](https://workers.cloudflare.com) 上：

| 路径 | 内容 |
|---|---|
| `apps/web` | 站点：React 19、TanStack Start（服务端渲染），以及带 `@cloudflare/vite-plugin` 的 Vite。`wrangler.jsonc` 把它部署到 `awesomensgo.dev`。 |
| `packages/catalog` | 数据：`data/*.json`（应用、UI 组件、状态方案、模板、AI 工具、插件、文章、指南）及其 JSON Schema，五种语言的界面文案，搜索与提交表单的条目。测试会校验每个条目。 |
| `packages/enrich` | 补全提交 bot 开的 PR：从项目仓库取应用图标，截图优先用表单里上传的图片或填的链接、否则从仓库取，并用 Claude 写五种语言的文案。由 `.github/workflows/enrich-submission.yml` 运行。`.github/workflows/verify.yml` 每周还会核验所有已收录项目的仓库，仓库有变化的条目各开一个 PR：仓库被删除、转为私有或被停用时下架条目，被改名或转移时更新条目，补上缺少的 homepage，项目有了自己的图片后替换临时图；仓库被归档或不再用 NSGo 构建（`go.mod` 不再依赖 `github.com/oneo-me/nsgo`）时只在运行摘要里列出。`.github/workflows/prune.yml` 每周还会开一个汇总 PR，提议下架达不到收录标准的条目：收录满 30 天后评分低于 20、超过 180 天没有提交、仓库已归档或不再用 NSGo 构建；维护者合并才生效，保留过的条目不会再被提议。 |

应用图标来自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)，由它的 CDN 提供；它未收录的少数应用使用 `apps/web/public/icons/` 里的官方图标。

每个应用页都有一张分享卡片：1200×630 的 PNG，包含应用的图标、名称、作者和截图，链接预览会显示它。`vite build` 把卡片生成到 `/og/`（代码在 `apps/web/og`），所以 bot 新加的应用在部署时就有自己的卡片。生成卡片需要联网：构建时会下载 ai-logo 图标，名称里有非拉丁文字时还会从 Google Fonts 取字形。

## 本地开发

需要 Node.js 24 或更高版本，以及 pnpm。

```sh
pnpm install
pnpm dev          # 本地站点，由 Workers 运行时渲染
pnpm test         # catalog 测试
pnpm typecheck
pnpm build
pnpm preview      # 在 Workers 运行时中运行生产构建
```

`pnpm deploy` 会用 Wrangler 构建并部署，需要一个包含 `apps/web/wrangler.jsonc` 中域名 zone 的 Cloudflare 账户。

表单的直接提交通过安装在本仓库上的 GitHub App 完成，前面有 Cloudflare Turnstile 人机验证和按 IP 的限流。给这个 App 开 *Contents* 和 *Pull requests* 的读写权限，把它的私钥转成 PKCS#8（`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`），然后在 `apps/web` 下用 `wrangler secret put` 设置四个 secret：`GITHUB_APP_ID`、`GITHUB_APP_PRIVATE_KEY`（PKCS#8 文件）、`TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`。四个都设好之前，表单只提供 GitHub 链接。本地测试时，把 Turnstile 的[测试密钥](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)写进 `apps/web/.dev.vars`。

稳定版 Chrome 只有通过 origin trial，才会为本站访客开启 WebMCP，提交表单的工具也随之可用。在 [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/) 为正式站点的 origin（`https://awesomensgo.dev`）注册 WebMCP 试用，然后在 `apps/web` 下用 `wrangler secret put WEBMCP_ORIGIN_TRIAL` 设置拿到的 token：此后每个页面都会在 `<meta http-equiv="origin-trial">` 标签里带上它，不设置就不带。token 随试用结束而失效，届时重新注册，或删掉这个 secret。

作品、UI 组件、状态管理、模板和 AI 工具都需要截图。访客填好仓库链接后，表单会请 Worker（`/api/shot`）按 submission workflow 自己的规则（`packages/enrich/src/source.ts`）检查仓库里有没有它会采用的截图；没有，或者作品没有仓库时，表单会要求提供一张，Worker 也会拒绝没有截图的提交。访客可以上传图片（PNG、JPEG 或 WebP，5 MB 以内，宽度至少 600 像素；应用的截图可以是竖版的手机界面），也可以填图片链接。上传的图片会以 `submissions/<slug>.<ext>` 提交到 PR 的分支上并显示在 PR 里，workflow 把它转成站点用的 WebP 后删除。这项检查按 IP 限流，每分钟 20 次。

bot 开出 PR 后，*Complete submission* workflow 会补上表单问不到的内容：应用图标，按 NSGo 的查找方式取（`nsgo.yaml` 里的 `icon.png`，路径相对于该文件，没有则用它旁边的 `assets/Icon.png`；`nsgo init` 不会生成图标，所以从没加过图标的应用这里也取不到）、README 里第一张不是图标或其他方形 logo 的截图（竖版的手机截图也算），以及五种语言的简介和介绍。UI 组件和状态管理也会照同样的方式补截图，并从仓库设置里补 homepage；表单填了默认值的字段（应用在作品集里的分组 `group`，没有另写分类时分类随分组而定、应用的 `platforms`、UI 组件的 `tag` 和 `surface`、插件的 `surface`、状态管理和插件的 `tags`）由模型在写文案时一并选定。它会跑 catalog 检查，以 bot 身份推到同一分支，并在 PR 里留言说明做了什么；合并前仍需维护者审核。需要在仓库的 Actions 设置里配置 secret：`SUBMIT_APP_PRIVATE_KEY`（App 的 PKCS#8 私钥，与 Worker 用的相同）、`LLM_API_KEY`（Anthropic Messages API 的密钥），走网关时再加 `LLM_BASE_URL`；以及变量 `SUBMIT_APP_CLIENT_ID`（App 的 Client ID）。变量 `LLM_MODEL` 可以换模型（默认 `claude-opus-5-5`）。没有 `LLM_API_KEY` 时文案保持提交时的样子。

通过表单的 Issue 链接发来的 Issue，会由 *Submission issue* workflow（`.github/workflows/issue-submission.yml`）开出同样的 PR：它像 Worker 检查粘贴的条目那样检查这条条目，包括所需的截图和 16 KB 的上限，然后让 bot 开出 PR（*Complete submission* 会在这个 PR 上运行），条目的收录时间记为 Issue 的开启时间，最后把 PR 链接评论到 Issue 上并关闭它。无法收录的条目会收到一条评论，说明要改什么，编辑 Issue 后会重新检查；每个 Issue 上 bot 只保留一条评论。没有表单生成的路径行及其下方 json 代码块的 Issue 不会被处理。Issue 只需要 GitHub 账号，不经过人机验证，所以除了共用的 20 个待审提交上限之外，bot 对同一个人的 Issue 最多同时保留 2 个打开的 PR。它使用同样的 `SUBMIT_APP_PRIVATE_KEY` 和 `SUBMIT_APP_CLIENT_ID`；读取、评论和关闭 Issue 用的是 workflow 自己的 token，所以 App 不需要 Issue 权限。要手动重新检查某个 Issue，用它的编号运行这个 workflow 即可。

## 收录项目

每个条目都是 [`packages/catalog/data`](packages/catalog/data) 下单独的一个 JSON 文件，放在所属类别的目录里，以 `slug` 命名：

| 文件 | 内容 |
|---|---|
| `apps/<slug>.json` | 用 NSGo 做的应用 |
| `ui/<slug>.json` | UI 组件库 |
| `state/<slug>.json` | 状态管理 |
| `templates/<slug>.json` | 模板 |
| `ai/<slug>.json` | AI 工具 |
| `plugins/<slug>.json` | 插件 |
| `articles/<slug>.json` | 文章 |
| `docs/<slug>.json` | NSGo 官方指南 |

添加方式有两种：

- **在站点上：** 点「提交」填表，或者直接粘贴整条 JSON 条目，然后提交：不需要 GitHub 账号，站点的 bot 会替你开 PR。有 GitHub 账号的话，也可以把生成的条目提交为 Issue，站点的 bot 会把它变成同样的 PR，或在 GitHub 编辑器里打开为这个条目新建的文件自己加上。支持 [WebMCP](https://webmachinelearning.github.io/webmcp/) 的浏览器里，AI 代理可以替你检查条目、填好表单，由你核对后提交。
- **在仓库里：** 在所属类别的目录下加一个文件，然后提 PR。

一个应用的文件 `apps/my-app.json` 长这样：

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

- 文件名与 `slug` 相同。`added` 是条目加入站点的时间（UTC），站点 bot 会自动填写，手动添加时写当前时间。除官方指南外每个类别都有这个字段：作品集可以按它把最新的应用排在前面，UI 组件库、状态管理、模板、AI 工具、文章和社区插件按它从早到晚排列；官方插件和官方指南按名字排列。每个条目一个文件，所以同时添加条目的多个 PR 不会互相冲突。
- 其他类别的文件同样在字段外带 `$schema`、`slug` 和 `added`（官方指南没有 `added`），具体字段见 `data/schema/` 里对应的 schema。
- `kind` 表示应用用什么写：Go 写的填 `go`，TSX 写的填 `tsx`。`platforms` 列出应用能运行的平台，从 `mac`、`win`、`linux`、`ios`、`android`、`web`、`miniprogram` 中至少选一个。缺少这两个字段时 CI 会报错。
- `url` 是应用主页：官网，没有官网就填仓库地址，不要求在 GitHub 上。开源应用再用 `repo` 填 GitHub 仓库（`owner/name`），闭源应用不填。
- 文本字段按语言各写一份。`en` 必填；`zh-CN`、`zh-TW`、`ja`、`ko` 可选，缺少的语言显示英文。
- 每个文件都在 `$schema` 里指向自己的 JSON Schema（在 `data/schema/`），VS Code 等编辑器会在你输入时补全并检查字段。
- 链接必须是 https。截图请把宽约 1200px 的 WebP 放进 `apps/web/public/shots/`，并写 `"screenshot": "my-app.webp"`。应用图标写 `"icon": { "ailogo": "<id>" }`，id 来自 [ai-logo](https://github.com/yldm-tech/ai-logo)；用应用自己的图标时，把 128px 的 WebP 放进 `apps/web/public/icons/`，并写 `"icon": { "file": "my-app.webp" }`。不写则显示字母图标。
- `pnpm test` 会校验每个条目，出错时指出文件、条目和字段。CI 会在每个 PR 上运行它。

界面文案在 `packages/catalog/locales/`，每种语言一个 JSON 文件，键完全相同。`zh-CN.json` 是基准：新增的键要同时加进其余四个文件；缺键或 `{x}`/`{n}` 占位符不一致时，`pnpm typecheck` 和 `pnpm test` 会报错。

## 致谢

- [NSGo](https://github.com/oneo-me/nsgo) 由 [ONEO](https://github.com/oneo-me) 开发（Apache-2.0），是 [NSH](https://nsh.dev) 的 Go 移植版。官方作品、插件、模板和指南的数据以它的仓库和[官网](https://oneo-me.github.io/nsgo/)为准。本站与 ONEO 没有关联，也未获其背书。
- 应用图标来自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)（MIT，分叉自 LobeHub 的 [lobe-icons](https://github.com/lobehub/lobe-icons)）或应用自己的图标；NSGo 官方作品的截图来自 oneo-me/nsgo 的 `docs/public/cases`，其余来自各项目的 README。两者都归各应用作者所有，名称和标志是其商标，仅用于识别。

## 许可证

代码以 [MIT 许可证](LICENSE) 发布。
