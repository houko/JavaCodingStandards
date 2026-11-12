# Vibe Arcade

English · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade is a curated index of games that people built mostly by prompting an AI model and then shared on X. Each entry records the model that built the game, its creator, the original post with its like count, and a link to play it. This repository holds the game data and the site that shows it; the games themselves stay with their creators, on their own hosts.

## How games get in

A game is listed when it meets three criteria:

- **Built mostly by AI.** Code, art or sound were generated with an AI model, and the creator says which one.
- **Playable in a browser.** One click to play, with no installs and no sign-up walls. A game that only has a source repository or a video can still be listed, and is marked as such.
- **Shared on X.** Every entry links to the creator's original post, and its likes are counted from that post.

Any model and any engine count. Like counts are a snapshot taken when the entry was last updated, not a live number.

## Submit a game

- Open the [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) issue form. It asks for the game's name, the creator's X handle, the post, the link, the genre, the model and one line of description in English. You do not have to be the creator.
- Or post the game on X with a playable link and tag [@suzukaze_haduki](https://x.com/suzukaze_haduki).

A curator checks each submission, takes the cover from the post and writes the entry in all ten languages. A pull request that adds the game file yourself is also welcome; it has to carry the summary in all ten languages, because the catalog rejects an entry with one missing.

## Game file format

Each game is one JSON file at `packages/catalog/data/games/<slug>.json`, checked against [`game.schema.json`](packages/catalog/data/schema/game.schema.json) and by the catalog's tests. This is [`saltline.json`](packages/catalog/data/games/saltline.json), the entry that uses every field except `creatorUrl` (see [`lanternfall.json`](packages/catalog/data/games/lanternfall.json) for that one):

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
  "featured": {
    "apiCost": "~$550",
    "buildTime": "8h",
    "outputTokens": 2700000
  }
}
```

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
| `summary` | yes | One line about the game for its card, in all ten languages. |
| `pitch` | no | A longer description shown where the game is featured, in all ten languages. |
| `featured` | no | `apiCost`, `buildTime` and `outputTokens` as the creator reports them. It makes the game the featured one on the home page, so exactly one game has it. |

## Languages

The site and every game summary are available in ten languages: English (`en`, the default), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), 日本語 (`ja`), 한국어 (`ko`), Español (`es`), Français (`fr`), Deutsch (`de`), Português (`pt-BR`) and Русский (`ru`). English is served at the bare address and the others with `?lang=<code>`. The interface copy lives in `packages/catalog/locales/<code>.json`, one file per language with the same keys.

## Repository layout

A pnpm monorepo with two packages:

```text
apps/web/                  @vibe-arcade/web: the site, TanStack Start (React 19) rendered on Cloudflare Workers
  src/                     routes, components and styles
  public/covers/           game covers, <slug>.webp
  public/fonts/            self-hosted web fonts
  og/                      Vite plugin that draws the share images at build time
  scripts/                 fetch-covers.ts, site-icons.ts, banner.ts
  wrangler.jsonc           Cloudflare Workers configuration
packages/catalog/          @vibe-arcade/catalog: the data and everything derived from it
  data/games/              one JSON file per game
  data/schema/             game.schema.json
  data/meta.json           the day the data last changed, the site's "last updated"
  locales/                 interface copy, one file per language
  src/                     loading and validation, filters, languages, site constants
.github/
  ISSUE_TEMPLATE/          the Submit a game form
  workflows/ci.yml         typecheck, test and build on every pull request and on main
  workflows/links.yml      weekly check of every game link
```

The weekly [link check](.github/workflows/links.yml) requests each game's play or source link and keeps one issue titled "Dead game links" up to date with the ones that no longer answer. It never edits the data.

## Development

Requires Node.js 24 or later and pnpm.

```sh
pnpm install     # install dependencies
pnpm dev         # run the site locally
pnpm test        # run the tests of both packages
pnpm typecheck   # type-check both packages
pnpm build       # build the site, including the share images
```

Three scripts in `apps/web` write files that are committed:

```sh
pnpm --filter @vibe-arcade/web covers   # fetch each game's cover from its X post into public/covers/
pnpm --filter @vibe-arcade/web icons    # redraw the icons from public/favicon.svg
pnpm --filter @vibe-arcade/web banner   # redraw .github/assets/banner.png, the image at the top of this file
```

`covers` keeps a cover that already exists unless `--force` is given, takes slugs to limit the run, and with `--likes` also refreshes the like counts in the game files; when a count changes it moves the day in `packages/catalog/data/meta.json`, which the site shows as "last updated", to today. Set that day by hand when you add a game.

## Deployment

The site runs on Cloudflare Workers and is deployed with wrangler:

```sh
pnpm run deploy
```

This builds the site and runs `wrangler deploy` with [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc); it needs a Cloudflare login with access to the account named there. The site's public address is the `SITE_URL` constant in [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts), the single place it is defined: canonical links, the sitemap and the share images all read it from there.

## Credits

Games, names, covers and trademarks belong to their creators. The covers are frames from the creators' posts on X. Vibe Arcade is a community index and is not affiliated with Anthropic or any other model maker.

Vibe Arcade is a [Wiz Games](https://wiz.games) project, curated by [@suzukaze_haduki](https://x.com/suzukaze_haduki).

## License

The code is released under the [MIT License](LICENSE). The license does not cover the games or their covers.
