// Package ipregion 离线 IP 归属地查询(基于 ip2region xdb,全内存,纯离线)。
//
// 用于登录日志等场景展示 IP 大概地址。启动时调 Init 加载 xdb 到内存,
// 查询用 Lookup(微秒级)。xdb searcher 非线程安全,内部加锁。
//
// 数据文件:data/ip2region.xdb(11MB,IPv4,gitignore 不入库,部署时随二进制带上)。
// 未配置/加载失败时降级:Lookup 返回空串,不阻断业务。
package ipregion

import (
	"os"
	"strings"
	"sync"

	"github.com/lionsoul2014/ip2region/binding/golang/xdb"
)

var (
	mu       sync.Mutex
	searcher *xdb.Searcher // 全内存 searcher(非线程安全,加锁复用)
)

// Init 加载 xdb 文件到内存(启动时调一次)。文件缺失或解析失败返回 error,
// 调用方应仅记日志、不阻断启动(Lookup 将降级返回空串)。
func Init(xdbPath string) error {
	buf, err := os.ReadFile(xdbPath)
	if err != nil {
		return err
	}
	s, err := xdb.NewWithBuffer(xdb.IPv4, buf)
	if err != nil {
		return err
	}
	searcher = s
	return nil
}

// Lookup 返回 IP 归属地(格式化,如 "中国 广东省 深圳 联通";内网返回 "内网IP")。
// 未初始化、空 IP 或解析失败返回空串。
func Lookup(ip string) string {
	if searcher == nil || ip == "" {
		return ""
	}
	mu.Lock()
	defer mu.Unlock()
	region, err := searcher.Search(ip)
	if err != nil {
		return ""
	}
	return formatRegion(region)
}

// formatRegion 把 "中国|0|广东省|深圳|联通|CN" 格式化为 "中国 广东省 深圳 联通"
// (去掉 0/空段,以及末尾与首段中文国名重复的 ISO 国家代码)。
func formatRegion(r string) string {
	if r == "" {
		return ""
	}
	parts := strings.Split(r, "|")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" && p != "0" {
			out = append(out, p)
		}
	}
	// 去掉末尾的 ISO 国家代码(如 CN/US/HK),与首段中文国名重复
	if len(out) >= 2 && isISOCountryCode(out[len(out)-1]) {
		out = out[:len(out)-1]
	}
	return strings.Join(out, " ")
}

// isISOCountryCode 判断是否为两字母大写 ISO 国家代码(CN/US/HK...)。
func isISOCountryCode(s string) bool {
	if len(s) != 2 {
		return false
	}
	for _, c := range s {
		if c < 'A' || c > 'Z' {
			return false
		}
	}
	return true
}

