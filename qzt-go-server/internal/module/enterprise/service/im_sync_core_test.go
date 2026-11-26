package service

// im_sync_core_test.go 通讯录同步规划层纯函数单测(部门树映射/用户匹配策略)。

import (
	"testing"

	"qzt-go-server/internal/model"
)

// ── 部门树映射 ──

func TestPlanDeptSync_CreateParentFirst(t *testing.T) {
	// fetched 乱序给出(子在前);根哨兵=1,根直属部门父级应清空为顶级
	fetched := []ExternalDept{
		{ExternalID: "111", ParentExtID: "11", Name: "一组"},
		{ExternalID: "11", ParentExtID: "1", Name: "研发部"}, // 根直属
		{ExternalID: "10", ParentExtID: "1", Name: "市场部"}, // 根直属
	}
	ops := PlanDeptSync("1", "DT_", fetched, nil)
	if len(ops) != 3 {
		t.Fatalf("期望 3 个 ops,得到 %d: %+v", len(ops), ops)
	}
	// 深度 0 两个(同深度按外部 id 升序):10 → 11;然后深度 1 的 111
	if ops[0].ExternalID != "10" || ops[0].ParentExtID != "" {
		t.Errorf("根直属部门 10 应排最前且父级为空,得到 %+v", ops[0])
	}
	if ops[1].ExternalID != "11" || ops[1].ParentExtID != "" {
		t.Errorf("根直属部门 11 父级应为空,得到 %+v", ops[1])
	}
	if ops[2].ExternalID != "111" || ops[2].ParentExtID != "11" {
		t.Errorf("第三应为部门111(父=11),得到 %+v", ops[2])
	}
	// 新建编码 = 前缀 + 外部id(确定性幂等)
	if ops[2].Code != "DT_111" {
		t.Errorf("新建编码应为 DT_111,得到 %s", ops[2].Code)
	}
}

func TestPlanDeptSync_UpdateAndDisable(t *testing.T) {
	fetched := []ExternalDept{
		{ExternalID: "10", ParentExtID: "1", Name: "改名后的部门"}, // 更新
		{ExternalID: "20", ParentExtID: "1", Name: "新部门"},    // 新建
	}
	existing := []ExistingDept{
		{ID: 7, ExternalID: "10", Name: "旧名", Code: "DT_10", Status: 1},
		{ID: 9, ExternalID: "30", Name: "平台已删", Code: "DT_30", Status: 1}, // 消失
	}
	ops := PlanDeptSync("1", "DT_", fetched, existing)

	var gotUpdate, gotCreate, gotDisable bool
	for _, op := range ops {
		switch op.Op {
		case DeptOpUpdate:
			gotUpdate = true
			if op.LocalID != 7 || op.Name != "改名后的部门" {
				t.Errorf("update op 应指向 7/新名,得到 %+v", op)
			}
		case DeptOpCreate:
			gotCreate = true
			if op.ExternalID != "20" || op.Code != "DT_20" {
				t.Errorf("create op 应为部门20/DT_20,得到 %+v", op)
			}
		case DeptOpDisable:
			gotDisable = true
			if op.LocalID != 9 || op.Reason == "" {
				t.Errorf("disable op 应指向 9 且带原因,得到 %+v", op)
			}
		}
	}
	if !gotUpdate || !gotCreate || !gotDisable {
		t.Fatalf("应同时产出 update/create/disable,得到 %+v", ops)
	}
}

func TestPlanDeptSync_UnchangedNoOp(t *testing.T) {
	fetched := []ExternalDept{{ExternalID: "10", ParentExtID: "1", Name: "同名"}}
	existing := []ExistingDept{{ID: 7, ExternalID: "10", Name: "同名", Code: "DT_10", Status: 1}}
	ops := PlanDeptSync("1", "DT_", fetched, existing)
	if len(ops) != 0 {
		t.Fatalf("名称未变不应产出 ops,得到 %+v", ops)
	}
}

func TestPlanDeptSync_DanglingParentBecomesTop(t *testing.T) {
	// 父部门不在 fetched(平台已删父未删子)→ 兜底顶级
	fetched := []ExternalDept{{ExternalID: "99", ParentExtID: "404", Name: "悬空子"}}
	ops := PlanDeptSync("1", "DT_", fetched, nil)
	if len(ops) != 1 || ops[0].ParentExtID != "" {
		t.Fatalf("悬空父应兜底为顶级(ParentExtID 空),得到 %+v", ops)
	}
}

func TestPlanDeptSync_FeishuRootSentinel(t *testing.T) {
	fetched := []ExternalDept{{ExternalID: "od-a", ParentExtID: "0", Name: "飞书根直属"}}
	ops := PlanDeptSync("0", "FS_", fetched, nil)
	if len(ops) != 1 || ops[0].ParentExtID != "" {
		t.Fatalf("飞书根哨兵 0 的子部门应落顶级,得到 %+v", ops)
	}
}

func TestPlanDeptSync_DupExternalIDDeduped(t *testing.T) {
	fetched := []ExternalDept{
		{ExternalID: "10", ParentExtID: "1", Name: "A"},
		{ExternalID: "10", ParentExtID: "1", Name: "B"}, // 同 id 后到覆盖
	}
	ops := PlanDeptSync("1", "DT_", fetched, nil)
	if len(ops) != 1 {
		t.Fatalf("重复外部id应去重为 1 个 op,得到 %d: %+v", len(ops), ops)
	}
}

// ── 用户匹配策略 ──

func TestPlanUserSync_BindByPhone(t *testing.T) {
	fetched := []ExternalUser{{ExternalID: "dd001", Name: "张三", Mobile: "13800000001", DeptExtID: "10"}}
	existing := []ExistingUser{
		{ID: 5, Username: "zhangsan", Phone: "13800000001", Nickname: "", Status: 1, IDSource: "local"},
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, map[string]struct{}{"zhangsan": {}}, func(string) *uint { return nil })
	if len(ops) != 1 || ops[0].Op != UserOpBind {
		t.Fatalf("手机号命中应产出 bind op,得到 %+v", ops)
	}
	if ops[0].LocalID != 5 || ops[0].ExternalID != "dd001" {
		t.Errorf("bind 应绑定到既有用户 5,得到 %+v", ops[0])
	}
}

func TestPlanUserSync_MatchByExternalIDNoChange(t *testing.T) {
	fetched := []ExternalUser{{ExternalID: "dd001", Name: "张三", Mobile: "13800000001"}}
	existing := []ExistingUser{
		{ID: 5, ExternalID: "dd001", IDSource: "dingtalk", Username: "13800000001", Phone: "13800000001", Nickname: "张三", Status: 1},
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, nil, func(string) *uint { return nil })
	if len(ops) != 0 {
		t.Fatalf("已绑定且资料未变不应产出 ops(幂等),得到 %+v", ops)
	}
}

func TestPlanUserSync_UpdateWhenChanged(t *testing.T) {
	fetched := []ExternalUser{{ExternalID: "dd001", Name: "张三丰", Mobile: "13800000001"}}
	existing := []ExistingUser{
		{ID: 5, ExternalID: "dd001", IDSource: "dingtalk", Username: "13800000001", Phone: "13800000001", Nickname: "张三", Status: 1},
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, nil, func(string) *uint { return nil })
	if len(ops) != 1 || ops[0].Op != UserOpUpdate || ops[0].Nickname != "张三丰" {
		t.Fatalf("昵称变化应产出 update op,得到 %+v", ops)
	}
}

func TestPlanUserSync_CreateUsernameFromMobile(t *testing.T) {
	fetched := []ExternalUser{{ExternalID: "dd002", Name: "李四", Mobile: "13800000002", DeptExtID: "10"}}
	existing := []ExistingUser{}
	depts := map[string]uint{"10": 7}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, map[string]struct{}{},
		func(dept string) *uint { v := depts[dept]; return &v })
	if len(ops) != 1 || ops[0].Op != UserOpCreate {
		t.Fatalf("无匹配应产出 create op,得到 %+v", ops)
	}
	if ops[0].Username != "13800000002" {
		t.Errorf("新建用户名应为手机号,得到 %s", ops[0].Username)
	}
	if ops[0].Remark != "来自钉钉同步" {
		t.Errorf("remark 应标来源,得到 %s", ops[0].Remark)
	}
	if ops[0].DeptID == nil || *ops[0].DeptID != 7 {
		t.Errorf("主部门应映射到本地 7,得到 %+v", ops[0].DeptID)
	}
}

func TestPlanUserSync_MobileTakenFallsBackToPrefix(t *testing.T) {
	// 手机号不是用户 phone(不同字段)但已被占用为 username → 前缀兜底
	fetched := []ExternalUser{{ExternalID: "dd003", Name: "王五", Mobile: "13800000003"}}
	existing := []ExistingUser{
		{ID: 6, Username: "13800000003", Phone: "13900000000", IDSource: "local"}, // username=该手机号的他人账号
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, map[string]struct{}{"13800000003": {}},
		func(string) *uint { return nil })
	if len(ops) != 1 || ops[0].Op != UserOpCreate {
		t.Fatalf("应产出 create,得到 %+v", ops)
	}
	if ops[0].Username != "dingtalk_dd003" {
		t.Errorf("手机号被占应回退平台前缀用户名,得到 %s", ops[0].Username)
	}
}

func TestPlanUserSync_NoMobileUsesPrefix(t *testing.T) {
	fetched := []ExternalUser{{ExternalID: "ou_x9", Name: "飞书用户", Mobile: ""}}
	ops := PlanUserSync("feishu", "飞书", nil, nil, nil, func(string) *uint { return nil })
	_ = ops
	ops = PlanUserSync("feishu", "飞书", fetched, nil, nil, func(string) *uint { return nil })
	if len(ops) != 1 || ops[0].Username != "feishu_ou_x9" {
		t.Fatalf("无手机号应回退 feishu_<open_id>,得到 %+v", ops)
	}
}

func TestPlanUserSync_DisableMissing(t *testing.T) {
	existing := []ExistingUser{
		{ID: 5, ExternalID: "dd001", IDSource: "dingtalk", Username: "a", Status: 1},
		{ID: 6, ExternalID: "dd002", IDSource: "dingtalk", Username: "b", Status: 1},
	}
	fetched := []ExternalUser{{ExternalID: "dd001", Name: "还在"}} // dd002 消失
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, nil, func(string) *uint { return nil })
	var disabled bool
	for _, op := range ops {
		if op.Op == UserOpDisable {
			disabled = true
			if op.LocalID != 6 {
				t.Errorf("消失人员应为 6,得到 %+v", op)
			}
		}
	}
	if !disabled {
		t.Fatalf("消失人员应产出 disable op,得到 %+v", ops)
	}
}

func TestPlanUserSync_OtherPlatformBoundUserNotRebound(t *testing.T) {
	// 用户已绑定 wecom,钉钉同手机号 → 不覆盖其他平台绑定(bind 前执行层再校验;
	// 规划层产出 bind,由执行层拒改)
	fetched := []ExternalUser{{ExternalID: "dd009", Name: "赵六", Mobile: "13800000009"}}
	existing := []ExistingUser{
		{ID: 9, Username: "zhaoliu", Phone: "13800000009", IDSource: model.IDSourceWecom, ExternalID: "wecom01", Status: 1},
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, existing, nil, func(string) *uint { return nil })
	if len(ops) != 1 || ops[0].Op != UserOpBind {
		t.Fatalf("手机号命中应产出 bind(执行层拒改他平台绑定),得到 %+v", ops)
	}
}

func TestPlanUserSync_DupFetchedDeduped(t *testing.T) {
	fetched := []ExternalUser{
		{ExternalID: "dd001", Name: "张三", Mobile: "13800000001"},
		{ExternalID: "dd001", Name: "张三", Mobile: "13800000001"}, // 多部门重复出现
	}
	ops := PlanUserSync("dingtalk", "钉钉", fetched, nil, nil, func(string) *uint { return nil })
	if len(ops) != 1 {
		t.Fatalf("重复外部id用户应去重,得到 %d: %+v", len(ops), ops)
	}
}

// ── 用户名选取 ──

func TestPickUsername(t *testing.T) {
	t.Run("手机号优先", func(t *testing.T) {
		if got := PickUsername("dingtalk", "d1", "13800000001", nil); got != "13800000001" {
			t.Errorf("得到 %s", got)
		}
	})
	t.Run("手机号被占回退前缀", func(t *testing.T) {
		got := PickUsername("dingtalk", "d1", "13800000001", map[string]struct{}{"13800000001": {}})
		if got != "dingtalk_d1" {
			t.Errorf("得到 %s", got)
		}
	})
	t.Run("前缀也被占追加序号", func(t *testing.T) {
		taken := map[string]struct{}{"dingtalk_d1": {}, "dingtalk_d1-2": {}}
		if got := PickUsername("dingtalk", "d1", "", taken); got != "dingtalk_d1-3" {
			t.Errorf("得到 %s", got)
		}
	})
	t.Run("外部id特殊字符被清洗", func(t *testing.T) {
		if got := PickUsername("feishu", "ou_a$b!", "", nil); got != "feishu_ou_ab" {
			t.Errorf("得到 %s", got)
		}
	})
}

// ── 部门 op 辅助 ──

func TestResolveParentLocal(t *testing.T) {
	m := map[string]uint{"10": 7}
	if v := resolveParentLocal(m, ""); v != 0 {
		t.Errorf("空父应 0,得到 %d", v)
	}
	if v := resolveParentLocal(m, "10"); v != 7 {
		t.Errorf("应映射 7,得到 %d", v)
	}
	if v := resolveParentLocal(m, "404"); v != 0 {
		t.Errorf("未映射应兜底 0,得到 %d", v)
	}
}
