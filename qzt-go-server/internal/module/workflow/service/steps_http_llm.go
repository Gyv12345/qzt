// steps_http_llm.go 工作流动作节点执行器(P27):http / llm。
package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/pkg/llm"
)

// httpTimeout HTTP 动作超时。
const httpTimeout = 10 * time.Second

// stepHTTP 出站 HTTP 调用。
// config: url / method(GET|POST,默认 POST) / headers / body(对象或字符串,模板渲染) / sign_secret(可选)
func stepHTTP(ctx context.Context, node wfmodel.GraphNode, rc *runCtx) (stepOut, error) {
	cfg := node.Config
	u := rc.renderTpl(str(cfg["url"]))
	if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
		return nil, fmt.Errorf("URL 无效: %q", u)
	}
	method := strings.ToUpper(str(cfg["method"]))
	if method != "GET" && method != "POST" {
		method = "POST"
	}
	headers := map[string]string{}
	if hm, ok := cfg["headers"].(map[string]any); ok {
		for k, v := range hm {
			headers[k] = rc.renderTpl(str(v))
		}
	}
	body := rc.renderValue(cfg["body"])
	payload, _ := json.Marshal(body)
	if s, ok := body.(string); ok {
		payload = []byte(rc.renderTpl(s))
	}
	req, err := http.NewRequestWithContext(ctx, method, u, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("构建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	// 可选 HMAC 签名(风格与 open_webhook 一致:t=时间戳,v1=hex)
	if secret := str(cfg["sign_secret"]); secret != "" {
		ts := time.Now().Unix()
		mac := hmac.New(sha256.New, []byte(secret))
		fmt.Fprintf(mac, "%d.", ts)
		mac.Write(payload)
		sig := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-QZT-Signature", fmt.Sprintf("t=%d,v1=%s", ts, sig))
	}
	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP 请求失败: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	return stepOut{
		"status_code": resp.StatusCode,
		"body":        strings.ToValidUTF8(string(raw), "�"),
	}, nil
}

// stepLLM 调内部 LLM 网关生成文本。
// config: prompt(必填,支持模板)/model(可选)/max_tokens(可选,默认 500)
func stepLLM(ctx context.Context, node wfmodel.GraphNode, rc *runCtx) (stepOut, error) {
	cfg := node.Config
	prompt := rc.renderTpl(str(cfg["prompt"]))
	if prompt == "" {
		return nil, fmt.Errorf("prompt 不能为空")
	}
	maxTokens := 500
	if n, ok := cfg["max_tokens"].(float64); ok && n > 0 {
		maxTokens = int(n)
	}
	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages:  []llm.Message{{Role: "user", Content: prompt}},
		MaxTokens: maxTokens,
		Feature:   "workflow.step",
	})
	if err != nil {
		return nil, fmt.Errorf("LLM 调用失败: %w", err)
	}
	return stepOut{
		"text":         resp.Content,
		"model":        resp.Model,
		"total_tokens": resp.TotalTokens,
	}, nil
}
