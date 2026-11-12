import { AGENT_INPUT_SCHEMA, type AgentSubmission, agentSubmissionReport, missingFields, pastedShotRepo, readAgentSubmission, shotRepo, takesShot } from '@awesome-nsgo/catalog';
import { createIsomorphicFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { type RefObject, useEffect, useRef } from 'react';
import { type SubmitForm, useSite } from './site';
import { checkShot, queryBot } from './submit';

// WebMCP (https://webmachinelearning.github.io/webmcp/): a page registers tools that an AI agent in the browser can call. TypeScript's DOM types have none yet, so only what the site uses is declared, as the spec stood in 2026-11; browsers without it (most, today) leave document.modelContext undefined. Chrome offers it through an origin trial, whose token the root route puts in every page's head when the Worker has one (WEBMCP_ORIGIN_TRIAL).
interface ModelContextTool {
	name: string;
	title?: string;
	description: string;
	inputSchema?: object;
	execute(input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown>;
	annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
}
interface ModelContext {
	registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): Promise<void>;
}
declare global {
	interface Document {
		readonly modelContext?: ModelContext;
	}
}

// Chrome's WebMCP origin-trial token for the site's origin, from the Worker's WEBMCP_ORIGIN_TRIAL, which the root route's head puts in a <meta http-equiv="origin-trial"> so visitors on stable Chrome get document.modelContext; nothing is emitted while it is unset. The server reads the Worker's env; the browser, which runs the head again on hydrating and on every navigation, reads the tag the server rendered, so both render the same head.
export const readOriginTrial = createIsomorphicFn()
	.server((): string | undefined => env.WEBMCP_ORIGIN_TRIAL || undefined)
	.client((): string | undefined => document.querySelector<HTMLMetaElement>('meta[http-equiv="origin-trial"]')?.content || undefined);

// A browser extension for a visitor whose AI does not read Chrome's own WebMCP, which the origin-trial token turns on for the site: MCP-B Agent puts its own document.modelContext into every page at document_start, and the tools register with it. On 2026-11-06, against production with the token live, the tools reached both native WebMCP on Chromium 156 and MCP-B Agent 1.1.0.243 in a browser that had it installed. Both submit dialogs link it at the end of their note on letting an AI fill the form in.
export const WEBMCP_EXTENSION = { name: 'MCP-B Agent', url: 'https://chromewebstore.google.com/detail/daohopfhkdelnpemnhlekblhnikhdhfa' };

type Site = ReturnType<typeof useSite>;

// What a tool answers, as plain JSON: the browser hands the agent JSON.stringify of it. A problem is reported here rather than thrown, since a thrown error reaches the agent as a bare OperationError with no message.
interface Answer {
	ok: boolean;
	problems: string[];
	filled?: boolean;
	file?: string;
	entry?: Record<string, unknown>;
	screenshot?: string;
	submit?: 'bot' | 'github';
	// The pull request of a submission the user sent from the form before this fill, whose link the form no longer shows.
	sent?: string;
	next: string;
}

// The site does not enforce that the visitor sends the submission: an agent that drives the page could press Submit itself. The tools ask it to leave that to the visitor, and the dialog tells the visitor an AI agent filled it in; Turnstile, the per-IP limit and a maintainer's review stay in front of the catalog either way.
const NEXT = {
	checked: "Ready. Call fill-submission with the same input to put it in the site's submit form; then ask the user to check it and send it themselves.",
	fix: 'Fix the problems and call the tool again.',
	sending: 'The form is sending a submission. Call fill-submission again once the submission in progress has finished.',
	cancelled: 'The call was cancelled before the form was filled in; the page is as it was.',
	bot: "The submit form on this page is filled in. Ask the user to check every field and press its Submit button themselves; Cloudflare may ask them to tick a captcha. The site's bot then opens a pull request on GitHub and the form shows its link. Leave the sending to the user.",
	github: "The submit form on this page is filled in, but the site cannot submit for visitors right now. Ask the user to check it and send it themselves with the form's GitHub issue link or GitHub's editor link; both need a GitHub account.",
	needs: 'The submit form on this page is open and filled in, but the problems list what is still needed. Get it from the user and call fill-submission again with it, or ask the user to complete the form; then ask them to check every field and send it themselves.',
};

// The catalog's checks, then the screenshot, which the form asks for only when the bot is on and the repository it would take one from has none. needs are what is still to be given, which the form leaves room for; problems are what it would not explain, so fill-submission leaves the page alone while there are any. details are the part of the answer both tools give.
async function judge(sub: AgentSubmission) {
	const { needs, problems, file, entry } = agentSubmissionReport(sub);
	const bot = await queryBot();
	let screenshot: string | undefined;
	const linked = sub.via === 'json' || !missingFields(sub.cat, sub.draft).includes('url');
	if (bot.enabled && problems.length === 0 && linked && takesShot(sub.cat) && !(sub.via === 'form' && sub.draft.screenshot?.trim())) {
		const repo = sub.via === 'form' ? shotRepo(sub.cat, sub.draft) : pastedShotRepo(sub.cat, sub.entry);
		const shot = repo ? (await checkShot(repo)).kind : 'no-repo';
		if (shot === 'none' || shot === 'no-repo') {
			const why = shot === 'none' ? "its repository's README shows none the site can take" : 'it has no GitHub repository to take one from';
			needs.push(sub.via === 'form' ? `still needed: a screenshot, as ${why}; pass screenshot, an https link to an image of it, or ask the user to upload one in the form` : `still needed: a screenshot, as ${why}, which a pasted entry cannot carry; ask the user to upload one in the form, or pass the fields with a screenshot link instead`);
		} else if (shot === 'found') screenshot = 'its repository has one the site will take';
		// A need, so the agent does not tell the user the entry is ready: the form checks again on its own and asks for a screenshot if the repository turns out to have none.
		else needs.push(`could not check right now whether its repository has a screenshot the site can take (too many checks, or GitHub did not answer); call again in a minute, or ${sub.via === 'form' ? 'pass screenshot, an https link to an image of it, or ' : ''}ask the user to upload one in the form`);
	}
	// The built entry only once nothing is missing: until then it holds the stand-ins the checks fill the gaps with, which an agent could take for the values.
	const details = { file, ...(sub.via === 'form' && needs.length === 0 ? { entry } : {}), ...(screenshot ? { screenshot } : {}), submit: bot.enabled ? ('bot' as const) : ('github' as const) };
	return { needs, problems, file, bot, details };
}

// The whole form for a submission: every field set, so nothing from what the form held before stays behind, such as a screenshot link that would go into the issue of a pasted entry.
function formOf(sub: AgentSubmission): SubmitForm {
	const blank = { name: '', author: '', url: '', desc: '', repo: '', screenshot: '', group: undefined, json: '' };
	if (sub.via === 'json') return { ...blank, cat: sub.cat, mode: 'go', via: 'json', json: JSON.stringify(sub.entry, null, 2) };
	return { ...blank, ...sub.draft, repo: sub.draft.repo ?? '', screenshot: sub.draft.screenshot ?? '', cat: sub.cat, mode: sub.mode, via: 'form' };
}

const checkTool: ModelContextTool = {
	name: 'check-submission',
	title: 'Check a catalog submission',
	description: 'Checks an entry for the Awesome NSGo catalog without changing the page: an app built with NSGo (showcase), a UI component library, state management, a template, an AI tool, a plugin or an article. Give its fields, or a whole entry as JSON. Returns ok, the problems that would keep it from being submitted (missing or invalid fields, already listed, a screenshot its repository lacks) and the entry and file it would become.',
	inputSchema: AGENT_INPUT_SCHEMA,
	annotations: { readOnlyHint: true },
	async execute(input) {
		const read = readAgentSubmission(input);
		if ('problems' in read) return { ok: false, problems: read.problems, next: NEXT.fix } satisfies Answer;
		const j = await judge(read.submission);
		const problems = [...j.problems, ...j.needs];
		return { ok: problems.length === 0, problems, ...j.details, next: problems.length === 0 ? NEXT.checked : NEXT.fix } satisfies Answer;
	},
};

// Reads the site through a ref, which always holds the latest render's value, since the tool is registered once for the page's life. stop is aborted when the page drops the tools, which does not cancel a call already running.
function fillTool(site: RefObject<Site>, stop: AbortSignal): ModelContextTool {
	return {
		name: 'fill-submission',
		title: 'Fill in the submit form',
		description: "Opens the site's submit form and fills it in with an entry for the Awesome NSGo catalog, replacing what the form held; takes the same input as check-submission. It fills the form only when the form itself can show what is still missing. It does not send: ask the user to check every field and press Submit themselves. Returns ok, filled, the problems and what to tell the user.",
		inputSchema: AGENT_INPUT_SCHEMA,
		annotations: { readOnlyHint: false, consequentialHint: false },
		async execute(input, options) {
			const read = readAgentSubmission(input);
			if ('problems' in read) return { ok: false, filled: false, problems: read.problems, next: NEXT.fix } satisfies Answer;
			const sub = read.submission;
			const j = await judge(sub);
			// The checks take a round trip or two, during which the agent may give up on the call or the page drop the tools; a call nobody waits for any more must not change the page. The signal is read with ?. as the origin trial's builds may not pass one.
			if (options?.signal?.aborted || stop.aborted) return { ok: false, filled: false, problems: ['the call was cancelled'], next: NEXT.cancelled } satisfies Answer;
			if (j.problems.length > 0) return { ok: false, filled: false, problems: [...j.problems, ...j.needs], file: j.file, next: NEXT.fix } satisfies Answer;
			if (site.current.sending > 0) return { ok: false, filled: false, problems: ['the form is sending a submission'], next: NEXT.sending } satisfies Answer;
			const { sent } = site.current;
			site.current.fillSubmit(formOf(sub));
			const ok = j.needs.length === 0;
			const next = !ok ? NEXT.needs : j.bot.enabled ? NEXT.bot : NEXT.github;
			return { ok, filled: true, problems: j.needs, ...j.details, ...(sent ? { sent: sent.url, next: `Tell the user the submission they sent before is pull request #${sent.number}, ${sent.url}, as the form no longer shows it. ${next}` } : { next }) } satisfies Answer;
		},
	};
}

// Registers the submission tools for as long as the page is open, in either look; rendered once inside SiteProvider (routes/__root.tsx). Effects run only in the browser, so the Worker's render never touches document. Aborting the signal unregisters both, which React's development double mount does once before registering them again.
export function SubmitTools(): null {
	const site = useSite();
	const latest = useRef(site);
	latest.current = site;
	useEffect(() => {
		const mc = document.modelContext;
		// A page that frames the site could lay its own UI over the form an agent fills in, so only a top-level page offers the tools.
		if (!mc || window.top !== window) return;
		const stop = new AbortController();
		for (const tool of [checkTool, fillTool(latest, stop.signal)]) {
			// The API is an origin trial that still changes: started in a promise, a registerTool that throws, or returns no promise as older builds may, cannot break the page. It rejects when a Permissions-Policy turns tools off, and with the abort reason when the page unmounts first.
			Promise.resolve()
				.then(() => mc.registerTool(tool, { signal: stop.signal }))
				.catch((err: unknown) => {
					if (!stop.signal.aborted) console.warn(`WebMCP: ${tool.name} was not registered`, err);
				});
		}
		return () => stop.abort();
	}, []);
	return null;
}
