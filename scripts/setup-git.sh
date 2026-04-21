#!/bin/bash
set -Eeuo pipefail

set -e

echo "=========================================="
echo "  Git Setup Script"
echo "=========================================="
echo ""

# 检查是否已有远程仓库
if git remote get-url origin &>/dev/null; then
    echo "Remote 'origin' already exists:"
    git remote get-url origin
    echo ""
    read -p "Update it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing remote."
    else
        read -p "Enter new remote URL: " REMOTE_URL
        git remote set-url origin "$REMOTE_URL"
        echo "Remote updated!"
    fi
else
    echo "No remote 'origin' configured."
    read -p "Enter remote URL (e.g., https://github.com/user/repo.git): " REMOTE_URL
    git remote add origin "$REMOTE_URL"
    echo "Remote added!"
fi

echo ""
echo "Setting up post-commit hook for auto-push..."

# 创建 post-commit hook
mkdir -p .git/hooks
cat > .git/hooks/post-commit << 'HOOK'
#!/bin/bash
set -Eeuo pipefail

REMOTE_NAME="${REMOTE_NAME:-origin}"
BRANCH="${BRANCH:-main}"

# 检查是否有远程仓库
if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
    exit 0
fi

# 自动推送
echo "Auto-pushing to $REMOTE_NAME..."
git push "$REMOTE_NAME" "$BRANCH" --tags 2>&1
HOOK

chmod +x .git/hooks/post-commit
echo "Post-commit hook installed!"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Now 'git commit' will automatically push to remote."
echo ""
read -p "Push current commits now? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git push origin main --tags
fi
