# 部署指南 — 裸机单机部署

## 架构

```
                    ┌──────────────────────────────────┐
                    │           互联网用户               │
                    └──────────────┬───────────────────┘
                                   │ HTTPS 443
                          ┌────────▼────────┐
                          │     Nginx       │  SSL 终止 + 反代 + 日志
                          │  (泛域名证书)     │
                          └────────┬────────┘
                                   │ HTTP 127.0.0.1:9000
                    ┌──────────────▼──────────────────┐
                    │         Go 服务(qzt-server)      │
                    │  systemd 管理 / run.sh 管理       │
                    └──────┬──────────────┬───────────┘
                           │              │
              ┌────────────▼──┐    ┌──────▼──────┐
              │  Redis(本机)   │    │  RDS(独立)   │
              │  缓存/会话/限流  │    │  MySQL 数据库 │
              └───────────────┘    └─────────────┘
```

**所有组件在一台机器上,数据库用独立 RDS。**

---

## 文件清单

```
deploy/
├── run.sh                     # 启停脚本(开发+生产通用)
├── nginx/qzt.conf             # Nginx 反代配置
├── ssl/acme.sh                # ACME 泛域名证书申请
├── systemd/qzt-server.service # systemd 服务文件
├── logrotate.d/qzt-server     # 日志轮转配置
└── README.md                  # 本文件

config/config.prod.yaml        # 生产环境配置
```

---

## 日志规划

| 日志 | 路径 | 轮转 | 保留 |
|------|------|------|------|
| Go 业务日志 | `logs/qzt.log` | xlogger rotatelogs 按天 | 30天 |
| Go 访问日志 | `logs/access.log` | xlogger rotatelogs 按天 | 7天 |
| Go stdout | `logs/stdout.log` | logrotate 按天/100M | 30天 |
| Nginx access | `/var/log/nginx/qzt.access.log` | logrotate 按天/200M | 30天 |
| Nginx error | `/var/log/nginx/qzt.error.log` | logrotate 按天 | 30天 |

生产环境 `config.prod.yaml` 日志编码设为 `json`(便于 ELK/Loki 采集)。

---

## 首次部署(服务器初始化)

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
apt update && apt install -y nginx redis-server build-essential
systemctl enable nginx redis-server
systemctl start redis-server

# CentOS/RHEL
yum install -y nginx redis gcc
systemctl enable nginx redis
systemctl start redis
```

### 2. 安装 Go(如需在服务器编译)

```bash
# 如在本地交叉编译后上传二进制,可跳过此步
wget https://go.dev/dl/go1.25.4.linux-arm64.tar.gz  # 按实际 CPU 架构选
tar -C /usr/local -xzf go1.25.4.linux-arm64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
source /etc/profile
```

### 3. 申请泛域名 SSL 证书

```bash
# 安装 acme.sh 并申请证书(DNS 验证,以 Cloudflare 为例)
export CF_Token="你的CF_API_TOKEN"
export CF_Zone_ID="你的ZONE_ID"

cd /opt/qzt-server
./deploy/ssl/acme.sh install
# 脚本会:
#   1. 安装 acme.sh
#   2. 申请 *.yourdomain.com 泛域名证书
#   3. 安装证书到 /etc/nginx/ssl/
#   4. 自动设置续期 cron(acme.sh 默认每天检查)
```

> **DNS 提供商**:Cloudflare 用 `dns_cf`,阿里云DNS 用 `dns_ali`(需 `Ali_Key`/`Ali_Secret`),DNSPod 用 `dns_dp`。
> 修改 `deploy/ssl/acme.sh` 里的 `DOMAIN` 和 `DNS_PROVIDER`。

### 4. 配置 Nginx

```bash
# 修改配置中的 YOUR_DOMAIN
sed -i 's/YOUR_DOMAIN/example.com/g' deploy/nginx/qzt.conf

# 拷贝到 Nginx 配置目录
cp deploy/nginx/qzt.conf /etc/nginx/conf.d/
nginx -t && systemctl reload nginx
```

### 5. 配置日志轮转

```bash
cp deploy/logrotate.d/qzt-server /etc/logrotate.d/
logrotate -d /etc/logrotate.d/qzt-server   # 测试(dry run)
```

### 6. 部署 Go 服务

```bash
# 创建工作目录
mkdir -p /opt/qzt-server && cd /opt/qzt-server

# 方式 A: 本地编译后上传二进制 + config + .env
# scp 到服务器后:
#   /opt/qzt-server/bin/qzt-server  (二进制)
#   /opt/qzt-server/config/         (配置文件)
#   /opt/qzt-server/.env            (环境变量)

# 方式 B: git clone 后在服务器编译
git clone <repo> /opt/qzt-server && cd /opt/qzt-server

# 配置环境变量
cp .env.example .env
vim .env  # 填入 MYSQL_DSN / REDIS_PASSWORD / JWT_SECRET 等

# 编译
APP_ENV=prod ./deploy/run.sh build
# 或 make build

# 启动(二选一)
# ── 方式 1: run.sh 管理(简单,推荐开发/测试)──
APP_ENV=prod ./deploy/run.sh start

# ── 方式 2: systemd 管理(生产推荐,开机自启+崩溃重启)──
cp deploy/systemd/qzt-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable qzt-server
systemctl start qzt-server
```

---

## 日常运维

### 更新代码

```bash
cd /opt/qzt-server
git pull
make build                    # 或 ./deploy/run.sh build

# systemd 方式:
systemctl restart qzt-server

# run.sh 方式:
./deploy/run.sh restart
```

### 查看状态

```bash
# systemd 方式
systemctl status qzt-server
journalctl -u qzt-server -f          # 实时日志

# run.sh 方式
./deploy/run.sh status
./deploy/run.sh logs                  # tail -f stdout.log
```

### 查看业务日志

```bash
tail -f /opt/qzt-server/logs/qzt.log       # 业务日志(JSON)
tail -f /opt/qzt-server/logs/access.log    # 访问日志(JSON)
tail -f /opt/qzt-server/logs/stdout.log    # stdout(启动日志)
```

### 证书续期

```bash
# acme.sh 自动续期(默认已安装 cron),手动续期:
./deploy/ssl/acme.sh renew
```

---

## run.sh 用法(开发 + 生产通用)

```bash
./deploy/run.sh start     # 后台启动(PID 文件管理)
./deploy/run.sh stop      # 优雅停止(SIGTERM,15s 超时后 SIGKILL)
./deploy/run.sh restart   # stop + start
./deploy/run.sh status    # 查看运行状态
./deploy/run.sh build     # 编译到 bin/qzt-server
./deploy/run.sh logs      # tail -f stdout.log
```

> 开发时: `./deploy/run.sh start` 即可,不再需要手动 `pkill && sleep && go run`。
> 生产时: 推荐用 systemd(崩溃自动重启 + 开机自启),run.sh 作为备用。

---

## .env 配置(生产)

```bash
# /opt/qzt-server/.env

# MySQL(阿里云 RDS)
MYSQL_DSN="user:pass@tcp(rm-xxx.mysql.rds.aliyuncs.com:3306)/qztgo?charset=utf8mb4&parseTime=true&loc=Local&timeout=3s"

# Redis(本机)
REDIS_PASSWORD="你的Redis密码"

# JWT 密钥(生产环境务必修改)
JWT_SECRET="你的生产密钥_至少32字符"

# 存储驱动(local 或 oss)
STORAGE_DRIVER=local

# OSS 配置(如用 OSS)
# OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
# OSS_ACCESS_KEY_ID="xxx"
# OSS_ACCESS_KEY_SECRET="xxx"
# OSS_BUCKET_NAME="your-bucket"

# 环境标识
APP_ENV=prod
```

---

## 安全检查清单

- [ ] `.env` 文件权限 `chmod 600 .env`(仅 owner 可读)
- [ ] `config.prod.yaml` 中 JWT_SECRET 从环境变量注入(不写死)
- [ ] Nginx 仅监听 443,80 跳转 HTTPS
- [ ] Go 服务 `addr: 127.0.0.1`(不直接暴露,仅 Nginx 访问)
- [ ] 防火墙仅开放 22(SSH)/ 80(HTTP)/ 443(HTTPS)
- [ ] Redis 配置密码 + bind 127.0.0.1
- [ ] RDS 白名单仅允许本服务器 IP
- [ ] SSL 证书自动续期(acme.sh cron)
- [ ] 日志轮转配置已部署(logrotate)
- [ ] 定期备份 RDS(阿里云自动备份)

---

## 前端部署(admin + mobile + cms)

### 架构

```
                    ┌────────────────────────────────────┐
                    │             Nginx :443              │
                    └──┬──────────┬──────────┬───────────┘
                       │          │          │
          admin.域名    │  h5.域名  │  @.域名    │
                       │          │          │
              ┌────────▼──┐  ┌───▼────┐  ┌──▼──────────┐
              │  admin    │  │ mobile │  │ cms(Next.js) │
              │ React SPA │  │React SPA│  │   SSR       │
              │  纯静态    │  │ 纯静态  │  │  pm2:3000   │
              └─────┬─────┘  └───┬────┘  └──────┬──────┘
                    │            │              │
                    └──────┬─────┘              │
                      API 反代                  │
                    ┌─────▼─────┐               │
                    │ Go :9000  │◄──────────────┘
                    └───────────┘  (cms 内部调 API)
```

### 域名规划

| 子域名 | 项目 | 类型 | 端口 |
|--------|------|------|------|
| `@.yourdomain.com` | 企业官网(cms) | Next.js SSR | pm2:3000 |
| `admin.yourdomain.com` | 后台管理(admin) | React SPA 静态 | Nginx 直出 |
| `h5.yourdomain.com` | 移动端(mobile) | React SPA 静态 | Nginx 直出 |

### 目录规划

```
/opt/
├── qzt-server/          # Go 后端(已有)
├── qzt-admin/
│   └── dist/            # admin 构建产物
├── qzt-mobile/
│   └── dist/            # mobile 构建产物
├── qzt-cms/             # cms Next.js(含 .next + node_modules)
│   ├── .next/
│   ├── node_modules/
│   └── .env.local       # 生产环境变量
└── src/                 # 前端源码(构建用,可选)
    ├── qzt-go-admin/
    ├── qzt-go-mobile/
    └── qzt-go-cms/
```

### 首次部署

#### 1. 安装 Node.js + pnpm

```bash
# Node.js 20+(cms 的 Next.js 15 需要)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# pnpm(admin/mobile 用)
npm install -g pnpm

# pm2(管理 cms Node 进程)
npm install -g pm2
```

#### 2. 克隆 + 构建前端

```bash
mkdir -p /opt/src && cd /opt/src

# 克隆三个前端项目
git clone <admin-repo> qzt-go-admin
git clone <mobile-repo> qzt-go-mobile
git clone <cms-repo> qzt-go-cms

# 配置 cms 生产环境变量(重要!)
cat > qzt-go-cms/.env.local << 'EOF'
NEXT_PUBLIC_API_BASE=https://yourdomain.com/api
NEXT_PUBLIC_SITE_NAME=你的企业名
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
EOF

# 一键构建 + 部署
cd /opt/qzt-server
./deploy/deploy-frontend.sh all
```

#### 3. 启动 CMS(Node SSR)

```bash
# 方式 A: pm2(推荐)
cd /opt/qzt-cms
pm2 start "npm run start" --name qzt-cms
pm2 save
pm2 startup  # 开机自启

# 方式 B: systemd
cp /opt/qzt-server/deploy/systemd/qzt-cms.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable qzt-cms
systemctl start qzt-cms
```

#### 4. 配置 Nginx

```bash
# 替换域名
sed -i 's/yourdomain.com/你的实际域名/g' /opt/qzt-server/deploy/nginx/qzt.conf

# 拷贝
cp /opt/qzt-server/deploy/nginx/qzt.conf /etc/nginx/conf.d/
nginx -t && systemctl reload nginx
```

### 前端日常更新

```bash
# 更新单个项目
cd /opt/src/qzt-go-admin && git pull
cd /opt/qzt-server && ADMIN_SRC=/opt/src/qzt-go-admin ./deploy/deploy-frontend.sh build
./deploy/deploy-frontend.sh deploy   # 仅部署(不重启 cms)

# 全部更新
cd /opt/src/qzt-go-admin && git pull
cd /opt/src/qzt-go-mobile && git pull
cd /opt/src/qzt-go-cms && git pull
cd /opt/qzt-server && ./deploy/deploy-frontend.sh all
```

### CMS 环境变量(.env.local)

```bash
# /opt/qzt-cms/.env.local
NEXT_PUBLIC_API_BASE=https://yourdomain.com/api   # 后端 API 地址
NEXT_PUBLIC_SITE_NAME=你的企业名                    # 网站名称
NEXT_PUBLIC_SITE_URL=https://yourdomain.com       # 网站域名
```

> ⚠️ `NEXT_PUBLIC_*` 变量在构建时内联,修改后需重新 `npm run build`。
