# 企智通 QZT - 5分钟快速部署指南

> 适合人群：第一次部署服务器的开发者
> 预计时间：5-10 分钟

---

## 第一步：检查前置条件

在开始之前，请确保你准备好了：

- [ ] **云服务器**（ECS）：至少 2C4G 配置
- [ ] **数据库**：MySQL 8.0（可以使用云 RDS 或本地安装）
- [ ] **域名**（可选）：如果需要 HTTPS，需要已备案的域名
- [ ] **服务器登录**：知道服务器的 IP 地址和 root 密码

### 什么情况下可以跳过某些准备？

| 需求 | 测试环境 | 生产环境 |
|------|----------|----------|
| 域名 | 不需要（用 IP 访问） | 需要 |
| HTTPS | 不需要 | 强烈建议 |
| RDS | 不需要（用本地 MySQL） | 推荐 |

---

## 第二步：登录服务器

打开终端（Terminal）或 PowerShell，执行：

```bash
ssh root@你的服务器IP
# 示例：ssh root@123.45.67.89
```

**首次登录会提示确认**，输入 `yes` 后输入密码即可。

---

## 第三步：一键部署

**复制粘贴以下命令**，按回车执行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh)
```

脚本会自动执行以下步骤：

1. 安装必要软件（Git、Docker 等）
2. 下载项目代码
3. 询问几个简单问题
4. 构建并启动服务

### 问答环节说明

脚本会问你一些问题，以下是常见问题的回答示例：

```
请选择部署方式：
  1) 裸机部署
  2) Docker 部署 (推荐)
请选择 (1/2):
→ 输入 2（Docker 更简单）

请选择数据库配置方式：
  1) 使用阿里云 RDS MySQL（推荐）
  2) 使用本地 MySQL 容器
请选择 (1-2):
→ 有 RDS 输入 1，没有输入 2

RDS 地址:
→ 输入你的 RDS 地址，如 rm-xxxxx.mysql.rds.aliyuncs.com

请选择 SSL 证书方式：
  1) 不启用 HTTPS - 仅 HTTP（开发测试）
  2) 自签名证书
  3) 上传证书
  4) Let's Encrypt
请选择 (1-4) [默认: 1]:
→ 测试环境输入 1，生产环境输入 4
```

---

## 第四步：验证部署

部署完成后，脚本会显示访问地址。验证是否成功：

### 方法一：浏览器访问

```
前端页面:     http://你的服务器IP
管理后台:     http://你的服务器IP:端口
```

如果能看到网页（不是错误页面），说明部署成功！

### 方法二：命令行检查

在服务器上执行：

```bash
# 检查服务状态
docker compose -f scripts/deploy/docker-compose.yml ps

# 应该看到所有服务都是 "Up" 状态
```

正常输出示例：

```
NAME           STATUS          PORTS
qzt-backend    Up 30 seconds   0.0.0.0:7890->7890/tcp
qzt-frontend   Up 30 seconds   0.0.0.0:80->80/tcp
qzt-website    Up 30 seconds   0.0.0.0:5180->5180/tcp
qzt-mysql      Up 30 seconds   0.0.0.0:3306->3306/tcp
qzt-redis      Up 30 seconds   0.0.0.0:6379->6379/tcp
```

---

## 常见问题快速解决

### 问题 1：端口被占用

**错误信息**：`bind: address already in use`

**解决方法**：
```bash
# 检查哪个程序占用了端口
netstat -tlnp | grep :80
# 或
lsof -i :80

# 停止占用端口的程序（如 Nginx）
systemctl stop nginx
```

### 问题 2：浏览器无法访问

**可能原因**：
1. 云服务器安全组未开放端口
2. 服务器防火墙未开放端口

**解决方法**：

**阿里云 ECS**：
1. 登录阿里云控制台
2. 进入 云服务器 ECS → 安全组
3. 添加入方向规则：端口 80/443，授权对象 0.0.0.0/0

**服务器防火墙**：
```bash
# 开放 HTTP 和 HTTPS 端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 问题 3：数据库连接失败

**错误信息**：`Can't connect to MySQL server`

**解决方法**（RDS 用户）：

1. 检查 RDS 白名单是否添加了服务器 IP
2. 确认 RDS 用户名和密码正确
3. 测试连接：
```bash
mysql -h 你的RDS地址 -u 用户名 -p
```

### 问题 4：内存不足

**错误信息**：`Cannot allocate memory`

**解决方法**：

你的服务器配置可能低于 2C4G 建议：

1. 升级服务器配置，或
2. 减少服务资源占用（修改 `.env` 文件中的内存限制）

---

## 下一步

部署成功后，你可能需要：

1. **配置 HTTPS**（如果使用域名）：
   ```bash
   cd /opt/qzt/qzt
   bash scripts/deploy/setup-ssl.sh
   ```

2. **查看服务日志**：
   ```bash
   docker compose -f scripts/deploy/docker-compose.yml logs -f
   ```

3. **停止/重启服务**：
   ```bash
   # 停止
   docker compose -f scripts/deploy/docker-compose.yml stop
   # 重启
   docker compose -f scripts/deploy/docker-compose.yml restart
   ```

---

## 需要帮助？

如果遇到问题，请查看：
- [详细部署指南](./README.md)
- [故障排查手册](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/Gyv12345/qzt/issues)
