package service

// lead_auto_assign.go P-F5 线索自动分配。
// 线索入公海(官网留言/抖音广告同步等)后按 sys_config 规则自动派给跟进人;
// 另提供后台手动批量分配入口(公海领取式 + 私海转移式)。
//
// 规则存 sys_config 两条:
//   - crm.lead.auto_assign_enabled(bool):总开关,默认关
//   - crm.lead.auto_assign_rules(json):规则数组,按序取第一条「所有非空条件均命中」的规则
//
// v1 匹配维度 = 来源/等级/行业(crm_lead 无 region 字段,区域维度明确不做);
// 条件留空 = 该维度不限制;单条规则 Enabled=false 视为停用。
// 目标用户不可用(不存在/软删/禁用)时跳过该条继续尝试下一条规则。

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"qzt-go-server/internal/model/base"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// sys_config 配置键。
const (
	AutoAssignEnabledKey = "crm.lead.auto_assign_enabled"
	AutoAssignRulesKey   = "crm.lead.auto_assign_rules"
)

// 自动分配进公海原因 / 批量分配进公海原因(写 crm_lead.pool_reason)。
const (
	poolReasonAutoAssign = "自动分配"
	poolReasonBatch      = "批量分配"
)

// AutoAssignRule 单条规则(存 sys_config crm.lead.auto_assign_rules,JSON 数组)。
// 匹配语义:按数组顺序取第一条「所有非空条件均命中」的规则;条件留空=该维度不限制。
// v1 维度=来源/等级/行业(crm_lead 无 region 字段,区域维度明确不做)。
type AutoAssignRule struct {
	Source   string `json:"source"`   // 来源(实际入库值:官网留言/抖音广告/字典"1"~"4"/"99"等)
	Level    string `json:"level"`    // A/B/C,空=不限
	Industry string `json:"industry"` // 行业值,空=不限
	UserID   uint   `json:"user_id"`  // 分配目标
	Enabled  bool   `json:"enabled"`  // 单条启停
}

// LoadAutoAssignConfig 读取自动分配配置:总开关 + 规则数组。
// 规则 JSON 解析失败返回可读 error(调用方记日志后按无规则处理)。
func LoadAutoAssignConfig(ctx context.Context) (bool, []AutoAssignRule, error) {
	enabled := cfgBool(ctx, AutoAssignEnabledKey, false)
	raw := strings.TrimSpace(setting.Get(ctx, AutoAssignRulesKey))
	if raw == "" {
		return enabled, nil, nil
	}
	var rules []AutoAssignRule
	if err := json.Unmarshal([]byte(raw), &rules); err != nil {
		return enabled, nil, fmt.Errorf("自动分配规则 JSON 解析失败:%v", err)
	}
	return enabled, rules, nil
}

// AutoAssignService 线索自动分配服务。
type AutoAssignService struct {
	repo        *crrepo.LeadRepo
	historyRepo *crrepo.LeadOwnerHistoryRepo
	userRepo    *repository.UserRepo
}

func NewAutoAssignService() *AutoAssignService {
	return &AutoAssignService{
		repo:        crrepo.NewLeadRepo(),
		historyRepo: crrepo.NewLeadOwnerHistoryRepo(),
		userRepo:    repository.NewUserRepo(),
	}
}

// AssignNewPoolLead 新入公海线索自动分配(线索创建后调用,可放 goroutine)。
// 总开关关闭或线索不在公海(OwnerID 非空)时直接返回;命中规则后公海领取式落私海,
// 失败仅记日志不 panic(异步场景无调用方可回传错误)。
// history.operator_id=0 表示系统自动操作(区别于人工领取/转移记录当前用户ID)。
func (s *AutoAssignService) AssignNewPoolLead(ctx context.Context, lead *crmmodel.CrmLead) {
	enabled, rules, err := LoadAutoAssignConfig(ctx)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "线索自动分配:%v", err)
		return
	}
	if !enabled || len(rules) == 0 {
		return
	}
	// 仅处理公海线索(OwnerID=nil),已带负责人的线索不重复分配
	if lead == nil || lead.InPool != crmmodel.InPoolPublic || lead.OwnerID != nil {
		return
	}
	target := s.matchRule(ctx, rules, lead)
	if target == 0 {
		xlogger.InfofCtx(ctx, "线索自动分配:线索 %d 未命中启用规则或目标用户不可用", lead.ID)
		return
	}
	now := time.Now()
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		lead.OwnerID = &target
		lead.InPool = crmmodel.InPoolPrivate
		lead.PoolID = nil
		lead.CollectionTime = xtime.NewNullDateTimeFromTime(now)
		lead.PoolReason = poolReasonAutoAssign
		if err := s.repo.Update(ctx, lead); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
			LeadID: lead.ID, OwnerID: &target, Action: crmmodel.OwnerActionTake,
			OperatorID: 0, // 0=系统自动
		})
	})
	if err != nil {
		xlogger.ErrorfCtx(ctx, "线索自动分配:线索 %d 分配给用户 %d 失败: %v", lead.ID, target, err)
		return
	}
	s.notifyAssigned(ctx, target, "新线索自动分配",
		"「"+lead.Name+"」已按规则自动分配给您，请及时跟进")
	xlogger.InfofCtx(ctx, "线索自动分配:线索 %d 已按规则自动分配给用户 %d", lead.ID, target)
}

// BatchAssign 批量分配线索给指定用户(公海领取式 + 私海转移式),逐条 continue-on-error。
// 私海线索须通过数据权限校验(datascope.CanAccessOwner,按当前操作人视角);已转化线索跳过。
// operatorID 为当前操作人(自动/系统操作传 0)。ids 超 200 或目标用户不可用整体报错。
func (s *AutoAssignService) BatchAssign(ctx context.Context, ids []uint, toUserID, operatorID uint) (assigned, failed int, err error) {
	if len(ids) == 0 {
		return 0, 0, errors.New("请选择要分配的线索")
	}
	if len(ids) > 200 {
		return 0, 0, errors.New("单次批量分配不能超过 200 条")
	}
	if toUserID == 0 {
		return 0, 0, errors.New("请选择分配目标用户")
	}
	if !s.userEnabled(ctx, toUserID) {
		return 0, 0, errors.New("分配目标用户不存在或已禁用")
	}
	for _, id := range ids {
		if s.assignOne(ctx, id, toUserID, operatorID) {
			assigned++
		} else {
			failed++
		}
	}
	return assigned, failed, nil
}

// assignOne 分配单条线索:公海走领取式(TAKE),私海走转移式(TRANSFER,需数据权限放行)。
// 返回 false 表示该条失败(continue-on-error 语义)。
func (s *AutoAssignService) assignOne(ctx context.Context, id, toUserID, operatorID uint) bool {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		xlogger.InfofCtx(ctx, "线索批量分配:线索 %d 不存在,跳过", id)
		return false
	}
	// 已转化线索不可再分配
	if lead.Status == crmmodel.LeadStatusConverted {
		return false
	}
	now := time.Now()
	if lead.InPool == crmmodel.InPoolPublic {
		// 公海 → pick 式落私海
		err = repository.Transaction(ctx, func(ctx context.Context) error {
			lead.OwnerID = &toUserID
			lead.InPool = crmmodel.InPoolPrivate
			lead.PoolID = nil
			lead.CollectionTime = xtime.NewNullDateTimeFromTime(now)
			lead.PoolReason = poolReasonBatch
			if err := s.repo.Update(ctx, lead); err != nil {
				return err
			}
			return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
				LeadID: id, OwnerID: &toUserID, Action: crmmodel.OwnerActionTake,
				OperatorID: operatorID,
			})
		})
	} else {
		// 私海 → owner 改写;数据权限校验(body ids 无法走 :id 守卫,在此逐条校验)
		owner := uint(0)
		if lead.OwnerID != nil {
			owner = *lead.OwnerID
		}
		if !datascope.CanAccessOwner(ctx, owner) {
			return false
		}
		err = repository.Transaction(ctx, func(ctx context.Context) error {
			lead.OwnerID = &toUserID
			if err := s.repo.Update(ctx, lead); err != nil {
				return err
			}
			return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
				LeadID: id, OwnerID: &toUserID, Action: crmmodel.OwnerActionTransfer,
				OperatorID: operatorID,
			})
		})
	}
	if err != nil {
		xlogger.ErrorfCtx(ctx, "线索批量分配:线索 %d 分配给用户 %d 失败: %v", id, toUserID, err)
		return false
	}
	s.notifyAssigned(ctx, toUserID, "线索分配", "「"+lead.Name+"」已分配给您，请及时跟进")
	return true
}

// matchRule 按数组顺序匹配第一条启用且全维度命中的规则,并校验目标用户可用;
// 目标用户不可用(不存在/软删/禁用)时尝试下一条规则。未命中返回 0。
func (s *AutoAssignService) matchRule(ctx context.Context, rules []AutoAssignRule, lead *crmmodel.CrmLead) uint {
	for _, rule := range rules {
		if !rule.Enabled || rule.UserID == 0 {
			continue
		}
		// 非空维度精确等值,留空=不限制
		if rule.Source != "" && rule.Source != lead.Source {
			continue
		}
		if rule.Level != "" && rule.Level != lead.Level {
			continue
		}
		if rule.Industry != "" && rule.Industry != lead.Industry {
			continue
		}
		if !s.userEnabled(ctx, rule.UserID) {
			continue
		}
		return rule.UserID
	}
	return 0
}

// userEnabled 校验目标用户存在且启用(sys_user status=1,软删行被 GORM 自动过滤)。
func (s *AutoAssignService) userEnabled(ctx context.Context, userID uint) bool {
	u, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || u == nil {
		return false
	}
	return u.Status == base.StatusEnabled
}

// notifyAssigned 分配通知双发:站内信走注入客户端(落 oa_message,演示模式外推被拦时仍有落点),
// SSE/企微外推走 notify.Dispatch;失败仅记日志。
func (s *AutoAssignService) notifyAssigned(ctx context.Context, userID uint, title, content string) {
	if err := newMessageClient().SendSystemMessageWithPath(ctx, userID, title, content, "/crm/lead"); err != nil {
		xlogger.ErrorfCtx(ctx, "线索分配通知站内信发送失败 user=%d: %v", userID, err)
	}
	notify.Dispatch(ctx, userID, title, content, "/crm/lead")
}
