package service

import (
	"testing"

	entsvc "qzt-go-server/internal/module/enterprise/service"
)

// TestParseMySQLDSN 覆盖 DSN 解析(密码 URL 转义/unix socket/无端口/异常输入),
// 对应 demo_reset.go 的 mysql 客户端连接参数组装逻辑。
func TestParseMySQLDSN(t *testing.T) {
	cases := []struct {
		name    string
		dsn     string
		want    mysqlParams
		wantErr bool
	}{
		{name: "本地默认", dsn: "root:<DATABASE_PASSWORD>@tcp(127.0.0.1:3306)/qztgo?charset=utf8mb4&parseTime=true&loc=Local&timeout=3s",
			want: mysqlParams{Host: "127.0.0.1", Port: "3306", User: "root", Passwd: "<DATABASE_PASSWORD>", DBName: "qztgo"}},
		{name: "RDS密码含特殊字符", dsn: "qzt:p!a&b@tcp(rm-x.mysql.rds.aliyuncs.com:3306)/qztgo",
			want: mysqlParams{Host: "rm-x.mysql.rds.aliyuncs.com", Port: "3306", User: "qzt", Passwd: "p!a&b", DBName: "qztgo"}},
		// go-sql-driver 不做 URL 百分号解码,%40 按字面进入密码(驱动文档口径),
		// 传给 MYSQL_PWD 的就是这段原样字符串。
		{name: "百分号按字面不解码", dsn: "qzt:p%40a@tcp(rm-x.mysql.rds.aliyuncs.com:3306)/qztgo",
			want: mysqlParams{Host: "rm-x.mysql.rds.aliyuncs.com", Port: "3306", User: "qzt", Passwd: "p%40a", DBName: "qztgo"}},
		{name: "unix_socket", dsn: "root:x@unix(/tmp/mysql.sock)/qztgo",
			want: mysqlParams{UnixSocket: "/tmp/mysql.sock", User: "root", Passwd: "x", DBName: "qztgo"}},
		{name: "host无端口回退3306", dsn: "root:x@tcp(dbhost)/qztgo",
			want: mysqlParams{Host: "dbhost", Port: "3306", User: "root", Passwd: "x", DBName: "qztgo"}},
		{name: "空DSN报错", dsn: "", wantErr: true},
		{name: "非法DSN报错", dsn: "not-a-dsn", wantErr: true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := parseMySQLDSN(c.dsn)
			if c.wantErr {
				if err == nil {
					t.Fatalf("期望报错,实际得到 %+v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("解析失败: %v", err)
			}
			if got.Host != c.want.Host || got.Port != c.want.Port || got.User != c.want.User ||
				got.Passwd != c.want.Passwd || got.DBName != c.want.DBName || got.UnixSocket != c.want.UnixSocket {
				t.Fatalf("got %+v, want %+v", got, c.want)
			}
		})
	}
}

// TestDemoConfigTablesNoDup 防手滑:配置表清单重复会让备份/回填跑两遍。
func TestDemoConfigTablesNoDup(t *testing.T) {
	seen := map[string]bool{}
	for _, tb := range demoConfigTables {
		if seen[tb] {
			t.Fatalf("demoConfigTables 重复: %s", tb)
		}
		seen[tb] = true
	}
	if len(demoConfigTables) == 0 {
		t.Fatal("demoConfigTables 不能为空")
	}
}

// TestDemoResetRegistered 断言 init() 已把 demoWeeklyReset 挂进 enterprise
// JobHandlerRegistry,且与 docs/sql/demo_reset.sql 种子里的 bean_class 一致。
func TestDemoResetRegistered(t *testing.T) {
	h, ok := entsvc.JobHandlerRegistry["demoWeeklyReset"]
	if !ok || h == nil {
		t.Fatal("demoWeeklyReset 未注册到 JobHandlerRegistry")
	}
}
