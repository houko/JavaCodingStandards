import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoIcons, repoLikelyScreenshots, repoShotSources, shotProblem, stagedShot, stagedShotOf, addedFiles, appNameFrom, knownFiles, cleanPlatforms, cleanTags, formDefaults, homepageOf, hasAllLanguages, markProvisional, iconCut, iconOf, appKindOf, isArtwork, isBanner, isTall, isSquarish, lengthCaps, overCaps, joinRepoPath, pickNsgoConfig, platformsFromConfig, readmeImages, repoOfEntry, repoScreenshots, resolveImage, schemaEnum, platformsAtDefault, setCategory, setGroup, setPlatforms, sniffImage, submittedScreenshot } from './source.ts';

describe('app names', () => {
	it('takes nsgo.yaml’s spelling of the same name only', () => {
		expect(appNameFrom('myskills', { name: 'MySkills' })).toBe('MySkills');
		expect(appNameFrom('MySkills', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('Skill Shelf', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('myskills', {})).toBeUndefined();
		expect(appNameFrom('Collate', { name: 'collate' })).toBeUndefined();
	});

	it('limits copy to the longest example in each language', () => {
		const examples = [{ description: { en: 'x'.repeat(371), ja: 'あ'.repeat(248) } }, { description: { en: 'x'.repeat(405), ja: 'あ'.repeat(236) } }, { summary: { en: 'short' } }];
		const caps = lengthCaps(examples, 'description');
		expect(caps).toEqual({ en: 405, ja: 248 });
		expect(overCaps({ en: 'x'.repeat(445), ja: 'あ'.repeat(300) }, caps)).toEqual(['ja 300/248']);
		expect(overCaps({ en: 'x'.repeat(446) }, caps)).toEqual(['en 446/405']);
		expect(overCaps({ en: 'x', 'zh-CN': '很长'.repeat(500) }, caps)).toEqual([]);
	});

	it('keeps copy already in every site language', () => {
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: 'e' })).toBe(true);
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: ' ' })).toBe(false);
		expect(hasAllLanguages({ en: '本地 agent skills 库管理工具' })).toBe(false);
		expect(hasAllLanguages(undefined)).toBe(false);
	});
});

describe('stand-in images', () => {
	it('records each stand-in once, in a fixed order', () => {
		const entry: Record<string, unknown> = { slug: 'kit' };
		markProvisional(entry, 'screenshot');
		expect(entry.provisional).toEqual(['screenshot']);
		markProvisional(entry, 'icon');
		markProvisional(entry, 'screenshot');
		expect(entry.provisional).toEqual(['icon', 'screenshot']);
	});
});

describe('submitted entries', () => {
	it('finds the entry files a branch adds', () => {
		expect(addedFiles(['2048.json', 'nova.json', ''], ['nova.json', 'saundo.json', '2048.json', 'pinup.json', '.DS_Store'])).toEqual(['pinup.json', 'saundo.json']);
		expect(addedFiles(['nova.json'], ['nova.json'])).toEqual([]);
		// The examples of a new category's first entry: its directory holds only a .gitkeep, which is empty and must not be read as an entry.
		expect(knownFiles(['.gitkeep', ''], ['.gitkeep', 'first.json'])).toEqual([]);
		expect(knownFiles(['.gitkeep', 'a.json', 'gone.json'], ['.gitkeep', 'a.json', 'b.json'])).toEqual(['a.json']);
		expect(addedFiles([], ['onevra.json'])).toEqual(['onevra.json']);
	});

	it('takes the repository from repo, or from a GitHub link', () => {
		expect(repoOfEntry({ repo: 'you/app', url: 'https://app.dev' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/legibet/myskills' })).toBe('legibet/myskills');
		expect(repoOfEntry({ url: 'https://github.com/you/app.git' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/you/app/tree/main/app' })).toBe('you/app');
		expect(repoOfEntry({ docs: 'https://github.com/you/plugin#readme' })).toBe('you/plugin');
		expect(repoOfEntry({ url: 'https://app.dev' })).toBeUndefined();
	});
});

describe('the repository', () => {
	it('picks the app’s own nsgo.yaml, not a vendored example', () => {
		expect(pickNsgoConfig(['README.md', 'app/nsgo.yaml', 'go.mod'])).toBe('app/nsgo.yaml');
		expect(pickNsgoConfig(['examples/demo/nsgo.yaml', 'nsgo.yaml'])).toBe('nsgo.yaml');
		expect(pickNsgoConfig(['node_modules/x/nsgo.yaml', 'examples/a/nsgo.yaml', 'vendor/github.com/oneo-me/nsgo/examples/hello/nsgo.yaml'])).toBeUndefined();
		expect(pickNsgoConfig(['b/nsgo.yaml', 'a/nsgo.yaml'])).toBe('a/nsgo.yaml');
		// freewu/ocr-manager keeps its app in desktop/.
		expect(pickNsgoConfig(['desktop/nsgo.yaml', 'desktop/go.mod', 'web/package.json'])).toBe('desktop/nsgo.yaml');
		expect(pickNsgoConfig(['cmd/app/nsgo.yaml', 'website/nsgo.yaml.bak'])).toBe('cmd/app/nsgo.yaml');
		// The only name NSGo's CLI reads.
		expect(pickNsgoConfig(['nsgo.yml', 'mynsgo.yaml', 'nsgo.json'])).toBeUndefined();
	});

	it('takes a strip far wider than a window for a banner', () => {
		expect(isBanner(720, 240)).toBe(true);
		expect(isBanner(1932, 1218)).toBe(false);
		expect(isBanner(2400, 1000)).toBe(false);
		expect(isBanner(0, 0)).toBe(false);
	});

	it('tells artwork from screenshots by path and file name', () => {
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/hero.png')).toBe(true);
		expect(isArtwork('https://example.com/img/banner-dark.webp?v=2')).toBe(true);
		expect(isArtwork('https://example.com/assets/app_logo.png')).toBe(true);
		expect(isArtwork('https://example.com/docs/og-image.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/ConteMan/cubbix/main/brand/dist/dark-1024.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/zeokeel/ZeoKeel-Super-Agent/main/design/dsh-reference/dsh-home.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/home-img.png')).toBe(false);
		expect(isArtwork('https://example.com/docs/preview/home_en.png')).toBe(false);
		expect(isArtwork('https://example.com/covered-calls.png')).toBe(false);
		expect(isArtwork('https://example.com/heroku-deploy.png')).toBe(false);
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/qq-community.png')).toBe(true);
		expect(isArtwork('https://example.com/img/Telegram_Group.PNG')).toBe(true);
		expect(isArtwork('https://example.com/wechat-qrcode.jpg')).toBe(true);
		expect(isArtwork('https://example.com/screens/editor-dark.png')).toBe(false);
	});

	it('finds the icon where NSGo does: icon.png, else assets/Icon.png beside nsgo.yaml', () => {
		// nsgo.yaml's icon.png, relative to nsgo.yaml's directory, wins over the default.
		expect(iconOf('app/nsgo.yaml', { name: 'Flow', icon: { png: 'art/icon-1024.png', apple: 'art/AppIcon.icon' } }, ['app/assets/Icon.png'])).toEqual({ path: 'app/art/icon-1024.png' });
		// oneo-me/nsgo-flow: no icon field, assets/Icon.png beside nsgo.yaml.
		expect(iconOf('nsgo.yaml', { name: 'Flow Editor' }, ['nsgo.yaml', 'assets/Icon.png', 'assets/AppIcon.icon/icon.json'])).toEqual({ path: 'assets/Icon.png' });
		expect(iconOf('desktop/nsgo.yaml', {}, ['desktop/assets/Icon.png'])).toEqual({ path: 'desktop/assets/Icon.png' });
		// An icon.png that is not a raster image is passed over for the default.
		expect(iconOf('nsgo.yaml', { icon: { png: 'icon.svg' } }, ['assets/Icon.png'])).toEqual({ path: 'assets/Icon.png' });
		// Not assets/Icon.png elsewhere than beside nsgo.yaml.
		expect(iconOf('cmd/app/nsgo.yaml', {}, ['assets/Icon.png'])).toBeUndefined();
	});

	it("names an icon for Apple's targets only, which cannot be converted", () => {
		expect(iconOf('nsgo.yaml', { icon: { apple: 'art/Flow.icon' } }, ['nsgo.yaml'])).toEqual({ macOnly: 'art/Flow.icon' });
		// An Icon Composer .icon is a folder, so the tree lists the files inside it.
		expect(iconOf('app/nsgo.yaml', {}, ['app/assets/AppIcon.icon/icon.json', 'app/assets/AppIcon.icon/Assets/layer.svg'])).toEqual({ macOnly: 'app/assets/AppIcon.icon' });
		expect(iconOf('nsgo.yaml', {}, ['assets/AppIcon.icns'])).toEqual({ macOnly: 'assets/AppIcon.icns' });
		// A PNG beside it is still the one taken.
		expect(iconOf('nsgo.yaml', { icon: { apple: 'AppIcon.icns' } }, ['assets/Icon.png'])).toEqual({ path: 'assets/Icon.png' });
	});

	it('takes no icon from an nsgo.yaml that names none, as nsgo init writes none', () => {
		expect(iconOf('nsgo.yaml', { name: 'x', id: 'dev.nsgo.x' }, ['nsgo.yaml', 'app.go'])).toBeUndefined();
		expect(iconOf('nsgo.yaml', null, [])).toBeUndefined();
		expect(iconOf('nsgo.yaml', { icon: 'assets/Icon.png' }, [])).toBeUndefined();
		expect(iconOf('nsgo.yaml', { icon: { png: 42 } }, [])).toBeUndefined();
	});

	it('tells a TSX app from a Go one by the files beside nsgo.yaml', () => {
		// nsgo init -template tsx: App.tsx beside nsgo.yaml, which main.go compiles.
		expect(appKindOf('nsgo.yaml', ['nsgo.yaml', 'main.go', 'App.tsx', 'app.test.tsx', 'tsconfig.json'])).toBe('tsx');
		expect(appKindOf('app/nsgo.yaml', ['app/nsgo.yaml', 'app/main.go', 'app/native.go', 'app/App.tsx'])).toBe('tsx');
		// nsgo init: a Go app, with its tests.
		expect(appKindOf('nsgo.yaml', ['nsgo.yaml', 'app.go', 'app_test.go'])).toBe('go');
		// Only a test, or TSX elsewhere in the repository, does not make it a TSX app.
		expect(appKindOf('nsgo.yaml', ['nsgo.yaml', 'app.go', 'ui.test.tsx', 'web/src/App.tsx'])).toBe('go');
		expect(appKindOf('cmd/app/nsgo.yaml', ['cmd/app/nsgo.yaml', 'cmd/app/main.go', 'App.tsx'])).toBe('go');
	});

	it("reads an app's platforms from nsgo.yaml's build targets", () => {
		// What nsgo init writes says nothing of what the app ships for, in any order, so the release assets and README decide.
		expect(platformsFromConfig({ name: 'x', build: { targets: ['macos_arm64', 'windows_x64', 'ios_simulator', 'android_arm64', 'web'] } })).toBeUndefined();
		expect(platformsFromConfig({ build: { targets: ['web', 'android_arm64', 'ios_simulator', 'windows_x64', 'macos_arm64'] } })).toBeUndefined();
		// Once the author changes the list it counts; the simulator package is not an iOS release.
		expect(platformsFromConfig({ build: { targets: ['macos_arm64', 'windows_x64', 'ios_simulator', 'android_arm64'] } })).toEqual(['mac', 'win', 'android']);
		expect(platformsFromConfig({ build: { targets: ['ios_simulator'] } })).toBeUndefined();
		expect(platformsFromConfig({ build: { targets: ['linux_x64', 'linux_arm64', 'macos_x64', 'ios'] } })).toEqual(['mac', 'linux', 'ios']);
		// all is every target a Mac with Go and Xcode builds, which leaves out the mini programs.
		expect(platformsFromConfig({ build: { targets: ['all'] } })).toEqual(['mac', 'win', 'linux', 'ios', 'android', 'web']);
		expect(platformsFromConfig({ build: { targets: ['all', 'miniprogram'] } })).toEqual(['mac', 'win', 'linux', 'ios', 'android', 'web', 'miniprogram']);
		expect(platformsFromConfig({ build: { targets: ['miniprogram_wechat', 'Web'] } })).toEqual(['web', 'miniprogram']);
		// tvOS and watchOS have no platform on the site.
		expect(platformsFromConfig({ build: { targets: ['tvos', 'watchos_simulator'] } })).toBeUndefined();
		expect(platformsFromConfig({ build: { targets: [] } })).toBeUndefined();
		expect(platformsFromConfig({ build: { targets: 'all' } })).toBeUndefined();
		expect(platformsFromConfig({ name: 'x' })).toBeUndefined();
		expect(platformsFromConfig(null)).toBeUndefined();
	});

	it('resolves paths inside the repository only', () => {
		expect(joinRepoPath('app/nsgo.yaml', 'icon/icon.png')).toBe('app/icon/icon.png');
		expect(joinRepoPath('app/nsgo.yaml', './../assets/icon.png')).toBe('assets/icon.png');
		expect(joinRepoPath('nsgo.yaml', '../../etc/passwd')).toBeUndefined();
	});

	it('cuts an icon to its plate, and keeps one with no transparent margin whole', () => {
		expect(iconCut('824x824+100+100', 1024, 1024)).toEqual({ crop: '824x824+100+100', side: 824 });
		expect(iconCut('600x640+212+192\n', 1024, 1024)).toEqual({ crop: '600x640+212+192', side: 640 });
		// CatView: fully opaque, so ImageMagick finds no box.
		expect(iconCut('0x0+1024+1024', 1024, 1024)).toEqual({ side: 1024 });
		expect(iconCut('', 512, 512)).toEqual({ side: 512 });
	});

	it('takes a square image for a logo, not a screenshot', () => {
		expect(isSquarish(1024, 1024)).toBe(true);
		expect(isSquarish(1000, 900)).toBe(true);
		expect(isSquarish(1200, 810)).toBe(false);
		expect(isSquarish(800, 1200)).toBe(false);
	});

	it('takes an image far taller than a phone screen for a scrolled page, not a screenshot', () => {
		// A whole page captured as it scrolls.
		expect(isTall(800, 4000)).toBe(true);
		expect(isTall(762, 1830)).toBe(true);
		// An iPhone's screen (1179 × 2556) and an Android phone's (1080 × 2400) are screenshots.
		expect(isTall(1179, 2556)).toBe(false);
		expect(isTall(1080, 2400)).toBe(false);
		expect(isTall(1600, 886)).toBe(false);
		expect(isTall(0, 0)).toBe(false);
	});
});

describe('submitted screenshot', () => {
	it("reads the form's screenshot link from the bot's pull request", () => {
		const url = 'https://my-kit.dev/img/window.png';
		expect(submittedScreenshot(`Category: app\n\nScreenshot from the form: \`${url}\`\n<!-- submitted-screenshot: ${url} -->\n\nThe entry passed`)).toBe(url);
		expect(submittedScreenshot('Submitted through the form, no screenshot')).toBeUndefined();
		expect(submittedScreenshot(null)).toBeUndefined();
		// The form's rule again, as the body can be edited after the bot wrote it.
		for (const bad of ['http://my-kit.dev/a.png', 'https://x.dev/"a".png', 'https://x.dev/`a`.png', `https://x.dev/${'a'.repeat(300)}.png`]) expect(submittedScreenshot(`<!-- submitted-screenshot: ${bad} -->`), bad).toBeUndefined();
	});

	it("ignores a marker inside the entry's JSON, which comes first in the body", () => {
		const entry = JSON.stringify({ slug: 'kit', summary: { en: '<!-- submitted-screenshot: https://evil.dev/a.png -->', ja: '\u2028<!-- submitted-screenshot: https://evil.dev/b.png -->\u2028' } }, null, 2);
		const body = `Category: app\n\n\`\`\`json\n${entry}\n\`\`\``;
		expect(submittedScreenshot(body)).toBeUndefined();
		const url = 'https://my-kit.dev/img/window.png';
		expect(submittedScreenshot(`${body}\n\nScreenshot from the form: \`${url}\`\n<!-- submitted-screenshot: ${url} -->\n\nThe entry passed`)).toBe(url);
	});
});

describe('repository screenshots', () => {
	it("lists the images in a repository's screenshot folders, English ones first", () => {
		// popMind's README has no image; its website's screenshots are in the repository.
		const paths = ['README.md', 'internal/assets/tray.png', 'website/public/og.png', 'website/public/shots/zh/clipboard.png', 'website/public/shots/en/translate.png', 'website/public/shots/en/clipboard.png', 'website/public/shots/en/notes.txt', 'docs/screenshots/demo.gif', 'docs/screenshots/main.webp', 'node_modules/x/screenshots/a.png', 'Screens/Main.JPG'];
		expect(repoScreenshots(paths)).toEqual(['website/public/shots/en/clipboard.png', 'website/public/shots/en/translate.png', 'docs/screenshots/demo.gif', 'docs/screenshots/main.webp', 'Screens/Main.JPG', 'website/public/shots/zh/clipboard.png']);
		expect(repoScreenshots(['README.md', 'assets/logo.png', 'myshots/a.png'])).toEqual([]);
	});

	it('finds likely screenshots outside specially named folders without taking branding assets', () => {
		const paths = ['docs/ui-baselines/windows/dashboard-empty.png', 'docs/design-mockup/pages.png', 'assets/demo-tools.png', 'website/public/main.webp', 'docs/demo.gif', 'assets/icon-preview.png', 'assets/banner-demo.jpg', 'assets/backdrop.jpg', 'frontend/public/wails.png', 'dist/screenshots/app.png', 'node_modules/x/docs/overview.png'];
		expect(repoLikelyScreenshots(paths)).toEqual(['docs/ui-baselines/windows/dashboard-empty.png', 'website/public/main.webp', 'assets/demo-tools.png', 'docs/demo.gif', 'docs/design-mockup/pages.png']);
	});
});

describe('categories', () => {
	it("reads the categories the catalog's schema allows", async () => {
		const schema = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/app.schema.json'), 'utf8'));
		const values = schemaEnum(schema, 'category');
		expect(values).toContain('DeveloperApplication');
		expect(values).toContain('UtilitiesApplication');
		expect(schemaEnum({}, 'category')).toEqual([]);
		expect(schemaEnum(null, 'category')).toEqual([]);
		const ui = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/ui.schema.json'), 'utf8'));
		expect(schemaEnum(ui, 'tag')).toEqual(['theme', 'retro', 'icons']);
		expect(schemaEnum(ui, 'surface')).toEqual(['go', 'tsx', 'both']);
		const plugin = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/plugin.schema.json'), 'utf8'));
		expect(schemaEnum(plugin, 'surface')).toEqual(['go', 'tsx', 'both']);
	});

	it('sets the category right after kind, in place', () => {
		const entry = { slug: 'cpa-bar', name: 'CPA-Bar', kind: 'go', url: 'https://x', added: 't' };
		setCategory(entry, 'DeveloperApplication');
		expect(Object.keys(entry)).toEqual(['slug', 'name', 'kind', 'category', 'url', 'added']);
		expect(entry).toMatchObject({ category: 'DeveloperApplication' });
		setCategory(entry, 'UtilitiesApplication');
		expect(Object.keys(entry)).toEqual(['slug', 'name', 'kind', 'category', 'url', 'added']);
		const kindless: Record<string, unknown> = { slug: 'x' };
		setCategory(kindless, 'GameApplication');
		expect(kindless).toEqual({ slug: 'x', category: 'GameApplication' });
	});
});

describe('README images', () => {
	it('lists Markdown and HTML images in order', () => {
		const md = '[![CI](https://github.com/a/b/actions/workflows/ci.yml/badge.svg)](x)\n<img src="docs/logo.png" width="64">\n\n![The app](docs/screenshot.png "Main window")\n![](<docs/two words.png>)';
		expect(readmeImages(md)).toEqual(['https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'docs/logo.png', 'docs/screenshot.png', 'docs/two words.png']);
	});

	it('downloads repository images raw, and skips badges and SVGs', () => {
		expect(resolveImage('docs/screenshot.png', 'legibet/myskills', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/legibet/myskills/main/docs/screenshot.png');
		expect(resolveImage('../shot.png', 'a/b', 'dev', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/dev/shot.png');
		expect(resolveImage('/shot.png?raw=true', 'a/b', 'main', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/main/shot.png');
		expect(resolveImage('https://github.com/a/b/blob/main/docs/s.png', 'a/b', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/a/b/main/docs/s.png');
		expect(resolveImage('https://github.com/user-attachments/assets/1234', 'a/b', 'main', 'README.md')).toBe('https://github.com/user-attachments/assets/1234');
		expect(resolveImage('https://img.shields.io/badge/go-1.27-blue', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('docs/diagram.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('http://example.com/s.png', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('data:image/png;base64,AAAA', 'a/b', 'main', 'README.md')).toBeUndefined();
	});

	it('knows an image by its bytes', () => {
		expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
		expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
		expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp');
		expect(sniffImage(new TextEncoder().encode('GIF89a'))).toBe('gif');
		expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
	});
});

describe("the form's defaults", () => {
	it("puts an app's group after its category, or else its kind", () => {
		const withCategory: Record<string, unknown> = { slug: 'a', kind: 'go', category: 'GameApplication', url: 'https://a.dev' };
		setGroup(withCategory, 'game');
		expect(Object.keys(withCategory)).toEqual(['slug', 'kind', 'category', 'group', 'url']);
		const bare: Record<string, unknown> = { slug: 'b', kind: 'tsx', url: 'https://b.dev' };
		setGroup(bare, 'notes');
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'group', 'url']);
		setGroup(bare, 'system');
		expect(bare.group).toBe('system');
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'group', 'url']);
	});

	it('asks the model for what the form fills in without asking, while it holds the default', () => {
		expect(formDefaults('app', { kind: 'go' })).toEqual({ choices: ['group'], tags: false, platforms: true });
		expect(formDefaults('app', { kind: 'go', category: 'GameApplication' })).toEqual({ choices: ['group'], tags: false, platforms: true });
		expect(formDefaults('app', { kind: 'tsx', group: 'game' })).toEqual({ choices: [], tags: false, platforms: true });
		// An icon set submitted through the form, left at theme and both.
		expect(formDefaults('ui', { tag: 'theme', surface: 'both' })).toEqual({ choices: ['tag', 'surface'], tags: false, platforms: false });
		expect(formDefaults('ui', { tag: 'icons', surface: 'both' })).toEqual({ choices: ['surface'], tags: false, platforms: false });
		expect(formDefaults('ui', { tag: 'icons', surface: 'go' })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('state', { tags: ['state'] })).toEqual({ choices: [], tags: true, platforms: false });
		expect(formDefaults('state', { tags: ['store', 'reactive'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('template', { surface: 'both', tags: ['template'] })).toEqual({ choices: ['surface'], tags: true, platforms: false });
		expect(formDefaults('template', { surface: 'tsx', tags: ['tailwind'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('ai', { type: 'skill', tags: ['ai'] })).toEqual({ choices: ['type'], tags: true, platforms: false });
		expect(formDefaults('ai', { type: 'mcp', tags: ['testing'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('plugin', { surface: 'go', tags: [] })).toEqual({ choices: ['surface'], tags: true, platforms: false });
		expect(formDefaults('plugin', { surface: 'both', tags: ['shaders'] })).toEqual({ choices: [], tags: false, platforms: false });
	});

	it("asks for an app's platforms while they are missing or the form's three desktops", () => {
		expect(formDefaults('app', { kind: 'go', group: 'game', platforms: ['mac', 'win', 'linux'] }).platforms).toBe(true);
		expect(formDefaults('app', { kind: 'go', group: 'game', platforms: ['linux', 'win', 'mac'] }).platforms).toBe(true);
		expect(formDefaults('app', { kind: 'go', group: 'game', platforms: ['win'] }).platforms).toBe(false);
		expect(formDefaults('app', { kind: 'go', group: 'game', platforms: ['mac', 'win', 'linux', 'ios'] }).platforms).toBe(false);
		expect(formDefaults('app', { kind: 'go', group: 'game', platforms: ['mac', 'win', 'linux', 'ios', 'android', 'web', 'miniprogram'] }).platforms).toBe(false);
		expect(platformsAtDefault({})).toBe(true);
		expect(platformsAtDefault({ platforms: ['linux'] })).toBe(false);
	});

	it('keeps only known platforms, each once, in the catalog order', () => {
		expect(cleanPlatforms(['Web', 'win', 'mac', 'android', ' linux ', 'ios', 'mac'])).toEqual(['mac', 'win', 'linux', 'ios', 'android', 'web']);
		expect(cleanPlatforms(['macos', 'tvos', 'watchos', 'wechat'])).toEqual([]);
		expect(cleanPlatforms(['miniprogram'])).toEqual(['miniprogram']);
	});

	it("puts an app's platforms right after its kind", () => {
		const bare: Record<string, unknown> = { slug: 'a', kind: 'go', group: 'dev', url: 'https://a.dev' };
		setPlatforms(bare, ['mac']);
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'platforms', 'group', 'url']);
		setPlatforms(bare, ['win', 'mac']);
		expect(bare.platforms).toEqual(['win', 'mac']);
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'platforms', 'group', 'url']);
	});

	it('keeps up to four lowercase tags, each once', () => {
		expect(cleanTags([' Store', 'store', 'Reactive', '', 'devtools', 'sync', 'extra'])).toEqual(['store', 'reactive', 'devtools', 'sync']);
	});
});

describe('homepages', () => {
	it("takes the repository's homepage when it is an https link elsewhere", () => {
		expect(homepageOf('https://nodra.yldm.ai', 'yldm-tech/nodra')).toBe('https://nodra.yldm.ai');
		expect(homepageOf(' https://x.dev/docs ', 'a/b')).toBe('https://x.dev/docs');
		expect(homepageOf('https://github.com/yldm-tech/Nodra/', 'yldm-tech/nodra')).toBeUndefined();
		expect(homepageOf('http://x.dev', 'a/b')).toBeUndefined();
		expect(homepageOf('', 'a/b')).toBeUndefined();
		expect(homepageOf(null, 'a/b')).toBeUndefined();
	});
});

describe('icons without an nsgo.yaml', () => {
	it('finds the icon file a project keeps in a usual place, largest first', () => {
		// A project that vendors NSGo and has no nsgo.yaml of its own.
		const bunnybox = ['README.md', 'assets/icon-256.png', 'assets/icon-64.png', 'assets/icon-source.png', 'assets/installer.ico', 'assets/tray-32.png', 'third_party/nsgo/examples/hello/assets/Icon.png'];
		expect(repoIcons(bunnybox)).toEqual(['assets/icon-256.png', 'assets/icon-64.png']);
		expect(repoIcons(['icon.png', 'build/appicon.png', 'build/icon_512x512.png'])).toEqual(['icon.png', 'build/appicon.png', 'build/icon_512x512.png']);
		expect(repoIcons(['examples/demo/resources/icon.png', 'node_modules/x/icon.png', 'docs/icon.png', 'internal/ui/icon.png'])).toEqual([]);
		expect(repoIcons(['desktop/assets/icon.png'])).toEqual(['desktop/assets/icon.png']);
		expect(repoIcons(['nsgo/assets/Icon.png'])).toEqual(['nsgo/assets/Icon.png']);
		// NSGo's own name for it, beside an nsgo.yaml that the caller could not read.
		expect(repoIcons(['assets/Icon.png', 'assets/AppIcon.icns'])).toEqual(['assets/Icon.png']);
	});
});

describe('screenshots as the form, its Worker and the workflow judge them', () => {
	it('says why an image is not a screenshot of an app', () => {
		expect(shotProblem(1280, 800)).toBeUndefined();
		// A phone screenshot, portrait, as NSGo apps run on iOS and Android.
		expect(shotProblem(1179, 2556)).toBeUndefined();
		expect(shotProblem(800, 1200)).toBeUndefined();
		// A README's first image is often the app's icon.
		expect(shotProblem(256, 256)).toBe('narrow');
		expect(shotProblem(1024, 1024)).toBe('square');
		expect(shotProblem(1024, 1100)).toBe('square');
		// Narrow stays narrow, portrait or not.
		expect(shotProblem(390, 844)).toBe('narrow');
		expect(shotProblem(800, 4000)).toBe('tall');
		expect(shotProblem(1500, 400)).toBe('banner');
	});

	it('puts an uploaded image under submissions/, named after the entry', () => {
		expect(stagedShot('bunnybox', 'jpeg')).toBe('submissions/bunnybox.jpg');
		expect(stagedShot('bunnybox', 'png')).toBe('submissions/bunnybox.png');
		expect(stagedShotOf(['other.png', 'bunnybox.webp'], 'bunnybox')).toBe('submissions/bunnybox.webp');
		expect(stagedShotOf(['bunnybox-2.png', 'bunnybox.gif'], 'bunnybox')).toBeUndefined();
		expect(stagedShotOf([], 'bunnybox')).toBeUndefined();
	});

	it("lists a repository's README images, screenshot folders and other likely screenshots, each once", () => {
		const sources = repoShotSources({
			repo: 'o/app',
			branch: 'main',
			paths: ['docs/screenshots/main.png', 'assets/hero.png'],
			readme: { path: 'README.md', text: '![](docs/screenshots/main.png)\n![hero](assets/hero.png)\n<img src="https://example.com/b.png">' },
		});
		expect(sources).toEqual([
			{ from: 'the README', urls: ['https://raw.githubusercontent.com/o/app/main/docs/screenshots/main.png', 'https://raw.githubusercontent.com/o/app/main/assets/hero.png', 'https://example.com/b.png'], tries: 8 },
			{ from: 'a screenshot folder in the repository', urls: [], tries: 6 },
			{ from: 'another likely screenshot file in the repository', urls: [], tries: 12 },
		]);
		expect(repoShotSources({ repo: 'o/app', branch: 'main', paths: [] })).toEqual([
			{ from: 'the README', urls: [], tries: 8 },
			{ from: 'a screenshot folder in the repository', urls: [], tries: 6 },
			{ from: 'another likely screenshot file in the repository', urls: [], tries: 12 },
		]);
	});
});
