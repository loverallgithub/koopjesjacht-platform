#!/bin/bash

# 📊 SmythOS Agent Monitoring Script
# Monitors health, performance, and status of deployed SmythOS agents

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
SMYTHOS_API_BASE="https://api.smythos.com/v1"
WORKSPACE_NAME="meal-scavenger-hunt"
MONITORING_INTERVAL=30
MAX_RETRIES=3

# Agent configurations
declare -A AGENTS=(
    ["ClueGeneratorAgent"]="https://agents.smythos.com/$WORKSPACE_NAME/ClueGeneratorAgent"
    ["QRManagerAgent"]="https://agents.smythos.com/$WORKSPACE_NAME/QRManagerAgent"
    ["PaymentHandlerAgent"]="https://agents.smythos.com/$WORKSPACE_NAME/PaymentHandlerAgent"
    ["StatsAggregatorAgent"]="https://agents.smythos.com/$WORKSPACE_NAME/StatsAggregatorAgent"
    ["NotificationServiceAgent"]="https://agents.smythos.com/$WORKSPACE_NAME/NotificationServiceAgent"
)

# Monitoring data
declare -A AGENT_STATUS=()
declare -A AGENT_RESPONSE_TIMES=()
declare -A AGENT_ERROR_COUNTS=()
declare -A AGENT_LAST_CHECK=()

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

log_monitor() {
    echo -e "${PURPLE}[MONITOR]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║          📊 SmythOS Agent Monitor                     ║"
    echo "║              Real-time Health Dashboard               ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking monitoring prerequisites..."
    
    # Check for API key
    if [[ -z "$SMYTHOS_API_KEY" ]]; then
        log_error "SMYTHOS_API_KEY environment variable is required"
        log_info "Get your API key from: https://app.smythos.com/api-keys"
        log_info "Then run: export SMYTHOS_API_KEY=your_api_key_here"
        exit 1
    fi
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # Check for jq (optional but recommended)
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found - JSON processing will be limited"
        log_info "Install jq for better monitoring: brew install jq (macOS) or apt install jq (Ubuntu)"
    fi
    
    log_success "Prerequisites check passed!"
}

get_agent_health() {
    local agent_name="$1"
    local agent_url="$2"
    local start_time=$(date +%s%3N)
    
    # Try health endpoint first
    local health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $SMYTHOS_API_KEY" \
        -H "Content-Type: application/json" \
        --max-time 10 \
        "$agent_url/health" 2>/dev/null)
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    local http_status=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$health_response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    # Store response time
    AGENT_RESPONSE_TIMES["$agent_name"]=$response_time
    AGENT_LAST_CHECK["$agent_name"]=$(date +%s)
    
    # Determine status
    if [[ "$http_status" == "200" ]]; then
        AGENT_STATUS["$agent_name"]="HEALTHY"
        AGENT_ERROR_COUNTS["$agent_name"]=0
        return 0
    elif [[ "$http_status" == "404" ]]; then
        # Health endpoint might not exist, try basic ping
        local ping_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $SMYTHOS_API_KEY" \
            --max-time 10 \
            "$agent_url" 2>/dev/null)
        
        local ping_status=$(echo "$ping_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        if [[ "$ping_status" == "200" ]] || [[ "$ping_status" == "405" ]]; then
            AGENT_STATUS["$agent_name"]="HEALTHY"
            AGENT_ERROR_COUNTS["$agent_name"]=0
            return 0
        fi
    fi
    
    # Agent is having issues
    AGENT_STATUS["$agent_name"]="UNHEALTHY"
    local current_errors=${AGENT_ERROR_COUNTS["$agent_name"]:-0}
    AGENT_ERROR_COUNTS["$agent_name"]=$((current_errors + 1))
    return 1
}

get_agent_metrics() {
    local agent_name="$1"
    
    # Try to get metrics from SmythOS API
    local metrics_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $SMYTHOS_API_KEY" \
        -H "Content-Type: application/json" \
        "$SMYTHOS_API_BASE/workspaces/$WORKSPACE_NAME/agents/$agent_name/metrics" 2>/dev/null)
    
    local http_status=$(echo "$metrics_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$metrics_response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [[ "$http_status" == "200" ]] && command -v jq &> /dev/null; then
        echo "$response_body" | jq . 2>/dev/null || echo "{\"status\": \"metrics_unavailable\"}"
    else
        echo "{\"status\": \"metrics_unavailable\", \"http_status\": \"$http_status\"}"
    fi
}

check_all_agents() {
    log_monitor "Checking all agent health..."
    
    local healthy_count=0
    local total_count=${#AGENTS[@]}
    
    for agent_name in "${!AGENTS[@]}"; do
        local agent_url="${AGENTS[$agent_name]}"
        
        if get_agent_health "$agent_name" "$agent_url"; then
            healthy_count=$((healthy_count + 1))
        fi
    done
    
    log_info "Health check completed: $healthy_count/$total_count agents healthy"
}

display_dashboard() {
    clear
    print_banner
    
    echo -e "${CYAN}📊 Agent Health Dashboard - $(date)${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    printf "%-25s %-12s %-10s %-12s %-15s\n" "AGENT" "STATUS" "RESPONSE" "ERRORS" "LAST CHECK"
    echo "───────────────────────────────────────────────────────────────"
    
    for agent_name in "${!AGENTS[@]}"; do
        local status=${AGENT_STATUS["$agent_name"]:-"UNKNOWN"}
        local response_time=${AGENT_RESPONSE_TIMES["$agent_name"]:-"N/A"}
        local error_count=${AGENT_ERROR_COUNTS["$agent_name"]:-"0"}
        local last_check=${AGENT_LAST_CHECK["$agent_name"]:-"Never"}
        
        # Format response time
        if [[ "$response_time" != "N/A" ]]; then
            response_time="${response_time}ms"
        fi
        
        # Format last check time
        if [[ "$last_check" != "Never" ]]; then
            last_check=$(date -r "$last_check" +"%H:%M:%S")
        fi
        
        # Color-code status
        local status_colored
        case "$status" in
            "HEALTHY")
                status_colored="${GREEN}HEALTHY${NC}"
                ;;
            "UNHEALTHY")
                status_colored="${RED}UNHEALTHY${NC}"
                ;;
            "UNKNOWN")
                status_colored="${YELLOW}UNKNOWN${NC}"
                ;;
            *)
                status_colored="$status"
                ;;
        esac
        
        printf "%-25s %-20s %-10s %-12s %-15s\n" \
            "$agent_name" "$status_colored" "$response_time" "$error_count" "$last_check"
    done
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # Summary stats
    local healthy_count=0
    local unhealthy_count=0
    local total_response_time=0
    local response_count=0
    
    for agent_name in "${!AGENTS[@]}"; do
        local status=${AGENT_STATUS["$agent_name"]:-"UNKNOWN"}
        case "$status" in
            "HEALTHY")
                healthy_count=$((healthy_count + 1))
                ;;
            "UNHEALTHY")
                unhealthy_count=$((unhealthy_count + 1))
                ;;
        esac
        
        local response_time=${AGENT_RESPONSE_TIMES["$agent_name"]:-""}
        if [[ -n "$response_time" && "$response_time" != "N/A" ]]; then
            total_response_time=$((total_response_time + response_time))
            response_count=$((response_count + 1))
        fi
    done
    
    echo -e "${BLUE}📈 Summary Statistics:${NC}"
    echo "  • Healthy Agents: ${GREEN}$healthy_count${NC}/${#AGENTS[@]}"
    echo "  • Unhealthy Agents: ${RED}$unhealthy_count${NC}/${#AGENTS[@]}"
    
    if [[ $response_count -gt 0 ]]; then
        local avg_response_time=$((total_response_time / response_count))
        echo "  • Average Response Time: ${avg_response_time}ms"
    fi
    
    echo "  • Last Update: $(date +"%H:%M:%S")"
    echo "  • Next Check: $MONITORING_INTERVAL seconds"
    echo ""
    
    # Alert section
    local alerts=()
    for agent_name in "${!AGENTS[@]}"; do
        local status=${AGENT_STATUS["$agent_name"]:-"UNKNOWN"}
        local error_count=${AGENT_ERROR_COUNTS["$agent_name"]:-"0"}
        local response_time=${AGENT_RESPONSE_TIMES["$agent_name"]:-""}
        
        if [[ "$status" == "UNHEALTHY" ]]; then
            alerts+=("🔴 $agent_name is unhealthy (errors: $error_count)")
        elif [[ -n "$response_time" && "$response_time" -gt 5000 ]]; then
            alerts+=("🟡 $agent_name slow response time (${response_time}ms)")
        fi
    done
    
    if [[ ${#alerts[@]} -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Active Alerts:${NC}"
        for alert in "${alerts[@]}"; do
            echo "  $alert"
        done
        echo ""
    fi
    
    echo -e "${BLUE}💡 Commands:${NC}"
    echo "  • Press Ctrl+C to exit"
    echo "  • View logs: docker-compose logs [service]"
    echo "  • SmythOS Dashboard: https://app.smythos.com/dashboard"
}

display_detailed_metrics() {
    echo -e "${CYAN}📊 Detailed Agent Metrics${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    for agent_name in "${!AGENTS[@]}"; do
        echo -e "${BLUE}🤖 $agent_name${NC}"
        echo "───────────────────────────────"
        
        local metrics=$(get_agent_metrics "$agent_name")
        
        if command -v jq &> /dev/null; then
            echo "$metrics" | jq . 2>/dev/null || echo "Metrics unavailable"
        else
            echo "$metrics"
        fi
        
        echo ""
    done
}

send_alert() {
    local message="$1"
    local severity="$2"  # info, warning, error
    
    log_warning "ALERT: $message"
    
    # Could integrate with notification systems here
    # For example: Slack, Discord, email, etc.
    
    # Simple log file alert
    echo "$(date): [$severity] $message" >> "agent_alerts.log"
}

monitor_continuously() {
    log_info "Starting continuous monitoring (interval: ${MONITORING_INTERVAL}s)"
    log_info "Press Ctrl+C to stop monitoring"
    echo ""
    
    local consecutive_failures=()
    
    while true; do
        check_all_agents
        display_dashboard
        
        # Check for alerts
        for agent_name in "${!AGENTS[@]}"; do
            local status=${AGENT_STATUS["$agent_name"]:-"UNKNOWN"}
            local error_count=${AGENT_ERROR_COUNTS["$agent_name"]:-"0"}
            
            # Alert on consecutive failures
            if [[ "$status" == "UNHEALTHY" && "$error_count" -ge 3 ]]; then
                if [[ ! " ${consecutive_failures[*]} " =~ " $agent_name " ]]; then
                    send_alert "$agent_name has failed $error_count consecutive health checks" "error"
                    consecutive_failures+=("$agent_name")
                fi
            elif [[ "$status" == "HEALTHY" ]]; then
                # Remove from consecutive failures if recovered
                consecutive_failures=($(printf '%s\n' "${consecutive_failures[@]}" | grep -v "^$agent_name$"))
            fi
        done
        
        sleep "$MONITORING_INTERVAL"
    done
}

run_single_check() {
    log_info "Running single health check..."
    check_all_agents
    display_dashboard
    
    # Also show detailed metrics
    echo ""
    display_detailed_metrics
}

test_agent_endpoints() {
    log_info "Testing agent endpoints with sample requests..."
    echo ""
    
    # Test ClueGeneratorAgent
    if [[ -n "${AGENTS[ClueGeneratorAgent]}" ]]; then
        log_monitor "Testing ClueGeneratorAgent..."
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $SMYTHOS_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "shop_info": {
                    "name": "Test Coffee Shop",
                    "description": "A test location for monitoring"
                },
                "difficulty_level": 3
            }' \
            "${AGENTS[ClueGeneratorAgent]}/generate-clue" 2>/dev/null)
        
        local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        if [[ "$http_status" == "200" ]]; then
            log_success "ClueGeneratorAgent functional test passed"
        else
            log_warning "ClueGeneratorAgent functional test failed (HTTP $http_status)"
        fi
    fi
    
    # Test QRManagerAgent
    if [[ -n "${AGENTS[QRManagerAgent]}" ]]; then
        log_monitor "Testing QRManagerAgent..."
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $SMYTHOS_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "action": "generate",
                "hunt_id": "test-hunt-123",
                "shop_id": "test-shop-456",
                "user_id": "test-user-789"
            }' \
            "${AGENTS[QRManagerAgent]}/qr/generate" 2>/dev/null)
        
        local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        if [[ "$http_status" == "200" ]]; then
            log_success "QRManagerAgent functional test passed"
        else
            log_warning "QRManagerAgent functional test failed (HTTP $http_status)"
        fi
    fi
    
    log_info "Functional testing completed"
}

# Parse command line arguments
MONITOR_MODE="single"
SHOW_METRICS=false
TEST_ENDPOINTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --continuous|-c)
            MONITOR_MODE="continuous"
            shift
            ;;
        --interval|-i)
            MONITORING_INTERVAL="$2"
            shift 2
            ;;
        --metrics|-m)
            SHOW_METRICS=true
            shift
            ;;
        --test|-t)
            TEST_ENDPOINTS=true
            shift
            ;;
        --workspace|-w)
            WORKSPACE_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "SmythOS Agent Monitoring Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -c, --continuous       Run continuous monitoring"
            echo "  -i, --interval SECS    Set monitoring interval (default: 30)"
            echo "  -m, --metrics          Show detailed metrics"
            echo "  -t, --test             Test agent endpoints with sample requests"
            echo "  -w, --workspace NAME   Set workspace name (default: meal-scavenger-hunt)"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  SMYTHOS_API_KEY        SmythOS API key (required)"
            echo ""
            echo "Examples:"
            echo "  $0                     # Single health check"
            echo "  $0 -c                  # Continuous monitoring"
            echo "  $0 -c -i 60            # Monitor every 60 seconds"
            echo "  $0 -m                  # Show detailed metrics"
            echo "  $0 -t                  # Test agent endpoints"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Update agent URLs with workspace
for agent_name in "${!AGENTS[@]}"; do
    AGENTS["$agent_name"]="https://agents.smythos.com/$WORKSPACE_NAME/$agent_name"
done

# Main monitoring function
main() {
    print_banner
    
    check_prerequisites
    
    log_info "Monitoring workspace: $WORKSPACE_NAME"
    log_info "Agent count: ${#AGENTS[@]}"
    echo ""
    
    case "$MONITOR_MODE" in
        "continuous")
            monitor_continuously
            ;;
        "single")
            run_single_check
            
            if [[ "$SHOW_METRICS" == true ]]; then
                echo ""
                display_detailed_metrics
            fi
            
            if [[ "$TEST_ENDPOINTS" == true ]]; then
                echo ""
                test_agent_endpoints
            fi
            ;;
    esac
}

# Trap Ctrl+C
trap 'log_info "Monitoring stopped by user"; exit 0' INT

# Run main function
main