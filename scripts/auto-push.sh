#!/bin/bash
set -Eeuo pipefail

# 自动推送脚本
# 用法：将此脚本内容复制到 .git/hooks/post-commit
# 或者运行: ./scripts/setup-git-remote.sh

REMOTE_NAME="${REMOTE_NAME:-origin}"
BRANCH="${BRANCH:-main}"

# 检查是否有远程仓库
if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
    echo "No remote '$REMOTE_NAME' configured. Skipping auto-push."
    exit 0
fi

# 自动推送
echo "Auto-pushing to $REMOTE_NAME..."
git push "$REMOTE_NAME" "$BRANCH" --tags 2>&1

if [[ $? -eq 0 ]]; then
    echo "Push successful!"
else
    echo "Push failed! Please check your remote configuration."
    exit 1
fi
