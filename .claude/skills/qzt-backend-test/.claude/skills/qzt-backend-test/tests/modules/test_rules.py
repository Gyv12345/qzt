#!/usr/bin/env python3
"""RULES 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class RulesTest(TestBase):
    """rules 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "rules"
    
    def test_0(self):
        """创建触发器"""
        self.test_endpoint("POST", "/rules/triggers", "创建触发器")
    
    def test_1(self):
        """获取触发器列表"""
        self.test_endpoint("GET", "/rules/triggers", "获取触发器列表")
    
    def test_2(self):
        """获取启用的触发器列表"""
        self.test_endpoint("GET", "/rules/triggers/enabled", "获取启用的触发器列表")
    
    def test_3(self):
        """获取触发器详情"""
        self.test_endpoint("GET", "/rules/triggers/test-id", "获取触发器详情")
    
    def test_4(self):
        """更新触发器"""
        self.test_endpoint("PATCH", "/rules/triggers/test-id", "更新触发器")
    
    def test_5(self):
        """删除触发器"""
        self.test_endpoint("DELETE", "/rules/triggers/test-id", "删除触发器")
    
    def test_6(self):
        """启用/禁用触发器"""
        self.test_endpoint("PATCH", "/rules/triggers/test-id/toggle", "启用/禁用触发器")
    
    def test_7(self):
        """手动执行规则"""
        self.test_endpoint("POST", "/rules/execute/{triggerId}", "手动执行规则")
    
    def test_8(self):
        """获取执行日志"""
        self.test_endpoint("GET", "/rules/logs", "获取执行日志")
    
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
        self.print_summary()
