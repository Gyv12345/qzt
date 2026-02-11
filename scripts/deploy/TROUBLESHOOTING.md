# 企智通 QZT - 故障排查手册

> 遇到问题时，先查看这里。80% 的常见问题都能在这里找到答案。

---

## 快速诊断

### 第一步：检查服务状态

```bash
# Docker 部署
docker compose -f scripts/deploy/docker-compose.yml ps

# 裸机部署
pm2 status
```

**期望结果**：所有服务显示 `Up` 或 `online`

### 第二步：查看错误日志

```bash
# Docker 部署 - 查看所有服务日志
docker compose -f scripts/deploy/docker-compose.yml logs

# Docker 部署 - 查看特定服务
docker compose -f scripts/deploy/docker-compose.yml logs backend
docker compose -f scripts/deploy/docker-compose.yml logs frontend

# 裸机部署
pm2 logs qzt-backend --lines 100
pm2 logs qzt-website --lines 100
```

---

## 问题分类索引

- [启动问题](#启动问题)
- [网络连接问题](#网络连接问题)
- [数据库问题](#数据库问题)
- [SSL/证书问题](#ssl证书问题)
- [内存和性能问题](#内存和性能问题)
- [PM2 问题](#pm2-问题)

---

## 启动问题

### 问题：容器启动失败

**错误信息**：
```
Error: Cannot start service backend: ...
```

**可能原因和解决方案**：

| 原因 | 检查方法 | 解决方案 |
|------|----------|----------|
| 端口被占用 | `netstat -tlnp \| grep 7890` | 停止占用端口的程序 |
| 内存不足 | `free -h` | 升级服务器或减少内存限制 |
| 镜像构建失败 | `docker images \| grep qzt` | 重新构建镜像 |
| 配置文件错误 | `cat .env` | 检查环境变量格式 |

**端口被占用解决方法**：

```bash
# 查看哪个程序占用了端口
lsof -i :7890

# 停止占用端口的程序（以 Nginx 为例）
systemctl stop nginx
```

---

### 问题：服务一直重启

**错误信息**：
```
Status: Restarting (1/5)
```

**解决方案**：

1. 查看详细日志找出原因
```bash
docker compose -f scripts/deploy/docker-compose.yml logs backend --tail 50
```

2. 常见原因：
   - **数据库连接失败**：检查 `.env` 中的数据库配置
   - **环境变量错误**：检查必需的环境变量是否设置
   - **内存溢出**：增加内存限制或升级服务器

---

## 网络连接问题

### 问题：浏览器无法访问

**症状**：访问 `http://服务器IP` 显示"无法访问此网站"

**检查步骤**：

#### 1. 确认服务在运行

```bash
docker compose -f scripts/deploy/docker-compose.yml ps
```

如果服务未运行，执行：
```bash
docker compose -f scripts/deploy/docker-compose.yml up -d
```

#### 2. 确认端口监听

```bash
netstat -tlnp | grep :80
# 应该看到类似：tcp  0  0  0.0.0.0:80  LISTEN  xxxxx/nginx
```

#### 3. 检查云服务器安全组

**阿里云 ECS**：
1. 登录阿里云控制台
2. ECS → 实例 → 安全组
3. 确认已开放 80 和 443 端口

**腾讯云 CVM**：
1. 登录腾讯云控制台
2. 云服务器 → 安全组 → 修改规则
3. 添加入站规则：TCP:80, TCP:443

#### 4. 检查服务器防火墙

```bash
# CentOS/AlmaLinux
firewall-cmd --list-ports

# 如果没有 80 和 443，添加：
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

---

### 问题：API 请求失败

**症状**：前端页面能打开，但功能报错 "Network Error"

**检查步骤**：

#### 1. 测试 API 端口

```bash
curl http://localhost:7890/api/health
# 或
curl http://服务器IP:7890/api/health
```

#### 2. 检查 Nginx 配置

```bash
# 测试配置文件语法
nginx -t

# 如果有错误，查看配置
cat /etc/nginx/conf.d/qzt.conf
```

---

### 问题：DNS 解析不生效

**症状**：域名配置后无法访问，但 IP 可以

**检查步骤**：

```bash
# 本地检查 DNS
nslookup yourdomain.com
nslookup admin.yourdomain.com

# 检查是否指向正确的 IP
dig yourdomain.com +short
```

**DNS 生效时间**：通常需要 5-30 分钟，最长 48 小时。

---

## 数据库问题

### 问题：数据库连接被拒绝

**错误信息**：
```
Error: connect ECONNREFUSED 数据库地址:3306
```

**解决方案**：

#### 1. 检查数据库是否运行

```bash
# Docker MySQL
docker ps | grep mysql

# 本地 MySQL
systemctl status mysqld  # CentOS
systemctl status mysql   # Ubuntu
```

#### 2. RDS 用户检查白名单

**阿里云 RDS**：
1. 进入 RDS 实例 → 数据安全性
2. 白名单设置 → 查看是否包含服务器 IP
3. 如果没有，点击"修改"添加：
   - 固定 IP：`你的服务器IP/32`
   - ECS 同账号：选择安全组

#### 3. 测试数据库连接

```bash
# 从服务器测试
mysql -h 数据库地址 -u 用户名 -p -P 3306

# 如果能连接，问题在应用配置
# 如果不能连接，问题在网络或数据库配置
```

#### 4. 检查连接字符串

```bash
# 查看 .env 文件
cat /opt/qzt/qzt/backend/.env | grep DB_

# 正确格式示例
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USERNAME=qzt_user
DB_PASSWORD=你的密码
DB_DATABASE=qzt_db
```

---

### 问题：数据库连接数超限

**错误信息**：
```
Error: Too many connections
```

**原因**：RDS 连接数已达上限

**解决方案**：

1. 查看当前活跃连接（RDS 控制台）
2. 调整 Prisma 连接池大小：

在 `.env` 的 `DATABASE_URL` 中添加参数：
```
DATABASE_URL="mysql://user:pass@host:3306/dbname?connection_limit=10&pool_timeout=20"
```

3. 升级 RDS 规格（增加连接数限制）

---

### 问题：数据库初始化失败

**错误信息**：
```
Error: Database migration failed
```

**解决方案**：

```bash
# 手动运行数据库迁移
cd /opt/qzt/qzt/backend

# 生成 Prisma Client
pnpm prisma generate

# 同步数据库结构
pnpm prisma db push

# 如果提示需要创建数据库
# 先在 RDS 控制台创建数据库，然后重试
```

---

## SSL/证书问题

### 问题：自签名证书警告

**症状**：浏览器显示"不安全"或"您的连接不是私密连接"

**说明**：这是**正常的**，自签名证书仅供测试使用。

**解决方案**：

1. 测试环境：点击"高级" → "继续访问"
2. 生产环境：使用 Let's Encrypt 免费证书或购买证书

---

### 问题：Let's Encrypt 证书申请失败

**错误信息**：
```
Challenge failed for domain xxx.com
```

**常见原因和解决方案**：

| 原因 | 解决方案 |
|------|----------|
| 域名未解析到服务器 | 检查 DNS A 记录是否正确 |
| 80 端口未开放 | 检查安全组和防火墙 |
| 验证方式错误 | 泛域名证书必须用 DNS 验证 |

**DNS 验证失败**：

泛域名证书需要手动添加 TXT 记录：

1. 登录 DNS 服务商控制台
2. 添加 TXT 记录：
   - 主机记录：`_acme-challenge`
   - 记录值：certbot 显示的值
3. 等待 DNS 生效后重新申请

---

### 问题：证书过期

**症状**：浏览器显示证书已过期

**解决方案**：

```bash
# 手动续期
certbot renew --force-renewal

# 重启服务
docker compose -f scripts/deploy/docker-compose.yml restart frontend
# 或
systemctl reload nginx
```

**检查自动续期**：

```bash
crontab -l | grep certbot
# 应该看到类似：0 0,12 * * * certbot renew ...
```

---

## 内存和性能问题

### 问题：内存溢出 (OOM)

**错误信息**：
```
Error: Cannot allocate memory
# 或
容器/进程不断重启
```

**检查内存使用**：

```bash
free -h
docker stats  # Docker 部署
pm2 monit   # 裸机部署
```

**解决方案**：

1. **减少服务内存限制**（编辑 `.env`）：
```bash
BACKEND_MEM_LIMIT=512m   # 减少从 1g 到 512m
FRONTEND_MEM_LIMIT=128m
```

2. **增加服务器内存**：升级到更高配置

3. **禁用不必要的服务**：
```bash
# 停止 website 服务（如果不需要）
docker compose -f scripts/deploy/docker-compose.yml stop website
```

---

### 问题：CPU 使用率过高

**检查 CPU 使用**：

```bash
top
# 或
docker stats --no-stream
```

**可能原因**：
- PM2 实例数过多（超过 CPU 核心数）
- 数据库查询未优化
- 日志写入频繁

---

## PM2 问题

### 问题：PM2 服务未自动启动

**症状**：重启服务器后 PM2 服务未运行

**解决方案**：

```bash
# 保存当前 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup

# 按提示执行输出的命令，类似：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

### 问题：PM2 监控显示乱码

**解决方案**：

```bash
# 使用日志代替监控
pm2 logs qzt-backend

# 或使用 JSON 格式
pm2 jlist
```

---

## 获取更多诊断信息

### 收集完整诊断日志

```bash
# 创建诊断信息文件
cat > /tmp/qzt-diag.txt << EOF
=== 系统信息 ===
$(uname -a)

=== 内存/CPU ===
$(free -h)
$(uptime)

=== 磁盘 ===
$(df -h)

=== Docker 状态 ===
$(docker ps -a)

=== PM2 状态 ===
$(pm2 status 2>/dev/null || echo "PM2 未安装")

=== 最近的错误日志 ===
$(journalctl -xe --no-pager | tail -20)
EOF

cat /tmp/qzt-diag.txt
```

### 提交问题时附上

1. **错误日志**：完整的错误信息
2. **环境信息**：操作系统、部署方式（Docker/裸机）
3. **复现步骤**：如何触发问题
4. **已尝试的解决方法**

---

## 紧急回滚

如果部署后出现严重问题，快速回滚：

### Docker 部署回滚

```bash
# 停止所有服务
docker compose -f scripts/deploy/docker-compose.yml down

# 查看历史镜像
docker images | grep qzt

# 使用旧版本重新启动（需要知道旧镜像 ID）
docker compose -f scripts/deploy/docker-compose.yml up -d
```

### 裸机部署回滚

```bash
# PM2 重载旧版本
cd /opt/qzt/qzt/backend
git log --oneline -5  # 查看最近的提交
git checkout <旧版本commit>
pm2 restart qzt-backend
```

---

## 联系支持

如果以上方法都无法解决问题：

1. [查看完整部署文档](./README.md)
2. [GitHub Issues](https://github.com/Gyv12345/qzt/issues)
3. 提供诊断信息以便快速定位问题
