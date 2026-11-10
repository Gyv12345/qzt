// mdhtml.go Markdown → 公众号正文 HTML。
//
// 微信草稿正文只支持白名单标签，且会剥掉 <style> 标签与 class 属性——
// 唯一可靠的排版方式是把样式以 style 属性内联到每个标签上。
// 这里用 blackfriday 出基础 HTML（公众号可解析），再逐标签注入内联样式。
package wxmp

import (
	"regexp"

	"github.com/russross/blackfriday/v2"
)

// MarkdownToWechatHTML 渲染 Markdown 为带内联样式的公众号正文 HTML。
func MarkdownToWechatHTML(md string) string {
	renderer := blackfriday.NewHTMLRenderer(blackfriday.HTMLRendererParameters{
		Flags: blackfriday.UseXHTML,
	})
	html := string(blackfriday.Run([]byte(md), blackfriday.WithRenderer(renderer)))
	return InjectInlineStyles(html)
}

// 标签级内联样式（公众号正文主流排版参数：15px 正文、1.75 行高、灰边表格）。
// XHTML 关闭符（<br/> 等）不影响 open tag 匹配。
var inlineStyles = []struct {
	tag   string
	style string
}{
	{"h1", "margin:24px 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;"},
	{"h2", "margin:22px 0 14px;font-size:18px;font-weight:bold;color:#1a1a1a;"},
	{"h3", "margin:20px 0 12px;font-size:16px;font-weight:bold;color:#1a1a1a;"},
	{"h4", "margin:18px 0 10px;font-size:15px;font-weight:bold;color:#1a1a1a;"},
	{"p", "margin:0 0 16px;font-size:15px;line-height:1.75;color:#333;letter-spacing:0.5px;"},
	{"blockquote", "margin:0 0 16px;padding:10px 14px;border-left:3px solid #1677FF;background:#f7f9fc;color:#666;font-size:14px;line-height:1.7;"},
	{"table", "border-collapse:collapse;width:100%;margin:0 0 16px;font-size:13px;"},
	{"th", "border:1px solid #d9d9d9;padding:6px 10px;background:#f5f6f8;font-weight:bold;text-align:left;"},
	{"td", "border:1px solid #d9d9d9;padding:6px 10px;color:#333;"},
	{"ul", "margin:0 0 16px;padding-left:22px;"},
	{"ol", "margin:0 0 16px;padding-left:22px;"},
	{"li", "font-size:15px;line-height:1.75;color:#333;margin:0 0 6px;"},
	{"pre", "margin:0 0 16px;padding:12px;background:#282c34;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;"},
	{"code", "padding:1px 5px;background:#f0f2f5;border-radius:3px;font-size:13px;color:#c7254e;"},
	{"hr", "border:none;border-top:1px solid #e8e8e8;margin:24px 0;"},
	{"figure", "margin:0 0 16px;text-align:center;"},
	{"figcaption", "margin-top:6px;font-size:13px;color:#999;text-align:center;"},
}

// openTagRe 匹配无属性的开标签 <tag>（blackfriday 输出无 class/属性，
// 带属性的标签不重复注入，避免覆盖调用方自定义样式）。
func openTagRe(tag string) *regexp.Regexp {
	return regexp.MustCompile(`<` + tag + `>`)
}

// preCodeRe 代码块内 code 的统一改写：<pre style=...> 后紧跟的任意 <code ...>
// （blackfriday 围栏代码块会带 class="language-x"，不在无属性注入范围内）。
var preCodeRe = regexp.MustCompile(`<pre style="[^"]*">(<code)[^>]*>`)

// InjectInlineStyles 给基础 HTML 的无属性标签注入内联样式（纯函数，单测覆盖）。
func InjectInlineStyles(html string) string {
	for _, s := range inlineStyles {
		html = openTagRe(s.tag).ReplaceAllString(html, `<`+s.tag+` style="`+s.style+`">`)
	}
	// 代码块内的 code 覆盖为深色底等宽样式（与 pre 的深色底配套，去行内粉字底色）。
	html = preCodeRe.ReplaceAllString(html,
		`<pre style="margin:0 0 16px;padding:12px;background:#282c34;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;"><code style="background:transparent;padding:0;color:#abb2bf;">`)
	return html
}
