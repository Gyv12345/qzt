// engine.go 自动化工作流执行引擎(P27):图遍历 + 轨迹记录 + 防重入。
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	wfmodel "qzt-go-server/internal/model/workflow"
	wfrepo "qzt-go-server/internal/repository/workflow"
	"qzt-go-server/pkg/xlogger"
)

// Engine 工作流执行引擎。
type Engine struct {
	defRepo *wfrepo.DefinitionRepo
	runRepo *wfrepo.RunRepo
	// running 同一工作流防重入(defID → true)
	running sync.Map
}

// defaultEngine 包级引擎单例。
var defaultEngine = &Engine{
	defRepo: wfrepo.NewDefinitionRepo(),
	runRepo: wfrepo.NewRunRepo(),
}

// DefaultEngine 引擎访问器(MCP/handler 用)。
func DefaultEngine() *Engine { return defaultEngine }

// RunDefinition 运行一次工作流(同步执行,返回 run 记录)。
// source: MANUAL/CRON/EVENT;payload: 触发上下文(模板 {{payload.xxx}} 的取值来源)。
func (e *Engine) RunDefinition(ctx context.Context, defID uint, source string, payload map[string]any) (*wfmodel.WorkflowRun, error) {
	def, err := e.defRepo.GetByID(ctx, defID)
	if err != nil {
		return nil, fmt.Errorf("工作流不存在: %w", err)
	}
	// 手动运行允许对未启用流做测试;定时/事件只跑已启用的
	if def.Enabled != 1 && source != wfmodel.TriggerManual {
		return nil, fmt.Errorf("工作流未启用")
	}
	// 防重入
	if _, busy := e.running.LoadOrStore(defID, struct{}{}); busy {
		return nil, fmt.Errorf("工作流正在运行中,跳过本次触发")
	}
	defer e.running.Delete(defID)

	payloadJSON, _ := json.Marshal(payload)
	run := &wfmodel.WorkflowRun{
		DefinitionID:   defID,
		TriggerSource:  source,
		TriggerPayload: string(payloadJSON),
		Status:         wfmodel.RunStatusRunning,
	}
	if err := e.runRepo.Create(ctx, run); err != nil {
		return nil, fmt.Errorf("创建执行记录失败: %w", err)
	}

	start := time.Now()
	trace, execErr := e.runGraph(ctx, def.Graph, payload)

	run.Status = wfmodel.RunStatusSuccess
	run.NodeTrace = mustJSON(trace)
	errMsg := ""
	if execErr != nil {
		run.Status = wfmodel.RunStatusFailed
		errMsg = truncRunes(execErr.Error(), 900)
	}
	run.Error = errMsg
	run.CostMs = time.Since(start).Milliseconds()
	if uerr := e.runRepo.Finish(ctx, run.ID, run.Status, run.NodeTrace, errMsg, run.CostMs); uerr != nil {
		xlogger.ErrorfCtx(ctx, "回写执行记录失败 run=%d: %v", run.ID, uerr)
	}
	_ = e.defRepo.UpdateRunStats(ctx, defID, time.Now())
	if execErr != nil {
		return run, execErr
	}
	return run, nil
}

// RunAsync 异步执行(事件/定时触发用,不阻塞发布方主链路)。
// 防重入冲突时等待重试(最多 5 次×600ms),避免连续事件被静默丢弃。
func (e *Engine) RunAsync(defID uint, source string, payload map[string]any) {
	go func() {
		ctx := context.Background()
		defer func() {
			if r := recover(); r != nil {
				xlogger.ErrorfCtx(context.Background(), "工作流异步执行 panic def=%d: %v", defID, r)
			}
		}()
		for i := 0; i < 5; i++ {
			_, err := e.RunDefinition(ctx, defID, source, payload)
			if err == nil {
				return
			}
			if strings.Contains(err.Error(), "正在运行中") {
				time.Sleep(600 * time.Millisecond)
				continue
			}
			xlogger.ErrorfCtx(ctx, "工作流异步执行失败 def=%d source=%s: %v", defID, source, err)
			return
		}
		xlogger.ErrorfCtx(context.Background(), "工作流连续触发被防重入拦下(重试超限) def=%d", defID)
	}()
}

// runGraph 图遍历执行:从 TRIGGER 出发沿边走,CONDITION 选分支,ACTION 逐步执行。
func (e *Engine) runGraph(ctx context.Context, graphJSON string, payload map[string]any) ([]wfmodel.NodeTrace, error) {
	g, err := ValidateGraph(graphJSON)
	if err != nil {
		return nil, err
	}
	rc := &runCtx{payload: payload, outputs: map[string]map[string]any{}}
	outEdges := map[string][]wfmodel.GraphLink{}
	for _, l := range g.Links {
		outEdges[l.From] = append(outEdges[l.From], l)
	}
	for _, l := range outEdges {
		sort.Slice(l, func(i, j int) bool { return l[i].Sort < l[j].Sort })
	}
	byNumber := map[string]wfmodel.GraphNode{}
	for _, n := range g.Nodes {
		byNumber[n.Number] = n
	}

	var trace []wfmodel.NodeTrace
	cur := triggerNumber(g)
	if cur == "" {
		return trace, fmt.Errorf("图中缺少 TRIGGER 节点")
	}
	// 单节点图(仅触发器)直接成功
	if len(g.Nodes) == 1 {
		return trace, nil
	}
	const maxSteps = 100
	steps := 0
	for cur != "" && steps < maxSteps {
		steps++
		node := byNumber[cur]
		switch node.NodeType {
		case wfmodel.NodeTypeTrigger:
			edges := outEdges[cur]
			if len(edges) == 0 {
				cur = ""
				continue
			}
			cur = edges[0].To
		case wfmodel.NodeTypeAction:
			fn, ok := stepRegistry[str(node.Config["action"])]
			if !ok {
				trace = append(trace, failedTrace(node, fmt.Errorf("未知动作类型: %v", node.Config["action"])))
				return trace, fmt.Errorf("未知动作类型: %v", node.Config["action"])
			}
			out, err := fn(ctx, node, rc)
			if err != nil {
				trace = append(trace, failedTrace(node, err))
				return trace, err
			}
			rc.outputs[cur] = out
			trace = append(trace, okTrace(node, out))
			edges := outEdges[cur]
			if len(edges) == 0 {
				cur = ""
				continue
			}
			cur = edges[0].To
		case wfmodel.NodeTypeCondition:
			edges := outEdges[cur]
			if len(edges) < 2 {
				trace = append(trace, failedTrace(node, fmt.Errorf("CONDITION 出边不足")))
				return trace, fmt.Errorf("CONDITION 出边不足: %s", cur)
			}
			var cc wfmodel.ConditionConfig
			raw, _ := json.Marshal(node.Config)
			_ = json.Unmarshal(raw, &cc)
			next := ""
			branch := ""
			for i := 0; i < len(edges)-1; i++ {
				if i >= len(cc.Branches) {
					break
				}
				br := cc.Branches[i]
				if evalBool(cc.Logic, br.Conditions, rc) {
					next = edges[i].To
					branch = br.Label
					break
				}
			}
			if next == "" {
				branch = "默认"
				next = edges[len(edges)-1].To
			}
			rc.outputs[cur] = stepOut{"branch": branch}
			trace = append(trace, okTrace(node, rc.outputs[cur]))
			cur = next
		}
	}
	return trace, nil
}

// triggerNumber 找 TRIGGER 节点编号。
func triggerNumber(g wfmodel.Graph) string {
	for _, n := range g.Nodes {
		if n.NodeType == wfmodel.NodeTypeTrigger {
			return n.Number
		}
	}
	return ""
}

// okTrace/failedTrace 轨迹项构造。
func okTrace(node wfmodel.GraphNode, out stepOut) wfmodel.NodeTrace {
	return wfmodel.NodeTrace{Number: node.Number, Name: node.Name, NodeType: node.NodeType, Status: "SUCCESS", Output: out}
}
func failedTrace(node wfmodel.GraphNode, err error) wfmodel.NodeTrace {
	return wfmodel.NodeTrace{Number: node.Number, NodeType: node.NodeType, Status: "FAILED", Error: err.Error()}
}

// mustJSON 序列化兜底。
func mustJSON(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}
