package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestTYCDailyKey 配额计数键形态。
func TestTYCDailyKey(t *testing.T) {
	assert.Equal(t, "tyc:daily:2026-11-14", TYCDailyKey("2026-11-14"))
}

// TestNormalizeCompanyProfile_Tianyancha 天眼查官方键名(camelCase)归一化。
func TestNormalizeCompanyProfile_Tianyancha(t *testing.T) {
	raw := `{"name":"行简网络有限公司","legalPersonName":"陈某某","regCapital":"393979.6387万人民币",
		"estiblishTime":1546272000000,"regStatus":"存续","creditCode":"91410100MA45XY6789",
		"staffNumRange":"100-499人","regLocation":"河南省洛阳市洛龙区xx路xx号"}`
	info, err := NormalizeCompanyProfile(raw)
	require.NoError(t, err)
	assert.Equal(t, "行简网络有限公司", info.CompanyName)
	assert.Equal(t, "陈某某", info.LegalPerson)
	assert.Equal(t, "393979.6387万人民币", info.RegisteredCapital)
	assert.Equal(t, "2019-01-01", info.EstablishDate) // 毫秒时间戳归一为日期
	assert.Equal(t, "存续", info.Status)
	assert.Equal(t, "91410100MA45XY6789", info.CreditCode)
	assert.Equal(t, "100-499人", info.InsuredCount)
	assert.Equal(t, "河南省洛阳市洛龙区xx路xx号", info.Address)
}

// TestNormalizeCompanyProfile_SnakeCase snake_case 键名兼容。
func TestNormalizeCompanyProfile_SnakeCase(t *testing.T) {
	raw := `{"company_name":"某某科技","legal_person":"李某某","registered_capital":"1000万元",
		"establish_date":"2020-06-15","status":"在业","credit_code":"91330100ABC","insured_count":55,
		"address":"杭州市西湖区"}`
	info, err := NormalizeCompanyProfile(raw)
	require.NoError(t, err)
	assert.Equal(t, "某某科技", info.CompanyName)
	assert.Equal(t, "李某某", info.LegalPerson)
	assert.Equal(t, "2020-06-15", info.EstablishDate)
	assert.Equal(t, "55", info.InsuredCount)
	assert.Equal(t, "在业", info.Status)
}

// TestNormalizeCompanyProfile_DataWrapped data 包裹层剥开合并。
func TestNormalizeCompanyProfile_DataWrapped(t *testing.T) {
	raw := `{"code":200,"data":{"name":"包装公司","creditCode":"99XX"}}`
	info, err := NormalizeCompanyProfile(raw)
	require.NoError(t, err)
	assert.Equal(t, "包装公司", info.CompanyName)
	assert.Equal(t, "99XX", info.CreditCode)
}

// TestNormalizeCompanyProfile_MissingFields 字段缺失一律空串。
func TestNormalizeCompanyProfile_MissingFields(t *testing.T) {
	info, err := NormalizeCompanyProfile(`{"name":"只有名字"}`)
	require.NoError(t, err)
	assert.Equal(t, "只有名字", info.CompanyName)
	assert.Empty(t, info.LegalPerson)
	assert.Empty(t, info.EstablishDate)
	assert.Empty(t, info.CreditCode)
}

// TestNormalizeCompanyProfile_NotJSON 非 JSON 报错。
func TestNormalizeCompanyProfile_NotJSON(t *testing.T) {
	_, err := NormalizeCompanyProfile("查询失败,请稍后再试")
	assert.Error(t, err)
}

// TestResolveCompanyNameFromSearch 搜索结果解析(裸数组/包裹对象/模糊匹配)。
func TestResolveCompanyNameFromSearch(t *testing.T) {
	// 裸数组 + query 模糊匹配优先。
	got := ResolveCompanyNameFromSearch(`[{"name":"行简网络(北京)有限公司"},{"name":"行简网络(上海)有限公司"}]`, "行简网络(上海)")
	assert.Equal(t, "行简网络(上海)有限公司", got)

	// items 包裹。
	got = ResolveCompanyNameFromSearch(`{"items":[{"name":"天眼查科技有限公司"}]}`, "天眼查")
	assert.Equal(t, "天眼查科技有限公司", got)

	// data 包裹、无匹配时取首个兜底。
	got = ResolveCompanyNameFromSearch(`{"data":[{"name":"甲公司"},{"name":"乙公司"}]}`, "丙公司")
	assert.Equal(t, "甲公司", got)

	// 非 JSON 返回空。
	assert.Empty(t, ResolveCompanyNameFromSearch("没有结果", "x"))

	// 错误对象(无 name 字段)返回空。
	assert.Empty(t, ResolveCompanyNameFromSearch(`{"error":"not found"}`, "x"))
}

// TestBuildTYCFollowSummary 留痕摘要含来源标注与有效字段。
func TestBuildTYCFollowSummary(t *testing.T) {
	info := &TianyanchaInfo{
		CompanyName: "行简网络有限公司",
		LegalPerson: "陈某某",
		Status:      "存续",
	}
	s := buildTYCFollowSummary("行简网络", "行简网络有限公司", info)
	assert.Contains(t, s, "来自天眼查")
	assert.Contains(t, s, "行简网络")
	assert.Contains(t, s, "陈某某")
	assert.Contains(t, s, "存续")
	assert.NotContains(t, s, "未获取到有效字段")

	empty := buildTYCFollowSummary("x", "x", &TianyanchaInfo{})
	assert.Contains(t, empty, "未获取到有效字段")
}

// TestNormalizeDate 多形态日期归一。
func TestNormalizeDate(t *testing.T) {
	assert.Equal(t, "2019-01-01", normalizeDate(float64(1546272000000)))
	assert.Equal(t, "2019-01-01", normalizeDate("1546272000")) // 秒级字符串
	assert.Equal(t, "2020-06-15", normalizeDate("2020-06-15 00:00:00"))
	assert.Empty(t, normalizeDate(nil))
	assert.Empty(t, normalizeDate(""))
}
