package mcpclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParseToolCallResult_OK 正常 result(取 content[0].text)。
func TestParseToolCallResult_OK(t *testing.T) {
	raw := json.RawMessage(`{"content":[{"type":"text","text":"{\"name\":\"行简网络\"}"}],"isError":false}`)
	out, err := ParseToolCallResult(raw)
	require.NoError(t, err)
	assert.False(t, out.IsError)
	assert.Contains(t, out.Text, "行简网络")
}

// TestParseToolCallResult_Empty result 为空报错。
func TestParseToolCallResult_Empty(t *testing.T) {
	_, err := ParseToolCallResult(nil)
	assert.Error(t, err)
}

// TestParseToolCallResult_IsError isError=true 返回错误但带 text 供上游提示。
func TestParseToolCallResult_IsError(t *testing.T) {
	raw := json.RawMessage(`{"content":[{"type":"text","text":"查询超限"}],"isError":true}`)
	out, err := ParseToolCallResult(raw)
	assert.Error(t, err)
	require.NotNil(t, out)
	assert.Equal(t, "查询超限", out.Text)
}

// TestParseToolCallResult_MultiContent 多 content 分片取首个非空 text。
func TestParseToolCallResult_MultiContent(t *testing.T) {
	raw := json.RawMessage(`{"content":[{"type":"image","data":"..."},{"type":"text","text":"ok"}]}`)
	out, err := ParseToolCallResult(raw)
	require.NoError(t, err)
	assert.Equal(t, "ok", out.Text)
}

// TestParseRPCResponse_OK / 错误形态。
func TestParseRPCResponse(t *testing.T) {
	var resp rpcResponse
	require.NoError(t, parseRPCResponse([]byte(`{"jsonrpc":"2.0","id":1,"result":{"ok":1}}`), &resp))
	require.NotNil(t, resp.Result)

	err := parseRPCResponse([]byte(`{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"method not found"}}`), &resp)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "-32601")

	err = parseRPCResponse([]byte(`不是json`), &resp)
	assert.Error(t, err)
}

// TestExtractFirstJSON 从包裹文字中提取 JSON 对象/数组;字符串内闭合符不干扰。
func TestExtractFirstJSON(t *testing.T) {
	obj, ok := ExtractFirstJSON(`结果如下 {"name":"a}b","n":1} 请查收`)
	require.True(t, ok)
	assert.Equal(t, `{"name":"a}b","n":1}`, obj)

	arr, ok := ExtractFirstJSON(`[{"id":1},{"id":2}]`)
	require.True(t, ok)
	assert.True(t, strings.HasPrefix(arr, "["))
	assert.True(t, strings.HasSuffix(arr, "]"))

	_, ok = ExtractFirstJSON("没有 JSON")
	assert.False(t, ok)

	_, ok = ExtractFirstJSON(`{"broken": `)
	assert.False(t, ok)
}

// TestCall_FullFlow httptest 起一个最小 MCP 服务:校验握手→通知→tools/call 全链路
// 与 Bearer 鉴权、会话头回带。
func TestCall_FullFlow(t *testing.T) {
	var gotAuth, gotSession string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotSession = r.Header.Get(SessionHeader)
		var req rpcRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get(SessionHeader) != "" {
			w.Header().Set(SessionHeader, "sess-1")
		}
		switch req.Method {
		case "initialize":
			w.Header().Set(SessionHeader, "sess-abc")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{},"serverInfo":{"name":"t","version":"1"}}}`))
		case "tools/call":
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"ok\":true}"}]}}`))
		default:
			w.WriteHeader(http.StatusAccepted) // notifications/initialized → 202 无 body
		}
	}))
	defer srv.Close()

	c := New(Config{Endpoint: srv.URL, APIKey: "k-test", SkipEndpointValidation: true})
	out, err := c.Call(context.Background(), "get_company_basic_profile", map[string]any{"company": "行简网络"})
	require.NoError(t, err)
	assert.Equal(t, `{"ok":true}`, out.Text)
	assert.Equal(t, "Bearer k-test", gotAuth)
	assert.Equal(t, "sess-abc", gotSession) // tools/call 回带了握手下发的会话
}

// TestCall_SSEFlow 服务端以 text/event-stream 形态返回 tools/call 结果。
func TestCall_SSEFlow(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req rpcRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.Method == "initialize" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":{}}`))
			return
		}
		if req.Method == "tools/call" {
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = w.Write([]byte("event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"sse-ok\"}]}}\n\n"))
			return
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()

	c := New(Config{Endpoint: srv.URL, APIKey: "k", SkipEndpointValidation: true})
	out, err := c.Call(context.Background(), "search_company", map[string]any{"query": "x"})
	require.NoError(t, err)
	assert.Equal(t, "sse-ok", out.Text)
}

// TestCall_PrivateEndpoint 内网端点被出网校验拦截。
func TestCall_PrivateEndpoint(t *testing.T) {
	c := New(Config{Endpoint: "http://127.0.0.1:9999/mcp", APIKey: "k"})
	_, err := c.Call(context.Background(), "t", nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "端点校验失败")
}
