// Package version 集中管理后端构建版本信息。
//
// 版本号遵循语义化版本三段式 MAJOR.MINOR.PATCH(带 v 前缀):破坏性变更升主版本,
// 每次对外发布新功能升次版本,纯缺陷修复升修订号,并在仓库打同名 git tag。
// 正式构建由 Makefile 通过 -ldflags 注入 git describe 结果;直接 go run 时
// Version 取默认值,GitCommit/BuildTime 缺失时自动回退 Go 构建自带的 VCS 信息。
package version

import (
	"runtime"
	"runtime/debug"
)

var (
	// Version 当前版本号。默认为最近一次发布的版本;Makefile 构建时注入实际 tag。
	Version = "v1.0.0"
	// GitCommit 构建时的 Git 提交短哈希,由 Makefile 注入;空则运行时从构建信息读取。
	GitCommit string
	// BuildTime 构建时间,由 Makefile 注入;空则运行时从构建信息读取。
	BuildTime string
)

// Info 对外展示的系统版本信息。
type Info struct {
	Version   string `json:"version"`
	GitCommit string `json:"git_commit"`
	BuildTime string `json:"build_time"`
	GoVersion string `json:"go_version"`
}

// Get 返回当前版本信息。GitCommit/BuildTime 未注入时,优先取 go build 写入二进制的
// vcs.revision / vcs.time(在 git 仓库内编译即有),都没有才落 unknown。
func Get() Info {
	info := Info{
		Version:   Version,
		GitCommit: GitCommit,
		BuildTime: BuildTime,
		GoVersion: runtime.Version(),
	}
	if bi, ok := debug.ReadBuildInfo(); ok {
		for _, s := range bi.Settings {
			switch s.Key {
			case "vcs.revision":
				if info.GitCommit == "" && len(s.Value) >= 7 {
					info.GitCommit = s.Value[:7]
				}
			case "vcs.time":
				if info.BuildTime == "" {
					info.BuildTime = s.Value
				}
			}
		}
	}
	if info.GitCommit == "" {
		info.GitCommit = "unknown"
	}
	if info.BuildTime == "" {
		info.BuildTime = "unknown"
	}
	return info
}
