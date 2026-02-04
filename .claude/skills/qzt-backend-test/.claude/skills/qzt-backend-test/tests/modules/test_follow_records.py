#!/usr/bin/env python3
"""FOLLOW_RECORDS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class FollowRecordsTest(TestBase):
    """follow_records 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "follow_records"
    
    def test_0(self):
        """查询跟进记录列表"""
        self.test_endpoint("GET", "/follow-records", "查询跟进记录列表")
    
    def test_1(self):
        """创建跟进记录"""
        self.test_endpoint("POST", "/follow-records", "创建跟进记录")
    
    def test_2(self):
        """获取跟进记录详情"""
        self.test_endpoint("GET", "/follow-records/test-id", "获取跟进记录详情")
    
    def test_3(self):
        """更新跟进记录"""
        self.test_endpoint("PATCH", "/follow-records/test-id", "更新跟进记录")
    
    def test_4(self):
        """删除跟进记录"""
        self.test_endpoint("DELETE", "/follow-records/test-id", "删除跟进记录")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.test_1()
        self.test_2()
        self.test_3()
        self.test_4()
        self.print_summary()
