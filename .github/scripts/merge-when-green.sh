#!/usr/bin/env bash
# Lands a bot's pull request with no one in the loop: starts CI on the pull request's branch (a pull request opened with the workflow's token starts no workflow by itself), waits for it, records its success on the commit as the status `check`, merges, and starts the deploy, which a merge made with that token does not start either. The status is needed because GitHub does not link a CI run started by hand to the pull request, so the branch protection's required check would otherwise never be seen. A failing CI leaves the pull request open, with its result on it, and fails the calling job.
#
#     .github/scripts/merge-when-green.sh <branch>
#
# Needs GH_TOKEN and GH_REPO, and the calling workflow's permissions to include actions: write, contents: write, pull-requests: write and statuses: write.
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
gh api "repos/$GH_REPO/statuses/$sha" -f state=success -f context=check -f description='CI passed' -f target_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$run" > /dev/null
gh pr merge "$branch" --squash --delete-branch
gh workflow run deploy.yml --ref main
