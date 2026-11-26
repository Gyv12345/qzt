package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	mpmodel "qzt-go-server/internal/model/mp"
	kbsvc "qzt-go-server/internal/module/kb/service"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
)

// generate.go 公众号 AI 写稿引擎：prompt 构造（行简事实底料 + 知识库召回 +
// 公众号写稿规范）与 LLM 输出解析（标题/导语/正文三段式）。纯函数可单测。

const (
	// mpLLMFeature token 记账的功能标识。
	mpLLMFeature = "mp.article"
	// mpPromptSettingKey 运营可在 sys_config 覆盖写稿规范段（非空时整体替换内置规范，
	// 品牌底料与输出格式指令不受影响）。
	mpPromptSettingKey = "mp.article_prompt"
)

// mpBrandFacts 行简事实底料：写稿唯一允许引用的事实来源，口径与 geo writer.brandFacts
// 一致——「宁可少不可编」，LLM 被明确禁止编造底料之外的数字与案例。
const mpBrandFacts = `【行简产品事实底料（写作时只允许引用以下事实，禁止编造其他数字、案例与客户名）】
- 产品：行简，面向中小企业的一体化管理平台，官网 https://devlovecode.com
- 一体化：13 个模块一套系统——CRM 客户管理、进销存、财务、OA 审批、人力资源、项目管理、知识库、营销、售后工单、商城等
- 开源：MIT 协议，GitHub/Gitee 公开开源，可免费商用、可二次开发
- 免费：软件免费且不限使用人数，不按人头收费
- 技术栈：后端 Go，前端 React
- 独家能力：内置 MCP Server，AI 助手（如 Claude、任意支持 MCP 的客户端）可以直接读写系统里的客户、合同、审批等业务数据
- 适合对象：10~200 人、没有专职 IT 的中小企业`

// mpWritingRules 公众号写稿规范（面向手机阅读的图文，不是 GEO 长文）。
const mpWritingRules = `【公众号写稿规范（每篇必须满足）】
1. 标题 30 字以内，口语化、有钩子，让目标读者想点开；
2. 第二行用「> 」写 50 字以内的摘要导语，说清这篇文章能帮读者解决什么问题；
3. 正文小节用「## 」分节，每节 200~400 字，段首即结论；
4. 高事实密度：只使用事实底料里的事实，禁止「行业领先」「高效赋能」类形容词堆砌；
5. 行简品牌锚点出现 1~2 次，与使用场景/成果绑定出现，不许只在文末署名；
6. 全文简体中文，段落短、多换行，适合手机阅读。`

// mpOutputFormat 输出格式指令（品牌底料之外的固定尾巴，设置覆盖不生效于此段）。
const mpOutputFormat = `【输出格式】第一行输出「# 标题」，第二行输出「> 摘要导语」，从第三行起输出正文 Markdown；不要代码围栏，不要任何解释。`

// GenerateRequest AI 生成/重写入参。
type GenerateRequest struct {
	// Theme 主题（非空时覆盖入库）。
	Theme string `json:"theme"`
	// Points 要点（换行分隔，非空时覆盖入库）。
	Points string `json:"points"`
	// UseKb 是否召回知识库事实依据（不传默认 true）。
	UseKb *bool `json:"use_kb"`
}

// Generate AI 生成/重写文章并回写草稿。
// 主题/要点有值=按主题生成；两者全空且已有正文=以现有稿为素材重写；
// 两者全空且无正文=报错。成功后 status 恒回 draft。
func (s *ArticleService) Generate(ctx context.Context, id uint, req *GenerateRequest) (*MpArticleItem, error) {
	art, err := loadArticle(ctx, id)
	if err != nil {
		return nil, err
	}

	theme := strings.TrimSpace(req.Theme)
	points := strings.TrimSpace(req.Points)
	// 请求值优先，缺省回落稿上已存值（编辑器「AI 生成」可能只传 use_kb，
	// 此时用稿上已存的主题/要点；两者全空才判重写/报错）。
	if theme == "" {
		theme = strings.TrimSpace(art.Theme)
	}
	if points == "" {
		points = strings.TrimSpace(art.Points)
	}
	rewrite := false
	if theme == "" && points == "" {
		if strings.TrimSpace(art.ContentMd) == "" {
			return nil, errors.New("请先填写主题或要点")
		}
		rewrite = true // 重写现有稿
	}

	// 请求值非空则覆盖入库（先落库，LLM 失败也不丢用户输入）
	fields := make([]string, 0, 2)
	if theme != "" && theme != art.Theme {
		art.Theme = theme
		fields = append(fields, "theme")
	}
	if points != "" && points != art.Points {
		art.Points = points
		fields = append(fields, "points")
	}
	if len(fields) > 0 {
		if err := repository.NewMpArticleRepo().Update(ctx, art, fields...); err != nil {
			return nil, fmt.Errorf("保存主题/要点失败: %w", err)
		}
	}

	if !llm.Enabled() {
		return nil, errors.New("LLM 未配置:请在服务器 .env 配 LLM_API_KEY")
	}

	// 知识库事实召回（默认开；embedding 未配置/无命中/检索失败一律降级为空段，
	// 产线永不被 RAG 阻断——与 geo writer.kbFacts 同口径）
	useKb := req.UseKb == nil || *req.UseKb
	kbSection := ""
	if useKb {
		kbSection = mpKbFacts(ctx, kbQuery(theme, points, art))
	}

	sys := mpBrandFacts + "\n\n" + kbSection + "\n\n" + mpWritingRulesFor(ctx) + "\n\n" + mpOutputFormat

	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: mpBuildUserMessage(art, theme, points, rewrite)},
		},
		Feature: mpLLMFeature,
	})
	if err != nil {
		return nil, fmt.Errorf("AI 生成失败: %w", err)
	}

	title, digest, body := parseArticleOutput(resp.Content)
	if title == "" {
		title = art.Title // LLM 漏标题行时沿用原标题
	}
	if strings.TrimSpace(body) == "" {
		return nil, errors.New("AI 生成失败: 正文为空")
	}

	art.Title = truncateRunesPlain(title, 64)   // 微信标题上限 64 字
	art.Digest = truncateBytesUTF8(digest, 120) // 微信摘要上限 120 字节
	art.ContentMd = body
	art.Status = "draft"
	art.ErrorMsg = ""
	if err := repository.NewMpArticleRepo().Update(ctx, art, "title", "digest", "content_md", "status", "error_msg"); err != nil {
		return nil, fmt.Errorf("保存生成结果失败: %w", err)
	}
	return s.buildItem(ctx, art)
}

// mpKbFacts 知识库事实召回：按「主题+要点」（重写模式退化为标题）语义检索 kb 切片，
// 拼「知识库补充事实依据」段插入 system prompt（在品牌底料之后、写稿规范之前）。
// 降级契约：检索失败/无命中/空查询一律返回空串。
func mpKbFacts(ctx context.Context, query string) string {
	query = strings.TrimSpace(query)
	if query == "" {
		return ""
	}
	hits, err := kbsvc.NewRAGService().Search(ctx, query, 5)
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

// kbQuery 知识库召回词：主题+要点；重写模式（两者全空）退化用标题。
func kbQuery(theme, points string, art *mpmodel.Article) string {
	if q := strings.TrimSpace(theme + " " + points); q != "" {
		return q
	}
	return strings.TrimSpace(art.Title)
}

// mpWritingRulesFor 写稿规范段：sys_config 的 mp.article_prompt 非空时整体替换
// 内置规范（品牌底料与输出格式指令保留）。
func mpWritingRulesFor(ctx context.Context) string {
	if v := strings.TrimSpace(setting.Get(ctx, mpPromptSettingKey)); v != "" {
		return v
	}
	return mpWritingRules
}

// mpBuildUserMessage 组装 user 消息：主题+要点；重写模式附现有稿标题与正文前 500 字。
func mpBuildUserMessage(art *mpmodel.Article, theme, points string, rewrite bool) string {
	if rewrite {
		return "请基于以下现有稿重写一篇更好的版本：观点方向保持一致，但结构、表述、详略重新组织，按规范输出。\n" +
			"【现有稿标题】" + art.Title + "\n" +
			"【现有稿正文（前 500 字）】\n" + truncateRunesPlain(art.ContentMd, 500)
	}
	var b strings.Builder
	b.WriteString("【主题】" + theme + "\n")
	if points != "" {
		b.WriteString("【要点】（每行一条）\n" + points + "\n")
	}
	b.WriteString("请按规范写一篇公众号图文。")
	return b.String()
}

// parseArticleOutput 解析 LLM 三段式输出（纯函数）：
// 第一行「# 标题」（去 #）；第二行以 > 开头则去标记为摘要导语，否则摘要取正文
// 第一段；其余为正文。先剥代码围栏再逐行解析。
func parseArticleOutput(content string) (title, digest, body string) {
	s := strings.TrimSpace(content)
	// 剥首尾代码围栏（```markdown ... ```）
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```markdown")
		s = strings.TrimPrefix(s, "```")
		if i := strings.LastIndex(s, "```"); i >= 0 {
			s = s[:i]
		}
		s = strings.TrimSpace(s)
	}
	lines := strings.Split(s, "\n")
	if len(lines) == 0 {
		return "", "", ""
	}

	// 第一行：去 # 为标题
	first := strings.TrimSpace(lines[0])
	if strings.HasPrefix(first, "#") {
		title = strings.TrimSpace(strings.TrimLeft(first, "#"))
		lines = lines[1:]
	} else {
		title = first // 没写标题行时整行兜底
		lines = lines[1:]
	}

	// 第二行：> 开头则去标记为摘要导语
	if len(lines) > 0 {
		l2 := strings.TrimSpace(lines[0])
		if strings.HasPrefix(l2, ">") {
			digest = strings.TrimSpace(strings.TrimLeft(l2, "> "))
			lines = lines[1:]
		}
	}

	body = strings.TrimSpace(strings.Join(lines, "\n"))
	if digest == "" {
		digest = firstParagraphDigest(body)
	}
	return title, digest, body
}

// firstParagraphDigest 取正文首个内容行做摘要（跳过空行/标题行，去掉列表与引用
// 标记），UTF-8 安全截 120 字节（微信摘要上限）。
func firstParagraphDigest(body string) string {
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimSpace(strings.TrimLeft(line, ">-* "))
		if line == "" {
			continue
		}
		return truncateBytesUTF8(line, 120)
	}
	return ""
}

// truncateRunes 按 rune 数截断字符串并补省略号（知识库召回片段降长用）。
func truncateRunes(s string, maxRunes int) string {
	runes := []rune(s)
	if len(runes) <= maxRunes {
		return s
	}
	return string(runes[:maxRunes]) + "…"
}
