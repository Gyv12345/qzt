package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"qzt-go-server/internal/pkg/wxmp"
)

// menu.go 公众号自定义菜单管理：读当前线上菜单 / 全量保存并发布 / 删除。
// v1 只做通用菜单：新增按钮 type 仅允许 view（跳转链接），click 等事件型
// 仅在拉取时原样透传查看，不在此新设。名称长度按 rune 计数（微信口径=
// 一级 4 个汉字/8 个字母、二级 8 个汉字/16 个字母）。

const (
	menuTopMax     = 3 // 一级菜单上限
	menuSubMax     = 5 // 每个一级项的二级上限
	menuTopNameMax = 4 // 一级名称上限（rune）
	menuSubNameMax = 8 // 二级名称上限（rune）
)

// SaveMenuRequest 保存菜单入参（buttons 为完整菜单树，POST menu/create 全量替换并即时发布）。
type SaveMenuRequest struct {
	Buttons []*wxmp.MenuItem `json:"buttons"`
}

// MenuService 公众号菜单服务。
type MenuService struct{}

func NewMenuService() *MenuService { return &MenuService{} }

// Get 拉取当前线上生效菜单（is_menu_open=false 表示菜单未开启或未配置）。
func (s *MenuService) Get(ctx context.Context, accountID uint) (bool, []*wxmp.MenuItem, error) {
	client, err := loadAccountClient(ctx, accountID)
	if err != nil {
		return false, nil, err
	}
	return client.GetMenu(ctx)
}

// Save 校验并全量保存菜单。校验：一级≤3、每项二级≤5；叶子项 type 必须 view 且
// url 以 http/https 开头；带子按钮的父项保存前把 type/url 置空；名称长度按 rune
// 计数（一级≤4、二级≤8）。
func (s *MenuService) Save(ctx context.Context, accountID uint, buttons []*wxmp.MenuItem) error {
	if len(buttons) == 0 {
		return errors.New("菜单不能为空（如需清空请使用删除菜单）")
	}
	if len(buttons) > menuTopMax {
		return fmt.Errorf("一级菜单最多 %d 个", menuTopMax)
	}
	for _, b := range buttons {
		if err := validateTopButton(b); err != nil {
			return err
		}
	}
	client, err := loadAccountClient(ctx, accountID)
	if err != nil {
		return err
	}
	return client.CreateMenu(ctx, buttons)
}

// Delete 删除线上菜单。
func (s *MenuService) Delete(ctx context.Context, accountID uint) error {
	client, err := loadAccountClient(ctx, accountID)
	if err != nil {
		return err
	}
	return client.DeleteMenu(ctx)
}

// validateTopButton 一级按钮校验（含二级递归校验与父项归一化）。
func validateTopButton(b *wxmp.MenuItem) error {
	if b == nil {
		return errors.New("菜单项不能为空")
	}
	b.Name = strings.TrimSpace(b.Name)
	if b.Name == "" {
		return errors.New("菜单名称不能为空")
	}
	if utf8.RuneCountInString(b.Name) > menuTopNameMax {
		return fmt.Errorf("一级菜单「%s」名称超限：最多 %d 个字符", b.Name, menuTopNameMax)
	}
	if len(b.SubButton) == 0 {
		return validateViewButton(b, "菜单")
	}
	// 父项：只保留 name+sub_button，type/url 置空（微信要求父项不带跳转）
	if len(b.SubButton) > menuSubMax {
		return fmt.Errorf("「%s」下二级菜单最多 %d 个", b.Name, menuSubMax)
	}
	b.Type = ""
	b.URL = ""
	for _, sub := range b.SubButton {
		if err := validateSubButton(sub, b.Name); err != nil {
			return err
		}
	}
	return nil
}

// validateSubButton 二级按钮校验（菜单仅两级，子项不允许再挂子按钮）。
func validateSubButton(sub *wxmp.MenuItem, parentName string) error {
	if sub == nil {
		return errors.New("子菜单不能为空")
	}
	sub.Name = strings.TrimSpace(sub.Name)
	if sub.Name == "" {
		return errors.New("子菜单名称不能为空")
	}
	if utf8.RuneCountInString(sub.Name) > menuSubNameMax {
		return fmt.Errorf("二级菜单「%s」名称超限：最多 %d 个字符", sub.Name, menuSubNameMax)
	}
	if len(sub.SubButton) > 0 {
		return errors.New("菜单最多两级，「" + sub.Name + "」下不能再挂子菜单")
	}
	return validateViewButton(sub, "子菜单（"+parentName+"下）")
}

// validateViewButton 叶子按钮校验：v1 仅允许 view 类型 + http/https 链接。
func validateViewButton(b *wxmp.MenuItem, label string) error {
	if b.Type != "view" {
		return fmt.Errorf("%s「%s」类型仅支持 view（v1 暂不开放其他类型）", label, b.Name)
	}
	if !strings.HasPrefix(b.URL, "http://") && !strings.HasPrefix(b.URL, "https://") {
		return fmt.Errorf("%s「%s」链接必须以 http:// 或 https:// 开头", label, b.Name)
	}
	return nil
}
