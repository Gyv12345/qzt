package service

import (
	"context"
	"testing"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/datascope"
)

func TestCheckOwnerScope(t *testing.T) {
	selfCtx := context.WithValue(context.Background(), datascope.CtxUserIDKey, uint(7))
	selfCtx = context.WithValue(selfCtx, datascope.CtxDataScopeKey, model.DataScopeSelf)
	allCtx := context.WithValue(context.Background(), datascope.CtxUserIDKey, uint(7))
	allCtx = context.WithValue(allCtx, datascope.CtxDataScopeKey, model.DataScopeAll)
	ptr := func(id uint) *uint { return &id }

	tests := []struct {
		name    string
		ctx     context.Context
		ownerID *uint
		wantErr string
	}{
		{name: "SELF本人", ctx: selfCtx, ownerID: ptr(7)},
		{name: "SELF他人", ctx: selfCtx, ownerID: ptr(8), wantErr: "无权访问该数据"},
		{name: "SELFnil公海", ctx: selfCtx, ownerID: nil},
		{name: "ALL他人", ctx: allCtx, ownerID: ptr(8)},
		{name: "无用户上下文", ctx: context.Background(), ownerID: ptr(8)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := checkOwnerScope(tt.ctx, tt.ownerID)
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("期望放行,实际报错: %v", err)
				}
				return
			}
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("期望错误 %q,实际 %v", tt.wantErr, err)
			}
		})
	}
}
