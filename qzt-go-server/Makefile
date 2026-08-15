APP_NAME ?= qzt-server
APP_IMAGE ?= qzt-server
APP_VERSION ?= 1.0.0
APP_PORT ?= 9000
ENV ?= dev
COMPOSE_FILE ?= deploy/docker-compose.yaml

.PHONY: help
help: ## Show this help
	@awk 'BEGIN { \
		FS = ":.*##"; \
		printf "\n\033[1mUsage:\033[0m\n  make \033[36m<target>\033[0m\n\n"; \
		printf "\033[1mTargets:\033[0m\n"; \
	} \
	/^[a-zA-Z0-9_-]+:.*##/ { \
		printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 \
	}' $(MAKEFILE_LIST)

# --- Development ---

.PHONY: run
run: ## Run server locally (dev env, auto-loads .env if present)
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi; \
	go run ./cmd/server -config ./config -log ./logs

.PHONY: build
build: ## Build server binary into bin/
	@mkdir -p bin
	go build -o bin/$(APP_NAME) ./cmd/server

.PHONY: tidy
tidy: ## Clean up go.mod dependencies
	go mod tidy

.PHONY: swag
swag: ## Generate Swagger docs from annotations (output: cmd/server/docs)
	$$(go env GOPATH)/bin/swag init -g cmd/server/main.go -o cmd/server/docs --parseInternal -q

.PHONY: fmt
fmt: ## Format Go code
	gofmt -s -w $(shell find . -name '*.go' -not -path './vendor/*')

.PHONY: vet
vet: ## Run go vet
	go vet ./...

.PHONY: lint
lint: ## Run golangci-lint
	golangci-lint run ./...

.PHONY: test
test: ## Run unit tests with race detector
	go test -race -count=1 -cover ./...

# 集成测试:仅编译带 `//go:build integration` tag 的测试(internal/testutil、oa 报销端到端、
# pkg 下 xcache/xlock/xlimiter 的 Redis 集成用例),需要可连的 MySQL(qztgo_test 库)与 Redis,
# 连接参数取自 .env。普通 `make test` 不含这些用例。
.PHONY: test-integration
test-integration: ## Run integration tests (tag=integration; needs reachable MySQL/Redis)
	go test -race -count=1 -tags=integration ./...

# --- Docker ---

.PHONY: docker-build
docker-build: ## Build docker image
	docker build -f deploy/Dockerfile -t $(APP_IMAGE):$(APP_VERSION) .

.PHONY: up
up: ## Start all services via docker-compose
	docker compose -f $(COMPOSE_FILE) up -d

.PHONY: down
down: ## Stop all services via docker-compose
	docker compose -f $(COMPOSE_FILE) down

.PHONY: logs
logs: ## Follow docker-compose logs
	docker compose -f $(COMPOSE_FILE) logs -f

# --- Deployment (bare metal) ---

.PHONY: deploy-start
deploy-start: ## Start server via deploy/run.sh (loads .env, PID-managed)
	@if [ -f .env ]; then export ENV=$$(grep -E '^ENV=' .env | cut -d= -f2 || echo dev); fi; \
	./deploy/run.sh start

.PHONY: deploy-stop
deploy-stop: ## Stop server via deploy/run.sh (graceful SIGTERM)
	./deploy/run.sh stop

.PHONY: deploy-restart
deploy-restart: ## Restart server via deploy/run.sh
	./deploy/run.sh restart

.PHONY: deploy-status
deploy-status: ## Check server status via deploy/run.sh
	./deploy/run.sh status

.PHONY: deploy-build
deploy-build: ## Build production binary (env=prod)
	ENV=prod ./deploy/run.sh build

.PHONY: deploy-logs
deploy-logs: ## Tail server stdout log
	./deploy/run.sh logs
