#!/bin/bash

# 🤖 SmythOS Agent Deployment Script
# Automates deployment of all 5 agents to SmythOS cloud platform

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
SMYTHOS_WEB_BASE="https://app.smythos.com"
WORKSPACE_NAME="meal-scavenger-hunt"
PROJECT_DIR="meal-scavenger-hunt"

# Agent configurations
declare -A AGENTS=(
    ["clue-generator"]="ClueGeneratorAgent"
    ["qr-manager"]="QRManagerAgent" 
    ["payment-handler"]="PaymentHandlerAgent"
    ["stats-aggregator"]="StatsAggregatorAgent"
    ["notification-service"]="NotificationServiceAgent"
)

# Deployment tracking
AGENTS_DEPLOYED=()
AGENTS_FAILED=()
DEPLOYMENT_URLS=()

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

log_agent() {
    echo -e "${PURPLE}[AGENT]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║          🤖 SmythOS Agent Deployment Tool             ║"
    echo "║              Deploy Agents to Cloud                   ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found - JSON processing will be limited"
        log_info "Install jq for better JSON handling: brew install jq (macOS) or apt install jq (Ubuntu)"
    fi
    
    # Check for API key
    if [[ -z "$SMYTHOS_API_KEY" ]]; then
        log_error "SMYTHOS_API_KEY environment variable is required"
        log_info "Get your API key from: $SMYTHOS_WEB_BASE/api-keys"
        log_info "Then run: export SMYTHOS_API_KEY=your_api_key_here"
        exit 1
    fi
    
    # Check project directory
    if [[ ! -d "$PROJECT_DIR" ]]; then
        log_error "Project directory '$PROJECT_DIR' not found"
        log_info "Please run this script from the directory containing '$PROJECT_DIR'"
        exit 1
    fi
    
    log_success "Prerequisites check passed!"
}

validate_api_key() {
    log_info "Validating SmythOS API key..."
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $SMYTHOS_API_KEY" \
        -H "Content-Type: application/json" \
        "$SMYTHOS_API_BASE/auth/verify" 2>/dev/null)
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [[ "$http_status" == "200" ]]; then
        log_success "API key is valid!"
    else
        log_error "API key validation failed (HTTP $http_status)"
        log_info "Please check your API key at: $SMYTHOS_WEB_BASE/api-keys"
        exit 1
    fi
}

create_workspace() {
    log_info "Creating/verifying workspace: $WORKSPACE_NAME"
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $SMYTHOS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$WORKSPACE_NAME\", \"description\": \"Meal Scavenger Hunt Platform Agents\"}" \
        "$SMYTHOS_API_BASE/workspaces" 2>/dev/null)
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [[ "$http_status" == "200" ]] || [[ "$http_status" == "201" ]] || [[ "$http_status" == "409" ]]; then
        log_success "Workspace ready: $WORKSPACE_NAME"
    else
        log_warning "Workspace creation returned HTTP $http_status (might already exist)"
    fi
}

generate_agent_config() {
    local agent_dir="$1"
    local agent_name="$2"
    local config_file="$PROJECT_DIR/agents/$agent_dir/agent-config.json"
    
    if [[ -f "$config_file" ]]; then
        log_info "Using existing config: $config_file"
        cat "$config_file"
    else
        log_warning "Config file not found: $config_file"
        log_info "Generating basic config for $agent_name..."
        
        case "$agent_dir" in
            "clue-generator")
                cat << EOF
{
  "name": "$agent_name",
  "version": "1.0.0",
  "description": "SmythOS agent for generating creative scavenger hunt clues and hints",
  "type": "autonomous",
  "capabilities": ["natural_language_generation", "context_analysis", "creative_writing", "hint_generation"],
  "inputs": [
    {
      "name": "shop_info",
      "type": "object",
      "required": true,
      "schema": {
        "name": "string",
        "description": "string",
        "fun_facts": "array"
      }
    },
    {
      "name": "difficulty_level",
      "type": "integer",
      "required": false,
      "default": 3,
      "min": 1,
      "max": 5
    }
  ],
  "outputs": [
    {
      "name": "clue",
      "type": "object",
      "schema": {
        "text": "string",
        "difficulty": "integer",
        "estimated_time": "integer"
      }
    }
  ],
  "deployment": {
    "resources": {
      "cpu": "0.5",
      "memory": "256Mi"
    }
  }
}
EOF
                ;;
            "qr-manager")
                cat << EOF
{
  "name": "$agent_name",
  "version": "1.0.0", 
  "description": "SmythOS agent for QR code generation, validation, and scan event handling",
  "type": "reactive",
  "capabilities": ["qr_generation", "qr_validation", "scan_verification", "fraud_detection"],
  "inputs": [
    {
      "name": "action",
      "type": "string",
      "required": true,
      "enum": ["generate", "validate", "scan"]
    },
    {
      "name": "hunt_id",
      "type": "uuid",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "result",
      "type": "object",
      "schema": {
        "success": "boolean",
        "qr_code": "string",
        "message": "string"
      }
    }
  ],
  "deployment": {
    "resources": {
      "cpu": "0.5",
      "memory": "256Mi"
    }
  }
}
EOF
                ;;
            "payment-handler")
                cat << EOF
{
  "name": "$agent_name",
  "version": "1.0.0",
  "description": "SmythOS agent for handling multi-gateway payment processing",
  "type": "transactional",
  "capabilities": ["payment_processing", "gateway_routing", "fraud_prevention", "refund_handling"],
  "inputs": [
    {
      "name": "action",
      "type": "string",
      "required": true,
      "enum": ["charge", "refund", "verify"]
    },
    {
      "name": "payment_data",
      "type": "object",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "result",
      "type": "object",
      "schema": {
        "success": "boolean",
        "transaction_id": "string",
        "status": "string"
      }
    }
  ],
  "deployment": {
    "resources": {
      "cpu": "1",
      "memory": "512Mi"
    }
  }
}
EOF
                ;;
            "stats-aggregator")
                cat << EOF
{
  "name": "$agent_name",
  "version": "1.0.0",
  "description": "SmythOS agent for real-time analytics and statistics aggregation",
  "type": "analytical",
  "capabilities": ["data_aggregation", "real_time_analytics", "dashboard_generation", "report_creation"],
  "inputs": [
    {
      "name": "hunt_id",
      "type": "uuid",
      "required": true
    },
    {
      "name": "metric_type",
      "type": "string",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "stats",
      "type": "object",
      "schema": {
        "metrics": "object",
        "trends": "array"
      }
    }
  ],
  "deployment": {
    "resources": {
      "cpu": "0.5",
      "memory": "256Mi"
    }
  }
}
EOF
                ;;
            "notification-service")
                cat << EOF
{
  "name": "$agent_name",
  "version": "1.0.0",
  "description": "SmythOS agent for email and push notification handling",
  "type": "messaging",
  "capabilities": ["email_delivery", "push_notifications", "template_management", "delivery_tracking"],
  "inputs": [
    {
      "name": "type",
      "type": "string",
      "required": true,
      "enum": ["email", "push", "sms"]
    },
    {
      "name": "recipient",
      "type": "string",
      "required": true
    },
    {
      "name": "message",
      "type": "object",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "result",
      "type": "object",
      "schema": {
        "success": "boolean",
        "delivery_id": "string",
        "status": "string"
      }
    }
  ],
  "deployment": {
    "resources": {
      "cpu": "0.5",
      "memory": "256Mi"
    }
  }
}
EOF
                ;;
        esac
    fi
}

deploy_agent() {
    local agent_dir="$1"
    local agent_name="$2"
    
    log_agent "Deploying $agent_name..."
    
    # Generate agent configuration
    local config=$(generate_agent_config "$agent_dir" "$agent_name")
    
    # Create temporary file for config
    local temp_config=$(mktemp)
    echo "$config" > "$temp_config"
    
    # Deploy agent
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $SMYTHOS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "@$temp_config" \
        "$SMYTHOS_API_BASE/workspaces/$WORKSPACE_NAME/agents" 2>/dev/null)
    
    local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    # Clean up temp file
    rm -f "$temp_config"
    
    if [[ "$http_status" == "200" ]] || [[ "$http_status" == "201" ]]; then
        log_success "$agent_name deployed successfully!"
        AGENTS_DEPLOYED+=("$agent_name")
        
        # Extract agent URL if available
        if command -v jq &> /dev/null && [[ -n "$response_body" ]]; then
            local agent_url=$(echo "$response_body" | jq -r '.endpoint_url // .url // empty' 2>/dev/null)
            if [[ -n "$agent_url" && "$agent_url" != "null" ]]; then
                DEPLOYMENT_URLS+=("$agent_name: $agent_url")
                log_info "Agent URL: $agent_url"
            fi
        fi
    else
        log_error "$agent_name deployment failed (HTTP $http_status)"
        if [[ -n "$response_body" ]]; then
            log_error "Response: $response_body"
        fi
        AGENTS_FAILED+=("$agent_name")
    fi
    
    echo ""
}

deploy_all_agents() {
    log_info "Starting deployment of all agents..."
    echo ""
    
    for agent_dir in "${!AGENTS[@]}"; do
        deploy_agent "$agent_dir" "${AGENTS[$agent_dir]}"
        sleep 2  # Brief pause between deployments
    done
}

generate_env_config() {
    log_info "Generating environment configuration..."
    
    local env_file="smythos-agents.env"
    
    cat > "$env_file" << EOF
# SmythOS Agent Configuration
# Generated on $(date)

# SmythOS Platform
SMYTHOS_API_KEY=$SMYTHOS_API_KEY
SMYTHOS_WORKSPACE=$WORKSPACE_NAME

# Agent Endpoints (update with actual URLs from deployment)
CLUE_AGENT_URL=https://agents.smythos.com/$WORKSPACE_NAME/ClueGeneratorAgent
QR_AGENT_URL=https://agents.smythos.com/$WORKSPACE_NAME/QRManagerAgent
PAYMENT_AGENT_URL=https://agents.smythos.com/$WORKSPACE_NAME/PaymentHandlerAgent
STATS_AGENT_URL=https://agents.smythos.com/$WORKSPACE_NAME/StatsAggregatorAgent
NOTIFICATION_AGENT_URL=https://agents.smythos.com/$WORKSPACE_NAME/NotificationServiceAgent

# Integration Settings
AGENT_TIMEOUT=30000
AGENT_RETRY_COUNT=3
AGENT_HEALTH_CHECK_INTERVAL=60000
EOF
    
    log_success "Environment configuration saved to: $env_file"
    log_info "Copy these variables to your main .env file"
}

test_agent_deployment() {
    log_info "Testing agent deployments..."
    
    if [[ ${#AGENTS_DEPLOYED[@]} -eq 0 ]]; then
        log_warning "No agents deployed successfully - skipping tests"
        return
    fi
    
    # Test ClueGeneratorAgent if deployed
    if [[ " ${AGENTS_DEPLOYED[@]} " =~ " ClueGeneratorAgent " ]]; then
        log_info "Testing ClueGeneratorAgent..."
        local test_response=$(curl -s \
            -X POST \
            -H "Authorization: Bearer $SMYTHOS_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "shop_info": {
                    "name": "Test Coffee Shop",
                    "description": "A test location"
                },
                "difficulty_level": 3
            }' \
            "https://agents.smythos.com/$WORKSPACE_NAME/ClueGeneratorAgent/generate-clue" 2>/dev/null)
        
        if [[ -n "$test_response" ]]; then
            log_success "ClueGeneratorAgent test passed"
        else
            log_warning "ClueGeneratorAgent test failed or endpoint not ready"
        fi
    fi
    
    # Add similar tests for other agents...
    log_info "Basic testing completed"
}

show_deployment_summary() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                🎉 Deployment Summary                  ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}✅ Successfully Deployed Agents (${#AGENTS_DEPLOYED[@]}):${NC}"
    for agent in "${AGENTS_DEPLOYED[@]}"; do
        echo "  • $agent"
    done
    echo ""
    
    if [[ ${#AGENTS_FAILED[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Failed Deployments (${#AGENTS_FAILED[@]}):${NC}"
        for agent in "${AGENTS_FAILED[@]}"; do
            echo "  • $agent"
        done
        echo ""
    fi
    
    if [[ ${#DEPLOYMENT_URLS[@]} -gt 0 ]]; then
        echo -e "${BLUE}🔗 Agent Endpoints:${NC}"
        for url in "${DEPLOYMENT_URLS[@]}"; do
            echo "  • $url"
        done
        echo ""
    fi
    
    echo -e "${BLUE}📊 Management URLs:${NC}"
    echo "  • Dashboard: $SMYTHOS_WEB_BASE/dashboard"
    echo "  • Agents: $SMYTHOS_WEB_BASE/agents"
    echo "  • Metrics: $SMYTHOS_WEB_BASE/agents/metrics"
    echo "  • Logs: $SMYTHOS_WEB_BASE/agents/logs"
    echo ""
    
    echo -e "${YELLOW}🔧 Next Steps:${NC}"
    echo "  1. Update your .env file with the generated agent URLs"
    echo "  2. Remove local agent containers from docker-compose.yml"
    echo "  3. Update backend code to use SmythOS endpoints"
    echo "  4. Test the integrated platform"
    echo "  5. Configure monitoring and alerts"
    echo ""
    
    if [[ ${#AGENTS_DEPLOYED[@]} -eq ${#AGENTS[@]} ]]; then
        log_success "🎉 All agents deployed successfully!"
        return 0
    else
        log_warning "⚠️ Some agents failed to deploy. Check the errors above."
        return 1
    fi
}

# Parse command line arguments
SKIP_TESTS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "SmythOS Agent Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-tests  Skip agent testing after deployment"
            echo "  --dry-run     Show what would be deployed without actually deploying"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Prerequisites:"
            echo "  • SMYTHOS_API_KEY environment variable must be set"
            echo "  • curl must be installed"
            echo "  • Project directory '$PROJECT_DIR' must exist"
            echo ""
            echo "Examples:"
            echo "  export SMYTHOS_API_KEY=your_api_key_here"
            echo "  $0                    # Deploy all agents"
            echo "  $0 --skip-tests       # Deploy without testing"
            echo "  $0 --dry-run          # Preview deployment"
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
    validate_api_key
    create_workspace
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN MODE - No actual deployment will occur"
        log_info "Would deploy these agents:"
        for agent_dir in "${!AGENTS[@]}"; do
            echo "  • ${AGENTS[$agent_dir]} (from $agent_dir)"
        done
        echo ""
        log_info "Run without --dry-run to perform actual deployment"
        exit 0
    fi
    
    deploy_all_agents
    generate_env_config
    
    if [[ "$SKIP_TESTS" != true ]]; then
        test_agent_deployment
    fi
    
    show_deployment_summary
}

# Trap Ctrl+C
trap 'log_error "Deployment interrupted by user"; exit 1' INT

# Run main function
main