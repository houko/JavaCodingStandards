# Vibe Arcade

English · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**[vibe.wiz.games](https://vibe.wiz.games)** · [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) · [The games](#games) · [How games get in](#how-games-get-in)

[![CI](https://github.com/yldm-tech/awesome-vibe-games/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-vibe-games/actions/workflows/ci.yml)

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade is the arcade for AI-made games: a curated index of browser games that people built mostly by prompting an AI model and then shared on X. Each entry records the model that built the game, its creator, the original post with its like count, and a link to play it. This repository holds the game data and the site that shows it, [vibe.wiz.games](https://vibe.wiz.games); the games themselves stay with their creators, on their own hosts.

## On the site

- **One click to play.** Every card links straight to the game in a browser, and to the creator's post on X.
- **See how it was made.** Each game names the model that built it, and where the creator shared them, the build time, cost, tokens and the prompt itself.
- **Watch before you play.** Short silent clips from the creators' posts play on the home screen and on a card under the pointer.
- **Find a game your way.** Filter by genre, model or creator, search by title, and order by likes or by date. Every view is an address you can share, and every game has a page of its own.
- **Ten languages.** The interface and every game summary, with English at the bare address and the others at `?lang=<code>`.

![The home page of Vibe Arcade](.github/assets/screenshot.png)

## Games

Every game on the site, most liked first. The name leads to the game's page on Vibe Arcade and the last column to the game itself and to the creator's post. This list is drawn from the data in `packages/catalog/data/games/` and is redrawn by `pnpm --filter @vibe-arcade/web readme`.

<!-- games:start -->
**38** games listed · **31** creators credited · **2** AI models tracked

| # | Games | Creators | Genre | Model | |
| --- | --- | --- | --- | --- | --- |
| 1 | [**Starry Night Rider**](https://vibe.wiz.games/games/starry-night-rider)<br>Ride with Van Gogh through his own Starry Night. | [@ebbyamir](https://x.com/ebbyamir) | Exploration | Claude Fable 5.2 | [Play](https://starrynightrider.com) · [Post](https://x.com/i/status/2120284261089673376) |
| 2 | [**Saltline**](https://vibe.wiz.games/games/saltline)<br>One-shot FPS. Models, sounds and textures all generated in code, no human feedback. | [@felixrieseberg](https://x.com/felixrieseberg) | Shooter | Claude Fable 5.2 | [Play](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp) · [Post](https://x.com/i/status/2119925633564463609) |
| 3 | [**What the Water Keeps**](https://vibe.wiz.games/games/what-the-water-keeps)<br>A calm boat ride through eight dreamlike worlds. | [@kevin_t_ngo](https://x.com/kevin_t_ngo) | Exploration | Claude Fable 5.2 | [Play](https://what-the-water-keeps.vercel.app/) · [Post](https://x.com/i/status/2119868968307695818) |
| 4 | [**Mirror Earth**](https://vibe.wiz.games/games/mirror-earth)<br>A destructible game world of the whole planet, with weather that matches real Earth. | [@mattshumer_](https://x.com/mattshumer_) | Sandbox | Claude Fable 5.2 | [Play](https://www.spawn.co/@mattshumer/earth) · [Post](https://x.com/i/status/2119877065701036047) |
| 5 | [**Portals: Endless Worlds**](https://vibe.wiz.games/games/portals-endless-worlds)<br>450+ code-only 3D worlds linked by portals, built by 25,000 agents. | [@emollick](https://x.com/emollick) | Exploration | Claude Fable 5.2 | [Play](https://portals-endless-worlds.netlify.app/) · [Post](https://x.com/i/status/2119918307457577163) |
| 6 | [**Evensong**](https://vibe.wiz.games/games/evensong)<br>A dark-fantasy boss fight, playable in the browser. | [@kevin_t_ngo](https://x.com/kevin_t_ngo) | Action | Claude Fable 5.2 | [Watch](https://x.com/i/status/2120238844754923874) |
| 7 | [**雾锁山门**](https://vibe.wiz.games/games/wu-suo-shan-men)<br>One afternoon, 4.5B tokens: models, scenes, moves and optimisation in a single 30 MB HTML file. | [@op7418](https://x.com/op7418) | Action | Claude Fable 5.2 | [Play](https://op7418.github.io/guizang-game-skill/) · [Post](https://x.com/i/status/2120694045299327187) |
| 8 | [**Voxel Engine**](https://vibe.wiz.games/games/voxel-engine)<br>A voxel engine with sound, from a single prompt. | [@mattshumer_](https://x.com/mattshumer_) | Sandbox | Claude Fable 5.2 | [Play](https://www.spawn.co/@mattshumer/voxel-engine) · [Post](https://x.com/i/status/2119870965106483384) |
| 9 | [**Siege Wing**](https://vibe.wiz.games/games/siege-wing)<br>Fly a helicopter into a medieval war. Cannons, rockets and missiles against ballistas and castles. | [@builderjaydub](https://x.com/builderjaydub) | Shooter | Claude Fable 5.2 | [Play](https://bannerfall.itch.io/siege-wing) · [Post](https://x.com/i/status/2120223731520040966) |
| 10 | [**I Would Have Gotten Away With It**](https://vibe.wiz.games/games/i-would-have-gotten-away-with-it)<br>A reverse Scooby-Doo: you are the villain scaring off the meddling kids. | [@emollick](https://x.com/emollick) | Story & sim | Claude Fable 5.2 | [Play](https://i-would-have-gotten-away-with-it.netlify.app/) · [Post](https://x.com/i/status/2119876449494540554) |
| 11 | [**Patchwork Quilt**](https://vibe.wiz.games/games/patchwork-quilt)<br>A quilted, stop-motion style toy world. | [@BlendiByl](https://x.com/BlendiByl) | Puzzle & toys | Claude Fable 5.2 | [Play](https://patch.gg/blendi/patchwork-quilt) · [Post](https://x.com/i/status/2120746541636047347) |
| 12 | [**Childhood Rug Racer**](https://vibe.wiz.games/games/childhood-rug-racer)<br>Race toy cars across a childhood play rug. | [@noclipepe](https://x.com/noclipepe) | Racing | GPT-6.2 Sol vs Fable | [Play](https://noclipepe.pages.dev/rug/) · [Post](https://x.com/i/status/2119728047754547326) |
| 13 | [**Cloud Stunt 3D**](https://vibe.wiz.games/games/cloud-stunt-3d)<br>A stunt game generated in 30 minutes. | [@jev_chat](https://x.com/jev_chat) | Racing | Claude Fable 5.2 | [Play](https://finderchangchang.github.io/cloud-stunt-3d/) · [Post](https://x.com/i/status/2120015641151426838) |
| 14 | [**Hogwarts Royale**](https://vibe.wiz.games/games/hogwarts-royale)<br>A wizard-school battle royale from a one-line prompt. | [@mattshumer_](https://x.com/mattshumer_) | Action | Claude Fable 5.2 | [Play](https://www.spawn.co/@mattshumer/hogwarts-royale) · [Post](https://x.com/i/status/2119872098306810226) |
| 15 | [**Dread and District**](https://vibe.wiz.games/games/dread-and-district)<br>A fantasy logistics sim where good supply chains defeat evil. Built with a swarm of agents. | [@emollick](https://x.com/emollick) | Story & sim | Claude Fable 5.2 | [Play](https://dread-and-district.netlify.app) · [Post](https://x.com/i/status/2120248525254742318) |
| 16 | [**Worm Rider**](https://vibe.wiz.games/games/worm-rider)<br>An open-source 220 KB game built in Claude Code. | [@AmirMushich](https://x.com/AmirMushich) | Action | Claude Fable 5.2 | [Source](https://github.com/amirmushichge/worm-rider) · [Post](https://x.com/i/status/2119937977426338283) |
| 17 | [**Maad Maxxing**](https://vibe.wiz.games/games/maad-maxxing)<br>100% code, no assets. Three.js + WebGPU, first 3 stages playable. | [@Andrew_Blumson](https://x.com/Andrew_Blumson) | Racing | Claude Fable 5.2 | [Play](https://maad-maxxing.vercel.app) · [Post](https://x.com/i/status/2120599812512833557) |
| 18 | [**Frontline Warfare Deathmatch**](https://vibe.wiz.games/games/frontline-warfare-deathmatch)<br>A military shooter deathmatch in the browser. | [@alightinastorm](https://x.com/alightinastorm) | Shooter | Claude Fable 5.2 | [Play](https://spawn.co/@robot/frontline-warfare-deathmatch) · [Post](https://x.com/i/status/2120020469487440210) |
| 19 | [**Lanternfall**](https://vibe.wiz.games/games/lanternfall)<br>Models, animation and effects all generated, down to the enemy death frames. | [@loktar00](https://github.com/loktar00) | Action | Claude Fable 5.2 | [Play](https://loktar00.github.io/lanternfall/) · [Post](https://x.com/i/status/2120279060303520034) |
| 20 | [**Rambo Dino**](https://vibe.wiz.games/games/rambo-dino)<br>The Chrome T-Rex game, reworked as an action game. | [@noclipepe](https://x.com/noclipepe) | Action | Claude Fable 5.2 | [Play](https://noclipepe.pages.dev/dino) · [Post](https://x.com/i/status/2119927838321328577) |
| 21 | [**Turbo Tails**](https://vibe.wiz.games/games/turbo-tails)<br>3D kart racer with six racers, drifting, ramps, items and multiplayer. | [@petergyang](https://x.com/petergyang) | Racing | Claude Fable 5.2 | [Play](https://turbo-tails.vercel.app) · [Post](https://x.com/i/status/2119901658394358005) |
| 22 | [**Spud Smash**](https://vibe.wiz.games/games/spud-smash)<br>A potato that smashes and torches blue chairs. | [@argofowl](https://x.com/argofowl) | Action | Claude Fable 5.2 | [Play](https://fowllabs.com/fable-5-2/spud-smash) · [Post](https://x.com/i/status/2119913148929187960) |
| 23 | [**Skyflare**](https://vibe.wiz.games/games/skyflare)<br>A fighter-jet game made in three hours. | [@AugustCastilIo](https://x.com/AugustCastilIo) | Shooter | Claude Fable 5.2 | [Play](https://skyflare-game.vercel.app) · [Post](https://x.com/i/status/2120290751502581879) |
| 24 | [**Feed the Backrooms**](https://vibe.wiz.games/games/feed-the-backrooms)<br>Play the monster and catch people lost in the Backrooms. | [@LexnLin](https://x.com/LexnLin) | Story & sim | Claude Fable 5.2 | [Play](https://feed-backrooms.vercel.app) · [Post](https://x.com/i/status/2119966127149429093) |
| 25 | [**Stray Cat**](https://vibe.wiz.games/games/stray-cat)<br>Rescue kittens, scare dogs, face the old tomcat. Sound synthesised in code. | [@aimikoda](https://x.com/aimikoda) | Story & sim | Claude Fable 5.2 | [Play](https://claude.ai/artifact/4nPXUKJjQWNsZEHVNmXXCt) · [Post](https://x.com/i/status/2120120133712593118) |
| 26 | [**Tilt Labyrinth**](https://vibe.wiz.games/games/tilt-labyrinth)<br>A wooden ball maze in about 2,000 lines of Three.js. | [@mylifcc](https://x.com/mylifcc) | Puzzle & toys | Claude Fable 5.2 | [Play](https://blog.silencestar.com/posts/tilt-labyrinth/play/) · [Post](https://x.com/i/status/2120054646282870910) |
| 27 | [**Tiny Planet**](https://vibe.wiz.games/games/tiny-planet)<br>A tiny planet you can walk around. Open source. | [@prasenx](https://x.com/prasenx) | Exploration | Claude Fable 5.2 | [Source](https://github.com/StarKnightt/tiny-planet) · [Post](https://x.com/i/status/2120188077855613174) |
| 28 | [**The Vast Horizon**](https://vibe.wiz.games/games/the-vast-horizon)<br>Multiplayer surfing on one shared lake. Type a word and it changes the world. | [@OdinLovis](https://x.com/OdinLovis) | Exploration | Claude Fable 5.2 | [Play](https://the-vast-horizon.vercel.app) · [Post](https://x.com/i/status/2120198469755503091) |
| 29 | [**Dead Headway**](https://vibe.wiz.games/games/dead-headway)<br>A short game built for speedrunning. | [@AugustCastilIo](https://x.com/AugustCastilIo) | Action | Claude Fable 5.2 | [Play](https://dead-headway.vercel.app) · [Post](https://x.com/i/status/2120628693420904489) |
| 30 | [**Silicon Seduction**](https://vibe.wiz.games/games/silicon-seduction)<br>Escape without getting seduced. | [@ZryMiller](https://x.com/ZryMiller) | Story & sim | Claude Fable 5.2 | [Play](https://silicon-seduction.vercel.app/) · [Post](https://x.com/i/status/2119918766691954691) |
| 31 | [**Reef Dive**](https://vibe.wiz.games/games/reef-dive)<br>Spear-fish, dodge sharks, pilot a sub and dive 140 m into the Blue Hole. | [@boona11](https://x.com/boona11) | Exploration | Claude Fable 5.2 | [Play](https://wavedash.com/games/reef-dive) · [Post](https://x.com/i/status/2120482516733702472) |
| 32 | [**Bayhaven**](https://vibe.wiz.games/games/bayhaven)<br>Drive and drift 3.2 km of beachfront in 14 vehicles, from a city bus to a hopping lowrider. | [@FablestarGames](https://x.com/FablestarGames) | Sandbox | Claude Fable 5.2 | [Play](https://fablestar.games/play/) · [Post](https://x.com/i/status/2120641504951603394) |
| 33 | [**Roost**](https://vibe.wiz.games/games/roost)<br>Dirt-bike racing with AI rivals, nitro and a handlebar camera. | [@tejas3732](https://x.com/tejas3732) | Racing | Claude Fable 5.2 | [Play](https://claude.ai/artifact/DLnFodkTwvawCNwurDmSZK) · [Post](https://x.com/i/status/2120091513657139549) |
| 34 | [**Courtyard Kings**](https://vibe.wiz.games/games/courtyard-kings)<br>A four-character fighting game with 39 voice and sound clips. | [@promodenstudio](https://x.com/promodenstudio) | Action | Claude Fable 5.2 | [Play](https://claude.ai/artifact/1QGGhB68jMCjjjeeKtKNUo) · [Post](https://x.com/i/status/2120085977079107788) |
| 35 | [**Tria Prima**](https://vibe.wiz.games/games/tria-prima)<br>Dark-fantasy alchemy: five missions on an open-world island. | [@winchxyz](https://x.com/winchxyz) | Story & sim | Claude Fable 5.2 | [Play](https://winchxyz.github.io/tria-prima/) · [Post](https://x.com/i/status/2120078399482020160) |
| 36 | [**Stonehenge Solstice**](https://vibe.wiz.games/games/stonehenge-solstice)<br>Stonehenge in one HTML file: grass, shadows and the solstice sun path. | [@MeltTheManual](https://x.com/MeltTheManual) | Puzzle & toys | Claude Fable 5.2 | [Play](https://meltthemanual.github.io/stonehenge-solstice/) · [Post](https://x.com/i/status/2119926820963532984) |
| 37 | [**Fortnite in Three.js**](https://vibe.wiz.games/games/fortnite-in-three-js)<br>A battle-royale clone in Three.js. | [@aabyzov](https://x.com/aabyzov) | Action | Claude Fable 5.2 | [Play](https://anton-abyzov.github.io/fortnite-3js/) · [Post](https://x.com/i/status/2120702690845933702) |
| 38 | [**Vippi**](https://vibe.wiz.games/games/vippi)<br>A fast, arcade-style first-person shooter. | [@Shrit1401](https://x.com/Shrit1401) | Shooter | Claude Fable 5.2 | [Play](https://vippi.vercel.app/) · [Post](https://x.com/i/status/2120060593763926314) |
<!-- games:end -->

## How games get in

A game is listed when it meets three criteria:

- **Built mostly by AI.** Code, art or sound were generated with an AI model, and the creator says which one.
- **Playable in a browser.** One click to play, with no installs and no sign-up walls. A game that only has a source repository or a video can still be listed, and is marked as such.
- **Shared on X.** Every entry links to the creator's original post, and its likes are counted from that post.

Any model and any engine count. Like counts are a snapshot taken when the entry was last updated, not a live number.

## Submit a game

- Open the [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) issue form. It asks for the game's name, the creator's X handle, the post, the link, the genre, the model and one line of description in English. You do not have to be the creator.
- Or post the game on X with a playable link and tag [@suzukaze_haduki](https://x.com/suzukaze_haduki).

The [submissions workflow](.github/workflows/submissions.yml) lists the game within a few minutes, with no one in the loop. It checks that the post exists and was made by the creator, that a play or source link answers and that the game is not listed yet; then it takes the cover, a clip and the creator's avatar from the post, opens a pull request that closes the issue, merges it once CI passes and deploys the site. If something is wrong it says so on the issue, and editing the issue tries again. The summary goes up in English, which the other languages show until they are translated. A pull request that adds the game file yourself is also welcome.

## Game file format

Each game is one JSON file at `packages/catalog/data/games/<slug>.json`, checked against [`game.schema.json`](packages/catalog/data/schema/game.schema.json) and by the catalog's tests. This is [`saltline.json`](packages/catalog/data/games/saltline.json), the entry that uses every field except `creatorUrl` (see [`lanternfall.json`](packages/catalog/data/games/lanternfall.json) for that one):

<details>
<summary>The whole of <code>saltline.json</code></summary>

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

| Field | Required | Meaning |
| --- | --- | --- |
| `$schema` | yes | Always `../schema/game.schema.json`. |
| `slug` | yes | The file name without `.json` and the game's address on the site: the name in lowercase, with every run of characters other than `a-z` and `0-9` turned into one hyphen and no hyphen at either end. `Portals: Endless Worlds` becomes `portals-endless-worlds`. |
| `name` | yes | The game's name as its creator writes it. |
| `creator` | yes | The creator's X handle, without the `@`. |
| `creatorUrl` | no | The creator's page when it is not their X profile. Left out, the site links to `https://x.com/<creator>`. |
| `genre` | yes | One of `Shooter`, `Racing`, `Action`, `Exploration`, `Sandbox`, `Story & sim`, `Puzzle & toys`. |
| `link.type` | yes | `play` for a game that runs in a browser, `source` for a repository, `watch` for a game that can only be seen in a video. |
| `link.url` | for `play` and `source` | Where to play the game or read its source. A `watch` entry may leave it out, and then links to the post. |
| `post` | yes | The id of the creator's post on X, the digits at the end of its address, written as a string because it is too large for a JSON number. The date shown for the game is read from this id. |
| `likes` | yes | Likes on the post when the entry was last updated, an integer. |
| `model` | yes | The AI model the game was built with, as the creator names it. |
| `cover` | yes | The cover's file name, `<slug>.webp`: a 960x600 image in `apps/web/public/covers/`. |
| `summary` | yes | One line about the game for its card. `en` is required; each other language is optional and shows the English until it is written. |
| `pitch` | no | A longer description shown on the game's page and where it is a pick, with the same languages as `summary`. |
| `notes` | no | What the creator reported about building the game, each as they wrote it: any of `time`, `cost`, `tokens`, `prompts`, `lines`, `size` and `agents`, and `prompt`, the prompt it was made from. Shown as the game's build notes. |
| `down` | no | The day (`YYYY-MM-DD`) the game was marked as down. The daily link check writes and removes it through its pull requests; while it is set the game stays listed, says its link is down and points at the creator's post. |

## Languages

The site and every game summary are available in ten languages: English (`en`, the default), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), 日本語 (`ja`), 한국어 (`ko`), Español (`es`), Français (`fr`), Deutsch (`de`), Português (`pt-BR`) and Русский (`ru`). English is served at the bare address and the others with `?lang=<code>`. The interface copy lives in `packages/catalog/locales/<code>.json`, one file per language with the same keys.

## Repository layout

A pnpm monorepo with two packages:

```text
apps/web/                  @vibe-arcade/web: the site, TanStack Start (React 19) rendered on Cloudflare Workers
  src/                     routes, components and styles
  public/covers/           game covers, <slug>.webp
  public/avatars/          creators' avatars, <handle>.webp
  public/fonts/            self-hosted web fonts
  .media/                  the clips, cut by fetch-media.ts and kept locally (git ignores them); the site serves them from the R2 bucket vibe-arcade-media
  og/                      Vite plugin that draws the share images at build time
  scripts/                 fetch-covers.ts, fetch-media.ts, readme-games.ts, site-icons.ts, banner.ts
  wrangler.jsonc           Cloudflare Workers configuration
packages/catalog/          @vibe-arcade/catalog: the data and everything derived from it
  data/games/              one JSON file per game
  data/schema/             game.schema.json
  data/meta.json           the day the data last changed, the site's "last updated", and this week's picks
  data/media.json          which games have a clip and which creators an avatar, written by fetch-media.ts
  locales/                 interface copy, one file per language
  src/                     loading and validation, filters, languages, site constants
.github/
  ISSUE_TEMPLATE/          the Submit a game form
  workflows/ci.yml         typecheck, test and build on every pull request and on main
  workflows/deploy.yml     deploy main to Cloudflare Workers once CI has passed on it
  workflows/links.yml      daily check of every game link, with a pull request to mark a game whose link stays dead
```

The daily [link check](.github/workflows/links.yml) requests each game's play or source link. A link that does not answer is listed in one issue titled "Dead game links", which counts the checks in a row that found it dead. After three, the game is marked as down (`down` in its file), so a host that is out for a day never marks anything; when a marked game's link answers again, the mark comes off. Each change lands through a pull request that merges itself once CI passes and deploys the site. A game that has only moved is fixed by correcting its `link.url`; the mark comes off at the next check.

## Development

Requires Node.js 24 or later and pnpm.

```sh
pnpm install     # install dependencies
pnpm dev         # run the site locally
pnpm test        # run the tests of both packages
pnpm typecheck   # type-check both packages
pnpm build       # build the site, including the share images
```

These scripts in `apps/web` write files that are committed:

```sh
pnpm --filter @vibe-arcade/web covers   # fetch each game's cover from its X post into public/covers/
pnpm --filter @vibe-arcade/web media    # cut each game's clip and fetch its creator's avatar from its X post (needs ffmpeg)
pnpm --filter @vibe-arcade/web icons    # redraw the icons from public/favicon.svg
pnpm --filter @vibe-arcade/web banner   # redraw .github/assets/banner.png, the image at the top of this file
pnpm --filter @vibe-arcade/web readme   # redraw the list of games in the READMEs from the data
```

`covers` keeps a cover that already exists unless `--force` is given, takes slugs to limit the run, and with `--likes` also refreshes the like counts in the game files; when a count changes it moves the day in `packages/catalog/data/meta.json`, which the site shows as "last updated", to today. Set that day by hand when you add a game. `media` cuts a six-second silent clip from the video of each game's post, and a larger one for the six most liked games, which the hero screen plays, and uploads both to the R2 bucket `vibe-arcade-media`, from which the site serves them (it needs a Cloudflare login, or `CLOUDFLARE_API_TOKEN`); the clips are not in the repository, and saves the avatar of each creator who posted their game themselves into `public/avatars/`. It lists what it found in `packages/catalog/data/media.json`; commit that file with the media. It also keeps what exists unless `--force` is given, and takes slugs. The picks of the week are the slugs under `picks` in `meta.json`, edited by hand. `readme` rewrites the list of games in this file and its translations; run it after adding, renaming or removing a game, since the tests fail while a README is behind the data.

## Deployment

The site runs on Cloudflare Workers. Every push to `main` that passes CI is deployed by [`deploy.yml`](.github/workflows/deploy.yml), which needs the repository secret `CLOUDFLARE_API_TOKEN` (a Cloudflare API token with the "Edit Cloudflare Workers" permissions). To deploy by hand:

```sh
pnpm run deploy
```

This builds the site and runs `wrangler deploy` with [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc); it needs a Cloudflare login with access to the account named there. The site's public address is the `SITE_URL` constant in [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts), the single place it is defined: canonical links, the sitemap and the share images all read it from there.

## Credits

Games, names, covers, clips and trademarks belong to their creators. The covers and clips are taken from the creators' posts on X, and the avatars are their X profile pictures. A creator who wants an entry changed or taken down can message [@suzukaze_haduki](https://x.com/suzukaze_haduki) or open an issue. Vibe Arcade is a community index and is not affiliated with Anthropic or any other model maker.

Vibe Arcade is a [Wiz Games](https://wiz.games) project, curated by [@suzukaze_haduki](https://x.com/suzukaze_haduki).

## License

The code is released under the [MIT License](LICENSE). The license does not cover the games, their covers and clips, or the creators' avatars.
