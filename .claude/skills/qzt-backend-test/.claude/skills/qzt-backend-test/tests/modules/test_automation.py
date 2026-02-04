#!/usr/bin/env python3
"""AUTOMATION 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class AutomationTest(TestBase):
    """automation 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "automation"
    
    def test_0(self):
        """创建自动化规则"""
        self.test_endpoint("POST", "/automation/rules", "创建自动化规则")
    
    def test_1(self):
        """查询所有自动化规则"""
        self.test_endpoint("GET", "/automation/rules", "查询所有自动化规则")
    
    def test_2(self):
        """查询单个规则"""
        self.test_endpoint("GET", "/automation/rules/test-id", "查询单个规则")
    
    def test_3(self):
        """更新规则"""
        self.test_endpoint("PATCH", "/automation/rules/test-id", "更新规则")
    
    def test_4(self):
        """删除规则"""
        self.test_endpoint("DELETE", "/automation/rules/test-id", "删除规则")
    
    def test_5(self):
        """启用/禁用规则"""
        self.test_endpoint("PATCH", "/automation/rules/test-id/toggle", "启用/禁用规则")
    
    def test_6(self):
        """手动触发规则"""
        self.test_endpoint("POST", "/automation/rules/test-id/trigger", "手动触发规则")
    
    def test_7(self):
        """查询任务执行历史"""
        self.test_endpoint("GET", "/automation/tasks/history", "查询任务执行历史")
    
    def test_8(self):
        """查询当前用户通知"""
        self.test_endpoint("GET", "/automation/notifications", "查询当前用户通知")
    
    def test_9(self):
        """标记通知为已读"""
        self.test_endpoint("PATCH", "/automation/notifications/test-id/read", "标记通知为已读")
    
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
        self.test_5()
        self.test_6()
        self.test_7()
        self.test_8()
        self.test_9()
        self.print_summary()
