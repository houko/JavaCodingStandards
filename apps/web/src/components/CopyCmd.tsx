import { useT } from '../lib/lang';
import { type CopyKey, useSite } from '../lib/site';

// A copy button beside a command or a snippet; it reads "copied", in the link blue, for a moment after its copy. The command beside it ellipsizes, so the button keeps its width: in a phone's row its "copied" label used to wrap onto two lines. Below md it grows to 40px, the smallest touch target the phone layout allows. `small` is the size on an entry card's setup line.
export function CopyButton({ text, copyKey, label, small = false }: { text: string; copyKey: CopyKey; label: string; small?: boolean }) {
	const t = useT();
	const { copy, copied } = useSite();
	const size = small ? 'min-h-7 min-w-14 px-2.5 text-[12px]' : 'min-h-9 min-w-[72px] px-3 text-[13px]';
	const done = copied === copyKey;
	return (
		<button type='button' className={`flex-none rounded-[9px] border border-line-2 bg-panel py-0 font-semibold whitespace-nowrap transition-[background,color] duration-150 hover:bg-soft max-md:min-h-10 ${done ? 'text-blue-ink' : 'text-fg-2 hover:text-fg'} ${size}`} onClick={() => copy(text, copyKey)} aria-label={label}>
			{done ? t.copied : t.copy}
		</button>
	);
}

// A command's row: the command, then its copy button, in a soft well. A plugin's CLI commands and an entry card's setup lines draw the same box.
export const cmdRow = 'flex min-h-[42px] items-center gap-3 rounded-box border border-line-2 bg-soft py-1 pr-1 pl-4';

// An entry card's setup line (a plugin's Go import or package, a state solution's install command) with its copy button. `tail` is the part that tells the lines apart, which stays whole while `head` gives way to an ellipsis on a narrow card. No $ prompt: an import line is not a shell command.
export function SetupLine({ head, tail, copyKey }: { head: string; tail: string; copyKey: CopyKey }) {
	const t = useT();
	const text = head + tail;
	return (
		<div className={cmdRow}>
			{/* pre keeps the space at the end of the head, which a flex item would otherwise drop. */}
			<code className='flex min-w-0 flex-auto font-mono text-[12.5px] whitespace-pre' lang='en'>
				<span className='min-w-0 overflow-hidden text-ellipsis text-fg-3'>{head}</span>
				<span className='flex-none text-fg'>{tail}</span>
			</code>
			<CopyButton text={text} copyKey={copyKey} label={`${t.copy}: ${text}`} small />
		</div>
	);
}
