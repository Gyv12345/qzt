// Package esignclient 封装 e签宝(esign.cn)V3 开放平台 API 调用。
//
// 鉴权方式:请求签名(HMAC-SHA256)。每个请求带 X-Tsign-Open-* 头:
//   - X-Tsign-Open-App-Id:应用 AppId
//   - X-Tsign-Open-Timestamp:毫秒时间戳
//   - X-Tsign-Open-Signature:Base64(HMAC-SHA256(待签名串, AppSecret))
//
// 待签名串(e签宝 V3 标准)= method\naccept\ncontentMD5\ncontentType\ndate\nheaders\nurl
// 其中 contentMD5 = Base64(MD5(body)),无 body 则空。
//
// 配置(AppId/AppSecret/BaseURL/CallbackURL)从 sys_config 表读取(setting.Get),
// 管理员后台可热改,无需重启。沙箱 BaseURL:smlopenapi.esign.cn,正式:openapi.esign.cn。
//
// 注意:签名算法与端点遵循 e签宝 V3 文档(open.esign.cn/doc/opendoc/apiv3-guide/tfb6gn),
// 首次接入需用沙箱凭证联调验证(不同应用可能的细节差异)。
package esignclient

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const httpTimeout = 30 * time.Second // 含文件上传,略长

// Config e签宝配置(从 sys_config 读取)。
type Config struct {
	AppID        string
	AppSecret    string
	BaseURL      string // 沙箱 https://smlopenapi.esign.cn / 正式 https://openapi.esign.cn
	CallbackURL  string // 签署完成回调地址(供后台配置,实际校验在 handler)
}

// Client e签宝 API 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// NewClient 创建 e签宝客户端。
func NewClient(cfg Config) *Client {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://smlopenapi.esign.cn" // 默认沙箱
	}
	return &Client{
		cfg: cfg,
		hc:  &http.Client{Timeout: httpTimeout},
	}
}

// IsConfigured 是否已配置有效凭证。
func (c *Client) IsConfigured() bool {
	return c.cfg.AppID != "" && c.cfg.AppSecret != ""
}

// ── 签署方 / 文件参数 ──

// Signer 签署方(个人)。
type Signer struct {
	Name      string `json:"name"`
	Mobile    string `json:"mobile"`     // 接收签署短信的手机号
	IDNumber  string `json:"idNumber"`   // 身份证(实名认证用,可选)
	Email     string `json:"email"`      // 邮箱(可选,二选一与手机)
	SignOrder int    `json:"signOrder"`  // 签署顺序(1,2,3...)
}

// SignFile 待签署文件。
type SignFile struct {
	FileID    string `json:"fileId"`    // e签宝文件ID(UploadFile 返回)
	FileName  string `json:"fileName"`  // 文件名(如 合同名称.pdf)
}

// CreateFlowResult 创建签署流程结果。
type CreateFlowResult struct {
	FlowID    string `json:"flowId"`    // 签署流程ID
	ShortUrl  string `json:"shortUrl"`  // 签署短链(发给签署方)
}

// FlowStatusResult 签署流程状态。
type FlowStatusResult struct {
	FlowID      string `json:"flowId"`
	Status      int    `json:"status"`      // 0草稿 1签署中 2完成 3撤销 4终止 5过期 6删除 7拒签
	Description string `json:"description"`
}

// ── 业务方法 ──

// UploadFile 上传 PDF 文件到 e签宝,返回 fileId。
// V3 流程:获取上传地址 → PUT 文件流 → 查询上传状态。此处封装为一步(基于文件直传端点)。
// TODO(联调):确认应用开通的「文件上传」端点(部分应用走 /v3/files/upload-create,部分走分步)。
func (c *Client) UploadFile(ctx context.Context, fileName string, pdfBytes []byte) (fileID string, err error) {
	type uploadReq struct {
		ContentMD5 string `json:"contentMd5"`
		FileName   string `json:"fileName"`
		FileSize   int64  `json:"fileSize"`
		ContentType string `json:"contentType"` // application/pdf
	}
	h := md5.Sum(pdfBytes)
	body, _ := json.Marshal(uploadReq{
		ContentMD5: base64.StdEncoding.EncodeToString(h[:]),
		FileName:   fileName,
		FileSize:   int64(len(pdfBytes)),
		ContentType: "application/pdf",
	})

	// 第一步:获取上传地址(返回上传 URL + fileId)
	type uploadURLResp struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			FileID    string `json:"fileId"`
			UploadURL string `json:"uploadUrl"`
		} `json:"data"`
	}
	var urlResp uploadURLResp
	if err = c.doPost(ctx, "/v3/files/upload-url", body, &urlResp); err != nil {
		return "", fmt.Errorf("获取上传地址失败: %w", err)
	}
	if urlResp.Code != 0 {
		return "", fmt.Errorf("e签宝返回错误: code=%d msg=%s", urlResp.Code, urlResp.Msg)
	}

	// 第二步:PUT 文件流到上传地址(不带 e签宝签名,走临时上传地址)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPut, urlResp.Data.UploadURL, bytes.NewReader(pdfBytes))
	req.Header.Set("Content-Type", "application/pdf")
	req.Header.Set("Content-Md5", base64.StdEncoding.EncodeToString(h[:]))
	resp, err := c.hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("上传文件流失败: %w", err)
	}
	resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("上传文件流 HTTP %d", resp.StatusCode)
	}
	return urlResp.Data.FileID, nil
}

// CreateSignFlow 基于文件创建签署流程(指定签署方与文件)。
// TODO(联调):签章位置(POS)需按业务确定坐标;这里用「默认签署位」或全量签署。
func (c *Client) CreateSignFlow(ctx context.Context, subject string, files []SignFile, signers []Signer) (*CreateFlowResult, error) {
	type signerReq struct {
		SignerType int    `json:"signerType"` // 1个人 2企业
		Name       string `json:"name"`
		Mobile     string `json:"mobile"`
		Email      string `json:"email"`
		SignOrder  int    `json:"signOrder"`
	}
	type flowReq struct {
		FlowSubject string     `json:"subject"` // 流程主题
		Files       []SignFile `json:"files"`
		Signers     []signerReq `json:"signers"`
	}
	srs := make([]signerReq, 0, len(signers))
	for _, s := range signers {
		srs = append(srs, signerReq{SignerType: 1, Name: s.Name, Mobile: s.Mobile, Email: s.Email, SignOrder: s.SignOrder})
	}
	body, _ := json.Marshal(flowReq{FlowSubject: subject, Files: files, Signers: srs})

	type respT struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			FlowID   string `json:"flowId"`
			ShortUrl string `json:"shortUrl"`
		} `json:"data"`
	}
	var r respT
	if err := c.doPost(ctx, "/v3/sign-flow/create-by-file", body, &r); err != nil {
		return nil, fmt.Errorf("创建签署流程失败: %w", err)
	}
	if r.Code != 0 {
		return nil, fmt.Errorf("e签宝返回错误: code=%d msg=%s", r.Code, r.Msg)
	}
	return &CreateFlowResult{FlowID: r.Data.FlowID, ShortUrl: r.Data.ShortUrl}, nil
}

// GetFlowStatus 查询签署流程状态。
func (c *Client) GetFlowStatus(ctx context.Context, flowID string) (*FlowStatusResult, error) {
	type respT struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			FlowID      string `json:"flowId"`
			Status      int    `json:"signFlowStatus"`
			Description string `json:"description"`
		} `json:"data"`
	}
	var r respT
	if err := c.doGet(ctx, "/v3/sign-flow/"+flowID, &r); err != nil {
		return nil, fmt.Errorf("查询签署状态失败: %w", err)
	}
	if r.Code != 0 {
		return nil, fmt.Errorf("e签宝返回错误: code=%d msg=%s", r.Code, r.Msg)
	}
	return &FlowStatusResult{FlowID: r.Data.FlowID, Status: r.Data.Status, Description: r.Data.Description}, nil
}

// DownloadSignedFile 下载签署完成后的 PDF(返回字节)。
func (c *Client) DownloadSignedFile(ctx context.Context, flowID string) ([]byte, error) {
	type respT struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			Files []struct {
				FileID    string `json:"fileId"`
				FileName  string `json:"fileName"`
				FileURL   string `json:"fileUrl"` // 临时下载 URL
			} `json:"files"`
		} `json:"data"`
	}
	var r respT
	if err := c.doGet(ctx, "/v3/sign-flow/"+flowID+"/file", &r); err != nil {
		return nil, fmt.Errorf("查询签署件失败: %w", err)
	}
	if r.Code != 0 || len(r.Data.Files) == 0 {
		return nil, fmt.Errorf("获取签署件失败: code=%d msg=%s", r.Code, r.Msg)
	}
	// 下载第一个文件的 URL
	dlReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, r.Data.Files[0].FileURL, nil)
	dlResp, err := c.hc.Do(dlReq)
	if err != nil {
		return nil, fmt.Errorf("下载签署件失败: %w", err)
	}
	defer dlResp.Body.Close()
	if dlResp.StatusCode >= 300 {
		return nil, fmt.Errorf("下载签署件 HTTP %d", dlResp.StatusCode)
	}
	return io.ReadAll(dlResp.Body)
}

// VerifyCallback 校验 e签宝回调签名。
// e签宝回调:header X-Tsign-Open-Timestamp + X-Tsign-Open-Signature,
// 待签名串 = timestamp + body,AppSecret 做 HMAC-SHA256,base64 比对。
func VerifyCallback(timestamp, signature string, body []byte, appSecret string) bool {
	if timestamp == "" || signature == "" {
		return false
	}
	stringToSign := timestamp + string(body)
	mac := hmac.New(sha256.New, []byte(appSecret))
	mac.Write([]byte(stringToSign))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// ── 内部 HTTP(带 V3 签名)──

// doGet 发带签名的 GET。
func (c *Client) doGet(ctx context.Context, path string, target any) error {
	url := c.cfg.BaseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	c.signReq(req, http.MethodGet, nil, path)
	return c.do(req, target)
}

// doPost 发带签名的 POST(JSON body)。
func (c *Client) doPost(ctx context.Context, path string, body []byte, target any) error {
	url := c.cfg.BaseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	c.signReq(req, http.MethodPost, body, path)
	return c.do(req, target)
}

// signReq 计算并设置 e签宝 V3 签名头。
func (c *Client) signReq(req *http.Request, method string, body []byte, path string) {
	accept := "*/*"
	contentType := req.Header.Get("Content-Type")
	// Content-MD5
	var contentMD5 string
	if len(body) > 0 {
		h := md5.Sum(body)
		contentMD5 = base64.StdEncoding.EncodeToString(h[:])
	}
	timestamp := fmt.Sprintf("%d", time.Now().UnixMilli())
	// 待签名串(各段以 \n 拼接,最后是 url path)
	stringToSign := strings.Join([]string{
		method,
		accept,
		contentMD5,
		contentType,
		"",    // Date
		"",    // Headers(X-Tsign-* 自定义头不参与)
		path,  // Url(仅 path)
	}, "\n")
	mac := hmac.New(sha256.New, []byte(c.cfg.AppSecret))
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	req.Header.Set("X-Tsign-Open-App-Id", c.cfg.AppID)
	req.Header.Set("X-Tsign-Open-Timestamp", timestamp)
	req.Header.Set("X-Tsign-Open-Signature", signature)
}

// do 执行请求并解析 e签宝统一响应。
func (c *Client) do(req *http.Request, target any) error {
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}
	if target == nil {
		return nil
	}
	return json.Unmarshal(respBody, target)
}
