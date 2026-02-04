#!/usr/bin/env python3
"""PRODUCT_FLOWS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ProductFlowsTest(TestBase):
    """product_flows 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "product_flows"
    
    def test_0(self):
        """获取产品的所有流程"""
        self.test_endpoint("GET", "/product-flows/product/{productId}", "获取产品的所有流程")
    
    def test_1(self):
        """获取流程详情"""
        self.test_endpoint("GET", "/product-flows/test-id", "获取流程详情")
    
    def test_2(self):
        """更新流程"""
        self.test_endpoint("PUT", "/product-flows/test-id", "更新流程")
    
    def test_3(self):
        """删除流程"""
        self.test_endpoint("DELETE", "/product-flows/test-id", "删除流程")
    
    def test_4(self):
        """创建产品流程"""
        self.test_endpoint("POST", "/product-flows", "创建产品流程")
    
    def test_5(self):
        """启用/禁用流程"""
        self.test_endpoint("PUT", "/product-flows/test-id/toggle", "启用/禁用流程")
    
    def test_6(self):
        """添加节点到流程"""
        self.test_endpoint("POST", "/product-flows/test-id/nodes", "添加节点到流程")
    
    def test_7(self):
        """更新节点"""
        self.test_endpoint("PUT", "/product-flows/nodes/{nodeId}", "更新节点")
    
    def test_8(self):
        """删除节点"""
        self.test_endpoint("DELETE", "/product-flows/nodes/{nodeId}", "删除节点")
    
    def test_9(self):
        """创建流程执行记录"""
        self.test_endpoint("POST", "/product-flows/executions", "创建流程执行记录")
    
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
