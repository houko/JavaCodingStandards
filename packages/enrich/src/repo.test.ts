import { describe, expect, it } from 'vitest';
import { type RepoFacts, iconSource, parseNsgoConfig } from './repo.ts';

const facts = (paths: string[], config?: unknown): RepoFacts => ({
	repo: 'owner/app',
	branch: 'main',
	paths,
	...(config === undefined ? {} : { nsgo: { path: 'desktop/nsgo.yaml', text: '', config } }),
});

describe('nsgo.yaml', () => {
	it('reads the fields NSGo reads from it', () => {
		// As nsgo init writes it (initYAML in cmd/nsgo/init.go), with some of its comments.
		const scaffold = [
			'name: Hello',
			'id: dev.nsgo.hello',
			'version: 0.1.0',
			'',
			'# macOS and iOS use assets/AppIcon.icon, or assets/AppIcon.icns on macOS; the',
			'# other targets, and Apple ones without those, use assets/Icon.png. To use',
			'# other files, name them here:',
			'# icon:',
			'#   apple: assets/AppIcon.icon  # an Icon Composer .icon; macOS also takes .icns',
			'#   png: assets/Icon.png        # a square PNG, 1024 pixels wide',
			'',
			'dev:',
			'  # native: this machine\'s backend; web: the browser.',
			'  target: native',
			'  hot_reload: true',
			'',
			'build:',
			'  output: dist',
			'  open: false',
			'  targets: [macos_arm64, windows_x64, ios_simulator, android_arm64, web]',
			'',
		].join('\n');
		expect(parseNsgoConfig(scaffold)).toEqual({ name: 'Hello', id: 'dev.nsgo.hello', version: '0.1.0', dev: { target: 'native', hot_reload: true }, build: { output: 'dist', open: false, targets: ['macos_arm64', 'windows_x64', 'ios_simulator', 'android_arm64', 'web'] } });
		expect(parseNsgoConfig('name: Flow\nicon:\n  png: art/icon.png\n  apple: art/Flow.icon\n')).toEqual({ name: 'Flow', icon: { png: 'art/icon.png', apple: 'art/Flow.icon' } });
		expect(parseNsgoConfig('')).toBeNull();
		expect(parseNsgoConfig('# only a comment\n')).toBeNull();
	});

	it('throws on a file that is not YAML', () => {
		expect(() => parseNsgoConfig('name: [unclosed\n')).toThrow();
		expect(() => parseNsgoConfig('name: a\n  bad: indent\n')).toThrow();
	});
});

describe('repository icon source', () => {
	it('prefers the icon named by nsgo.yaml', () => {
		expect(iconSource(facts(['desktop/art/icon.png', 'assets/icon.png'], { icon: { png: 'art/icon.png' } }))).toEqual({
			path: 'desktop/art/icon.png',
			url: 'https://raw.githubusercontent.com/owner/app/main/desktop/art/icon.png',
			guessed: false,
		});
	});

	it("takes assets/Icon.png beside nsgo.yaml, as NSGo's CLI does", () => {
		expect(iconSource(facts(['desktop/assets/Icon.png', 'assets/icon.png'], { name: 'App' }))).toEqual({
			path: 'desktop/assets/Icon.png',
			url: 'https://raw.githubusercontent.com/owner/app/main/desktop/assets/Icon.png',
			guessed: false,
		});
	});

	it('falls back to a repository icon when nsgo.yaml places none or only one for Apple', () => {
		const fallback = {
			path: 'assets/icon.png',
			url: 'https://raw.githubusercontent.com/owner/app/main/assets/icon.png',
			guessed: true,
		};
		expect(iconSource(facts(['assets/icon.png'], {}))).toEqual(fallback);
		expect(iconSource(facts(['assets/icon.png'], { icon: { apple: 'AppIcon.icon' } }))).toEqual(fallback);
		// Without an nsgo.yaml at all, as in Jungley8/exodrive.
		expect(iconSource(facts(['assets/icon.png']))).toEqual(fallback);
	});

	it('says why there is no icon', () => {
		expect(iconSource(facts([], { icon: { apple: 'AppIcon.icon' } }))).toEqual({ why: "the app's only icon is `desktop/AppIcon.icon`, for Apple's targets only (an Icon Composer .icon or an .icns), which cannot be converted here" });
		expect(iconSource(facts(['desktop/assets/AppIcon.icns'], { name: 'App' }))).toEqual({ why: "the app's only icon is `desktop/assets/AppIcon.icns`, for Apple's targets only (an Icon Composer .icon or an .icns), which cannot be converted here" });
		expect(iconSource(facts(['desktop/app.go'], { name: 'App' }))).toEqual({ why: '`desktop/nsgo.yaml` names no icon.png and there is no assets/Icon.png beside it' });
		expect(iconSource(facts(['main.go']))).toEqual({ why: 'the repository has neither an nsgo.yaml nor an icon file where projects usually keep one' });
	});
});
