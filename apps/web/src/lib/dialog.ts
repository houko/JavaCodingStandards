import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal behaviour for an open dialog: Tab stays inside it, the page behind does not scroll, and focus returns to whatever opened it once it closes. Focus moves in only when nothing inside already has it (an autoFocus input keeps it).
export function useDialog<T extends HTMLElement>(): RefObject<T | null> {
	const ref = useRef<T>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		if (!el.contains(document.activeElement)) el.querySelector<HTMLElement>(FOCUSABLE)?.focus();

		const { overflow } = document.body.style;
		document.body.style.overflow = 'hidden';

		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;
			const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKey);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = overflow;
			if (opener?.isConnected) opener.focus();
		};
	}, []);

	return ref;
}
