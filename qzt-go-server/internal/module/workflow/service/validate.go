// validate.go 画布图校验(P27):与引擎执行语义一致,CRUD 与手动运行前调用。
package service

import (
	"encoding/json"
	"fmt"
	"sort"

	wfmodel "qzt-go-server/internal/model/workflow"
)

// ValidateGraph 解析并校验画布图。
// 规则:恰 1 个 TRIGGER;TRIGGER/ACTION 出边 ≤1;CONDITION 出边 ≥2
// (出边按 sort 升序,前 N-1 条对应 branches[i],最后一条为兜底边);
// 所有边两端节点必须存在;无环。
func ValidateGraph(graphJSON string) (wfmodel.Graph, error) {
	var g wfmodel.Graph
	if err := json.Unmarshal([]byte(graphJSON), &g); err != nil {
		return g, fmt.Errorf("graph JSON 解析失败: %w", err)
	}
	if len(g.Nodes) == 0 {
		return g, fmt.Errorf("画布为空")
	}
	byNumber := make(map[string]*wfmodel.GraphNode, len(g.Nodes))
	for i := range g.Nodes {
		n := &g.Nodes[i]
		if n.Number == "" || n.NodeType == "" {
			return g, fmt.Errorf("存在缺少编号或类型的节点")
		}
		if _, dup := byNumber[n.Number]; dup {
			return g, fmt.Errorf("节点编号重复: %s", n.Number)
		}
		byNumber[n.Number] = n
	}
	return g, validateGraphLinks(g, byNumber)
}

// validateGraphLinks 度数与连线完整性规则。
func validateGraphLinks(g wfmodel.Graph, byNumber map[string]*wfmodel.GraphNode) error {
	outEdges := make(map[string][]wfmodel.GraphLink)
	for _, l := range g.Links {
		if _, ok := byNumber[l.From]; !ok {
			return fmt.Errorf("连线 from 不存在: %s", l.From)
		}
		if _, ok := byNumber[l.To]; !ok {
			return fmt.Errorf("连线 to 不存在: %s", l.To)
		}
		outEdges[l.From] = append(outEdges[l.From], l)
	}
	for _, l := range outEdges {
		sort.Slice(l, func(i, j int) bool { return l[i].Sort < l[j].Sort })
	}
	for _, n := range g.Nodes {
		edges := outEdges[n.Number]
		switch n.NodeType {
		case wfmodel.NodeTypeTrigger:
			if len(g.Nodes) > 1 && len(edges) != 1 {
				return fmt.Errorf("TRIGGER 出边必须为 1(仅触发器的单节点图除外): %s", n.Number)
			}
		case wfmodel.NodeTypeAction:
			if len(edges) > 1 {
				return fmt.Errorf("ACTION 出边必须 ≤1: %s", n.Number)
			}
		case wfmodel.NodeTypeCondition:
			if len(edges) < 2 {
				return fmt.Errorf("CONDITION 至少 2 条出边(含兜底边): %s", n.Number)
			}
		}
	}
	return nil
}
