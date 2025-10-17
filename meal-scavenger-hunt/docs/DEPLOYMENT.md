# Meal Scavenger Hunt Platform - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Meal Scavenger Hunt Platform on Hostinger's Docker hosting service.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Hostinger VPS with Docker support
- Domain name configured
- SSL certificates
- PostgreSQL 15+
- Redis 7+
- SmythOS API key

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/meal-scavenger-hunt.git
cd meal-scavenger-hunt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

Required environment variables:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL credentials
- `JWT_SECRET` - Secret key for JWT tokens
- `SMYTHOS_API_KEY` - Your SmythOS API key
- Payment gateway credentials (Stripe, PayPal, Mollie)
- SMTP configuration for emails

### 3. Build and Deploy

```bash
# Build all containers
docker-compose build

# Start services in production mode
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

## Hostinger-Specific Configuration

### VPS Setup

1. **SSH into your Hostinger VPS:**
```bash
ssh root@your-vps-ip
```

2. **Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

3. **Install Docker Compose:**
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Domain Configuration

1. **Point your domain to Hostinger VPS IP**
2. **Configure Nginx for SSL:**

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Generate SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Firewall Rules

```bash
# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Backend API
ufw allow 5432/tcp  # PostgreSQL
ufw allow 6379/tcp  # Redis
ufw enable
```

## Scaling Configuration

### Horizontal Scaling

The platform supports horizontal scaling through Docker Swarm:

```bash
# Initialize Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml scavenger

# Scale services
docker service scale scavenger_backend=3
docker service scale scavenger_frontend=2
```

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1024M
    reservations:
      cpus: '1'
      memory: 512M
```

## SmythOS Agent Configuration

### Agent Deployment

Each SmythOS agent runs as a separate microservice:

1. **Clue Generator Agent** (Port 8001)
   - Generates creative scavenger hunt clues
   - Auto-scales based on demand

2. **QR Manager Agent** (Port 8002)
   - Handles QR code generation and validation
   - Processes scan events

3. **Stats Aggregator Agent** (Port 8003)
   - Compiles real-time statistics
   - Generates dashboards

4. **Payment Handler Agent** (Port 8004)
   - Processes multi-gateway payments
   - Handles subscriptions

5. **Notification Service Agent** (Port 8005)
   - Manages email/push notifications
   - Event-driven messaging

### Agent Monitoring

```bash
# View agent logs
docker-compose logs -f clue-agent
docker-compose logs -f qr-agent

# Check agent health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## Database Management

### Backup Strategy

```bash
# Create backup script
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U scavenger scavenger_hunt > /backups/db_$DATE.sql
# Keep only last 7 days of backups
find /backups -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/backup.sh" | crontab -
```

### Restore from Backup

```bash
docker-compose exec -T postgres psql -U scavenger scavenger_hunt < /backups/db_20240101_020000.sql
```

## Monitoring and Logging

### Application Monitoring

```bash
# Install monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://your-domain:3001
# Prometheus: http://your-domain:9090
```

### Log Aggregation

```bash
# View aggregated logs
docker-compose logs -f --tail=100

# Export logs
docker-compose logs > logs_$(date +%Y%m%d).txt
```

## Security Best Practices

1. **Regular Updates:**
```bash
docker-compose pull
docker-compose up -d
```

2. **SSL/TLS Configuration:**
   - Use strong cipher suites
   - Enable HSTS
   - Regular certificate renewal

3. **Database Security:**
   - Use strong passwords
   - Enable SSL for database connections
   - Regular security audits

4. **API Security:**
   - Rate limiting enabled
   - JWT token rotation
   - Input validation

## Troubleshooting

### Common Issues

1. **Container Won't Start:**
```bash
docker-compose logs [service-name]
docker-compose down
docker-compose up -d
```

2. **Database Connection Issues:**
```bash
docker-compose exec backend npm run migrate
docker-compose restart postgres
```

3. **High Memory Usage:**
```bash
docker system prune -a
docker-compose down
docker-compose up -d
```

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health
curl http://localhost:8001/health
curl http://localhost:8002/health

# Database health
docker-compose exec postgres pg_isready
```

## Performance Optimization

### Caching Strategy

- Redis for session management
- CDN for static assets
- Database query caching

### Load Balancing

```nginx
upstream backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```

## Maintenance Mode

```bash
# Enable maintenance mode
docker-compose exec frontend touch /usr/share/nginx/html/maintenance

# Disable maintenance mode
docker-compose exec frontend rm /usr/share/nginx/html/maintenance
```

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- SmythOS Support: support@smythos.com
- Community: Discord Server

## License

This platform is deployed under the terms specified in the LICENSE file.