package service

import (
	"strings"
	"testing"
)

// transfer_test.go 转办/委托目标校验纯函数单测(P13)。

// TestValidateTransferTarget 转办目标合法性:不能转给自己/提交人;合法目标通过。
func TestValidateTransferTarget(t *testing.T) {
	const (
		operator  = uint(100) // 当前审批人
		submitter = uint(200) // 提交人
		other     = uint(300)
	)
	cases := []struct {
		name    string
		target  uint
		wantErr string
	}{
		{"转给自己拒绝", operator, "不能转办给自己"},
		{"转给提交人拒绝", submitter, "不能转办/委托给提交人"},
		{"合法目标通过", other, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateTransferTarget(tc.target, operator, submitter)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("期望通过,实际错误: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("期望报错「%s」,实际通过", tc.wantErr)
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("期望报错含「%s」,实际: %v", tc.wantErr, err)
			}
			// 同样的目标,委托模式同口径(校验函数与 mode 无关)
			if err := validateTransferTarget(tc.target, operator, submitter); err != nil && !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("重复调用结果不一致: %v", err)
			}
		})
	}
}
