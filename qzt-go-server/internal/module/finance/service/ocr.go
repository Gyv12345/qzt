package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/pkg/vision"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// ocr.go 发票 OCR 服务(P31 Feature A,千问 qwen-vl 视觉识别)。
// 识别结果只返回给前端回填表单人工确认,不落库(保存仍走既有 CreateInvoice);
// 凭证复用「AI 模型」当前生效档案的 api_key(该 key 即 DashScope 的 key),
// 端点固定 DashScope compatible-mode(见 vision 包注释);模型名走 sys_config
// finance.ocr_model(热生效,默认 qwen-vl-plus)。
// 成本护栏:每用户每日 50 次,Redis 计数(ocr:daily:{uid}:{date})。

// OCRDailyLimit 每用户每日识别次数上限。
const OCRDailyLimit = 50

// OCRConfigKeyModel sys_config 键:发票识别模型名。
const OCRConfigKeyModel = "finance.ocr_model"

// OCRMaxFileSize 上传图片大小上限 10MB。
const OCRMaxFileSize = 10 << 20

// allowedOCRMimeTypes 图片 MIME 白名单(jpg/png/webp)。
var allowedOCRMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// ValidateOCRUpload 校验上传文件(大小 + MIME 白名单)。返回规范化的 MIME。
func ValidateOCRUpload(size int64, mimeType string) (string, error) {
	if size <= 0 {
		return "", errors.New("请上传发票图片")
	}
	if size > OCRMaxFileSize {
		return "", errors.New("图片超过 10MB,请压缩后再上传")
	}
	if _, ok := allowedOCRMimeTypes[mimeType]; !ok {
		return "", errors.New("仅支持 jpg/png/webp 图片")
	}
	return mimeType, nil
}

// OCRDailyKey 每用户每日计数键(纯函数,可单测)。
func OCRDailyKey(userID uint, date string) string {
	return fmt.Sprintf("ocr:daily:%d:%s", userID, date)
}

// CheckOCRQuota 检查并占用一次当日额度;返回剩余可用次数,超限返回错误。
// Redis 不可用时放行(额度护栏是成本软护栏,不应阻断业务)。
func CheckOCRQuota(ctx context.Context, userID uint) (int64, error) {
	store := cache.GetStore()
	if store == nil {
		return int64(OCRDailyLimit), nil
	}
	date := time.Now().Format("2006-01-02")
	key := OCRDailyKey(userID, date)
	count, err := store.Incr(key)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "finance ocr: incr daily quota failed uid=%d: %v", userID, err)
		return int64(OCRDailyLimit), nil
	}
	if count == 1 {
		// 当日首计:补一个到明晨零点的过期(简化为 24h)。
		_ = store.Expire(key, 24*time.Hour)
	}
	if count > OCRDailyLimit {
		return 0, fmt.Errorf("今日发票识别次数已用完(每日 %d 次),请明天再试", OCRDailyLimit)
	}
	return OCRDailyLimit - count, nil
}

// ResolveOCRAPIKey 读取发票识别用的 api_key:优先「AI 模型」生效档案,
// 档案缺失回落 env 的 LLM_API_KEY(config.LLM)。
func ResolveOCRAPIKey(ctx context.Context) string {
	p, err := repository.NewAIModelRepo().GetDefault(ctx)
	if err == nil && p.APIKey != "" {
		return p.APIKey
	}
	return config.Get().LLM.APIKey
}

// ResolveOCRModel 读取发票识别模型名(sys_config finance.ocr_model,热生效;默认 qwen-vl-plus)。
func ResolveOCRModel(ctx context.Context) string {
	if v := setting.Get(ctx, OCRConfigKeyModel); v != "" {
		return v
	}
	return vision.DefaultModel
}

// InvoiceOCRResult 对外返回的识别结果(透传 vision.InvoiceOCR + 额度余量)。
type InvoiceOCRResult struct {
	*vision.InvoiceOCR
	Remaining int64 `json:"remaining"` // 当日剩余可用次数
}

// RecognizeInvoice 识别一张发票图片(base64 内容已由 handler 读好)。
// 只做识别与解析,不落库;低置信度结果由 NeedsReview 标记,由前端提示人工复核。
// 额度在进入模型调用前先占位计数(含失败尝试,防重试滥用)。
func (s *FinanceService) RecognizeInvoice(ctx context.Context, userID uint, mimeType, base64Data string) (*InvoiceOCRResult, error) {
	remaining, err := CheckOCRQuota(ctx, userID)
	if err != nil {
		return nil, err
	}
	apiKey := ResolveOCRAPIKey(ctx)
	if apiKey == "" {
		return nil, errors.New("发票识别未配置:请先在「系统管理→AI 模型」启用通义千问档案")
	}
	resp, err := vision.VisionChat(ctx, apiKey, vision.VisionChatRequest{
		System: vision.InvoiceOCRPrompt,
		Parts: []vision.ContentPart{
			vision.BuildImagePart(mimeType, base64Data),
		},
		Model:   ResolveOCRModel(ctx),
		Timeout: 90 * time.Second,
	})
	if err != nil {
		return nil, fmt.Errorf("发票识别失败: %v", err)
	}
	parsed, err := vision.ParseInvoiceOCR(resp.Content)
	if err != nil {
		return nil, err
	}
	return &InvoiceOCRResult{InvoiceOCR: parsed, Remaining: remaining}, nil
}
