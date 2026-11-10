package service

import (
	"testing"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
)

// stocktake_test.go 盘点差异派生纯函数单测(P15):盘盈入库/盘亏出库/零差异不产生流水。

func stocktakeOrderFixture() *psimodel.PsiStocktake {
	return &psimodel.PsiStocktake{
		ID:          1,
		StocktakeNo: "PD20261105000001",
		WarehouseID: 1,
	}
}

func TestBuildStocktakeMovement_Profit(t *testing.T) {
	it := &psimodel.PsiStocktakeItem{
		ProductID:   1,
		SkuID:       1,
		ExpectedQty: decimal.RequireFromString("10"),
	}
	it.ActualQty = decimal.NewNullDecimal(decimal.RequireFromString("12"))
	mv, hasDiff := buildStocktakeMovement(stocktakeOrderFixture(), it, nil)
	if !hasDiff {
		t.Fatal("盘盈场景应产生流水")
	}
	if mv.BizType != psimodel.BizStockIn || mv.Direction != 1 {
		t.Fatalf("盘盈应入库,BizType=%s Direction=%d", mv.BizType, mv.Direction)
	}
	if !mv.Quantity.Equal(decimal.RequireFromString("2")) {
		t.Fatalf("盘盈数量应为差额 2,实际 %s", mv.Quantity)
	}
}

func TestBuildStocktakeMovement_Loss(t *testing.T) {
	it := &psimodel.PsiStocktakeItem{
		ProductID:   1,
		SkuID:       1,
		ExpectedQty: decimal.RequireFromString("10"),
	}
	it.ActualQty = decimal.NewNullDecimal(decimal.RequireFromString("7"))
	mv, hasDiff := buildStocktakeMovement(stocktakeOrderFixture(), it, nil)
	if !hasDiff {
		t.Fatal("盘亏场景应产生流水")
	}
	if mv.BizType != psimodel.BizStockOut || mv.Direction != -1 {
		t.Fatalf("盘亏应出库,BizType=%s Direction=%d", mv.BizType, mv.Direction)
	}
	if !mv.Quantity.Equal(decimal.RequireFromString("3")) {
		t.Fatalf("盘亏数量应为差额绝对值 3,实际 %s", mv.Quantity)
	}
}

func TestBuildStocktakeMovement_ZeroDiff(t *testing.T) {
	it := &psimodel.PsiStocktakeItem{
		ProductID:   1,
		SkuID:       1,
		ExpectedQty: decimal.RequireFromString("10"),
	}
	it.ActualQty = decimal.NewNullDecimal(decimal.RequireFromString("10"))
	mv, hasDiff := buildStocktakeMovement(stocktakeOrderFixture(), it, nil)
	if hasDiff {
		t.Fatal("零差异不应产生流水")
	}
	if mv != nil {
		t.Fatal("零差异不应返回流水输入")
	}
	if !it.DiffQty.IsZero() {
		t.Fatalf("零差异 diff_qty 应为 0,实际 %s", it.DiffQty)
	}
}
