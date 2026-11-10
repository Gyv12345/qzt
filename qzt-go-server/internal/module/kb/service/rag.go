package service

import (
	"context"
	"encoding/json"
	"errors"
	"html"
	"math"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"

	kbmodel "qzt-go-server/internal/model/kb"
	kbrepo "qzt-go-server/internal/repository/kb"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/pkg/xlogger"
)

// rag.go — P17 知识库 RAG：切片、向量化、余弦检索。
//
// 定位：kb 文档是事实层，切片+向量是它的检索形态。检索封装在本包内部
// （Search 返回带文档标题的命中切片），供 geo 信源产线生成前召回。
// 兜底契约：embedding 未配置或任何失败一律走降级（不报错、返回空），
// 产线永不被 RAG 阻断。

const (
	// chunkTargetRunes 单片目标长度（rune 数）。~500 字对中文语义切分粒度合适。
	chunkTargetRunes = 500
	// chunkOverlapRunes 相邻片重叠长度，防止句子被切断后语义丢失。
	chunkOverlapRunes = 50
)

// ChunkHit 检索命中项。
type ChunkHit struct {
	DocumentID uint
	DocTitle   string
	Seq        int
	Content    string
	Score      float64
}

// htmlTagRe 剥 HTML 标签用（富文本快照先转纯文本再切片）。
var htmlTagRe = regexp.MustCompile(`<[^>]*>`)

// htmlToText HTML 快照转纯文本：剥标签 + 反转义实体 + NBSP 归一 + 压缩空白。
func htmlToText(s string) string {
	s = htmlTagRe.ReplaceAllString(s, "\n")
	s = html.UnescapeString(s)
	// &nbsp; 反转义后是 U+00A0，对语义无益，归一成普通空格
	s = strings.ReplaceAll(s, "\u00a0", " ")
	// 压缩每行空白并去掉空行堆叠
	lines := strings.Split(s, "\n")
	for i, ln := range lines {
		lines[i] = strings.TrimSpace(ln)
	}
	return strings.Join(lines, "\n")
}

// SplitChunks 纯函数：纯文本 → 切片列表。按行边界聚合到目标长度，
// 相邻片带 chunkOverlapRunes 重叠；空文本返回空。
func SplitChunks(text string) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	var chunks []string
	var cur strings.Builder
	curLen := 0
	lines := strings.Split(text, "\n")
	flush := func() {
		if s := strings.TrimSpace(cur.String()); s != "" {
			chunks = append(chunks, s)
		}
		cur.Reset()
		curLen = 0
	}
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		// 单行超长时硬切（保护 500 上限）
		for utf8.RuneCountInString(ln) > chunkTargetRunes {
			// 先冲刷当前累积
			flush()
			r := []rune(ln)
			chunks = append(chunks, string(r[:chunkTargetRunes]))
			// 剩余部分带上重叠继续切
			start := chunkTargetRunes - chunkOverlapRunes
			if start < 0 {
				start = 0
			}
			ln = string(r[start:])
		}
		if curLen+utf8.RuneCountInString(ln) > chunkTargetRunes && curLen > 0 {
			flush()
		}
		if cur.Len() > 0 {
			cur.WriteString("\n")
			curLen++
		}
		cur.WriteString(ln)
		curLen += utf8.RuneCountInString(ln)
	}
	flush()
	// 相邻片重叠：每片头带上一片尾的 overlap 字符（首片除外）
	for i := 1; i < len(chunks); i++ {
		prev := []rune(chunks[i-1])
		ov := chunkOverlapRunes
		if len(prev) < ov {
			ov = len(prev)
		}
		chunks[i] = string(prev[len(prev)-ov:]) + "\n" + chunks[i]
	}
	return chunks
}

// CosineSimilarity 纯函数：两向量余弦相似度；长度不符或零向量返回 0。
func CosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, na, nb float64
	for i := range a {
		dot += a[i] * b[i]
		na += a[i] * a[i]
		nb += b[i] * b[i]
	}
	if na == 0 || nb == 0 {
		return 0
	}
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}

// RAGService 知识库 RAG 服务：切片向量化（保存钩子/reindex）与检索。
type RAGService struct {
	docRepo *kbrepo.DocumentRepo
	chunkRepo *kbrepo.ChunkRepo
}

func NewRAGService() *RAGService {
	return &RAGService{docRepo: kbrepo.NewDocumentRepo(), chunkRepo: kbrepo.NewChunkRepo()}
}

// chunkStatus 批量向量化结果落库形态：切片+向量写 Chunk 行。
func buildChunkRows(docID uint, texts []string, vectors [][]float64) []kbmodel.KbChunk {
	rows := make([]kbmodel.KbChunk, 0, len(texts))
	for i, t := range texts {
		row := kbmodel.KbChunk{
			DocumentID: docID,
			Seq:        i,
			Content:    t,
			Status:     "ready",
			CharCount:  utf8.RuneCountInString(t),
		}
		if i < len(vectors) {
			b, _ := json.Marshal(vectors[i])
			row.Embedding = string(b)
			row.VectorDim = len(vectors[i])
		}
		rows = append(rows, row)
	}
	return rows
}

// SyncDocument 文档保存钩子：切片 + 向量化 + 原子替换该文档切片。
// 失败返回 error（调用方记日志即可，不阻断文档保存）；
// embedding 未配置时静默跳过（返回 nil，文档无切片）。
func (s *RAGService) SyncDocument(ctx context.Context, docID uint, userID uint) error {
	if !s.RAGEnabled(ctx) {
		return nil
	}
	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return err
	}
	text := htmlToText(doc.Content)
	texts := SplitChunks(text)
	// 空文档：清空切片即可
	if len(texts) == 0 {
		return s.chunkRepo.DeleteByDoc(ctx, docID)
	}
	resp, err := llm.Embeddings(ctx, llm.EmbeddingRequest{
		Texts:   texts,
		UserID:  userID,
		Feature: "kb.rag.embed",
	})
	if err != nil {
		return err
	}
	return s.chunkRepo.ReplaceDocChunks(ctx, docID, buildChunkRows(docID, texts, resp.Vectors))
}

// ReindexDocument 强制重建某文档切片（重建索引按钮）。
func (s *RAGService) ReindexDocument(ctx context.Context, docID, userID uint) (int, error) {
	if !llm.EmbeddingEnabled() {
		return 0, ErrRAGNotConfigured
	}
	if setting.Get(ctx, ragEnabledKey) != "1" {
		return 0, errors.New("kb: RAG 召回开关未开启（知识库页右上角开关或参数配置 kb.rag_enabled）")
	}
	if err := s.SyncDocument(ctx, docID, userID); err != nil {
		return 0, err
	}
	n, err := s.chunkRepo.CountByDoc(ctx, docID)
	if err != nil {
		return 0, err
	}
	return int(n), nil
}

// Search 检索：查询向量化 → 全量 ready 切片余弦 → top-K。
// 降级契约：未配置/无切片/失败一律返回 (nil, nil)，不阻断调用方产线。
func (s *RAGService) Search(ctx context.Context, query string, topK int) ([]ChunkHit, error) {
	if !s.RAGEnabled(ctx) || strings.TrimSpace(query) == "" || topK <= 0 {
		return nil, nil
	}
	resp, err := llm.Embeddings(ctx, llm.EmbeddingRequest{
		Texts:   []string{query},
		Feature: "kb.rag.embed",
	})
	if err != nil {
		xlogger.ErrorfCtx(ctx, "kb rag: query embedding failed: %v", err)
		return nil, nil
	}
	chunks, err := s.chunkRepo.ListReady(ctx)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "kb rag: list chunks failed: %v", err)
		return nil, nil
	}
	if len(chunks) == 0 {
		return nil, nil
	}
	// 文档标题一次查全，内存映射（kb 文档量小）
	docs, err := s.docRepo.ListSimple(ctx)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "kb rag: list docs failed: %v", err)
		return nil, nil
	}
	titles := make(map[uint]string, len(docs))
	for _, d := range docs {
		titles[d.ID] = d.Title
	}
	hits := make([]ChunkHit, 0, topK)
	for _, ch := range chunks {
		var vec []float64
		if err := json.Unmarshal([]byte(ch.Embedding), &vec); err != nil || len(vec) == 0 {
			continue
		}
		score := CosineSimilarity(resp.Vectors[0], vec)
		hits = append(hits, ChunkHit{
			DocumentID: ch.DocumentID,
			DocTitle:   titles[ch.DocumentID],
			Seq:        ch.Seq,
			Content:    ch.Content,
			Score:      score,
		})
	}
	// 余弦降序取 top-K
	sort.Slice(hits, func(i, j int) bool { return hits[i].Score > hits[j].Score })
	if len(hits) > topK {
		hits = hits[:topK]
	}
	return hits, nil
}

// ErrRAGNotConfigured embedding 未配置（重建索引时明确报错）。
var ErrRAGNotConfigured = errors.New("kb: embedding 未配置（KB_EMBEDDING_API_KEY），无法重建索引")

// ragEnabledKey RAG 总开关的 sys_config 键（admin「参数配置」或 kb 页开关可改，写后缓存自动刷新）。
const ragEnabledKey = "kb.rag_enabled"

// RAGEnabled RAG 总开关：sys_config 的 kb.rag_enabled=1 且 embedding 已配置。
// 默认关闭（配置缺省按关处理），管理员在界面上显式开启后才生效。
func (s *RAGService) RAGEnabled(ctx context.Context) bool {
	return setting.Get(ctx, ragEnabledKey) == "1" && llm.EmbeddingEnabled()
}
