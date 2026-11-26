package service

import (
	"strings"
	"testing"
)

// demo_reset_probe_test.go 基线预检副本的安全断言(prepareProbeSQL,纯函数):
// 任意写法的 USE 都要替换;指向生产库的限定引用与 DROP DATABASE 必须拦下;
// 注释与字符串字面量里的同样文本不算。断言在抹掉注释与字面量的副本上做。
// 背景:2026-11-24 预检因漏掉一条不带反引号的 `USE qztgo;`,两次切回生产库执行了尾段语句。

func TestPrepareProbeSQLReplacesEveryUseForm(t *testing.T) {
	// 复刻线上基线的形态:开头是 dump 风格的带反引号 USE,尾段手工追加了一条不带反引号的 USE
	raw := "-- 头注释\n" +
		"USE `qztgo`;\n" +
		"DROP TABLE IF EXISTS `a`;\n" +
		"CREATE TABLE `a` (id int);\n" +
		"-- psi 段(手工追加)\n" +
		"USE qztgo;\n" +
		"DELETE FROM casbin_rule WHERE v1 = '/x';\n" +
		"  use QZTGO ;\n" +
		"SELECT 1;\n"

	out, err := prepareProbeSQL(raw, "qztgo", "qztgo_replay_probe")
	if err != nil {
		t.Fatalf("应通过断言, got %v", err)
	}
	for _, want := range []string{
		"USE `qztgo_replay_probe`;\nDROP TABLE IF EXISTS `a`;",
		"-- psi 段(手工追加)\nUSE `qztgo_replay_probe`;\n",
		"  use `qztgo_replay_probe` ;\n",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("替换结果缺少 %q\nout:\n%s", want, out)
		}
	}
	lower := strings.ToLower(out)
	if strings.Contains(lower, "use `qztgo`") || strings.Contains(lower, "use qztgo") {
		t.Error("仍残留指向生产库的 USE")
	}
	if strings.Count(out, "qztgo_replay_probe") != 3 {
		t.Errorf("应恰好替换 3 处, got %d", strings.Count(out, "qztgo_replay_probe"))
	}
}

func TestPrepareProbeSQLFindsUseAtStatementBoundary(t *testing.T) {
	// 同一行里跟在别的语句后面的 USE 同样会切库,不能只认行首
	raw := "SELECT 1; USE qztgo;\nDROP TABLE x;\n"
	out, err := prepareProbeSQL(raw, "qztgo", "qztgo_replay_probe")
	if err != nil {
		t.Fatalf("应通过断言, got %v", err)
	}
	if !strings.Contains(out, "SELECT 1; USE `qztgo_replay_probe`;") {
		t.Errorf("同一行的第二条 USE 未被替换:\n%s", out)
	}

	// 连续两条 USE 都要替换:匹配不吞分号,后一条才认得出自己的语句边界
	out, err = prepareProbeSQL("USE qztgo;\nUSE `qztgo`;\nSELECT 1;\n", "qztgo", "qztgo_replay_probe")
	if err != nil {
		t.Fatalf("应通过断言, got %v", err)
	}
	if got := strings.Count(out, "qztgo_replay_probe"); got != 2 {
		t.Errorf("连续两条 USE 应替换 2 处, got %d:\n%s", got, out)
	}
	if strings.Contains(strings.ToLower(out), "use qztgo") || strings.Contains(strings.ToLower(out), "use `qztgo`") {
		t.Errorf("仍残留指向生产库的 USE:\n%s", out)
	}
}

func TestPrepareProbeSQLRejectsUnsafeBaseline(t *testing.T) {
	head := "-- 头注释\nUSE `qztgo`;\nCREATE TABLE `a` (id int);\n"
	cases := []struct {
		name    string
		raw     string
		wantMsg string // 须出现在错误里
	}{
		{"限定引用生产库", head + "DELETE FROM `qztgo`.`sys_menu`;\n", "第 4 行"},
		// 关键字白名单式的识别会漏掉没列进去的语句,所以断言不看关键字
		{"限定引用(无反引号)", head + "TRUNCATE qztgo.sys_menu;\n", "第 4 行"},
		{"限定引用(通配符)", head + "GRANT ALL ON qztgo.* TO 'x'@'%';\n", "第 4 行"},
		{"DROP DATABASE", head + "drop database qztgo;\n", "第 4 行"},
		// 换个书写位置同样危险:不能只认行首
		{"DROP DATABASE 不在行首", head + "SELECT 1; drop database qztgo;\n", "DROP DATABASE"},
		{"DROP DATABASE(带反引号)", head + "DROP DATABASE IF EXISTS `qztgo`;\n", "DROP DATABASE"},
		// 行尾注释里的撇号不能被当成字符串开头,否则下一行的限定引用会被藏起来
		{"行尾注释里的撇号不骗过扫描", head + "SELECT 1; -- it's ok\nDELETE FROM qztgo.t;\n", "第 5 行"},
		// 可执行注释里的语句 MySQL 会执行,藏在这里也算
		{"限定引用藏在可执行注释里", "USE `qztgo`;\n/*!40000 DELETE FROM qztgo.t */;\n", "第 2 行"},
		{"DROP DATABASE 藏在可执行注释里", "USE `qztgo`;\n/*!40101 DROP DATABASE qztgo */;\n", "DROP DATABASE"},
		{"没有任何 USE", "-- 只有注释\nCREATE TABLE `a` (id int);\n", "未找到可替换的 USE"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := prepareProbeSQL(c.raw, "qztgo", "qztgo_replay_probe")
			if err == nil {
				t.Fatalf("应拒绝,却通过了")
			}
			if !strings.Contains(err.Error(), c.wantMsg) {
				t.Errorf("错误信息缺少 %q: %v", c.wantMsg, err)
			}
		})
	}

	// 库名相同或为空:无法区分预检库与生产库,直接拒绝
	for _, c := range [][2]string{{"qztgo", "qztgo"}, {"", "p"}, {"qztgo", ""}} {
		if _, err := prepareProbeSQL(head, c[0], c[1]); err == nil {
			t.Errorf("库名 %q/%q 应拒绝", c[0], c[1])
		}
	}
}

func TestPrepareProbeSQLIgnoresCommentsAndLiterals(t *testing.T) {
	raw := "-- USE qztgo; (说明文字)\n" +
		"USE `qztgo`;\n" +
		"-- 旧写法: DELETE FROM qztgo.sys_menu; DROP DATABASE qztgo;\n" +
		"/* 块注释 DROP DATABASE qztgo; */\n" +
		"INSERT INTO `a` (`x`) VALUES ('qztgo.t');\n" +
		"SELECT 1;\n"
	out, err := prepareProbeSQL(raw, "qztgo", "qztgo_replay_probe")
	if err != nil {
		t.Fatalf("注释与字面量里的文本不应触发断言, got %v", err)
	}
	if !strings.Contains(out, "-- USE qztgo; (说明文字)") {
		t.Error("注释行应原样保留")
	}
	if !strings.Contains(out, "VALUES ('qztgo.t')") {
		t.Error("字面量应原样保留")
	}
	if got := strings.Count(out, "qztgo_replay_probe"); got != 1 {
		t.Errorf("只应替换真正的 USE 语句(1 处), got %d", got)
	}
}

func TestPrepareProbeSQLDoesNotTouchDataLiterals(t *testing.T) {
	// 文章正文里出现 USE 语句或「库名.表」:是数据不是语句,不改也不拦。
	// 这里的正文特意让 USE 出现在行首,考验断言是否真的跳过了字面量。
	raw := "USE `qztgo`;\n" +
		"INSERT INTO `cms_article` (`content`) VALUES ('部署时执行 qztgo.sql,里面写着\nUSE qztgo;\n再 FROM qztgo.cms_article 取数');\n" +
		"SELECT 1;\n"
	out, err := prepareProbeSQL(raw, "qztgo", "qztgo_replay_probe")
	if err != nil {
		t.Fatalf("数据里的文本不应触发断言, got %v", err)
	}
	if got := strings.Count(out, "qztgo_replay_probe"); got != 1 {
		t.Errorf("只应替换第 1 行的 USE, got %d 处", got)
	}
	if !strings.Contains(out, "USE qztgo;\n再 FROM qztgo.cms_article 取数')") {
		t.Errorf("字面量内容被改动了\nout:\n%s", out)
	}
}

func TestMaskSQLNonCode(t *testing.T) {
	// 行尾注释与 # 注释抹到行尾,换行保留("a -- x" 抹 4 个字符,"b # y" 抹 3 个字符)
	if got := maskSQLNonCode("a -- x\nb # y\nc"); got != "a     \nb    \nc" {
		t.Errorf("行注释: got %q", got)
	}
	// 块注释之后的语句要留在副本里:块注释只抹到结束符为止
	if got := maskSQLNonCode("/* x */ DROP DATABASE qztgo;"); !strings.HasSuffix(got, "DROP DATABASE qztgo;") || strings.Contains(got, "x") {
		t.Errorf("块注释应只抹注释本身: got %q", got)
	}
	// 可执行注释 /*!nnnnn … */ 里的内容 MySQL 会执行,必须留给断言
	if got := maskSQLNonCode("/*!40101 SET NAMES utf8mb4 */;"); !strings.Contains(got, "SET NAMES utf8mb4") || strings.Contains(got, "40101") {
		t.Errorf("可执行注释体应保留、外壳抹掉: got %q", got)
	}
	// 「--」后跟空白才是注释;a--b 是两个减号
	if got := maskSQLNonCode("SELECT a--b;"); got != "SELECT a--b;" {
		t.Errorf("a--b 不应被当成注释: got %q", got)
	}
	if got := maskSQLNonCode("SELECT a -- b\nDROP DATABASE qztgo;"); got != "SELECT a     \nDROP DATABASE qztgo;" {
		t.Errorf("行尾注释只抹到行尾: got %q", got)
	}
	if got := maskSQLNonCode("/* x */ DELETE qztgo.t;"); !strings.Contains(got, "qztgo.t") {
		t.Errorf("块注释后的限定引用应留给断言: got %q", got)
	}
	// 字符串里的 -- 不是注释;'' 与 \" 是转义;引号本身保留
	in := `v ('it''s -- ok', "a\"b"); x`
	want := "v ('" + strings.Repeat(" ", 11) + "', \"" + strings.Repeat(" ", 4) + "\"); x"
	if got := maskSQLNonCode(in); got != want {
		t.Errorf("字符串转义:\n got %q\nwant %q", got, want)
	}
	// 块注释整体抹掉,跨行时换行保留
	got := maskSQLNonCode("a/* x\nDROP DATABASE qztgo; */b")
	if len(got) != len("a/* x\nDROP DATABASE qztgo; */b") || !strings.HasSuffix(got, "b") ||
		!strings.HasPrefix(got, "a ") || strings.IndexByte(got, '\n') != 5 || strings.Contains(got, "DROP") {
		t.Errorf("块注释: got %q", got)
	}
	// 长度与换行位置始终不变(下标一一对应是改写原文的前提)
	for _, s := range []string{"USE `qztgo`;\n-- x\n", "'a\nb'", "\"\",''", "e'\\'", "--", "#"} {
		m := maskSQLNonCode(s)
		if len(m) != len(s) || strings.Count(m, "\n") != strings.Count(s, "\n") {
			t.Errorf("长度/换行应不变: %q -> %q", s, m)
		}
	}
	// 反引号是标识符引用,不抹:限定引用要留在副本里给断言看
	if got := maskSQLNonCode("DELETE FROM `qztgo`.`t`"); got != "DELETE FROM `qztgo`.`t`" {
		t.Errorf("反引号标识符不应被抹: got %q", got)
	}
}
