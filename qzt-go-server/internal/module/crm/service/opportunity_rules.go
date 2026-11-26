package service

import (
	"fmt"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
)

// validateStageRequirements 校验进入目标阶段前必须补齐的基础资料。
func validateStageRequirements(opp *crmmodel.CrmOpportunity, target StageDef) error {
	missing := make([]string, 0, len(target.RequiredFields))
	for _, field := range target.RequiredFields {
		present := true
		switch field {
		case "expected_amount":
			present = !opp.ExpectedAmount.IsZero()
		case "expected_close_date":
			present = !opp.ExpectedCloseDate.IsZero()
		case "owner_id":
			present = opp.OwnerID != nil && *opp.OwnerID != 0
		case "description":
			present = strings.TrimSpace(opp.Description) != ""
		default:
			return fmt.Errorf("不支持的阶段必填字段 %q", field)
		}
		if !present {
			missing = append(missing, opportunityRequiredFieldLabels[field])
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("进入%s前请补齐: %s", target.Label, strings.Join(missing, "、"))
	}
	return nil
}

// decorateOpportunity 计算当前阶段停留天数与停滞标记。历史时间未知时保持 nil。
func decorateOpportunity(opp *crmmodel.CrmOpportunity, defs []StageDef, now time.Time) {
	opp.DaysInStage = stageStayDays(opp.StageEnteredAt.Ptr(), now)
	opp.IsStagnant = false
	if def, ok := FindStageDef(defs, opp.Stage); ok && def.StagnantDays > 0 && opp.DaysInStage != nil {
		opp.IsStagnant = *opp.DaysInStage >= def.StagnantDays
	}
}

// stageStayDays 计算整天停留时间;未来时间和空时间不产生负天数。
func stageStayDays(enteredAt *time.Time, now time.Time) *int {
	if enteredAt == nil || enteredAt.IsZero() {
		return nil
	}
	days := int(now.Sub(*enteredAt).Hours() / 24)
	if days < 0 {
		days = 0
	}
	return &days
}
