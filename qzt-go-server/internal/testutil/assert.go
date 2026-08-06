//go:build integration

package testutil

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"
)

// 成功响应 code
const CodeOK = 0

// AssertOK 断言信封 code==0(成功),返回信封供后续断言。
func AssertOK(t *testing.T, env *Envelope) *Envelope {
	t.Helper()
	if env.Code != CodeOK {
		t.Fatalf("期望 code=%d(成功), 实际 code=%d msg=%q", CodeOK, env.Code, env.Msg)
	}
	return env
}

// AssertError 断言信封 code != 0(业务错误),可选校验 msg 包含 substr。
func AssertError(t *testing.T, env *Envelope, msgSubstr ...string) {
	t.Helper()
	if env.Code == CodeOK {
		t.Fatalf("期望业务错误(code!=0), 实际成功 code=0 msg=%q", env.Msg)
	}
	if len(msgSubstr) > 0 && msgSubstr[0] != "" {
		if !contains(env.Msg, msgSubstr[0]) {
			t.Fatalf("期望 msg 包含 %q, 实际 msg=%q", msgSubstr[0], env.Msg)
		}
	}
}

// UnmarshalData 把信封 data 反序列化到 target。
func UnmarshalData(t *testing.T, env *Envelope, target interface{}) {
	t.Helper()
	if err := json.Unmarshal(env.Data, target); err != nil {
		t.Fatalf("反序列化 data 失败: %v, raw: %s", err, truncate(env.Data, 500))
	}
}

// PageData 分页响应 data 结构(后端 handler 实际返回 list/total/page/size)。
type PageData struct {
	List  json.RawMessage `json:"list"`
	Total int64           `json:"total"`
	Page  int             `json:"page"`
	Size  int             `json:"size"`
}

// AssertPaged 断言 data 是分页结构且 total >= 0,返回 PageData。
func AssertPaged(t *testing.T, env *Envelope) *PageData {
	t.Helper()
	AssertOK(t, env)
	var pd PageData
	UnmarshalData(t, env, &pd)
	if pd.Total < 0 {
		t.Fatalf("分页 total 异常: %d", pd.Total)
	}
	return &pd
}

// PageToList 把分页 list 反序列化到 target slice(如 *[]Foo)。
func PageToList(t *testing.T, env *Envelope, target interface{}) {
	t.Helper()
	pd := AssertPaged(t, env)
	if err := json.Unmarshal(pd.List, target); err != nil {
		t.Fatalf("反序列化 list 失败: %v, raw: %s", err, truncate(pd.List, 500))
	}
}

// UniqueName 生成带时间戳的唯一名称前缀,用于测试数据隔离与清理。
// 例如 UniqueName("客户") → "regtest_客户_1630000000_42"
var uniqueCounter uint64

func UniqueName(prefix string) string {
	uniqueCounter++
	return fmt.Sprintf("regtest_%s_%d_%d", prefix, time.Now().Unix(), uniqueCounter)
}

// contains 简易子串包含(避免引入 strings 仅用一次)。
func contains(s, sub string) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
