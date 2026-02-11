# 企智通 QZT - 部署前置条件详解

> 在开始部署前，请确保满足以下所有条件

---

## 一、服务器要求

### 1.1 操作系统

支持的 Linux 发行版：

| 发行版 | 版本要求 | 说明 |
|--------|----------|------|
| Ubuntu | 18.04+ | 推荐 20.04 或 22.04 LTS |
| Debian | 10+ | 稳定版 |
| CentOS | 7+ | 需要额外 EPEL 源 |
| AlmaLinux/Rocky | 8+ | CentOS 替代品 |
| Alibaba Cloud Linux | 2/3 | 阿里云 ECS 默认系统 |
| Fedora | 最新版 | 支持 |

**不支持的系统**：
- Windows Server（需使用 WSL2 或虚拟机）
- macOS（仅开发环境，不建议生产部署）

### 1.2 硬件配置

| 组件 | 最低配置 | 推荐配置 | 说明 |
|------|----------|----------|------|
| CPU | 1 核 | 2 核+ | 多核可运行更多服务实例 |
| 内存 | 2GB | 4GB+ | 包含系统开销 |
| 硬盘 | 20GB | 40GB+ | Docker 镜像和日志占用空间 |
| 网络 | 1Mbps | 5Mbps+ | 影响访问速度 |

### 1.3 权限要求

- 需要 **root 权限**或 **sudo 权限**
- 能够通过 SSH 登录服务器

---

## 二、网络要求

### 2.1 需要开放的端口

| 端口 | 协议 | 用途 | 是否必需 |
|------|------|------|----------|
| 22 | TCP | SSH 登录 | 是 |
| 80 | TCP | HTTP 访问 | 是 |
| 443 | TCP | HTTPS 访问 | 可选（HTTPS 需要） |
| 7890 | TCP | API 接口 | 内网，可不开 |
| 5180 | TCP | 网站服务 | 内网，可不开 |

### 2.2 云服务器安全组配置

**阿里云 ECS 配置步骤**：

1. 登录阿里云控制台
2. 进入 **云服务器 ECS** → **实例与镜像** → **实例**
3. 找到你的实例，点击 **更多** → **网络和安全组** → **安全组配置**
4. 点击 **配置规则** → **手动添加**

添加以下规则：

| 协议类型 | 端口范围 | 授权对象 | 描述 |
|----------|----------|----------|------|
| TCP | 80/80 | 0.0.0.0/0 | HTTP 访问 |
| TCP | 443/443 | 0.0.0.0/0 | HTTPS 访问 |
| TCP | 22/22 | 0.0.0.0/0 | SSH 登录（建议限制为你的 IP） |

### 2.3 服务器防火墙配置

检查防火墙状态：

```bash
# CentOS/RHEL/AlmaLinux
firewall-cmd --list-all

# Ubuntu/Debian
ufw status
```

如果防火墙开启，需要开放端口：

```bash
# CentOS/RHEL 系列
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# Ubuntu/Debian 系列
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

---

## 三、域名和 DNS 配置（生产环境）

### 3.1 域名要求

- **测试环境**：不需要域名，直接用 IP 访问
- **生产环境**：建议使用域名，并已完成备案

### 3.2 DNS 解析配置

如果你的服务器 IP 是 `123.45.67.89`，域名是 `example.com`，需要添加以下解析：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|----------|----------|----------|------|
| A | @ | 123.45.67.89 | 主域名 |
| A | www | 123.45.67.89 | www 子域名 |
| A | admin | 123.45.67.89 | 管理后台子域名 |

**阿里云 DNS 配置步骤**：

1. 登录阿里云控制台
2. 进入 **域名** → 找到你的域名 → **解析设置**
3. 点击 **添加记录**，按上表填写

### 3.3 验证 DNS 生效

```bash
# 在本地电脑执行
ping example.com
ping admin.example.com
```

能 ping 通你的服务器 IP 即表示 DNS 已生效。

---

## 四、数据库准备

### 4.1 数据库选择

企智通支持两种数据库部署方式：

| 方式 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **云 RDS** | 生产环境 | 高可用、自动备份、易扩展 | 需要额外费用 |
| **本地 MySQL** | 测试/开发 | 无额外成本 | 数据安全性和可用性较低 |

### 4.2 使用云 RDS（推荐）

#### 4.2.1 购买 RDS 实例

以阿里云为例：

1. 登录阿里云控制台
2. 进入 **云数据库 RDS** → **创建实例**
3. 选择配置：
   - 数据库引擎：**MySQL 8.0**
   - 系列：**高可用版**（一主一备）
   - 规格：**2C2G** 起步
   - 存储：根据数据量选择

#### 4.2.2 配置白名单

**重要**：必须将服务器 IP 添加到 RDS 白名单，否则无法连接！

1. 进入 RDS 实例 → **数据安全性**
2. 点击 **白名单设置** → **修改**
3. 添加你的服务器 IP：
   - 如果是固定 IP：添加 `你的服务器IP/32`
   - 如果 IP 可能变动：添加 `0.0.0.0/0`（不推荐，仅测试用）

#### 4.2.3 创建数据库和账号

1. 进入 RDS 实例 → **账号管理**
   - 创建数据库账号，记住用户名和密码
2. 进入 **数据库管理**
   - 创建数据库，名称如 `qzt_db`
   - 将账号授权给该数据库

### 4.3 使用本地 MySQL（Docker）

Docker 部署模式下，会自动创建 MySQL 容器，无需手动安装。

如果需要手动安装 MySQL：

```bash
# CentOS/RHEL
yum install -y mysql-server
systemctl start mysqld
systemctl enable mysqld

# Ubuntu/Debian
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# 获取临时密码（CentOS）
grep 'temporary password' /var/log/mysqld.log
```

### 4.4 数据库连接信息

无论哪种方式，部署时需要准备以下信息：

```
数据库地址：如 rm-xxxxx.mysql.rds.aliyuncs.com 或 localhost
端口：默认 3306
用户名：如 root 或 qzt_user
密码：你设置的密码
数据库名：如 qzt_db
```

---

## 五、其他准备

### 5.1 Git 账户（可选）

如果你想从自己的仓库部署，需要：
- Git 账户（GitHub/GitLab/Gitee）
- 仓库访问权限

### 5.2 SSL 证书（可选）

如果需要 HTTPS，有三种选择：

| 方式 | 成本 | 难度 | 适用场景 |
|------|------|------|----------|
| Let's Encrypt | 免费 | 中 | 有域名，推荐 |
| 自签名 | 免费 | 低 | 测试环境 |
| 购买证书 | 付费 | 低 | 生产环境，企业需求 |

### 5.3 时间同步

确保服务器时间正确，否则可能导致证书验证失败：

```bash
# 安装并启用时间同步
yum install -y chrony     # CentOS
apt-get install -y ntp      # Ubuntu

systemctl enable chronyd      # CentOS
systemctl enable ntp          # Ubuntu
```

---

## 六、环境检查清单

部署前运行以下命令检查环境：

```bash
echo "=== 系统信息 ==="
cat /etc/os-release | head -2

echo -e "\n=== CPU/内存 ==="
echo "CPU 核心: $(nproc)"
echo "内存大小: $(free -h | grep Mem | awk '{print $2}')"

echo -e "\n=== 磁盘空间 ==="
df -h | head -2

echo -e "\n=== 网络连接 ==="
ping -c 2 8.8.8.8 > /dev/null && echo "外网连接: 正常" || echo "外网连接: 异常"

echo -e "\n=== 端口检查 ==="
netstat -tlnp 2>/dev/null | grep -E ':(80|443|7890|5180)' || echo "所需端口未被占用"
```

---

## 七、快速购买指南（阿里云）

### 阿里云 ECS 购买建议

1. 进入 [阿里云 ECS](https://www.aliyun.com/product/ecs)
2. 选择配置：
   - **实例规格**：2核4GB（ecs.t6-c1m2.large 或更高）
   - **镜像**：Alibaba Cloud Linux 3.2104 LTS 64位
   - **存储**：40GB ESSD
   - **带宽**：按使用流量计费（测试推荐）

### 阿里云 RDS 购买建议

1. 进入 [阿里云 RDS](https://www.aliyun.com/product/rds/mysql)
2. 选择配置：
   - **数据库版本**：MySQL 8.0
   - **系列**：高可用版（一主一备）
   - **规格**：2C2G（rds.mysql.s2.large）
   - **存储**：20GB 起步

---

## 下一步

当前置条件都准备好后，请继续：

- [快速部署指南](./QUICKSTART.md) - 5 分钟完成部署
- [Docker 部署详解](./docker.md)
- [裸机部署详解](./README.md)
