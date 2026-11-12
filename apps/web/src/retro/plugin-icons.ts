import type { BitmapName } from './bitmaps';

// Pixel icon for each official package, by its slug (data/plugins/<slug>.json); a package missing here (a new one) shows the page icon.
export const PLUGIN_ICON: Record<string, BitmapName> = {
	desktop: 'glass',
	mobile: 'pad',
	i18n: 'globe',
	lucide: 'eye',
	microphone: 'inbox',
	widget: 'glass',
	nsgotest: 'cursor',
	tsx: 'hammer',
	datatable: 'db',
	plot: 'arrows',
	editor: 'page',
	terminal: 'term',
	richeditor: 'page',
	textview: 'page',
	dock: 'glass',
	toast: 'hourglass',
	flow: 'arrows',
	diff: 'page',
	commitgraph: 'arrows',
	'ui-chat': 'inbox',
	filepicker: 'page',
};
