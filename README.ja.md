# Vibe Arcade

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · 日本語 · [한국어](README.ko.md)

![Vibe Arcade](.github/assets/banner.png)

Vibe Arcade は、主に AI モデルへのプロンプトで作られ、X で公開されたゲームを人の手で選んで集めたインデックスです。各エントリには、ゲームを作ったモデル、作者、元の投稿とそのいいね数、プレイ用のリンクを記録しています。このリポジトリにあるのはゲームのデータと、それを表示するサイトです。ゲームそのものは各作者のもので、それぞれのホストに置かれたままです。

## 掲載の基準

次の 3 つを満たすゲームを掲載します。

- **主に AI が作ったもの。** コード、アート、サウンドのいずれかが AI モデルで生成されていて、どのモデルかを作者が明かしていること。
- **ブラウザで遊べること。** ワンクリックで遊べて、インストールも登録の壁もないこと。ソースのリポジトリや動画しかないゲームも掲載でき、その旨を表示します。
- **X で公開されていること。** すべてのエントリは作者の元の投稿にリンクし、いいね数もその投稿から数えます。

モデルもエンジンも問いません。いいね数はエントリを最後に更新した時点の値で、リアルタイムの数字ではありません。

## ゲームを投稿する

- [Submit a game](https://github.com/yldm-tech/awesome-vibe-games/issues/new?template=submit-game.yml) の issue フォームを開いてください。ゲーム名、作者の X ハンドル、投稿、リンク、ジャンル、モデル、英語での一行説明を入力します。作者本人でなくてもかまいません。
- または、遊べるリンクを付けてゲームを X に投稿し、[@suzukaze_haduki](https://x.com/suzukaze_haduki) をタグ付けしてください。

投稿はキュレーターが一件ずつ確認し、投稿からカバーを取り、エントリを 10 言語すべてで書きます。ゲームのファイルを自分で追加する pull request も歓迎します。その場合は概要を 10 言語すべてで書く必要があります。1 つでも欠けているエントリはカタログが受け付けないためです。

## ゲームファイルの形式

ゲームは 1 本につき 1 つの JSON ファイルで、`packages/catalog/data/games/<slug>.json` に置きます。[`game.schema.json`](packages/catalog/data/schema/game.schema.json) とカタログのテストで検証されます。以下は、`creatorUrl` 以外のすべてのフィールドを使っているエントリ [`saltline.json`](packages/catalog/data/games/saltline.json) です（`creatorUrl` の例は [`lanternfall.json`](packages/catalog/data/games/lanternfall.json) にあります）。

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

| フィールド | 必須 | 意味 |
| --- | --- | --- |
| `$schema` | はい | 常に `../schema/game.schema.json`。 |
| `slug` | はい | `.json` を除いたファイル名で、サイト上でのゲームのアドレスにもなります。名前を小文字にし、`a-z` と `0-9` 以外の文字の連続をそれぞれ 1 つのハイフンに置き換え、両端にハイフンを残しません。`Portals: Endless Worlds` は `portals-endless-worlds` になります。 |
| `name` | はい | 作者の表記どおりのゲーム名。 |
| `creator` | はい | 作者の X ハンドル。`@` は付けません。 |
| `creatorUrl` | いいえ | 作者のページが X のプロフィールではない場合に指定します。省略すると `https://x.com/<creator>` にリンクします。 |
| `genre` | はい | `Shooter`、`Racing`、`Action`、`Exploration`、`Sandbox`、`Story & sim`、`Puzzle & toys` のいずれか。 |
| `link.type` | はい | ブラウザで動くゲームは `play`、リポジトリは `source`、動画でしか見られないゲームは `watch`。 |
| `link.url` | `play` と `source` では必須 | ゲームを遊べる場所、またはソースを読める場所。`watch` のエントリでは省略でき、その場合は投稿にリンクします。 |
| `post` | はい | 作者の X 投稿の id。投稿のアドレスの末尾にある数字で、JSON の数値には大きすぎるため文字列で書きます。ゲームに表示される日付はこの id から求めます。 |
| `likes` | はい | エントリを最後に更新した時点での投稿のいいね数。整数。 |
| `model` | はい | ゲームの制作に使われた AI モデル。作者の呼び方どおりに書きます。 |
| `cover` | はい | カバーのファイル名 `<slug>.webp`。`apps/web/public/covers/` に置く 960x600 の画像です。 |
| `summary` | はい | カードに載せるゲームの一行説明。10 言語すべて。 |
| `pitch` | いいえ | ゲームのページと、ピックアップに選ばれたときに表示される長めの説明。10 言語すべて。 |
| `notes` | いいえ | 作者が公表した制作データを、書かれたとおりに。`time`、`cost`、`tokens`、`prompts`、`lines`、`size`、`agents` のいずれかと、ゲームの元になったプロンプト `prompt`。ゲームの「制作データ」として表示されます。 |

## 言語

サイトと各ゲームの概要は 10 言語で用意しています。English（`en`、既定）、简体中文（`zh-CN`）、繁體中文（`zh-TW`）、日本語（`ja`）、한국어（`ko`）、Español（`es`）、Français（`fr`）、Deutsch（`de`）、Português（`pt-BR`）、Русский（`ru`）です。英語はパラメータなしのアドレスで、その他の言語は `?lang=<code>` で表示します。画面の文言は `packages/catalog/locales/<code>.json` にあり、言語ごとに 1 ファイルで、キーは共通です。

## リポジトリの構成

2 つのパッケージからなる pnpm モノレポです。

```text
apps/web/                  @vibe-arcade/web：サイト。TanStack Start（React 19）を Cloudflare Workers 上でレンダリング
  src/                     ルート、コンポーネント、スタイル
  public/covers/           ゲームのカバー、<slug>.webp
  public/videos/           ゲームの無音ショートクリップ、<slug>.mp4。hero/<slug>.mp4 はヒーロー画面用
  public/avatars/          クリエイターのアバター、<handle>.webp
  public/fonts/            セルフホストの Web フォント
  og/                      ビルド時に共有用画像を描く Vite プラグイン
  scripts/                 fetch-covers.ts、fetch-media.ts、site-icons.ts、banner.ts
  wrangler.jsonc           Cloudflare Workers の設定
packages/catalog/          @vibe-arcade/catalog：データと、そこから導かれるものすべて
  data/games/              ゲーム 1 本につき 1 つの JSON ファイル
  data/schema/             game.schema.json
  data/meta.json           データを最後に変更した日（サイトの「最終更新」）と今週のピックアップ
  data/media.json          クリップのあるゲームとアバターのあるクリエイターの一覧。fetch-media.ts が書き出す
  locales/                 画面の文言、言語ごとに 1 ファイル
  src/                     読み込みと検証、絞り込み、言語、サイトの定数
.github/
  ISSUE_TEMPLATE/          Submit a game フォーム
  workflows/ci.yml         すべての pull request と main で型チェック、テスト、ビルド
  workflows/links.yml      全ゲームのリンクを毎週チェック
```

毎週の[リンクチェック](.github/workflows/links.yml)は、各ゲームのプレイ用またはソースのリンクにリクエストを送り、応答しなくなったリンクを「Dead game links」というタイトルの 1 つの issue にまとめて更新します。データを書き換えることはありません。

## 開発

Node.js 24 以降と pnpm が必要です。

```sh
pnpm install     # 依存パッケージをインストール
pnpm dev         # サイトをローカルで起動
pnpm test        # 両パッケージのテストを実行
pnpm typecheck   # 両パッケージを型チェック
pnpm build       # サイトをビルド（共有用画像を含む）
```

`apps/web` には、コミット対象のファイルを書き出すスクリプトが 3 つあります。

```sh
pnpm --filter @vibe-arcade/web covers   # 各ゲームの X 投稿からカバーを取得して public/covers/ に保存
pnpm --filter @vibe-arcade/web media    # 各ゲームの X 投稿からクリップを切り出し、クリエイターのアバターを取得（ffmpeg が必要）
pnpm --filter @vibe-arcade/web icons    # public/favicon.svg からアイコンを作り直す
pnpm --filter @vibe-arcade/web banner   # このファイル冒頭の .github/assets/banner.png を作り直す
```

`covers` は、`--force` を付けないかぎり既存のカバーを残します。slug を渡すと対象を絞れます。`--likes` を付けると、ゲームファイルのいいね数も更新します。いいね数が変わった場合は、`packages/catalog/data/meta.json` の日付（サイトに「最終更新」として表示されます）を当日に書き換えます。ゲームを追加したときは、この日付を手で直してください。`media` は、各ゲームの投稿の動画から 6 秒の無音クリップを切り出して `public/videos/` に保存し、いいねの多い 6 本にはヒーロー画面用の大きめのクリップも作ります。自分で投稿したクリエイターのアバターは `public/avatars/` に保存します。結果は `packages/catalog/data/media.json` に書き出すので、メディアと一緒にコミットしてください。こちらも `--force` を付けないかぎり既存のファイルを残し、slug で対象を絞れます。今週のピックアップは `meta.json` の `picks` に並べた slug で、手で編集します。

## デプロイ

サイトは Cloudflare Workers で動き、wrangler でデプロイします。

```sh
pnpm run deploy
```

このコマンドはサイトをビルドし、[`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc) を使って `wrangler deploy` を実行します。そこに書かれたアカウントにアクセスできる Cloudflare のログインが必要です。サイトの公開アドレスは [`packages/catalog/src/site.ts`](packages/catalog/src/site.ts) の定数 `SITE_URL` で、定義されているのはこの 1 か所だけです。canonical リンク、サイトマップ、共有用画像はすべてここから読み取ります。

## クレジット

ゲーム、名称、カバー、クリップ、商標は各作者に帰属します。カバーとクリップは作者の X 投稿から、アバターは X のプロフィール画像から取っています。掲載内容の変更や削除を希望する作者は、X で [@suzukaze_haduki](https://x.com/suzukaze_haduki) に連絡するか、issue を立ててください。Vibe Arcade はコミュニティによるインデックスで、Anthropic をはじめとするモデル提供元のいずれとも提携していません。

Vibe Arcade は [Wiz Games](https://wiz.games) のプロジェクトで、[@suzukaze_haduki](https://x.com/suzukaze_haduki) がキュレーションしています。

## ライセンス

コードは [MIT ライセンス](LICENSE)で公開しています。このライセンスはゲームとそのカバー、クリップ、クリエイターのアバターには及びません。
