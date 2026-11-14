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
| 二进制路径 | `/opt/qzt-server/bin/qzt-server` |
| 配置目录 | `/opt/qzt-server/config/` |
| 日志路径 | `/opt/qzt-server/logs/`（systemd journal 兜底：`journalctl -u qzt-server`） |
| 服务文件 | `/etc/systemd/system/qzt-server.service` |

## 本地交叉编译

Go 的交叉编译能力是后端部署的核心优势：在 macOS 开发机上即可编译出 Linux 可执行文件，无需在服务器安装 Go 工具链。

### 编译命令

```bash
# 进入后端项目根目录
cd /path/to/qzt-server

# 统一入口：自带 GOOS/GOARCH/CGO 与版本 ldflags（git describe → /system/version）
make build-prod
ls -la bin/qzt-server-linux-amd64
```

:::danger 禁止裸 go build 部署
不带 `-ldflags` 版本信息的裸 `go build` 会让版本接口回落到 `v1.0.0`，无法追溯部署版本（历史上曾多次复发）。**任何后端部署一律走 `make build-prod`**；部署后务必验证版本接口输出形如 `v1.1.0-38-gca2804f`。
:::

### build-prod 做了什么

| 环节 | 说明 |
|------|------|
| `GOOS=linux GOARCH=amd64` | 交叉编译目标（本机 macOS arm64 → 生产 linux/amd64） |
| `CGO_ENABLED=0` | 纯静态二进制，无 glibc 依赖 |
| `-ldflags` 版本注入 | 把 `git describe` 版本号编进二进制，`GET /system/version` 可查 |

:::tip
macOS/Xcode 大版本升级后 `make` 可能报「You have not agreed to the Xcode license agreements」（仅 `/usr/bin/make` 垫片被拦，git/go 正常）。终端跑一次 `sudo xcodebuild -license accept` 即恢复。
:::

## 上传二进制

编译完成后，通过 scp 将二进制上传到服务器：

```bash
# 上传到 /tmp 再 mv，避免覆盖正在运行的 binary 报 "text file busy"
scp bin/qzt-server-linux-amd64 user@你的服务器IP:/tmp/qzt-server.new
```

:::tip 必须先停服再替换
直接 scp 覆盖正在运行的 binary 会报 `dest open: Failure`（文件被占用）。必须先 `systemctl stop` 再 `mv` 替换，最后再启动。
:::

## 重启服务

后端服务通过 systemd 管理，标准替换流程：

```bash
# SSH 登录服务器
ssh user@你的服务器IP

# 停服 → 替换 → 启动
systemctl stop qzt-server
mv /tmp/qzt-server.new /opt/qzt-server/bin/qzt-server
chmod +x /opt/qzt-server/bin/qzt-server
systemctl start qzt-server
sleep 3 && systemctl is-active qzt-server
```

### 部署后必验版本

```bash
curl -s https://admin.你的域名/prod-api/system/version | python3 -m json.tool
# 正常应形如 v1.1.0-38-gca2804f；若显示 v1.0.0 = 用了裸 go build，需重发
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
ExecStart=/opt/qzt-server/bin/qzt-server -config /opt/qzt-server/config/config.yaml
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

echo "==> 编译 Linux amd64 二进制（含版本 ldflags）..."
cd /path/to/qzt-server
make build-prod

echo "==> 上传到服务器 /tmp..."
scp -i <key> bin/qzt-server-linux-amd64 $SERVER:/tmp/qzt-server.new

echo "==> 停服替换重启..."
ssh -i <key> $SERVER << 'EOF'
  systemctl stop qzt-server
  mv /tmp/qzt-server.new /opt/qzt-server/bin/qzt-server
  chmod +x /opt/qzt-server/bin/qzt-server
  systemctl start qzt-server
  sleep 3
  systemctl is-active qzt-server
EOF

echo "==> 验证版本（应形如 v1.1.0-38-gxxxxxxx）"
curl -s https://admin.你的域名/prod-api/system/version
```

## 回滚

如部署后发现异常，可快速回滚到上一版本：

```bash
ssh user@你的服务器IP
cd /opt/qzt-server/bin

# 查看备份版本（替换前建议先 cp 当前版本留档）
ls -lt qzt-server.bak.*

# 回滚到指定版本
systemctl stop qzt-server
cp qzt-server.bak.20260805120000 qzt-server
systemctl start qzt-server
```
