import en from '../locales/en.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import type { LangCode } from './lang';

// UI copy, one flat JSON file per language under locales/. `{x}` and `{n}` are placeholders filled by `fill()`.
//
// zh-CN.json is the reference: its keys are the StringKey type, and a file missing one fails the type check below. The tests check that every file has exactly the reference's keys and the same placeholders.
//
// Notes on some keys, since JSON has no comments:
// - app_desc_tail follows an app's one-line summary in its page's meta description.
// - h1_1 and h1_2 are the two differently coloured phrases of the home headline. They stay inline so the browser decides where it wraps. hero_p and hero_p2 are the two sentences under it.
// - r_h1 is the home headline in the retro look. It has no manual line breaks; the README window wraps it to the space it has.
// - title_* and desc_* are search snippets: each page's <title> topic (title_home is the whole home title) and meta description. They name the topic people search for; the visible headings stay short.
// - kw_* are each page's <meta name="keywords">, comma-separated: kw_app follows an app's name on its page. They are phrasings people search in that language (see PAGE_KEYWORDS in apps/web/src/lib/seo.ts), each naming Go or Golang beside NSGo.
export type StringKey = keyof typeof zhCN;
export type Translations = Record<StringKey, string>;

export const LOCALES: Record<LangCode, Translations> = { 'zh-CN': zhCN, 'zh-TW': zhTW, en, ja, ko };
