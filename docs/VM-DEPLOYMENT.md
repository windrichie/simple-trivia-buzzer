# Cloud VM Deployment Guide

Complete guide for deploying the Trivia Buzzer App to a Cloud VM (AWS EC2, BytePlus ECS, or similar) running Ubuntu 22.04/24.04.

**Yes, both frontend and backend can run on the same machine!** This guide covers single-machine deployment with Nginx as a reverse proxy.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [VM Setup](#vm-setup)
3. [System Preparation](#system-preparation)
4. [Installing Dependencies](#installing-dependencies)
5. [Deploying the Application](#deploying-the-application)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Process Management with PM2](#process-management-with-pm2)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Cloud Provider Setup

**AWS EC2**:
- Instance type: `t3.small` or larger (2 vCPU, 2GB RAM minimum)
- AMI: Ubuntu Server 22.04 LTS or 24.04 LTS
- Security Group rules:
  - SSH (22) from your IP
  - HTTP (80) from anywhere (0.0.0.0/0)
  - HTTPS (443) from anywhere (0.0.0.0/0)
- Storage: 20GB SSD minimum

**BytePlus ECS / Other Providers**:
- Similar specifications as above
- Ubuntu 22.04 or 24.04
- Public IP address
- Root or sudo access

### Domain Setup (Optional but Recommended)

Point your domain to the VM's public IP:
```
A Record: trivia.yourdomain.com → 1.2.3.4 (VM IP)
```

If using a subdomain for backend WebSocket:
```
A Record: api.yourdomain.com → 1.2.3.4 (same IP)
```

Or use path-based routing (recommended for single domain):
```
https://trivia.yourdomain.com        → Frontend
https://trivia.yourdomain.com/api    → Backend
wss://trivia.yourdomain.com/socket   → WebSocket
```

### Local Requirements

- SSH key pair for VM access
- Git installed locally
- Basic familiarity with Linux commands

---

## VM Setup

### 1. Connect to Your VM

```bash
# AWS EC2
ssh -i /path/to/your-key.pem ubuntu@your-vm-ip

# Other providers (if using password)
ssh root@your-vm-ip
```

### 2. Update System

```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential
```

### 3. Create Application User (Security Best Practice)

```bash
# Create a dedicated user for running the application
sudo adduser --disabled-password --gecos "" trivia

# Add to sudo group (if needed for PM2 startup)
sudo usermod -aG sudo trivia

# Switch to trivia user
sudo su - trivia
```

**Note**: For the rest of this guide, execute commands as the `trivia` user unless specified otherwise.

---

## System Preparation

### 1. Set Timezone

```bash
# Check current timezone
timedatectl

# Set to your timezone (example: Asia/Singapore)
sudo timedatectl set-timezone Asia/Singapore
```

### 2. Configure Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## Installing Dependencies

### 1. Install Node.js 22 LTS

```bash
# Add NodeSource repository for Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x or higher
```

### 2. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 to start on system boot
sudo pm2 startup systemd -u trivia --hp /home/trivia
```

### 3. Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 4. Install Certbot (SSL Certificates)

```bash
# Install Certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Deploying the Application

### 1. Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/your-username/trivia-simple-app.git
cd trivia-simple-app

# Or if using a different Git provider
git clone https://your-git-url.git
```

### 2. Setup Environment Variables

```bash
# Create .env file in project root
cat > .env << 'EOF'
# GM Password (change this!)
GM_PASSWORD=your-secure-password-here

# Maximum players per session (optional, default: 10)
MAX_PLAYERS=10

# Production URLs
NODE_ENV=production
FRONTEND_URL=https://trivia.yourdomain.com
NEXT_PUBLIC_WS_URL=https://trivia.yourdomain.com
EOF

# Secure the .env file
chmod 600 .env
```

**Important**: Replace:
- `your-secure-password-here` with a strong password
- `trivia.yourdomain.com` with your actual domain

### 3. Install Dependencies

```bash
# Install all dependencies (root + workspaces)
npm install

# This will install dependencies for:
# - Root workspace
# - backend/
# - frontend/
```

### 4. Build Backend

```bash
cd backend

# Build TypeScript to JavaScript
npm run build

# Verify dist folder was created
ls -la dist/

cd ..
```

### 5. Build Frontend

```bash
cd frontend

# Build Next.js for production (with environment variable)
NEXT_PUBLIC_WS_URL=https://trivia.yourdomain.com npm run build

# Verify .next folder was created
ls -la .next/

cd ..
```

**Note**: The WebSocket URL is baked into the frontend build. If you change domains, you need to rebuild.

---

## Nginx Configuration

### Architecture Overview

```
Internet → Nginx (Port 80/443)
            ├─ / → Frontend (localhost:3000)
            ├─ /api → Backend (localhost:3001)
            └─ /socket.io → WebSocket (localhost:3001)
```

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/trivia
```

Paste the following configuration:

```nginx
# Trivia Buzzer App - Nginx Configuration
# Both frontend and backend on same machine

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name trivia.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name trivia.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/trivia.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/trivia.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max upload size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/trivia-access.log;
    error_log /var/log/nginx/trivia-error.log;

    # Frontend (Next.js) - Default location
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API - HTTP endpoints
    location /api {
        # Remove /api prefix when proxying
        rewrite ^/api/(.*) /$1 break;

        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket (Socket.IO) - Critical for real-time communication
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts (keep connections alive)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for WebSocket
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # No caching for health checks
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

**Important**: Replace `trivia.yourdomain.com` with your actual domain in:
- Line 7 (`server_name`)
- Line 25 (`server_name`)
- SSL certificate paths (lines 29-30, will be auto-filled by Certbot)

### 2. Enable the Configuration

```bash
# Create symbolic link to sites-enabled
sudo ln -s /etc/nginx/sites-available/trivia /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### 1. Obtain SSL Certificate with Let's Encrypt

```bash
# Run Certbot (replace with your domain and email)
sudo certbot --nginx -d trivia.yourdomain.com --email your-email@example.com --agree-tos --no-eff-email

# Certbot will:
# 1. Verify domain ownership
# 2. Obtain SSL certificate
# 3. Automatically update Nginx config
# 4. Set up auto-renewal
```

### 2. Verify SSL Certificate

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check certificate details
sudo certbot certificates
```

### 3. Auto-Renewal

Certbot automatically sets up a systemd timer for renewal. Verify it:

```bash
# Check renewal timer
sudo systemctl list-timers | grep certbot

# Manually renew if needed
sudo certbot renew
```

---

## Process Management with PM2

### 1. Create PM2 Ecosystem File

```bash
cd ~/trivia-simple-app

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'trivia-backend',
      cwd: './backend',
      script: 'node',
      args: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '~/.pm2/logs/trivia-backend-error.log',
      out_file: '~/.pm2/logs/trivia-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'trivia-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '~/.pm2/logs/trivia-frontend-error.log',
      out_file: '~/.pm2/logs/trivia-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
EOF
```

### 2. Start Applications with PM2

```bash
# Load .env file and start all apps
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# View logs for specific app
pm2 logs trivia-backend
pm2 logs trivia-frontend
```

### 3. Save PM2 Configuration

```bash
# Save current PM2 process list
pm2 save

# This ensures apps restart after reboot
# (you already ran pm2 startup earlier)
```

### 4. Verify Auto-Start

```bash
# Reboot the VM to test
sudo reboot

# After reboot, reconnect and check
ssh ubuntu@your-vm-ip
sudo su - trivia
pm2 status

# Apps should be running automatically
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process list
pm2 list

# Detailed info
pm2 info trivia-backend
pm2 info trivia-frontend

# Logs (last 200 lines)
pm2 logs --lines 200

# Clear logs
pm2 flush
```

### Restart Applications

```bash
# Restart specific app
pm2 restart trivia-backend
pm2 restart trivia-frontend

# Restart all apps
pm2 restart all

# Reload apps (zero-downtime for clustered apps)
pm2 reload all
```

### Update Application

```bash
cd ~/trivia-simple-app

# Pull latest code
git pull origin main

# Rebuild backend
cd backend
npm install
npm run build
cd ..

# Rebuild frontend (with environment variable)
cd frontend
npm install
NEXT_PUBLIC_WS_URL=https://trivia.yourdomain.com npm run build
cd ..

# Restart applications
pm2 restart all

# Check logs for errors
pm2 logs --lines 50
```

### System Resource Monitoring

```bash
# CPU and Memory usage
pm2 status

# Detailed system stats
htop

# Or use top
top

# Disk usage
df -h

# Check Nginx logs
sudo tail -f /var/log/nginx/trivia-access.log
sudo tail -f /var/log/nginx/trivia-error.log
```

### Health Checks

```bash
# Backend health check
curl http://localhost:3001/health

# Via Nginx
curl https://trivia.yourdomain.com/health

# Frontend health check
curl http://localhost:3000

# Via Nginx
curl https://trivia.yourdomain.com
```

---

## Troubleshooting

### Issue: Application Not Starting

**Check PM2 Logs**:
```bash
pm2 logs trivia-backend --lines 100
pm2 logs trivia-frontend --lines 100
```

**Common Causes**:
- Missing `dist` folder in backend → Run `npm run build`
- Missing `.next` folder in frontend → Run `npm run build`
- Missing environment variables → Check `.env` file
- Port already in use → Check with `sudo lsof -i :3001` or `sudo lsof -i :3000`

### Issue: 502 Bad Gateway

**Causes**:
1. Backend/Frontend not running
2. Wrong port in Nginx config
3. Firewall blocking internal connections

**Debug Steps**:
```bash
# Check if apps are running
pm2 status

# Test direct connection
curl http://localhost:3000
curl http://localhost:3001/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/trivia-error.log

# Test Nginx config
sudo nginx -t
```

### Issue: WebSocket Connection Failed

**Symptoms**: Players can't join, GM can't create sessions

**Debug Steps**:
```bash
# Check backend logs for WebSocket errors
pm2 logs trivia-backend | grep -i socket

# Verify Nginx WebSocket config
sudo nginx -t
sudo grep -A 10 "socket.io" /etc/nginx/sites-available/trivia

# Test WebSocket upgrade
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: trivia.yourdomain.com" \
  -H "Origin: https://trivia.yourdomain.com" \
  https://trivia.yourdomain.com/socket.io/
```

**Common Fixes**:
- Add WebSocket upgrade headers in Nginx (see config above)
- Increase proxy timeouts for WebSocket
- Check CORS settings in backend `server.ts`

### Issue: SSL Certificate Issues

**Check Certificate Status**:
```bash
sudo certbot certificates
```

**Renew Certificate Manually**:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**Certificate Not Auto-Renewing**:
```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Enable if disabled
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Issue: High Memory Usage

**Check Memory**:
```bash
free -h
pm2 status
```

**Increase Swap (if needed)**:
```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Restart Apps with Memory Limits**:
- Already configured in `ecosystem.config.js`:
  - Backend: 500MB max
  - Frontend: 1GB max

### Issue: Database/Session Loss on Restart

**Note**: This app uses in-memory storage, so sessions are lost on restart. This is expected behavior.

**For Production**:
Consider implementing Redis or database persistence if session persistence is required across restarts.

---

## Security Checklist

- [ ] Changed default GM password in `.env`
- [ ] UFW firewall enabled and configured
- [ ] SSH key-based authentication (disable password auth)
- [ ] Non-root user for running applications
- [ ] SSL/TLS certificate installed and auto-renewal configured
- [ ] Security headers in Nginx config
- [ ] Regular system updates: `sudo apt update && sudo apt upgrade`
- [ ] Monitor PM2 logs for suspicious activity
- [ ] Strong passwords for all services
- [ ] Backup `.env` file securely (not in git)

---

## Performance Optimization

### 1. Enable Gzip Compression in Nginx

Add to your Nginx config inside `server` block:

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
```

### 2. Frontend Caching

Add to Nginx config for static assets:

```nginx
# Static assets caching (inside server block)
location /_next/static {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, max-age=3600, immutable";
}
```

### 3. PM2 Cluster Mode (Optional)

For frontend only (Next.js supports clustering):

```javascript
// In ecosystem.config.js, change trivia-frontend:
{
  name: 'trivia-frontend',
  cwd: './frontend',
  script: 'npm',
  args: 'start',
  instances: 'max',  // Use all CPU cores
  exec_mode: 'cluster',  // Cluster mode
  // ... rest of config
}
```

---

## Backup & Restore

### Backup .env File

```bash
# Backup to secure location
cp ~/trivia-simple-app/.env ~/trivia-backup.env
chmod 600 ~/trivia-backup.env

# Or copy to local machine
scp ubuntu@your-vm-ip:/home/trivia/trivia-simple-app/.env ./trivia-backup.env
```

### Backup PM2 Configuration

```bash
# PM2 config is saved automatically when you run:
pm2 save

# Backup file location:
~/.pm2/dump.pm2
```

### Restore After VM Failure

```bash
# On new VM, after setup:
cd ~/trivia-simple-app

# Restore .env file
cp ~/trivia-backup.env .env

# Follow deployment steps:
npm install
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Quick Reference Commands

```bash
# Application Management
pm2 status                    # Check app status
pm2 logs                      # View logs
pm2 restart all              # Restart all apps
pm2 stop all                 # Stop all apps
pm2 delete all               # Remove all apps

# Nginx Management
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/trivia-error.log  # View logs

# System Management
sudo systemctl status nginx   # Nginx status
sudo systemctl status certbot.timer  # SSL renewal timer
df -h                        # Disk usage
free -h                      # Memory usage
top                          # Resource monitor

# Application Updates
cd ~/trivia-simple-app
git pull
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all
```

---

**Congratulations!** Your Trivia Buzzer App is now running on a Cloud VM with both frontend and backend on the same machine, secured with SSL, and managed by PM2.

For questions or issues, check the [main README](../README.md) or [CLAUDE.md](../CLAUDE.md).
