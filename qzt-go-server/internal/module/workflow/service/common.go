// common.go 自动化工作流引擎的共享底层:运行上下文/模板渲染/条件求值(P27)。
package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	wfmodel "qzt-go-server/internal/model/workflow"
)

// runCtx 一次工作流执行的运行上下文。
type runCtx struct {
	// 触发参数(事件上下文快照)
	payload map[string]any
	// 各节点输出:节点 number → 输出 map
	outputs map[string]map[string]any
}

// varTpl 模板变量正则:{{ 路径 }}
var varTpl = regexp.MustCompile(`\{\{\s*([^}]+?)\s*\}\}`)

// resolvePath 按点分路径从 ctx 取值:payload.xxx / node.<number>.output.xxx。
func (c *runCtx) resolvePath(path string) (any, bool) {
	parts := strings.Split(path, ".")
	var cur any = map[string]any{"payload": c.payload, "nodes": map[string]any{}}
	for number, out := range c.outputs {
		cur.(map[string]any)["nodes"].(map[string]any)[number] = map[string]any{"output": out}
	}
	for _, p := range parts {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		v, ok := m[p]
		if !ok {
			return nil, false
		}
		cur = v
	}
	return cur, true
}

// renderTpl 对字符串做模板变量替换。解析不到的变量渲染为空串。
func (c *runCtx) renderTpl(s string) string {
	if !strings.Contains(s, "{{") {
		return s
	}
	return varTpl.ReplaceAllStringFunc(s, func(expr string) string {
		path := strings.TrimSpace(varTpl.FindStringSubmatch(expr)[1])
		v, ok := c.resolvePath(path)
		if !ok || v == nil {
			return ""
		}
		switch t := v.(type) {
		case string:
			return t
		case json.Number:
			return t.String()
		case float64:
			// 整数值浮点渲染为整数形态(10.0 → 10)
			if t == float64(int64(t)) {
				return strconv.FormatInt(int64(t), 10)
			}
			return strconv.FormatFloat(t, 'f', -1, 64)
		default:
			return fmt.Sprintf("%v", t)
		}
	})
}

// renderValue 深度渲染:字符串走模板,map/数组递归。
func (c *runCtx) renderValue(v any) any {
	switch t := v.(type) {
	case string:
		return c.renderTpl(t)
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, item := range t {
			out[k] = c.renderValue(item)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = c.renderValue(item)
		}
		return out
	default:
		return v
	}
}

// evalBool 求值一组条件的组合结果(AND/OR)。
func evalBool(logic string, conds []wfmodel.BranchCondition, c *runCtx) bool {
	if len(conds) == 0 {
		return true
	}
	results := make([]bool, 0, len(conds))
	for _, cond := range conds {
		results = append(results, evalCond(cond, c))
	}
	if strings.EqualFold(logic, "OR") {
		for _, r := range results {
			if r {
				return true
			}
		}
		return false
	}
	for _, r := range results {
		if !r {
			return false
		}
	}
	return true
}

// evalCond 单条条件求值。left/right 先模板渲染;数值比较时两侧转浮点,
// 否则按字符串比较。op:EQ/NE/GT/GE/LT/LE/CONTAINS/NOT_EMPTY/EMPTY。
func evalCond(cond wfmodel.BranchCondition, c *runCtx) bool {
	left := c.renderTpl(cond.Left)
	right := c.renderTpl(cond.Right)
	op := strings.ToUpper(cond.Op)
	switch op {
	case "EMPTY":
		return strings.TrimSpace(left) == ""
	case "NOT_EMPTY":
		return strings.TrimSpace(left) != ""
	case "CONTAINS":
		return strings.Contains(left, right)
	}
	// 数值比较(GT/GE/LT/LE/EQ/NE):能转数值按数值,否则按字符串
	ln, lerr := strconv.ParseFloat(left, 64)
	rn, rerr := strconv.ParseFloat(right, 64)
	numOK := lerr == nil && rerr == nil
	cmp := 0
	if numOK {
		switch {
		case ln < rn:
			cmp = -1
		case ln > rn:
			cmp = 1
		}
	} else {
		cmp = strings.Compare(left, right)
	}
	switch op {
	case "GT":
		return cmp > 0
	case "GE":
		return cmp >= 0
	case "LT":
		return cmp < 0
	case "LE":
		return cmp <= 0
	case "NE":
		return cmp != 0
	default: // EQ
		return cmp == 0
	}
}
