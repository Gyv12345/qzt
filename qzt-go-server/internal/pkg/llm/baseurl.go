package llm

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// baseurl.go OpenAI 兼容端点的出网安全校验(纯函数,档案保存/激活时调用)。
// 约束:服务端 LLM 出网仅允许 http/https,且 host 必须是公网地址——
// 拒绝环回/内网/链路本地/保留地址,防止把含业务数据的提示词引到内网端点(SSRF)。
// 不内置进 NewClient(单测用 httptest 环回地址起 mock 服务器),由档案入口侧强制。

// ValidatePublicBaseURL 校验 base_url 是否可作为 LLM 出网端点:
// 1) 仅接受 http/https;2) host 可解析出 IP 时必须是公网单播地址;
// 3) 信任主机名(公网域名)放行——真实出网时的解析结果由部署环境网络策略兜底。
// 返回 nil 表示通过;非 nil 带明确中文原因。
func ValidatePublicBaseURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("base_url 不能为空")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("base_url 不是合法 URL: %v", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("base_url 仅支持 http/https 协议,当前为 %q", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("base_url 缺少主机名")
	}
	// IP 直填:逐字面量判内网/环回/保留段;域名:交给解析,解析出私网段同样拒绝。
	if ip := net.ParseIP(host); ip != nil {
		return validatePublicIP(ip)
	}
	// 域名形态:全数字(host 但非 IP)或含端口歧义已由 Hostname 剥离;此处再拦
	// 常见本地后缀与单段主机名(如 "localhost"、"llm.local"——无公网解析语义)。
	lower := strings.ToLower(host)
	if lower == "localhost" || strings.HasSuffix(lower, ".localhost") || strings.HasSuffix(lower, ".local") || strings.HasSuffix(lower, ".internal") {
		return fmt.Errorf("base_url 不允许指向本地/内部主机名: %s", host)
	}
	// 尝试解析:解析结果若全为私网/保留地址同样拒绝(覆盖手填内网域名的场景)。
	ips, lookupErr := net.LookupIP(host)
	if lookupErr == nil && len(ips) > 0 {
		for _, ip := range ips {
			if err := validatePublicIP(ip); err != nil {
				return err
			}
		}
	}
	// 解析失败(离线环境)放行:出网时按连接失败报错,不在保存环节误伤。
	return nil
}

// validatePublicIP 单个 IP 的公网性校验:仅放行公网单播地址。
func validatePublicIP(ip net.IP) error {
	// 环回/链路本地/多播/未指定一律拒绝。
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
		return fmt.Errorf("base_url 不允许指向环回/链路本地/多播地址: %s", ip)
	}
	// IPv4 私网段(10/8、172.16/12、192.168/16)与 IPv4/IPv6 过渡保留段。
	if ip.IsPrivate() {
		return fmt.Errorf("base_url 不允许指向内网保留地址: %s", ip)
	}
	// net.IP.IsPrivate 未覆盖的保留段:100.64/10(CGNAT)、192.0.0/24、192.0.2/24、
	// 198.18/15(基准测试)、198.51.100/24、203.0.113/24(文档)、240/4(保留)、255.255.255.255。
	if v4 := ip.To4(); v4 != nil {
		if isReservedIPv4(v4) {
			return fmt.Errorf("base_url 不允许指向保留地址段: %s", ip)
		}
		return nil
	}
	// IPv6 保留段:唯一本地 fc00::/7、文档 2001:db8::/32。
	if isReservedIPv6(ip) {
		return fmt.Errorf("base_url 不允许指向保留地址段: %s", ip)
	}
	return nil
}

// isReservedIPv4 覆盖 IsPrivate/IsLoopback 之外的 IPv4 保留段。
func isReservedIPv4(v4 net.IP) bool {
	switch {
	// 100.64.0.0/10 运营商级 NAT
	case v4[0] == 100 && v4[1] >= 64 && v4[1] <= 127:
		return true
	// 192.0.0.0/24(设备管理)与 192.0.2.0/24(TEST-NET-1)
	case v4[0] == 192 && v4[1] == 0:
		return true
	// 198.18.0.0/15 基准测试
	case v4[0] == 198 && (v4[1] == 18 || v4[1] == 19):
		return true
	// 198.51.100.0/24 与 203.0.113.0/24 文档段
	case v4[0] == 198 && v4[1] == 51 && v4[2] == 100:
		return true
	case v4[0] == 203 && v4[1] == 0 && v4[2] == 113:
		return true
	// 240.0.0.0/4 保留与 255.255.255.255 广播
	case v4[0] >= 240:
		return true
	// 0.0.0.0/8 本网络段(IsUnspecified 只覆盖 0.0.0.0 单地址)
	case v4[0] == 0:
		return true
	}
	return false
}

// isReservedIPv6 覆盖 IsPrivate 之外的 IPv6 保留段(唯一本地/文档段)。
func isReservedIPv6(ip net.IP) bool {
	// fc00::/7 唯一本地地址(IsPrivate 只覆盖 fec0::/10 站点本地,已废弃)
	if len(ip) == 16 && ip[0]&0xFE == 0xFC {
		return true
	}
	// 2001:db8::/32 文档段
	if len(ip) == 16 && ip[0] == 0x20 && ip[1] == 0x01 && ip[2] == 0x0d && ip[3] == 0xb8 {
		return true
	}
	return false
}
