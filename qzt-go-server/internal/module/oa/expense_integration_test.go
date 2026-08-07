//go:build integration

// oa 报销单端到端集成测试:登录 → 创建 → 查询 → 列表 → 标记打款 → 删除 → 删除后查空。
// 前置:qztgo_test 库已建 oa_expense / oa_expense_item 表并灌入 sys_user 种子(admin/admin123)。
// 运行:go test -tags=integration -v -run TestExpenseCRUD ./internal/module/oa/
package oa_test

import (
	"net/http"
	"strconv"
	"testing"

	"qzt-go-server/internal/testutil"
)

// TestExpenseCRUD 覆盖 OA 报销单全链路:
// 创建(含明细行)→ 单条查 → 列表查 → 标记已打款 → 软删除 → 删除后查不到。
func TestExpenseCRUD(t *testing.T) {
	baseURL := testutil.NewTestServer(t)
	token := testutil.LoginAdmin(t, baseURL)

	// 1. 创建报销单(必填 title / expense_type / amount;applicant_id 留空由 token 注入)
	createBody := map[string]interface{}{
		"title":        "集成测试-差旅报销",
		"expense_type": "TRAVEL",
		"amount":       "1280.50",
		"occur_date":   "2026-08-07",
		"description":  "由集成测试自动创建",
		"items": []map[string]string{
			{"item_type": "HOTEL", "amount": "880.50", "invoice_no": "INV-001", "remark": "住宿"},
			{"item_type": "MEALS", "amount": "400.00", "invoice_no": "INV-002", "remark": "餐饮"},
		},
	}
	env := testutil.DoJSON(t, baseURL, http.MethodPost, "/oa/expenses", token, createBody)
	testutil.AssertOK(t, env)

	// 取出新建的 id
	resp := struct {
		ID uint `json:"id"`
	}{}
	testutil.UnmarshalData(t, env, &resp)
	if resp.ID == 0 {
		t.Fatal("创建报销单返回 id=0")
	}
	t.Logf("✅ 创建报销单成功,id=%d", resp.ID)
	id := resp.ID

	// 2. 单条查询,校验字段回填
	env = testutil.DoJSON(t, baseURL, http.MethodGet, "/oa/expenses/"+strconv.FormatUint(uint64(id), 10), token, nil)
	testutil.AssertOK(t, env)
	got := struct {
		Title       string `json:"title"`
		ExpenseType string `json:"expense_type"`
		Amount      string `json:"amount"`
		ExpenseNo   string `json:"expense_no"`
	}{}
	testutil.UnmarshalData(t, env, &got)
	if got.Title != "集成测试-差旅报销" {
		t.Errorf("title 回读不符: got=%q", got.Title)
	}
	if got.ExpenseNo == "" {
		t.Error("expense_no 应由 numbergen 自动生成,实际为空")
	}
	t.Logf("✅ 单条查询OK,单号=%s 金额=%s", got.ExpenseNo, got.Amount)

	// 3. 列表查询,至少能查到刚建的这条
	env = testutil.DoJSON(t, baseURL, http.MethodGet, "/oa/expenses?page=1&page_size=10", token, nil)
	pd := testutil.AssertPaged(t, env)
	if pd.Total < 1 {
		t.Errorf("列表 total=%d,期望 >=1(刚建的报销单应出现)", pd.Total)
	}
	t.Logf("✅ 列表查询OK,total=%d", pd.Total)

	// 4. 标记已打款
	env = testutil.DoJSON(t, baseURL, http.MethodPost, "/oa/expenses/"+strconv.FormatUint(uint64(id), 10)+"/mark-paid", token, nil)
	testutil.AssertOK(t, env)
	t.Log("✅ 标记已打款OK")

	// 5. 删除(软删除)
	env = testutil.DoJSON(t, baseURL, http.MethodDelete, "/oa/expenses/"+strconv.FormatUint(uint64(id), 10), token, nil)
	testutil.AssertOK(t, env)
	t.Log("✅ 删除OK")

	// 6. 删除后再查应取不到(业务错误)
	env = testutil.DoJSON(t, baseURL, http.MethodGet, "/oa/expenses/"+strconv.FormatUint(uint64(id), 10), token, nil)
	testutil.AssertError(t, env, "不存在")
	t.Log("✅ 删除后查询正确返回不存在")
}
