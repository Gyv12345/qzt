package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

// design_validate.go 流程设计图形校验(纯函数,保存前拦截非法拓扑)。
//
// 背景:2026-08-16 走查发现生产存在「单个条件节点(空规则)连两条边到两个审批节点」的流程——
// 运行时 getNextNode 对这种形态不会求值条件(出边目标全是普通节点时按 sort 走第一条),
// 第二条分支永远不可达。以下规则在保存时即拒绝这类设计:
//
//  1. 恰好 1 个 START;END 不允许有出边。
//  2. 连线引用的节点必须存在。
//  3. 条件节点(CONDITION)必须配置至少 1 条非空规则(字段/操作符/值齐全)。
//  4. 条件节点出边必须恰好 1 条(一个条件只指向一个分支走向)。
//  5. 分叉(出边 ≥2,含 START——设计器在「开始→结束」上插条件即产生 START 分叉)必须由
//     条件驱动:至少一条出边指向条件节点;非条件目标至多 1 条(兜底分支,即「都不满足走它」)。

const (
	nodeTypeStart     = "START"
	nodeTypeEnd       = "END"
	nodeTypeApprover  = "APPROVER"
	nodeTypeCondition = "CONDITION"
)

// ValidateDesignGraph 校验设计图拓扑,返回首个违规的中文描述。
func ValidateDesignGraph(req *SaveDesignRequest) error {
	if req == nil || len(req.Nodes) == 0 {
		return errors.New("流程设计为空")
	}

	byNumber := make(map[string]NodeDesign, len(req.Nodes))
	startCnt := 0
	for _, n := range req.Nodes {
		if n.Number == "" {
			return fmt.Errorf("存在未编号的节点(%s),请重新设计", n.Name)
		}
		if _, dup := byNumber[n.Number]; dup {
			return fmt.Errorf("节点编号重复:%s", n.Number)
		}
		byNumber[n.Number] = n
		if n.NodeType == nodeTypeStart {
			startCnt++
		}
	}
	if startCnt != 1 {
		return fmt.Errorf("流程必须恰好有 1 个开始节点,当前 %d 个", startCnt)
	}
	if !hasNodeType(byNumber, nodeTypeEnd) {
		return errors.New("流程缺少结束节点")
	}

	// 条件配置索引 + 规则校验
	condByNode := make(map[string]string, len(req.Conditions))
	for _, c := range req.Conditions {
		condByNode[c.NodeNumber] = c.ConditionConfig
	}

	// 出边统计
	outLinks := make(map[string][]string) // from number → to numbers
	for _, l := range req.Links {
		if _, ok := byNumber[l.FromNodeNumber]; !ok {
			return fmt.Errorf("连线引用了不存在的节点:%s", l.FromNodeNumber)
		}
		if _, ok := byNumber[l.ToNodeNumber]; !ok {
			return fmt.Errorf("连线引用了不存在的节点:%s", l.ToNodeNumber)
		}
		outLinks[l.FromNodeNumber] = append(outLinks[l.FromNodeNumber], l.ToNodeNumber)
	}

	for _, n := range req.Nodes {
		outs := outLinks[n.Number]

		if n.NodeType == nodeTypeEnd && len(outs) > 0 {
			return fmt.Errorf("结束节点(%s)不允许有出边", n.Name)
		}

		if n.NodeType == nodeTypeCondition {
			if len(outs) != 1 {
				return fmt.Errorf("条件节点「%s」必须恰好连出 1 条线(一个条件只指向一个分支),当前 %d 条", n.Name, len(outs))
			}
			cfg := condByNode[n.Number]
			if err := validateConditionRules(n.Name, cfg); err != nil {
				return err
			}
		}

		// 分叉校验:出边 ≥2 的普通节点必须由条件驱动
		if len(outs) >= 2 && n.NodeType != nodeTypeCondition {
			condTargets, plainTargets := 0, 0
			for _, to := range outs {
				if byNumber[to].NodeType == nodeTypeCondition {
					condTargets++
				} else {
					plainTargets++
				}
			}
			if condTargets == 0 {
				return fmt.Errorf("节点「%s」分出 %d 条线但没有条件分支——普通节点分叉必须由条件节点决定走向,请把分支改为条件节点", n.Name, len(outs))
			}
			if plainTargets > 1 {
				return fmt.Errorf("节点「%s」的分叉中非条件分支有 %d 条,至多 1 条(作为兜底),否则无法判断走哪条", n.Name, plainTargets)
			}
		}
	}
	return nil
}

// validateConditionRules 校验条件节点的规则配置非空且字段齐全。
func validateConditionRules(nodeName, cfgJSON string) error {
	if strings.TrimSpace(cfgJSON) == "" {
		return fmt.Errorf("条件节点「%s」未配置任何条件规则,请选中节点在右侧添加", nodeName)
	}
	var cfg conditionConfig
	if err := json.Unmarshal([]byte(cfgJSON), &cfg); err != nil {
		return fmt.Errorf("条件节点「%s」的规则配置无法解析,请重新配置", nodeName)
	}
	if len(cfg.Conditions) == 0 {
		return fmt.Errorf("条件节点「%s」未配置任何条件规则,请选中节点在右侧添加", nodeName)
	}
	for i, c := range cfg.Conditions {
		if strings.TrimSpace(c.Field) == "" {
			return fmt.Errorf("条件节点「%s」第 %d 条规则未选择字段", nodeName, i+1)
		}
		if strings.TrimSpace(c.Op) == "" {
			return fmt.Errorf("条件节点「%s」第 %d 条规则未选择比较方式", nodeName, i+1)
		}
		if strings.TrimSpace(c.Value) == "" {
			return fmt.Errorf("条件节点「%s」第 %d 条规则未填写比较值", nodeName, i+1)
		}
	}
	return nil
}

func hasNodeType(byNumber map[string]NodeDesign, nodeType string) bool {
	for _, n := range byNumber {
		if n.NodeType == nodeType {
			return true
		}
	}
	return false
}
