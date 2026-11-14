package service

import (
	"strings"
	"testing"
)

// returnback_test.go 退回目标合法性纯函数单测(照 transfer_test.go 风格)。

// TestValidateReturnTarget 退回目标校验:已完成且为前序节点可退(含发起节点),
// 后序/同排序节点、未来节点、当前节点、空目标拒绝。
func TestValidateReturnTarget(t *testing.T) {
	const (
		currentNode = uint(30) // 当前审批中节点
		currentSort = 2        // 当前节点排序
		firstNode   = uint(10) // 发起后的首个审批节点(已完成,前序)
		midNode     = uint(20) // 中间已审节点(前序)
		futureNode  = uint(40) // 尚未到达的节点
		lateNode    = uint(50) // 后序已访节点(此前退回链到访过,sort 更大)
		lateSort    = 3
	)
	completed := []uint{firstNode, midNode, currentNode, lateNode}
	cases := []struct {
		name    string
		current uint
		target  uint
		wantErr string
	}{
		{"退回上一已审节点通过", currentNode, midNode, ""},
		{"退回发起首节点通过(打回给提交人重走)", currentNode, firstNode, ""},
		{"退回后序已访节点拒绝(D2:跳过重审)", currentNode, lateNode, "前序节点"},
		{"退回未来节点拒绝", currentNode, futureNode, "未来节点"},
		{"退回当前节点拒绝", currentNode, currentNode, "当前节点"},
		{"空目标拒绝", currentNode, 0, "请选择退回目标节点"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			targetSort := currentSort - 1
			if tc.target == lateNode {
				targetSort = lateSort
			}
			if tc.target == futureNode {
				targetSort = currentSort + 1
			}
			err := validateReturnTarget(tc.current, currentSort, tc.target, targetSort, completed)
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
