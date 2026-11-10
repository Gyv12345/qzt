// sign.go Webhook 签名与重试退避(纯函数,可单测)。
package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"time"
)

// SignPayload 计算 HMAC-SHA256 签名,格式 sha256=<hex>。
// 签名内容 = timestamp + "." + rawBody,接收方用同一 secret 校验(Stripe 风格)。
func SignPayload(secret, timestamp, rawBody string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp + "." + rawBody))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// VerifyPayload 恒时比较签名,供单测与接收方参考实现。
func VerifyPayload(secret, timestamp, rawBody, signature string) bool {
	expected := SignPayload(secret, timestamp, rawBody)
	return hmac.Equal([]byte(expected), []byte(signature))
}

// retryBackoffs 重试退避表:第 n 次失败后延迟 retryBackoffs[n-1] 再试。
// 投递 job 每分钟扫描,实际延迟取整到分钟粒度。
var retryBackoffs = []time.Duration{
	1 * time.Minute,
	5 * time.Minute,
	30 * time.Minute,
	2 * time.Hour,
}

// NextRetryDelay 按已尝试次数返回下次重试延迟;
// 已达上限(超出退避表)返回 0 表示进入死信。
func NextRetryDelay(retryCount int) time.Duration {
	if retryCount >= len(retryBackoffs) {
		return 0
	}
	return retryBackoffs[retryCount]
}
