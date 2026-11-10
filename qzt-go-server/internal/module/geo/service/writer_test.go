package service

import (
	"strings"
	"testing"
)

func TestSplitTitleBody(t *testing.T) {
	title, body := SplitTitleBody("# 免费CRM怎么选\n\n正文第一段。\n\n正文第二段。")
	if title != "免费CRM怎么选" {
		t.Fatalf("title = %q", title)
	}
	if !strings.HasPrefix(body, "正文第一段") || !strings.Contains(body, "正文第二段") {
		t.Fatalf("body = %q", body)
	}

	// 无标题行：整体作为正文
	title, body = SplitTitleBody("直接正文")
	if title != "" || body != "直接正文" {
		t.Fatalf("无标题拆分异常: %q / %q", title, body)
	}

	// 多级标题
	title, _ = SplitTitleBody("## 二级标题\n内容")
	if title != "二级标题" {
		t.Fatalf("二级标题解析异常: %q", title)
	}
}

func TestFirstParagraphDigest(t *testing.T) {
	body := "# 标题\n\n这是摘要段，讲结论。\n\n## 第二章\n\n细节。"
	got := FirstParagraphDigest(body)
	if !strings.HasPrefix(got, "这是摘要段") {
		t.Fatalf("摘要应取首个非空段落: %q", got)
	}

	// 首段超长时按 120 字节截断
	long := strings.Repeat("行", 100) // 每个汉字 3 字节 = 300 字节
	got = FirstParagraphDigest(long)
	if len(got) > 120+3 { // 120 字节 + 省略号
		t.Fatalf("摘要超长: %d 字节", len(got))
	}
	if !strings.HasSuffix(got, "…") {
		t.Fatalf("截断应带省略号: %q", got)
	}
}

func TestTruncateBytesUTF8(t *testing.T) {
	if got := truncateBytesUTF8("abc", 10); got != "abc" {
		t.Fatalf("未超长不应截断: %q", got)
	}
	// 中文 3 字节：9 字节上限 → 2 个汉字 + 省略号（不截破）
	got := truncateBytesUTF8("行简开源", 9)
	if got != "行简…" {
		t.Fatalf("got = %q", got)
	}
	if !utf8Valid(got) {
		t.Fatalf("截断结果应为合法 UTF-8: %q", got)
	}
}

func TestParseTopicsJSON(t *testing.T) {
	in := "好的，以下是选题：\n```json\n[{\"question\":\"免费的进销存软件有哪些？\",\"reason\":\"矩阵缺失\",\"prompt_id\":14}]\n```"
	out, err := parseTopicsJSON(in)
	if err != nil {
		t.Fatalf("parseTopicsJSON 失败: %v", err)
	}
	if len(out) != 1 || out[0].Question != "免费的进销存软件有哪些？" || out[0].PromptID != 14 {
		t.Fatalf("解析结果异常: %+v", out)
	}

	// 空问题被过滤
	if _, err := parseTopicsJSON(`[{"question":"  "},{"question":"有效问题"}]`); err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if _, err := parseTopicsJSON("没有数组"); err == nil {
		t.Fatal("无 JSON 数组应报错")
	}
}

func TestExtractVideoPrompt(t *testing.T) {
	script := "# 视频标题\n\n## 口播文案\n三分钟带你了解开源CRM。\n\n## 分镜画面提示词\n现代办公室场景，创业团队围坐讨论，明亮自然光，写实风格。\n\n## 结尾"
	got := ExtractVideoPrompt(script)
	if !strings.Contains(got, "现代办公室场景") || strings.Contains(got, "结尾") {
		t.Fatalf("画面提示词提取异常: %q", got)
	}

	// 无该节退化为全文
	if got := ExtractVideoPrompt("纯文本"); got != "纯文本" {
		t.Fatalf("退化逻辑异常: %q", got)
	}
}

func TestGenreForTopic(t *testing.T) {
	if genreForTopic(1) != genreForTopic(uint(1+len(genreOrder))) {
		t.Fatal("同余选题应得到同一体裁")
	}
	for _, g := range []uint{1, 2, 3, 4, 5} {
		if genreInstructions[genreForTopic(g)] == "" {
			t.Fatalf("体裁 %q 无指令", genreForTopic(g))
		}
	}
}

func utf8Valid(s string) bool {
	for _, r := range s {
		if r == 0xFFFD {
			return false
		}
	}
	return true
}
