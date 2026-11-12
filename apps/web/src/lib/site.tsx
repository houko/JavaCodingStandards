import { type AppKind, type EntryDraft, type RootSearch, type SubmitCat, appBySlug } from '@awesome-nsgo/catalog';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// `plug:<slug>:go` and `plug:<slug>:npm` are a plugin card's setup lines; `state:`, `template:` and `ai:` and a slug the install or start line of a card on those pages.
export type CopyKey = 'cmd' | 'cmd0' | 'cmd1' | 'det' | 'line' | 'badge' | `plug:${string}` | `state:${string}` | `template:${string}` | `ai:${string}`;

export interface SubmitForm extends EntryDraft {
	cat: SubmitCat;
	// Only used for showcase entries: the language the app is written in, Go or TSX.
	mode: AppKind;
	// Whether the entry comes from the fields above or is pasted whole as JSON, and the pasted text.
	via: 'form' | 'json';
	json: string;
}

interface Site {
	palette: boolean;
	openPalette: () => void;
	closePalette: () => void;
	modal: boolean;
	openSubmit: (cat?: SubmitCat) => void;
	closeSubmit: () => void;
	form: SubmitForm;
	setFormField: <K extends keyof SubmitForm>(key: K, value: SubmitForm[K]) => void;
	// Replaces the whole form and opens the dialog afresh, for a WebMCP tool (lib/webmcp.ts). filled counts these fills: the dialog is keyed by it, so state the dialog keeps itself (an uploaded image, the screenshot check, which fields were left, a result it shows) cannot carry over from what was there before.
	fillSubmit: (form: SubmitForm) => void;
	filled: number;
	// Whether the form holds what an AI agent filled in, which the dialog says: from a fill until that entry is sent.
	agentFilled: boolean;
	// How many submissions are on their way, which a fill must not replace the dialog under: a dialog closed while sending can be opened and send again before the first answers.
	sending: number;
	// The pull request of the last submission sent since the last fill, which a fill replaces the dialog that shows it with, so the tool can pass it on.
	sent: { url: string; number: number } | undefined;
	sendStarted: () => void;
	sendEnded: (pr?: { url: string; number: number }) => void;
	copied: CopyKey | null;
	copy: (text: string, key: CopyKey) => void;
	// Whether an app opens in a quick-view window over the page (the retro look) rather than on its own page (the original look).
	quickView: boolean;
	// Slug of the app whose quick-view window is open, from `?app=`; null when closed or unknown.
	app: string | null;
	// Shows the app: its quick-view window in the retro look, its own page in the original one.
	openApp: (slug: string) => void;
	closeApp: () => void;
}

const SiteContext = createContext<Site | null>(null);

export function useSite(): Site {
	const ctx = useContext(SiteContext);
	if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
	return ctx;
}

export function SiteProvider({ quickView, children }: { quickView: boolean; children: ReactNode }) {
	const navigate = useNavigate();
	const router = useRouter();
	const search = useSearch({ strict: false }) as RootSearch;
	const app = search.app && appBySlug(search.app) ? search.app : null;

	const [palette, setPalette] = useState(false);
	const [modal, setModal] = useState(false);
	const [form, setForm] = useState<SubmitForm>({ cat: 'showcase', mode: 'go', name: '', author: '', url: '', repo: '', screenshot: '', desc: '', via: 'form', json: '' });
	const [filled, setFilled] = useState(0);
	const [agentFilled, setAgentFilled] = useState(false);
	const [sending, setSending] = useState(0);
	const [sent, setSent] = useState<{ url: string; number: number }>();
	const [copied, setCopied] = useState<CopyKey | null>(null);
	const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	// True when the open quick view pushed its own history entry, so closing it can step back instead of stacking another entry.
	const pushedApp = useRef(false);

	useEffect(() => () => clearTimeout(copyTimer.current), []);

	const copy = useCallback((text: string, key: CopyKey) => {
		navigator.clipboard?.writeText(text).catch(() => {
			// Clipboard can be denied (insecure context, permissions); the toast still confirms the intent, as in the design.
		});
		setCopied(key);
		clearTimeout(copyTimer.current);
		copyTimer.current = setTimeout(() => setCopied(null), 1600);
	}, []);

	const openApp = useCallback(
		(slug: string) => {
			setPalette(false);
			setModal(false);
			if (!quickView) {
				void navigate({ to: '/apps/$slug', params: { slug } });
				return;
			}
			const switching = app !== null;
			if (!switching) pushedApp.current = true;
			void navigate({ to: '.', search: (prev: RootSearch): RootSearch => ({ ...prev, app: slug }), replace: switching, resetScroll: false });
		},
		[app, navigate, quickView],
	);

	const closeApp = useCallback(() => {
		if (pushedApp.current) {
			pushedApp.current = false;
			router.history.back();
			return;
		}
		void navigate({ to: '.', search: (prev: RootSearch): RootSearch => ({ ...prev, app: undefined }), replace: true, resetScroll: false });
	}, [navigate, router]);

	// Back/forward or a link can drop `?app=` without going through closeApp.
	useEffect(() => {
		if (!app) pushedApp.current = false;
	}, [app]);

	const openPalette = useCallback(() => setPalette(true), []);

	const value = useMemo<Site>(() => {
		const showSubmit = () => {
			setPalette(false);
			setModal(true);
			if (app) closeApp();
		};
		return {
			palette,
			openPalette,
			closePalette: () => setPalette(false),
			modal,
			openSubmit: (cat) => {
				if (cat) setForm((f) => ({ ...f, cat }));
				showSubmit();
			},
			closeSubmit: () => setModal(false),
			form,
			setFormField: (key, val) => setForm((f) => ({ ...f, [key]: val })),
			fillSubmit: (next) => {
				setForm(next);
				setFilled((n) => n + 1);
				setAgentFilled(true);
				setSent(undefined);
				showSubmit();
			},
			filled,
			agentFilled,
			sending,
			sent,
			sendStarted: () => setSending((n) => n + 1),
			// A pull request means the entry the agent filled in has gone, so what the form holds next is the visitor's own.
			sendEnded: (pr) => {
				setSending((n) => n - 1);
				if (!pr) return;
				setSent(pr);
				setAgentFilled(false);
			},
			copied,
			copy,
			quickView,
			app,
			openApp,
			closeApp,
		};
	}, [palette, openPalette, modal, form, filled, agentFilled, sending, sent, copied, copy, quickView, app, openApp, closeApp]);

	return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
