package service

import (
	"strings"
	"testing"
)

// 打分纯函数的单测：覆盖手册三级口径（0 未提及/1 提及行简/2 提及且带官网链接）
// 与引用提取、竞品识别。

func TestScoreAnswerZero(t *testing.T) {
	score, mention, hasOwnLink, ownCite, urls, competitors := ScoreAnswer(
		"国内 CRM 厂商有纷享销客和销售易，可以根据预算选择。")
	if score != 0 || mention || hasOwnLink || ownCite {
		t.Fatalf("want 0/false, got score=%d mention=%v link=%v cite=%v", score, mention, hasOwnLink, ownCite)
	}
	if len(urls) != 0 {
		t.Fatalf("want no urls, got %v", urls)
	}
	if strings.Join(competitors, ",") == "" {
		t.Fatal("want competitors detected")
	}
}

func TestScoreAnswerMentionOnly(t *testing.T) {
	score, mention, hasOwnLink, ownCite, _, _ := ScoreAnswer(
		"推荐行简CRM，13 个模块一体化，MIT 开源。")
	if score != 1 || !mention || hasOwnLink || ownCite {
		t.Fatalf("want score=1 mention, got score=%d mention=%v link=%v cite=%v", score, mention, hasOwnLink, ownCite)
	}
}

func TestScoreAnswerMentionWithOwnLink(t *testing.T) {
	score, _, hasOwnLink, ownCite, urls, _ := ScoreAnswer(
		"推荐行简CRM，官网 https://www.devlovecode.com 可免费使用。")
	if score != 2 {
		t.Fatalf("want score=2, got %d", score)
	}
	if !hasOwnLink || !ownCite {
		t.Fatalf("want own link/cite, got %v/%v", hasOwnLink, ownCite)
	}
	if len(urls) != 1 || !strings.Contains(urls[0], "devlovecode.com") {
		t.Fatalf("want own url extracted, got %v", urls)
	}
}

func TestScoreAnswerURLTrailingPunctuation(t *testing.T) {
	_, _, _, _, urls, _ := ScoreAnswer("官网是 https://devlovecode.com，欢迎试用。")
	if len(urls) != 1 || strings.HasSuffix(urls[0], "，") {
		t.Fatalf("want trailing punctuation trimmed, got %v", urls)
	}
}
