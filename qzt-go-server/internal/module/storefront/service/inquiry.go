package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
	sfrepo "qzt-go-server/internal/repository/storefront"
	"qzt-go-server/pkg/xlogger"
)

// inquiry.go 独立站询盘:公开提交 → IP 频控 → 校验 → CRM 公海线索 + 询盘落库 → 异步通知超管。

// inquiryLimitPerMinute 每 IP 每分钟最大询盘提交数。
const inquiryLimitPerMinute = 3

// emailRegexp 宽松邮箱校验(拦截明显乱填,不追求 RFC 全兼容)。
var emailRegexp = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// InquiryService 独立站询盘服务。
type InquiryService struct {
	inquiryRepo *sfrepo.InquiryRepo
	sfRepo      *sfrepo.ProductRepo
	leadRepo    *crmrepo.LeadRepo
}

// NewInquiryService 构造。
func NewInquiryService() *InquiryService {
	return &InquiryService{
		inquiryRepo: sfrepo.NewInquiryRepo(),
		sfRepo:      sfrepo.NewProductRepo(),
		leadRepo:    crmrepo.NewLeadRepo(),
	}
}

// InquiryRequest 公开询盘表单。
type InquiryRequest struct {
	// 询盘人姓名
	Name string `json:"name" binding:"required,max=64"`
	// 邮箱(主联系渠道)
	Email string `json:"email" binding:"required,max=100"`
	// 公司名
	Company string `json:"company" binding:"max=128"`
	// 国家/地区
	Country string `json:"country" binding:"max=64"`
	// 询盘内容
	Message string `json:"message" binding:"required,max=2000"`
	// 关联上架位ID(0=通用询盘)
	ProductID uint `json:"product_id"`
	// 提交语言(en/zh,空默认 en)
	Locale string `json:"locale" binding:"max=8"`
}

// CreateInquiry 公开询盘提交:频控 → 校验 → 建 CRM 公海线索 + 询盘行 → 异步通知。
// 返回 CRM 线索编号(前端可用于后续跟进沟通)。
func (s *InquiryService) CreateInquiry(ctx context.Context, ip string, req *InquiryRequest) (string, error) {
	if !s.rateLimitOK(ctx, ip) {
		return "", errors.New("提交过于频繁,请稍后再试")
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Company = strings.TrimSpace(req.Company)
	req.Country = strings.TrimSpace(req.Country)
	req.Message = strings.TrimSpace(req.Message)
	req.Locale = strings.ToLower(strings.TrimSpace(req.Locale))
	if req.Locale == "" {
		req.Locale = "en"
	}
	if req.Name == "" || req.Message == "" {
		return "", errors.New("姓名与询盘内容不能为空")
	}
	if !emailRegexp.MatchString(req.Email) {
		return "", errors.New("邮箱格式不正确")
	}

	// 关联商品可选:须为在架上架位,slug 写进线索备注便于销售对上话
	slug := ""
	if req.ProductID > 0 {
		sp, err := s.sfRepo.GetByID(ctx, req.ProductID)
		if err != nil || sp.Status != sfmodel.ProductStatusOn {
			return "", errors.New("关联商品不存在或已下架")
		}
		slug = sp.Slug
	}

	leadNo, err := numbergen.Generate(ctx, "lead")
	if err != nil {
		return "", err
	}
	// 线索名:有公司名时「公司-姓名」,否则直接用姓名(同官网留言口径)
	leadName := req.Name
	if req.Company != "" {
		leadName = req.Company + "-" + req.Name
	}
	remark := fmt.Sprintf("[独立站询盘 locale=%s", req.Locale)
	if slug != "" {
		remark += " product=" + slug
	}
	remark += "] " + req.Message

	// 必须挂默认线索公海,否则公海页面永远查不到(同官网留言口径)
	var poolID *uint
	var pool crmmodel.CrmLeadPool
	if err := repository.DBFrom(ctx).
		Where("is_default = 1 AND enabled = 1 AND deleted_at IS NULL").
		First(&pool).Error; err == nil {
		poolID = &pool.ID
	}

	lead := &crmmodel.CrmLead{
		Name:        leadName,
		LeadNo:      leadNo,
		ContactName: req.Name,
		Email:       req.Email,
		Company:     req.Company,
		Source:      "独立站询盘",
		Status:      crmmodel.LeadStatusNew,
		InPool:      crmmodel.InPoolPublic,
		PoolID:      poolID,
		Remark:      remark,
	}
	inquiry := &sfmodel.StorefrontInquiry{
		Name:    req.Name,
		Email:   req.Email,
		Company: req.Company,
		Country: req.Country,
		Message: req.Message,
		Locale:  req.Locale,
		IP:      ip,
		Status:  sfmodel.InquiryStatusNew,
		LeadNo:  leadNo,
	}
	if req.ProductID > 0 {
		pid := req.ProductID
		inquiry.ProductID = &pid
	}

	if err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.leadRepo.Create(ctx, lead); err != nil {
			return err
		}
		return s.inquiryRepo.Create(ctx, inquiry)
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站询盘落库失败: %v", err)
		return "", errors.New("提交失败,请稍后重试")
	}

	go notifyAdminsNewInquiry(lead, slug)
	// 邮件通知(补充渠道:通道/收件人未配置静默跳过,失败仅记日志)
	go emailAdminsNewInquiry(context.Background(), lead, slug)
	return lead.LeadNo, nil
}

// rateLimitOK IP 频控:每分钟 inquiryLimitPerMinute 次(Redis 固定窗口;Redis 异常放行)。
func (s *InquiryService) rateLimitOK(ctx context.Context, ip string) bool {
	key := "storefront:inquiry:rl:" + ip
	n, err := cache.GetStore().Incr(key)
	if err != nil {
		return true
	}
	if n == 1 {
		_ = cache.GetStore().Expire(key, time.Minute)
	}
	return n <= inquiryLimitPerMinute
}

// notifyAdminsNewInquiry 异步通知超管用户有新独立站询盘(独立 Background ctx)。
func notifyAdminsNewInquiry(lead *crmmodel.CrmLead, slug string) {
	ctx := context.Background()

	// 查询超管角色用户 ID(sys_user_role 真实列名是 sys_user_id/sys_role_id)
	var userIDs []uint
	err := repository.DBFrom(ctx).
		Table("sys_user_role AS ur").
		Joins("JOIN sys_role AS r ON r.id = ur.sys_role_id").
		Joins("JOIN sys_user AS u ON u.id = ur.sys_user_id").
		Where("r.code = ? AND u.status = 1 AND u.deleted_at IS NULL", "super_admin").
		Pluck("ur.sys_user_id", &userIDs).Error
	if err != nil || len(userIDs) == 0 {
		return
	}

	title := "🌍 新独立站询盘"
	content := fmt.Sprintf("%s(%s)提交了询盘,请前往线索池领取", lead.Name, lead.Email)
	if slug != "" {
		content = fmt.Sprintf("%s(%s)询盘商品 %s,请前往线索池领取", lead.Name, lead.Email, slug)
	}
	for _, uid := range userIDs {
		notify.Dispatch(ctx, uid, title, content, "/crm/lead-pool")
	}
}
