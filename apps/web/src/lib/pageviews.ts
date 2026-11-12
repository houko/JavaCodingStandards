import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

// A page view is a browser-rendered route, so crawlers and static asset hits do
// not inflate the counter. The pathname is enough: language and filter query
// strings are presentation state, not separate pages in the dashboard.
export function usePageView(): void {
	const pathname = useLocation({ select: (location) => location.pathname });

	useEffect(() => {
		if (pathname === '/metrics' || pathname.startsWith('/api/')) return;
		const body = JSON.stringify({ path: pathname });
		if (navigator.sendBeacon) {
			navigator.sendBeacon('/api/views', new Blob([body], { type: 'application/json' }));
			return;
		}
		void fetch('/api/views', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
	}, [pathname]);
}
