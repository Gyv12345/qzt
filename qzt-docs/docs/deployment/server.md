---
sidebar_label: 后端部署
sidebar_position: 2
---

# 后端部署（Server）

后端服务采用 Go 语言开发，编译为单一二进制文件，通过 **systemd** 托管进程。部署流程为：本地交叉编译 Linux amd64 二进制 → scp 上传到服务器 → systemctl 重启服务。整个流程无需在服务器安装 Go 环境，部署包体积小、启动快、无外部依赖。

## 部署架构

```
┌──────────────────┐   交叉编译    ┌──────────────────┐   scp 上传   ┌──────────────────┐
│  本地开发机       │ ────────────▶ │  本地二进制文件   │ ────────────▶│  服务器           │
│  (macOS/Windows) │  GOOS=linux  │  qzt-server      │              │  你的服务器IP   │
└──────────────────┘              └──────────────────┘              └────────┬─────────┘
                                                                            │
                                                                            │ systemctl restart
                                                                            ▼
                                                                   ┌──────────────────┐
                                                                   │  systemd 托管     │
                                                                   │  监听 :9000      │
                                                                   └──────────────────┘
```

## 服务信息

| 项 | 值 |
|----|----|
| 服务名称 | `qzt-server` |
| 监听端口 | `9000` |
| 进程管理 | systemd |
| 二进制路径 | `/opt/qzt-server/qzt-server` |
| 配置文件 | `/opt/qzt-server/config.yaml` |
| 日志路径 | systemd journal（`journalctl -u qzt-server`） |
| 服务文件 | `/etc/systemd/system/qzt-server.service` |

## 本地交叉编译

Go 的交叉编译能力是后端部署的核心优势：在 macOS / Windows 开发机上即可编译出 Linux 可执行文件，无需在服务器安装 Go 工具链。

### 编译命令

```bash
# 进入后端项目根目录
cd /path/to/qzt-server

# 设置交叉编译目标并编译
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
  -ldflags="-s -w" \
  -o qzt-server \
  ./cmd/server
```

### 编译参数说明

| 参数 | 说明 |
|------|------|
| `GOOS=linux` | 目标操作系统为 Linux |
| `GOARCH=amd64` | 目标架构为 amd64（x86_64） |
| `CGO_ENABLED=0` | 禁用 CGO，生成纯静态二进制，无 glibc 依赖 |
| `-ldflags="-s -w"` | 去除调试信息与符号表，减小二进制体积 |
| `-o qzt-server` | 输出文件名 |

:::tip 为什么禁用 CGO
`CGO_ENABLED=0` 生成完全静态链接的二进制，不依赖服务器的 glibc 版本，可在任意 Linux 发行版（CentOS、Ubuntu、Alpine）上直接运行，避免「能编译不能运行」的坑。
:::

## 上传二进制

编译完成后，通过 scp 将二进制上传到服务器：

```bash
# 上传二进制到服务器
scp qzt-server user@你的服务器IP:/opt/qzt-server/qzt-server.new

# 上传配置文件（可选，通常配置不频繁更新）
scp config.yaml user@你的服务器IP:/opt/qzt-server/config.yaml
```

:::tip 先上传为 .new 再替换
建议先上传为 `qzt-server.new`，确认上传完整后再替换正式二进制并重启，避免上传中断导致线上二进制损坏。
:::

## 重启服务

后端服务通过 systemd 管理，重启命令如下：

```bash
# SSH 登录服务器
ssh user@你的服务器IP

# 替换二进制（备份旧版本）
cd /opt/qzt-server
mv qzt-server qzt-server.bak.$(date +%Y%m%d%H%M%S)
mv qzt-server.new qzt-server
chmod +x qzt-server

# 重启服务
systemctl restart qzt-server

# 查看状态
systemctl status qzt-server

# 查看实时日志
journalctl -u qzt-server -f
```

## systemd 服务配置

服务通过 systemd 托管，配置文件位于 `/etc/systemd/system/qzt-server.service`：

```ini
[Unit]
Description=QZT Server (Go Backend)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/qzt-server
ExecStart=/opt/qzt-server/qzt-server -config /opt/qzt-server/config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65535

# 环境变量（可选）
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

### 关键配置说明

| 配置 | 说明 |
|------|------|
| `Restart=always` | 进程崩溃后自动重启 |
| `RestartSec=5` | 崩溃后 5 秒重启，避免频繁重启 |
| `WorkingDirectory` | 工作目录，影响相对路径读取 |
| `LimitNOFILE` | 提高文件描述符上限，支持高并发 |

修改 service 文件后需执行 `systemctl daemon-reload` 重新加载。

## 健康检查

部署后建议进行健康检查，确认服务正常：

```bash
# 检查端口监听
ss -tlnp | grep 9000

# 本地请求健康检查接口
curl http://127.0.0.1:9000/api/health

# 通过 Nginx 检查（如果配置了 api 域名）
curl https://api.你的域名/api/health
```

## 一键部署脚本

可将上述步骤整合为脚本，简化日常部署：

```bash
#!/bin/bash
# deploy-server.sh
set -e

SERVER=user@你的服务器IP
REMOTE_PATH=/opt/qzt-server

echo "==> 编译 Linux amd64 二进制..."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o qzt-server ./cmd/server

echo "==> 上传到服务器..."
scp qzt-server $SERVER:$REMOTE_PATH/qzt-server.new

echo "==> 替换并重启..."
ssh $SERVER << 'EOF'
  cd /opt/qzt-server
  mv qzt-server qzt-server.bak.$(date +%Y%m%d%H%M%S)
  mv qzt-server.new qzt-server
  chmod +x qzt-server
  systemctl restart qzt-server
  sleep 2
  systemctl status qzt-server --no-pager
EOF

echo "==> 部署完成"
```

## 回滚

如部署后发现异常，可快速回滚到上一版本：

```bash
ssh user@你的服务器IP
cd /opt/qzt-server

# 查看备份版本
ls -lt qzt-server.bak.*

# 回滚到指定版本
cp qzt-server.bak.20260805120000 qzt-server
chmod +x qzt-server
systemctl restart qzt-server
```
