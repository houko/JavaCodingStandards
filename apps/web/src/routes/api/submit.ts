import { MAX_SUBMISSION, CatalogError, type SubmitRequest, buildEntry, entryProblem, parseSubmission, pastedEntryProblem, pastedName, pastedShotRepo, placeholderProblem, shotRepo, takesShot } from '@awesome-nsgo/catalog';
import { UPLOAD_MAX_BYTES } from '@awesome-nsgo/enrich/source';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { SubmissionsBusy, type Upload, openSubmission } from '../../server/pull';
import { checkUpload, repoLacksShot } from '../../server/shots';
import { botConfig, installation, installationToken, verifyTurnstile } from '../../server/submit';

// GET says whether the bot is set up (and gives the Turnstile site key); POST submits an entry, as JSON, or as multipart/form-data with the JSON in payload and an uploaded screenshot in shot. Error codes: invalid, shot (an app, UI components or state management with no screenshot to show: none given and none in its repository), limited, captcha, busy, disabled, github.

// What the form sent (parseSubmission), with the screenshot uploaded with it, if any.
type Submission = SubmitRequest & { shot?: Uint8Array };

const MAX_BODY = MAX_SUBMISSION;
// A multipart body: the JSON, the screenshot and the parts' headers.
const MAX_MULTIPART = UPLOAD_MAX_BYTES + MAX_BODY + 4 * 1024;

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

// The request body is untrusted: anything but the expected shape is rejected here, before any field is used. A multipart body must say its length, so an oversized one is refused before it is read.
async function readSubmission(request: Request): Promise<Submission | undefined> {
	const length = Number(request.headers.get('content-length') ?? 0);
	let text: string;
	let shot: Uint8Array | undefined;
	try {
		if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
			if (!length || length > MAX_MULTIPART) return undefined;
			const form = await request.formData();
			const payload = form.get('payload');
			const file = form.get('shot');
			if (typeof payload !== 'string' || (file !== null && typeof file === 'string')) return undefined;
			text = payload;
			if (file) shot = new Uint8Array(await file.arrayBuffer());
		} else {
			if (length > MAX_BODY) return undefined;
			text = await request.text();
		}
	} catch {
		return undefined;
	}
	if (text.length > MAX_BODY) return undefined;
	const sub = parseSubmission(text);
	return sub && { ...sub, shot };
}

// The screenshot of what is submitted, when it needs one: an app, UI components or state management with neither a link nor an upload from the form. undefined when the repository has one the submission workflow will take, or GitHub could not say (repoLacksShot), 'shot' when nothing would show.
async function missingShot(cfg: NonNullable<ReturnType<typeof botConfig>>, sub: Submission): Promise<'shot' | undefined> {
	if (!takesShot(sub.cat) || sub.shot || (sub.kind === 'form' && sub.draft.screenshot?.trim())) return undefined;
	const repo = sub.kind === 'form' ? shotRepo(sub.cat, sub.draft) : pastedShotRepo(sub.cat, sub.entry);
	if (!repo) return 'shot';
	return (await repoLacksShot(repo, installationToken(cfg))) ? 'shot' : undefined;
}

export const Route = createFileRoute('/api/submit')({
	server: {
		handlers: {
			GET: () => {
				const cfg = botConfig();
				return json(cfg ? { enabled: true, siteKey: cfg.siteKey } : { enabled: false });
			},
			POST: async ({ request }) => {
				const cfg = botConfig();
				if (!cfg) return json({ error: 'disabled' }, 503);
				const ip = request.headers.get('cf-connecting-ip') ?? '';
				if (!(await env.SUBMIT_LIMIT.limit({ key: ip || 'unknown' })).success) return json({ error: 'limited' }, 429);
				const sub = await readSubmission(request);
				if (!sub) return json({ error: 'invalid', message: `expected a JSON object with cat, token and either entry (a whole entry) or name, url, desc, author, an optional screenshot link for an app, UI components or state management, and for the showcase an optional category and repo; with an uploaded screenshot, multipart/form-data with the JSON in payload and the image (at most ${UPLOAD_MAX_BYTES / 1024 / 1024} MB) in shot` }, 400);
				const problem = sub.kind === 'entry' ? (pastedEntryProblem(sub.cat, sub.entry) ?? placeholderProblem(sub.entry)) : entryProblem(sub.cat, sub.draft);
				if (problem) return json({ error: 'invalid', message: problem }, 400);
				if (sub.shot && !takesShot(sub.cat)) return json({ error: 'invalid', message: 'only an app, UI components or state management take a screenshot' }, 400);
				const checked = sub.shot ? checkUpload(sub.shot) : undefined;
				if (checked && 'problem' in checked) return json({ error: 'invalid', message: checked.problem }, 400);
				if (!(await verifyTurnstile(cfg.turnstileSecret, sub.token, ip))) return json({ error: 'captcha' }, 403);
				if (await missingShot(cfg, sub)) return json({ error: 'shot' }, 400);
				const upload: Upload | undefined = sub.shot && checked && 'format' in checked ? { bytes: sub.shot, format: checked.format } : undefined;
				const [entry, name] = sub.kind === 'entry' ? [sub.entry, pastedName(sub.entry)] : [buildEntry(sub.cat, sub.draft, sub.mode, { name: '', desc: '' }), sub.draft.name.trim()];
				try {
					const screenshot = sub.kind === 'form' ? sub.draft.screenshot?.trim() || undefined : undefined;
					return json(await openSubmission(await installation(cfg), sub.cat, name, entry, { screenshot, upload }));
				} catch (err) {
					if (err instanceof CatalogError) return json({ error: 'invalid', message: err.message }, 409);
					if (err instanceof SubmissionsBusy) return json({ error: 'busy' }, 503);
					console.error('submission failed', err);
					return json({ error: 'github' }, 502);
				}
			},
		},
	},
});
