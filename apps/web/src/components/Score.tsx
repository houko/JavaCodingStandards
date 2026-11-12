import { SCORES_AS_OF, entryScore, entrySignals } from '@awesome-nsgo/catalog';
import { useId } from 'react';
import { useLang, useT } from '../lib/lang';
import { SCORE_FORMULA_URL, SCORE_HISTORY_URL, scoreLabel, scoreRows, scoreTier, scoreTotal } from '../lib/score';

// An entry's score (lib/score.ts) in both looks. Each part has its own score-* class, which each look's stylesheet draws (styles/score.css, retro/retro.css); `className` is where the caller places it, as with LikeButton. Each renders nothing for an entry without a score, so the site shows none of this until the Update scores workflow first records the signals.

// The total as a filled badge coloured by its band (scoreTier), ≈ when part of it could not be measured, with the word for score before it where the look shows it (the original look): no star, which would read as GitHub's, and no red, which would read as a warning about the project.
export function ScoreChip({ item, name, className = '' }: { item: string; name: string; className?: string }) {
	const t = useT();
	const lang = useLang();
	const score = entryScore(item);
	if (!score) return null;
	const label = scoreLabel(score, name, t, lang);
	return (
		<span role='img' className={`score-chip ${className}`} data-tier={scoreTier(score)} aria-label={label} title={label}>
			<span className='score-chip-k' aria-hidden='true'>
				{t.score}
			</span>
			{scoreTotal(score)}
		</span>
	);
}

// The score as a card's footer row, at the foot of an app card in the original look: the word, a thin meter as long as the exact score in its band's colour (scoreTier), and the total out of 100.
export function ScoreBar({ item, name }: { item: string; name: string }) {
	const t = useT();
	const lang = useLang();
	const score = entryScore(item);
	if (!score) return null;
	const label = scoreLabel(score, name, t, lang);
	return (
		<span role='img' className='score-bar' data-tier={scoreTier(score)} aria-label={label} title={label}>
			<span className='score-bar-k' aria-hidden='true'>
				{t.score}
			</span>
			<span className='score-bar-track' aria-hidden='true'>
			<span className='score-bar-fill' style={{ width: `${score.exact}%` }} />
			</span>
			<span className='score-bar-n' aria-hidden='true'>
				{scoreTotal(score)}
				<span className='score-bar-max'>/100</span>
			</span>
		</span>
	);
}

// What the score is made of: each signal's raw value, its points out of its weight on a meter, and why a signal was counted at the neutral value; the archived factor; when the signals were taken; and where the formula and the signals' history are.
export function ScoreBreakdown({ item, id, className = '' }: { item: string; id?: string; className?: string }) {
	const t = useT();
	const lang = useLang();
	const hid = useId();
	const score = entryScore(item);
	const signals = entrySignals(item);
	if (!score || !signals || SCORES_AS_OF === null) return null;
	const view = scoreRows(score, signals, SCORES_AS_OF, t, lang);
	return (
		<section id={id} aria-labelledby={hid} className={`score-bd ${className}`}>
			<h2 id={hid} className='score-h'>
				<span>{t.score_h}</span>
				<span className='score-total' data-tier={scoreTier(score)}>
					{scoreTotal(score)}/100
				</span>
			</h2>
			<ul className='score-rows'>
				{view.rows.map((r) => (
					<li key={r.signal} className={r.neutral ? 'score-row score-row-neu' : 'score-row'}>
						<span className='score-lbl'>
							{r.label}
							{r.neutral && <span className='score-neu'>{t.score_neutral}</span>}
						</span>
						<span className='score-of'>{r.of}</span>
						<meter className='score-meter' min={0} max={r.max} value={r.points} aria-label={r.label} />
						{r.detail && <span className='score-detail'>{r.detail}</span>}
					</li>
				))}
			</ul>
			{view.archived && <p className='score-arch'>{view.archived}</p>}
			<p className='score-about'>{t.score_about}</p>
			<p className='score-asof'>{view.asOf}</p>
			<p className='score-links'>
				<a href={SCORE_FORMULA_URL} target='_blank' rel='noopener'>
					{t.score_formula}
				</a>
				<a href={SCORE_HISTORY_URL} target='_blank' rel='noopener'>
					{t.score_history}
				</a>
			</p>
		</section>
	);
}

// The total on a button that opens the breakdown, for the entries that have no page of their own (UI libraries, state solutions, community plugins). A native popover: Escape, a click outside or the close button dismiss it, it works by touch, and it sits above everything else, so a card's transform or overflow cannot clip it. It sits beside a card's link rather than inside it.
export function ScoreButton({ item, name, className = '' }: { item: string; name: string; className?: string }) {
	const t = useT();
	const id = useId();
	if (!entryScore(item)) return null;
	return (
		<>
			<button type='button' popoverTarget={id} className={`score-btn ${className}`}>
				<ScoreChip item={item} name={name} />
			</button>
			<div popover='auto' id={id} className='score-pop'>
				<button type='button' popoverTarget={id} popoverTargetAction='hide' className='score-x' aria-label={t.close} title={t.close}>
					×
				</button>
				<ScoreBreakdown item={item} />
			</div>
		</>
	);
}
