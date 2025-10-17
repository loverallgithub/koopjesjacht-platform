#!/bin/bash

# Meal Scavenger Hunt Platform - Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environments: development, staging, production
# Actions: deploy, rollback, restart, backup

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_NAME="meal-scavenger-hunt"
BACKUP_DIR="/var/backups/$PROJECT_NAME"
LOG_FILE="/var/log/$PROJECT_NAME/deploy_$TIMESTAMP.log"

# Function to log messages
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to handle errors
error_exit() {
    log "ERROR: $1" "$RED"
    exit 1
}

# Create necessary directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

log "Starting $ACTION for $ENVIRONMENT environment" "$BLUE"

# Load environment-specific configuration
case $ENVIRONMENT in
    development)
        ENV_FILE=".env.development"
        COMPOSE_FILE="docker-compose.yml"
        ;;
    staging)
        ENV_FILE=".env.staging"
        COMPOSE_FILE="docker-compose.staging.yml"
        ;;
    production)
        ENV_FILE=".env.production"
        COMPOSE_FILE="docker-compose.prod.yml"
        ;;
    *)
        error_exit "Unknown environment: $ENVIRONMENT"
        ;;
esac

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    error_exit "Environment file $ENV_FILE not found"
fi

# Export environment variables
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# Function to perform deployment
deploy() {
    log "Starting deployment process..." "$BLUE"
    
    # Pull latest changes
    log "Pulling latest code from repository..."
    git pull origin main || error_exit "Failed to pull latest changes"
    
    # Build Docker images
    log "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache || error_exit "Failed to build Docker images"
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend npm run migrate || error_exit "Failed to run migrations"
    
    # Stop current containers
    log "Stopping current containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f "$COMPOSE_FILE" up -d || error_exit "Failed to start containers"
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Health check
    health_check
    
    # Clean up old images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    log "Deployment completed successfully!" "$GREEN"
}

# Function to perform rollback
rollback() {
    log "Starting rollback process..." "$YELLOW"
    
    # Get previous deployment tag
    PREVIOUS_TAG=$(git tag | grep -E "^deploy-" | sort -V | tail -2 | head -1)
    
    if [ -z "$PREVIOUS_TAG" ]; then
        error_exit "No previous deployment tag found"
    fi
    
    log "Rolling back to $PREVIOUS_TAG..."
    
    # Checkout previous version
    git checkout "$PREVIOUS_TAG" || error_exit "Failed to checkout $PREVIOUS_TAG"
    
    # Rebuild and restart
    deploy
    
    log "Rollback completed successfully!" "$GREEN"
}

# Function to restart services
restart() {
    log "Restarting services..." "$BLUE"
    
    docker-compose -f "$COMPOSE_FILE" restart || error_exit "Failed to restart services"
    
    # Wait for services to be healthy
    sleep 10
    
    # Health check
    health_check
    
    log "Services restarted successfully!" "$GREEN"
}

# Function to backup database
backup() {
    log "Creating database backup..." "$BLUE"
    
    BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    # Create database backup
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" || error_exit "Failed to create database backup"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    # Upload to S3 (if configured)
    if [ ! -z "$AWS_S3_BUCKET" ]; then
        log "Uploading backup to S3..."
        aws s3 cp "${BACKUP_FILE}.gz" "s3://$AWS_S3_BUCKET/backups/" || log "Failed to upload backup to S3" "$YELLOW"
    fi
    
    # Keep only last 7 days of local backups
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
    
    log "Database backup completed: ${BACKUP_FILE}.gz" "$GREEN"
}

# Function to check service health
health_check() {
    log "Performing health checks..." "$BLUE"
    
    # Check backend health
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "Backend is healthy" "$GREEN"
    else
        error_exit "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        log "Frontend is healthy" "$GREEN"
    else
        error_exit "Frontend health check failed"
    fi
    
    # Check database
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1; then
        log "Database is healthy" "$GREEN"
    else
        error_exit "Database health check failed"
    fi
    
    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "Redis is healthy" "$GREEN"
    else
        error_exit "Redis health check failed"
    fi
    
    # Check SmythOS agents
    for port in 8001 8002 8003 8004 8005; do
        if curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
            log "Agent on port $port is healthy" "$GREEN"
        else
            log "Agent on port $port health check failed" "$YELLOW"
        fi
    done
}

# Function to run tests
run_tests() {
    log "Running tests..." "$BLUE"
    
    # Backend tests
    log "Running backend tests..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend npm test || log "Backend tests failed" "$YELLOW"
    
    # Frontend tests
    log "Running frontend tests..."
    docker-compose -f "$COMPOSE_FILE" run --rm frontend npm test || log "Frontend tests failed" "$YELLOW"
    
    log "Tests completed!" "$GREEN"
}

# Function to scale services
scale() {
    SERVICE=${3:-backend}
    REPLICAS=${4:-3}
    
    log "Scaling $SERVICE to $REPLICAS replicas..." "$BLUE"
    
    docker-compose -f "$COMPOSE_FILE" up -d --scale "$SERVICE=$REPLICAS" || error_exit "Failed to scale $SERVICE"
    
    log "$SERVICE scaled to $REPLICAS replicas successfully!" "$GREEN"
}

# Function to show logs
show_logs() {
    SERVICE=${3:-all}
    
    if [ "$SERVICE" = "all" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
    else
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100 "$SERVICE"
    fi
}

# Function to update SSL certificates
update_ssl() {
    log "Updating SSL certificates..." "$BLUE"
    
    # Run Certbot renewal
    docker run --rm -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot renew || error_exit "Failed to renew SSL certificates"
    
    # Restart nginx
    docker-compose -f "$COMPOSE_FILE" restart nginx
    
    log "SSL certificates updated successfully!" "$GREEN"
}

# Main execution
case $ACTION in
    deploy)
        backup
        deploy
        # Tag the deployment
        git tag "deploy-$ENVIRONMENT-$TIMESTAMP"
        git push --tags
        ;;
    rollback)
        backup
        rollback
        ;;
    restart)
        restart
        ;;
    backup)
        backup
        ;;
    test)
        run_tests
        ;;
    health)
        health_check
        ;;
    scale)
        scale "$@"
        ;;
    logs)
        show_logs "$@"
        ;;
    update-ssl)
        update_ssl
        ;;
    *)
        error_exit "Unknown action: $ACTION. Valid actions: deploy, rollback, restart, backup, test, health, scale, logs, update-ssl"
        ;;
esac

log "Operation completed successfully!" "$GREEN"
log "Check the full log at: $LOG_FILE" "$BLUE"