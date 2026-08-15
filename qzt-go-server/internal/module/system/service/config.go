package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
)

type ConfigService struct {
	repo *repository.ConfigRepo
}

func NewConfigService() *ConfigService {
	return &ConfigService{repo: repository.NewConfigRepo()}
}

var allowedConfigTypes = map[string]bool{
	"string": true, "int": true, "float": true,
	"bool": true, "text": true, "json": true, "select": true,
}

// validateConfigDef ensures the type is known and, for select, that options is a
// non-empty JSON array — so bad definitions can't reach the DB/UI.
func validateConfigDef(typ, options string) error {
	if !allowedConfigTypes[typ] {
		return fmt.Errorf("不支持的配置类型: %s", typ)
	}
	if typ == "select" {
		if strings.TrimSpace(options) == "" {
			return errors.New("select 类型必须提供选项(options)")
		}
		var arr []json.RawMessage
		if err := json.Unmarshal([]byte(options), &arr); err != nil {
			return errors.New("options 必须是 JSON 数组")
		}
		if len(arr) == 0 {
			return errors.New("select 选项不能为空")
		}
	}
	return nil
}

func (s *ConfigService) List(ctx context.Context, group string) ([]model.SysConfig, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}}
	if group != "" {
		q.Where = map[string]any{"group": group}
	}
	return s.repo.List(ctx, q)
}

type ConfigItem struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value"`
}

// BatchUpdate writes many values in one transaction, then re-syncs the cache.
//
// 对 DB 里尚不存在的 key 采用 upsert 语义:先查是否存在,存在则更新 value,
// 不存在则插入一行。否则一个纯 UPDATE 打在缺失的 key 上会静默影响 0 行,
// 接口仍返回成功 —— numbergen 这类「读不到用默认值、首存才落库」的配置
// (number.{module}.* 不会预先 seed)就会表现为「保存了但不生效」。
func (s *ConfigService) BatchUpdate(ctx context.Context, items []ConfigItem) error {
	if len(items) == 0 {
		return nil
	}
	if err := repository.Transaction(ctx, func(ctx context.Context) error {
		for _, it := range items {
			exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
				Where: map[string]any{"key": it.Key},
			})
			if err != nil {
				return err
			}
			if exists {
				if err := s.repo.UpdateValue(ctx, it.Key, it.Value); err != nil {
					return err
				}
				continue
			}
			// key 不存在 → 插入新行(group 取 key 第一段,如 number.customer.prefix → number)
			if err := s.repo.Create(ctx, &model.SysConfig{
				Key: it.Key, Value: it.Value,
				Group: configGroupFromKey(it.Key), Name: it.Key,
				Type: "string", Editable: true,
			}); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return err
	}
	return setting.RefreshAll(context.Background())
}

// configGroupFromKey 取 key 第一个 '.' 之前的段作为 group(如 number.customer.prefix → number);
// 不含 '.' 则返回空串。
func configGroupFromKey(key string) string {
	if i := strings.IndexByte(key, '.'); i > 0 {
		return key[:i]
	}
	return ""
}

type CreateConfigRequest struct {
	Group    string `json:"group"`
	Key      string `json:"key" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Value    string `json:"value"`
	Type     string `json:"type"`
	Options  string `json:"options"`
	IsPublic bool   `json:"is_public"`
	Remark   string `json:"remark"`
	Sort     int    `json:"sort"`
}

func (s *ConfigService) Create(ctx context.Context, req *CreateConfigRequest) error {
	typ := req.Type
	if typ == "" {
		typ = "string"
	}
	if err := validateConfigDef(typ, req.Options); err != nil {
		return err
	}
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
		Where: map[string]any{"key": req.Key},
	})
	if err != nil {
		return err
	}
	if exists {
		return errors.New("配置键已存在")
	}
	c := &model.SysConfig{
		Group: req.Group, Key: req.Key, Name: req.Name, Value: req.Value,
		Type: typ, Options: req.Options, IsPublic: req.IsPublic,
		Remark: req.Remark, Sort: req.Sort, Editable: true, Builtin: false,
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return err
	}
	_ = setting.RefreshKey(context.Background(), req.Key)
	return nil
}

type UpdateConfigRequest struct {
	Group    string `json:"group"`
	Name     string `json:"name" binding:"required"`
	Value    string `json:"value"`
	Type     string `json:"type"`
	Options  string `json:"options"`
	IsPublic bool   `json:"is_public"`
	Remark   string `json:"remark"`
	Sort     int    `json:"sort"`
}

// Update edits a config's metadata and value (the key is immutable), then
// refreshes the cache for that key.
func (s *ConfigService) Update(ctx context.Context, id uint, req *UpdateConfigRequest) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "配置不存在")
	}
	typ := req.Type
	if typ == "" {
		typ = "string"
	}
	if err := validateConfigDef(typ, req.Options); err != nil {
		return err
	}
	c.Group = req.Group
	c.Name = req.Name
	c.Value = req.Value
	c.Type = typ
	c.Options = req.Options
	c.IsPublic = req.IsPublic
	c.Remark = req.Remark
	c.Sort = req.Sort
	if err := s.repo.Update(ctx, c, "Group", "Name", "Value", "Type", "Options", "IsPublic", "Remark", "Sort"); err != nil {
		return err
	}
	_ = setting.RefreshKey(context.Background(), c.Key)
	return nil
}

func (s *ConfigService) Delete(ctx context.Context, id uint) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "配置不存在")
	}
	if c.Builtin {
		return errors.New("内置配置不可删除")
	}
	// Hard delete: configs are reference data, and a soft-deleted row would keep
	// the unique key, blocking re-creating the same key later.
	if err := s.repo.HardDelete(ctx, id); err != nil {
		return err
	}
	_ = setting.RefreshKey(context.Background(), c.Key) // drops the cache field
	return nil
}

// Refresh re-syncs the cache: a single key when given, otherwise everything.
func (s *ConfigService) Refresh(ctx context.Context, key string) error {
	if key != "" {
		return setting.RefreshKey(ctx, key)
	}
	return setting.RefreshAll(ctx)
}
