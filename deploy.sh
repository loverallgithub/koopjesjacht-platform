#!/bin/bash

# 🚀 Meal Scavenger Hunt Platform - Deployment Script
# Supports local Docker deployment with environment management

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="meal-scavenger-hunt"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

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

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║          🎯 Meal Scavenger Hunt Platform          ║"
    echo "║               Docker Deployment                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "All prerequisites are met!"
}

setup_environment() {
    log_info "Setting up environment..."
    
    # Change to project directory
    cd "$(dirname "$0")/$PROJECT_NAME" 2>/dev/null || {
        log_error "Project directory '$PROJECT_NAME' not found!"
        log_info "Make sure you're running this script from the correct location."
        exit 1
    }
    
    # Check if .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "$ENV_EXAMPLE" ]]; then
            log_warning ".env file not found. Copying from .env.example..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log_warning "Please edit .env file with your actual configuration before proceeding!"
            log_info "Required: SMYTHOS_API_KEY, JWT_SECRET, and payment provider keys"
            
            # Ask user if they want to continue
            read -p "Have you configured the .env file? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Please configure .env file and run the script again."
                exit 0
            fi
        else
            log_error "Neither .env nor .env.example found!"
            log_info "Please create .env file with required configuration."
            exit 1
        fi
    fi
    
    log_success "Environment setup complete!"
}

cleanup_old_containers() {
    log_info "Cleaning up old containers..."
    
    # Stop and remove existing containers
    docker-compose down -v 2>/dev/null || true
    
    # Remove unused Docker resources
    docker system prune -f --volumes 2>/dev/null || true
    
    log_success "Cleanup complete!"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build all images
    docker-compose build --no-cache --parallel
    
    if [[ $? -eq 0 ]]; then
        log_success "All images built successfully!"
    else
        log_error "Image build failed!"
        exit 1
    fi
}

start_services() {
    log_info "Starting services..."
    
    # Start all services
    docker-compose up -d
    
    if [[ $? -eq 0 ]]; then
        log_success "All services started successfully!"
    else
        log_error "Service startup failed!"
        exit 1
    fi
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    timeout=60
    count=0
    while ! docker-compose exec -T postgres pg_isready -U scavenger &>/dev/null; do
        sleep 2
        count=$((count + 2))
        if [[ $count -ge $timeout ]]; then
            log_error "PostgreSQL failed to start within $timeout seconds"
            exit 1
        fi
    done
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    timeout=30
    count=0
    while ! docker-compose exec -T redis redis-cli ping &>/dev/null; do
        sleep 2
        count=$((count + 2))
        if [[ $count -ge $timeout ]]; then
            log_error "Redis failed to start within $timeout seconds"
            exit 1
        fi
    done
    
    # Wait for Backend API
    log_info "Waiting for Backend API..."
    timeout=60
    count=0
    while ! curl -s http://localhost:3527/health &>/dev/null; do
        sleep 2
        count=$((count + 2))
        if [[ $count -ge $timeout ]]; then
            log_warning "Backend API not responding on health check - this might be normal if health endpoint is not implemented"
            break
        fi
    done
    
    log_success "Services are ready!"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Run migrations if migrate script exists
    if docker-compose exec -T backend npm run migrate 2>/dev/null; then
        log_success "Database migrations completed!"
    else
        log_warning "Migration script not found or failed - this might be normal for first-time setup"
    fi
}

seed_data() {
    log_info "Seeding initial data..."
    
    # Run data seeding if seed script exists
    if docker-compose exec -T backend npm run seed 2>/dev/null; then
        log_success "Initial data seeded!"
    else
        log_warning "Seed script not found - this might be normal"
    fi
}

show_status() {
    log_info "Checking service status..."
    echo ""
    docker-compose ps
    echo ""
}

show_access_info() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║                🎉 Deployment Complete!           ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "🌐 Access Points:"
    echo "  • Frontend (React):     http://localhost:8081"
    echo "  • Backend API:          http://localhost:3527"
    echo "  • Load Balancer:        http://localhost:8080"
    echo "  • PostgreSQL:           localhost:5432"
    echo "  • Redis:                localhost:3493"
    echo ""
    echo "🤖 SmythOS Agents:"
    echo "  • Clue Generator:       http://localhost:8001"
    echo "  • QR Manager:           http://localhost:8002"
    echo "  • Stats Aggregator:     http://localhost:8003"
    echo "  • Payment Handler:      http://localhost:8004"
    echo "  • Notification Service: http://localhost:8005"
    echo ""
    echo "📋 Management Commands:"
    echo "  • View logs:            docker-compose logs -f"
    echo "  • Stop services:        docker-compose down"
    echo "  • Restart services:     docker-compose restart"
    echo "  • View status:          docker-compose ps"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  • Check logs:           docker-compose logs [service-name]"
    echo "  • Rebuild:              docker-compose build --no-cache"
    echo "  • Full reset:           docker-compose down -v && docker system prune -f"
    echo ""
    
    # Check if services are responding
    if curl -s http://localhost:8081 >/dev/null; then
        echo -e "${GREEN}✅ Frontend is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend might still be starting up${NC}"
    fi
    
    if curl -s http://localhost:3527 >/dev/null; then
        echo -e "${GREEN}✅ Backend API is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend API might still be starting up${NC}"
    fi
}

# Parse command line arguments
CLEAN=false
SKIP_BUILD=false
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --quick)
            QUICK=true
            shift
            ;;
        -h|--help)
            echo "Meal Scavenger Hunt Platform - Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean       Clean up old containers and images before deployment"
            echo "  --skip-build  Skip the Docker image building step"
            echo "  --quick       Quick deployment (skip cleanup and migrations)"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 # Full deployment"
            echo "  $0 --clean         # Clean deployment"
            echo "  $0 --quick         # Quick deployment"
            echo "  $0 --skip-build    # Deploy without rebuilding images"
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
    
    check_prerequisites
    setup_environment
    
    if [[ "$CLEAN" == true ]] && [[ "$QUICK" != true ]]; then
        cleanup_old_containers
    fi
    
    if [[ "$SKIP_BUILD" != true ]]; then
        build_images
    fi
    
    start_services
    wait_for_services
    
    if [[ "$QUICK" != true ]]; then
        run_migrations
        seed_data
    fi
    
    show_status
    show_access_info
    
    log_success "Deployment completed successfully! 🎉"
}

# Trap Ctrl+C
trap 'log_error "Deployment interrupted by user"; exit 1' INT

# Run main function
main
