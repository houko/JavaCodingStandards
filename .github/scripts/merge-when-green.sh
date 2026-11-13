#!/usr/bin/env bash
# Lands a bot's pull request with no one in the loop: starts CI on the pull request's branch (a pull request opened with the workflow's token starts no workflow by itself), waits for it, merges when it passes, and starts the deploy, which a merge made with that token does not start either. A failing CI leaves the pull request open, with its result on it, and fails the calling job.
#
#     .github/scripts/merge-when-green.sh <branch>
#
# Needs GH_TOKEN and GH_REPO, and the calling workflow's permissions to include actions: write, contents: write and pull-requests: write.
set -euo pipefail
branch="$1"
sha=$(git rev-parse HEAD)
gh workflow run ci.yml --ref "$branch"
run=''
for _ in $(seq 1 30); do
	run=$(gh run list --workflow ci.yml --branch "$branch" --event workflow_dispatch --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$sha\") | .databaseId" | head -n 1)
	[ -n "$run" ] && break
	sleep 5
done
if [ -z "$run" ]; then
	echo "::error::CI did not start on $branch"
	exit 1
fi
gh run watch "$run" --exit-status --interval 15 > /dev/null
gh pr merge "$branch" --squash --delete-branch
gh workflow run deploy.yml --ref main
