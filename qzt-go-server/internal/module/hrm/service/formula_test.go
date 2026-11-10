package service

import (
	"testing"

	"github.com/shopspring/decimal"
)

// formula_test.go 工资公式引擎单测(P16):优先级/括号/round/未知项/除零/非法字符。

func fv(s string) decimal.Decimal { return decimal.RequireFromString(s) }

func TestEvalSalaryFormula_BasicArithmetic(t *testing.T) {
	vars := map[string]decimal.Decimal{
		"BASE":    fv("10000"),
		"BONUS":   fv("2000"),
		"RATE":    fv("0.1"),
	}
	got, err := EvalSalaryFormula("BASE + BONUS * RATE", vars)
	if err != nil {
		t.Fatal(err)
	}
	// 10000 + 2000*0.1 = 10200
	if !got.Equal(fv("10200")) {
		t.Fatalf("期望 10200,实际 %s", got)
	}
}

func TestEvalSalaryFormula_ParenAndRound(t *testing.T) {
	vars := map[string]decimal.Decimal{"X": fv("7")}
	got, err := EvalSalaryFormula("round((X + 3) / 2, 2)", vars)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Equal(fv("5")) {
		t.Fatalf("期望 5,实际 %s", got)
	}
	got2, err := EvalSalaryFormula("round(X / 3, 2)", vars)
	if err != nil {
		t.Fatal(err)
	}
	if !got2.Equal(fv("2.33")) {
		t.Fatalf("期望 2.33,实际 %s", got2)
	}
}

func TestEvalSalaryFormula_UnknownVar(t *testing.T) {
	_, err := EvalSalaryFormula("GHOST + 1", map[string]decimal.Decimal{})
	if err == nil || !contains(err.Error(), "未知工资项") {
		t.Fatalf("应报未知工资项,实际 %v", err)
	}
}

func TestEvalSalaryFormula_DivZero(t *testing.T) {
	_, err := EvalSalaryFormula("10 / 0", map[string]decimal.Decimal{})
	if err == nil || !contains(err.Error(), "除零") {
		t.Fatalf("应报除零,实际 %v", err)
	}
}

func TestEvalSalaryFormula_IllegalChar(t *testing.T) {
	_, err := EvalSalaryFormula("BASE + 1; DROP TABLE x", map[string]decimal.Decimal{"BASE": fv("1")})
	if err == nil || !contains(err.Error(), "非法字符") {
		t.Fatalf("应拒绝非法字符,实际 %v", err)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
