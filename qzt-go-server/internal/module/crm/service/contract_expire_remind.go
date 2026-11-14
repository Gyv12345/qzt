package service

// contract_expire_remind.go P30-#2 合同到期提醒定时任务(bean_class=contractExpireRemind)。
// 每日 09:30(sys_job cron 6段式 0 30 9 * * *)扫描:
//   stage IN(SIGNED,EXECUTING) 且 end_date = 今天 + 阈值(天) 且未归档且负责人非空,
//   且当日尚未提醒过(expire_reminded_on 为空或 ≠ 今天) → 通知负责人 → 置 expire_reminded_on 防重。
// 阈值读 sys_config contract.expire_remind_days,默认 30,热生效。

import (
	"context"
	"fmt"
	"time"

	entsvc "qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/pkg/notify"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
)

// ContractExpireRemindDaysKey 合同到期提醒阈值配置键(sys_config,单位天)。
const ContractExpireRemindDaysKey = "contract.expire_remind_days"

// defaultExpireRemindDays 阈值默认 30 天。
const defaultExpireRemindDays = 30

// contractExpireRemindJob 合同到期提醒任务处理器(sys_job.bean_class=contractExpireRemind)。
type contractExpireRemindJob struct{}

func (j *contractExpireRemindJob) Execute(ctx context.Context) error {
	return NewContractExpireService().RemindExpiring(ctx)
}

// init 注册定时任务处理器。crm/service 包已被 main.go import,init 必然执行。
func init() {
	entsvc.RegisterJobHandler("contractExpireRemind", &contractExpireRemindJob{})
}

// ContractExpireService 合同到期提醒服务。
type ContractExpireService struct {
	contractRepo *crrepo.ContractRepo
}

func NewContractExpireService() *ContractExpireService {
	return &ContractExpireService{contractRepo: crrepo.NewContractRepo()}
}

// RemindExpiring 扫描当日到提醒日的合同并发通知。单条失败不置已提醒日,次日自然重试;
// 错误仅记日志不中断(定时任务语义)。
func (s *ContractExpireService) RemindExpiring(ctx context.Context) error {
	days := cfgInt(ctx, ContractExpireRemindDaysKey, defaultExpireRemindDays)
	if days <= 0 {
		xlogger.InfofCtx(ctx, "合同到期提醒:阈值非正数(%d),跳过", days)
		return nil
	}
	target := expireTargetDate(time.Now(), days)
	contracts, err := s.contractRepo.ListForExpireRemind(ctx, target)
	if err != nil {
		return err
	}
	if len(contracts) == 0 {
		xlogger.InfofCtx(ctx, "合同到期提醒:目标日 %s 无待提醒合同", target.Format("2006-01-02"))
		return nil
	}

	reminded := make([]uint, 0, len(contracts))
	for i := range contracts {
		c := &contracts[i]
		if c.OwnerID == nil {
			continue
		}
		daysLeftN := daysLeft(time.Now(), target)
		content := fmt.Sprintf("合同「%s」将于 %s 到期(剩余 %d 天),请及时跟进收尾或续签安排。",
			c.Name, target.Format("2006-01-02"), daysLeftN)
		// 站内信走注入的消息客户端(notify.Dispatch 只有 SSE+企微外推,不落站内信);
		// demo 模式下企微被护栏拦截,站内信是提醒的落地通道,不可省略
		if err := newMessageClient().SendSystemMessageWithPath(ctx, *c.OwnerID, "合同到期提醒", content, "/crm/contract"); err != nil {
			// 发送失败不置位,下轮重试
			xlogger.ErrorfCtx(ctx, "合同到期提醒发送失败 contract=%d owner=%d: %v", c.ID, *c.OwnerID, err)
			continue
		}
		notify.Dispatch(ctx, *c.OwnerID, "合同到期提醒", content, "/crm/contract")
		reminded = append(reminded, c.ID)
	}
	if err := s.contractRepo.MarkExpireReminded(ctx, reminded, target); err != nil {
		xlogger.ErrorfCtx(ctx, "合同到期提醒置位失败 count=%d: %v", len(reminded), err)
	}
	xlogger.InfofCtx(ctx, "合同到期提醒完成:目标日 %s,提醒 %d 条(阈值 %d 天)", target.Format("2006-01-02"), len(reminded), days)
	return nil
}
