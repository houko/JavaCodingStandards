import { type DraftField, type LangCode, SITE_REPO, type SubmitCat, buildEntry, descMax, editUrl, entryCats, entryPath, entryProblem, fill, guessFromLink, isBadRepo, isBadShot, isBadUrl, isEntryComplete, issueUrl, jsonEntry, missingFields, needsAuthor, needsRepo, parseEntryJson, pastedEntryProblem, pastedName, pastedShotRepo, placeholderProblem, repoOf, shotRepo, takesShot, withScheme } from '@awesome-nsgo/catalog';
import { UPLOAD_MAX_BYTES, shotProblem } from '@awesome-nsgo/enrich/source';
import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from './lang';
import { useSite } from './site';
import { loadTurnstile } from './turnstile';

// The submit form's state and actions, shared by the original look's modal and the retro look's dialog; each renders its own markup.

// Whether the site's bot can submit for visitors without a GitHub account (see routes/api/submit.ts). Asked once per page load; until it answers, or when it is off, the form offers the GitHub links only.
type Bot = { enabled: false } | { enabled: true; siteKey: string };
let botQuery: Promise<Bot> | undefined;

export function queryBot(): Promise<Bot> {
	botQuery ??= fetch('/api/submit')
		.then((res) => (res.ok ? (res.json() as Promise<Bot>) : { enabled: false as const }))
		.catch(() => {
			botQuery = undefined;
			return { enabled: false as const };
		});
	return botQuery;
}

function useBot(): Bot {
	const [bot, setBot] = useState<Bot>({ enabled: false });
	useEffect(() => {
		let live = true;
		queryBot().then((b) => live && setBot(b));
		return () => {
			live = false;
		};
	}, []);
	return bot;
}

export type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; url: string; number: number } | { kind: 'error'; message: string };

// What the bot found of a screenshot in the project's repository (GET /api/shot): one it will take (found), none (none), no repository to look in (no-repo, as for a closed-source app), or no answer (unknown, when the Worker decides at submission). Only none and no-repo make the form ask for one.
export type ShotCheck = { kind: 'idle' } | { kind: 'checking' } | { kind: 'found' } | { kind: 'none' } | { kind: 'no-repo' } | { kind: 'unknown' };

// What GET /api/shot says of the screenshot in a GitHub repository (owner/name), asked by the form and by the WebMCP tools (lib/webmcp.ts). Answers are kept for a minute per page, so an agent checking an entry again and again, and the form opening on what the agent filled in, do not spend the visitor's 20 checks a minute (SHOT_LIMIT); a minute is short enough that a screenshot the author has just added is soon seen. unknown, when the Worker gave no answer (too many checks, GitHub failing), is not kept.
const SHOT_TTL = 60_000;
const shotChecks = new Map<string, { at: number; check: Promise<ShotCheck> }>();

export function checkShot(repo: string): Promise<ShotCheck> {
	const kept = shotChecks.get(repo);
	if (kept && Date.now() - kept.at < SHOT_TTL) return kept.check;
	const check = fetch(`/api/shot?repo=${encodeURIComponent(repo)}`)
		.then((res) => (res.ok ? (res.json() as Promise<{ found?: boolean; reason?: string }>) : undefined))
		.then((body): ShotCheck => (!body ? { kind: 'unknown' } : body.found ? { kind: 'found' } : { kind: body.reason === 'no-repo' ? 'no-repo' : 'none' }))
		.catch((): ShotCheck => ({ kind: 'unknown' }));
	shotChecks.set(repo, { at: Date.now(), check });
	check.then((c) => c.kind === 'unknown' && shotChecks.get(repo)?.check === check && shotChecks.delete(repo));
	return check;
}

// An image the visitor picked to upload, with its preview, and why it cannot be the screenshot if it cannot.
export type ShotFile = { file: File; preview: string; problem?: string };

const SHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// The Turnstile widget. A token is good for one submission, so changing `round` renders a fresh widget. It stays out of sight unless Cloudflare needs the visitor to click, so most visitors never see it, and so says nothing when it fails: onFail is called when the script does not load and on every error the widget reports (a hostname the site key does not allow, a network failure, a challenge the visitor did not pass), so that the form can say so instead of waiting for a token that will not come. Turnstile retries some errors by itself; a token that arrives later still reaches onToken. `theme` defaults to 'auto', which follows the visitor's colour scheme as the original look does; the retro look, which is always light, passes 'light'.
export function Captcha({ siteKey, lang, round, onToken, onFail, theme = 'auto', className }: { siteKey: string; lang: LangCode; round: number; onToken: (token: string) => void; onFail: () => void; theme?: 'auto' | 'dark' | 'light'; className?: string }) {
	const box = useRef<HTMLDivElement>(null);
	const handlers = useRef({ onToken, onFail });
	handlers.current = { onToken, onFail };
	useEffect(() => {
		let live = true;
		let remove: (() => void) | undefined;
		loadTurnstile().then(
			(ts) => {
				if (!live || !box.current) return;
				const id = ts.render(box.current, {
					sitekey: siteKey,
					theme,
					size: 'flexible',
					appearance: 'interaction-only',
					language: lang.toLowerCase(),
					callback: (token) => handlers.current.onToken(token),
					'expired-callback': () => handlers.current.onToken(''),
					'error-callback': () => {
						handlers.current.onToken('');
						handlers.current.onFail();
					},
				});
				remove = () => ts.remove(id);
			},
			() => live && handlers.current.onFail(),
		);
		return () => {
			live = false;
			remove?.();
		};
	}, [siteKey, lang, round, theme]);
	// Turnstile renders nothing here unless it needs the visitor to click; then it is 65 px tall. Each look places the box through className: the original look hides it while empty, so it takes no gap in its form.
	return <div ref={box} className={className} />;
}

export function useSubmit() {
	const { form, setFormField, sendStarted, sendEnded } = useSite();
	const t = useT();
	const lang = useLang();
	const bot = useBot();
	const [token, setToken] = useState('');
	const [round, setRound] = useState(0);
	// Set when the bot check failed (Captcha's onFail) and no token has come since; cleared by a token or a retry.
	const [checkFailed, setCheckFailed] = useState(false);
	const [status, setStatus] = useState<Status>({ kind: 'idle' });
	// The link is judged once the visitor leaves the field, not while they are still typing it.
	const [urlTouched, setUrlTouched] = useState(false);
	const [repoTouched, setRepoTouched] = useState(false);
	const [shotTouched, setShotTouched] = useState(false);
	const [shotFile, setShotFile] = useState<ShotFile | undefined>();
	const [shotCheck, setShotCheck] = useState<ShotCheck>({ kind: 'idle' });

	// A result or an error belongs to what was submitted; editing the form clears it.
	useEffect(() => setStatus({ kind: 'idle' }), [form.cat, form.mode, form.name, form.author, form.url, form.repo, form.screenshot, form.desc, form.group, form.via, form.json, shotFile]);

	const catLabel: Record<SubmitCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, template: t.cat_tpl_name, ai: t.cat_ai_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };
	const isShow = form.cat === 'showcase';
	const max = descMax(form.cat);
	const urlBad = urlTouched && isBadUrl(form.url);
	const repoBad = isShow && repoTouched && isBadRepo(form.repo ?? '');
	// An app, UI components, state management, a template and an AI tool show a screenshot, which the form asks for when their repository has none.
	const withShot = takesShot(form.cat);
	const shotBad = withShot && shotTouched && isBadShot(form.screenshot ?? '');
	// What the main link is: a showcase app's homepage, the repository of a UI library, state solution, template or AI tool, or just a link.
	const urlLabel = isShow ? t.m_home : needsRepo(form.cat) ? t.m_gh : t.m_link;
	// A pasted entry: what it is, and what keeps it from being submitted as an entry of the picked category.
	const viaJson = form.via === 'json';
	const pasted = viaJson && form.json.trim() ? parseEntryJson(form.json) : undefined;
	const pastedEntry = pasted && 'entry' in pasted ? pasted.entry : undefined;
	const jsonError = !pasted ? undefined : 'error' in pasted ? (pasted.error === 'json' ? t.m_json_bad : t.m_json_obj) : (pastedEntryProblem(form.cat, pasted.entry) ?? placeholderProblem(pasted.entry));
	const ok = viaJson ? Boolean(pastedEntry) && !jsonError : isEntryComplete(form.cat, form) && form.desc.length <= max;
	const ph = { name: t.m_name, desc: t.md_desc };
	const withAuthor = needsAuthor(form.cat);
	// The fields only an app has are dropped for the other categories, also when they were filled in before the category changed.
	const draft = isShow ? form : { ...form, group: undefined, repo: undefined, screenshot: withShot ? form.screenshot : undefined };
	// The entry as it will be filed: the pasted one, or the one the form builds. Its file is named after its slug.
	const entryObj = pastedEntry ?? buildEntry(form.cat, draft, form.mode, ph);
	const file = entryPath(form.cat, entryObj);
	// The shape of the category's entry, shown in the empty JSON field.
	const example = jsonEntry(form.cat, { name: '', author: '', url: '', desc: '' }, form.mode, ph);
	const entry = pastedEntry ? JSON.stringify(pastedEntry, null, 2) : jsonEntry(form.cat, draft, form.mode, ph);
	// Every category ends up as an entry in a JSON file here: either an issue prefilled with the entry, or GitHub's editor with the entry's new file filled in, for a pull request.
	const issue = issueUrl(SITE_REPO, form.cat, catLabel[form.cat], pastedEntry ? { ...draft, name: pastedName(pastedEntry) } : draft, entry, ph);
	const edit = editUrl(SITE_REPO, form.cat, entryObj);
	const repoMissing = urlTouched && needsRepo(form.cat) && form.url.length > 0 && !isBadUrl(form.url) && !repoOf(form.url);

	// The repository the screenshot is looked for in, once the links say which; an app with a homepage and no repository has none, and needs a screenshot from the form.
	const linkReady = form.url.trim() !== '' && !isBadUrl(form.url) && !isBadRepo(form.repo ?? '');
	const checkRepo = !withShot || !bot.enabled ? undefined : viaJson ? (pastedEntry ? pastedShotRepo(form.cat, pastedEntry) : undefined) : linkReady ? shotRepo(form.cat, form) : undefined;
	const noRepo = withShot && bot.enabled && !checkRepo && (viaJson ? Boolean(pastedEntry) : linkReady && isShow);
	useEffect(() => {
		if (!checkRepo) return setShotCheck({ kind: noRepo ? 'no-repo' : 'idle' });
		let live = true;
		setShotCheck({ kind: 'checking' });
		// Asked once the visitor stops typing the link.
		const timer = setTimeout(() => checkShot(checkRepo).then((c) => live && setShotCheck(c)), 500);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [checkRepo, noRepo]);

	// Picking an image: its preview, and why it cannot be the screenshot, judged as the Worker and the submission workflow judge it.
	const onShotFile = async (file: File | undefined) => {
		if (!file) return setShotFile(undefined);
		const preview = URL.createObjectURL(file);
		let problem: string | undefined;
		if (!SHOT_TYPES.includes(file.type)) problem = t.m_shot_type;
		else if (file.size > UPLOAD_MAX_BYTES) problem = t.m_shot_size;
		else {
			const bitmap = await createImageBitmap(file).catch(() => undefined);
			if (!bitmap) problem = t.m_shot_type;
			else {
				if (shotProblem(bitmap.width, bitmap.height)) problem = fill(t.m_shot_shape, { x: `${bitmap.width}×${bitmap.height}` });
				bitmap.close();
			}
		}
		setShotFile({ file, preview, problem });
	};
	useEffect(() => () => shotFile && URL.revokeObjectURL(shotFile.preview), [shotFile]);

	const upload = withShot && bot.enabled && shotFile && !shotFile.problem ? shotFile.file : undefined;
	const shotLink = withShot && !viaJson && form.screenshot?.trim() && !isBadShot(form.screenshot) ? form.screenshot.trim() : undefined;
	const shotRequired = shotCheck.kind === 'none' || shotCheck.kind === 'no-repo';
	const shotMissing = shotRequired && !upload && !shotLink;
	// What the form says under the screenshot field about the repository.
	const shotNote = shotCheck.kind === 'checking' ? t.m_shot_checking : shotCheck.kind === 'found' ? t.m_shot_found : shotCheck.kind === 'none' ? t.m_shot_need : shotCheck.kind === 'no-repo' ? t.m_shot_norepo : undefined;
	const canSend = bot.enabled && (viaJson ? ok : !entryProblem(form.cat, draft)) && token !== '' && status.kind !== 'sending' && shotCheck.kind !== 'checking' && !shotMissing && !(withShot && shotFile?.problem);

	// Pasting an entry that only one category takes picks that category.
	const onJsonChange = (text: string) => {
		setFormField('json', text);
		const p = text.trim() ? parseEntryJson(text) : undefined;
		if (!p || !('entry' in p)) return;
		const cats = entryCats(p.entry);
		if (cats.length === 1 && cats[0] !== form.cat) setFormField('cat', cats[0]);
	};

	// Leaving a link field: add the missing https://, and from a GitHub repository link fill in the name and author the visitor has not typed.
	const fillFrom = (url: string) => {
		const guess = guessFromLink(url);
		if (!guess) return;
		if (!form.name.trim()) setFormField('name', guess.name);
		if (withAuthor && !form.author.trim()) setFormField('author', guess.author);
	};
	const onUrlBlur = () => {
		setUrlTouched(true);
		const url = withScheme(form.url);
		if (url !== form.url) setFormField('url', url);
		fillFrom(url);
	};
	const onRepoBlur = () => {
		setRepoTouched(true);
		const repo = withScheme(form.repo ?? '');
		if (repo !== form.repo) setFormField('repo', repo);
		fillFrom(repo);
	};
	const onShotBlur = () => {
		setShotTouched(true);
		const shot = withScheme(form.screenshot ?? '');
		if (shot !== form.screenshot) setFormField('screenshot', shot);
	};

	// Why the submit button is not ready yet, in words.
	const fieldLabel: Record<DraftField, string> = { url: urlLabel, name: t.m_name, author: t.m_author, desc: t.m_desc_l };
	const missing = [...(viaJson ? [] : missingFields(form.cat, form).map((f) => fieldLabel[f])), ...(shotMissing ? [t.m_shot] : [])];
	const need = viaJson && !pasted ? fill(t.sub_need, { x: t.m_json }) : missing.length > 0 ? fill(t.sub_need, { x: new Intl.ListFormat(lang, { type: 'conjunction' }).format(missing) }) : '';
	const hint = status.kind === 'sending' || status.kind === 'done' ? '' : need || (viaJson && jsonError ? t.m_json_fix : shotCheck.kind === 'checking' ? t.m_shot_checking : bot.enabled && !token && !checkFailed ? t.sub_wait : '');

	const errorText = (body: { error?: string; message?: string }): string => {
		switch (body.error) {
			case 'limited':
				return t.sub_limited;
			case 'busy':
				return t.sub_busy;
			case 'captcha':
				return t.sub_captcha;
			case 'shot':
				return t.sub_shot;
			case 'invalid':
				return body.message ? fill(t.sub_err, { x: body.message }) : t.sub_failed;
			default:
				return t.sub_failed;
		}
	};

	const send = async () => {
		setStatus({ kind: 'sending' });
		sendStarted();
		let pr: { url: string; number: number } | undefined;
		try {
			const payload = JSON.stringify(pastedEntry ? { cat: form.cat, entry: pastedEntry, token } : { cat: form.cat, mode: form.mode, name: form.name, author: withAuthor ? form.author : '', url: form.url, repo: isShow ? form.repo : undefined, screenshot: shotLink, desc: form.desc, group: isShow ? form.group : undefined, token });
			// With an image, the JSON goes as one part of a multipart body and the image as another.
			let requestBody: BodyInit = payload;
			if (upload) {
				const parts = new FormData();
				parts.set('payload', payload);
				parts.set('shot', upload);
				requestBody = parts;
			}
			const res = await fetch('/api/submit', { method: 'POST', ...(upload ? {} : { headers: { 'content-type': 'application/json' } }), body: requestBody });
			const body = (await res.json().catch(() => ({}))) as { url?: string; number?: number; error?: string; message?: string };
			if (res.ok && body.url && body.number) pr = { url: body.url, number: body.number };
			setStatus(pr ? { kind: 'done', ...pr } : { kind: 'error', message: errorText(body) });
		} catch {
			setStatus({ kind: 'error', message: t.sub_failed });
		}
		sendEnded(pr);
		setToken('');
		setRound((n) => n + 1);
	};

	// What the form hands Captcha, and the retry that renders a fresh widget after a failure.
	const onCheckToken = (next: string) => {
		setToken(next);
		if (next) setCheckFailed(false);
	};
	const onCheckFail = () => setCheckFailed(true);
	const retryCheck = () => {
		setCheckFailed(false);
		setToken('');
		setRound((n) => n + 1);
	};
	// Shown while the check has failed, so the visitor is not left reading sub_wait for a token that will not come.
	const checkError = bot.enabled && checkFailed && !token && status.kind !== 'sending' && status.kind !== 'done' ? t.sub_check_fail : undefined;

	return { bot, lang, token, onCheckToken, onCheckFail, retryCheck, checkError, round, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint, viaJson, jsonError, onJsonChange, example, repoBad, onRepoBlur, shotBad, onShotBlur, urlLabel, withShot, shotFile, onShotFile, shotRequired, shotNote };
}
