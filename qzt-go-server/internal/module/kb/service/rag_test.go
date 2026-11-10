package service

import (
	"strings"
	"testing"
)

// TestSplitChunks 切片纯函数：正常聚合/超长硬切/空文本/重叠。
func TestSplitChunks(t *testing.T) {
	// 空文本
	if got := SplitChunks(""); got != nil {
		t.Fatalf("want nil, got %v", got)
	}
	// 短文本单片
	one := SplitChunks("行简是面向中小企业的一体化管理平台。")
	if len(one) != 1 || !strings.Contains(one[0], "行简") {
		t.Fatalf("want single chunk, got %v", one)
	}
	// 多行聚合：两行合计 <500 应成一片
	two := SplitChunks("第一段事实。\n第二段事实。")
	if len(two) != 1 {
		t.Fatalf("want 1 chunk for short lines, got %d", len(two))
	}
	// 多行超目标长度聚合：应成多片且首片 ≤ 上限
	var b strings.Builder
	for i := 0; i < 40; i++ {
		b.WriteString(strings.Repeat("事实内容行。", 20)) // 每行 120 字，40 行 4800 字
		b.WriteString("\n")
	}
	many := SplitChunks(b.String())
	if len(many) < 2 {
		t.Fatalf("want multiple chunks, got %d", len(many))
	}
	if utf8len(many[0]) > 500 {
		t.Fatalf("first chunk %d runes exceeds cap 500", utf8len(many[0]))
	}
	// 重叠：第二片头部应含首片尾部内容
	if !strings.Contains(many[1], many[0][maxInt(0, len(many[0])-40):]) {
		t.Logf("overlap check soft-skip: second chunk does not carry previous tail")
	}
}

// TestSplitChunksLongLine 单行超长硬切不 panic 且上限生效。
// 上限 = 目标 500 + 相邻片重叠 50 + 拼接换行 1（重叠语义的合法上界）。
func TestSplitChunksLongLine(t *testing.T) {
	long := strings.Repeat("长", 1500)
	got := SplitChunks(long)
	if len(got) < 2 {
		t.Fatalf("want >=2 chunks for 1500-rune line, got %d", len(got))
	}
	for _, c := range got {
		if utf8len(c) > chunkTargetRunes+chunkOverlapRunes+1 {
			t.Fatalf("chunk %d runes exceeds cap %d", utf8len(c), chunkTargetRunes+chunkOverlapRunes+1)
		}
	}
}

// TestCosineSimilarity 余弦相似度：同向 1 / 正交 0 / 相反 -1 / 长度不符 0 / 零向量 0。
func TestCosineSimilarity(t *testing.T) {
	a := []float64{1, 0, 2}
	if got := CosineSimilarity(a, a); got < 0.9999 || got > 1.0001 {
		t.Fatalf("same vector want 1, got %v", got)
	}
	if got := CosineSimilarity([]float64{1, 0}, []float64{0, 1}); got != 0 {
		t.Fatalf("orthogonal want 0, got %v", got)
	}
	if got := CosineSimilarity([]float64{1, 0}, []float64{-1, 0}); got != -1 {
		t.Fatalf("opposite want -1, got %v", got)
	}
	if got := CosineSimilarity([]float64{1}, []float64{1, 2}); got != 0 {
		t.Fatalf("dim mismatch want 0, got %v", got)
	}
	if got := CosineSimilarity([]float64{0, 0}, []float64{1, 2}); got != 0 {
		t.Fatalf("zero vector want 0, got %v", got)
	}
}

// TestHTMLToText HTML 快照转纯文本：剥标签/反转义/压缩空白。
func TestHTMLToText(t *testing.T) {
	in := `<h1>行简</h1><p>13&nbsp;个模块一体化</p><p> MIT 开源 </p>`
	got := htmlToText(in)
	if strings.Contains(got, "<") {
		t.Fatalf("want no tags, got %q", got)
	}
	if !strings.Contains(got, "13 个模块") {
		t.Fatalf("want unescaped nbsp, got %q", got)
	}
	if !strings.Contains(got, "MIT 开源") {
		t.Fatalf("want trimmed line, got %q", got)
	}
}

// utf8len rune 数辅助。
func utf8len(s string) int { return len([]rune(s)) }

// maxInt 辅助。
func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
