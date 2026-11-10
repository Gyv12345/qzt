package service

import (
	"testing"
	"time"

	hrmmodel "qzt-go-server/internal/model/hrm"
)

// schedule_test.go 班次判定纯函数单测(P14):迟到宽限/早退缺卡/法定假日免勤。

func shiftFixture() *hrmmodel.HrmShift {
	return &hrmmodel.HrmShift{
		Name:        "标准班",
		StartTime:   "09:00:00",
		EndTime:     "18:00:00",
		FlexMinutes: 10,
	}
}

func dayAt(hh, mm int) *time.Time {
	t := time.Date(2026, 11, 5, hh, mm, 0, 0, time.Local)
	return &t
}

func TestEvaluateShiftDay_Late(t *testing.T) {
	// 09:15 打卡,弹性 10 分钟 → 迟到 15 分钟
	res := EvaluateShiftDay(shiftFixture(), "", dayAt(9, 15), dayAt(18, 0))
	if !res.ShouldAttend || !res.Present {
		t.Fatalf("应出勤且到岗: %+v", res)
	}
	if res.LateMinutes != 15 {
		t.Fatalf("应判迟到 15 分钟,实际 %d", res.LateMinutes)
	}
	if res.EarlyMinutes != 0 {
		t.Fatalf("准点下班不应早退,实际 %d", res.EarlyMinutes)
	}
}

func TestEvaluateShiftDay_FlexNotLate(t *testing.T) {
	// 09:08 打卡,弹性 10 分钟内 → 不算迟到
	res := EvaluateShiftDay(shiftFixture(), "", dayAt(9, 8), dayAt(18, 0))
	if res.LateMinutes != 0 {
		t.Fatalf("弹性宽限内不应迟到,实际 %d", res.LateMinutes)
	}
}

func TestEvaluateShiftDay_EarlyAndMissingOut(t *testing.T) {
	// 16:00 打下班卡 → 早退 120 分钟
	res := EvaluateShiftDay(shiftFixture(), "", dayAt(9, 0), dayAt(16, 0))
	if res.EarlyMinutes != 120 {
		t.Fatalf("应判早退 120 分钟,实际 %d", res.EarlyMinutes)
	}
	// 无下班卡 → 缺下班卡
	res2 := EvaluateShiftDay(shiftFixture(), "", dayAt(9, 0), nil)
	if !res2.MissingOut || res2.MissingIn {
		t.Fatalf("应只缺下班卡: %+v", res2)
	}
	// 无任何打卡 → 双缺卡
	res3 := EvaluateShiftDay(shiftFixture(), "", nil, nil)
	if !res3.MissingIn || !res3.MissingOut {
		t.Fatalf("全缺卡: %+v", res3)
	}
}

func TestEvaluateShiftDay_HolidayFree(t *testing.T) {
	// 法定假日:不判迟到/缺卡
	res := EvaluateShiftDay(shiftFixture(), hrmmodel.HolidayTypeHoliday, nil, nil)
	if res.ShouldAttend {
		t.Fatal("法定假日不应要求出勤")
	}
	if res.MissingIn || res.MissingOut {
		t.Fatal("假日不应判缺卡")
	}
}
