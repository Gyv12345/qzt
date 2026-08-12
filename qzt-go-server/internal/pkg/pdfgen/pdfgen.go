// Package pdfgen 用 weasyprint 把 Markdown / HTML 渲染成 PDF。
//
// 依赖系统的 weasyprint(HTML/CSS → PDF,基于 cairo/pango):
//   - 生产 linux(Ubuntu):apt install weasyprint fonts-noto-cjk(中文字体)+ fontconfig
//   - macOS:brew install weasyprint
//
// 链路:Markdown → blackfriday(HTML 片段)→ 包合同 CSS(完整 HTML 文档)→ weasyprint → PDF bytes。
//
// 选 weasyprint 而非 wkhtmltopdf:wkhtmltopdf 上游已停更,Ubuntu 24.04+ 仓库已下架;
// weasyprint 活跃维护、CSS Paged Media 支持好、中文渲染良好(fonts-noto-cjk + fontconfig)。
// 代价:每次生成 PDF fork 一个 Python 进程(冷启动 ~1s),合同签署低频,可接受。
package pdfgen

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"

	"github.com/russross/blackfriday/v2"
)

// contractCSS 合同正文样式(中文字体优先、A4、表格、段首缩进)。
// 中文字体由系统 fonts-noto-cjk 提供,weasyprint 通过 fontconfig 自动查找。
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

// GenerateFromMarkdown 把 Markdown 渲染成 PDF(MD→HTML→weasyprint→PDF bytes)。
// title 作为文档大标题(H1)置顶。
func GenerateFromMarkdown(markdown, title string) ([]byte, error) {
	htmlBody := blackfriday.Run([]byte(markdown))
	html := fmt.Sprintf(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>%s</style></head><body><h1>%s</h1>%s</body></html>`,
		contractCSS, escapeHTML(title), string(htmlBody))
	return GenerateFromHTML(html)
}

// GenerateFromHTML 把完整 HTML 文档渲染成 PDF(写临时文件 → weasyprint → 读回 bytes)。
// weasyprint 不直接支持 stdin 完整 HTML 的稳定输入,故走临时文件。
func GenerateFromHTML(html string) ([]byte, error) {
	tmpHTML, err := os.CreateTemp("", "esign-*.html")
	if err != nil {
		return nil, fmt.Errorf("创建临时 HTML 文件失败: %w", err)
	}
	htmlPath := tmpHTML.Name()
	defer os.Remove(htmlPath)
	if _, err := tmpHTML.WriteString(html); err != nil {
		tmpHTML.Close()
		return nil, fmt.Errorf("写入临时 HTML 文件失败: %w", err)
	}
	tmpHTML.Close()

	pdfPath := htmlPath + ".pdf"
	defer os.Remove(pdfPath)

	cmd := exec.Command("weasyprint", htmlPath, pdfPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("weasyprint 生成 PDF 失败(请确认已安装 weasyprint): %w; stderr: %s", err, stderr.String())
	}
	return os.ReadFile(pdfPath)
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
