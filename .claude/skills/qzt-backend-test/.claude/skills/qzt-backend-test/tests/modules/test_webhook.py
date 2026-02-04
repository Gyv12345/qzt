#!/usr/bin/env python3
"""WEBHOOK 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class WebhookTest(TestBase):
    """webhook 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "webhook"
    
    def test_0(self):
        """发送 Webhook 消息"""
        self.test_endpoint("POST", "/webhook/send", "发送 Webhook 消息")
    
    def test_1(self):
        """获取 Webhook 配置列表"""
        self.test_endpoint("GET", "/webhook/configs", "获取 Webhook 配置列表")
    
    def test_2(self):
        """创建 Webhook 配置"""
        self.test_endpoint("POST", "/webhook/configs", "创建 Webhook 配置")
    
    def test_3(self):
        """更新 Webhook 配置"""
        self.test_endpoint("PATCH", "/webhook/configs/test-id", "更新 Webhook 配置")
    
    def test_4(self):
        """删除 Webhook 配置"""
        self.test_endpoint("DELETE", "/webhook/configs/test-id", "删除 Webhook 配置")
    
    def test_5(self):
        """测试 Webhook 发送"""
        self.test_endpoint("POST", "/webhook/test", "测试 Webhook 发送")
    
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
        self.print_summary()
