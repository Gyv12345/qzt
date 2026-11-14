// scheduler.go 自动化工作流定时调度器(P27):workflow 专属 robfig/cron 实例。
// 不混入 sys_job 体系:定义保存/启停/删除时按需重载。
package service

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/robfig/cron/v3"

	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// WorkflowScheduler 工作流定时调度器。
type WorkflowScheduler struct {
	mu      sync.Mutex
	cron    *cron.Cron
	entries map[uint]cron.EntryID
	engine  *Engine
}

// globalScheduler 包级调度器单例(ReloadCron 调用它)。
var globalScheduler *WorkflowScheduler

// StartWorkflowScheduler 启动工作流定时调度器(启动时加载全部启用的 CRON 定义)。
func StartWorkflowScheduler(ctx context.Context) {
	globalScheduler = &WorkflowScheduler{
		cron:    cron.New(cron.WithSeconds()),
		entries: map[uint]cron.EntryID{},
		engine:  defaultEngine,
	}
	_ = globalScheduler.reload(ctx)
	globalScheduler.cron.Start()
	xlogger.InfofCtx(ctx, "工作流定时调度器已启动")
}

// ReloadCron 定义保存/启停/删除后重载该工作流的定时注册。
// 传 id<=0 表示全量重载(删除场景)。
func ReloadCron(defID uint) {
	if globalScheduler == nil {
		return
	}
	_ = globalScheduler.reload(context.Background())
}

// reload 全量重载:清空全部注册,重新加载启用的 CRON 定义。
func (s *WorkflowScheduler) reload(ctx context.Context) error {
	s.mu.Lock()
	for _, entry := range s.entries {
		s.cron.Remove(entry)
	}
	s.entries = map[uint]cron.EntryID{}
	s.mu.Unlock()

	var defs []wfmodel.WorkflowDefinition
	err := repository.DBFrom(ctx).
		Where("trigger_type = ? AND enabled = 1 AND deleted_at IS NULL", wfmodel.TriggerCron).
		Find(&defs).Error
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, d := range defs {
		var cfg struct {
			Cron string `json:"cron"`
		}
		_ = json.Unmarshal([]byte(d.TriggerConfig), &cfg)
		if cfg.Cron == "" {
			continue
		}
		defID := d.ID
		fn := func() {
			s.engine.RunAsync(defID, wfmodel.TriggerCron, map[string]any{
				"triggered_at": time.Now().Format("2006-01-02 15:04:05"),
			})
		}
		id, err := s.cron.AddFunc(cfg.Cron, fn)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "工作流 cron 注册失败 def=%d spec=%s: %v", d.ID, cfg.Cron, err)
			continue
		}
		s.entries[defID] = id
	}
	return nil
}
