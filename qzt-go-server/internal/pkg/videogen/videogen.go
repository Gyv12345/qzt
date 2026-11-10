// Package videogen AI 文生视频网关（GEO 信源产线的视频生产端）。
//
// 抽象 Provider 接口（异步两段式：Submit 建任务 → Poll 轮询取片），
// 首个实现为火山方舟即梦 Seedance（doubao-seedance 系列）——与抖音同生态、
// 文生视频效果第一梯队，单条 5~10s 约 0.5~2 元。后续可灵/通义万相按接口补。
//
// 配置：config.{env}.yaml 的 videogen 节，api_key 走 .env 的 VIDEOGEN_API_KEY。
// API key 未配置时 Enabled() 为 false，产线的视频步自动跳过（不阻塞图文）。
package videogen

import (
	"context"
	"errors"
	"strings"
	"time"
)

// ErrNotConfigured 已装配但未配置 API key（.env 的 VIDEOGEN_API_KEY 为空）。
var ErrNotConfigured = errors.New("videogen: api key not configured, set VIDEOGEN_API_KEY in .env")

// GenerateRequest 一次文生视频请求。
type GenerateRequest struct {
	// 画面描述（英文/中文皆可，Seedance 对中文支持好）。分辨率/时长等参数
	// 由实现按配置追加为模型指令（Seedance 用 prompt 内嵌 --resolution 等开关）。
	Prompt string
}

// TaskStatus 任务的归一化状态。
type TaskStatus struct {
	// queued=排队 running=生成中 succeeded=成功 failed=失败
	Status string
	// 成功时返回视频下载地址（供应商临时 URL，调用方应尽快转存自有存储）。
	VideoURL string
	// 失败原因摘要
	Error string
}

// Done 任务是否到达终态（成功或失败）。
func (s TaskStatus) Done() bool { return s.Status == "succeeded" || s.Status == "failed" }

// Provider 文生视频供应商抽象（异步任务制）。
type Provider interface {
	// Submit 提交生成任务，返回任务 ID（生成通常耗时 30s~3min，必须异步）。
	Submit(ctx context.Context, req GenerateRequest) (taskID string, err error)
	// Poll 查询任务状态。轮询节奏由调用方控制（建议 5~10s 一次）。
	Poll(ctx context.Context, taskID string) (TaskStatus, error)
}

// DefaultPollInterval 建议的轮询间隔。
const DefaultPollInterval = 8 * time.Second

// 默认超时：单次 HTTP 调用。
const httpTimeout = 30 * time.Second

// sanitizePrompt 去掉会干扰指令解析的换行（Seedance 指令按 --xxx 解析，换行安全但不必要）。
func sanitizePrompt(prompt string) string {
	return strings.Join(strings.Fields(prompt), " ")
}
