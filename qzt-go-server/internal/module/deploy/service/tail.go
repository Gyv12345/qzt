package service

import (
	"strings"
	"sync"
)

// tailBuffer 线程安全的日志尾缓冲:供重建脚本 CombinedOutput 写入,
// 只保留最近 n 行,状态查询时返回 log_tail(末 30 行口径)。
type tailBuffer struct {
	mu    sync.Mutex
	n     int
	lines []string
	pend  strings.Builder // 尚未遇到 \n 的不完整行
}

// newTailBuffer 构造,只留最近 n 行。
func newTailBuffer(n int) *tailBuffer { return &tailBuffer{n: n} }

// Write 实现 io.Writer:按 \n 切行入缓冲,不完整片段留在 pend 等下一次写入。
func (t *tailBuffer) Write(p []byte) (int, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.pend.Write(p)
	s := t.pend.String()
	idx := strings.LastIndexByte(s, '\n')
	if idx < 0 {
		return len(p), nil
	}
	for _, line := range strings.Split(s[:idx], "\n") {
		t.pushLocked(line)
	}
	t.pend.Reset()
	t.pend.WriteString(s[idx+1:])
	return len(p), nil
}

// Lines 返回当前日志尾(时间顺序;末尾可能带一条未换行的不完整片段)。
func (t *tailBuffer) Lines() []string {
	t.mu.Lock()
	defer t.mu.Unlock()
	out := make([]string, len(t.lines))
	copy(out, t.lines)
	if t.pend.Len() > 0 {
		out = append(out, t.pend.String())
	}
	return out
}

// pushLocked 追加一行并裁剪到最近 n 行;跳过空行。
func (t *tailBuffer) pushLocked(line string) {
	if line == "" {
		return
	}
	t.lines = append(t.lines, line)
	if len(t.lines) > t.n {
		t.lines = t.lines[len(t.lines)-t.n:]
	}
}
