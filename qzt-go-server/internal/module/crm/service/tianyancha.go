package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	sysservice "qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/mcpclient"
	"qzt-go-server/internal/pkg/setting"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// tianyancha.go 客户工商信息查询(天眼查 MCP,P31 Feature B)。
// GET /crm/customers/:id/tianyancha?name=xxx&save=1:
//   取系统配置(天眼查未配置/未启用明确报错)→ MCP tools/call 查询(search 先定位
//   精确企业名,detail 拉档案)→ 归一化返回(不回填客户 schema,前端展示)。
//   ?save=1 时把结果写一条跟进记录留痕(照 crm 跟进服务手法)。
// 配额护栏:Redis 全局每日计数 tyc:daily:{date},上限 sys_config
// tianyancha.daily_limit(默认 300/天,防超额消耗配额)。

// TYCConfigKeyDailyLimit sys_config 键:天眼查每日查询上限。
const TYCConfigKeyDailyLimit = "tianyancha.daily_limit"

// TYCDefaultDailyLimit 每日查询默认上限。
const TYCDefaultDailyLimit = 300

// TYCRawMaxLen raw 透传截断长度。
const TYCRawMaxLen = 6000

// TYCDailyKey 天眼查每日全局计数键(纯函数)。
func TYCDailyKey(date string) string {
	return "tyc:daily:" + date
}

// CheckTYCQuota 占用一次当日全局配额,返回剩余次数;超限明确报错。
// Redis 不可用时放行(软护栏)。
func CheckTYCQuota(ctx context.Context) (int64, error) {
	limit := int64(TYCDefaultDailyLimit)
	if v := setting.Get(ctx, TYCConfigKeyDailyLimit); v != "" {
		if n, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64); err == nil && n > 0 {
			limit = n
		}
	}
	store := cache.GetStore()
	if store == nil {
		return limit, nil
	}
	key := TYCDailyKey(time.Now().Format("2006-01-02"))
	count, err := store.Incr(key)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "crm tianyancha: incr daily quota failed: %v", err)
		return limit, nil
	}
	if count == 1 {
		_ = store.Expire(key, 24*time.Hour)
	}
	if count > limit {
		return 0, fmt.Errorf("今日天眼查查询次数已用完(每日 %d 次),请明日再试", limit)
	}
	return limit - count, nil
}

// TianyanchaInfo 归一化后的工商信息。
type TianyanchaInfo struct {
	CompanyName       string `json:"company_name"`
	LegalPerson       string `json:"legal_person"`
	RegisteredCapital string `json:"registered_capital"`
	EstablishDate     string `json:"establish_date"` // YYYY-MM-DD
	Status            string `json:"status"`
	CreditCode        string `json:"credit_code"`
	InsuredCount      string `json:"insured_count"` // 年报参保人数(可能为区间文案)
	Address           string `json:"address"`
	Raw               string `json:"raw"` // 工具返回 JSON 原文(截断透传)
	Remaining         int64  `json:"remaining"` // 当日剩余配额
}

// TianyanchaService 客户工商信息查询服务。
type TianyanchaService struct {
	customerRepo *crrepo.CustomerRepo
	followSvc    *FollowService
}

func NewTianyanchaService() *TianyanchaService {
	return &TianyanchaService{
		customerRepo: crrepo.NewCustomerRepo(),
		followSvc:    NewFollowService(),
	}
}

// QueryByCustomer 查询客户工商信息。
// name 覆盖客户名称(可传空,默认用客户表名称);save=true 时写一条跟进记录留痕。
func (s *TianyanchaService) QueryByCustomer(ctx context.Context, userID, customerID uint, name string, save bool) (*TianyanchaInfo, error) {
	cust, err := s.customerRepo.GetByID(ctx, customerID)
	if err != nil {
		return nil, errors.New("客户不存在")
	}
	if strings.TrimSpace(name) == "" {
		name = cust.Name
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("缺少待查询的企业名称")
	}

	remaining, err := CheckTYCQuota(ctx)
	if err != nil {
		return nil, err
	}

	tycSvc := sysservice.NewTianyanchaService()
	row, mapping, err := tycSvc.GetActiveConfig(ctx)
	if err != nil {
		return nil, err
	}
	client := mcpclient.New(mcpclient.Config{
		Endpoint: row.AppID,
		APIKey:   row.AppSecret,
		Timeout:  30 * time.Second,
	})

	// 1) 搜索定位精确企业名(配了 search 工具时);失败不阻断,退回用输入名直查详情。
	resolved := name
	if mapping.Search != "" {
		searchOut, err := client.Call(ctx, mapping.Search, map[string]any{mapping.SearchParam: name})
		if err != nil {
			xlogger.InfofCtx(ctx, "crm tianyancha: search(%s) 失败,退回名称直查: %v", mapping.Search, err)
		} else if found := ResolveCompanyNameFromSearch(searchOut.Text, name); found != "" {
			resolved = found
		}
	}

	// 2) 详情查询。
	if mapping.Detail == "" {
		return nil, errors.New("天眼查工具映射未配置 detail 工具名")
	}
	detailOut, err := client.Call(ctx, mapping.Detail, map[string]any{mapping.DetailParam: resolved})
	if err != nil {
		return nil, fmt.Errorf("天眼查查询失败: %v", err)
	}
	info, err := NormalizeCompanyProfile(detailOut.Text)
	if err != nil {
		return nil, fmt.Errorf("天眼查返回解析失败: %v", err)
	}
	info.Remaining = remaining
	info.Raw = truncateText(detailOut.Text, TYCRawMaxLen)

	// 3) 留痕(?save=1):写一条跟进记录(内容=摘要+来源标注),失败仅记日志。
	if save {
		content := buildTYCFollowSummary(name, resolved, info)
		_, ferr := s.followSvc.CreateRecord(ctx, &CreateRecordRequest{
			Type:       crmmodel.FollowTypeOther,
			Content:    content,
			FollowTime: xtime.NewDateTime(time.Now()),
			OwnerID:    userID,
			CustomerID: &customerID,
		})
		if ferr != nil {
			xlogger.ErrorfCtx(ctx, "crm tianyancha: 写跟进留痕失败 customerID=%d: %v", customerID, ferr)
		}
	}
	return info, nil
}

// buildTYCFollowSummary 生成留痕摘要文本。
func buildTYCFollowSummary(queryName, resolved string, info *TianyanchaInfo) string {
	var b strings.Builder
	b.WriteString("工商信息查询(来自天眼查): ")
	if resolved != queryName && resolved != "" {
		fmt.Fprintf(&b, "「%s」(匹配到「%s」) ", queryName, resolved)
	} else {
		fmt.Fprintf(&b, "「%s」 ", queryName)
	}
	fields := []struct{ label, val string }{
		{"企业", info.CompanyName},
		{"法定代表人", info.LegalPerson},
		{"注册资本", info.RegisteredCapital},
		{"成立日期", info.EstablishDate},
		{"经营状态", info.Status},
		{"统一社会信用代码", info.CreditCode},
		{"参保人数", info.InsuredCount},
		{"地址", info.Address},
	}
	first := true
	for _, f := range fields {
		if f.val == "" {
			continue
		}
		if !first {
			b.WriteString("; ")
		}
		first = false
		fmt.Fprintf(&b, "%s=%s", f.label, f.val)
	}
	if first {
		b.WriteString("未获取到有效字段")
	}
	return b.String()
}

// ── 纯函数(单测覆盖) ──

// ResolveCompanyNameFromSearch 从搜索工具输出中解析最匹配的企业名(纯函数):
// 提取第一段 JSON,兼容「对象含 list/items/data/result 数组」与「裸数组」两种形态,
// 取数组首个元素的 name 字段;找不到精确 name 时返回空串(调用方退回输入名)。
func ResolveCompanyNameFromSearch(text, query string) string {
	raw, ok := mcpclient.ExtractFirstJSON(text)
	if !ok {
		return ""
	}
	var doc any
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		return ""
	}
	// 裸数组形态。
	if arr, ok := doc.([]any); ok {
		return firstItemName(arr, query)
	}
	// 对象形态:尝试常见包裹键。
	if obj, ok := doc.(map[string]any); ok {
		for _, key := range []string{"list", "items", "data", "result", "results", "companies"} {
			if arr, ok := obj[key].([]any); ok {
				if name := firstItemName(arr, query); name != "" {
					return name
				}
			}
		}
		// 单对象形态:自身可能就是匹配项。
		return firstItemName([]any{obj}, query)
	}
	return ""
}

// firstItemName 数组首元素的 name 字段;query 非空时优先取与 query 模糊匹配的项。
func firstItemName(arr []any, query string) string {
	var fallback string
	for _, item := range arr {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name := jsonStr(obj, "name", "company_name", "companyName")
		if name == "" {
			continue
		}
		if fallback == "" {
			fallback = name
		}
		if query != "" && strings.Contains(name, query) {
			return name
		}
	}
	return fallback
}

// NormalizeCompanyProfile 把天眼查详情工具输出(text 内 JSON)归一化(纯函数):
// 兼容 camelCase/snake_case 键名;establish_time 为毫秒时间戳时转 YYYY-MM-DD;
// 字段缺失一律空串(调用方按需提示)。
func NormalizeCompanyProfile(text string) (*TianyanchaInfo, error) {
	raw, ok := mcpclient.ExtractFirstJSON(text)
	if !ok {
		return nil, errors.New("未找到 JSON 输出")
	}
	var doc map[string]any
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		return nil, fmt.Errorf("JSON 解析失败: %v", err)
	}
	// 部分实现把业务数据包在 data/result 一层。
	if len(doc) > 0 {
		for _, key := range []string{"data", "result"} {
			if inner, ok := doc[key].(map[string]any); ok && len(inner) > len(doc)/2 {
				merged := map[string]any{}
				for k, v := range doc {
					merged[k] = v
				}
				for k, v := range inner {
					if _, exists := merged[k]; !exists {
						merged[k] = v
					}
				}
				doc = merged
				break
			}
		}
	}
	info := &TianyanchaInfo{
		CompanyName:       jsonStr(doc, "name", "company_name", "companyName"),
		LegalPerson:       jsonStr(doc, "legalPersonName", "legal_person", "legal_person_name"),
		RegisteredCapital: jsonStr(doc, "regCapital", "registered_capital", "registCapital"),
		EstablishDate:     normalizeDate(jsonAny(doc, "estiblishTime", "estiblish_time", "establish_date", "establishDate")),
		Status:            jsonStr(doc, "regStatus", "status", "openStatus"),
		CreditCode:        jsonStr(doc, "creditCode", "credit_code"),
		InsuredCount:      jsonStr(doc, "insuredCount", "insured_count", "staffNumRange", "annualInsuredCount"),
		Address:           jsonStr(doc, "regLocation", "address", "reg_location"),
	}
	return info, nil
}

// normalizeDate 成立日期归一:毫秒/秒时间戳 → YYYY-MM-DD;字符串取日期部分。
func normalizeDate(v any) string {
	switch t := v.(type) {
	case float64:
		ms := t
		if ms > 1e14 || (ms > 1e11 && ms < 1e14) {
			// 毫秒级(约 2003 年之后)
		} else if ms > 1e9 {
			ms = ms * 1000 // 秒级
		}
		return time.UnixMilli(int64(ms)).Format("2006-01-02")
	case string:
		s := strings.TrimSpace(t)
		if len(s) >= 10 && s[4] == '-' {
			return s[:10]
		}
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n > 1e9 {
			return normalizeDate(float64(n))
		}
	}
	return ""
}

// jsonStr 多候选键名取第一个非空字符串值。
func jsonStr(doc map[string]any, keys ...string) string {
	for _, k := range keys {
		v, ok := doc[k]
		if !ok || v == nil {
			continue
		}
		switch t := v.(type) {
		case string:
			if s := strings.TrimSpace(t); s != "" && s != "-" {
				return s
			}
		case float64:
			return strconv.FormatFloat(t, 'f', -1, 64)
		}
	}
	return ""
}

// jsonAny 多候选键名取第一个非 nil 原始值。
func jsonAny(doc map[string]any, keys ...string) any {
	for _, k := range keys {
		if v, ok := doc[k]; ok && v != nil {
			return v
		}
	}
	return nil
}

// truncateText 按字节截断并回退 UTF-8 字符边界。
func truncateText(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for i := n; i > n-4 && i > 0; i-- {
		if s[i]&0xC0 != 0x80 {
			return s[:i]
		}
	}
	return s[:n]
}
