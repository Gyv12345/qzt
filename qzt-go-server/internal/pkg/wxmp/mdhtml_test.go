package wxmp

import (
	"strings"
	"testing"
)

func TestMarkdownToWechatHTMLBasic(t *testing.T) {
	html := MarkdownToWechatHTML("# 标题\n\n正文段落，**加粗**。")
	if !strings.Contains(html, `<h1 style="margin:24px 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;">`) {
		t.Fatalf("h1 未注入内联样式: %s", html)
	}
	if !strings.Contains(html, `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#333;letter-spacing:0.5px;">`) {
		t.Fatalf("p 未注入内联样式: %s", html)
	}
	if !strings.Contains(html, "<strong>") {
		t.Fatalf("加粗丢失: %s", html)
	}
}

func TestInjectInlineStylesTable(t *testing.T) {
	in := "<table><thead><tr><th>项</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>"
	out := InjectInlineStyles(in)
	for _, want := range []string{
		`<table style="border-collapse:collapse;width:100%;margin:0 0 16px;font-size:13px;">`,
		`<th style="border:1px solid #d9d9d9;padding:6px 10px;background:#f5f6f8;font-weight:bold;text-align:left;">`,
		`<td style="border:1px solid #d9d9d9;padding:6px 10px;color:#333;">`,
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("表格样式缺失 %q: %s", want, out)
		}
	}
}

func TestInjectInlineStylesBlockCode(t *testing.T) {
	// 带语言 class 的围栏代码块（blackfriday 输出形态）
	in := `<pre><code class="language-go">fmt.Println("hi")</code></pre>`
	out := InjectInlineStyles(in)
	if !strings.Contains(out, `background:#282c34`) {
		t.Fatalf("pre 未注入深色底: %s", out)
	}
	if !strings.Contains(out, `color:#abb2bf;`) {
		t.Fatalf("代码块内 code 未覆盖为深色底配套样式: %s", out)
	}
	if strings.Contains(out, `color:#c7254e`) {
		t.Fatalf("代码块内不应残留行内代码粉字样式: %s", out)
	}
}

func TestInjectInlineStylesPreservesAttrTags(t *testing.T) {
	// 带属性的标签不覆盖（避免吃掉自定义样式）
	in := `<p class="keep" style="color:red;">x</p>`
	if out := InjectInlineStyles(in); out != in {
		t.Fatalf("带属性标签被覆盖: %s", out)
	}
}

func TestMarkdownToWechatHTMLListAndQuote(t *testing.T) {
	html := MarkdownToWechatHTML("- 第一条\n- 第二条\n\n> 引用")
	for _, want := range []string{`<ul style="`, `<li style="`, `<blockquote style="`} {
		if !strings.Contains(html, want) {
			t.Fatalf("缺失 %q: %s", want, html)
		}
	}
}
