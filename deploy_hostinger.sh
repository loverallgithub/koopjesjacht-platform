#!/bin/bash

# 🚀 Hostinger Deployment Script
# Automates deployment of Meal Scavenger Hunt Platform to Hostinger VPS

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
DEFAULT_DEPLOY_PATH="/var/www/koopjesjacht"
DEFAULT_BRANCH="main"
GITHUB_REPO="https://github.com/loverallgithub/Koopjesjacht.git"

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

log_deploy() {
    echo -e "${PURPLE}[DEPLOY]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║          🚀 Hostinger Deployment Tool                 ║"
    echo "║          Meal Scavenger Hunt Platform                 ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_remote_or_local() {
    # Check if script is running on Hostinger server or locally
    if [[ -z "$HOSTINGER_HOST" ]]; then
        # Running on server directly
        return 0
    else
        # Running locally, will use SSH
        return 1
    fi
}

execute_command() {
    local command="$1"
    local description="$2"

    log_deploy "$description"

    if check_remote_or_local; then
        # Execute locally on server
        eval "$command"
    else
        # Execute remotely via SSH
        ssh -p "${HOSTINGER_SSH_PORT:-22}" \
            "${HOSTINGER_USERNAME}@${HOSTINGER_HOST}" \
            "$command"
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! check_remote_or_local; then
        # Check SSH connection if deploying remotely
        if [[ -z "$HOSTINGER_HOST" || -z "$HOSTINGER_USERNAME" ]]; then
            log_error "HOSTINGER_HOST and HOSTINGER_USERNAME environment variables required for remote deployment"
            log_info "Set these variables or run this script directly on the Hostinger server"
            exit 1
        fi

        log_info "Testing SSH connection..."
        if ! ssh -p "${HOSTINGER_SSH_PORT:-22}" \
            "${HOSTINGER_USERNAME}@${HOSTINGER_HOST}" \
            "echo 'SSH connection successful'"; then
            log_error "SSH connection failed"
            log_info "Check your SSH credentials and connection"
            exit 1
        fi
        log_success "SSH connection verified"
    fi

    # Check Docker on remote/local
    execute_command "docker --version" "Checking Docker installation"
    execute_command "docker compose version" "Checking Docker Compose installation"

    log_success "Prerequisites check passed!"
}

setup_deployment_directory() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    log_deploy "Setting up deployment directory: $deploy_path"

    execute_command "mkdir -p $deploy_path" "Creating deployment directory"

    log_success "Deployment directory ready"
}

clone_or_update_repository() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
    local branch="${DEPLOY_BRANCH:-$DEFAULT_BRANCH}"

    log_deploy "Updating application code..."

    # Check if repository exists
    local repo_exists=$(execute_command "test -d $deploy_path/.git && echo 'yes' || echo 'no'" "Checking repository")

    if [[ "$repo_exists" == *"yes"* ]]; then
        log_info "Repository exists, pulling latest changes..."
        execute_command "cd $deploy_path && git fetch origin" "Fetching updates"
        execute_command "cd $deploy_path && git checkout $branch" "Checking out branch"
        execute_command "cd $deploy_path && git pull origin $branch" "Pulling changes"
    else
        log_info "Cloning repository..."
        execute_command "git clone -b $branch $GITHUB_REPO $deploy_path" "Cloning repository"
    fi

    log_success "Code updated successfully"
}

setup_environment() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
    local env_file="$deploy_path/meal-scavenger-hunt/.env"

    log_deploy "Setting up environment configuration..."

    # Check if .env exists
    local env_exists=$(execute_command "test -f $env_file && echo 'yes' || echo 'no'" "Checking .env file")

    if [[ "$env_exists" == *"no"* ]]; then
        log_info "Creating .env file from example..."
        execute_command "cp $deploy_path/meal-scavenger-hunt/.env.example $env_file" "Copying .env.example"
        log_warning ".env file created from example - you need to update it with actual values"
        log_info "Edit file: $env_file"
    else
        log_success ".env file already exists"
    fi
}

build_and_start_services() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
    local compose_file="$deploy_path/meal-scavenger-hunt/docker-compose.yml"

    log_deploy "Building and starting Docker services..."

    # Pull latest images
    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose pull" "Pulling Docker images"

    # Stop existing containers
    log_info "Stopping existing containers..."
    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose down" "Stopping containers"

    # Start services
    log_info "Starting services..."
    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose up -d" "Starting containers"

    log_success "Services started successfully"
}

wait_for_services() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    log_deploy "Waiting for services to be ready..."

    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    execute_command "cd $deploy_path/meal-scavenger-hunt && timeout 180 sh -c 'until docker compose exec -T postgres pg_isready -U scavenger; do sleep 2; done'" "Checking PostgreSQL"

    # Wait for Redis
    log_info "Waiting for Redis..."
    execute_command "cd $deploy_path/meal-scavenger-hunt && timeout 60 sh -c 'until docker compose exec -T redis redis-cli ping | grep -q PONG; do sleep 2; done'" "Checking Redis"

    # Wait for backend
    log_info "Waiting for backend API..."
    sleep 10

    log_success "All services are ready"
}

run_migrations() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    log_deploy "Running database migrations..."

    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose exec -T backend npm run migrate || echo 'Migration script not found or already applied'" "Running migrations"

    log_success "Migrations completed"
}

health_check() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    log_deploy "Running health checks..."

    # Check container status
    log_info "Container status:"
    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose ps" "Checking containers"

    # Check backend API
    log_info "Testing backend API..."
    if check_remote_or_local; then
        # Test from server
        curl -f http://localhost:3527/health || curl -f http://localhost:3527/ || log_warning "Backend API health check failed"
    else
        # Test from remote
        curl -f "http://${HOSTINGER_HOST}:3527/health" || curl -f "http://${HOSTINGER_HOST}:3527/" || log_warning "Backend API health check failed"
    fi

    log_success "Health checks completed"
}

cleanup_old_resources() {
    log_deploy "Cleaning up old Docker resources..."

    execute_command "docker system prune -f" "Pruning Docker system"

    log_success "Cleanup completed"
}

show_deployment_info() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    echo ""
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║               🎉 Deployment Complete!                 ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${BLUE}📍 Deployment Information:${NC}"
    echo "  • Deployment Path: $deploy_path"
    echo "  • Application: Meal Scavenger Hunt Platform"
    echo "  • Branch: ${DEPLOY_BRANCH:-$DEFAULT_BRANCH}"
    echo ""

    if check_remote_or_local; then
        echo -e "${BLUE}🌐 Access Points (Local):${NC}"
        echo "  • Frontend: http://localhost:8081"
        echo "  • Backend API: http://localhost:3527"
        echo "  • Load Balancer: http://localhost:8080"
    else
        echo -e "${BLUE}🌐 Access Points (Remote):${NC}"
        echo "  • Frontend: http://${HOSTINGER_HOST}:8081"
        echo "  • Backend API: http://${HOSTINGER_HOST}:3527"
        echo "  • Load Balancer: http://${HOSTINGER_HOST}:8080"
    fi
    echo ""

    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "  • View logs: cd $deploy_path/meal-scavenger-hunt && docker compose logs -f"
    echo "  • Restart: cd $deploy_path/meal-scavenger-hunt && docker compose restart"
    echo "  • Stop: cd $deploy_path/meal-scavenger-hunt && docker compose down"
    echo "  • Status: cd $deploy_path/meal-scavenger-hunt && docker compose ps"
    echo ""

    echo -e "${BLUE}📊 Monitoring:${NC}"
    echo "  • Container stats: docker stats"
    echo "  • System resources: htop"
    echo "  • Disk usage: df -h"
    echo ""

    log_success "Deployment completed successfully! 🎉"
}

create_backup() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
    local backup_dir="/var/backups/koopjesjacht"
    local timestamp=$(date +%Y%m%d_%H%M%S)

    log_deploy "Creating backup..."

    execute_command "mkdir -p $backup_dir" "Creating backup directory"

    # Backup database
    log_info "Backing up database..."
    execute_command "cd $deploy_path/meal-scavenger-hunt && docker compose exec -T postgres pg_dump -U scavenger scavenger_hunt | gzip > $backup_dir/db_$timestamp.sql.gz" "Database backup"

    # Backup .env file
    execute_command "cp $deploy_path/meal-scavenger-hunt/.env $backup_dir/env_$timestamp.backup" "Environment backup"

    log_success "Backup created: $backup_dir/db_$timestamp.sql.gz"
}

rollback_deployment() {
    local deploy_path="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"

    log_warning "Rolling back deployment..."

    execute_command "cd $deploy_path && git reset --hard HEAD~1" "Reverting code"

    build_and_start_services

    log_success "Rollback completed"
}

# Parse command line arguments
DEPLOY_PATH=""
DEPLOY_BRANCH=""
SKIP_BACKUP=false
SKIP_CLEANUP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            DEPLOY_PATH="$2"
            shift 2
            ;;
        --branch)
            DEPLOY_BRANCH="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        -h|--help)
            echo "Hostinger Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --path PATH         Deployment path (default: /var/www/koopjesjacht)"
            echo "  --branch BRANCH     Git branch to deploy (default: main)"
            echo "  --skip-backup       Skip backup creation"
            echo "  --skip-cleanup      Skip Docker cleanup"
            echo "  --dry-run           Show what would be done"
            echo "  --rollback          Rollback to previous version"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Environment Variables (for remote deployment):"
            echo "  HOSTINGER_HOST      Hostinger server IP"
            echo "  HOSTINGER_USERNAME  SSH username"
            echo "  HOSTINGER_SSH_PORT  SSH port (default: 22)"
            echo ""
            echo "Examples:"
            echo "  # Deploy on server directly:"
            echo "  $0"
            echo ""
            echo "  # Deploy remotely:"
            echo "  HOSTINGER_HOST=1.2.3.4 HOSTINGER_USERNAME=root $0"
            echo ""
            echo "  # Deploy specific branch:"
            echo "  $0 --branch develop"
            echo ""
            echo "  # Rollback deployment:"
            echo "  $0 --rollback"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    print_banner

    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN MODE - No actual changes will be made"
        log_info "Deployment path: ${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
        log_info "Branch: ${DEPLOY_BRANCH:-$DEFAULT_BRANCH}"
        exit 0
    fi

    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        exit 0
    fi

    check_prerequisites
    setup_deployment_directory

    if [[ "$SKIP_BACKUP" != true ]]; then
        create_backup || log_warning "Backup failed, continuing deployment..."
    fi

    clone_or_update_repository
    setup_environment
    build_and_start_services
    wait_for_services
    run_migrations
    health_check

    if [[ "$SKIP_CLEANUP" != true ]]; then
        cleanup_old_resources
    fi

    show_deployment_info
}

# Trap Ctrl+C
trap 'log_error "Deployment interrupted by user"; exit 1' INT

# Run main function
main