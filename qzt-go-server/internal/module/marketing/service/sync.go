package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	mktmodel "qzt-go-server/internal/model/marketing"
	oasvc "qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/pkg/oceanengine"
	"qzt-go-server/internal/repository"
	mktrepo "qzt-go-server/internal/repository/marketing"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// sync.go 飞鱼线索同步:token 续期 → 增量拉取 → 去重 → 入 CRM 线索公海 → 汇总通知。
//
// 落库模式照抄官网留言(public_contact.go):直连 repo 建 CrmLead,
// Source 写中文字符串「抖音广告」,入公海(InPool=1)不设 PoolID,OwnerID=nil。
//
// 三道去重闸门:
//  1. marketing_lead_log uk(account_id, external_id) —— 跨轮同步幂等(重叠窗口重复拉取不二次入库)
//  2. crm_lead.phone 精确匹配 —— 同手机号已有线索则跳过,日志标记「重复跳过」
//  3. numbergen 线索编号天然唯一

const (
	// firstSyncWindow 首次同步(无游标)的默认回看窗口,避免一次拉入历史全量。
	firstSyncWindow = 24 * time.Hour
	// overlapWindow 游标回拨量,容忍巨量侧线索延迟上报;重复由 uk 兜底。
	overlapWindow = 5 * time.Minute
	// tokenRefreshAhead access_token 剩余寿命低于该值即刷新。
	tokenRefreshAhead = time.Minute
	// leadPageSize / leadMaxPages 分页拉取参数与安全上限。
	leadPageSize = 100
	leadMaxPages = 50
)

// SyncService 线索同步服务。
type SyncService struct {
	accountRepo *mktrepo.AccountRepo
	logRepo     *mktrepo.LeadLogRepo
	newClient   func(oceanengine.Config) *oceanengine.Client
}

func NewSyncService() *SyncService {
	return NewSyncServiceWithClientFactory(oceanengine.NewClient)
}

// NewSyncServiceWithClientFactory 指定巨量客户端工厂构造同步服务。
// 供集成测试注入指向 mock 服务器的客户端;生产代码用 NewSyncService。
func NewSyncServiceWithClientFactory(factory func(oceanengine.Config) *oceanengine.Client) *SyncService {
	return &SyncService{
		accountRepo: mktrepo.NewAccountRepo(),
		logRepo:     mktrepo.NewLeadLogRepo(),
		newClient:   factory,
	}
}

// SyncResult 一轮同步的结果统计。
type SyncResult struct {
	Inserted int `json:"inserted"` // 新入库线索数
	Skipped  int `json:"skipped"`  // 重复跳过数(外部ID重复 + 手机号重复)
	Failed   int `json:"failed"`   // 失败数
}

// SyncAccount 同步单个账号的飞鱼线索。定时任务与手动「立即同步」共用。
func (s *SyncService) SyncAccount(ctx context.Context, accountID uint) (*SyncResult, error) {
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, errors.New("账号不存在")
	}
	if account.Status != mktmodel.AccountStatusAuthed {
		return nil, errors.New("账号未授权,请先完成 OAuth 授权")
	}

	client := s.newClient(oceanengine.Config{AppID: account.AppID, AppSecret: account.AppSecret})

	// 1. token 临期则刷新;刷新失败 → 授权失效 + 通知超管
	if account.TokenExpiresAt == nil || time.Until(account.TokenExpiresAt.Time()) < tokenRefreshAhead {
		if err := s.refreshToken(ctx, account, client); err != nil {
			return nil, err
		}
	}

	// 2. 广告主列表(token 响应未带时兜底拉一次并持久化)
	advertiserIDs := splitIDs(account.AdvertiserIDs)
	if len(advertiserIDs) == 0 {
		ids, err := client.GetAdvertisers(ctx, account.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("获取已授权广告主失败: %w", err)
		}
		if len(ids) == 0 {
			return nil, errors.New("该应用未授权任何广告主账户")
		}
		account.AdvertiserIDs = joinIDs(ids)
		if err := s.accountRepo.Update(ctx, account); err != nil {
			return nil, fmt.Errorf("保存广告主列表失败: %w", err)
		}
		advertiserIDs = ids
	}

	// 3. 增量窗口:游标回拨 5 分钟;首次同步回看 24h
	end := time.Now()
	start := end.Add(-firstSyncWindow)
	if account.LastSyncAt != nil {
		start = account.LastSyncAt.Time().Add(-overlapWindow)
	}

	// 4. 分页拉取并逐条入库
	result := &SyncResult{}
	for _, advID := range advertiserIDs {
		if err := s.pullAdvertiser(ctx, account, client, advID, start, end, result); err != nil {
			return nil, fmt.Errorf("拉取广告主 %s 线索失败: %w", advID, err)
		}
	}

	// 5. 推进游标(即使 0 条也推进,避免窗口原地踏步)
	now := xtime.Now()
	account.LastSyncAt = &now
	if err := s.accountRepo.Update(ctx, account); err != nil {
		xlogger.ErrorfCtx(ctx, "营销账号 %d 更新同步游标失败: %v", account.ID, err)
	}

	// 6. 本轮有新线索则汇总通知超管(每轮一条,不逐条轰炸)
	if result.Inserted > 0 {
		s.notifySuperAdmins(ctx, result.Inserted)
	}
	return result, nil
}

// refreshToken 刷新 access/refresh token 并落库;失败则标记授权失效并通知超管。
func (s *SyncService) refreshToken(ctx context.Context, account *mktmodel.MarketingAccount, client *oceanengine.Client) error {
	if account.RefreshToken == "" {
		return s.markExpired(ctx, account, "缺少刷新令牌,请重新授权")
	}
	bundle, err := client.RefreshToken(ctx, account.RefreshToken)
	if err != nil {
		return s.markExpired(ctx, account, "刷新访问令牌失败: "+err.Error())
	}
	account.AccessToken = bundle.AccessToken
	account.RefreshToken = bundle.RefreshToken
	account.TokenExpiresAt = toDateTimePtr(time.Now().Add(time.Duration(bundle.ExpiresIn) * time.Second))
	account.RefreshExpiresAt = toDateTimePtr(time.Now().Add(time.Duration(bundle.RefreshExpiresIn) * time.Second))
	if err := s.accountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("保存新令牌失败: %w", err)
	}
	return nil
}

// markExpired 标记账号授权失效 + 通知超管,并返回给调用方的错误。
func (s *SyncService) markExpired(ctx context.Context, account *mktmodel.MarketingAccount, reason string) error {
	account.Status = mktmodel.AccountStatusExpired
	if err := s.accountRepo.Update(ctx, account); err != nil {
		xlogger.ErrorfCtx(ctx, "营销账号 %d 标记授权失效失败: %v", account.ID, err)
	}
	msg := fmt.Sprintf("营销渠道账号「%s」抖音授权已失效(%s),请到「营销-渠道账号」重新授权,期间线索暂停同步", account.Name, reason)
	s.sendToSuperAdmins(ctx, "⚠️ 抖音线索同步中断", msg, "/marketing/account")
	return errors.New(reason)
}

// pullAdvertiser 拉取单个广告主在 [start, end] 窗口内的线索并逐条处理。
func (s *SyncService) pullAdvertiser(ctx context.Context, account *mktmodel.MarketingAccount, client *oceanengine.Client, advertiserID string, start, end time.Time, result *SyncResult) error {
	for page := 1; page <= leadMaxPages; page++ {
		leads, total, err := client.ListLeads(ctx, account.AccessToken, advertiserID, start, end, page, leadPageSize)
		if err != nil {
			return err
		}
		for i := range leads {
			s.ingestOne(ctx, account, &leads[i], result)
		}
		if page*leadPageSize >= total || len(leads) == 0 {
			return nil
		}
	}
	xlogger.ErrorfCtx(ctx, "营销账号 %d 广告主 %s 拉取页数超过安全上限 %d,剩余线索下轮继续", account.ID, advertiserID, leadMaxPages)
	return nil
}

// ingestOne 处理单条线索:幂等插日志 → 手机号查重 → 建 CRM 线索。
func (s *SyncService) ingestOne(ctx context.Context, account *mktmodel.MarketingAccount, ext *oceanengine.ExternalLead, result *SyncResult) {
	if ext.ExternalID == "" {
		result.Failed++
		return
	}
	log := &mktmodel.MarketingLeadLog{
		AccountID:    account.ID,
		ExternalID:   ext.ExternalID,
		Name:         ext.Name,
		Phone:        ext.Phone,
		Company:      ext.Company,
		CampaignName: ext.CampaignName,
		AdName:       ext.AdName,
		Status:       mktmodel.LogStatusInserted,
		Raw:          string(ext.Raw),
	}
	if !ext.CreateTime.IsZero() {
		t := xtime.NewDateTime(ext.CreateTime)
		log.LeadCreateTime = &t
	}

	// 闸门 1:外部 ID 幂等(跨轮重复拉取直接跳过,不重复计数)
	exists, err := s.logRepo.TryInsert(ctx, log)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "营销线索日志插入失败(account=%d external=%s): %v", account.ID, ext.ExternalID, err)
		result.Failed++
		return
	}
	if exists {
		return
	}

	// 闸门 2:手机号查重(空手机号不查,直接入库)
	if ext.Phone != "" && s.phoneExistsInLeads(ctx, ext.Phone) {
		_ = s.logRepo.FillResult(ctx, log.ID, nil, mktmodel.LogStatusDup, "手机号已存在线索,跳过入库")
		result.Skipped++
		return
	}

	// 建 CRM 线索(公海,照抄官网留言落库模式)
	lead, err := s.createLead(ctx, ext)
	if err != nil {
		_ = s.logRepo.FillResult(ctx, log.ID, nil, mktmodel.LogStatusFailed, "创建线索失败: "+truncate(err.Error(), 200))
		xlogger.ErrorfCtx(ctx, "营销线索入库失败(account=%d external=%s): %v", account.ID, ext.ExternalID, err)
		result.Failed++
		return
	}
	_ = s.logRepo.FillResult(ctx, log.ID, &lead.ID, mktmodel.LogStatusInserted, "")
	result.Inserted++
}

// createLead 外部线索 → CrmLead(公海,新建状态)。
func (s *SyncService) createLead(ctx context.Context, ext *oceanengine.ExternalLead) (*crmmodel.CrmLead, error) {
	leadNo, _ := numbergen.Generate(ctx, "lead")

	name := ext.Name
	if ext.Company != "" && ext.Name != "" {
		name = ext.Company + "-" + ext.Name
	}
	if name == "" {
		name = "抖音线索-" + ext.ExternalID
	}

	remark := fmt.Sprintf("抖音广告线索 | 计划:%s | 广告:%s", ext.CampaignName, ext.AdName)

	lead := &crmmodel.CrmLead{
		Name:        name,
		LeadNo:      leadNo,
		ContactName: ext.Name,
		Phone:       ext.Phone,
		Email:       ext.Email,
		Company:     ext.Company,
		Source:      "抖音广告",
		Status:      crmmodel.LeadStatusNew,
		InPool:      crmmodel.InPoolPublic,
		Remark:      remark,
	}
	if err := repository.DBFrom(ctx).Create(lead).Error; err != nil {
		return nil, err
	}
	return lead, nil
}

// phoneExistsInLeads 检查手机号是否已存在于线索表(软删行不计)。
func (s *SyncService) phoneExistsInLeads(ctx context.Context, phone string) bool {
	var n int64
	if err := repository.DBFrom(ctx).Model(&crmmodel.CrmLead{}).
		Where("phone = ?", phone).
		Count(&n).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "营销线索手机号查重失败(phone=%s): %v", phone, err)
		return false // 查重失败放行,宁多勿丢
	}
	return n > 0
}

// notifySuperAdmins 汇总通知超管:本轮新增 N 条抖音线索。
func (s *SyncService) notifySuperAdmins(ctx context.Context, inserted int) {
	content := fmt.Sprintf("本轮同步新增 %d 条抖音线索,已入线索公海,请安排销售及时领取跟进", inserted)
	s.sendToSuperAdmins(ctx, "📢 抖音线索新到", content, "/crm/lead-pool")
}

// sendToSuperAdmins 向全部启用的超管用户发站内信(含 SSE + 企微分发)。
// 查询逻辑照抄官网留言的 notifyAdminsNewLead。
func (s *SyncService) sendToSuperAdmins(ctx context.Context, title, content, path string) {
	var userIDs []uint
	if err := repository.DBFrom(ctx).
		Table("sys_user_role AS ur").
		Joins("JOIN sys_role AS r ON r.id = ur.sys_role_id").
		Joins("JOIN sys_user AS u ON u.id = ur.sys_user_id").
		Where("r.code = ? AND u.status = 1 AND u.deleted_at IS NULL", "super_admin").
		Pluck("ur.sys_user_id", &userIDs).Error; err != nil || len(userIDs) == 0 {
		return
	}
	msgSvc := oasvc.NewMessageService()
	for _, uid := range userIDs {
		if err := msgSvc.SendSystemMessageWithPath(ctx, uid, title, content, path); err != nil {
			xlogger.ErrorfCtx(ctx, "营销模块通知用户 %d 失败: %v", uid, err)
		}
	}
}

// ── 小工具 ──

// toDateTimePtr time.Time → *xtime.DateTime。
func toDateTimePtr(t time.Time) *xtime.DateTime {
	d := xtime.NewDateTime(t)
	return &d
}

// splitIDs 逗号分隔的 ID 串 → 切片。
func splitIDs(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := parts[:0]
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// joinIDs ID 切片 → 逗号分隔串。
func joinIDs(ids []string) string { return strings.Join(ids, ",") }

// truncate 截断字符串到 n 字节(错误信息入日志表防超长)。
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
