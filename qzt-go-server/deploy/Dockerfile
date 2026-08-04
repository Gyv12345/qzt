# 多阶段构建：builder 编译，runtime 仅含二进制与配置，镜像更小更安全。
FROM golang:1.25-alpine AS builder

WORKDIR /build

# 先拷依赖，利用层缓存
COPY go.mod go.sum ./
ENV GOPROXY=https://mirrors.aliyun.com/goproxy/,direct
RUN go mod download

# 拷源码并编译（CGO_OFF 产出静态二进制，适配 alpine/scratch）
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/qzt-server ./cmd/server

# ── runtime ──
FROM alpine:3.20

# ca-certificates（HTTPS 出站）、tzdata（时区）
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /out/qzt-server /app/qzt-server
# 配置目录与 Casbin 模型：部署时通过 volume 覆盖 config/config.yaml
COPY config/rbac_model.conf /app/config/rbac_model.conf

# 上传目录
RUN mkdir -p /app/storage/uploads /app/logs && chown -R app:app /app

USER app

EXPOSE 8000

ENTRYPOINT ["/app/qzt-server", "-config", "/app/config", "-log", "/app/logs"]
