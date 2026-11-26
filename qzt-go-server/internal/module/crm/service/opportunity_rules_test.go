package service

import (
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/pkg/xtime"
)

func TestParseStagesBackwardCompatible(t *testing.T) {
	defs, err := parseStages(`[{"key":"PROSPECTING","label":"初步接触","sort":0,"probability":10}]`)
	if err != nil {
		t.Fatalf("旧阶段配置解析失败: %v", err)
	}
	if len(defs) != 1 || defs[0].StagnantDays != 0 || defs[0].RequireFollowup || len(defs[0].RequiredFields) != 0 {
		t.Fatalf("旧配置零值不兼容: %+v", defs)
	}
}

func TestValidateStageDefs(t *testing.T) {
	valid := []StageDef{
		{Key: "PROSPECTING", Label: "初步接触", Probability: 10, RequiredFields: []string{"description"}},
		{Key: "WON", Label: "已成交", Probability: 100},
		{Key: "LOST", Label: "已丢失", Probability: 0},
	}
	if err := validateStageDefs(stageBizOpportunity, valid); err != nil {
		t.Fatalf("合法配置被拒绝: %v", err)
	}
	tests := []struct {
		name string
		defs []StageDef
		want string
	}{
		{"重复key", append(append([]StageDef{}, valid...), valid[0]), "重复"},
		{"非法概率", []StageDef{{Key: "PROSPECTING", Label: "初步接触", Probability: 101}, valid[1], valid[2]}, "0-100"},
		{"非法必填字段", []StageDef{{Key: "PROSPECTING", Label: "初步接触", RequiredFields: []string{"custom"}}, valid[1], valid[2]}, "不支持"},
		{"缺终态", valid[:1], "必须保留"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := validateStageDefs(stageBizOpportunity, tt.defs); err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("期望包含 %q 的错误,实际 %v", tt.want, err)
			}
		})
	}
}

func TestValidateStageRequirements(t *testing.T) {
	ownerID := uint(5)
	opp := &crmmodel.CrmOpportunity{}
	target := StageDef{Label: "需求分析", RequiredFields: []string{"expected_amount", "expected_close_date", "owner_id", "description"}}
	if err := validateStageRequirements(opp, target); err == nil || !strings.Contains(err.Error(), "预期金额") {
		t.Fatalf("空资料应列出缺失字段,实际 %v", err)
	}
	opp.ExpectedAmount = decimal.NewFromInt(100)
	opp.ExpectedCloseDate = xtime.NewNullDateTimeFromTime(time.Now())
	opp.OwnerID = &ownerID
	opp.Description = "  已确认采购需求  "
	if err := validateStageRequirements(opp, target); err != nil {
		t.Fatalf("完整资料不应被拦截: %v", err)
	}
}

func TestStageStayDays(t *testing.T) {
	now := time.Date(2026, 11, 24, 12, 0, 0, 0, time.Local)
	if got := stageStayDays(nil, now); got != nil {
		t.Fatalf("无历史时间应返回nil,实际 %v", *got)
	}
	entered := now.Add(-49 * time.Hour)
	if got := stageStayDays(&entered, now); got == nil || *got != 2 {
		t.Fatalf("49小时应停留2天,实际 %v", got)
	}
	future := now.Add(time.Hour)
	if got := stageStayDays(&future, now); got == nil || *got != 0 {
		t.Fatalf("未来时间应钳制为0,实际 %v", got)
	}
}
