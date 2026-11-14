package service

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
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
//  1. scp qzt-go-server/docs/sql/qztgo.sql root@8.155.147.225:/opt/qzt-server/bin/demo_baseline.sql
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
		"--no-create-info", "--skip-triggers", "--single-transaction", "--hex-blob", p.DBName)
	dumpArgs = append(dumpArgs, demoConfigTables...)
	if err := runSQLTool(ctx, dumpBin, dumpArgs, p.env(), "", backup, demoBackupTimeout); err != nil {
		return fmt.Errorf("备份运营配置表失败(基线未重放,数据未动): %w", err)
	}

	// 2) 整文件重放基线(DROP+CREATE+INSERT,文件自带外键开关与 USE qztgo)
	replayArgs := append(p.clientArgs(mysqlBin), p.DBName)
	if err := runSQLTool(ctx, mysqlBin, replayArgs, p.env(), demoBaselinePath, nil, demoReplayTimeout); err != nil {
		return fmt.Errorf("基线重放失败(库可能处于半重置状态,需人工介入恢复): %w", err)
	}

	// 3) 回填运营配置(表已被基线重建为空,纯 INSERT 即还原)
	if err := runSQLTool(ctx, mysqlBin, replayArgs, p.env(), tmp, nil, demoBackupTimeout); err != nil {
		return fmt.Errorf("回填运营配置表失败(基线已重放,企微/OSS 等配置需人工重配): %w", err)
	}

	cost := time.Since(start)
	xlogger.InfofCtx(ctx, "演示重置:完成,耗时 %.1fs", cost.Seconds())
	content := fmt.Sprintf("演示数据已恢复到干净基线(%s),耗时 %.1fs。运营配置(企微/OSS/API Key/渠道账号)已保留。",
		time.Now().Format("2006-01-02 15:04"), cost.Seconds())
	notify.Dispatch(ctx, demoAdminUserID, "演示数据已每周重置", content, "")
	return nil
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

// clientArgs 组装命令行参数;密码经 MYSQL_PWD 环境变量传递(不进 argv,防 ps 泄露)。
func (p *mysqlParams) clientArgs(bin string) []string {
	args := []string{bin}
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
