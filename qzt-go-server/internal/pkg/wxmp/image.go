// image.go 公众号图文正文图片素材上传（外链图转 mmbiz 内链用）。
//
// 公众号图文正文只认微信自家 CDN（mmbiz.qpic.cn）的图片，外链图在图文里
// 会被拦成死图——推送草稿前把 Markdown 正文里的外链图逐张经 uploadimg
// 换成内链。注意 uploadimg 返回的是「图文内容内的图片 URL」，不是素材库
// 素材：临时/永久素材请分别走 media/upload 与 material/add_material（见 draft.go）。
package wxmp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
)

// UploadContentImage 上传图片为图文内容内的图片素材（POST /cgi-bin/media/uploadimg），
// 返回微信 CDN 内链 URL（https://mmbiz.qpic.cn/...）。
// multipart 字段名必须是 media（与 draft.go UploadPermanentImage 同构；
// 官方脚本 wxpublish.py 实录字段名即 media）。
func (c *Client) UploadContentImage(ctx context.Context, filename string, data []byte) (string, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("media", filename)
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(data); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, withToken(apiBase+"/cgi-bin/media/uploadimg", token), &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	// 图片上传比常规 JSON 调用慢，放宽到与封面素材同档的超时。
	hc := *c.hc
	hc.Timeout = mediaHTTPTimeout
	respHTTP, err := hc.Do(req)
	if err != nil {
		return "", err
	}
	defer respHTTP.Body.Close()
	body, err := io.ReadAll(io.LimitReader(respHTTP.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if respHTTP.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", respHTTP.StatusCode, string(body))
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		URL     string `json:"url"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("解析正文图片上传响应失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", translateWxErr("上传公众号正文图片", resp.ErrCode, resp.ErrMsg)
	}
	if resp.URL == "" {
		return "", errors.New("上传公众号正文图片失败: 未返回 url")
	}
	return resp.URL, nil
}
