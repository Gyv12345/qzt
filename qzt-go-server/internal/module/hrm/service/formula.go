package service

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/shopspring/decimal"
)

// formula.go 工资项公式引擎(P16):受限四则表达式求值器。
// 语法面刻意收窄:数字 / 工资项编码(大写字母+数字+下划线) / + - * / / 括号 / round(expr, n)。
// 不引入通用表达式库,杜绝任意代码执行面;除零/未知变量/非法字符均报错。

// token 类型。
type formulaTokKind int

const (
	tokNum formulaTokKind = iota
	tokIdent
	tokOp    // + - * /
	tokLParen
	tokRParen
	tokComma
)

type formulaToken struct {
	kind formulaTokKind
	text string
}

// tokenizeFormula 词法分析。
func tokenizeFormula(expr string) ([]formulaToken, error) {
	var toks []formulaToken
	i := 0
	for i < len(expr) {
		c := expr[i]
		switch {
		case c == ' ' || c == '\t':
			i++
		case c == '+':
			toks = append(toks, formulaToken{tokOp, "+"})
			i++
		case c == '-':
			toks = append(toks, formulaToken{tokOp, "-"})
			i++
		case c == '*':
			toks = append(toks, formulaToken{tokOp, "*"})
			i++
		case c == '/':
			toks = append(toks, formulaToken{tokOp, "/"})
			i++
		case c == '(':
			toks = append(toks, formulaToken{tokLParen, "("})
			i++
		case c == ')':
			toks = append(toks, formulaToken{tokRParen, ")"})
			i++
		case c == ',':
			toks = append(toks, formulaToken{tokComma, ","})
			i++
		case c >= '0' && c <= '9':
			j := i
			for j < len(expr) && (expr[j] >= '0' && expr[j] <= '9' || expr[j] == '.') {
				j++
			}
			toks = append(toks, formulaToken{tokNum, expr[i:j]})
			i = j
		case c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c == '_':
			// 工资项编码约定全大写;round 函数名小写。ident 大小写敏感。
			j := i
			for j < len(expr) && (expr[j] >= 'A' && expr[j] <= 'Z' || expr[j] >= 'a' && expr[j] <= 'z' || expr[j] >= '0' && expr[j] <= '9' || expr[j] == '_') {
				j++
			}
			toks = append(toks, formulaToken{tokIdent, expr[i:j]})
			i = j
		default:
			return nil, fmt.Errorf("公式含非法字符 %q(位置 %d)", string(c), i)
		}
	}
	if len(toks) == 0 {
		return nil, errors_New("公式为空")
	}
	return toks, nil
}

// errors_New 避免多处 import errors 的轻量包装。
func errors_New(msg string) error { return fmt.Errorf("%s", msg) }

// formulaParser 递归下降解析器(expr → value)。
type formulaParser struct {
	toks []formulaToken
	pos  int
	vars map[string]decimal.Decimal
}

func (p *formulaParser) peek() *formulaToken {
	if p.pos >= len(p.toks) {
		return nil
	}
	return &p.toks[p.pos]
}

func (p *formulaParser) next() *formulaToken {
	t := p.peek()
	if t != nil {
		p.pos++
	}
	return t
}

// parseExpr 加减(最低优先级)。
func (p *formulaParser) parseExpr() (decimal.Decimal, error) {
	left, err := p.parseTerm()
	if err != nil {
		return decimal.Zero, err
	}
	for {
		t := p.peek()
		if t == nil || t.kind != tokOp || (t.text != "+" && t.text != "-") {
			return left, nil
		}
		op := p.next().text
		right, err := p.parseTerm()
		if err != nil {
			return decimal.Zero, err
		}
		if op == "+" {
			left = left.Add(right)
		} else {
			left = left.Sub(right)
		}
	}
}

// parseTerm 乘除。
func (p *formulaParser) parseTerm() (decimal.Decimal, error) {
	left, err := p.parseFactor()
	if err != nil {
		return decimal.Zero, err
	}
	for {
		t := p.peek()
		if t == nil || t.kind != tokOp || (t.text != "*" && t.text != "/") {
			return left, nil
		}
		op := p.next().text
		right, err := p.parseFactor()
		if err != nil {
			return decimal.Zero, err
		}
		if op == "*" {
			left = left.Mul(right)
		} else {
			if right.IsZero() {
				return decimal.Zero, errors_New("公式除零")
			}
			left = left.DivRound(right, 6) // 中间精度 6 位,末尾按项精度截断
		}
	}
}

// parseFactor 数字/变量/括号/round 函数。
func (p *formulaParser) parseFactor() (decimal.Decimal, error) {
	t := p.next()
	if t == nil {
		return decimal.Zero, errors_New("公式意外结束")
	}
	switch t.kind {
	case tokNum:
		v, err := decimal.NewFromString(t.text)
		if err != nil {
			return decimal.Zero, errors_New("数字字面量无效: " + t.text)
		}
		return v, nil
	case tokIdent:
		if t.text == "round" {
			return p.parseRound()
		}
		v, ok := p.vars[t.text]
		if !ok {
			return decimal.Zero, errors_New("公式引用了未知工资项: " + t.text)
		}
		return v, nil
	case tokLParen:
		v, err := p.parseExpr()
		if err != nil {
			return decimal.Zero, err
		}
		if c := p.next(); c == nil || c.kind != tokRParen {
			return decimal.Zero, errors_New("括号不匹配")
		}
		return v, nil
	default:
		return decimal.Zero, errors_New("公式语法错误: " + t.text)
	}
}

// parseRound round(expr, n):n 为非负整数字面量。
func (p *formulaParser) parseRound() (decimal.Decimal, error) {
	if c := p.next(); c == nil || c.kind != tokLParen {
		return decimal.Zero, errors_New("round 缺少左括号")
	}
	v, err := p.parseExpr()
	if err != nil {
		return decimal.Zero, err
	}
	if c := p.next(); c == nil || c.kind != tokComma {
		return decimal.Zero, errors_New("round 缺少逗号")
	}
	nTok := p.next()
	if nTok == nil || nTok.kind != tokNum {
		return decimal.Zero, errors_New("round 的小数位数必须是数字字面量")
	}
	n, err := strconv.Atoi(nTok.text)
	if err != nil || n < 0 || n > 8 {
		return decimal.Zero, errors_New("round 小数位数须为 0~8 的整数")
	}
	if c := p.next(); c == nil || c.kind != tokRParen {
		return decimal.Zero, errors_New("round 缺少右括号")
	}
	return v.Round(int32(n)), nil
}

// EvalSalaryFormula 求值工资公式。vars 为可用工资项编码→值;返回 round 后的值由调用方决定,本函数不做统一取整。
func EvalSalaryFormula(expr string, vars map[string]decimal.Decimal) (decimal.Decimal, error) {
	if strings.TrimSpace(expr) == "" {
		return decimal.Zero, errors_New("公式为空")
	}
	toks, err := tokenizeFormula(expr)
	if err != nil {
		return decimal.Zero, err
	}
	p := &formulaParser{toks: toks, vars: vars}
	v, err := p.parseExpr()
	if err != nil {
		return decimal.Zero, err
	}
	if p.peek() != nil {
		return decimal.Zero, errors_New("公式存在未消费的多余符号: " + p.peek().text)
	}
	return v, nil
}
