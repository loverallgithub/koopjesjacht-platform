########

 🚀 Hostinger Docker Deployment Guide

## Deploy Meal Scavenger Hunt Platform to Hostinger VPS

---

## 📋 **Prerequisites**

### **1. Hostinger VPS Requirements:**
- **Plan:** VPS or Cloud Hosting (minimum 2GB RAM, 2 CPU cores)
- **OS:** Ubuntu 20.04 LTS or 22.04 LTS recommended
- **Storage:** Minimum 20GB SSD
- **Bandwidth:** Unmetered or sufficient for your traffic

### **2. Access Requirements:**
- SSH access to your Hostinger server
- Root or sudo privileges
- Domain name configured (optional but recommended)

### **3. Software Requirements:**
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl/wget

---

## 🔧 **Initial Server Setup**

### **Step 1: Connect to Your Hostinger Server**

```bash
# Connect via SSH (get details from Hostinger control panel)
ssh root@your-server-ip

# Or if using a custom port
ssh -p PORT_NUMBER root@your-server-ip
```

### **Step 2: Update System**

```bash
# Update package list
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop
```

### **Step 3: Install Docker**

```bash
# Remove old Docker versions
apt remove docker docker-engine docker.io containerd runc

# Install Docker prerequisites
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify Docker installation
docker --version
docker compose version

# Start and enable Docker
systemctl start docker
systemctl enable docker
```

### **Step 4: Configure Firewall**

```bash
# Install UFW if not installed
apt install -y ufw

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3527/tcp  # Backend API (optional, for testing)
ufw allow 8081/tcp  # Frontend (optional, for testing)

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## 📦 **Deploy Application**

### **Method 1: Manual Deployment (First Time)**

#### **Step 1: Clone Repository**

```bash
# Create deployment directory
mkdir -p /var/www/koopjesjacht
cd /var/www/koopjesjacht

# Clone from GitHub
git clone https://github.com/loverallgithub/Koopjesjacht.git .

# Navigate to application directory
cd meal-scavenger-hunt
```

#### **Step 2: Configure Environment**

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env

# Add your configuration:
# - Database credentials
# - JWT secret
# - SmythOS API key
# - Payment provider keys
# - SMTP credentials
# - etc.
```

#### **Step 3: Start Services**

```bash
# Pull Docker images
docker compose pull

# Start all services
docker compose up -d

# Check services status
docker compose ps

# View logs
docker compose logs -f
```

#### **Step 4: Initialize Database**

```bash
# Wait for PostgreSQL to be ready
docker compose exec postgres pg_isready -U scavenger

# Run migrations
docker compose exec backend npm run migrate

# Seed initial data (optional)
docker compose exec backend npm run seed
```

---

### **Method 2: Automated Deployment Script**

Use the provided deployment script for easier management:

```bash
# Make script executable
chmod +x /path/to/deploy_hostinger.sh

# Run deployment
./deploy_hostinger.sh
```

---

## 🔄 **Automated Deployment with GitHub Actions**

### **Step 1: Set Up SSH Key**

```bash
# On your local machine, generate SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions@koopjesjacht.com" -f ~/.ssh/hostinger_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/hostinger_deploy.pub root@your-server-ip

# Test connection
ssh -i ~/.ssh/hostinger_deploy root@your-server-ip "echo 'Connection successful'"
```

### **Step 2: Configure GitHub Secrets**

Go to: https://github.com/loverallgithub/Koopjesjacht/settings/secrets/actions

Add the following secrets:

```
HOSTINGER_HOST           your-server-ip
HOSTINGER_USERNAME       root (or your username)
HOSTINGER_SSH_KEY        (paste private key content from ~/.ssh/hostinger_deploy)
HOSTINGER_SSH_PORT       22 (or custom port)

# Application secrets
DB_PASSWORD              your-db-password
JWT_SECRET               your-jwt-secret
SMYTHOS_API_KEY         your-smythos-key
STRIPE_SECRET_KEY       your-stripe-key (if using)
# ... add all other secrets
```

### **Step 3: Deploy with Git Tag**

```bash
# Create and push a version tag to trigger deployment
git tag -a v1.0.0 -m "Initial production release"
git push origin v1.0.0

# GitHub Actions will automatically deploy to Hostinger
```

---

## 🌐 **Domain Configuration**

### **Configure Domain in Hostinger Control Panel:**

1. Log into Hostinger control panel
2. Go to Domains section
3. Point your domain to server IP
4. Configure DNS records:

```
Type    Name    Value                   TTL
A       @       your-server-ip          3600
A       www     your-server-ip          3600
A       api     your-server-ip          3600
CNAME   *       yourdomain.com          3600
```

### **Configure Nginx Reverse Proxy:**

```bash
# Install Nginx (if not using container)
apt install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/koopjesjacht << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (add after getting certificates)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # Backend API
    location / {
        proxy_pass http://localhost:3527;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/koopjesjacht /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### **Install SSL Certificate with Let's Encrypt:**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Verify auto-renewal
certbot renew --dry-run

# Certificate will auto-renew via cron
```

---

## 📊 **Monitoring & Management**

### **Check Application Status:**

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f postgres

# Check resource usage
docker stats

# View system resources
htop
```

### **Manage Services:**

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend

# Stop all services
docker compose down

# Start services
docker compose up -d

# Rebuild and restart
docker compose up -d --build

# Scale services
docker compose up -d --scale backend=3
```

### **Database Management:**

```bash
# Access PostgreSQL
docker compose exec postgres psql -U scavenger -d scavenger_hunt

# Create database backup
docker compose exec postgres pg_dump -U scavenger scavenger_hunt > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T postgres psql -U scavenger scavenger_hunt < backup.sql

# Check database size
docker compose exec postgres psql -U scavenger -d scavenger_hunt -c "SELECT pg_size_pretty(pg_database_size('scavenger_hunt'));"
```

### **Log Management:**

```bash
# View and follow logs
docker compose logs -f --tail=100

# Save logs to file
docker compose logs > logs_$(date +%Y%m%d).log

# Clear Docker logs (careful!)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' $(docker ps -qa))

# Rotate logs automatically (add to crontab)
# 0 0 * * * /usr/local/bin/docker system prune -af --volumes
```

---

## 🔒 **Security Best Practices**

### **1. Secure SSH:**

```bash
# Edit SSH configuration
nano /etc/ssh/sshd_config

# Change default port (optional)
Port 2222

# Disable root login
PermitRootLogin no

# Disable password authentication (use keys only)
PasswordAuthentication no

# Restart SSH
systemctl restart sshd
```

### **2. Install Fail2Ban:**

```bash
# Install Fail2Ban
apt install -y fail2ban

# Configure Fail2Ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

# Start and enable Fail2Ban
systemctl start fail2ban
systemctl enable fail2ban

# Check status
fail2ban-client status
```

### **3. Enable Automatic Updates:**

```bash
# Install unattended-upgrades
apt install -y unattended-upgrades

# Enable automatic updates
dpkg-reconfigure -plow unattended-upgrades
```

### **4. Set Up Monitoring:**

```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Set up log monitoring
apt install -y logwatch

# Configure email alerts (optional)
apt install -y mailutils
```

---

## 🔄 **Backup Strategy**

### **Automated Backup Script:**

```bash
#!/bin/bash
# /usr/local/bin/backup_koopjesjacht.sh

BACKUP_DIR="/var/backups/koopjesjacht"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/koopjesjacht/meal-scavenger-hunt"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose -f $APP_DIR/docker-compose.yml exec -T postgres \
  pg_dump -U scavenger scavenger_hunt | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads and data
tar -czf $BACKUP_DIR/data_$DATE.tar.gz $APP_DIR/backend/uploads

# Backup environment configuration
cp $APP_DIR/.env $BACKUP_DIR/env_$DATE.backup

# Remove backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
chmod +x /usr/local/bin/backup_koopjesjacht.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup_koopjesjacht.sh
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

**Services Won't Start:**
```bash
# Check Docker daemon
systemctl status docker

# Check logs
docker compose logs

# Check disk space
df -h

# Check memory
free -m
```

**Database Connection Issues:**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres pg_isready

# View PostgreSQL logs
docker compose logs postgres
```

**High Resource Usage:**
```bash
# Check resource usage
docker stats

# Restart services
docker compose restart

# Clear Docker cache
docker system prune -a
```

**Port Already in Use:**
```bash
# Find process using port
lsof -i :3527

# Kill process
kill -9 PID

# Or change port in docker-compose.yml
```

---

## 📞 **Support**

- **Hostinger Support:** https://www.hostinger.com/support
- **Docker Documentation:** https://docs.docker.com
- **GitHub Repository:** https://github.com/loverallgithub/Koopjesjacht

---

## ✅ **Deployment Checklist**

- [ ] Hostinger VPS provisioned
- [ ] SSH access configured
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured
- [ ] Application deployed
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security hardening completed
- [ ] GitHub Actions configured
- [ ] Deployment tested

**🎉 Your platform is now live on Hostinger!**