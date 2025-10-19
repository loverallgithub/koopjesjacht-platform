#!/bin/bash
# Koopjesjacht Platform - Hostinger Deployment Script
# This script will deploy your full application to Hostinger VPS

set -e  # Exit on error

echo "========================================"
echo "Koopjesjacht Platform Deployment"
echo "========================================"
echo ""

# Configuration
VPS_IP="72.60.169.105"
PROJECT_DIR="/docker/koopjesjacht-platform"
REPO_URL="https://github.com/loverallgithub/Koopjesjacht.git"

echo "🔍 Step 1: Testing SSH Connection..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$VPS_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection established"
else
    echo "❌ Cannot connect via SSH"
    echo ""
    echo "Please ensure:"
    echo "1. You have SSH access configured in Hostinger panel"
    echo "2. You have the root password or SSH key set up"
    echo ""
    echo "To set up SSH access:"
    echo "1. Go to: https://hpanel.hostinger.com"
    echo "2. Navigate to your VPS"
    echo "3. Go to Advanced → SSH Keys"
    echo "4. Add your public key or reset root password"
    echo ""
    read -p "Press Enter once SSH is configured, or Ctrl+C to exit..."
fi

echo ""
echo "📁 Step 2: Preparing deployment directory..."
ssh root@$VPS_IP << 'ENDSSH'
    cd /docker/koopjesjacht-platform

    # Remove old app directory if exists
    if [ -d "app" ]; then
        echo "Removing old deployment..."
        rm -rf app
    fi
ENDSSH

echo "✅ Directory prepared"

echo ""
echo "📥 Step 3: Cloning repository..."
echo "Note: If your repo is private, you'll need to authenticate"
echo ""

# Clone repository
ssh -t root@$VPS_IP << 'ENDSSH'
    cd /docker/koopjesjacht-platform
    git clone https://github.com/loverallgithub/Koopjesjacht.git app
ENDSSH

echo "✅ Repository cloned"

echo ""
echo "⚙️  Step 4: Configuring environment..."
ssh root@$VPS_IP << 'ENDSSH'
    cd /docker/koopjesjacht-platform/app

    # Create .env file
    cat > .env <<'ENV_EOF'
# Database Configuration
DB_USER=scavenger
DB_PASSWORD=KoopjesjachtSecure2025!
DB_NAME=scavenger_hunt

# Application Configuration
NODE_ENV=production
JWT_SECRET=koopjesjacht_jwt_secret_2025_production
AGENT_SECRET=shared_agent_secret_koopjesjacht_2025

# SMTP Configuration (update with your values)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Payment Configuration (update with your values)
STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
MOLLIE_API_KEY=

# Firebase Configuration (update with your values)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Application URLs
REFERRAL_LINK_BASE=https://pimlicoservices.cloud/join
ENV_EOF

    echo "Environment file created"
ENDSSH

echo "✅ Environment configured"

echo ""
echo "🐳 Step 5: Building and starting containers..."
echo "This may take 5-10 minutes..."
ssh root@$VPS_IP << 'ENDSSH'
    cd /docker/koopjesjacht-platform/app

    # Start docker compose
    docker-compose up -d --build

    echo ""
    echo "Waiting for containers to initialize..."
    sleep 30

    echo ""
    echo "Container status:"
    docker-compose ps
ENDSSH

echo "✅ Containers started"

echo ""
echo "🔍 Step 6: Verifying deployment..."
ssh root@$VPS_IP << 'ENDSSH'
    cd /docker/koopjesjacht-platform/app

    echo "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep scavenger

    echo ""
    echo "Testing services..."

    # Test API Gateway
    if curl -s http://localhost:9000/health > /dev/null 2>&1; then
        echo "✅ API Gateway responding"
    else
        echo "⏳ API Gateway starting..."
    fi

    # Test Frontend
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        echo "✅ Frontend responding"
    else
        echo "⏳ Frontend starting..."
    fi
ENDSSH

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Your services are accessible at:"
echo "  - Frontend: http://72.60.169.105:8081"
echo "  - API Gateway: http://72.60.169.105:9000"
echo "  - Nginx: http://72.60.169.105:8080"
echo ""
echo "To view logs:"
echo "  ssh root@72.60.169.105"
echo "  cd /docker/koopjesjacht-platform/app"
echo "  docker-compose logs -f"
echo ""
echo "To check status:"
echo "  ssh root@72.60.169.105"
echo "  cd /docker/koopjesjacht-platform/app"
echo "  docker-compose ps"
echo ""
