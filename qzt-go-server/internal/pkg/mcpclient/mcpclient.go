// Package mcpclient 最小 Streamable HTTP JSON-RPC MCP 客户端(天眼查 MCP 工商信息用)。
//
// 只实现 P31 需要的两个动作:initialize 握手(+initialized 通知)与 tools/call。
// 协议要点(2024-11-05 Streamable HTTP):
//   - 单一 HTTP 端点(如 https://mcp.tianyancha.com/sse 或服务方给出的 MCP URL),
//     POST JSON-RPC 消息,Accept: application/json, text/event-stream;
//   - initialize 请求携带 protocolVersion/capabilities/clientInfo,响应头可能下发
//     Mcp-Session-Id,后续请求须原样回带;
//   - initialized 是一条 notification(无 id,不期待响应),POST 202/空 body 均正常;
//   - tools/call 请求 {name, arguments},响应 result.content[0].text 携带工具输出
//     (天眼查工具的 text 是 JSON 字符串,由业务侧二次解析)。
//
// 鉴权:Authorization: Bearer <API Key>(天眼查个人版 MCP 惯例);key 只进请求头,不落日志。
// 出网安全:每次调用前对端点做 llm.ValidatePublicBaseURL 校验。
// 约束:Service 层调用,Handler 不直接 import。
package mcpclient

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"
	"time"

	"qzt-go-server/internal/pkg/llm"
)

// ProtocolVersion 客户端声明的 MCP 协议版本。
const ProtocolVersion = "2024-11-05"

// SessionHeader Streamable HTTP 会话头(服务端下发,客户端回带)。
const SessionHeader = "Mcp-Session-Id"

// DefaultTimeout 单次 RPC 超时。
const DefaultTimeout = 30 * time.Second

// maxResponseBytes 响应体读取上限(2MB,天眼查档案返回可能较大)。
const maxResponseBytes = 2 << 20

// Config 客户端配置。
type Config struct {
	Endpoint string // MCP 端点 URL(如 https://mcp.tianyancha.com/mcp)
	APIKey   string // API Key(Bearer 鉴权)
	Timeout  time.Duration
	// SkipEndpointValidation 仅测试用:httptest 环回地址起 mock 服务时置 true。
	// 生产路径(配置保存/业务调用)一律 false,由 Call 内强制出网校验兜底。
	SkipEndpointValidation bool
}

// Client 最小 MCP 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// New 创建客户端(不在此处校验端点,Call 时统一校验,便于测试用 httptest 环回地址)。
func New(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	return &Client{cfg: cfg, hc: &http.Client{Timeout: timeout}}
}

// ── JSON-RPC 消息 ──

type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type rpcNotification struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type rpcError struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type initializeParams struct {
	ProtocolVersion string          `json:"protocolVersion"`
	Capabilities    json.RawMessage `json:"capabilities"`
	ClientInfo      clientInfo      `json:"clientInfo"`
}

type clientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ToolCallResult tools/call 的归一化结果。
type ToolCallResult struct {
	Text       string // content[0].text(天眼查工具输出为 JSON 字符串)
	IsError    bool   // result.isError=true 表示工具侧执行失败
	RawContent json.RawMessage
}

// Call 一次完整调用:initialize 握手 → initialized 通知 → tools/call → 结果解析。
// 每次调用独立完成握手(短连接语义,MCP 会话生命周期限定在一次业务调用内)。
func (c *Client) Call(ctx context.Context, tool string, args map[string]any) (*ToolCallResult, error) {
	if c == nil || c.cfg.Endpoint == "" {
		return nil, errors.New("mcpclient: endpoint 未配置")
	}
	if tool == "" {
		return nil, errors.New("mcpclient: tool 名为空")
	}
	if !c.cfg.SkipEndpointValidation {
		if err := llm.ValidatePublicBaseURL(c.cfg.Endpoint); err != nil {
			return nil, fmt.Errorf("mcpclient: 端点校验失败: %v", err)
		}
	}
	sessionID, err := c.initialize(ctx)
	if err != nil {
		return nil, err
	}
	// initialized 通知:失败不影响主流程(部分实现不校验)。
	_ = c.notifyInitialized(ctx, sessionID)
	return c.callTool(ctx, sessionID, tool, args)
}

// initialize 握手,返回服务端下发的会话 ID(可能为空)。
func (c *Client) initialize(ctx context.Context) (string, error) {
	params, _ := json.Marshal(initializeParams{
		ProtocolVersion: ProtocolVersion,
		Capabilities:    json.RawMessage("{}"),
		ClientInfo:      clientInfo{Name: "qzt-server", Version: "1.0"},
	})
	body, sessionID, err := c.post(ctx, "", mustJSON(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params:  params,
	}))
	if err != nil {
		return "", fmt.Errorf("mcpclient: initialize: %w", err)
	}
	var resp rpcResponse
	if err := parseRPCResponse(body, &resp); err != nil {
		return "", fmt.Errorf("mcpclient: initialize 响应: %w", err)
	}
	return sessionID, nil
}

// notifyInitialized 发送 initialized 通知(无 id,不期待响应)。
func (c *Client) notifyInitialized(ctx context.Context, sessionID string) error {
	_, _, err := c.post(ctx, sessionID, mustJSON(rpcNotification{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	}))
	return err
}

// callTool 调用工具并解析 result.content[0].text。
func (c *Client) callTool(ctx context.Context, sessionID, tool string, args map[string]any) (*ToolCallResult, error) {
	if args == nil {
		args = map[string]any{}
	}
	params, _ := json.Marshal(struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}{Name: tool, Arguments: args})
	body, _, err := c.post(ctx, sessionID, mustJSON(rpcRequest{
		JSONRPC: "2.0",
		ID:      2,
		Method:  "tools/call",
		Params:  params,
	}))
	if err != nil {
		return nil, fmt.Errorf("mcpclient: tools/call: %w", err)
	}
	var resp rpcResponse
	if err := parseRPCResponse(body, &resp); err != nil {
		return nil, fmt.Errorf("mcpclient: tools/call 响应: %w", err)
	}
	return ParseToolCallResult(resp.Result)
}

// post 发送一条 JSON-RPC 消息并读回响应体(POST / SSE 双形态兼容),
// 返回响应体与服务端下发的 Mcp-Session-Id(可能为空)。
func (c *Client) post(ctx context.Context, sessionID, payload string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.Endpoint, strings.NewReader(payload))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if c.cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	}
	if sessionID != "" {
		req.Header.Set(SessionHeader, sessionID)
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	respSession := resp.Header.Get(SessionHeader)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, "", fmt.Errorf("http %d: %s", resp.StatusCode, truncate(string(body), 200))
	}
	body, err := readMessageBody(resp)
	return body, respSession, err
}

// readMessageBody 兼容 application/json 与 text/event-stream 两种响应形态:
// SSE 形态取最后一条 data: 行的 JSON。
func readMessageBody(resp *http.Response) ([]byte, error) {
	ct := resp.Header.Get("Content-Type")
	mediaType, _, _ := mime.ParseMediaType(ct)
	if !strings.HasPrefix(mediaType, "text/event-stream") {
		return io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	}
	// SSE:逐行扫 data: 前缀,保留最后一条完整事件(流式场景下最终结果在最后)。
	var last []byte
	sc := bufio.NewScanner(io.LimitReader(resp.Body, maxResponseBytes))
	sc.Buffer(make([]byte, 0, 64*1024), maxResponseBytes)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if strings.HasPrefix(line, "data:") {
			last = []byte(strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	if len(last) == 0 {
		return nil, errors.New("mcpclient: sse 响应无 data 行")
	}
	return last, nil
}

// ── 纯函数(单测覆盖) ──

// parseRPCResponse 解析 JSON-RPC 响应:protocol error → 明确错误;业务 error → 带 code 的错误。
func parseRPCResponse(body []byte, out *rpcResponse) error {
	if err := json.Unmarshal(body, out); err != nil {
		// 兼容直接返回 result 对象(个别实现省略 jsonrpc 信封)。
		var probe map[string]any
		if perr := json.Unmarshal(body, &probe); perr == nil {
			if _, ok := probe["result"]; ok {
				return nil
			}
		}
		return fmt.Errorf("响应不是合法 JSON-RPC: %v", err)
	}
	if out.Error != nil {
		return fmt.Errorf("mcp rpc error %d: %s", out.Error.Code, out.Error.Message)
	}
	return nil
}

// extractSessionID 从响应头集合中提取 Mcp-Session-Id(仅测试与扩展使用)。
func extractSessionID(header http.Header) string {
	return header.Get(SessionHeader)
}

// ParseToolCallResult 解析 tools/call 的 result:取 content[0].text 与 isError 标记。
func ParseToolCallResult(raw json.RawMessage) (*ToolCallResult, error) {
	if len(raw) == 0 {
		return nil, errors.New("mcpclient: tools/call result 为空")
	}
	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("mcpclient: 解析 tools/call result: %w", err)
	}
	out := &ToolCallResult{IsError: result.IsError, RawContent: raw}
	for _, item := range result.Content {
		if strings.TrimSpace(item.Text) != "" {
			out.Text = item.Text
			break
		}
	}
	if result.IsError {
		return out, fmt.Errorf("mcpclient: 工具执行失败: %s", truncate(out.Text, 200))
	}
	return out, nil
}

// ExtractFirstJSON 解析工具输出文本中第一段 JSON 对象/数组(纯函数):
// 天眼查工具 text 可能是纯 JSON,也可能被说明文字包裹;取首个 { 或 [ 到配对闭合。
func ExtractFirstJSON(text string) (string, bool) {
	text = strings.TrimSpace(text)
	start := -1
	open, closeCh := byte(0), byte(0)
	for i := 0; i < len(text); i++ {
		ch := text[i]
		if ch == '{' || ch == '[' {
			start = i
			if ch == '{' {
				open, closeCh = '{', '}'
			} else {
				open, closeCh = '[', ']'
			}
			break
		}
	}
	if start < 0 {
		return "", false
	}
	depth := 0
	inStr, esc := false, false
	for i := start; i < len(text); i++ {
		ch := text[i]
		if inStr {
			if esc {
				esc = false
			} else if ch == '\\' {
				esc = true
			} else if ch == '"' {
				inStr = false
			}
			continue
		}
		switch ch {
		case '"':
			inStr = true
		case open:
			depth++
		case closeCh:
			depth--
			if depth == 0 {
				candidate := text[start : i+1]
				var v any
				if json.Unmarshal([]byte(candidate), &v) == nil {
					return candidate, true
				}
				return "", false
			}
		}
	}
	return "", false
}

// ── 工具 ──

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// truncate 按字节截断并回退 UTF-8 字符边界。
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for i := n; i > n-4 && i > 0; i-- {
		if s[i]&0xC0 != 0x80 {
			return s[:i]
		}
	}
	return s[:n]
}
