import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';
import { env } from 'cloudflare:workers';
import { OWNER, REPO } from './pull';

// Submissions from visitors without a GitHub account: the site's GitHub App, with Cloudflare Turnstile in front of it. The app adds the entry's file on a new branch and opens a pull request (server/pull.ts), which CI checks and a maintainer merges.

export interface BotConfig {
	appId: string;
	privateKey: string;
	siteKey: string;
	turnstileSecret: string;
}

// The bot is off until all four secrets are set, so the site works the same before the GitHub App exists.
export function botConfig(): BotConfig | undefined {
	const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY } = env;
	if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY || !TURNSTILE_SITE_KEY || !TURNSTILE_SECRET_KEY) return undefined;
	// A key pasted with literal \n (as some secret stores keep it) is turned back into lines.
	const privateKey = GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
	// GitHub hands out PKCS#1 keys, but the Workers runtime's WebCrypto only imports PKCS#8.
	if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
		console.error('GITHUB_APP_PRIVATE_KEY is PKCS#1; convert it with `openssl pkcs8 -topk8 -nocrypt -in key.pem` and set the secret again');
		return undefined;
	}
	return { appId: GITHUB_APP_ID, privateKey, siteKey: TURNSTILE_SITE_KEY, turnstileSecret: TURNSTILE_SECRET_KEY };
}

let cached: { appId: string; octokit: Octokit } | undefined;

// An Octokit acting as the app's installation on this repository; the app token is looked up once per isolate and refreshed by auth-app.
export async function installation(cfg: BotConfig): Promise<Octokit> {
	if (cached?.appId === cfg.appId) return cached.octokit;
	const auth = { appId: cfg.appId, privateKey: cfg.privateKey };
	const app = new Octokit({ authStrategy: createAppAuth, auth });
	const { data } = await app.request('GET /repos/{owner}/{repo}/installation', { owner: OWNER, repo: REPO });
	const octokit = new Octokit({ authStrategy: createAppAuth, auth: { ...auth, installationId: data.id } });
	cached = { appId: cfg.appId, octokit };
	return octokit;
}

// The installation's token, for reading repositories outside Octokit (findRepoShot).
export async function installationToken(cfg: BotConfig): Promise<string> {
	const gh = await installation(cfg);
	const { token } = (await gh.auth({ type: 'installation' })) as { token: string };
	return token;
}

export async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
	const body = new URLSearchParams({ secret, response: token });
	if (ip) body.set('remoteip', ip);
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
	if (!res.ok) return false;
	const data = (await res.json()) as { success?: boolean };
	return data.success === true;
}
