package service

import (
	"strings"
	"testing"
)

// design_validate_test.go 流程设计图形校验用例(纯函数,无 DB)。
// 核心回归:单个条件节点双出边 / 空条件规则 这两类生产踩过的非法形态必须被拒绝。

func mkReq(nodes []NodeDesign, conds []ConditionsDesign, links []LinkDesign) *SaveDesignRequest {
	return &SaveDesignRequest{Nodes: nodes, Conditions: conds, Links: links}
}

var linearNodes = []NodeDesign{
	{Number: "s", Name: "开始", NodeType: nodeTypeStart, Sort: 1},
	{Number: "a", Name: "审批", NodeType: nodeTypeApprover, Sort: 2},
	{Number: "e", Name: "结束", NodeType: nodeTypeEnd, Sort: 3},
}

var linearLinks = []LinkDesign{
	{FromNodeNumber: "s", ToNodeNumber: "a"},
	{FromNodeNumber: "a", ToNodeNumber: "e"},
}

func condCfg(rules string) string {
	return `{"logic":"AND","conditions":[` + rules + `]}`
}

func TestValidateDesignGraph_OK(t *testing.T) {
	// 规范条件分叉:开始 → [条件(金额>1万) + 兜底(部门领导)],条件满足走经理审批
	req := mkReq(
		[]NodeDesign{
			{Number: "s", Name: "开始", NodeType: nodeTypeStart, Sort: 1},
			{Number: "c1", Name: "金额大于1万", NodeType: nodeTypeCondition, Sort: 2},
			{Number: "m", Name: "经理审批", NodeType: nodeTypeApprover, Sort: 3},
			{Number: "d", Name: "部门领导审批", NodeType: nodeTypeApprover, Sort: 4},
			{Number: "e", Name: "结束", NodeType: nodeTypeEnd, Sort: 5},
		},
		[]ConditionsDesign{{NodeNumber: "c1", ConditionConfig: condCfg(`{"field":"total_amount","op":"GT","value":"10000"}`)}},
		[]LinkDesign{
			{FromNodeNumber: "s", ToNodeNumber: "c1"},
			{FromNodeNumber: "s", ToNodeNumber: "d"}, // 非条件目标=兜底分支
			{FromNodeNumber: "c1", ToNodeNumber: "m"},
			{FromNodeNumber: "m", ToNodeNumber: "e"},
			{FromNodeNumber: "d", ToNodeNumber: "e"},
		},
	)
	if err := ValidateDesignGraph(req); err != nil {
		t.Fatalf("合法的条件分叉+兜底被误拒: %v", err)
	}

	// 纯直线流程
	if err := ValidateDesignGraph(mkReq(linearNodes, nil, linearLinks)); err != nil {
		t.Fatalf("合法直线流程被误拒: %v", err)
	}

	// 全条件分叉(无兜底)也合法(规则互斥完备场景)
	req2 := mkReq(
		[]NodeDesign{
			{Number: "s", Name: "开始", NodeType: nodeTypeStart},
			{Number: "c1", Name: "条件A", NodeType: nodeTypeCondition},
			{Number: "c2", Name: "条件B", NodeType: nodeTypeCondition},
			{Number: "m", Name: "经理审批", NodeType: nodeTypeApprover},
			{Number: "d", Name: "部门审批", NodeType: nodeTypeApprover},
			{Number: "e", Name: "结束", NodeType: nodeTypeEnd},
		},
		[]ConditionsDesign{
			{NodeNumber: "c1", ConditionConfig: condCfg(`{"field":"amount","op":"GT","value":"100"}`)},
			{NodeNumber: "c2", ConditionConfig: condCfg(`{"field":"amount","op":"LTE","value":"100"}`)},
		},
		[]LinkDesign{
			{FromNodeNumber: "s", ToNodeNumber: "c1"},
			{FromNodeNumber: "s", ToNodeNumber: "c2"},
			{FromNodeNumber: "c1", ToNodeNumber: "m"},
			{FromNodeNumber: "c2", ToNodeNumber: "d"},
			{FromNodeNumber: "m", ToNodeNumber: "e"},
			{FromNodeNumber: "d", ToNodeNumber: "e"},
		},
	)
	if err := ValidateDesignGraph(req2); err != nil {
		t.Fatalf("全条件分叉被误拒: %v", err)
	}
}

// 回归:生产踩过的形态——单个条件节点(空规则)连两条边到两个审批节点。
func TestValidateDesignGraph_RejectBrokenFork(t *testing.T) {
	brokenNodes := []NodeDesign{
		{Number: "s", Name: "开始", NodeType: nodeTypeStart, Sort: 1},
		{Number: "n1", Name: "金额条件判断", NodeType: nodeTypeCondition, Sort: 2},
		{Number: "n2", Name: "部门领导审批", NodeType: nodeTypeApprover, Sort: 3},
		{Number: "n3", Name: "经理审批", NodeType: nodeTypeApprover, Sort: 4},
		{Number: "e", Name: "结束", NodeType: nodeTypeEnd, Sort: 5},
	}
	brokenLinks := []LinkDesign{
		{FromNodeNumber: "s", ToNodeNumber: "n1"},
		{FromNodeNumber: "n1", ToNodeNumber: "n2"},
		{FromNodeNumber: "n1", ToNodeNumber: "n3"},
		{FromNodeNumber: "n2", ToNodeNumber: "e"},
		{FromNodeNumber: "n3", ToNodeNumber: "e"},
	}
	err := ValidateDesignGraph(mkReq(brokenNodes, nil, brokenLinks))
	if err == nil || !strings.Contains(err.Error(), "恰好连出 1 条线") {
		t.Fatalf("条件节点双出边未被拒绝: %v", err)
	}
	// 即使只连一条边,空规则也要拒绝
	oneEdgeNodes := []NodeDesign{
		{Number: "s", Name: "开始", NodeType: nodeTypeStart, Sort: 1},
		{Number: "n1", Name: "金额条件判断", NodeType: nodeTypeCondition, Sort: 2},
		{Number: "n2", Name: "部门领导审批", NodeType: nodeTypeApprover, Sort: 3},
		{Number: "e", Name: "结束", NodeType: nodeTypeEnd, Sort: 4},
	}
	oneEdge := []LinkDesign{
		{FromNodeNumber: "s", ToNodeNumber: "n1"},
		{FromNodeNumber: "n1", ToNodeNumber: "n2"},
		{FromNodeNumber: "n2", ToNodeNumber: "e"},
	}
	err = ValidateDesignGraph(mkReq(oneEdgeNodes, nil, oneEdge))
	if err == nil || !strings.Contains(err.Error(), "未配置任何条件规则") {
		t.Fatalf("空条件规则未被拒绝: %v", err)
	}
	// 规则不完整(缺值)
	err = ValidateDesignGraph(mkReq(oneEdgeNodes,
		[]ConditionsDesign{{NodeNumber: "n1", ConditionConfig: condCfg(`{"field":"total_amount","op":"GT","value":""}`)}},
		oneEdge))
	if err == nil || !strings.Contains(err.Error(), "未填写比较值") {
		t.Fatalf("缺值规则未被拒绝: %v", err)
	}
}

func TestValidateDesignGraph_RejectPlainFork(t *testing.T) {
	// 普通节点直接分叉(无条件节点)→ 拒绝(分叉发生在中间审批节点)
	nodes := []NodeDesign{
		{Number: "s", Name: "开始", NodeType: nodeTypeStart},
		{Number: "a", Name: "审批A", NodeType: nodeTypeApprover},
		{Number: "b", Name: "审批B", NodeType: nodeTypeApprover},
		{Number: "e", Name: "结束", NodeType: nodeTypeEnd},
	}
	links := []LinkDesign{
		{FromNodeNumber: "s", ToNodeNumber: "a"},
		{FromNodeNumber: "a", ToNodeNumber: "b"},
		{FromNodeNumber: "a", ToNodeNumber: "e"},
		{FromNodeNumber: "b", ToNodeNumber: "e"},
	}
	err := ValidateDesignGraph(mkReq(nodes, nil, links))
	if err == nil || !strings.Contains(err.Error(), "没有条件分支") {
		t.Fatalf("普通节点分叉未被拒绝: %v", err)
	}

	// 分叉里两条非条件目标 → 拒绝(START 单出边由前一条规则覆盖,此处分叉在中节点)
	links2 := []LinkDesign{
		{FromNodeNumber: "s", ToNodeNumber: "m"},
		{FromNodeNumber: "m", ToNodeNumber: "c"},
		{FromNodeNumber: "m", ToNodeNumber: "a"},
		{FromNodeNumber: "m", ToNodeNumber: "b"},
		{FromNodeNumber: "a", ToNodeNumber: "e"},
		{FromNodeNumber: "b", ToNodeNumber: "e"},
		{FromNodeNumber: "c", ToNodeNumber: "e"},
	}
	nodes2 := []NodeDesign{
		{Number: "s", Name: "开始", NodeType: nodeTypeStart},
		{Number: "m", Name: "中转", NodeType: nodeTypeApprover},
		{Number: "c", Name: "条件", NodeType: nodeTypeCondition},
		{Number: "a", Name: "审批A", NodeType: nodeTypeApprover},
		{Number: "b", Name: "审批B", NodeType: nodeTypeApprover},
		{Number: "e", Name: "结束", NodeType: nodeTypeEnd},
	}
	conds := []ConditionsDesign{{NodeNumber: "c", ConditionConfig: condCfg(`{"field":"x","op":"EQ","value":"1"}`)}}
	err = ValidateDesignGraph(mkReq(nodes2, conds, links2))
	if err == nil || !strings.Contains(err.Error(), "非条件分支") {
		t.Fatalf("双兜底分支未被拒绝: %v", err)
	}
}

func TestValidateDesignGraph_StructureRules(t *testing.T) {
	// 无开始节点
	noStart := []NodeDesign{
		{Number: "a", Name: "审批", NodeType: nodeTypeApprover},
		{Number: "e", Name: "结束", NodeType: nodeTypeEnd},
	}
	if err := ValidateDesignGraph(mkReq(noStart, nil, []LinkDesign{{FromNodeNumber: "a", ToNodeNumber: "e"}})); err == nil || !strings.Contains(err.Error(), "开始节点") {
		t.Fatalf("缺开始节点未被拒绝: %v", err)
	}
	// 结束节点有出边
	links := append([]LinkDesign{}, linearLinks...)
	links = append(links, LinkDesign{FromNodeNumber: "e", ToNodeNumber: "a"})
	if err := ValidateDesignGraph(mkReq(linearNodes, nil, links)); err == nil || !strings.Contains(err.Error(), "结束节点") {
		t.Fatalf("结束节点出边未被拒绝: %v", err)
	}
	// 连线引用不存在节点
	if err := ValidateDesignGraph(mkReq(linearNodes, nil, []LinkDesign{{FromNodeNumber: "s", ToNodeNumber: "ghost"}})); err == nil || !strings.Contains(err.Error(), "不存在") {
		t.Fatalf("幽灵连线未被拒绝: %v", err)
	}
	// 条件配置 JSON 解析失败
	badCfg := []ConditionsDesign{{NodeNumber: "c", ConditionConfig: "{bad"}}
	err := ValidateDesignGraph(mkReq(
		[]NodeDesign{
			{Number: "s", Name: "开始", NodeType: nodeTypeStart},
			{Number: "c", Name: "条件", NodeType: nodeTypeCondition},
			{Number: "e", Name: "结束", NodeType: nodeTypeEnd},
		}, badCfg,
		[]LinkDesign{{FromNodeNumber: "s", ToNodeNumber: "c"}, {FromNodeNumber: "c", ToNodeNumber: "e"}}))
	if err == nil {
		t.Fatal("坏 JSON 条件配置未被拒绝")
	}
}
