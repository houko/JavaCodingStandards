import type { Notes as GameNotes, NoteField, StringKey, Translations } from '@vibe-arcade/catalog';

const LABELS = { time: 'buildTime', cost: 'apiCost', tokens: 'tokens', prompts: 'prompts', lines: 'lines', size: 'fileSize', agents: 'agents' } as const satisfies Record<NoteField, StringKey>;

export const noteLabel = (field: NoteField, tr: Translations): string => tr[LABELS[field]];

// What the creator reported about building the game: the figures in a grid, then the prompt where they shared it. Heading is the level under the game's name.
export function Notes({ notes, tr, heading: Heading }: { notes: GameNotes; tr: Translations; heading: 'h2' | 'h3' }) {
	return (
		<div className='flex flex-col gap-3 rounded-[14px] border border-line bg-bg p-[18px]'>
			<Heading className='font-mono text-[12px] font-semibold tracking-[0.08em] text-lime uppercase'>{tr.buildNotes}</Heading>
			{notes.facts.length > 0 && (
				<dl className='grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3'>
					{notes.facts.map((f) => (
						<div key={f.field} className='flex flex-col-reverse justify-end gap-0.5'>
							<dt className='text-[12px] text-muted first-letter:uppercase'>{noteLabel(f.field, tr)}</dt>
							<dd className='font-display text-[22px] leading-tight font-bold'>{f.value}</dd>
						</div>
					))}
				</dl>
			)}
			{notes.prompt !== undefined && (
				<figure className='flex flex-col gap-1.5'>
					<figcaption className='text-[12px] text-muted'>{tr.promptLabel}</figcaption>
					<blockquote className='rounded-[10px] bg-panel px-3.5 py-3 font-mono text-[14px] text-lime'>
						<span aria-hidden='true'>{'> '}</span>
						{notes.prompt}
					</blockquote>
				</figure>
			)}
			<p className='text-[12px] text-muted'>{tr.featuredStatsNote}</p>
		</div>
	);
}
