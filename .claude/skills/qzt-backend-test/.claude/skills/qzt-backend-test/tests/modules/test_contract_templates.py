#!/usr/bin/env python3
"""CONTRACT_TEMPLATES 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ContractTemplatesTest(TestBase):
    """contract_templates 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contract_templates"
    
    def test_0(self):
        """获取所有合同模板"""
        self.test_endpoint("GET", "/contract-templates", "获取所有合同模板")
    
    def test_1(self):
        """创建合同模板"""
        self.test_endpoint("POST", "/contract-templates", "创建合同模板")
    
    def test_2(self):
        """获取模板详情"""
        self.test_endpoint("GET", "/contract-templates/test-id", "获取模板详情")
    
    def test_3(self):
        """更新合同模板"""
        self.test_endpoint("PUT", "/contract-templates/test-id", "更新合同模板")
    
    def test_4(self):
        """删除合同模板"""
        self.test_endpoint("DELETE", "/contract-templates/test-id", "删除合同模板")
    
    def test_5(self):
        """获取模板变量定义"""
        self.test_endpoint("GET", "/contract-templates/test-id/variables", "获取模板变量定义")
    
    def test_6(self):
        """预览合同（替换变量）"""
        self.test_endpoint("POST", "/contract-templates/test-id/preview", "预览合同（替换变量）")
    
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
        self.print_summary()
