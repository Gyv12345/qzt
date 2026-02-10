# 企智通 QZT - 部署指南

> 快速部署到阿里云 ECS，适合非专业人士操作

---

## 前置准备

### 需要什么

| 项目 | 要求 |
|------|------|
| **服务器** | 阿里云 ECS，2核4G，系统选 Ubuntu |
| **数据库** | 阿里云 RDS MySQL，2核2G |
| **域名** | 有域名最好，没有也能用 IP 访问 |

### 费用参考（按年）

- ECS 2C4G：约 ¥1000-1500/年
- RDS 2C2G：约 ¥500-800/年
- 域名：约 ¥50-100/年

---

## 快速部署（5 分钟）

### 第一步：初始化服务器

登录你的服务器，复制粘贴以下命令（**分两步执行**）：

```bash
# 1. 下载脚本
curl -o /tmp/init-server.sh https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh

# 2. 执行脚本（支持交互输入）
bash /tmp/init-server.sh
```

这会自动安装所有需要的东西（Node.js、Nginx、Redis 等），大约 2-3 分钟。

### 第二步：配置数据库

```bash
vim /opt/qzt/backend/.env
```

填写以下信息（**必填**）：

```bash
# === 数据库（在阿里云 RDS 控制台查看）===
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USERNAME=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_DATABASE=数据库名
DATABASE_PROVIDER=mysql

# === Redis 密码 ===
REDIS_PASSWORD=复制 /root/.redis_password 里的内容

# === JWT 密钥（生成一个随机字符串）===
JWT_SECRET=随便写一串很长的随机字符至少32位

# === 阿里云 OSS（文件上传，按需配置）===
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=在阿里云控制台获取
OSS_ACCESS_KEY_SECRET=在阿里云控制台获取
OSS_BUCKET=你的存储桶名称

# === 如果有域名 ===
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com

# === 如果没有域名，用 IP 地址 ===
DOMAIN_NAME=你的服务器IP
ADMIN_DOMAIN=你的服务器IP
```

### 第三步：配置 SSL 证书

```bash
bash /opt/qzt/scripts/deploy/setup-ssl.sh
```

**选择证书类型**：

| 选项 | 什么时候选 | 浏览器会警告吗 |
|------|-----------|--------------|
| 1 自签名 | 没有域名、只是测试 | 会，但可以点「继续访问」 |
| 2 上传证书 | 你已经有证书文件 | 不会 |
| 3 Let's Encrypt | 有域名且已解析 | 不会（免费） |

### 第四步：配置 GitHub 自动部署

1. 打开你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下内容：

| Name | 填什么 |
|------|--------|
| `SERVER_HOST` | 服务器 IP 地址 |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | 见下方说明 |
| `SSH_PORT` | `22` |

**获取 SSH 私钥**（在服务器上执行）：

```bash
cat ~/.ssh/id_ed25519
```

把显示的内容（包括开头和结尾的那几行）全部复制，粘贴到 GitHub。

### 第五步：开始部署

```bash
# 在你的电脑上，推送代码到 main 分支
git push origin main
```

或者在 GitHub：**Actions** → **Deploy to Production** → **Run workflow**

---

## 部署完成后

### 检查服务状态

```bash
pm2 status
```

正常应该看到：

```
┌────┬───────────────┬─────┬─────────┐
│ id │ name          │ mode│ status  │
├────┼───────────────┼─────┼─────────┤
│ 0  │ qzt-backend   │ cluster│ online│
│ 1  │ qzt-backend   │ cluster│ online│
│ 2  │ qzt-website   │ fork  │ online│
└────┴───────────────┴─────┴─────────┘
```

### 访问你的网站

- 有域名：`https://yourdomain.com`
- 没有域名：`https://你的服务器IP`

如果浏览器提示「不安全」，点击「高级」→「继续访问」即可（自签名证书）。

---

## 常见问题

### Q: 怎么看日志？

```bash
pm2 logs
```

### Q: 服务没起来？

```bash
# 1. 检查配置是否填对
cat /opt/qzt/backend/.env

# 2. 查看错误信息
pm2 logs qzt-backend --lines 50
```

### Q: 数据库连不上？

1. 检查 RDS 白名单是否添加了服务器 IP
2. 在阿里云 RDS 控制台 → 数据安全性 → 白名单设置
3. 添加服务器的公网 IP

### Q: 怎么重启服务？

```bash
pm2 restart all
```

### Q: 怎么回滚到之前的版本？

```bash
ls -la /opt/qzt-backup/
# 找到一个之前的备份，比如 20250110_120000

# 恢复后端
cp -r /opt/qzt-backup/20250110_120000/dist /opt/qzt/backend/
pm2 restart qzt-backend
```

---

## 日常维护

### 更新代码

只需要推送代码，自动部署：

```bash
git push origin main
```

### 备份数据库

```bash
# 导出数据库
mysqldump -h 你的RDS地址 -u 用户名 -p 数据库名 > backup.sql

# 导入数据库
mysql -h 你的RDS地址 -u 用户名 -p 数据库名 < backup.sql
```

### 查看服务器资源

```bash
# 内存使用
free -h

# 磁盘使用
df -h

# CPU 使用
top
```

---

## 获取帮助

如果遇到问题：

1. 查看 [部署验证指南](../DEPLOYMENT_VERIFY.md)
2. 检查日志：`pm2 logs`
3. 联系技术支持
