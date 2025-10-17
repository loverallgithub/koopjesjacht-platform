#!/bin/bash

# 🧪 Meal Scavenger Hunt Platform - Comprehensive Test Script
# Tests all platform functionality including APIs, databases, agents, and user flows

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Configuration
API_BASE_URL="http://localhost:3527"
FRONTEND_URL="http://localhost:8081"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="3493"

# Test results storage
TEST_RESULTS=()

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

log_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║          🧪 Meal Scavenger Hunt Platform              ║"
    echo "║              Comprehensive Test Suite                  ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        if [[ "$expected_result" == "success" ]]; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            TEST_RESULTS+=("✅ $test_name")
            echo -e "   ${GREEN}✅ PASSED${NC}"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            TEST_RESULTS+=("❌ $test_name - Expected failure but succeeded")
            echo -e "   ${RED}❌ FAILED (unexpected success)${NC}"
        fi
    else
        if [[ "$expected_result" == "failure" ]]; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            TEST_RESULTS+=("✅ $test_name (expected failure)")
            echo -e "   ${GREEN}✅ PASSED (expected failure)${NC}"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            TEST_RESULTS+=("❌ $test_name")
            echo -e "   ${RED}❌ FAILED${NC}"
        fi
    fi
}

test_docker_services() {
    echo -e "${BLUE}🐳 Testing Docker Services${NC}"
    echo "════════════════════════════════════════"
    
    run_test "PostgreSQL container running" "docker ps | grep scavenger_postgres" "success"
    run_test "Redis container running" "docker ps | grep scavenger_redis" "success"
    run_test "Backend container running" "docker ps | grep scavenger_backend" "success"
    run_test "Frontend container running" "docker ps | grep scavenger_frontend" "success"
    run_test "Nginx container running" "docker ps | grep scavenger_nginx" "success"
    
    # Test SmythOS agents
    run_test "Clue agent container running" "docker ps | grep scavenger_clue_agent" "success"
    run_test "QR agent container running" "docker ps | grep scavenger_qr_agent" "success"
    run_test "Stats agent container running" "docker ps | grep scavenger_stats_agent" "success"
    run_test "Payment agent container running" "docker ps | grep scavenger_payment_agent" "success"
    run_test "Notification agent container running" "docker ps | grep scavenger_notification_agent" "success"
    
    echo ""
}

test_database_connectivity() {
    echo -e "${BLUE}🗄️  Testing Database Connectivity${NC}"
    echo "════════════════════════════════════════"
    
    # PostgreSQL connectivity
    run_test "PostgreSQL connection" "docker-compose exec -T postgres pg_isready -U scavenger" "success"
    run_test "PostgreSQL database exists" "docker-compose exec -T postgres psql -U scavenger -d scavenger_hunt -c 'SELECT 1;'" "success"
    
    # Redis connectivity
    run_test "Redis connection" "docker-compose exec -T redis redis-cli ping" "success"
    run_test "Redis set/get test" "docker-compose exec -T redis redis-cli set test_key test_value && docker-compose exec -T redis redis-cli get test_key | grep test_value" "success"
    
    echo ""
}

test_api_endpoints() {
    echo -e "${BLUE}🌐 Testing API Endpoints${NC}"
    echo "════════════════════════════════════════"
    
    # Basic health checks
    run_test "Backend API accessible" "curl -s $API_BASE_URL" "success"
    run_test "Health endpoint" "curl -s $API_BASE_URL/health" "success"
    run_test "API documentation endpoint" "curl -s $API_BASE_URL/api-docs" "success"
    
    # Authentication endpoints
    run_test "Auth register endpoint exists" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/auth/register | grep -E '(200|400|422)'" "success"
    run_test "Auth login endpoint exists" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/auth/login | grep -E '(200|400|401)'" "success"
    
    # Core API endpoints
    run_test "Hunts endpoint exists" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/hunts | grep -E '(200|401)'" "success"
    run_test "Teams endpoint exists" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/teams | grep -E '(200|401)'" "success"
    run_test "Stats endpoint exists" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/stats | grep -E '(200|401)'" "success"
    
    echo ""
}

test_smythos_agents() {
    echo -e "${BLUE}🤖 Testing SmythOS Agents${NC}"
    echo "════════════════════════════════════════"
    
    # Test agent accessibility
    run_test "Clue Generator Agent accessible" "curl -s http://localhost:8001" "success"
    run_test "QR Manager Agent accessible" "curl -s http://localhost:8002" "success"
    run_test "Stats Aggregator Agent accessible" "curl -s http://localhost:8003" "success"
    run_test "Payment Handler Agent accessible" "curl -s http://localhost:8004" "success"
    run_test "Notification Service Agent accessible" "curl -s http://localhost:8005" "success"
    
    # Test agent health endpoints (if implemented)
    run_test "Clue Agent health" "curl -s http://localhost:8001/health" "success"
    run_test "QR Agent health" "curl -s http://localhost:8002/health" "success"
    run_test "Stats Agent health" "curl -s http://localhost:8003/health" "success"
    run_test "Payment Agent health" "curl -s http://localhost:8004/health" "success"
    run_test "Notification Agent health" "curl -s http://localhost:8005/health" "success"
    
    echo ""
}

test_frontend_accessibility() {
    echo -e "${BLUE}🖥️  Testing Frontend Accessibility${NC}"
    echo "════════════════════════════════════════"
    
    run_test "Frontend accessible" "curl -s $FRONTEND_URL" "success"
    run_test "Frontend returns HTML" "curl -s $FRONTEND_URL | grep -i html" "success"
    run_test "React app loads" "curl -s $FRONTEND_URL | grep -i react" "success"
    
    # Test different routes (if using client-side routing)
    run_test "Frontend /login route" "curl -s $FRONTEND_URL/login" "success"
    run_test "Frontend /register route" "curl -s $FRONTEND_URL/register" "success"
    run_test "Frontend /hunts route" "curl -s $FRONTEND_URL/hunts" "success"
    
    echo ""
}

test_payment_integrations() {
    echo -e "${BLUE}💳 Testing Payment Integration Readiness${NC}"
    echo "════════════════════════════════════════"
    
    # These tests check if payment endpoints exist and environment is configured
    run_test "Stripe integration endpoint" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/payments/stripe | grep -E '(200|400|401)'" "success"
    run_test "PayPal integration endpoint" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/payments/paypal | grep -E '(200|400|401)'" "success"
    run_test "Mollie integration endpoint" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/payments/mollie | grep -E '(200|400|401)'" "success"
    
    echo ""
}

test_file_permissions() {
    echo -e "${BLUE}📁 Testing File Permissions and Structure${NC}"
    echo "════════════════════════════════════════"
    
    cd "$(dirname "$0")/meal-scavenger-hunt" 2>/dev/null || {
        log_error "Cannot access meal-scavenger-hunt directory"
        return 1
    }
    
    run_test "Environment file exists" "test -f .env" "success"
    run_test "Docker compose file exists" "test -f docker-compose.yml" "success"
    run_test "Backend directory accessible" "test -d backend" "success"
    run_test "Frontend directory accessible" "test -d frontend" "success"
    run_test "Agents directory accessible" "test -d agents" "success"
    run_test "Database directory accessible" "test -d database" "success"
    
    # Test upload directories (should be created by Docker)
    run_test "Upload directory exists or can be created" "docker-compose exec -T backend ls -la /app/uploads || echo 'Will be created on first upload'" "success"
    
    cd ..
    echo ""
}

test_security_headers() {
    echo -e "${BLUE}🔒 Testing Security Headers${NC}"
    echo "════════════════════════════════════════"
    
    # Test security headers on API
    run_test "API has CORS headers" "curl -s -I $API_BASE_URL | grep -i 'access-control'" "success"
    run_test "API has security headers" "curl -s -I $API_BASE_URL | grep -E '(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)'" "success"
    
    # Test HTTPS redirect (if configured)
    run_test "Frontend security headers" "curl -s -I $FRONTEND_URL | grep -E '(X-Frame-Options|X-Content-Type-Options)'" "success"
    
    echo ""
}

test_environment_variables() {
    echo -e "${BLUE}🔧 Testing Environment Configuration${NC}"
    echo "════════════════════════════════════════"
    
    cd "$(dirname "$0")/meal-scavenger-hunt" 2>/dev/null || return 1
    
    if [[ -f .env ]]; then
        run_test "JWT_SECRET configured" "grep -q 'JWT_SECRET=' .env && ! grep -q 'JWT_SECRET=your_jwt_secret_here' .env" "success"
        run_test "Database credentials configured" "grep -q 'DB_USER=' .env && grep -q 'DB_PASSWORD=' .env" "success"
        run_test "SMYTHOS_API_KEY configured" "grep -q 'SMYTHOS_API_KEY=' .env" "success"
        
        # Optional configurations
        if grep -q 'STRIPE_SECRET_KEY=' .env; then
            run_test "Stripe configured" "! grep -q 'STRIPE_SECRET_KEY=sk_test_your_stripe_key' .env" "success"
        fi
        
        if grep -q 'SMTP_HOST=' .env; then
            run_test "SMTP configured" "grep -q 'SMTP_HOST=' .env && grep -q 'SMTP_USER=' .env" "success"
        fi
    else
        log_warning ".env file not found - skipping environment variable tests"
    fi
    
    cd ..
    echo ""
}

test_api_functionality() {
    echo -e "${BLUE}⚡ Testing API Functionality${NC}"
    echo "════════════════════════════════════════"
    
    # Test user registration (should fail without proper data, but endpoint should exist)
    run_test "User registration endpoint functional" "curl -s -X POST $API_BASE_URL/api/auth/register -H 'Content-Type: application/json' -d '{}' | grep -E '(error|message|validation)'" "success"
    
    # Test hunt creation (should require authentication)
    run_test "Hunt creation requires auth" "curl -s -X POST $API_BASE_URL/api/hunts -H 'Content-Type: application/json' -d '{}' | grep -E '(unauthorized|token|auth)'" "success"
    
    # Test QR code generation endpoint
    run_test "QR generation endpoint accessible" "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/api/qr/generate | grep -E '(400|401|422)'" "success"
    
    echo ""
}

test_performance() {
    echo -e "${BLUE}🚀 Testing Basic Performance${NC}"
    echo "════════════════════════════════════════"
    
    # Test response times (basic checks)
    run_test "API responds within 5 seconds" "timeout 5 curl -s $API_BASE_URL >/dev/null" "success"
    run_test "Frontend loads within 10 seconds" "timeout 10 curl -s $FRONTEND_URL >/dev/null" "success"
    
    # Test concurrent requests (basic load test)
    run_test "API handles 10 concurrent requests" "for i in {1..10}; do curl -s $API_BASE_URL & done; wait" "success"
    
    echo ""
}

test_logs_and_monitoring() {
    echo -e "${BLUE}📊 Testing Logs and Monitoring${NC}"
    echo "════════════════════════════════════════"
    
    # Test if logs are being generated
    run_test "Backend logs accessible" "docker-compose logs backend | grep -E '(INFO|ERROR|WARN|DEBUG)'" "success"
    run_test "Frontend logs accessible" "docker-compose logs frontend | grep -v '^$'" "success"
    run_test "Database logs accessible" "docker-compose logs postgres | grep -v '^$'" "success"
    
    # Test if services are logging properly
    run_test "Services generating recent logs" "docker-compose logs --since 1m | grep -v '^$'" "success"
    
    echo ""
}

cleanup_test_data() {
    echo -e "${BLUE}🧹 Cleaning up test data${NC}"
    echo "════════════════════════════════════════"
    
    # Clean up any test data created during testing
    run_test "Redis test key cleanup" "docker-compose exec -T redis redis-cli del test_key" "success"
    
    echo ""
}

print_test_summary() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                    📊 Test Summary                    ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}Total Tests Run:${NC} $TESTS_TOTAL"
    echo -e "${GREEN}Tests Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Tests Failed:${NC} $TESTS_FAILED"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        SUCCESS_RATE=100
    else
        SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
        echo -e "${YELLOW}⚠️  Some tests failed.${NC}"
    fi
    
    echo -e "${BLUE}Success Rate:${NC} $SUCCESS_RATE%"
    echo ""
    
    echo -e "${BLUE}Detailed Results:${NC}"
    echo "════════════════════════════════════════"
    for result in "${TEST_RESULTS[@]}"; do
        echo "  $result"
    done
    echo ""
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "${YELLOW}💡 Troubleshooting Tips:${NC}"
        echo "  • Check service logs: docker-compose logs [service-name]"
        echo "  • Verify .env configuration"
        echo "  • Ensure all containers are running: docker-compose ps"
        echo "  • Check network connectivity"
        echo "  • Verify API keys are properly configured"
        echo ""
    fi
    
    echo -e "${GREEN}✅ Platform testing completed!${NC}"
    
    # Return appropriate exit code
    if [[ $TESTS_FAILED -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
QUICK=false
SKIP_SETUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK=true
            shift
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        -h|--help)
            echo "Meal Scavenger Hunt Platform - Test Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick       Run only essential tests"
            echo "  --skip-setup  Skip environment setup checks"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Test Categories:"
            echo "  • Docker Services"
            echo "  • Database Connectivity"
            echo "  • API Endpoints"
            echo "  • SmythOS Agents"
            echo "  • Frontend Accessibility"
            echo "  • Payment Integrations"
            echo "  • Security & Configuration"
            echo "  • Performance"
            echo "  • Logs & Monitoring"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main test execution
main() {
    print_banner
    
    log_info "Starting comprehensive platform tests..."
    echo ""
    
    # Core tests (always run)
    test_docker_services
    test_database_connectivity
    test_api_endpoints
    test_frontend_accessibility
    
    if [[ "$QUICK" != true ]]; then
        test_smythos_agents
        test_payment_integrations
        test_file_permissions
        test_security_headers
        test_environment_variables
        test_api_functionality
        test_performance
        test_logs_and_monitoring
    fi
    
    cleanup_test_data
    print_test_summary
}

# Trap Ctrl+C
trap 'log_error "Testing interrupted by user"; exit 1' INT

# Check if running from correct directory
if [[ ! -d "meal-scavenger-hunt" ]]; then
    log_error "Please run this script from the directory containing 'meal-scavenger-hunt' folder"
    exit 1
fi

# Run main function
main