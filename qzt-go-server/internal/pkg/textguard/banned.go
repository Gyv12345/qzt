package textguard

import (
	"regexp"
	"strings"
)

// banned.go 广告法高频极限词的本地预检:纯函数正则,不调 LLM,可靠且零成本。
// 供需要对客/对外文本做发布前或发送前检查的模块复用——geo 稿件质检(命中即
// 阻断)与 AI 跟进草稿(命中作为发送前核对提示)。词表只在这里维护一份。

// BannedWords 广告法高风险词表。命中即视为高风险;阻断还是提示由调用方决定。
var BannedWords = []string{
	"国家级", "世界级", "最高级", "最佳", "最好", "最强", "最优", "最大", "最高",
	"第一品牌", "全网第一", "销量第一", "排名第一", "NO.1", "no.1", "TOP1",
	"绝对", "独家", "首创", "独家秘方", "万能", "100%", "百分之百",
	"永久", "彻底根除", "根治", "秒杀", "国家级产品",
}

// bannedRe 极限词匹配(包初始化时编译一次)。
var bannedRe = regexp.MustCompile(strings.Join(BannedWords, "|"))

// ScanBanned 返回正文命中的极限词(按出现顺序去重);未命中返回空切片。
func ScanBanned(content string) []string {
	hits := bannedRe.FindAllString(content, -1)
	seen := make(map[string]struct{}, len(hits))
	out := make([]string, 0, len(hits))
	for _, w := range hits {
		if _, ok := seen[w]; !ok {
			seen[w] = struct{}{}
			out = append(out, w)
		}
	}
	return out
}

// FindUnique 返回正则在正文中的全部命中(按出现顺序去重);未命中返回空切片。
// 供调用方接入自己的规则(如交期承诺、具体金额),与极限词共用去重口径。
func FindUnique(re *regexp.Regexp, content string) []string {
	hits := re.FindAllString(content, -1)
	seen := make(map[string]struct{}, len(hits))
	out := make([]string, 0, len(hits))
	for _, w := range hits {
		if _, ok := seen[w]; !ok {
			seen[w] = struct{}{}
			out = append(out, w)
		}
	}
	return out
}
