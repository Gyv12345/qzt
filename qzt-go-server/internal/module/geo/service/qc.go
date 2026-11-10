package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	geo "qzt-go-server/internal/model/geo"
	georepo "qzt-go-server/internal/repository/geo"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/pkg/xlogger"
)

// qc.go — P18 AI 质检门禁：稿件生成后按维度逐项检查，不达标停在草稿阶段，
// 到不了发布那一步（GEOFlow 质量层理念）。
//
// 两道门禁：
//  1. 广告法极限词本地预检（纯函数正则，不调 LLM——可靠且零成本），命中即 blocked；
//  2. LLM 语义质检三维度（知识证据/数据与引文/品牌调性），均分定级 pass/warn/blocked。
//
// 降级契约：LLM 未配置或质检失败 → qc_status=none 跳过质检走现流程，产线不被阻断。

// 极限词表（广告法高风险词，命中即 blocked）。纯本地预检，覆盖最高频的高危词。
var bannedWords = []string{
	"国家级", "世界级", "最高级", "最佳", "最好", "最强", "最优", "最大", "最高",
	"第一品牌", "全网第一", "销量第一", "排名第一", "NO.1", "no.1", "TOP1",
	"绝对", "独家", "首创", "独家秘方", "万能", "100%", "百分之百",
	"永久", "彻底根除", "根治", "秒杀", "国家级产品",
}

// bannedWordRe 极限词匹配（运行时编译一次）。
var bannedWordRe = regexp.MustCompile(strings.Join(bannedWords, "|"))

// qcDimensions LLM 语义质检维度（本地极限词之外的语义层检查）。
var qcDimensions = []string{
	"knowledge_evidence|知识证据|事实、数据、案例是否有出处（事实底料/知识库依据），是否存在凭空编造的企业事实",
	"citation|数据与引文|正文中的数字、URL、引用是否真实有据，是否存在虚构来源",
	"brand|品牌调性|「行简」品牌名使用与表述是否一致（13 个模块一体化、MIT 开源、免费不限人数），有无错误表述",
}

// qcSystemPrompt 质检 system prompt（维度表驱动拼装）。
func qcSystemPrompt() string {
	var b strings.Builder
	b.WriteString("【角色】你是内容质检员，对一篇即将发布的营销稿件做发布前质检。\n【质检维度】\n")
	for _, d := range qcDimensions {
		parts := strings.Split(d, "|")
		b.WriteString(fmt.Sprintf("- %s（%s）：%s\n", parts[0], parts[1], parts[2]))
	}
	b.WriteString(`【评分标准】每维度 0~100 分：90+ 无问题；60~89 有小瑕疵；<60 有实质问题。
【输出格式】只输出 JSON（不要代码围栏与解释）：
{"dimensions":[{"key":"knowledge_evidence","score":90,"issues":[{"quote":"原文片段","suggestion":"修改建议"}]}],"suggestions":["全局修改建议1"]}
每维度必须有 issues 数组（无问题时空数组）。`)
	return b.String()
}

// QCIssue 单条质检问题：原文定位 + 修改建议。
type QCIssue struct {
	Quote      string `json:"quote"`
	Suggestion string `json:"suggestion"`
}

// QCDimensionResult 单维度质检结果。
type QCDimensionResult struct {
	Key    string    `json:"key"`
	Name   string    `json:"name"`
	Score  int       `json:"score"`
	Issues []QCIssue `json:"issues"`
}

// QCResult 一次质检的完整结果（落 geo_source.qc_result JSON）。
type QCResult struct {
	Dimensions  []QCDimensionResult `json:"dimensions"`
	Suggestions []string            `json:"suggestions"`
	CheckedAt   string              `json:"checked_at"`
	Model       string              `json:"model"`
	// LocalBan 命中的本地极限词（非空时无需 LLM 即 blocked）
	LocalBan []string `json:"local_ban,omitempty"`
}

// decideQCStatus 纯函数定级：本地极限词命中即 blocked；否则按三维度均分定级：
// 均分 ≥80 pass；60~79 warn；<60 或维度缺失 blocked。
func decideQCStatus(localBan []string, dims []QCDimensionResult) string {
	if len(localBan) > 0 {
		return "blocked"
	}
	if len(dims) == 0 {
		return "blocked"
	}
	sum := 0
	for _, d := range dims {
		sum += d.Score
	}
	avg := sum / len(dims)
	switch {
	case avg >= 80:
		return "pass"
	case avg >= 60:
		return "warn"
	default:
		return "blocked"
	}
}

// scanBannedWords 纯函数：正文极限词本地预检，返回命中的词（去重）。
func scanBannedWords(content string) []string {
	hits := bannedWordRe.FindAllString(content, -1)
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

// ErrQCSkipped 质检跳过（LLM 不可用/调用失败/结果不可解析）——稿件保持 qc_status=none，
// 走现流程，产线不被阻断。
var ErrQCSkipped = errors.New("质检跳过（LLM 不可用或结果不可解析），稿件按未质检放行")

// RunQC 对稿件执行质检并落库 qc_status/qc_result。
// 返回 ErrQCSkipped 表示跳过（稿件保持未质检状态）。
func (s *SourceService) RunQC(ctx context.Context, id uint) (*geo.GeoSource, error) {
	src, err := georepo.NewSourceRepo().GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("稿件不存在")
	}
	if strings.TrimSpace(src.ContentMd) == "" {
		return nil, errors.New("稿件正文为空，无法质检")
	}

	// 两道门禁的第 1 道：本地极限词预检（零成本，命中即 blocked 不调 LLM）
	localBan := scanBannedWords(src.ContentMd + " " + src.Title)
	if len(localBan) > 0 {
		return s.saveQCResult(ctx, src, &QCResult{
			Dimensions: nil,
			LocalBan:   localBan,
			CheckedAt:  time.Now().Format(time.DateTime),
			Model:      "local-ban-scan",
		})
	}

	// 第 2 道：LLM 语义质检（未配置 → 跳过，qc_status=none）
	client, err := writerLLMClient(ctx)
	if err != nil {
		xlogger.InfofCtx(ctx, "geo/qc: LLM 不可用，跳过质检 source=%d: %v", id, err)
		return nil, ErrQCSkipped
	}
	resp, err := client.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: qcSystemPrompt()},
			{Role: "user", Content: "【稿件标题】" + src.Title + "\n【稿件正文】\n" + truncateRunes(src.ContentMd, 6000)},
		},
		Feature: "geo.qc",
	})
	if err != nil {
		// 质检调用失败 ≠ 稿件有问题：qc_status=none 跳过（产线不被阻断）
		xlogger.ErrorfCtx(ctx, "geo/qc: LLM 质检失败 source=%d: %v", id, err)
		return nil, ErrQCSkipped
	}
	dims, suggestions, perr := parseQCJSON(resp.Content)
	if perr != nil {
		// JSON 解析失败也跳过（防 prompt 注入导致的伪结果直接定级）
		xlogger.ErrorfCtx(ctx, "geo/qc: 质检结果解析失败 source=%d: %v", id, perr)
		return nil, ErrQCSkipped
	}

	result := &QCResult{
		Dimensions:  dims,
		Suggestions: suggestions,
		CheckedAt:   time.Now().Format(time.DateTime),
		Model:       resp.Model,
	}
	return s.saveQCResult(ctx, src, result)
}

// saveQCResult 定级并落库。
func (s *SourceService) saveQCResult(ctx context.Context, src *geo.GeoSource, result *QCResult) (*geo.GeoSource, error) {
	result.LocalBan = scanBannedWords(src.ContentMd + " " + src.Title)
	status := decideQCStatus(result.LocalBan, result.Dimensions)
	b, _ := json.Marshal(result)
	src.QcStatus = status
	src.QcResult = string(b)
	if err := georepo.NewSourceRepo().Update(ctx, src, "qc_status", "qc_result"); err != nil {
		return nil, fmt.Errorf("质检结果落库失败: %w", err)
	}
	return src, nil
}

// qcJSONRe 提取文本中的首个 JSON 对象（质检输出是对象，非 writer.go 选题用的数组）。
var qcJSONRe = regexp.MustCompile(`\{[\s\S]*\}`)

// parseQCJSON 解析 LLM 质检 JSON 输出（容错代码围栏与说明文字）。
func parseQCJSON(content string) ([]QCDimensionResult, []string, error) {
	m := qcJSONRe.FindString(content)
	if m == "" {
		return nil, nil, errors.New("输出不含 JSON 对象/数组")
	}
	var raw struct {
		Dimensions  []QCDimensionResult `json:"dimensions"`
		Suggestions []string            `json:"suggestions"`
	}
	if err := json.Unmarshal([]byte(m), &raw); err != nil {
		return nil, nil, err
	}
	if len(raw.Dimensions) == 0 {
		return nil, nil, errors.New("dimensions 为空")
	}
	return raw.Dimensions, raw.Suggestions, nil
}
