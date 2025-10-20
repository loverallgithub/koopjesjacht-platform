#!/bin/bash
set -e

# Koopjesjacht VPS Deployment Script (Local Files)
# This script deploys from local files to avoid git authentication issues

VPS_IP="72.60.169.105"
VPS_USER="root"
PROJECT_DIR="/docker/koopjesjacht"

echo "========================================="
echo "Koopjesjacht VPS Deployment"
echo "========================================="
echo ""
echo "Deploying to: $VPS_USER@$VPS_IP"
echo "Target directory: $PROJECT_DIR"
echo ""

# Test SSH connectivity
echo "Step 1: Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH connection successful'"; then
    echo "ERROR: Cannot connect to VPS via SSH"
    echo ""
    echo "Please ensure:"
    echo "1. SSH access is configured in Hostinger panel"
    echo "2. You have the correct SSH credentials"
    echo "3. Your local SSH key is added to the VPS"
    echo ""
    exit 1
fi
echo "✅ SSH connection successful"
echo ""

# Create deployment archive
echo "Step 2: Creating deployment archive..."
TEMP_ARCHIVE="/tmp/koopjesjacht-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$TEMP_ARCHIVE" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.env.local' \
    --exclude='*.log' \
    .
echo "✅ Archive created: $TEMP_ARCHIVE"
echo ""

# Upload archive to VPS
echo "Step 3: Uploading to VPS..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "mkdir -p $PROJECT_DIR"
scp -o StrictHostKeyChecking=no "$TEMP_ARCHIVE" $VPS_USER@$VPS_IP:/tmp/koopjesjacht-deploy.tar.gz
echo "✅ Upload complete"
echo ""

# Extract and deploy on VPS
echo "Step 4: Extracting files on VPS..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'ENDSSH'
set -e

PROJECT_DIR="/docker/koopjesjacht"

# Extract archive
cd $PROJECT_DIR
tar -xzf /tmp/koopjesjacht-deploy.tar.gz
rm /tmp/koopjesjacht-deploy.tar.gz

# Ensure static-index.html exists
if [ ! -f "frontend/public/static-index.html" ]; then
    echo "Creating missing static-index.html..."
    mkdir -p frontend/public
    cat > frontend/public/static-index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Koopjesjacht</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF
    echo "✅ static-index.html created"
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.production .env 2>/dev/null || echo "# Production environment" > .env
    echo "✅ .env created"
fi

echo "✅ Files extracted to $PROJECT_DIR"
ENDSSH

echo "✅ Extraction complete"
echo ""

# Stop existing containers
echo "Step 5: Stopping existing containers..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'ENDSSH'
set -e
cd /docker/koopjesjacht
if [ -f "docker-compose.yml" ]; then
    docker-compose down -v 2>/dev/null || true
    echo "✅ Existing containers stopped"
else
    echo "⚠️  No existing deployment found"
fi
ENDSSH

echo ""

# Build and start containers
echo "Step 6: Building and starting Docker containers..."
echo "This will take 5-10 minutes..."
echo ""

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'ENDSSH'
set -e
cd /docker/koopjesjacht

# Build and start
docker-compose up -d --build

# Wait for containers to start
echo "Waiting for containers to initialize..."
sleep 30

# Check status
echo ""
echo "========================================="
echo "Container Status:"
echo "========================================="
docker-compose ps

echo ""
echo "========================================="
echo "Service Health Checks:"
echo "========================================="

# Test key services
for port in 9000 9001 9002 9003 9004 9005; do
    echo -n "Port $port: "
    timeout 5 curl -s http://localhost:$port/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "⚠️  Not responding"
done

ENDSSH

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Access your application at:"
echo "  Frontend: http://$VPS_IP:8081"
echo "  API Gateway: http://$VPS_IP:9000"
echo "  Nginx: http://$VPS_IP:8080"
echo ""
echo "To view logs:"
echo "  ssh $VPS_USER@$VPS_IP 'cd $PROJECT_DIR && docker-compose logs -f'"
echo ""
echo "To check container status:"
echo "  ssh $VPS_USER@$VPS_IP 'cd $PROJECT_DIR && docker-compose ps'"
echo ""

# Cleanup local archive
rm -f "$TEMP_ARCHIVE"

exit 0
