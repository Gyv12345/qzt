package vision

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// ocr.go 发票识别结构化解析(纯函数,可单测)。
// 模型按要求输出严格 JSON;解析失败/字段缺失按空串兜底,confidence<0.6 标 needs_review。

// MinConfidence 置信度阈值,低于该值的结果标记 needs_review=true。
const MinConfidence = 0.6

// InvoiceOCR 发票识别结构化结果。
type InvoiceOCR struct {
	InvoiceNo   string  `json:"invoice_no"`
	InvoiceType string  `json:"invoice_type"` // 专票|普票|电子专票|电子普票|其他
	InvoiceDate string  `json:"invoice_date"` // YYYY-MM-DD
	Amount      string  `json:"amount"`       // 不含税金额
	TaxAmount   string  `json:"tax_amount"`   // 税额
	SellerName  string  `json:"seller_name"`
	SellerTaxNo string  `json:"seller_tax_no"`
	BuyerName   string  `json:"buyer_name"`
	BuyerTaxNo  string  `json:"buyer_tax_no"`
	Confidence  float64 `json:"confidence"` // 0-1,模型自评
	// NeedsReview confidence < 0.6 或关键字段(发票号/日期)缺失时为 true。
	NeedsReview bool `json:"needs_review"`
}

// InvoiceOCRPrompt 发票识别系统提示词:要求只输出严格 JSON。
const InvoiceOCRPrompt = `你是一张中国增值税发票的识别助手。请仔细阅读图片中的发票,提取以下字段并以严格的 JSON 输出,` +
	`不要输出任何其他文字、解释或 Markdown 代码块标记:` +
	`{"invoice_no":"发票号码,纯数字字符串","invoice_type":"专票|普票|电子专票|电子普票|其他 之一",` +
	`"invoice_date":"开票日期,格式 YYYY-MM-DD","amount":"不含税金额,数字字符串","tax_amount":"税额,数字字符串",` +
	`"seller_name":"销售方名称","seller_tax_no":"销售方纳税人识别号","buyer_name":"购买方名称","buyer_tax_no":"购买方纳税人识别号",` +
	`"confidence":0到1之间的数字,表示你对整体识别结果的确信度}` + "\n" +
	`规则:1) 图片里找不到的字段一律填空字符串 "",不要编造;2) 金额只保留数字(含小数),去掉 ¥ 或元等符号;` +
	`3) invoice_type 依据票面「增值税专用发票/普通发票/电子...」字样判断,判断不了填"其他";4) confidence 低于 0.6 说明票面模糊或字段不完整。`

// ParseInvoiceOCR 解析模型输出为结构化发票字段(纯函数)。
// 兼容模型偶发输出的 ```json 围栏;JSON 解析失败返回错误;字段缺失按空串;
// confidence 缺失按 0 处理并标记 NeedsReview;关键字段(invoice_no/invoice_date)
// 缺失同样标记 NeedsReview。
func ParseInvoiceOCR(raw string) (*InvoiceOCR, error) {
	body := stripJSONFence(raw)
	var parsed struct {
		InvoiceNo   string      `json:"invoice_no"`
		InvoiceType string      `json:"invoice_type"`
		InvoiceDate string      `json:"invoice_date"`
		Amount      json.RawMessage `json:"amount"`
		TaxAmount   json.RawMessage `json:"tax_amount"`
		SellerName  string      `json:"seller_name"`
		SellerTaxNo string      `json:"seller_tax_no"`
		BuyerName   string      `json:"buyer_name"`
		BuyerTaxNo  string      `json:"buyer_tax_no"`
		Confidence  json.RawMessage `json:"confidence"`
	}
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		return nil, fmt.Errorf("发票识别结果不是合法 JSON: %w", err)
	}
	out := &InvoiceOCR{
		InvoiceNo:   strings.TrimSpace(parsed.InvoiceNo),
		InvoiceType: strings.TrimSpace(parsed.InvoiceType),
		InvoiceDate: strings.TrimSpace(parsed.InvoiceDate),
		SellerName:  strings.TrimSpace(parsed.SellerName),
		SellerTaxNo: strings.TrimSpace(parsed.SellerTaxNo),
		BuyerName:   strings.TrimSpace(parsed.BuyerName),
		BuyerTaxNo:  strings.TrimSpace(parsed.BuyerTaxNo),
	}
	out.Amount = rawMessageToString(parsed.Amount)
	out.TaxAmount = rawMessageToString(parsed.TaxAmount)
	out.Confidence = rawMessageToFloat(parsed.Confidence)
	if out.Confidence < MinConfidence || out.InvoiceNo == "" || out.InvoiceDate == "" {
		out.NeedsReview = true
	}
	return out, nil
}

// stripJSONFence 剥掉 markdown 代码围栏与首尾空白,取第一段 {...} JSON 体。
func stripJSONFence(s string) string {
	s = strings.TrimSpace(s)
	// 去 ```json / ``` 围栏
	if i := strings.Index(s, "{"); i >= 0 {
		if j := strings.LastIndex(s, "}"); j > i {
			return s[i : j+1]
		}
	}
	return s
}

// rawMessageToString JSON 字段宽容读取:字符串原样,数字转字符串,缺失/空返回 ""。
func rawMessageToString(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return strings.TrimSpace(s)
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return strconv.FormatFloat(f, 'f', -1, 64)
	}
	return ""
}

// rawMessageToFloat JSON 字段宽容读取:数字原样,字符串尝试转 float,失败/缺失返回 0。
func rawMessageToFloat(raw json.RawMessage) float64 {
	if len(raw) == 0 {
		return 0
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return f
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		if v, perr := strconv.ParseFloat(strings.TrimSpace(s), 64); perr == nil {
			return v
		}
	}
	return 0
}
