#!/bin/bash
set -e

# Push to New GitHub Repository Script
# Run this after creating the new repository on GitHub

echo "========================================="
echo "Push to New GitHub Repository"
echo "========================================="
echo ""

# Check if repository URL is provided
if [ -z "$1" ]; then
    echo "ERROR: Repository URL required"
    echo ""
    echo "Usage: ./push-to-new-repo.sh <repository-url>"
    echo ""
    echo "Example:"
    echo "  ./push-to-new-repo.sh https://github.com/loverallgithub/koopjesjacht-platform.git"
    echo ""
    echo "Or create the repository first:"
    echo "  1. Go to: https://github.com/new"
    echo "  2. Name: koopjesjacht-platform"
    echo "  3. Make it Public"
    echo "  4. DO NOT initialize with README"
    echo "  5. Copy the repository URL"
    echo "  6. Run: ./push-to-new-repo.sh <url>"
    echo ""
    exit 1
fi

NEW_REPO_URL="$1"

echo "New repository: $NEW_REPO_URL"
echo ""

# Backup current remote
echo "Step 1: Backing up current remote..."
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
echo "Current remote: $CURRENT_REMOTE"
echo ""

# Update remote
echo "Step 2: Updating remote URL..."
if [ "$CURRENT_REMOTE" != "none" ]; then
    git remote remove origin
fi
git remote add origin "$NEW_REPO_URL"
echo "✅ Remote updated"
echo ""

# Show what will be pushed
echo "Step 3: Commits to be pushed..."
git log --oneline -5
echo ""

# Push to new repository
echo "Step 4: Pushing to new repository..."
echo "You may be prompted for credentials:"
echo "  Username: loverallgithub"
echo "  Password: Use your GitHub Personal Access Token"
echo ""

if git push -u origin main; then
    echo ""
    echo "========================================="
    echo "✅ SUCCESS! Code pushed to new repository"
    echo "========================================="
    echo ""
    echo "Repository: $NEW_REPO_URL"
    echo ""
    echo "Next steps:"
    echo "  1. Verify code on GitHub: ${NEW_REPO_URL%.git}"
    echo "  2. Configure SSH to Hostinger VPS"
    echo "  3. Run: ./deploy-to-vps.sh"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ Push failed"
    echo "========================================="
    echo ""
    echo "Common issues:"
    echo "  1. Invalid credentials - Use Personal Access Token as password"
    echo "  2. Repository doesn't exist - Create it first on GitHub"
    echo "  3. Repository not empty - Make sure it's a brand new empty repo"
    echo ""
    echo "To restore original remote:"
    echo "  git remote remove origin"
    echo "  git remote add origin $CURRENT_REMOTE"
    echo ""
    exit 1
fi

exit 0
