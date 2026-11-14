package service

import (
	"strings"
	"testing"

	apprmodel "qzt-go-server/internal/model/approval"
)

// addsign_test.go 加签/减签校验纯函数单测(照 transfer_test.go 风格)。

// TestValidateAddSign 加签参数校验:mode 合法性、人员非空/不含自己/不重复/ID 合法。
func TestValidateAddSign(t *testing.T) {
	const operator = uint(100)
	cases := []struct {
		name    string
		mode    string
		userIDs []uint
		wantErr string
	}{
		{"合法前加签通过", apprmodel.AddSignBefore, []uint{201, 202}, ""},
		{"合法后加签通过", apprmodel.AddSignAfter, []uint{201}, ""},
		{"非法mode拒绝", "SIDE", []uint{201}, "仅支持前加签"},
		{"空mode拒绝", "", []uint{201}, "仅支持前加签"},
		{"加签人为空拒绝", apprmodel.AddSignBefore, nil, "加签人不能为空"},
		{"加签人含自己拒绝", apprmodel.AddSignBefore, []uint{201, operator}, "不能加签给自己"},
		{"加签人重复拒绝", apprmodel.AddSignBefore, []uint{201, 201}, "不能重复"},
		{"加签人ID为0拒绝", apprmodel.AddSignBefore, []uint{201, 0}, "ID不合法"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateAddSign(tc.mode, tc.userIDs, operator)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("期望通过,实际错误: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("期望报错含「%s」,实际通过", tc.wantErr)
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("期望报错含「%s」,实际: %v", tc.wantErr, err)
			}
		})
	}
}

// TestValidateRemoveSign 减签校验:仅加签任务可减(根任务/常规任务类型即拦)、仅发起人可撤、仅 PENDING 可减。
func TestValidateRemoveSign(t *testing.T) {
	const (
		initiator = uint(100) // 加签发起人
		other     = uint(300)
	)
	cases := []struct {
		name       string
		taskType   string
		taskStatus string
		operator   uint
		wantErr    string
	}{
		{"发起人减PENDING加签任务通过", apprmodel.TaskTypeSign, apprmodel.TaskStatusPending, initiator, ""},
		{"非加签任务拒绝(根任务不可减)", apprmodel.TaskTypeNormal, apprmodel.TaskStatusApproving, initiator, "仅加签任务可减签"},
		{"非发起人拒绝", apprmodel.TaskTypeSign, apprmodel.TaskStatusPending, other, "仅加签发起人可减签"},
		{"进行中(APPROVING)拒绝", apprmodel.TaskTypeSign, apprmodel.TaskStatusApproving, initiator, "仅待处理"},
		{"已批(APPROVED)拒绝", apprmodel.TaskTypeSign, apprmodel.TaskStatusApproved, initiator, "仅待处理"},
		{"已撤销(REVOKED)拒绝", apprmodel.TaskTypeSign, apprmodel.TaskStatusRevoked, initiator, "仅待处理"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateRemoveSign(tc.taskType, tc.taskStatus, initiator, tc.operator)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("期望通过,实际错误: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("期望报错含「%s」,实际通过", tc.wantErr)
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("期望报错含「%s」,实际: %v", tc.wantErr, err)
			}
		})
	}
}

// chainOf 构造链成员(taskID 递增即 Sort 升序)。
func chainOf(taskIDs ...uint) []apprmodel.ApprovalAddSignTask {
	chain := make([]apprmodel.ApprovalAddSignTask, 0, len(taskIDs))
	for i, id := range taskIDs {
		chain = append(chain, apprmodel.ApprovalAddSignTask{TaskID: id, Sort: int64(i)})
	}
	return chain
}

// TestNextPendingMember 链位校验:串行不并发(有进行中成员不激活)、按序取第一个 PENDING、链走完返回 false。
func TestNextPendingMember(t *testing.T) {
	chain := chainOf(11, 12, 13)
	cases := []struct {
		name      string
		statuses  map[uint]string
		wantID    uint
		wantFound bool
	}{
		{"无进行中取首个PENDING", map[uint]string{11: "PENDING", 12: "PENDING", 13: "PENDING"}, 11, true},
		{"有进行中不激活(串行)", map[uint]string{11: "APPROVING", 12: "PENDING", 13: "PENDING"}, 0, false},
		{"首个已批激活下一个", map[uint]string{11: "APPROVED", 12: "PENDING", 13: "PENDING"}, 12, true},
		{"链全批返回false", map[uint]string{11: "APPROVED", 12: "APPROVED", 13: "APPROVED"}, 0, false},
		{"成员被减签后激活下一个", map[uint]string{11: "APPROVED", 12: "REVOKED", 13: "PENDING"}, 13, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			id, ok := nextPendingMember(chain, tc.statuses)
			if ok != tc.wantFound {
				t.Fatalf("期望 found=%v,实际 %v(id=%d)", tc.wantFound, ok, id)
			}
			if ok && id != tc.wantID {
				t.Fatalf("期望激活任务 %d,实际 %d", tc.wantID, id)
			}
		})
	}
}

// TestChainSettled 链收尾判定:无 PENDING/APPROVING 即收尾(减签把链减空也能收尾)。
func TestChainSettled(t *testing.T) {
	cases := []struct {
		name     string
		statuses map[uint]string
		want     bool
	}{
		{"全批收尾", map[uint]string{11: "APPROVED", 12: "APPROVED"}, true},
		{"有PENDING不收尾", map[uint]string{11: "APPROVED", 12: "PENDING"}, false},
		{"有APPROVING不收尾", map[uint]string{11: "APPROVING"}, false},
		{"减签撤销后收尾", map[uint]string{11: "APPROVED", 12: "REVOKED"}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := chainSettled(tc.statuses); got != tc.want {
				t.Fatalf("期望 %v,实际 %v", tc.want, got)
			}
		})
	}
}
