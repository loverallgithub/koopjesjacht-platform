#!/bin/bash

# 🔄 Automated Git Workflow Script
# Automates git add, commit, and push operations

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/loverallgithub/Koopjesjacht.git"
DEFAULT_BRANCH="main"
AUTO_MESSAGE_PREFIX="Auto-commit"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_git() {
    echo -e "${PURPLE}[GIT]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║          🔄 Automated Git Workflow                    ║"
    echo "║              Koopjesjacht Repository                  ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_git_installed() {
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
}

check_git_repo() {
    if [[ ! -d .git ]]; then
        log_error "Not a git repository. Initializing..."
        git init
        git branch -M "$DEFAULT_BRANCH"
        log_success "Git repository initialized"
    fi
}

check_remote() {
    if ! git remote get-url origin &> /dev/null; then
        log_warning "Remote 'origin' not found. Adding remote..."
        git remote add origin "$GITHUB_REPO"
        log_success "Remote 'origin' added: $GITHUB_REPO"
    else
        local current_remote=$(git remote get-url origin)
        if [[ "$current_remote" != "$GITHUB_REPO" ]]; then
            log_warning "Remote URL mismatch. Updating..."
            git remote set-url origin "$GITHUB_REPO"
            log_success "Remote URL updated to: $GITHUB_REPO"
        fi
    fi
}

check_git_config() {
    local username=$(git config user.name 2>/dev/null)
    local email=$(git config user.email 2>/dev/null)

    if [[ -z "$username" ]]; then
        log_warning "Git user.name not set"
        read -p "Enter your name: " input_name
        git config user.name "$input_name"
    fi

    if [[ -z "$email" ]]; then
        log_warning "Git user.email not set"
        read -p "Enter your email: " input_email
        git config user.email "$input_email"
    fi
}

show_status() {
    log_git "Current repository status:"
    echo ""
    git status
    echo ""

    log_info "Recent commits:"
    git log --oneline -5 2>/dev/null || log_warning "No commits yet"
    echo ""
}

generate_commit_message() {
    local changed_files=$(git diff --cached --name-only | wc -l | tr -d ' ')
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    if [[ $changed_files -eq 0 ]]; then
        echo "$AUTO_MESSAGE_PREFIX: No changes detected"
    elif [[ $changed_files -eq 1 ]]; then
        local filename=$(git diff --cached --name-only)
        echo "$AUTO_MESSAGE_PREFIX: Updated $filename"
    else
        echo "$AUTO_MESSAGE_PREFIX: Updated $changed_files files at $timestamp"
    fi
}

stage_changes() {
    log_git "Staging changes..."

    # Check for changes
    if [[ -z $(git status --porcelain) ]]; then
        log_warning "No changes to stage"
        return 1
    fi

    # Show what will be staged
    log_info "Files to be staged:"
    git status --short
    echo ""

    # Stage all changes
    git add .

    # Show staged changes
    local staged_count=$(git diff --cached --name-only | wc -l | tr -d ' ')
    log_success "Staged $staged_count file(s)"

    return 0
}

create_commit() {
    local message="$1"
    local auto_mode="$2"

    # Check if there are staged changes
    if [[ -z $(git diff --cached --name-only) ]]; then
        log_warning "No staged changes to commit"
        return 1
    fi

    # Generate message if auto mode
    if [[ "$auto_mode" == true ]]; then
        message=$(generate_commit_message)
        log_info "Auto-generated commit message: $message"
    fi

    # Validate commit message
    if [[ -z "$message" || "$message" == " " ]]; then
        log_error "Commit message cannot be empty"
        return 1
    fi

    # Create commit
    log_git "Creating commit..."
    git commit -m "$message"

    log_success "Commit created successfully"
    return 0
}

push_changes() {
    local branch=$(git branch --show-current)

    log_git "Pushing changes to GitHub..."
    log_info "Branch: $branch"

    # Check if branch exists on remote
    if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
        # Branch exists, normal push
        if git push origin "$branch"; then
            log_success "Changes pushed to GitHub successfully!"
            log_info "View at: https://github.com/loverallgithub/Koopjesjacht/tree/$branch"
            return 0
        else
            log_error "Push failed. Check your authentication and network connection."
            log_info "You may need to run: gh auth login"
            return 1
        fi
    else
        # Branch doesn't exist on remote, push with -u
        log_info "Creating new branch on remote..."
        if git push -u origin "$branch"; then
            log_success "New branch created and pushed to GitHub!"
            log_info "View at: https://github.com/loverallgithub/Koopjesjacht/tree/$branch"
            return 0
        else
            log_error "Push failed. Check your authentication and network connection."
            return 1
        fi
    fi
}

pull_latest() {
    local branch=$(git branch --show-current)

    log_git "Pulling latest changes from GitHub..."

    # Fetch first
    git fetch origin

    # Check if there are incoming changes
    local local_commit=$(git rev-parse HEAD 2>/dev/null || echo "")
    local remote_commit=$(git rev-parse origin/"$branch" 2>/dev/null || echo "")

    if [[ "$local_commit" == "$remote_commit" ]]; then
        log_success "Already up to date"
        return 0
    fi

    # Pull with rebase to avoid merge commits
    if git pull --rebase origin "$branch"; then
        log_success "Successfully pulled latest changes"
        return 0
    else
        log_error "Pull failed. You may have conflicts to resolve."
        log_info "Run 'git status' to see conflicts"
        return 1
    fi
}

create_gitignore() {
    if [[ -f .gitignore ]]; then
        log_info ".gitignore already exists"
        return 0
    fi

    log_info "Creating .gitignore file..."

    cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local
*.env
smythos-agents.env

# API Keys and Secrets
**/keys/
**/secrets/
**/*.pem
**/*.key
*.log

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Build outputs
dist/
build/
*.js.map
.cache/

# Docker
docker-compose.override.yml

# Logs
logs/
*.log
agent_alerts.log

# Database
*.sqlite
*.db
postgres_data/
redis_data/

# Uploads
uploads/
temp/
tmp/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Misc
*.bak
*.swp
*~
EOF

    log_success ".gitignore created"
}

full_workflow() {
    local message="$1"
    local auto_mode="$2"

    print_banner

    log_info "Starting automated Git workflow..."
    echo ""

    # Initial checks
    check_git_installed
    check_git_repo
    check_git_config
    check_remote

    # Create .gitignore if needed
    create_gitignore

    # Show current status
    show_status

    # Stage changes
    if ! stage_changes; then
        log_warning "No changes to commit"
        exit 0
    fi

    # Confirm before commit
    if [[ "$auto_mode" != true ]]; then
        echo ""
        read -p "Continue with commit and push? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled by user"
            exit 0
        fi
    fi

    # Create commit
    if ! create_commit "$message" "$auto_mode"; then
        log_error "Commit failed"
        exit 1
    fi

    # Pull latest changes first (to avoid conflicts)
    log_info "Checking for remote changes..."
    pull_latest || log_warning "Pull had issues, but continuing..."

    # Push changes
    if push_changes; then
        echo ""
        log_success "🎉 Workflow completed successfully!"
        echo ""
        log_info "Summary:"
        log_info "  • Changes staged and committed"
        log_info "  • Pushed to GitHub: https://github.com/loverallgithub/Koopjesjacht"
        log_info "  • Branch: $(git branch --show-current)"
    else
        log_error "Push failed. Changes are committed locally but not pushed."
        log_info "You can manually push later with: git push origin $(git branch --show-current)"
        exit 1
    fi
}

# Parse command line arguments
COMMIT_MESSAGE=""
AUTO_MODE=false
STATUS_ONLY=false
PULL_ONLY=false
INIT_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            AUTO_MODE=true
            shift
            ;;
        --status|-s)
            STATUS_ONLY=true
            shift
            ;;
        --pull|-p)
            PULL_ONLY=true
            shift
            ;;
        --init)
            INIT_ONLY=true
            shift
            ;;
        -h|--help)
            echo "Automated Git Workflow Script"
            echo ""
            echo "Usage: $0 [OPTIONS] [COMMIT_MESSAGE]"
            echo ""
            echo "Options:"
            echo "  --auto              Auto-generate commit message"
            echo "  -s, --status        Show git status only"
            echo "  -p, --pull          Pull latest changes only"
            echo "  --init              Initialize repository only"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 \"Updated documentation\"          # Commit with message"
            echo "  $0 --auto                            # Auto-generate message"
            echo "  $0 --status                          # Show status"
            echo "  $0 --pull                            # Pull latest"
            echo "  $0 --init                            # Initialize repo"
            echo ""
            echo "Authentication:"
            echo "  For first-time use, authenticate with:"
            echo "  gh auth login"
            echo ""
            echo "  Or set up a Personal Access Token:"
            echo "  git config --global credential.helper cache"
            exit 0
            ;;
        *)
            COMMIT_MESSAGE="$1"
            shift
            ;;
    esac
done

# Main execution
if [[ "$STATUS_ONLY" == true ]]; then
    print_banner
    check_git_installed
    check_git_repo
    show_status
    exit 0
fi

if [[ "$PULL_ONLY" == true ]]; then
    print_banner
    check_git_installed
    check_git_repo
    check_remote
    pull_latest
    exit 0
fi

if [[ "$INIT_ONLY" == true ]]; then
    print_banner
    check_git_installed
    check_git_repo
    check_git_config
    check_remote
    create_gitignore
    log_success "Repository initialized and ready"
    exit 0
fi

# Validate commit message if not auto mode
if [[ "$AUTO_MODE" != true && -z "$COMMIT_MESSAGE" ]]; then
    log_error "Commit message required (or use --auto)"
    echo "Usage: $0 [OPTIONS] [COMMIT_MESSAGE]"
    echo "Run with --help for more information"
    exit 1
fi

# Run full workflow
full_workflow "$COMMIT_MESSAGE" "$AUTO_MODE"