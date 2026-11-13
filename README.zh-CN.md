# Vibe Arcade

[English](README.md) · 简体中文 · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**[vibe.wiz.games](https://vibe.wiz.games/?lang=zh-CN)** · [提交游戏](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) · [游戏列表](#游戏列表) · [收录标准](#收录标准)

[![CI](https://github.com/yldm-tech/awesome-vibe-games/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-vibe-games/actions/workflows/ci.yml)

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade 是 AI 游戏的街机厅：一份人工整理的浏览器游戏索引，收录大家主要靠向 AI 模型下提示做出来、并发布在 X 上的游戏。每个条目记录制作游戏的模型、作者、原帖及其点赞数，以及游玩链接。这个仓库存放游戏数据和展示它们的网站 [vibe.wiz.games](https://vibe.wiz.games/?lang=zh-CN)；游戏本身仍属于各自的作者，托管在他们自己的地址上。

## 网站上有什么

- **一键开玩。** 每张卡片都直接链接到浏览器里的游戏，以及作者在 X 上的原帖。
- **看它是怎么做出来的。** 每款游戏都标注了制作模型；作者公布过的话，还有制作时长、花费、token 数和提示词原文。
- **先看再玩。** 首屏和鼠标悬停的卡片会播放取自作者帖子的无声短片。
- **按自己的方式找游戏。** 按类型、模型或创作者筛选，按标题搜索，按点赞或日期排序。每个视图都是可以分享的地址，每款游戏也有自己的页面。
- **十种语言。** 界面和每款游戏的简介都有十种语言，英语在不带参数的地址，其余语言在 `?lang=<code>`。

![Vibe Arcade 首页](.github/assets/screenshot.png)

## 游戏列表

网站上的全部游戏，按点赞数从高到低排列。游戏名链接到它在 Vibe Arcade 上的页面，最后一列链接到游戏本身和作者的原帖。这份列表由 `packages/catalog/data/games/` 里的数据生成，用 `pnpm --filter @vibe-arcade/web readme` 重新生成。

<!-- games:start -->
**38** 款游戏 · **31** 位作者 · **2** 个 AI 模型

| # | 游戏 | 作者 | 类型 | 模型 | |
| --- | --- | --- | --- | --- | --- |
| 1 | [**Starry Night Rider**](https://vibe.wiz.games/games/starry-night-rider?lang=zh-CN)<br>跟着梵高骑行穿过他的《星月夜》。 | [@ebbyamir](https://x.com/ebbyamir) | 探索 | Claude Fable 5.2 | [游玩](https://starrynightrider.com) · [原帖](https://x.com/i/status/2120284261089673376) |
| 2 | [**Saltline**](https://vibe.wiz.games/games/saltline?lang=zh-CN)<br>一次性提示生成的 FPS。模型、音效、纹理全部用代码生成，无人工反馈。 | [@felixrieseberg](https://x.com/felixrieseberg) | 射击 | Claude Fable 5.2 | [游玩](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp) · [原帖](https://x.com/i/status/2119925633564463609) |
| 3 | [**What the Water Keeps**](https://vibe.wiz.games/games/what-the-water-keeps?lang=zh-CN)<br>平静的小船之旅，穿过八个梦境般的世界。 | [@kevin_t_ngo](https://x.com/kevin_t_ngo) | 探索 | Claude Fable 5.2 | [游玩](https://what-the-water-keeps.vercel.app/) · [原帖](https://x.com/i/status/2119868968307695818) |
| 4 | [**Mirror Earth**](https://vibe.wiz.games/games/mirror-earth?lang=zh-CN)<br>整个地球都是可破坏的游戏世界，天气与真实地球同步。 | [@mattshumer_](https://x.com/mattshumer_) | 沙盒 | Claude Fable 5.2 | [游玩](https://www.spawn.co/@mattshumer/earth) · [原帖](https://x.com/i/status/2119877065701036047) |
| 5 | [**Portals: Endless Worlds**](https://vibe.wiz.games/games/portals-endless-worlds?lang=zh-CN)<br>450+ 个纯代码 3D 世界由传送门相连，由 25,000 个智能体建造。 | [@emollick](https://x.com/emollick) | 探索 | Claude Fable 5.2 | [游玩](https://portals-endless-worlds.netlify.app/) · [原帖](https://x.com/i/status/2119918307457577163) |
| 6 | [**Evensong**](https://vibe.wiz.games/games/evensong?lang=zh-CN)<br>黑暗奇幻 Boss 战，可在浏览器中游玩。 | [@kevin_t_ngo](https://x.com/kevin_t_ngo) | 动作 | Claude Fable 5.2 | [观看](https://x.com/i/status/2120238844754923874) |
| 7 | [**雾锁山门**](https://vibe.wiz.games/games/wu-suo-shan-men?lang=zh-CN)<br>一个下午、45 亿 token：模型、场景、动作和优化全塞进一个 30 MB 的 HTML 文件。 | [@op7418](https://x.com/op7418) | 动作 | Claude Fable 5.2 | [游玩](https://op7418.github.io/guizang-game-skill/) · [原帖](https://x.com/i/status/2120694045299327187) |
| 8 | [**Voxel Engine**](https://vibe.wiz.games/games/voxel-engine?lang=zh-CN)<br>带音效的体素引擎，一句提示生成。 | [@mattshumer_](https://x.com/mattshumer_) | 沙盒 | Claude Fable 5.2 | [游玩](https://www.spawn.co/@mattshumer/voxel-engine) · [原帖](https://x.com/i/status/2119870965106483384) |
| 9 | [**Siege Wing**](https://vibe.wiz.games/games/siege-wing?lang=zh-CN)<br>驾驶直升机闯入中世纪战场，用加农炮、火箭和导弹对抗弩炮与城堡。 | [@builderjaydub](https://x.com/builderjaydub) | 射击 | Claude Fable 5.2 | [游玩](https://bannerfall.itch.io/siege-wing) · [原帖](https://x.com/i/status/2120223731520040966) |
| 10 | [**I Would Have Gotten Away With It**](https://vibe.wiz.games/games/i-would-have-gotten-away-with-it?lang=zh-CN)<br>反向《史酷比》：你是反派，负责吓跑那群多管闲事的孩子。 | [@emollick](https://x.com/emollick) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://i-would-have-gotten-away-with-it.netlify.app/) · [原帖](https://x.com/i/status/2119876449494540554) |
| 11 | [**Patchwork Quilt**](https://vibe.wiz.games/games/patchwork-quilt?lang=zh-CN)<br>拼布定格动画风格的玩具世界。 | [@BlendiByl](https://x.com/BlendiByl) | 解谜与玩具 | Claude Fable 5.2 | [游玩](https://patch.gg/blendi/patchwork-quilt) · [原帖](https://x.com/i/status/2120746541636047347) |
| 12 | [**Childhood Rug Racer**](https://vibe.wiz.games/games/childhood-rug-racer?lang=zh-CN)<br>在童年的游戏地毯上开玩具车赛跑。 | [@noclipepe](https://x.com/noclipepe) | 竞速 | GPT-6.2 Sol vs Fable | [游玩](https://noclipepe.pages.dev/rug/) · [原帖](https://x.com/i/status/2119728047754547326) |
| 13 | [**Cloud Stunt 3D**](https://vibe.wiz.games/games/cloud-stunt-3d?lang=zh-CN)<br>30 分钟生成的特技游戏。 | [@jev_chat](https://x.com/jev_chat) | 竞速 | Claude Fable 5.2 | [游玩](https://finderchangchang.github.io/cloud-stunt-3d/) · [原帖](https://x.com/i/status/2120015641151426838) |
| 14 | [**Hogwarts Royale**](https://vibe.wiz.games/games/hogwarts-royale?lang=zh-CN)<br>一句提示生成的魔法学院大逃杀。 | [@mattshumer_](https://x.com/mattshumer_) | 动作 | Claude Fable 5.2 | [游玩](https://www.spawn.co/@mattshumer/hogwarts-royale) · [原帖](https://x.com/i/status/2119872098306810226) |
| 15 | [**Dread and District**](https://vibe.wiz.games/games/dread-and-district?lang=zh-CN)<br>奇幻物流模拟：好的供应链打败邪恶。由一群智能体协作完成。 | [@emollick](https://x.com/emollick) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://dread-and-district.netlify.app) · [原帖](https://x.com/i/status/2120248525254742318) |
| 16 | [**Worm Rider**](https://vibe.wiz.games/games/worm-rider?lang=zh-CN)<br>用 Claude Code 构建的 220 KB 开源游戏。 | [@AmirMushich](https://x.com/AmirMushich) | 动作 | Claude Fable 5.2 | [源码](https://github.com/amirmushichge/worm-rider) · [原帖](https://x.com/i/status/2119937977426338283) |
| 17 | [**Maad Maxxing**](https://vibe.wiz.games/games/maad-maxxing?lang=zh-CN)<br>100% 代码，零素材。Three.js + WebGPU，前 3 关可玩。 | [@Andrew_Blumson](https://x.com/Andrew_Blumson) | 竞速 | Claude Fable 5.2 | [游玩](https://maad-maxxing.vercel.app) · [原帖](https://x.com/i/status/2120599812512833557) |
| 18 | [**Frontline Warfare Deathmatch**](https://vibe.wiz.games/games/frontline-warfare-deathmatch?lang=zh-CN)<br>浏览器里的军事射击死斗。 | [@alightinastorm](https://x.com/alightinastorm) | 射击 | Claude Fable 5.2 | [游玩](https://spawn.co/@robot/frontline-warfare-deathmatch) · [原帖](https://x.com/i/status/2120020469487440210) |
| 19 | [**Lanternfall**](https://vibe.wiz.games/games/lanternfall?lang=zh-CN)<br>模型、动画、特效全部生成，连敌人死亡帧都不放过。 | [@loktar00](https://github.com/loktar00) | 动作 | Claude Fable 5.2 | [游玩](https://loktar00.github.io/lanternfall/) · [原帖](https://x.com/i/status/2120279060303520034) |
| 20 | [**Rambo Dino**](https://vibe.wiz.games/games/rambo-dino?lang=zh-CN)<br>Chrome 小恐龙游戏，改造成动作游戏。 | [@noclipepe](https://x.com/noclipepe) | 动作 | Claude Fable 5.2 | [游玩](https://noclipepe.pages.dev/dino) · [原帖](https://x.com/i/status/2119927838321328577) |
| 21 | [**Turbo Tails**](https://vibe.wiz.games/games/turbo-tails?lang=zh-CN)<br>3D 卡丁车：六名车手、漂移、跳台、道具，支持多人。 | [@petergyang](https://x.com/petergyang) | 竞速 | Claude Fable 5.2 | [游玩](https://turbo-tails.vercel.app) · [原帖](https://x.com/i/status/2119901658394358005) |
| 22 | [**Spud Smash**](https://vibe.wiz.games/games/spud-smash?lang=zh-CN)<br>一颗土豆，砸烂并烧掉蓝色椅子。 | [@argofowl](https://x.com/argofowl) | 动作 | Claude Fable 5.2 | [游玩](https://fowllabs.com/fable-5-2/spud-smash) · [原帖](https://x.com/i/status/2119913148929187960) |
| 23 | [**Skyflare**](https://vibe.wiz.games/games/skyflare?lang=zh-CN)<br>三小时做出来的战斗机游戏。 | [@AugustCastilIo](https://x.com/AugustCastilIo) | 射击 | Claude Fable 5.2 | [游玩](https://skyflare-game.vercel.app) · [原帖](https://x.com/i/status/2120290751502581879) |
| 24 | [**Feed the Backrooms**](https://vibe.wiz.games/games/feed-the-backrooms?lang=zh-CN)<br>扮演怪物，抓捕迷失在后室的人。 | [@LexnLin](https://x.com/LexnLin) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://feed-backrooms.vercel.app) · [原帖](https://x.com/i/status/2119966127149429093) |
| 25 | [**Stray Cat**](https://vibe.wiz.games/games/stray-cat?lang=zh-CN)<br>救小猫、吓跑狗、直面老公猫。音效由代码合成。 | [@aimikoda](https://x.com/aimikoda) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://claude.ai/artifact/4nPXUKJjQWNsZEHVNmXXCt) · [原帖](https://x.com/i/status/2120120133712593118) |
| 26 | [**Tilt Labyrinth**](https://vibe.wiz.games/games/tilt-labyrinth?lang=zh-CN)<br>约 2,000 行 Three.js 写成的木制滚珠迷宫。 | [@mylifcc](https://x.com/mylifcc) | 解谜与玩具 | Claude Fable 5.2 | [游玩](https://blog.silencestar.com/posts/tilt-labyrinth/play/) · [原帖](https://x.com/i/status/2120054646282870910) |
| 27 | [**Tiny Planet**](https://vibe.wiz.games/games/tiny-planet?lang=zh-CN)<br>一颗可以四处走动的小星球。开源。 | [@prasenx](https://x.com/prasenx) | 探索 | Claude Fable 5.2 | [源码](https://github.com/StarKnightt/tiny-planet) · [原帖](https://x.com/i/status/2120188077855613174) |
| 28 | [**The Vast Horizon**](https://vibe.wiz.games/games/the-vast-horizon?lang=zh-CN)<br>多人共享一片湖冲浪。输入一个词，世界就随之改变。 | [@OdinLovis](https://x.com/OdinLovis) | 探索 | Claude Fable 5.2 | [游玩](https://the-vast-horizon.vercel.app) · [原帖](https://x.com/i/status/2120198469755503091) |
| 29 | [**Dead Headway**](https://vibe.wiz.games/games/dead-headway?lang=zh-CN)<br>专为速通打造的小游戏。 | [@AugustCastilIo](https://x.com/AugustCastilIo) | 动作 | Claude Fable 5.2 | [游玩](https://dead-headway.vercel.app) · [原帖](https://x.com/i/status/2120628693420904489) |
| 30 | [**Silicon Seduction**](https://vibe.wiz.games/games/silicon-seduction?lang=zh-CN)<br>逃出去，别被诱惑。 | [@ZryMiller](https://x.com/ZryMiller) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://silicon-seduction.vercel.app/) · [原帖](https://x.com/i/status/2119918766691954691) |
| 31 | [**Reef Dive**](https://vibe.wiz.games/games/reef-dive?lang=zh-CN)<br>用鱼叉捕鱼、躲避鲨鱼、驾驶潜艇，下潜 140 米直达蓝洞。 | [@boona11](https://x.com/boona11) | 探索 | Claude Fable 5.2 | [游玩](https://wavedash.com/games/reef-dive) · [原帖](https://x.com/i/status/2120482516733702472) |
| 32 | [**Bayhaven**](https://vibe.wiz.games/games/bayhaven?lang=zh-CN)<br>在 3.2 公里的海滨开车漂移，14 种载具，从城市公交到会跳的低底盘车。 | [@FablestarGames](https://x.com/FablestarGames) | 沙盒 | Claude Fable 5.2 | [游玩](https://fablestar.games/play/) · [原帖](https://x.com/i/status/2120641504951603394) |
| 33 | [**Roost**](https://vibe.wiz.games/games/roost?lang=zh-CN)<br>越野摩托赛车：AI 对手、氮气加速、车把视角。 | [@tejas3732](https://x.com/tejas3732) | 竞速 | Claude Fable 5.2 | [游玩](https://claude.ai/artifact/DLnFodkTwvawCNwurDmSZK) · [原帖](https://x.com/i/status/2120091513657139549) |
| 34 | [**Courtyard Kings**](https://vibe.wiz.games/games/courtyard-kings?lang=zh-CN)<br>四角色格斗游戏，含 39 段语音与音效。 | [@promodenstudio](https://x.com/promodenstudio) | 动作 | Claude Fable 5.2 | [游玩](https://claude.ai/artifact/1QGGhB68jMCjjjeeKtKNUo) · [原帖](https://x.com/i/status/2120085977079107788) |
| 35 | [**Tria Prima**](https://vibe.wiz.games/games/tria-prima?lang=zh-CN)<br>黑暗奇幻炼金术：开放世界岛屿上的五个任务。 | [@winchxyz](https://x.com/winchxyz) | 剧情与模拟 | Claude Fable 5.2 | [游玩](https://winchxyz.github.io/tria-prima/) · [原帖](https://x.com/i/status/2120078399482020160) |
| 36 | [**Stonehenge Solstice**](https://vibe.wiz.games/games/stonehenge-solstice?lang=zh-CN)<br>一个 HTML 文件里的巨石阵：草地、阴影与夏至太阳轨迹。 | [@MeltTheManual](https://x.com/MeltTheManual) | 解谜与玩具 | Claude Fable 5.2 | [游玩](https://meltthemanual.github.io/stonehenge-solstice/) · [原帖](https://x.com/i/status/2119926820963532984) |
| 37 | [**Fortnite in Three.js**](https://vibe.wiz.games/games/fortnite-in-three-js?lang=zh-CN)<br>用 Three.js 复刻的大逃杀。 | [@aabyzov](https://x.com/aabyzov) | 动作 | Claude Fable 5.2 | [游玩](https://anton-abyzov.github.io/fortnite-3js/) · [原帖](https://x.com/i/status/2120702690845933702) |
| 38 | [**Vippi**](https://vibe.wiz.games/games/vippi?lang=zh-CN)<br>快节奏街机风格第一人称射击。 | [@Shrit1401](https://x.com/Shrit1401) | 射击 | Claude Fable 5.2 | [游玩](https://vippi.vercel.app/) · [原帖](https://x.com/i/status/2120060593763926314) |
<!-- games:end -->

## 收录标准

满足以下三条的游戏会被收录：

- **主要由 AI 制作。** 代码、美术或音效由 AI 模型生成，并且作者说明了用的是哪个模型。
- **浏览器即玩。** 点一下就能玩，无需安装，也没有注册墙。只有源码仓库或视频的游戏也可以收录，会单独标注。
- **发布在 X 上。** 每个条目都链接到作者的原帖，点赞数也取自这条帖子。

不限模型，不限引擎。点赞数是条目上次更新时的快照，不是实时数字。

## 提交游戏

- 填写 [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) issue 表单。表单需要游戏名、作者的 X 账号、帖子、链接、类型、模型和一句英文简介。提交者不必是作者本人。
- 或者把游戏连同可玩的链接发到 X 上，并 @ [@suzukaze_haduki](https://x.com/suzukaze_haduki)。

[投稿工作流](.github/workflows/submissions.yml)会在几分钟内自动上架游戏，全程无人值守。它会检查帖子是否存在、是否由作者本人发布，游玩或源码链接能否打开，游戏是否已收录；然后从帖子取封面、短片和作者头像，开一个关闭该 issue 的 PR，CI 通过后自动合并并部署网站。如果有问题，它会在 issue 里说明，编辑 issue 就会重试。简介先以英文上线，其他语言在翻译前显示英文。也欢迎直接提 pull request 添加游戏文件。

## 游戏文件格式

每款游戏是一个 JSON 文件，位于 `packages/catalog/data/games/<slug>.json`，由 [`game.schema.json`](packages/catalog/data/schema/game.schema.json) 和目录的测试校验。下面是 [`saltline.json`](packages/catalog/data/games/saltline.json)，它用到了除 `creatorUrl` 之外的全部字段（`creatorUrl` 的用法见 [`lanternfall.json`](packages/catalog/data/games/lanternfall.json)）：

<details>
<summary><code>saltline.json</code> 的完整内容</summary>

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

</details>

| 字段 | 必填 | 含义 |
| --- | --- | --- |
| `$schema` | 是 | 固定为 `../schema/game.schema.json`。 |
| `slug` | 是 | 去掉 `.json` 的文件名，也是游戏在网站上的地址：名称转小写，每一段 `a-z`、`0-9` 以外的连续字符换成一个连字符，首尾不留连字符。`Portals: Endless Worlds` 对应 `portals-endless-worlds`。 |
| `name` | 是 | 游戏名，按作者的写法。 |
| `creator` | 是 | 作者的 X 账号，不带 `@`。 |
| `creatorUrl` | 否 | 作者主页不是其 X 主页时填写。不填则链接到 `https://x.com/<creator>`。 |
| `genre` | 是 | `Shooter`、`Racing`、`Action`、`Exploration`、`Sandbox`、`Story & sim`、`Puzzle & toys` 之一。 |
| `link.type` | 是 | `play` 表示能在浏览器里运行的游戏，`source` 表示源码仓库，`watch` 表示只能在视频里看到的游戏。 |
| `link.url` | `play` 和 `source` 必填 | 游玩地址或源码地址。`watch` 条目可以不填，此时链接到帖子。 |
| `post` | 是 | 作者在 X 上的帖子 id，即帖子地址末尾的那串数字，写成字符串，因为它超出了 JSON 数字能表示的范围。游戏显示的日期从这个 id 算出。 |
| `likes` | 是 | 条目上次更新时帖子的点赞数，整数。 |
| `model` | 是 | 制作游戏所用的 AI 模型，按作者的叫法。 |
| `cover` | 是 | 封面文件名 `<slug>.webp`：一张 960x600 的图片，放在 `apps/web/public/covers/`。 |
| `summary` | 是 | 卡片上的一句话简介。`en` 必填；其他语言可选，未填写时显示英文。 |
| `pitch` | 否 | 游戏详情页和入选精选时显示的较长介绍，语言规则同 `summary`。 |
| `notes` | 否 | 作者公布的制作数据，原样照录：可以有 `time`、`cost`、`tokens`、`prompts`、`lines`、`size`、`agents`，以及生成游戏所用的提示词 `prompt`。显示为游戏的“制作数据”。 |
| `down` | 否 | 游戏被标记为链接失效的日期（`YYYY-MM-DD`）。由每日链接检查通过它的 PR 写入和移除；带这个字段时游戏仍会展示，但会注明链接失效，并改为指向作者的原帖。 |

## 语言

网站和每款游戏的简介都有十种语言：English（`en`，默认）、简体中文（`zh-CN`）、繁體中文（`zh-TW`）、日本語（`ja`）、한국어（`ko`）、Español（`es`）、Français（`fr`）、Deutsch（`de`）、Português（`pt-BR`）和 Русский（`ru`）。英文使用不带参数的地址，其他语言使用 `?lang=<code>`。界面文案在 `packages/catalog/locales/<code>.json`，每种语言一个文件，键相同。

## 仓库结构

一个 pnpm monorepo，包含两个包：

```text
apps/web/                  @vibe-arcade/web：网站，TanStack Start（React 19），在 Cloudflare Workers 上渲染
  src/                     路由、组件和样式
  public/covers/           游戏封面，<slug>.webp
  public/avatars/          创作者头像，<handle>.webp
  public/fonts/            自托管的网页字体
  .media/                  fetch-media.ts 剪出的短片，仅保存在本地（git 忽略）；网站从 R2 存储桶 vibe-arcade-media 提供它们
  og/                      在构建时绘制分享图的 Vite 插件
  scripts/                 fetch-covers.ts、fetch-media.ts、readme-games.ts、site-icons.ts、banner.ts
  wrangler.jsonc           Cloudflare Workers 配置
packages/catalog/          @vibe-arcade/catalog：数据以及由它派生的一切
  data/games/              每款游戏一个 JSON 文件
  data/schema/             game.schema.json
  data/meta.json           数据最后变更的日期，即站点上的“最近更新”，以及本周精选
  data/media.json          哪些游戏有短片、哪些创作者有头像，由 fetch-media.ts 写入
  locales/                 界面文案，每种语言一个文件
  src/                     加载与校验、筛选、语言、站点常量
.github/
  ISSUE_TEMPLATE/          Submit a game 表单
  workflows/ci.yml         在每个 pull request 和 main 上做类型检查、测试和构建
  workflows/deploy.yml     main 上 CI 通过后部署到 Cloudflare Workers
  workflows/links.yml      每天检查所有游戏链接，链接持续失效的游戏会收到一个标记用的 PR
```

每天的[链接检查](.github/workflows/links.yml)会请求每款游戏的游玩或源码链接。不再响应的链接会列在一个标题为“Dead game links”的 issue 里，issue 同时记录它连续多少次检查都失效。连续三次之后，游戏会被标记为链接失效（游戏文件里的 `down`），所以主机只宕机一天不会触发标记；被标记的游戏链接恢复响应后，标记会被去掉。每次变更都通过一个 PR 落地，CI 通过后自动合并并部署网站。如果游戏只是换了地址，改正它的 `link.url` 即可，下次检查时标记会自动去掉。

## 开发

需要 Node.js 24 或更高版本，以及 pnpm。

```sh
pnpm install     # 安装依赖
pnpm dev         # 在本地运行网站
pnpm test        # 运行两个包的测试
pnpm typecheck   # 对两个包做类型检查
pnpm build       # 构建网站，包括分享图
```

`apps/web` 里的这些脚本写出的文件需要提交：

```sh
pnpm --filter @vibe-arcade/web covers   # 从每款游戏的 X 帖子抓取封面到 public/covers/
pnpm --filter @vibe-arcade/web media    # 从每款游戏的 X 帖子剪出短片并抓取创作者头像（需要 ffmpeg）
pnpm --filter @vibe-arcade/web icons    # 根据 public/favicon.svg 重新生成图标
pnpm --filter @vibe-arcade/web banner   # 重新生成本文件顶部的 .github/assets/banner.png
pnpm --filter @vibe-arcade/web readme   # 根据数据重新生成各 README 里的游戏列表
```

`covers` 会保留已存在的封面，除非加上 `--force`；可以传入 slug 来限定范围；加上 `--likes` 还会刷新游戏文件里的点赞数；只要有点赞数变化，它就把 `packages/catalog/data/meta.json` 里的日期（站点上显示的“最近更新”）改成当天。添加游戏时，这个日期需要手动修改。`media` 从每款游戏帖子的视频里剪出六秒无声短片，并为点赞最多的六款再剪一段更大的供首屏播放，然后上传到 R2 存储桶 `vibe-arcade-media`，网站从那里提供它们（需要 Cloudflare 登录或 `CLOUDFLARE_API_TOKEN`），短片不放进仓库；并把亲自发帖的创作者的头像存入 `public/avatars/`。它把结果列在 `packages/catalog/data/media.json` 里，这个文件要和媒体文件一起提交。它同样会保留已存在的文件，除非加上 `--force`，也可以传入 slug。本周精选是 `meta.json` 里 `picks` 下的 slug，手动维护。`readme` 会重写本文件及其各语言版本里的游戏列表；添加、改名或删除游戏后要运行它，因为只要 README 落后于数据，测试就会失败。

## 部署

网站运行在 Cloudflare Workers 上。每次推送到 `main` 且 CI 通过后，由 [`deploy.yml`](.github/workflows/deploy.yml) 自动部署，它需要仓库 secret `CLOUDFLARE_API_TOKEN`（一个带“编辑 Cloudflare Workers”权限的 Cloudflare API token）。手动部署：

```sh
pnpm run deploy
```

这条命令会构建网站，并按 [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc) 执行 `wrangler deploy`；需要登录 Cloudflare，并有权访问其中指定的账号。网站的公开地址是 [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts) 里的 `SITE_URL` 常量，只在这一处定义：canonical 链接、站点地图和分享图都从那里读取。

## 致谢

游戏、名称、封面、短片和商标归各自的作者所有。封面和短片取自作者在 X 上发布的帖子，头像是他们的 X 头像。作者如需修改或下架条目，可以在 X 上联系 [@suzukaze_haduki](https://x.com/suzukaze_haduki)，或提一个 issue。Vibe Arcade 是一份社区索引，与 Anthropic 或其他任何模型厂商均无关联。

Vibe Arcade 是 [Wiz Games](https://wiz.games) 的项目，由 [@suzukaze_haduki](https://x.com/suzukaze_haduki) 策展。

## 许可证

代码以 [MIT 许可证](LICENSE)发布。该许可证不涵盖游戏及其封面、短片，也不涵盖创作者的头像。
