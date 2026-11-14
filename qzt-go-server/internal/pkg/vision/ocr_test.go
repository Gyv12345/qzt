package vision

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParseInvoiceOCR_OK 正常 JSON(含围栏)解析。
func TestParseInvoiceOCR_OK(t *testing.T) {
	raw := "```json\n" + `{
		"invoice_no": "24312000000012345678",
		"invoice_type": "电子普票",
		"invoice_date": "2026-11-01",
		"amount": "1000.00",
		"tax_amount": "13.00",
		"seller_name": "某某科技有限公司",
		"seller_tax_no": "91110000MA01A2B3C4",
		"buyer_name": "行简网络有限公司",
		"buyer_tax_no": "91410100MA45XY6789",
		"confidence": 0.92
	}` + "\n```"
	out, err := ParseInvoiceOCR(raw)
	require.NoError(t, err)
	assert.Equal(t, "24312000000012345678", out.InvoiceNo)
	assert.Equal(t, "电子普票", out.InvoiceType)
	assert.Equal(t, "2026-11-01", out.InvoiceDate)
	assert.Equal(t, "1000.00", out.Amount)
	assert.Equal(t, "13.00", out.TaxAmount)
	assert.Equal(t, "某某科技有限公司", out.SellerName)
	assert.Equal(t, "91110000MA01A2B3C4", out.SellerTaxNo)
	assert.Equal(t, "行简网络有限公司", out.BuyerName)
	assert.Equal(t, "91410100MA45XY6789", out.BuyerTaxNo)
	assert.InDelta(t, 0.92, out.Confidence, 1e-9)
	assert.False(t, out.NeedsReview)
}

// TestParseInvoiceOCR_MissingFields 字段缺失按空串,关键字段缺失标记 NeedsReview。
func TestParseInvoiceOCR_MissingFields(t *testing.T) {
	raw := `{"invoice_no":"12345678","invoice_date":"","confidence":0.85}`
	out, err := ParseInvoiceOCR(raw)
	require.NoError(t, err)
	assert.Equal(t, "12345678", out.InvoiceNo)
	assert.Empty(t, out.InvoiceDate)
	assert.Empty(t, out.Amount)
	assert.Empty(t, out.SellerName)
	assert.True(t, out.NeedsReview, "发票日期缺失应标记 needs_review")
}

// TestParseInvoiceOCR_NotJSON 非 JSON 输出报错。
func TestParseInvoiceOCR_NotJSON(t *testing.T) {
	_, err := ParseInvoiceOCR("这张发票看起来是普通发票,无法识别编号")
	assert.Error(t, err)
}

// TestParseInvoiceOCR_LowConfidence 低置信度标记 NeedsReview。
func TestParseInvoiceOCR_LowConfidence(t *testing.T) {
	raw := `{"invoice_no":"001","invoice_type":"其他","invoice_date":"2026-01-02","confidence":0.3}`
	out, err := ParseInvoiceOCR(raw)
	require.NoError(t, err)
	assert.True(t, out.NeedsReview)
}

// TestParseInvoiceOCR_ConfidenceMissing 置信度缺失按 0 → NeedsReview。
func TestParseInvoiceOCR_ConfidenceMissing(t *testing.T) {
	out, err := ParseInvoiceOCR(`{"invoice_no":"001","invoice_date":"2026-01-02"}`)
	require.NoError(t, err)
	assert.Equal(t, float64(0), out.Confidence)
	assert.True(t, out.NeedsReview)
}

// TestParseInvoiceOCR_NumericLoose 金额/置信度以数字形态返回时的宽容读取。
func TestParseInvoiceOCR_NumericLoose(t *testing.T) {
	raw := `{"invoice_no":"001","invoice_date":"2026-01-02","amount":1000.5,"tax_amount":13,"confidence":"0.75"}`
	out, err := ParseInvoiceOCR(raw)
	require.NoError(t, err)
	assert.Equal(t, "1000.5", out.Amount)
	assert.Equal(t, "13", out.TaxAmount)
	assert.InDelta(t, 0.75, out.Confidence, 1e-9)
	assert.False(t, out.NeedsReview)
}

// TestParseInvoiceOCR_ProseAroundJSON 模型在 JSON 前后夹带说明文字时仍能取到 JSON 体。
func TestParseInvoiceOCR_ProseAroundJSON(t *testing.T) {
	raw := "识别结果如下:\n{\"invoice_no\":\"99\",\"invoice_date\":\"2026-05-06\",\"confidence\":0.8}\n以上。"
	out, err := ParseInvoiceOCR(raw)
	require.NoError(t, err)
	assert.Equal(t, "99", out.InvoiceNo)
}

// TestBuildImagePart data URL 形态正确。
func TestBuildImagePart(t *testing.T) {
	p := BuildImagePart("image/jpeg", "abc==")
	assert.Equal(t, "image_url", p.Type)
	require.NotNil(t, p.ImageURL)
	assert.Equal(t, "data:image/jpeg;base64,abc==", p.ImageURL.URL)
}
