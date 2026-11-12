import { APP_KINDS, DATA_DIR, ENTRY_GROUPS, SUBMIT_CATS, fill } from '@awesome-nsgo/catalog';
import { useDialog } from '../lib/dialog';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Captcha, useSubmit } from '../lib/submit';
import { WEBMCP_EXTENSION } from '../lib/webmcp';
import { CloseIcon } from './bits';

const GROUPS = ENTRY_GROUPS;

// The form's repeated pieces. Text fields keep the page's face and, below md, a 16px size, under which iOS zooms the page into a focused field.
const LABEL = 'text-[14px] font-semibold';
const COUNT = 'text-[12px] font-normal tabular-nums text-fg-3';
const OPTS = 'flex flex-wrap gap-1.5';
// A choice in a radio group, a pill that turns to the blue tint when chosen.
const OPT = 'min-h-10 rounded-full border border-line-3 bg-panel px-4 py-0 text-[14px] font-medium text-fg-2 hover:text-fg aria-checked:border-blue aria-checked:bg-blue-soft aria-checked:font-semibold aria-checked:text-blue-ink';
// Form controls take the field border, the one hairline strong enough (3:1) to mark a control's edge.
const FIELD = 'rounded-box border border-field bg-panel text-fg placeholder:text-fg-3 data-[bad=true]:border-err max-md:text-[16px]';
const INPUT = `${FIELD} h-[46px] px-3.5 py-0 font-[family-name:inherit] text-[15px]`;
const AREA = `${FIELD} resize-y px-3.5 py-3`;
const ERR = '-mt-1.5 mb-0 text-[13px] text-err';
const TIP = 'm-0 text-[13px] text-fg-3';
// A bordered secondary button; with .btn-g its hover is restated here, as these utilities outrank .btn-g's hover rule.
const LINE_BTN = 'btn-g min-h-[46px] rounded-full border border-line-3 bg-panel px-5 py-0 text-[14px] font-semibold text-fg hover:not-disabled:bg-soft disabled:cursor-not-allowed disabled:text-fg-3';
// The footer's buttons; below md they share the row under the hint and fill it.
const FOOT_BTN = 'inline-flex min-h-[46px] items-center rounded-full px-5 py-0 text-[14px] no-underline max-md:flex-auto max-md:justify-center max-md:text-center';
const HINT = 'm-0 min-w-0 flex-[1_1_200px] text-[13px] leading-[1.5] max-md:basis-full';

// Keyed by the WebMCP fills (lib/webmcp.ts), so each one opens a fresh dialog.
export function SubmitModal() {
	const { modal, filled } = useSite();
	return modal ? <Modal key={filled} /> : null;
}

function Modal() {
	const { closeSubmit, form, setFormField, copy, copied, agentFilled } = useSite();
	const t = useT();
	const ref = useDialog<HTMLDivElement>();
	const { bot, lang, round, onCheckToken, onCheckFail, retryCheck, checkError, status, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint, viaJson, jsonError, onJsonChange, example, repoBad, onRepoBlur, shotBad, onShotBlur, urlLabel, withShot, shotFile, onShotFile, shotRequired, shotNote } = useSubmit();
	const urlNote = urlBad ? 'f-url-err' : repoMissing ? 'f-url-repo' : isShow || withAuthor ? 'f-url-tip' : undefined;
	// The screenshot: an image to upload, when the bot can take one, and in the form a link instead; under it what the bot found in the repository.
	const shotField = (withLink: boolean) => (
		<div className='flex flex-col gap-2'>
			<span id='f-shot-label' className={LABEL}>
				{t.m_shot} <span className={COUNT}>{shotRequired ? t.m_shot_req : t.m_opt}</span>
			</span>
			{bot.enabled && (
				<div className='flex flex-wrap items-center gap-3'>
					{shotFile ? (
						<>
							<img src={shotFile.preview} alt='' className='h-[72px] w-auto max-w-[128px] rounded-box border border-line-2 object-cover' />
							<span className='max-w-[240px] truncate text-[13px] text-fg-2'>{shotFile.file.name}</span>
							<button type='button' className={LINE_BTN} onClick={() => onShotFile(undefined)}>
								{t.m_shot_remove}
							</button>
						</>
					) : (
						<label className={`${LINE_BTN} relative inline-flex cursor-pointer items-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue`}>
							{t.m_shot_up}
							<input
								type='file'
								accept='image/png,image/jpeg,image/webp'
								aria-labelledby='f-shot-label'
								className='absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]'
								onChange={(e) => {
									onShotFile(e.target.files?.[0]);
									e.target.value = '';
								}}
							/>
						</label>
					)}
				</div>
			)}
			{shotFile?.problem && (
				<p role='alert' className={ERR}>
					{shotFile.problem}
				</p>
			)}
			{withLink && (
				<input
					id='f-shot'
					type='url'
					inputMode='url'
					value={form.screenshot ?? ''}
					onChange={(e) => setFormField('screenshot', e.target.value)}
					onBlur={onShotBlur}
					placeholder={bot.enabled ? `${t.m_shot_link}: https://…/screenshot.png` : 'https://…/screenshot.png'}
					aria-label={bot.enabled ? t.m_shot_link : t.m_shot}
					className={INPUT}
					data-bad={shotBad}
					aria-invalid={shotBad}
					aria-describedby={shotBad ? 'f-shot-err' : 'f-shot-tip'}
				/>
			)}
			{withLink && shotBad && (
				<p id='f-shot-err' role='alert' className={ERR}>
					{t.m_shot_bad}
				</p>
			)}
			{shotNote && (
				<p className={`${TIP} data-[need=true]:text-dev`} aria-live='polite' data-need={shotRequired && !shotFile && !form.screenshot?.trim()}>
					{shotNote}
				</p>
			)}
			<p id='f-shot-tip' className={TIP}>
				{t.m_shot_tip}
			</p>
		</div>
	);

	// The form scrolls inside the dialog; the footer with the submit button stays in view below it, saying what is still missing. Below md the dialog is a full-width sheet from the bottom of the screen, its footer clear of the home indicator.
	return (
		<div className='fade fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 backdrop-blur-[4px] max-md:items-end max-md:p-0 max-md:pt-[calc(12px+env(safe-area-inset-top))]'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg' aria-describedby={agentFilled ? 'sub-agent' : undefined} className='enter box-border flex max-h-[calc(100dvh-32px)] w-full max-w-[580px] flex-col overflow-hidden rounded-band border border-line-2 bg-raised [box-shadow:var(--sh-3)] max-md:max-h-[calc(100dvh-12px-env(safe-area-inset-top))] max-md:max-w-none max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0'>
				<div className='flex min-h-0 flex-auto flex-col gap-[18px] overflow-auto px-[30px] pt-[30px] pb-[22px] max-md:overscroll-contain max-md:px-6 max-sm:px-4 max-xs:pt-[22px] max-xs:pb-[18px]'>
					<div className='flex items-start justify-between gap-3'>
						<div className='flex flex-col gap-1.5'>
							<h2 id='dlg' className='m-0 text-[24px] font-bold tracking-[-0.02em]'>
								{t.m_title}
							</h2>
							<p className='m-0 text-[14px] text-fg-2'>{bot.enabled ? t.m_desc_bot : t.m_desc}</p>
							{/* How to let an AI fill the form in with the page's WebMCP tools (lib/webmcp.ts), the tool's name kept on one line; left out once one has, as the note below then says so, and on a touch screen, as WebMCP's origin trial and the extension are desktop Chrome's. */}
							{!agentFilled && (
								<p className={`${TIP} pointer-coarse:hidden`}>
									{t.sub_ai.split('{x}')[0]}
									<code className='font-mono whitespace-nowrap text-fg-2'>fill-submission</code>
									{t.sub_ai.split('{x}')[1]}{' '}
									<a className='whitespace-nowrap text-blue-ink no-underline hover:underline' href={WEBMCP_EXTENSION.url} target='_blank' rel='noopener'>
										{WEBMCP_EXTENSION.name} ↗
									</a>
								</p>
							)}
						</div>
						<button type='button' className='btn-g flex size-10 flex-[0_0_40px] items-center justify-center rounded-full border border-line-2 bg-panel p-0 text-fg hover:bg-soft' onClick={closeSubmit} aria-label={t.close}>
							<CloseIcon size={18} />
						</button>
					</div>
					{/* Said when a WebMCP tool filled the form in, so the visitor checks what an AI agent wrote before sending it. */}
					{agentFilled && (
						<p id='sub-agent' className='m-0 rounded-box border border-dev/40 bg-dev-soft px-3.5 py-2.5 text-[14px] text-dev'>
							{t.sub_agent}
						</p>
					)}
					<div className='flex flex-col gap-2'>
						<span className={LABEL}>{t.a_cats}</span>
						<div className={OPTS} role='radiogroup' aria-label={t.a_cats}>
							{SUBMIT_CATS.map((c) => (
								<button key={c} type='button' role='radio' aria-checked={form.cat === c} className={OPT} onClick={() => setFormField('cat', c)}>
									{catLabel[c]}
								</button>
							))}
						</div>
					</div>
					<div className='flex flex-col gap-2'>
						<span className={LABEL}>{t.m_via}</span>
						<div className={OPTS} role='radiogroup' aria-label={t.m_via}>
							{(['form', 'json'] as const).map((v) => (
								<button key={v} type='button' role='radio' aria-checked={form.via === v} className={OPT} onClick={() => setFormField('via', v)}>
									{v === 'form' ? t.m_via_form : t.m_via_json}
								</button>
							))}
						</div>
					</div>
					{viaJson && (
						<div className='flex flex-col gap-2'>
							<label htmlFor='f-json' className={LABEL}>
								{t.m_json} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
							</label>
							<textarea
								id='f-json'
								rows={12}
								spellCheck={false}
								value={form.json}
								onChange={(e) => onJsonChange(e.target.value)}
								placeholder={example}
								className={`${AREA} font-mono text-[13px] leading-[1.7]`}
								lang='en'
								data-bad={Boolean(jsonError)}
								aria-invalid={Boolean(jsonError)}
								aria-describedby={jsonError ? 'f-json-err' : 'f-json-tip'}
							/>
							{jsonError ? (
								<p id='f-json-err' role='alert' className={ERR}>
									{jsonError}
								</p>
							) : (
								<p id='f-json-tip' className={TIP}>
									{t.m_json_tip}
								</p>
							)}
							<div className='mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5'>
								<button type='button' className={LINE_BTN} onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
									{copied === 'line' ? t.copied : t.copy_entry}
								</button>
								{bot.enabled && (
									<span className='m-0 text-left text-[13px] text-fg-3 [&_a]:text-blue-ink'>
										{t.sub_gh}{' '}
										<a href={edit} target='_blank' rel='noopener'>
											{fill(t.go_edit, { x: file })}
										</a>
										{' · '}
										<a href={issue} target='_blank' rel='noopener'>
											{t.go_pr}
										</a>
									</span>
								)}
							</div>
						</div>
					)}
					{viaJson && withShot && bot.enabled && shotField(false)}
					{!viaJson && isShow && (
						<div className='flex flex-col gap-2'>
							<span className={LABEL}>{t.a_kind}</span>
							<div className={OPTS} role='radiogroup' aria-label={t.a_kind}>
								{APP_KINDS.map((m) => (
									<button key={m} type='button' role='radio' aria-checked={form.mode === m} className={OPT} onClick={() => setFormField('mode', m)}>
										{t[`kind_${m}`]}
									</button>
								))}
							</div>
						</div>
					)}
					{!viaJson && isShow && (
						<div className='flex flex-col gap-2'>
							<span className={LABEL}>{t.m_group}</span>
							{/* Optional: a second press clears it, and the entry then names no group, which the submission workflow picks. */}
							<div className={OPTS} role='radiogroup' aria-label={t.m_group}>
								{GROUPS.map((g) => (
									<button key={g} type='button' role='radio' aria-checked={form.group === g} className={OPT} onClick={() => setFormField('group', form.group === g ? undefined : g)}>
										{t[`grp_${g}`]}
									</button>
								))}
							</div>
						</div>
					)}
					{!viaJson && (
						<>
							<div className='flex flex-col gap-2'>
								<label htmlFor='f-url' className={LABEL}>
									{urlLabel}
								</label>
								<input
									id='f-url'
									type='url'
									inputMode='url'
									value={form.url}
									onChange={(e) => setFormField('url', e.target.value)}
									onBlur={onUrlBlur}
									placeholder={isShow ? 'https://…' : 'https://github.com/…'}
									className={INPUT}
									data-bad={urlBad || repoMissing}
									aria-invalid={urlBad || repoMissing}
									aria-describedby={urlNote}
								/>
								{urlBad ? (
									<p id='f-url-err' role='alert' className={ERR}>
										{t.m_bad}
									</p>
								) : repoMissing ? (
									<p id='f-url-repo' role='alert' className={ERR}>
										{t.m_repo}
									</p>
								) : (
									(isShow || withAuthor) && (
										<p id='f-url-tip' className={TIP}>
											{isShow ? t.m_home_tip : t.m_link_tip}
										</p>
									)
								)}
							</div>
							{isShow && (
								<div className='flex flex-col gap-2'>
									<label htmlFor='f-repo' className={LABEL}>
										{t.m_gh} <span className={COUNT}>{t.m_opt}</span>
									</label>
									<input
										id='f-repo'
										type='url'
										inputMode='url'
										value={form.repo ?? ''}
										onChange={(e) => setFormField('repo', e.target.value)}
										onBlur={onRepoBlur}
										placeholder='https://github.com/owner/name'
										className={INPUT}
										data-bad={repoBad}
										aria-invalid={repoBad}
										aria-describedby={repoBad ? 'f-repo-err' : 'f-repo-tip'}
									/>
									{repoBad ? (
										<p id='f-repo-err' role='alert' className={ERR}>
											{t.m_repo_bad}
										</p>
									) : (
										<p id='f-repo-tip' className={TIP}>
											{t.m_link_tip}
										</p>
									)}
								</div>
							)}
							{withShot && shotField(true)}
							<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5'>
								<div className='flex flex-col gap-2'>
									<label htmlFor='f-name' className={LABEL}>
										{t.m_name}
									</label>
									<input id='f-name' type='text' value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder={t.m_name_ph} className={INPUT} />
								</div>
								{withAuthor && (
									<div className='flex flex-col gap-2'>
										<label htmlFor='f-author' className={LABEL}>
											{t.m_author}
										</label>
										<input id='f-author' type='text' value={form.author} onChange={(e) => setFormField('author', e.target.value)} placeholder={t.m_author_ph} className={INPUT} autoComplete='username' />
									</div>
								)}
							</div>
							<div className='flex flex-col gap-2'>
								<label htmlFor='f-desc' className={LABEL}>
									{t.m_desc_l}{' '}
									<span className={COUNT}>
										{form.desc.length}/{max}
									</span>
								</label>
								<textarea id='f-desc' rows={isShow ? 3 : 2} maxLength={max} value={form.desc} onChange={(e) => setFormField('desc', e.target.value.slice(0, max))} placeholder={t.m_desc_ph} className={`${AREA} font-[family-name:inherit] text-[15px]`} />
							</div>
							{/* The entry as it will land in the repository, for those who want to check it or take it to GitHub themselves. */}
							<details className='group'>
								<summary className='w-fit cursor-pointer text-[14px] font-semibold text-fg-2 group-open:mb-2.5 hover:text-fg max-md:py-2.5'>
									{t.m_preview} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
								</summary>
								<pre className='m-0 max-h-[260px] overflow-auto rounded-box border border-line-2 bg-editor px-4 py-3.5 font-mono text-[13px] leading-[1.7] wrap-break-word whitespace-pre-wrap text-fg' lang='en'>
									{entry}
								</pre>
								<div className='mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5'>
									<button type='button' className={LINE_BTN} onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
										{copied === 'line' ? t.copied : t.copy_entry}
									</button>
									{bot.enabled && (
										<span className='m-0 text-left text-[13px] text-fg-3 [&_a]:text-blue-ink'>
											{t.sub_gh}{' '}
											<a href={edit} target='_blank' rel='noopener'>
												{fill(t.go_edit, { x: file })}
											</a>
											{' · '}
											<a href={issue} target='_blank' rel='noopener'>
												{t.go_pr}
											</a>
										</span>
									)}
								</div>
							</details>
						</>
					)}
					{bot.enabled && status.kind !== 'done' && <Captcha className='empty:hidden' siteKey={bot.siteKey} lang={lang} round={round} onToken={onCheckToken} onFail={onCheckFail} />}
				</div>
				<div className='flex flex-none flex-wrap items-center justify-end gap-x-3 gap-y-2.5 border-t border-line bg-raised px-[30px] py-3.5 max-md:px-6 max-md:pb-[calc(14px+env(safe-area-inset-bottom))] max-sm:px-4 max-xs:pt-3 max-xs:pb-[calc(12px+env(safe-area-inset-bottom))]'>
					{bot.enabled ? (
						status.kind === 'done' ? (
							<div role='status' className='flex flex-auto flex-wrap items-center justify-between gap-3 rounded-box border border-line-2 bg-soft py-3 pr-3 pl-4 text-[14px] text-fg'>
								<span>{t.sub_done}</span>
								<a className={`btn-c ${FOOT_BTN}`} href={status.url} target='_blank' rel='noopener'>
									{fill(t.sub_view, { n: status.number })}
								</a>
							</div>
						) : (
							<>
								{status.kind === 'error' ? (
									<p role='alert' className={`${HINT} text-err`}>
										{status.message}
									</p>
								) : checkError ? (
									<p role='alert' className={`${HINT} text-err`}>
										{checkError}{' '}
										<button type='button' className='cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-blue-ink underline underline-offset-2 hover:text-fg' onClick={retryCheck}>
											{t.sub_retry}
										</button>
									</p>
								) : (
									<p className={`${HINT} text-fg-3`} aria-live='polite'>
										{hint}
									</p>
								)}
								<button type='button' className={`btn-c ${FOOT_BTN} disabled:cursor-not-allowed disabled:opacity-45`} onClick={send} disabled={!canSend}>
									{status.kind === 'sending' ? t.sub_sending : t.sub_send}
								</button>
							</>
						)
					) : (
						<>
							<p className={`${HINT} text-fg-3`} aria-live='polite'>
								{hint}
							</p>
							<a className={`btn-g ${FOOT_BTN} border border-line-3 bg-panel font-semibold text-fg hover:bg-soft`} href={edit} target='_blank' rel='noopener'>
								{fill(t.go_edit, { x: file })}
							</a>
							<a className={`btn-c ${FOOT_BTN}`} href={issue} target='_blank' rel='noopener'>
								{t.go_pr}
							</a>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
