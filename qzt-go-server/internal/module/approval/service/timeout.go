package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	entsvc "qzt-go-server/internal/module/enterprise/service"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// timeout.go 审批超时提醒定时任务(bean_class=approvalTimeoutRemind)。
// 每小时扫描:活跃实例(APPROVING)下 PENDING/APPROVING 且未提醒过(reminded_at 为空)、
// updated_at 早于「当前时间 - 阈值」的待办 → 通知当前审批人 → 置 reminded_at。
// 阈值读 sys_config approval.timeout_hours,默认 48(小时),每任务只提醒一次。

// ApprovalTimeoutHoursKey 审批超时阈值配置键(sys_config,单位小时)。
const ApprovalTimeoutHoursKey = "approval.timeout_hours"

// 超时提醒默认阈值与单轮批量上限。
const (
	defaultTimeoutHours = 48.0
	timeoutBatchLimit   = 200
)

// timeoutThresholdHours 解析超时阈值(纯函数,便于单测):非法/非正数回落默认 48 小时。
func timeoutThresholdHours(raw string) float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return defaultTimeoutHours
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || v <= 0 {
		return defaultTimeoutHours
	}
	return v
}

// formatWaitingDuration 已等待时长描述(纯函数):不足一天按小时,超过一天折"天+小时"。
func formatWaitingDuration(hours float64) string {
	if hours < 1 {
		return "不足1小时"
	}
	if hours < 24 {
		return fmt.Sprintf("%d小时", int(hours))
	}
	days := int(hours) / 24
	remHours := int(hours) % 24
	if remHours > 0 {
		return fmt.Sprintf("%d天%d小时", days, remHours)
	}
	return fmt.Sprintf("%d天", days)
}

// approvalTimeoutRemindJob 审批超时提醒任务处理器(sys_job.bean_class=approvalTimeoutRemind)。
type approvalTimeoutRemindJob struct{}

func (j *approvalTimeoutRemindJob) Execute(ctx context.Context) error {
	return NewApprovalTimeoutService().RemindTimeout(ctx)
}

// init 注册定时任务处理器。approval/service 包已被 main.go import,init 必然执行。
func init() {
	entsvc.RegisterJobHandler("approvalTimeoutRemind", &approvalTimeoutRemindJob{})
}

// ApprovalTimeoutService 审批超时提醒服务。
type ApprovalTimeoutService struct {
	taskRepo     *apprrepo.TaskRepo
	instanceRepo *apprrepo.InstanceRepo
	nodeRepo     *apprrepo.NodeRepo
	userRepo     *repository.UserRepo
}

func NewApprovalTimeoutService() *ApprovalTimeoutService {
	return &ApprovalTimeoutService{
		taskRepo:     apprrepo.NewTaskRepo(),
		instanceRepo: apprrepo.NewInstanceRepo(),
		nodeRepo:     apprrepo.NewNodeRepo(),
		userRepo:     repository.NewUserRepo(),
	}
}

// RemindTimeout 扫描超时待办并发提醒。单轮批量上限 timeoutBatchLimit,
// 未发成功的任务不置 reminded_at,下轮自然重试;错误仅记日志不中断(定时任务语义)。
func (s *ApprovalTimeoutService) RemindTimeout(ctx context.Context) error {
	hours := timeoutThresholdHours(setting.Get(ctx, ApprovalTimeoutHoursKey))
	before := xtime.NewDateTime(time.Now().Add(-time.Duration(hours * float64(time.Hour))))
	tasks, err := s.taskRepo.ListTimeoutPending(ctx, before, timeoutBatchLimit)
	if err != nil {
		return err
	}
	if len(tasks) == 0 {
		return nil
	}

	// 批量取实例(标题/发起人)与节点名
	instIDs := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		instIDs = append(instIDs, t.InstanceID)
	}
	instances, _ := s.instanceRepo.ListByIDs(ctx, instIDs)
	instMap := make(map[uint]*apprmodel.ApprovalInstance, len(instances))
	for i := range instances {
		instMap[instances[i].ID] = &instances[i]
	}
	titleMap := fetchResourceTitles(ctx, instances)
	nodeMap := s.nodeNames(ctx, tasks)

	msg := newEnterpriseMessageClient()
	now := xtime.NewDateTime(time.Now())
	reminded := make([]uint, 0, len(tasks))
	for i := range tasks {
		t := &tasks[i]
		inst := instMap[t.InstanceID]
		if inst == nil {
			continue
		}
		content := s.buildRemindContent(ctx, inst, t, titleMap, nodeMap[t.NodeID])
		if err := msg.SendSystemMessageWithPath(ctx, t.ApproverID, "审批超时提醒", content, "/approval/todo"); err != nil {
			// 发送失败不置 reminded_at,下轮重试
			xlogger.ErrorfCtx(ctx, "审批超时提醒发送失败 task=%d approver=%d: %v", t.ID, t.ApproverID, err)
			continue
		}
		reminded = append(reminded, t.ID)
	}
	if len(reminded) == 0 {
		return nil
	}
	if err := s.taskRepo.MarkReminded(ctx, reminded, now); err != nil {
		xlogger.ErrorfCtx(ctx, "审批超时提醒置位失败 count=%d: %v", len(reminded), err)
	}
	xlogger.InfofCtx(ctx, "审批超时提醒完成: 本轮提醒 %d 条(阈值 %.0f 小时)", len(reminded), hours)
	return nil
}

// buildRemindContent 组装提醒正文:单据名 + 当前节点 + 发起人 + 已等待时长(不含敏感数据)。
func (s *ApprovalTimeoutService) buildRemindContent(ctx context.Context, inst *apprmodel.ApprovalInstance,
	t *apprmodel.ApprovalTask, titleMap map[string]string, nodeName string) string {
	typeLabel := formTypeLabel[inst.Type]
	if typeLabel == "" {
		typeLabel = inst.Type
	}
	title := titleMap[fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)]
	subject := typeLabel
	if title != "" {
		subject = fmt.Sprintf("%s「%s」", typeLabel, title)
	}
	waited := formatWaitingDuration(time.Since(time.Time(t.UpdatedAt)).Hours())
	content := fmt.Sprintf("单据 %s 在节点「%s」等待您审批已超过 %s,请及时处理", subject, nodeName, waited)
	if name := userDisplayName(ctx, s.userRepo, inst.SubmitterID); name != fmt.Sprintf("#%d", inst.SubmitterID) {
		content += ",发起人:" + name
	}
	return content + "。"
}

// nodeNames 批量取任务对应节点名(去重后逐个查,单轮最多 timeoutBatchLimit 条)。
func (s *ApprovalTimeoutService) nodeNames(ctx context.Context, tasks []apprmodel.ApprovalTask) map[uint]string {
	seen := make(map[uint]bool)
	out := make(map[uint]string, len(tasks))
	for _, t := range tasks {
		if seen[t.NodeID] {
			continue
		}
		seen[t.NodeID] = true
		if n, err := s.nodeRepo.GetByID(ctx, t.NodeID); err == nil && n != nil {
			out[t.NodeID] = n.Name
		}
	}
	return out
}
