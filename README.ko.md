# Vibe Arcade

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · 한국어

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade는 주로 AI 모델에 프롬프트를 주어 만들고 X에 공개한 게임을 사람이 직접 골라 모은 인덱스입니다. 각 항목에는 게임을 만든 모델, 제작자, 원본 게시물과 그 좋아요 수, 플레이 링크가 기록됩니다. 이 저장소에는 게임 데이터와 이를 보여 주는 사이트가 들어 있습니다. 게임 자체는 각 제작자의 것이며, 제작자가 올려 둔 곳에 그대로 있습니다.

## 등재 기준

다음 세 가지를 충족하는 게임을 등재합니다.

- **주로 AI가 만든 것.** 코드, 아트 또는 사운드가 AI 모델로 생성되었고, 어떤 모델인지 제작자가 밝힌 것.
- **브라우저에서 플레이할 수 있는 것.** 클릭 한 번으로 플레이할 수 있고, 설치도 가입 장벽도 없는 것. 소스 저장소나 영상만 있는 게임도 등재할 수 있으며, 그렇다고 표시합니다.
- **X에 공개된 것.** 모든 항목은 제작자의 원본 게시물로 연결되고, 좋아요 수도 그 게시물에서 셉니다.

모델과 엔진은 가리지 않습니다. 좋아요 수는 항목을 마지막으로 갱신한 시점의 값이며 실시간 숫자가 아닙니다.

## 게임 제출

- [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) 이슈 양식을 여세요. 게임 이름, 제작자의 X 핸들, 게시물, 링크, 장르, 모델, 영어로 쓴 한 줄 설명을 입력합니다. 제작자 본인이 아니어도 됩니다.
- 또는 플레이할 수 있는 링크와 함께 게임을 X에 올리고 [@suzukaze_haduki](https://x.com/suzukaze_haduki)를 태그하세요.

제출된 게임은 큐레이터가 하나씩 확인하고, 게시물에서 커버를 가져와 항목을 10개 언어 모두로 작성합니다. 게임 파일을 직접 추가하는 pull request도 환영합니다. 이 경우 요약을 10개 언어 모두로 써야 합니다. 하나라도 빠진 항목은 카탈로그가 받아들이지 않기 때문입니다.

## 게임 파일 형식

게임 하나는 `packages/catalog/data/games/<slug>.json`에 있는 JSON 파일 하나이며, [`game.schema.json`](packages/catalog/data/schema/game.schema.json)과 카탈로그의 테스트로 검증합니다. 아래는 `creatorUrl`을 뺀 모든 필드를 사용하는 항목인 [`saltline.json`](packages/catalog/data/games/saltline.json)입니다(`creatorUrl`의 예는 [`lanternfall.json`](packages/catalog/data/games/lanternfall.json)에 있습니다).

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

| 필드 | 필수 | 의미 |
| --- | --- | --- |
| `$schema` | 예 | 항상 `../schema/game.schema.json`. |
| `slug` | 예 | `.json`을 뺀 파일 이름이자 사이트에서 게임의 주소입니다. 이름을 소문자로 바꾸고, `a-z`와 `0-9`가 아닌 문자가 이어진 부분을 각각 하이픈 하나로 바꾸며, 양 끝에는 하이픈을 남기지 않습니다. `Portals: Endless Worlds`는 `portals-endless-worlds`가 됩니다. |
| `name` | 예 | 제작자가 쓰는 그대로의 게임 이름. |
| `creator` | 예 | 제작자의 X 핸들. `@`는 붙이지 않습니다. |
| `creatorUrl` | 아니요 | 제작자의 페이지가 X 프로필이 아닐 때 적습니다. 생략하면 `https://x.com/<creator>`로 연결됩니다. |
| `genre` | 예 | `Shooter`, `Racing`, `Action`, `Exploration`, `Sandbox`, `Story & sim`, `Puzzle & toys` 중 하나. |
| `link.type` | 예 | 브라우저에서 실행되는 게임은 `play`, 저장소는 `source`, 영상으로만 볼 수 있는 게임은 `watch`. |
| `link.url` | `play`와 `source`에서 필수 | 게임을 플레이하거나 소스를 읽을 수 있는 곳. `watch` 항목은 생략할 수 있으며, 그러면 게시물로 연결됩니다. |
| `post` | 예 | 제작자의 X 게시물 id. 게시물 주소 끝에 있는 숫자이며, JSON 숫자로 담기에는 너무 커서 문자열로 씁니다. 게임에 표시되는 날짜는 이 id에서 구합니다. |
| `likes` | 예 | 항목을 마지막으로 갱신한 시점의 게시물 좋아요 수. 정수. |
| `model` | 예 | 게임 제작에 쓰인 AI 모델. 제작자가 부르는 이름 그대로 씁니다. |
| `cover` | 예 | 커버 파일 이름 `<slug>.webp`. `apps/web/public/covers/`에 두는 960x600 이미지입니다. |
| `summary` | 예 | 카드에 쓰이는 게임 한 줄 설명. 10개 언어 모두. |
| `pitch` | 아니요 | 게임이 추천작으로 표시될 때 쓰이는 더 긴 설명. 10개 언어 모두. |
| `featured` | 아니요 | 제작자가 밝힌 `apiCost`, `buildTime`, `outputTokens`. 이 필드가 있는 게임이 홈 화면의 추천작이 되므로, 정확히 한 게임만 가집니다. |

## 언어

사이트와 각 게임의 요약은 10개 언어로 제공됩니다. English(`en`, 기본), 简体中文(`zh-CN`), 繁體中文(`zh-TW`), 日本語(`ja`), 한국어(`ko`), Español(`es`), Français(`fr`), Deutsch(`de`), Português(`pt-BR`), Русский(`ru`)입니다. 영어는 매개변수 없는 주소로, 나머지 언어는 `?lang=<code>`로 제공됩니다. 화면 문구는 `packages/catalog/locales/<code>.json`에 있으며, 언어마다 파일 하나이고 키는 같습니다.

## 저장소 구조

패키지 두 개로 이루어진 pnpm 모노레포입니다.

```text
apps/web/                  @vibe-arcade/web: 사이트. TanStack Start(React 19)를 Cloudflare Workers에서 렌더링
  src/                     라우트, 컴포넌트, 스타일
  public/covers/           게임 커버, <slug>.webp
  public/fonts/            직접 호스팅하는 웹 폰트
  og/                      빌드할 때 공유 이미지를 그리는 Vite 플러그인
  scripts/                 fetch-covers.ts, site-icons.ts, banner.ts
  wrangler.jsonc           Cloudflare Workers 설정
packages/catalog/          @vibe-arcade/catalog: 데이터와 거기서 파생되는 모든 것
  data/games/              게임마다 JSON 파일 하나
  data/schema/             game.schema.json
  data/meta.json           데이터가 마지막으로 바뀐 날, 사이트의 "최근 업데이트"
  locales/                 화면 문구, 언어마다 파일 하나
  src/                     불러오기와 검증, 필터, 언어, 사이트 상수
.github/
  ISSUE_TEMPLATE/          Submit a game 양식
  workflows/ci.yml         모든 pull request와 main에서 타입 검사, 테스트, 빌드
  workflows/links.yml      모든 게임 링크를 매주 검사
```

매주 실행되는 [링크 검사](.github/workflows/links.yml)는 각 게임의 플레이 또는 소스 링크에 요청을 보내고, 더 이상 응답하지 않는 링크를 "Dead game links"라는 제목의 이슈 하나에 모아 갱신합니다. 데이터는 절대 수정하지 않습니다.

## 개발

Node.js 24 이상과 pnpm이 필요합니다.

```sh
pnpm install     # 의존성 설치
pnpm dev         # 사이트를 로컬에서 실행
pnpm test        # 두 패키지의 테스트 실행
pnpm typecheck   # 두 패키지의 타입 검사
pnpm build       # 사이트 빌드(공유 이미지 포함)
```

`apps/web`에는 커밋해야 하는 파일을 만들어 내는 스크립트가 세 개 있습니다.

```sh
pnpm --filter @vibe-arcade/web covers   # 각 게임의 X 게시물에서 커버를 가져와 public/covers/에 저장
pnpm --filter @vibe-arcade/web icons    # public/favicon.svg로 아이콘을 다시 생성
pnpm --filter @vibe-arcade/web banner   # 이 파일 맨 위의 .github/assets/banner.png를 다시 생성
```

`covers`는 `--force`를 주지 않는 한 이미 있는 커버를 그대로 둡니다. slug를 넘기면 대상을 좁힐 수 있고, `--likes`를 주면 게임 파일의 좋아요 수도 갱신합니다. 좋아요 수가 바뀌면 `packages/catalog/data/meta.json`의 날짜(사이트에 "최근 업데이트"로 표시됩니다)를 오늘로 바꿉니다. 게임을 추가할 때는 이 날짜를 직접 고치세요.

## 배포

사이트는 Cloudflare Workers에서 실행되며 wrangler로 배포합니다.

```sh
pnpm run deploy
```

이 명령은 사이트를 빌드하고 [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc)로 `wrangler deploy`를 실행합니다. 그 파일에 적힌 계정에 접근할 수 있는 Cloudflare 로그인이 필요합니다. 사이트의 공개 주소는 [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts)의 `SITE_URL` 상수이며, 정의된 곳은 이 한 군데뿐입니다. canonical 링크, 사이트맵, 공유 이미지가 모두 여기에서 읽어 갑니다.

## 크레딧

게임, 이름, 커버, 상표는 각 제작자에게 있습니다. 커버는 제작자가 X에 올린 게시물의 화면입니다. Vibe Arcade는 커뮤니티 인덱스이며, Anthropic을 비롯한 어떤 모델 제작사와도 제휴 관계가 없습니다.

Vibe Arcade는 [Wiz Games](https://wiz.games)의 프로젝트이며 [@suzukaze_haduki](https://x.com/suzukaze_haduki)가 큐레이션합니다.

## 라이선스

코드는 [MIT 라이선스](LICENSE)로 공개합니다. 이 라이선스는 게임과 그 커버에는 적용되지 않습니다.
