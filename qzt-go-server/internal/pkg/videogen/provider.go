package videogen

import (
	"context"
	"strings"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/videogen/ark"
)

// NewProvider 按配置构建视频生成 Provider；provider 未识别返回 nil
// （调用方以 Enabled()/nil 判断降级跳过）。
func NewProvider(cfg config.VideoGenConfig) Provider {
	if !Enabled(cfg) {
		return nil
	}
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "", "ark":
		return &arkProvider{ark.NewClient(ark.Config{
			BaseURL:    cfg.BaseURL,
			APIKey:     cfg.APIKey,
			Model:      cfg.Model,
			Resolution: cfg.Resolution,
			Duration:   cfg.DurationSeconds,
			Ratio:      cfg.Ratio,
		})}
	default:
		return nil
	}
}

// Enabled 视频生成是否可用（api_key 已配置）。
func Enabled(cfg config.VideoGenConfig) bool { return cfg.APIKey != "" }

// arkProvider 火山方舟即梦 Seedance 适配（对齐 Provider 接口）。
type arkProvider struct {
	c *ark.Client
}

func (p *arkProvider) Submit(ctx context.Context, req GenerateRequest) (string, error) {
	return p.c.Submit(ctx, sanitizePrompt(req.Prompt))
}

func (p *arkProvider) Poll(ctx context.Context, taskID string) (TaskStatus, error) {
	st, err := p.c.Poll(ctx, taskID)
	if err != nil {
		return TaskStatus{}, err
	}
	return TaskStatus{Status: st.State, VideoURL: st.VideoURL, Error: st.Error}, nil
}
