package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"

	"qzt-go-server/config"
	entsvc "qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/pkg/xlogger"
)

// demo_reset.go 演示数据每周自动重置(公开演示模式配套)。
//
// 语义:把全库恢复到「干净演示基线」= docs/sql/qztgo.sql(生产脱敏全量导出)导入后的状态。
//
// 关键设计:
//   - qztgo.sql 是 mysqldump 全量风格(头注释自证):DROP TABLE + CREATE + INSERT,
//     自带 SET FOREIGN_KEY_CHECKS=0/1 包裹与 USE `qztgo`。整文件经 mysql 客户端
//     重放即恢复基线 —— 有种子的表回播种子、无种子的运行表随 DROP 清空,
//     因此无需 Go 侧维护「TRUNCATE 业务表清单」(手工清单随 schema 演进必漏表)。
//   - 6 张运营配置表(见 demoConfigTables)的密钥数据在基线中被刻意剔除(部署后
//     后台重配),整文件重放会将其清空 —— 执行体在重放前用 mysqldump 备份这几张表,
//     重放后回填,保证企微凭证/OSS AK/SK/API Key/渠道账号每周不丢。
//   - 传输层统一走 mysql/mysqldump 子进程直灌 SQL 文件。明确不做 gorm 逐行 Exec
//     劈 SQL 的降级实现:基线含分号/中文正文//*!注释,自写劈句器劈错风险高。
//   - mysql 或 mysqldump 客户端探测不到时直接返回失败(落日志+sys_job_log),
//     宁可每周重置失败也不静默清掉运营配置。
//
// 上线人工步骤(生产):
//  1. scp qzt-go-server/docs/sql/qztgo.sql <生产服务器>:/opt/qzt-server/bin/demo_baseline.sql
//  2. 服务器确认 mysql 与 mysqldump 客户端存在(which mysql;无则安装 mysql 客户端包)
//  3. DBX 执行 docs/sql/demo_reset.sql 注册 sys_job id=27,重启 qzt-server
//  4. 后台「定时任务」对手动触发一次验证(生产触发前建议先人工备份业务表)

// demoResetJob bean_class=demoWeeklyReset,由 enterprise JobScheduler 每周一 03:00 调度。
type demoResetJob struct{}

const (
	// demoBaselinePath 服务器上的演示基线文件(= docs/sql/qztgo.sql 的拷贝)。
	demoBaselinePath = "/opt/qzt-server/bin/demo_baseline.sql"
	// demoResetDBName 基线文件内部硬编码 USE `qztgo`;DSN 库名不一致时拒绝执行防误重置。
	demoResetDBName = "qztgo"
	// demoAdminUserID 重置完成后接收企微/站内信通知的超管(admin,sys_user id=1)。
	demoAdminUserID = 1

	demoBackupTimeout = 3 * time.Minute  // mysqldump 备份/回填运营配置表超时
	demoReplayTimeout = 15 * time.Minute // 基线整文件重放超时
)

// demoConfigTables 运营配置表:基线文件刻意不落其数据(含真实密钥,部署后后台重配),
// 每周重放前备份、重放后回填。这些表均无外键约束(全库外键仅 CMS/sys 关系表),回填安全。
var demoConfigTables = []string{
	"sys_oauth_config",   // 企微/服务号 OAuth 凭证(企微通知、扫码登录依赖)
	"sys_storage_config", // OSS AK/SK(文件上传依赖)
	"sys_api_key",        // 用户 MCP/API Key(demo 账号禁止签发,现存全为真实用户)
	"marketing_account",  // 抖音渠道账号 token(marketing.feiyu.pull 每 15 分钟依赖)
	"open_webhook",       // 开放平台 Webhook 订阅
	"console_accounts",   // 商城控制台账号
}

// mysqlClientCandidates / mysqldumpCandidates 客户端探测兜底路径(PATH 优先)。
var (
	mysqlClientCandidates = []string{"/usr/bin/mysql", "/bin/mysql", "/usr/local/bin/mysql", "/opt/homebrew/bin/mysql"}
	mysqldumpCandidates   = []string{"/usr/bin/mysqldump", "/bin/mysqldump", "/usr/local/bin/mysqldump", "/opt/homebrew/bin/mysqldump"}
)

func init() {
	// 注册到 enterprise JobHandlerRegistry,sys_job.bean_class=demoWeeklyReset
	// (cron 种子见 docs/sql/demo_reset.sql,每周一 03:00;system/service 包必然被
	// 启动链 import,init() 必然执行,无需改 main.go,同 geo/service/job.go 挂法)。
	entsvc.RegisterJobHandler("demoWeeklyReset", &demoResetJob{})
}

// Execute 恢复演示基线:备份运营配置 → 重放基线文件 → 回填运营配置 → 通知超管。
func (h *demoResetJob) Execute(ctx context.Context) error {
	start := time.Now()
	xlogger.InfofCtx(ctx, "演示重置:开始,基线=%s", demoBaselinePath)

	if _, err := os.Stat(demoBaselinePath); err != nil {
		return fmt.Errorf("基线文件不存在: %w(部署时需将 docs/sql/qztgo.sql 拷贝到 %s)", err, demoBaselinePath)
	}
	p, err := resolveMySQLParams()
	if err != nil {
		return err
	}
	if p.DBName != demoResetDBName {
		return fmt.Errorf("当前连接库为 %q,与基线文件内置 USE %q 不一致,拒绝执行以防误重置", p.DBName, demoResetDBName)
	}
	mysqlBin, err := findBinary("mysql", mysqlClientCandidates)
	if err != nil {
		return err // 探测不到客户端不做降级(见文件头),按任务失败处理
	}
	dumpBin, err := findBinary("mysqldump", mysqldumpCandidates)
	if err != nil {
		return fmt.Errorf("mysqldump 不可用(重置前后需备份/回填运营配置表,防止企微凭证与 OSS 密钥被基线重放清空): %w", err)
	}

	// 1) 备份运营配置表到临时文件
	backup, err := os.CreateTemp("", "qzt-demo-config-backup-*.sql")
	if err != nil {
		return fmt.Errorf("创建配置备份临时文件失败: %w", err)
	}
	tmp := backup.Name()
	defer func() { _ = backup.Close(); _ = os.Remove(tmp) }()
	xlogger.InfofCtx(ctx, "演示重置:备份运营配置 %d 张表 → %s", len(demoConfigTables), tmp)
	dumpArgs := append(p.clientArgs(dumpBin),
		"--no-create-info", "--skip-triggers", "--single-transaction", "--hex-blob",
		// GTID 库(生产 RDS)必须显式关闭,否则 mysqldump 直接 exit 2,重置从未成功过
		"--set-gtid-purged=OFF", p.DBName)
	dumpArgs = append(dumpArgs, demoConfigTables...)
	if err := runSQLTool(ctx, dumpBin, dumpArgs, p.env(), "", backup, demoBackupTimeout); err != nil {
		return fmt.Errorf("备份运营配置表失败(基线未重放,数据未动): %w", err)
	}

	// 2) 重放前语法预检:基线先灌一次性临时库完整重放,通过才动生产库。
	//    (R73 P0 事故教训:DBX 分割器容忍的缺分号 mysql 客户端不容忍,1064 中止重放;
	//    预检失败时生产库完全未动,运营配置无需回填,零损失中止。)
	if err := replayProbeCheck(ctx, mysqlBin, p); err != nil {
		return fmt.Errorf("基线语法预检失败(已中止重放,生产库未动,运营配置未清): %w", err)
	}

	// 3) 整文件重放基线(DROP+CREATE+INSERT,文件自带外键开关与 USE qztgo)
	replayArgs := append(p.clientArgs(mysqlBin), p.DBName)
	replayErr := runSQLTool(ctx, mysqlBin, replayArgs, p.env(), demoBaselinePath, nil, demoReplayTimeout)

	// 4) 回填运营配置——重放成功与否都尽力回填:
	//    重放失败时库也可能被部分重建(R73 事故实证:全量段已重建、6 表已被清空),
	//    此时能救回多少救回多少,不再让凭证裸奔到人工介入。(R73 P0 事故教训)
	if fillErr := runSQLTool(ctx, mysqlBin, replayArgs, p.env(), tmp, nil, demoBackupTimeout); fillErr != nil {
		if replayErr != nil {
			return fmt.Errorf("基线重放失败且回填也失败(库可能处于半重置状态,企微/OSS 等配置需人工重配): replay=%v; fill=%w", replayErr, fillErr)
		}
		return fmt.Errorf("回填运营配置表失败(基线已重放,企微/OSS 等配置需人工重配): %w", fillErr)
	}
	if replayErr != nil {
		return fmt.Errorf("基线重放失败(运营配置已尽力回填,库可能处于半重置状态,需人工介入恢复): %w", replayErr)
	}

	cost := time.Since(start)
	xlogger.InfofCtx(ctx, "演示重置:完成,耗时 %.1fs", cost.Seconds())
	content := fmt.Sprintf("演示数据已恢复到干净基线(%s),耗时 %.1fs。运营配置(企微/OSS/API Key/渠道账号)已保留。",
		time.Now().Format("2006-01-02 15:04"), cost.Seconds())
	notify.Dispatch(ctx, demoAdminUserID, "演示数据已每周重置", content, "")
	return nil
}

// demoProbeDB 基线预检用的一次性临时库名。与生产库无任何从属关系,每次预检先删后建。
const demoProbeDB = "qztgo_replay_probe"

// probeMinTables 预检库至少应有的表数。当前基线建 180 余张,阈值只用来拦「大部分语句没执行」。
const probeMinTables = 50

// replayProbeCheck 基线重放前预检:基线灌入一次性临时库完整重放,通过才允许动生产库。
// 临时库名固定 demoProbeDB(存在则重建);无论成败,结束时都 DROP 清理。
//
// 预检绝不能碰到生产库,共三道闸(2026-11-24 两次预检切库事故后的加固):
//  1. prepareProbeSQL 先在内存里把所有指向生产库的 USE 语句(任意写法)换成临时库,
//     并断言副本不含指向生产库的 USE、「生产库.表」限定引用、DROP DATABASE;
//  2. 重放加 --one-database:万一仍有漏网的 USE 切到别的库,其后语句被客户端忽略而非执行;
//  3. 重放后核对临时库确有表和数据,防止「语句被跳过却报成功」。
//
// 预检失败返回错误,Execute 将中止重放(生产库未动,零损失)。
func replayProbeCheck(ctx context.Context, mysqlBin string, p *mysqlParams) error {
	probeDB := demoProbeDB
	env := p.env()
	adminArgs := p.clientArgs(mysqlBin)

	// 第 1 道闸:替换 + 断言。不通过时连临时库都不建。
	raw, err := os.ReadFile(demoBaselinePath)
	if err != nil {
		return fmt.Errorf("读取基线文件失败(基线未重放,生产库未动): %w", err)
	}
	probeSQL, err := prepareProbeSQL(string(raw), p.DBName, probeDB)
	if err != nil {
		return fmt.Errorf("基线预检副本未通过安全断言(已中止重放,生产库未动): %w", err)
	}

	probeFile, err := os.CreateTemp("", "qzt-demo-probe-*.sql")
	if err != nil {
		return fmt.Errorf("创建预检临时文件失败(基线未重放,生产库未动): %w", err)
	}
	tmpName := probeFile.Name()
	defer func() { _ = probeFile.Close(); _ = os.Remove(tmpName) }()
	if _, err := probeFile.WriteString(probeSQL); err != nil {
		return fmt.Errorf("写预检临时文件失败(基线未重放,生产库未动): %w", err)
	}
	_ = probeFile.Close()

	// 建临时库(先删后建,容忍残留)
	if err := runSQLTool(ctx, mysqlBin, append(append([]string{}, adminArgs...),
		"-e", fmt.Sprintf("DROP DATABASE IF EXISTS %s; CREATE DATABASE %s CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;", demoProbeDB, demoProbeDB)),
		env, "", nil, demoBackupTimeout); err != nil {
		return fmt.Errorf("创建临时预检库失败(基线未重放,生产库未动): %w", err)
	}
	defer func() {
		// 用不带取消的 ctx 做清理:任务超时或被取消时也要把临时库删掉。
		// 清理失败不影响结论:仅临时库残留,下次预检先删后建自愈。
		if err := runSQLTool(context.WithoutCancel(ctx), mysqlBin,
			append(append([]string{}, adminArgs...), "-e", "DROP DATABASE IF EXISTS "+demoProbeDB),
			env, "", nil, demoBackupTimeout); err != nil {
			xlogger.ErrorfCtx(ctx, "演示重置:预检临时库清理失败(残留 %s,下次预检自动重建覆盖): %v", demoProbeDB, err)
		}
	}()

	// 第 2 道闸:--one-database + 临时库为默认库,完整重放(遇错即停,语义与生产重放一致)
	replayArgs := append(append([]string{}, adminArgs...), "--one-database", demoProbeDB)
	if err := runSQLTool(ctx, mysqlBin, replayArgs, env, tmpName, nil, demoReplayTimeout); err != nil {
		return fmt.Errorf("临时库重放未通过(基线存在语法/语义错误,详见 stderr): %w", err)
	}

	// 第 3 道闸:临时库里必须真有表和数据
	tables, menus, err := probeRowCounts(ctx, mysqlBin, p)
	if err != nil {
		return fmt.Errorf("核对预检库失败(已中止重放,生产库未动): %w", err)
	}
	if tables < probeMinTables || menus == 0 {
		return fmt.Errorf("预检库数据不完整(表 %d 张、菜单 %d 行),基线可能大部分未执行,已中止重放", tables, menus)
	}
	return nil
}

// prepareProbeSQL 把基线文本变成只指向预检库的副本,并做安全断言;任何一条不满足返回错误。
//
// 背景:基线开头是 mysqldump 风格的 `USE `qztgo`;`,但尾部手工追加的段落里还有一条
// 不带反引号的 `USE qztgo;`。早先只替换第一种写法,预检重放到那一行就切回了生产库,
// 把尾段语句执行到了生产库上(2026-11-24 两次)。所以这里按「任意写法」替换,并断言:
//   - 至少替换到一处,且不残留任何指向生产库的 USE;
//   - 不含「生产库.表」形式的限定引用(--one-database 拦不住这种写法);
//   - 不含 DROP DATABASE。
//
// 断言只看真正会执行的 SQL:注释与字符串字面量的内容先被抹掉(见 maskSQLNonCode),
// 所以文章正文里出现类似文本不会被误拦;返回的错误带原始行号,便于定位。
func prepareProbeSQL(raw, prodDB, probeDB string) (string, error) {
	if prodDB == "" || probeDB == "" || prodDB == probeDB {
		return "", fmt.Errorf("库名参数非法(prod=%q probe=%q)", prodDB, probeDB)
	}
	prodTok := regexp.QuoteMeta(prodDB)
	// 语句边界处(文本开头或分号之后)的 USE,不按行首找:同一行里「SELECT 1; USE qztgo;」
	// 同样会切库。匹配到库名为止、不吞分号,连续两条 USE 才都能命中。
	// (?i) 不区分大小写;库名两端的反引号可有可无。
	useRe := regexp.MustCompile(`(?i)(^|;)(\s*use\s+)` + "`?" + prodTok + "`?")
	// 任何位置出现的「生产库.表」与 DROP DATABASE 都算:不用关键字白名单、不锚定行首,
	// 免得漏列关键字或换个书写位置就放过
	qualifiedRe := regexp.MustCompile(`(?i)` + prodTok + "`?" + `\s*\.\s*` + "`?" + `[A-Za-z_*]`)
	dropDBRe := regexp.MustCompile(`(?i)\bdrop\s+database\b`)

	// 在抹掉注释与字面量的副本上定位语句,再按同样的字节偏移改写原文
	// (maskSQLNonCode 不改变长度,两份文本的下标一一对应)。
	code := maskSQLNonCode(raw)
	locs := useRe.FindAllSubmatchIndex([]byte(code), -1)
	if len(locs) == 0 {
		return "", errors.New("未找到可替换的 USE 语句,基线格式可能已变,无法确认重放目标")
	}
	var b strings.Builder
	b.Grow(len(raw))
	last := 0
	for _, m := range locs {
		b.WriteString(raw[last:m[0]])
		b.WriteString(raw[m[2]:m[3]]) // 语句边界:文本开头或上一条语句的分号
		b.WriteString(raw[m[4]:m[5]]) // 空白 + USE + 空白,保留原写法
		b.WriteString("`" + probeDB + "`")
		last = m[1]
	}
	b.WriteString(raw[last:])

	lineOf := func(pos int) int { return strings.Count(code[:pos], "\n") + 1 }
	lineText := func(pos int) string {
		end := strings.IndexByte(raw[pos:], '\n')
		if end < 0 {
			end = len(raw) - pos
		}
		return strings.TrimSpace(raw[pos : pos+end])
	}
	if loc := qualifiedRe.FindStringIndex(code); loc != nil {
		return "", fmt.Errorf("第 %d 行以「%s.表」形式直接引用生产库(--one-database 拦不住这种写法): %s", lineOf(loc[0]), prodDB, lineText(loc[0]))
	}
	if loc := dropDBRe.FindStringIndex(code); loc != nil {
		return "", fmt.Errorf("第 %d 行含 DROP DATABASE: %s", lineOf(loc[0]), lineText(loc[0]))
	}
	return b.String(), nil
}

// maskSQLNonCode 把 SQL 文本里不会被执行的内容抹成空格:注释(-- 到行尾、# 到行尾、/* */)
// 与字符串字面量('…'、"…")的内部。引号本身与换行都保留,文本长度不变,
// 所得副本与原文下标一一对应——断言在副本上做,改写按同样的偏移落回原文。
// 不处理反引号:它是标识符引用,`qztgo`.`t` 这种限定引用正是断言要看见的。
func maskSQLNonCode(sql string) string {
	b := []byte(sql)
	mask := func(i int) {
		if i < len(b) && b[i] != '\n' {
			b[i] = ' '
		}
	}
	for i := 0; i < len(b); i++ {
		switch c := b[i]; c {
		case '\'', '"':
			for i++; i < len(b); i++ {
				if b[i] == '\\' { // 反斜杠转义:连同被转义的字符一起抹掉
					mask(i)
					mask(i + 1)
					i++
					continue
				}
				if b[i] == c {
					if i+1 < len(b) && b[i+1] == c { // 连续两个引号 = 字面量里的一个引号
						mask(i)
						mask(i + 1)
						i++
						continue
					}
					break
				}
				mask(i)
			}
		case '#':
			for ; i < len(b) && b[i] != '\n'; i++ {
				mask(i)
			}
		case '-':
			// MySQL 只把「--」后跟空白(或行尾)当作注释;「a--b」是两个减号,不能抹
			if i+1 < len(b) && b[i+1] == '-' && (i+2 >= len(b) || b[i+2] == ' ' || b[i+2] == '\t' || b[i+2] == '\r' || b[i+2] == '\n') {
				for ; i < len(b) && b[i] != '\n'; i++ {
					mask(i)
				}
			}
		case '/':
			if i+1 >= len(b) || b[i+1] != '*' {
				continue
			}
			// 先抹开头的 "/*"。
			mask(i)
			mask(i + 1)
			if i+2 < len(b) && b[i+2] == '!' {
				// 可执行注释 /*!nnnnn … */(mysqldump 会生成):MySQL 会执行里面的内容,
				// 所以只抹 "/*!nnnnn" 这层外壳,注释体照常当代码扫描,藏不住语句。
				mask(i + 2)
				for i += 3; i < len(b) && b[i] >= '0' && b[i] <= '9'; i++ {
					mask(i)
				}
				i-- // 外层循环会再 i++,正好落到注释体的第一个字符
				continue
			}
			// 普通块注释整体抹到结束符。判断结束符必须看尚未被抹的原文:
			// 如果先抹再看,前一个字节已是空格,永远认不出 "*/",会一路抹到文件末尾。
			for i += 2; i < len(b); i++ {
				if b[i] == '*' && i+1 < len(b) && b[i+1] == '/' {
					mask(i)
					mask(i + 1)
					i++
					break
				}
				mask(i)
			}
		}
	}
	return string(b)
}

// probeRowCounts 预检库的表数与菜单行数。库名是包级常量并作为独立参数传给客户端(-D),
// SQL 里用 DATABASE() 取当前库,不把库名拼进 SQL;结果经 runSQLTool 写入临时文件后读回。
func probeRowCounts(ctx context.Context, mysqlBin string, p *mysqlParams) (tables, menus int, err error) {
	const countSQL = "SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()), (SELECT COUNT(*) FROM sys_menu)"
	outFile, err := os.CreateTemp("", "qzt-demo-probe-count-*.txt")
	if err != nil {
		return 0, 0, fmt.Errorf("创建预检结果临时文件失败: %w", err)
	}
	outName := outFile.Name()
	defer func() { _ = outFile.Close(); _ = os.Remove(outName) }()

	args := append(p.clientArgs(mysqlBin), "--one-database", "-D", demoProbeDB, "-N", "-e", countSQL)
	if err := runSQLTool(ctx, mysqlBin, args, p.env(), "", outFile, demoBackupTimeout); err != nil {
		return 0, 0, err
	}
	_ = outFile.Close()
	data, err := os.ReadFile(outName)
	if err != nil {
		return 0, 0, fmt.Errorf("读取预检结果失败: %w", err)
	}
	fields := strings.Fields(strings.TrimSpace(string(data)))
	if len(fields) != 2 {
		return 0, 0, fmt.Errorf("结果无法解析: %q", strings.TrimSpace(string(data)))
	}
	if tables, err = strconv.Atoi(fields[0]); err != nil {
		return 0, 0, fmt.Errorf("表数无法解析: %q", fields[0])
	}
	if menus, err = strconv.Atoi(fields[1]); err != nil {
		return 0, 0, fmt.Errorf("菜单行数无法解析: %q", fields[1])
	}
	return tables, menus, nil
}

// mysqlParams 从 config DSN 解析出的 mysql/mysqldump 连接参数。
type mysqlParams struct {
	Host, Port, User, Passwd, DBName string
	UnixSocket                       string // DSN 为 unix socket 时非空,命令行走 -S
}

// resolveMySQLParams 从 config.Get().MySQL.DSN 解析连接参数。
func resolveMySQLParams() (*mysqlParams, error) {
	return parseMySQLDSN(config.Get().MySQL.DSN)
}

// parseMySQLDSN 解析 go-sql-driver 格式 DSN(拆出来便于单测)。
func parseMySQLDSN(dsn string) (*mysqlParams, error) {
	if dsn == "" {
		return nil, fmt.Errorf("config MySQL DSN 为空,无法确定重置目标库")
	}
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("解析 MySQL DSN 失败: %w", err)
	}
	p := &mysqlParams{User: cfg.User, Passwd: cfg.Passwd, DBName: cfg.DBName}
	if cfg.Net == "unix" {
		p.UnixSocket = cfg.Addr
		return p, nil
	}
	p.Host, p.Port = "127.0.0.1", "3306"
	if i := strings.LastIndex(cfg.Addr, ":"); i >= 0 {
		p.Host, p.Port = cfg.Addr[:i], cfg.Addr[i+1:]
	} else if cfg.Addr != "" {
		p.Host = cfg.Addr
	}
	return p, nil
}

// clientArgs 组装命令行参数(不含 bin 本身——exec.CommandContext(bin, args...) 已把
// bin 作为 argv[0],重复传入会被客户端当成首个位置参数=数据库名,报 1049 Unknown database);
// 密码经 MYSQL_PWD 环境变量传递(不进 argv,防 ps 泄露)。
func (p *mysqlParams) clientArgs(bin string) []string {
	var args []string
	if p.UnixSocket != "" {
		args = append(args, "-S", p.UnixSocket)
	} else {
		args = append(args, "-h", p.Host, "-P", p.Port)
	}
	return append(args, "-u", p.User, "--default-character-set=utf8mb4")
}

// env 在当前环境基础上注入 MYSQL_PWD(密码含特殊字符也无需转义)。
func (p *mysqlParams) env() []string {
	return append(os.Environ(), "MYSQL_PWD="+p.Passwd)
}

// findBinary 客户端探测:PATH 优先,候选绝对路径兜底;都不存在返回错误。
func findBinary(name string, fallbacks []string) (string, error) {
	if p, err := exec.LookPath(name); err == nil {
		return p, nil
	}
	for _, c := range fallbacks {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c, nil
		}
	}
	return "", fmt.Errorf("未找到 %s 客户端(PATH 及候选路径 %v 均不存在);不做 gorm 劈 SQL 降级,任务按失败处理", name, fallbacks)
}

// runSQLTool 运行 mysql/mysqldump 子进程:stdinPath 非空时作为标准输入灌 SQL,
// stdoutFile 非空时接住标准输出(mysqldump 备份);超时或非零退出返回 stderr 摘要。
func runSQLTool(ctx context.Context, bin string, args []string, env []string,
	stdinPath string, stdoutFile *os.File, timeout time.Duration) error {
	cctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(cctx, bin, args...)
	cmd.Env = env
	if stdinPath != "" {
		f, err := os.Open(stdinPath)
		if err != nil {
			return fmt.Errorf("打开 SQL 文件 %s 失败: %w", stdinPath, err)
		}
		defer f.Close()
		cmd.Stdin = f
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if stdoutFile != nil {
		cmd.Stdout = stdoutFile
	}

	if err := cmd.Run(); err == nil {
		return nil
	} else if cctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("%s 执行超时(>%s)", bin, timeout)
	} else {
		msg := strings.TrimSpace(stderr.String())
		if len(msg) > 800 {
			msg = msg[:800] + "…"
		}
		return fmt.Errorf("%s 执行失败: %v; stderr: %s", bin, err, msg)
	}
}
