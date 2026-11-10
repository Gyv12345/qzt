// ark.go 火山方舟（火山引擎）即梦 Seedance 文生视频实现。
//
// API：内容生成任务两段式——
//
//	POST {base}/contents/generations/tasks   建任务，返回 {"id":"cgt-..."}
//	GET  {base}/contents/generations/tasks/{id}  查询，status=queued/running/
//	     succeeded/failed；成功后 content.video_url 为临时下载地址。
//
// Seedance 的分辨率/时长/画幅以 prompt 内嵌指令表达：
//
//	"...的描述 --resolution 720p --duration 5 --ratio 16:9 --fps 24"
package ark

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"qzt-go-server/pkg/xlogger"
)

// Client 火山方舟视频生成客户端。
type Client struct {
	baseURL    string
	apiKey     string
	model      string
	resolution string // 480p/720p/1080p
	duration   int    // 秒，Seedance 支持 5/10（lite 型）
	ratio      string // 16:9/9:16/1:1/4:3/3:4/21:9
	hc         *http.Client
}

// Config 客户端配置。
type Config struct {
	BaseURL    string // 默认 https://ark.cn-beijing.volces.com/api/v3
	APIKey     string
	Model      string // 如 doubao-seedance-1-0-lite-t2v-250428
	Resolution string // 默认 720p
	Duration   int    // 默认 5
	Ratio      string // 默认 16:9
}

// NewClient 构建方舟客户端（配置缺省值在此补齐）。
func NewClient(cfg Config) *Client {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://ark.cn-beijing.volces.com/api/v3"
	}
	if cfg.Resolution == "" {
		cfg.Resolution = "720p"
	}
	if cfg.Duration <= 0 {
		cfg.Duration = 5
	}
	if cfg.Ratio == "" {
		cfg.Ratio = "16:9"
	}
	return &Client{
		baseURL:    cfg.BaseURL,
		apiKey:     cfg.APIKey,
		model:      cfg.Model,
		resolution: cfg.Resolution,
		duration:   cfg.Duration,
		ratio:      cfg.Ratio,
		hc:         &http.Client{Timeout: 30 * time.Second},
	}
}

// BuildTaskContent 组装 Seedance 的 content 文本（prompt + 参数指令；纯函数供测试）。
func BuildTaskContent(prompt, resolution string, duration int, ratio string) string {
	return prompt + " --resolution " + resolution +
		" --duration " + fmt.Sprintf("%d", duration) +
		" --ratio " + ratio + " --fps 24 --watermark false"
}

// Status 任务的归一化状态（独立于上层 videogen 包，避免循环依赖）。
type Status struct {
	// queued=排队 running=生成中 succeeded=成功 failed=失败
	State string
	// 成功时返回视频下载地址（供应商临时 URL，调用方应尽快转存自有存储）。
	VideoURL string
	// 失败原因摘要
	Error string
}

// Done 任务是否到达终态（成功或失败）。
func (s Status) Done() bool { return s.State == "succeeded" || s.State == "failed" }

type taskCreateRequest struct {
	Model   string        `json:"model"`
	Content []contentItem `json:"content"`
}

type contentItem struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Submit 提交文生视频任务。
func (c *Client) Submit(ctx context.Context, prompt string) (string, error) {
	body := taskCreateRequest{
		Model: c.model,
		Content: []contentItem{{
			Type: "text",
			Text: BuildTaskContent(prompt, c.resolution, c.duration, c.ratio),
		}},
	}
	var resp struct {
		ID    string `json:"id"`
		Error *struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := c.doJSON(ctx, http.MethodPost, "/contents/generations/tasks", body, &resp); err != nil {
		return "", fmt.Errorf("提交视频生成任务失败: %w", err)
	}
	if resp.Error != nil {
		return "", fmt.Errorf("提交视频生成任务失败: %s %s", resp.Error.Code, resp.Error.Message)
	}
	if resp.ID == "" {
		return "", fmt.Errorf("提交视频生成任务失败: 未返回任务 ID")
	}
	return resp.ID, nil
}

// Poll 查询任务状态。
func (c *Client) Poll(ctx context.Context, taskID string) (Status, error) {
	var resp struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Error  *struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
		Content struct {
			VideoURL string `json:"video_url"`
		} `json:"content"`
	}
	if err := c.doJSON(ctx, http.MethodGet, "/contents/generations/tasks/"+url.PathEscape(taskID), nil, &resp); err != nil {
		return Status{}, fmt.Errorf("查询视频生成任务失败: %w", err)
	}
	st := Status{State: resp.Status}
	switch resp.Status {
	case "succeeded":
		st.State = "succeeded"
		st.VideoURL = resp.Content.VideoURL
		if st.VideoURL == "" {
			st.State = "failed"
			st.Error = "任务成功但未返回视频地址"
		}
	case "failed":
		st.State = "failed"
		st.Error = "视频生成失败"
		if resp.Error != nil {
			st.Error = resp.Error.Code + " " + resp.Error.Message
		}
	case "queued", "running":
		// 保持原状态
	default:
		st.State = "failed"
		st.Error = "未知任务状态: " + resp.Status
		xlogger.Errorf("videogen/ark: 未知任务状态 %s (task=%s)", resp.Status, taskID)
	}
	return st, nil
}

// doJSON 统一 JSON 请求（鉴权 Bearer）。
func (c *Client) doJSON(ctx context.Context, method, path string, body any, target any) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(b))
	}
	return json.Unmarshal(b, target)
}
