// Package pdfgen 用 wkhtmltopdf 把 Markdown / HTML 渲染成 PDF。
//
// 依赖系统的 wkhtmltopdf 二进制:
//   - macOS:brew install wkhtmltopdf
//   - 生产 linux:apt install wkhtmltopdf fonts-noto-cjk(中文字体)
//
// 链路:Markdown → blackfriday(HTML 片段)→ 包合同 CSS(完整 HTML 文档)→ wkhtmltopdf → PDF bytes。
package pdfgen

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/SebastiaanKlippert/go-wkhtmltopdf"
	"github.com/russross/blackfriday/v2"
)

// contractCSS 合同正文样式(中文字体优先、A4、表格、段首缩进)。
// 中文字体由系统 fonts-noto-cjk 提供,wkhtmltopdf 自动查找。
const contractCSS = `
body { font-family: "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif; font-size: 14px; line-height: 1.8; color: #222; }
h1 { font-size: 22px; text-align: center; margin: 24px 0; }
h2 { font-size: 18px; margin: 18px 0 8px; }
h3 { font-size: 16px; margin: 14px 0 6px; }
p { margin: 8px 0; text-indent: 2em; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
th { background: #f5f5f5; }
ul, ol { margin: 8px 0; padding-left: 2em; }
strong { font-weight: 600; }
@page { margin: 25mm 20mm; }
`

// GenerateFromMarkdown 把 Markdown 渲染成 PDF(MD→HTML→wkhtmltopdf→PDF bytes)。
// title 作为文档大标题(H1)置顶。
func GenerateFromMarkdown(markdown, title string) ([]byte, error) {
	htmlBody := blackfriday.Run([]byte(markdown))
	html := fmt.Sprintf(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>%s</style></head><body><h1>%s</h1>%s</body></html>`,
		contractCSS, escapeHTML(title), string(htmlBody))
	return GenerateFromHTML(html)
}

// GenerateFromHTML 把完整 HTML 文档渲染成 PDF。
func GenerateFromHTML(html string) ([]byte, error) {
	pdfg, err := wkhtmltopdf.NewPDFGenerator()
	if err != nil {
		return nil, fmt.Errorf("初始化 PDF 生成器失败: %w", err)
	}
	page := wkhtmltopdf.NewPageReader(strings.NewReader(html))
	page.EnableLocalFileAccess.Set(true)
	pdfg.AddPage(page)
	pdfg.PageSize.Set(wkhtmltopdf.PageSizeA4)
	// 中文字体由系统提供(fonts-noto-cjk),wkhtmltopdf 渲染时自动使用
	if err := pdfg.Create(); err != nil {
		return nil, fmt.Errorf("生成 PDF 失败(请确认已安装 wkhtmltopdf 二进制): %w", err)
	}
	return pdfg.Bytes(), nil
}

// escapeHTML 转义标题中的 HTML 特殊字符。
func escapeHTML(s string) string {
	var buf bytes.Buffer
	for _, r := range s {
		switch r {
		case '<':
			buf.WriteString("&lt;")
		case '>':
			buf.WriteString("&gt;")
		case '&':
			buf.WriteString("&amp;")
		default:
			buf.WriteRune(r)
		}
	}
	return buf.String()
}
