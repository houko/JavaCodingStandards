import { env } from 'node:process';
import { TwitterApi } from 'twitter-api-v2';

// Deletes posts the announce workflow made on X, as when an entry is unlisted and its post should go with it. Arguments: the posts, as their ids or their x.com links. Environment: the posting account's OAuth 1.0a keys, as for main.ts (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET).

const ids = process.argv.slice(2).map((arg) => {
	const id = /^(?:https:\/\/(?:x|twitter)\.com\/[\w]+\/status\/)?(\d+)\/?$/.exec(arg.trim())?.[1];
	if (!id) throw new Error(`Not a post on X: ${arg}`);
	return id;
});
if (ids.length === 0) throw new Error('Give the posts to delete, as their ids or their x.com links');

const [appKey, appSecret, accessToken, accessSecret] = [env.X_API_KEY, env.X_API_SECRET, env.X_ACCESS_TOKEN, env.X_ACCESS_SECRET];
if (!appKey || !appSecret || !accessToken || !accessSecret) throw new Error('The X keys are not set (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)');
const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });

for (const id of ids) {
	const { data } = await client.v2.deleteTweet(id);
	if (!data.deleted) throw new Error(`X did not delete https://x.com/i/status/${id}`);
	console.log(`Deleted https://x.com/i/status/${id}`);
}
