// menu.go 微信公众号自定义菜单读写。
//
// v1 口径：只做通用菜单——/cgi-bin/menu/create 全量替换并即时发布、
// get_current_selfmenu_info 拉取当前线上生效菜单、menu/delete 删除。
// click/view 等事件型 type 原样透传（前端 v1 只允许新增 view 跳转链接，
// click 等仅支持查看，不在此新设）；跳转小程序、素材消息等个性化能力后续按需扩展。
package wxmp

import (
	"context"
	"fmt"
)

// MenuItem 自定义菜单项（前后端共同契约）。
// Name/Type 必填（type=view 跳转链接）；带子按钮的父项只填 Name+SubButton，
// 保存前由 service 层把父项的 Type/URL 置空（微信要求父项不带跳转）。
type MenuItem struct {
	Name      string      `json:"name"`
	Type      string      `json:"type"`
	URL       string      `json:"url,omitempty"`
	SubButton []*MenuItem `json:"sub_button,omitempty"`
}

// menuRespButton get_current_selfmenu_info 返回的按钮结构。
// 注意 key/url 在无值时是 JSON null，必须用指针接，统一归一为空串。
type menuRespButton struct {
	Name      string            `json:"name"`
	Type      *string           `json:"type"`
	Key       *string           `json:"key"`
	URL       *string           `json:"url"`
	SubButton []*menuRespButton `json:"sub_button"`
}

// GetMenu 拉取当前线上生效的自定义菜单。
// 返回 is_menu_open（false=菜单未开启或账号未配置菜单）与归一化后的按钮树
// （只保留 name/type/url/sub_button，type 原样透传 view/click 等）。
func (c *Client) GetMenu(ctx context.Context) (open bool, buttons []*MenuItem, err error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return false, nil, err
	}
	var resp struct {
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
		IsMenuOpen int    `json:"is_menu_open"`
		SelfMenu   struct {
			Button []*menuRespButton `json:"button"`
		} `json:"selfmenu"`
	}
	if err := c.httpGetJSON(ctx, withToken(apiBase+"/cgi-bin/get_current_selfmenu_info", token), &resp); err != nil {
		return false, nil, fmt.Errorf("拉取公众号菜单失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return false, nil, translateWxErr("拉取公众号菜单", resp.ErrCode, resp.ErrMsg)
	}
	return resp.IsMenuOpen == 1, convertMenuButtons(resp.SelfMenu.Button), nil
}

// convertMenuButtons 微信响应按钮树 → MenuItem 契约树（null 值归一为空串）。
func convertMenuButtons(list []*menuRespButton) []*MenuItem {
	out := make([]*MenuItem, 0, len(list))
	for _, b := range list {
		if b == nil {
			continue
		}
		item := &MenuItem{
			Name: b.Name,
			Type: derefString(b.Type),
			URL:  derefString(b.URL),
		}
		item.SubButton = convertMenuButtons(b.SubButton)
		out = append(out, item)
	}
	return out
}

// CreateMenu 全量保存并发布自定义菜单（POST /cgi-bin/menu/create，body {"button":[...]}）。
// 微信侧保存即生效，线上菜单立即替换。
func (c *Client) CreateMenu(ctx context.Context, buttons []*MenuItem) error {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return err
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	if err := c.httpPostJSON(ctx, withToken(apiBase+"/cgi-bin/menu/create", token),
		map[string]any{"button": buttons}, &resp); err != nil {
		return fmt.Errorf("保存公众号菜单失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return translateWxErr("保存公众号菜单", resp.ErrCode, resp.ErrMsg)
	}
	return nil
}

// DeleteMenu 删除线上自定义菜单（GET /cgi-bin/menu/delete）。
func (c *Client) DeleteMenu(ctx context.Context) error {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return err
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	if err := c.httpGetJSON(ctx, withToken(apiBase+"/cgi-bin/menu/delete", token), &resp); err != nil {
		return fmt.Errorf("删除公众号菜单失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return translateWxErr("删除公众号菜单", resp.ErrCode, resp.ErrMsg)
	}
	return nil
}

// derefString 指针字符串安全解引用（微信响应 null 归一为空串）。
func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
