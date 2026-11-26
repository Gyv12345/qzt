package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"gorm.io/gorm"

	mpmodel "qzt-go-server/internal/model/mp"
	syssvc "qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/pkg/wxmp"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// account.go 公众号账号管理：CRUD + secret 脱敏回显。
// 口径：接口层 AppSecret 恒回 ****+尾4（syservice.MaskSecret，与 AI 平台管理同风格）；
// 更新时空串或 **** 开头=保留原值，明文=替换；新建必须填明文。
// 删除=软删（repo.Delete 走 GORM 软删），不额外拦截文章引用。

// AccountService 公众号账号服务。
type AccountService struct{}

func NewAccountService() *AccountService { return &AccountService{} }

// SaveAccountRequest 账号新增/编辑入参（enabled 指针=不传时新建默认 1、更新保留原值）。
type SaveAccountRequest struct {
	Name        string `json:"name"`
	AccountType string `json:"account_type"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	Enabled     *int8  `json:"enabled"`
}

// MpAccountItem 账号对外视图（AppSecret 脱敏为 ****+尾4，空则空串）。
type MpAccountItem struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	AccountType string         `json:"account_type"`
	AppID       string         `json:"app_id"`
	AppSecret   string         `json:"app_secret"`
	Enabled     int8           `json:"enabled"`
	CreatedAt   xtime.DateTime `json:"created_at"`
	UpdatedAt   xtime.DateTime `json:"updated_at"`
}

// List 账号全量列表（运营中心账号量小，不分页）。
func (s *AccountService) List(ctx context.Context) ([]*MpAccountItem, error) {
	list, err := repository.NewMpAccountRepo().List(ctx, &repository.QueryOptions{Order: []string{"id ASC"}})
	if err != nil {
		return nil, err
	}
	items := make([]*MpAccountItem, 0, len(list))
	for i := range list {
		items = append(items, toItem(&list[i]))
	}
	return items, nil
}

// Create 新建账号。app_secret 必填明文（空串/**** 脱敏值均拒绝——新建没有原值可保留）。
func (s *AccountService) Create(ctx context.Context, req *SaveAccountRequest) (*MpAccountItem, error) {
	if err := req.validate(); err != nil {
		return nil, err
	}
	secret := strings.TrimSpace(req.AppSecret)
	if secret == "" {
		return nil, errors.New("app_secret 必填（新建账号需填写明文 AppSecret）")
	}
	if strings.HasPrefix(secret, "****") {
		return nil, errors.New("app_secret 不能是脱敏值，请填写明文 AppSecret")
	}
	m := &mpmodel.Account{
		Name:        strings.TrimSpace(req.Name),
		AccountType: req.AccountType,
		AppID:       strings.TrimSpace(req.AppID),
		AppSecret:   secret,
		Enabled:     enabledOrDefault(req.Enabled, 1),
	}
	if err := repository.NewMpAccountRepo().Create(ctx, m); err != nil {
		return nil, err
	}
	return toItem(m), nil
}

// Update 更新账号。app_secret 语义：空串=保留原值（前端编辑表单留空即不改）；
// **** 开头=保留原值（前端原样回传脱敏值）；明文=替换。enabled 不传=保留原值。
func (s *AccountService) Update(ctx context.Context, id uint, req *SaveAccountRequest) (*MpAccountItem, error) {
	acc, err := repository.NewMpAccountRepo().GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("账号不存在")
		}
		return nil, err
	}
	if err := req.validate(); err != nil {
		return nil, err
	}

	acc.Name = strings.TrimSpace(req.Name)
	acc.AccountType = req.AccountType
	acc.AppID = strings.TrimSpace(req.AppID)
	fields := []string{"name", "account_type", "app_id"}
	if req.Enabled != nil {
		acc.Enabled = *req.Enabled
		fields = append(fields, "enabled")
	}
	secret := strings.TrimSpace(req.AppSecret)
	if secret != "" && !strings.HasPrefix(secret, "****") {
		acc.AppSecret = secret
		fields = append(fields, "app_secret")
	}
	if err := repository.NewMpAccountRepo().Update(ctx, acc, fields...); err != nil {
		return nil, err
	}
	return toItem(acc), nil
}

// Delete 软删账号。
func (s *AccountService) Delete(ctx context.Context, id uint) error {
	return repository.NewMpAccountRepo().Delete(ctx, id)
}

// validate 账号入参校验（名称/类型/AppID；secret 规则因新建与更新语义不同，各自处理）。
func (r *SaveAccountRequest) validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("账号名称不能为空")
	}
	if r.AccountType != "sub" && r.AccountType != "srv" {
		return errors.New("account_type 必须是 sub(订阅号) 或 srv(服务号)")
	}
	if strings.TrimSpace(r.AppID) == "" {
		return errors.New("app_id 不能为空")
	}
	return nil
}

// enabledOrDefault enabled 指针缺省时取默认值。
func enabledOrDefault(p *int8, def int8) int8 {
	if p == nil {
		return def
	}
	return *p
}

// toItem 模型 → 脱敏视图。
func toItem(acc *mpmodel.Account) *MpAccountItem {
	return &MpAccountItem{
		ID:          acc.ID,
		Name:        acc.Name,
		AccountType: acc.AccountType,
		AppID:       acc.AppID,
		AppSecret:   syssvc.MaskSecret(acc.AppSecret),
		Enabled:     acc.Enabled,
		CreatedAt:   acc.CreatedAt,
		UpdatedAt:   acc.UpdatedAt,
	}
}

// ── 账号 → wxmp 客户端（文章推送与菜单管理共用） ──

// mpAccountExtra mp_account.extra JSON 的扩展字段（默认封面永久素材 media_id 等）。
type mpAccountExtra struct {
	ThumbMediaID string `json:"thumb_media_id"` // 可为空=首次推草稿时自动上传内置封面并缓存
}

// newClientFor 从账号行构建 wxmp 客户端（token 缓存按 secret 哈希隔离，多号并存安全）。
func newClientFor(acc *mpmodel.Account) *wxmp.Client {
	var extra mpAccountExtra
	_ = json.Unmarshal([]byte(acc.Extra), &extra)
	return wxmp.NewClient(wxmp.Config{
		AppID:        acc.AppID,
		Secret:       acc.AppSecret,
		ThumbMediaID: extra.ThumbMediaID,
	})
}

// loadAccountClient 载入账号并构建 wxmp 客户端（不存在/停用均给出可操作错误）。
func loadAccountClient(ctx context.Context, accountID uint) (*wxmp.Client, error) {
	acc, err := repository.NewMpAccountRepo().GetByID(ctx, accountID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("公众号账号不存在")
		}
		return nil, err
	}
	if acc.Enabled != 1 {
		return nil, errors.New("公众号账号已停用，请先在账号管理启用")
	}
	if acc.AppID == "" || acc.AppSecret == "" {
		return nil, errors.New("公众号配置不完整（AppID/Secret 未填写）")
	}
	return newClientFor(acc), nil
}
