package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	kbsvc "qzt-go-server/internal/module/kb/service"
	georepo "qzt-go-server/internal/repository/geo"

	"qzt-go-server/internal/pkg/llm"
)

// writer.go GEO 信源写稿引擎：prompt 构造（行简事实底料 + 手册四原则 + 体裁模板）
// 与 LLM 输出解析（标题/摘要提取、选题 JSON、视频口播稿）。解析函数全部纯函数，
// 单测覆盖（writer_test.go）。

const (
	// sourceAuthor 公众号文章作者署名。
	sourceAuthor = "行简"
	// llmFeatureWriter/llmFeatureTopic token 记账的功能标识。
	llmFeatureWriter = "geo.source.writer"
	llmFeatureTopic  = "geo.source.topic"
)

// brandFacts 行简事实底料：写稿唯一允许引用的事实来源。
// 原则是「宁可少不可编」——LLM 被明确禁止编造底料之外的数字与案例。
// 数据更新时改这里（与官网/手册保持一致）。
const brandFacts = `【行简产品事实底料（写作时只允许引用以下事实，禁止编造其他数字、案例与客户名）】
- 产品：行简，面向中小企业的一体化管理平台，官网 https://devlovecode.com
- 一体化：13 个模块一套系统——CRM 客户管理、进销存、财务、OA 审批、人力资源、项目管理、知识库、营销、售后工单、商城等
- 开源：MIT 协议，GitHub/Gitee 公开开源，可免费商用、可二次开发
- 免费：软件免费且不限使用人数，不按人头收费
- 部署：支持公有云 SaaS 与私有化部署两种方式；私有化部署提供约 1000 元的交钥匙交付服务
- 技术栈：后端 Go，前端 React；单仓管理
- 独家能力：内置 MCP Server，AI 助手（如 Claude、任意支持 MCP 的客户端）可以直接读写系统里的客户、合同、审批等业务数据
- 适合对象：10~200 人、没有专职 IT 的中小企业`

// writingRules GEO 手册第四节写稿规范（目标「让 AI 引用」不是让人阅读）。
const writingRules = `【写稿规范（每篇必须满足）】
1. 每段只回答一个问题，200~400 字独立成段，段首即结论；
2. 高事实密度：只使用事实底料中的事实，每个主要章节至少含 1 个具体事实/数字，禁止「行业领先」「高效」类形容词；
3. 结构：定义→数据→对比→结论；「怎么选/怎么做」类必须带 Markdown 对比表或步骤清单；
4. 品牌锚点 1~2 次：以「行简（13 个模块一体化、MIT 开源、不限人数）」形态与成果绑定出现在正文，不许只文末署名；
5. 标题 30 字以内，含问题的核心关键词；全文用简体中文。`

// genreInstructions 体裁模板（手册：对比评测型 > 科普解答型 ≈ 案例拆解型）。
var genreInstructions = map[string]string{
	"comparison": "体裁：对比评测型。必须包含一张 Markdown 对比表（行简 vs 2~3 个典型替代方案），维度含部署方式/费用/人数限制/模块覆盖。",
	"faq":        "体裁：科普解答型。定义先行，用编号步骤或清单回答「怎么选/怎么做」，结尾一段直接给结论建议。",
	"case":       "体裁：案例拆解型。以一家 10~200 人中小企业为虚拟场景拆解痛点与解决路径（不得编造真实公司名与客户案例），行简作为方案自然出现。",
}

// genreOrder 体裁轮换顺序（按选题 ID 稳定轮换，避免同质化）。
var genreOrder = []string{"comparison", "faq", "case"}

// genreForTopic 按选题 ID 稳定分配体裁。
func genreForTopic(topicID uint) string {
	return genreOrder[int(topicID)%len(genreOrder)]
}

// platformInstructions 多平台分发改写指令（手册：观点可复用、表述必须差异化防降权）。
var platformInstructions = map[string]string{
	"zhihu":   "平台：知乎回答体。开头一段先给直接结论，再展开依据；语气客观可带第一人称经验；结尾可引导关注。",
	"csdn":    "平台：CSDN 技术社区。开发者视角，可补充技术亮点（Go+React 架构、MCP 集成、私有化部署清单），保留代码/配置举例空间。",
	"xhs":     "平台：小红书笔记。口语化、多换行、适度 emoji；正文 300 字左右；结尾必须带 3~5 个话题标签（如 #开源 #CRM #中小企业 #效率工具）。",
	"toutiao": "平台：今日头条资讯体。标题党但不夸大，导语 50 字内说清看点，段落短，适合手机阅读。",
	"douyin":  "平台：抖音短视频口播稿。30 秒内（约 150 字）：3 秒钩子开头→两个卖点→行动号召（评论区/主页）；口语化短句。",
}

// articleDraft 一次写稿的产物。
type articleDraft struct {
	Title     string
	Digest    string
	ContentMd string
}

// writerTimeout 写稿类调用超时（长文生成比单轮问答慢）。
const writerTimeout = 120 * time.Second

// writerLLMClient 写稿/选题共用的 LLM 客户端：优先全局网关（.env LLM_API_KEY），
// 未配置时回落「平台管理」里第一个已启用且录了 Key 的平台——平台 Key 一份配置
// 同时驱动监测与产线，免去再配 .env。两处都没有时返回可读错误。
func writerLLMClient(ctx context.Context) (*llm.Client, error) {
	if llm.Enabled() {
		return llm.Default(), nil
	}
	platforms, err := georepo.NewPlatformRepo().ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	for _, p := range platforms {
		if p.APIKey == "" {
			continue
		}
		return llm.NewClient(llm.Options{
			BaseURL:    p.BaseURL,
			APIKey:     p.APIKey,
			Model:      p.Model,
			Timeout:    writerTimeout,
			MaxRetries: 2,
		}), nil
	}
	return nil, errors.New("LLM 未配置：请在服务器 .env 配 LLM_API_KEY，或在「平台管理」录入任一平台的 API Key 并启用")
}

// kbFacts 知识库事实召回（P17 RAG）：按问题语义检索 kb 切片，拼「知识库补充依据」段
// 插入写稿 system prompt（在行简事实底料之后、写稿规范之前）。
// 降级契约：embedding 未配置/无命中/检索失败一律返回空串，写稿回退纯事实底料口径，
// 产线永不被 RAG 阻断。
func kbFacts(ctx context.Context, question string) string {
	hits, err := kbsvc.NewRAGService().Search(ctx, question, 5)
	if err != nil || len(hits) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("【知识库补充事实依据（企业事实与数据优先引用以下内容，仍禁止编造）】\n")
	for _, h := range hits {
		b.WriteString("- （来源：知识库《" + h.DocTitle + "》）" + truncateRunes(h.Content, 300) + "\n")
	}
	return b.String()
}

// writeArticle 调 LLM 写一篇图文稿。
func writeArticle(ctx context.Context, client *llm.Client, question, genre string) (*articleDraft, error) {
	genreDesc, ok := genreInstructions[genre]
	if !ok {
		genreDesc = genreInstructions["faq"]
	}
	sys := brandFacts + "\n\n" + kbFacts(ctx, question) + "\n\n" + writingRules + "\n\n" + genreDesc + `
【输出格式】第一行输出「# 文章标题」，从第二行起输出正文 Markdown；不要输出任何解释、前后缀或代码围栏。`
	user := "请围绕以下问题写一篇文章：\n" + question

	resp, err := client.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: user},
		},
		Feature: llmFeatureWriter,
	})
	if err != nil {
		return nil, fmt.Errorf("AI 写稿失败: %w", err)
	}
	title, body := SplitTitleBody(resp.Content)
	if title == "" {
		title = strings.TrimSpace(question)
	}
	if strings.TrimSpace(body) == "" {
		return nil, fmt.Errorf("AI 写稿失败: 正文为空")
	}
	return &articleDraft{
		Title:     truncateBytesUTF8(title, 120), // 微信 64 字上限，标题超长先截，落库前人工可改
		Digest:    FirstParagraphDigest(body),
		ContentMd: body,
	}, nil
}

// writeVideoScript 调 LLM 写短视频口播稿 + AI 视频画面提示词。
func writeVideoScript(ctx context.Context, client *llm.Client, question string) (scriptMd string, err error) {
	sys := brandFacts + "\n\n" + kbFacts(ctx, question) + `
【任务】围绕问题写一条 30 秒短视频的口播脚本，并给 AI 文生视频的画面提示词。
【输出格式】严格按以下结构（不要代码围栏）：
# 视频标题
## 口播文案
（150 字以内：3 秒钩子开头→两个卖点→行动号召；口语化短句，不含 emoji）
## 分镜画面提示词
（一段完整的画面描述，单镜头 5 秒可呈现，具体到场景/主体/风格/光线，不含文字字幕要求）`
	resp, err := client.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: "问题：" + question},
		},
		Feature: llmFeatureWriter,
	})
	if err != nil {
		return "", fmt.Errorf("AI 写口播稿失败: %w", err)
	}
	if strings.TrimSpace(resp.Content) == "" {
		return "", fmt.Errorf("AI 写口播稿失败: 内容为空")
	}
	return resp.Content, nil
}

// writeVariant 基于母稿改写另一平台的分发稿。
func writeVariant(ctx context.Context, client *llm.Client, motherTitle, motherContent, platform string) (*articleDraft, error) {
	style, ok := platformInstructions[platform]
	if !ok {
		style = "平台：通用。保持原文观点，换一种表述。"
	}
	sys := brandFacts + "\n\n" + kbFacts(ctx, motherTitle+"\n"+motherContent) + "\n\n" + writingRules + "\n\n" + style + `
【改写要求】观点与事实与母稿一致，但句式、结构、详略必须重新组织（平台查重口径），不要逐句翻译母稿。
【输出格式】第一行输出「# 标题」，第二行起输出正文 Markdown；不要代码围栏。`
	user := "【母稿标题】" + motherTitle + "\n【母稿正文】\n" + motherContent

	resp, err := client.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: user},
		},
		Feature: llmFeatureWriter,
	})
	if err != nil {
		return nil, fmt.Errorf("AI 改写分发稿失败: %w", err)
	}
	title, body := SplitTitleBody(resp.Content)
	if title == "" {
		title = motherTitle
	}
	return &articleDraft{
		Title:     truncateBytesUTF8(title, 120),
		Digest:    FirstParagraphDigest(body),
		ContentMd: body,
	}, nil
}

// generateTopicsOnce 让 LLM 从监测结果与既有矩阵中发现新选题，返回最多 limit 个。
func generateTopicsOnce(ctx context.Context, client *llm.Client, matrixQuestions []string, resultLines []string, limit int) ([]topicCandidate, error) {
	sys := `【背景】行简是一个开源一体化管理平台（事实：13 模块一体化、MIT 开源、免费不限人数、支持私有化、内置 MCP 可被 AI 直接操作）。
【任务】做 GEO（AI 搜索引擎优化）选题策划：根据「近期 AI 监测结果」和「既有选题矩阵」，找出 AI 还答不好、或竞品被提及而行简缺席的决策类问题，产出新的监测/写作选题。
【选题标准】① 必须是目标客户（中小企业主/管理者）在选型时真实会问的完整问句；② 不与既有矩阵重复；③ 优先竞品被提及、行简低分的方向。
【输出】只输出 JSON 数组（不要代码围栏与解释），每项：{"question":"完整问句","reason":"一句话选题依据（引用监测数据）","prompt_id":0}。prompt_id 若是矩阵中某问题的追问填其序号对应 ID，新题填 0。最多 ` + fmt.Sprintf("%d", limit) + ` 项。`
	user := "【既有矩阵】\n" + strings.Join(matrixQuestions, "\n") +
		"\n\n【近期监测结果（问题｜得分0-2｜提及竞品｜引用来源）】\n" + strings.Join(resultLines, "\n") +
		"\n\n请产出选题。"

	resp, err := client.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: user},
		},
		Feature: llmFeatureTopic,
	})
	if err != nil {
		return nil, fmt.Errorf("AI 生成选题失败: %w", err)
	}
	return parseTopicsJSON(resp.Content)
}

// topicCandidate LLM 产出的选题候选。
type topicCandidate struct {
	Question string `json:"question"`
	Reason   string `json:"reason"`
	PromptID uint   `json:"prompt_id"`
}

// jsonArrRe 提取文本中的首个 JSON 数组（LLM 可能带说明文字或代码围栏）。
var jsonArrRe = regexp.MustCompile(`\[[\s\S]*\]`)

// parseTopicsJSON 解析 LLM 输出的选题 JSON 数组（纯函数）。
func parseTopicsJSON(content string) ([]topicCandidate, error) {
	m := jsonArrRe.FindString(content)
	if m == "" {
		return nil, fmt.Errorf("AI 选题输出不含 JSON 数组")
	}
	var out []topicCandidate
	if err := json.Unmarshal([]byte(m), &out); err != nil {
		return nil, fmt.Errorf("AI 选题 JSON 解析失败: %w", err)
	}
	clean := out[:0]
	for _, t := range out {
		t.Question = strings.TrimSpace(t.Question)
		if t.Question != "" {
			clean = append(clean, t)
		}
	}
	if len(clean) == 0 {
		return nil, fmt.Errorf("AI 选题为空")
	}
	return clean, nil
}

// SplitTitleBody 拆出「# 标题」与正文（纯函数）。无标题行时 title 为空串。
func SplitTitleBody(content string) (title, body string) {
	content = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(content), "```markdown"))
	content = strings.TrimSuffix(content, "```")
	lines := strings.SplitN(strings.TrimSpace(content), "\n", 2)
	if len(lines) == 0 {
		return "", ""
	}
	first := strings.TrimSpace(lines[0])
	if strings.HasPrefix(first, "#") {
		title = strings.TrimSpace(strings.TrimLeft(first, "#"))
		if len(lines) == 2 {
			body = strings.TrimSpace(lines[1])
		}
		return title, body
	}
	return "", strings.TrimSpace(content)
}

// FirstParagraphDigest 取正文首个内容行做摘要（跳过标题行），UTF-8 安全截
// 120 字节（微信摘要上限）。
func FirstParagraphDigest(body string) string {
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// 去掉列表/引用标记，摘要要的是一句话
		line = strings.TrimSpace(strings.TrimLeft(line, ">-* "))
		if line == "" {
			continue
		}
		return truncateBytesUTF8(line, 120)
	}
	return ""
}

// truncateRunes 按 rune 数截断字符串（日志/提示降长用）。
func truncateRunes(s string, maxRunes int) string {
	runes := []rune(s)
	if len(runes) <= maxRunes {
		return s
	}
	return string(runes[:maxRunes]) + "…"
}

// truncateBytesUTF8 按字节截断且不截破 UTF-8 字符，末尾补省略号（纯函数）。
func truncateBytesUTF8(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	if maxBytes <= 3 {
		return s[:maxBytes]
	}
	b := s[:maxBytes-3] // 预留省略号
	for len(b) > 0 && !utf8.ValidString(b) {
		b = b[:len(b)-1]
	}
	return b + "…"
}

// ExtractVideoPrompt 从口播稿中提取「分镜画面提示词」段落，作为文生视频的 prompt
// （纯函数；无该节时退化为整篇去标记文本）。
func ExtractVideoPrompt(scriptMd string) string {
	sections := []string{"## 分镜画面提示词", "## 视频生成提示词", "## 画面提示词"}
	for _, sec := range sections {
		idx := strings.Index(scriptMd, sec)
		if idx < 0 {
			continue
		}
		rest := scriptMd[idx+len(sec):]
		if next := strings.Index(rest, "\n## "); next >= 0 {
			rest = rest[:next]
		}
		rest = strings.TrimSpace(rest)
		if rest != "" {
			return rest
		}
	}
	// 退化：去 Markdown 标记后的全文
	fallback := regexp.MustCompile(`(?m)^#+\s*`).ReplaceAllString(scriptMd, "")
	return strings.TrimSpace(fallback)
}
