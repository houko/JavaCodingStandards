// Cloudflare Turnstile, loaded only when the submit form needs it. https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

export interface Turnstile {
	render(el: HTMLElement, options: { sitekey: string; theme?: 'light' | 'dark' | 'auto'; size?: 'normal' | 'flexible' | 'compact'; appearance?: 'always' | 'execute' | 'interaction-only'; language?: string; callback?: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void }): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

let loading: Promise<Turnstile> | undefined;

export function loadTurnstile(): Promise<Turnstile> {
	loading ??= new Promise<Turnstile>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
		script.onerror = () => {
			// A failed load (offline, blocked) may succeed on the next open of the form.
			loading = undefined;
			script.remove();
			reject(new Error('Turnstile did not load'));
		};
		document.head.append(script);
	});
	return loading;
}
