# QZT Bare-Metal Deployment Guide

## Deployment Architecture

- **ECS**: 2C4G (Alibaba Cloud ECS)
- **RDS**: MySQL 8.0, 2C2G, max connections 1000
- **Services**: Backend (NestJS + PM2), Frontend (Nginx), Website (Next.js + PM2)

---

## Resource Allocation

| Service | Memory Limit | Description |
|---------|--------------|-------------|
| **Backend** | 700MB × 2 = 1.4GB | PM2 cluster 2 instances |
| **Website** | 500MB | Next.js SSR |
| **Frontend** | ~50MB | Nginx static hosting |
| **System Reserved** | ~1.5GB | OS + Nginx + buffer |
| **Total** | ~3.4GB / 4GB | With headroom |

**Database Connection Allocation**:
- Backend: 40 connections (2 instances × 20)
- Remaining: 960 connections (RDS total 1000)

---

## Quick Deployment

### 1. Server Initialization (Run Once)

```bash
# One-click install dependencies (Ubuntu/Debian/CentOS/RHEL)
curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh | bash
```

**The initialization script will**:
- Install Node.js 20, pnpm, PM2
- Install Redis, Nginx
- Configure firewall
- Create directory structure `/opt/qzt/{backend,frontend,website}`
- Generate SSH keys
- **Auto-generate Redis password** (saved to `/root/.redis_password`)
- **Auto-generate JWT secret key**
- Create environment file `/opt/qzt/backend/.env`

### 2. Configure Environment Variables

```bash
ssh root@your-server-ip
vim /opt/qzt/backend/.env
```

**Required Configuration** (only modify database and domain):
```bash
# === Database (2C2G RDS) ===
DATABASE_PROVIDER=mysql
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com  # Change to your RDS address
DB_PORT=3306
DB_USERNAME=your_db_username            # Change to your username
DB_PASSWORD=your_db_password            # Change to your password
DB_DATABASE=database_name                # Database name (auto-created on first run)

# === Redis (auto-generated, no change needed) ===
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=auto-generated-password

# === JWT (auto-generated, no change needed) ===
JWT_SECRET=auto-generated-secret-key

# === Domain ===
DOMAIN_NAME=yourdomain.com               # Change to your domain
ADMIN_DOMAIN=admin.yourdomain.com        # Change to admin.yourdomain.com
```

**Configuration Reference**:
| Config | Auto-generated | Description |
|--------|----------------|-------------|
| `DB_DATABASE` | ❌ | Database name, **auto-created** on first run (ensure user has CREATE permission) |
| `REDIS_PASSWORD` | ✅ | Auto-generated, saved in `/root/.redis_password` |
| `JWT_SECRET` | ✅ | Auto-generated, used for JWT token signing |
| `DOMAIN_NAME` | ❌ | Your main domain |
| `ADMIN_DOMAIN` | ❌ | Your admin panel domain |

**How to change passwords**:
```bash
# Change Redis password
echo "new-password" > /root/.redis_password
# Then update REDIS_PASSWORD in .env

# Regenerate JWT secret
openssl rand -hex 32
# Update JWT_SECRET in .env with the result
```

### 3. Configure GitHub Actions (Automated Deployment)

In repository **Settings → Secrets and variables → Actions**, add:

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Server IP |
| `SERVER_USER` | Username (usually root) |
| `SSH_PRIVATE_KEY` | Server private key (`cat ~/.ssh/id_rsa`) |
| `SSH_PORT` | SSH port (default 22) |

### 4. Trigger Deployment

```bash
git push origin main
```

GitHub Actions will automatically:
1. Build Backend, Frontend, Website
2. Upload to server via SSH
3. Restart PM2 services
4. Reload Nginx

---

## Manual Deployment

If GitHub Actions is unavailable, deploy manually:

### Backend

```bash
# On server
cd /opt/qzt/backend
pnpm install --prod
pnpm prisma generate
pnpm prisma db push  # First time only
pm2 start pm2.config.cjs
pm2 save
```

### Frontend

```bash
# Build locally
cd frontend
pnpm build
scp -r dist/* root@server:/var/www/qzt/

# Nginx is already configured, no additional action needed
```

### Website

```bash
# On server
cd /opt/qzt/website
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Verification Steps

### 1. Check Service Status

```bash
# PM2 status
pm2 status
pm2 monit

# Expected output:
# ┌─────┬─────────────┬───────────┬─────────┐
# │ id  │ name        │ status    │ memory  │
# ├─────┼─────────────┼───────────┼─────────┤
# │ 0   │ qzt-backend │ online    │ 650MB   │
# │ 1   │ qzt-backend │ online    │ 640MB   │
# │ 2   │ qzt-website │ online    │ 420MB   │
# └─────┴─────────────┴───────────┴─────────┘
```

### 2. Health Check

```bash
# Backend health check
curl http://localhost:7890/health

# Website
curl http://localhost:5180

# Nginx
curl http://localhost
```

### 3. Database Connection Count

Check current connections in RDS console, should be **under 40**.

---

## PM2 Configuration Explained

### Backend (`backend/pm2.config.cjs`)

```javascript
{
  instances: 2,              // 2 instances for 2C4G
  max_memory_restart: '700M', // 2 × 700MB = 1.4GB
  env: {
    NODE_OPTIONS: '--max-old-space-size=640', // Heap memory limit
  },
  cron_restart: '0 3 * * *', // Restart daily at 3 AM
}
```

### Website (`website/ecosystem.config.cjs`)

```javascript
{
  instances: 1,              // SSR not suitable for multiple instances
  max_memory_restart: '500M',
  env: {
    NODE_OPTIONS: '--max-old-space-size=448',
  },
  cron_restart: '0 3 * * *',
}
```

---

## Prisma Connection Pool Configuration

Optimized for **2C2G RDS** (max connections 1000):

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")

  // 2 PM2 instances × 20 = 40 total connections
  connection_limit = 20
  pool_timeout      = 30
}
```

---

## Log Management

```bash
# View real-time logs
pm2 logs qzt-backend
pm2 logs qzt-website

# Log file locations
backend/logs/pm2-error.log
backend/logs/pm2-out.log
website/logs/pm2-error.log
website/logs/pm2-out.log

# Log rotation: 10MB per file
```

---

## Common Issues

### 1. PM2 Services Not Auto-Restarting

```bash
# Save PM2 process list
pm2 save

# Enable startup on boot
pm2 startup
# Follow the prompts to execute the generated command
```

### 2. Memory Overflow (OOM)

```bash
# Check memory usage
free -h

# If continuous OOM, reduce max_memory_restart
# backend: 700M → 600M
# website: 500M → 400M
```

### 3. Too Many Database Connections

```bash
# Check current connection count
# View in RDS console

# To reduce connections, modify schema.prisma connection_limit
# Regenerate Prisma Client
cd backend && pnpm prisma generate
pm2 restart qzt-backend
```

### 4. Nginx 502 Error

```bash
# Check if Backend is running
pm2 status qzt-backend

# Check port listening
netstat -tlnp | grep 7890

# View Nginx error logs
tail -f /var/log/nginx/error.log
```

---

## Performance Monitoring

### Recommended Tools

- **PM2 Plus**: https://app.keymetrics.io/
- **Alibaba Cloud Monitor**: ECS + RDS monitoring dashboard
- **Grafana + Prometheus**: Self-hosted monitoring

### Monitoring Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| CPU Usage | > 80% |
| Memory Usage | > 85% |
| RDS Connections | > 50 |
| API Response Time | > 1s |

---

## Deep Optimization (Optional)

Current configuration meets basic 2C4G + 2C2G RDS needs. For further optimization:

### 1. Increase PM2 Instances

If CPU utilization is low (< 50%):
```javascript
// backend/pm2.config.cjs
instances: 4,  // Increase from 2 to 4
```

### 2. Enable Redis Cache

```bash
# .env already configured for Redis, ensure enabled
REDIS_ENABLED=true
```

### 3. Log Aggregation

Use Alibaba Cloud SLS to collect logs:
```bash
# Install Logtail
# Configure log paths: /opt/qzt/*/logs/*.log
```

### 4. CDN Acceleration

Static assets (Frontend build) can be served via CDN.

---

## Backup Strategy

### Database Backup

- RDS automatic backup: Enabled by default, 7-day retention
- Manual backup: Create snapshot in RDS console

### File Backup

```bash
# Backup environment variables
cp /opt/qzt/backend/.env /opt/qzt-backup/.env.$(date +%Y%m%d)

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 /opt/qzt-backup/dump.pm2.$(date +%Y%m%d)
```

---

## Upgrade Deployment

```bash
# Method 1: GitHub Actions (recommended)
git push origin main

# Method 2: Manual upgrade
cd /opt/qzt/backend
git pull
pnpm install --prod
pnpm prisma generate
pm2 restart qzt-backend

cd /opt/qzt/website
git pull
pnpm build
pm2 restart qzt-website
```

---

## Failure Recovery

### Backend Crash

```bash
# View crash logs
pm2 logs qzt-backend --lines 100

# Restart
pm2 restart qzt-backend

# If continuous crashes, check memory
pm2 monit
```

### RDS Connection Failure

```bash
# Test connection
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p

# Check security group whitelist
# Ensure server IP is in RDS whitelist
```

---

## Security Recommendations

1. **Regular System Updates**: `yum update -y` or `apt-get update -y`
2. **Configure fail2ban**: Prevent SSH brute force attacks
3. **Use Strong Passwords**: Database, Redis, JWT keys
4. **Enable HTTPS**: Configure SSL certificate (Let's Encrypt or purchase)
5. **Limit SSH Access**: Key-only authentication, whitelist specific IPs

---

## Contact Support

For deployment issues, please check:
1. GitHub Actions run logs
2. PM2 logs: `pm2 logs`
3. Nginx logs: `/var/log/nginx/error.log`
