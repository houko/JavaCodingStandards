import { type Translations, appBySlug } from '@awesome-nsgo/catalog';
import { useEffect, useState } from 'react';

export type MetricsRange = 7 | 30 | 90;

export interface MetricsPayload {
	enabled: boolean;
	reason?: 'not_configured' | 'unavailable';
	days: number;
	start: string;
	end: string;
	total: number;
	pageCount: number;
	since: string | null;
	daily: { day: string; views: number }[];
	topPaths: { path: string; views: number }[];
	regions: { country: string; views: number }[];
	regionTotal: number;
}

interface MetricsState {
	loading: boolean;
	// A fetch is in flight while older data is still on screen (range switch or the 30 s refresh).
	refreshing: boolean;
	error: boolean;
	reason?: MetricsPayload['reason'];
	data?: MetricsPayload;
	updatedAt?: number;
}

export function useMetrics(days: MetricsRange): MetricsState {
	const [state, setState] = useState<MetricsState>({ loading: true, refreshing: false, error: false });
	useEffect(() => {
		let live = true;
		const load = () => {
			setState((current) => (current.data ? { ...current, refreshing: true } : { loading: true, refreshing: false, error: false }));
			return fetch(`/api/metrics?days=${days}`, { cache: 'no-store' })
				.then(async (response) => {
					const data = (await response.json().catch(() => undefined)) as MetricsPayload | undefined;
					if (!data) throw new Error(`metrics: HTTP ${response.status}`);
					return data;
				})
				.then((data) => {
					if (!live) return;
					if (data.enabled) setState({ loading: false, refreshing: false, error: false, data, updatedAt: Date.now() });
					else setState({ loading: false, refreshing: false, error: true, reason: data.reason ?? 'unavailable' });
				})
				.catch(() => {
					// A failed refresh keeps the last good numbers on screen; only a first load with nothing to show becomes an error.
					if (live) setState((current) => (current.data ? { ...current, refreshing: false } : { loading: false, refreshing: false, error: true, reason: 'unavailable' }));
				});
		};
		void load();
		const timer = window.setInterval(() => void load(), 30_000);
		return () => {
			live = false;
			window.clearInterval(timer);
		};
	}, [days]);
	return state;
}

const SECTION_LABELS: Record<string, keyof Translations> = {
	'/': 'nav_home',
	'/ui': 'nav_ui',
	'/state': 'nav_state',
	'/templates': 'nav_templates',
	'/ai': 'nav_ai',
	'/plugins': 'nav_plugins',
	'/showcase': 'nav_showcase',
	'/learn': 'nav_learn',
	'/metrics': 'metrics_title',
};

// A readable name for a tracked pathname: site sections use the navigation labels, app pages the app's own name.
export function pathLabel(path: string, t: Translations): string {
	const key = SECTION_LABELS[path];
	if (key) return t[key] as string;
	if (path.startsWith('/apps/')) {
		const slug = path.slice('/apps/'.length);
		return appBySlug(slug)?.name ?? slug;
	}
	return path;
}

export function shortDay(day: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

export function number(value: number, locale: string): string {
	return new Intl.NumberFormat(locale).format(value);
}

export function compact(value: number, locale: string): string {
	return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function percent(value: number, total: number, locale: string): string {
	return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(total ? value / total : 0);
}

// The days of the range that were actually tracked: anything before the first recorded day is "not collected yet", not zero traffic.
export function trackedDays(daily: MetricsPayload['daily'], since: string | null): MetricsPayload['daily'] {
	if (!since) return daily;
	const tracked = daily.filter((row) => row.day >= since);
	return tracked.length > 0 ? tracked : daily;
}
