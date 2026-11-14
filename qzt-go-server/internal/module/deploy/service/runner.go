package service

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"qzt-go-server/pkg/xlogger"
)

// targetStatus.Status 取值。
const (
	StatusRunning = "running"
	StatusSuccess = "success"
	StatusFailed  = "failed"
)

// 脚本路径/日志目录为服务端常量,绝不使用客户端输入构造(安全红线)。
const (
	scriptPath = "/opt/qzt-server/bin/rebuild_static.sh"
	logDir     = "/opt/qzt-server/logs"
	logTailN   = 30
)

// targetWorkDir target 白名单 → 构建工作目录映射;命令参数只取此处常量。
// 2026-11-13 独立站(storefront)并入 CMS 双主题后已下线,仅剩 cms 单目标。
var targetWorkDir = map[string]string{
	"cms": "/opt/qzt-cms",
}

// TargetStatus 单个目标的最近一次重建状态。
type TargetStatus struct {
	Target     string   `json:"target"`
	Status     string   `json:"status"` // running/success/failed
	StartedAt  string   `json:"started_at"`
	FinishedAt string   `json:"finished_at"`
	LogFile    string   `json:"log_file"`
	LogTail    []string `json:"log_tail"` // 末 30 行
}

// StatusResponse GET /deploy/status 返回体。
type StatusResponse struct {
	Running       string                   `json:"running"` // ""=空闲,否则为正在执行的 target
	LastPerTarget map[string]*TargetStatus `json:"last_per_target"`
}

// Runner 静态站重建执行器。进程内单例:全局互斥,同一时刻只允许一个 target 在跑。
type Runner struct {
	mu      sync.Mutex
	running string // ""=空闲
	last    map[string]*TargetStatus
}

var defaultRunner = &Runner{last: make(map[string]*TargetStatus)}

// GetRunner 返回进程级单例。
func GetRunner() *Runner { return defaultRunner }

// Run 触发一次异步重建。target 非法或已有任务在跑时直接拒绝(不排队)。
func (r *Runner) Run(target string) error {
	if _, ok := targetWorkDir[target]; !ok {
		return fmt.Errorf("未知目标: %s", target)
	}
	r.mu.Lock()
	if r.running != "" {
		r.mu.Unlock()
		return fmt.Errorf("已有重建任务在执行(%s),请等待完成后再试", r.running)
	}
	r.running = target
	r.last[target] = &TargetStatus{
		Target:    target,
		Status:    StatusRunning,
		StartedAt: time.Now().Format(time.DateTime),
	}
	r.mu.Unlock()

	go r.exec(target)
	return nil
}

// Status 查询运行状态与各目标最近一次执行结果。
func (r *Runner) Status() StatusResponse {
	r.mu.Lock()
	defer r.mu.Unlock()
	last := make(map[string]*TargetStatus, len(r.last))
	for k, v := range r.last {
		cp := *v
		last[k] = &cp
	}
	return StatusResponse{Running: r.running, LastPerTarget: last}
}

// finish 落终态并释放 running(加锁写,避免与 Status 并发竞争)。
func (r *Runner) finish(st *TargetStatus, status, logFile string, tail *tailBuffer) {
	r.mu.Lock()
	defer r.mu.Unlock()
	st.Status = status
	st.FinishedAt = time.Now().Format(time.DateTime)
	if logFile != "" {
		st.LogFile = logFile
	}
	if tail != nil {
		st.LogTail = tail.Lines()
	}
	r.running = ""
}

// exec 阻塞执行脚本并落状态。脚本路径/参数均为服务端常量,target 已过白名单校验。
func (r *Runner) exec(target string) {
	r.mu.Lock()
	st := r.last[target]
	r.mu.Unlock()

	quickFail := func(msg string) {
		xlogger.ErrorfCtx(context.Background(), "deploy static rebuild failed target=%s: %s", target, msg)
		r.finish(st, StatusFailed, "", nil)
	}

	// 执行前先确认脚本存在,缺失直接判失败(避免 exec.Command 迷糊报错)
	if _, err := os.Stat(scriptPath); err != nil {
		quickFail("重建脚本不存在: " + scriptPath)
		return
	}
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		quickFail("创建日志目录失败: " + err.Error())
		return
	}

	logFile := filepath.Join(logDir, fmt.Sprintf("rebuild_%s_%s.log", target, time.Now().Format("20060102_150405")))
	f, err := os.Create(logFile)
	if err != nil {
		quickFail("创建日志文件失败: " + err.Error())
		return
	}
	defer f.Close()

	tail := newTailBuffer(logTailN)
	out := io.MultiWriter(f, tail)

	cmd := exec.Command("/bin/bash", scriptPath, target) // #nosec G204 路径/参数均为服务端常量
	cmd.Stdout = out
	cmd.Stderr = out
	runErr := cmd.Run()

	if runErr != nil {
		xlogger.ErrorfCtx(context.Background(), "deploy static rebuild failed target=%s log=%s: %v", target, logFile, runErr)
		r.finish(st, StatusFailed, logFile, tail)
		return
	}
	xlogger.InfofCtx(context.Background(), "deploy static rebuild done target=%s log=%s", target, logFile)
	r.finish(st, StatusSuccess, logFile, tail)
}
