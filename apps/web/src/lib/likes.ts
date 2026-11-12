import { useEffect, useSyncExternalStore } from 'react';

// Like counts and this visitor's likes, fetched once per page load and shared by every like button. `off` is a site without the likes database (pull request previews), where the buttons hide.
export interface LikesState {
	status: 'loading' | 'on' | 'off';
	counts: Readonly<Record<string, number>>;
	mine: ReadonlySet<string>;
}

const EMPTY: LikesState = { status: 'loading', counts: {}, mine: new Set() };
let state: LikesState = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function set(next: LikesState) {
	state = next;
	for (const l of listeners) l();
}

function subscribe(l: () => void) {
	listeners.add(l);
	return () => listeners.delete(l);
}

function load() {
	if (started) return;
	started = true;
	type Answer = { enabled: boolean; counts?: Record<string, number>; mine?: string[] };
	fetch('/api/likes')
		.then((res): Promise<Answer> | Answer => (res.ok ? (res.json() as Promise<Answer>) : { enabled: false }))
		.then((body) => set(body.enabled ? { status: 'on', counts: body.counts ?? {}, mine: new Set(body.mine ?? []) } : { ...state, status: 'off' }))
		.catch(() => {
			// Offline or blocked: hide the buttons now, and try again on the next page that asks.
			started = false;
			set({ ...state, status: 'off' });
		});
}

export function useLikes(): LikesState {
	useEffect(load, []);
	return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// Likes or unlikes at once on screen, then takes the server's count; a failed request puts both back.
export async function toggleLike(item: string): Promise<void> {
	const liked = !state.mine.has(item);
	const before = state.counts[item] ?? 0;
	const flip = (on: boolean, count: number) => {
		const mine = new Set(state.mine);
		if (on) mine.add(item);
		else mine.delete(item);
		set({ ...state, mine, counts: { ...state.counts, [item]: count } });
	};
	flip(liked, Math.max(0, before + (liked ? 1 : -1)));
	try {
		const res = await fetch('/api/likes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ item, liked }) });
		if (!res.ok) throw new Error(`likes: HTTP ${res.status}`);
		const body = (await res.json()) as { count: number };
		set({ ...state, counts: { ...state.counts, [item]: body.count } });
	} catch {
		flip(!liked, before);
	}
}
