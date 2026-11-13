#!/usr/bin/env bash
# Keeps one issue per alarm up to date: `alert.sh fail "<title>" "<what to say>"` opens it, or comments on it if it is already open; `alert.sh ok "<title>"` closes it when it is open. Only an issue the bot opened counts, so a person's issue of the same title is never touched. The workflows call it on failure and on success, so an alarm stays open exactly while the thing it is about keeps failing.
#
# Needs GH_TOKEN and GH_REPO, and issues: write.
set -euo pipefail
state="$1"
title="$2"
body="${3:-}"
number=$(gh issue list --state open --label alert --limit 100 --json number,title,author --jq ".[] | select(.title == \"$title\" and .author.is_bot) | .number" | head -n 1)
if [ "$state" = ok ]; then
	if [ -n "$number" ]; then gh issue close "$number" --comment 'It works again.'; fi
	exit 0
fi
if [ -n "$number" ]; then
	gh issue comment "$number" --body "$body"
else
	gh issue create --title "$title" --label alert --body "$body"
fi
