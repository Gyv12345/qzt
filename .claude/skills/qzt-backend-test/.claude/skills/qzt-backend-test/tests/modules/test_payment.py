#!/usr/bin/env python3
"""PAYMENT 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class PaymentTest(TestBase):
    """payment 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "payment"
    
    def test_0(self):
        """创建支付订单"""
        self.test_endpoint("POST", "/payment/orders", "创建支付订单")
    
    def test_1(self):
        """获取支付订单列表"""
        self.test_endpoint("GET", "/payment/orders", "获取支付订单列表")
    
    def test_2(self):
        """更新支付订单"""
        self.test_endpoint("PUT", "/payment/orders/test-id", "更新支付订单")
    
    def test_3(self):
        """删除支付订单"""
        self.test_endpoint("DELETE", "/payment/orders/test-id", "删除支付订单")
    
    def test_4(self):
        """获取支付订单详情"""
        self.test_endpoint("GET", "/payment/orders/test-id", "获取支付订单详情")
    
    def test_5(self):
        """生成支付二维码"""
        self.test_endpoint("POST", "/payment/orders/qrcode", "生成支付二维码")
    
    def test_6(self):
        """申请退款"""
        self.test_endpoint("POST", "/payment/orders/refund", "申请退款")
    
    def test_7(self):
        """取消订单"""
        self.test_endpoint("POST", "/payment/orders/cancel/test-id", "取消订单")
    
    def test_8(self):
        """查询订单状态"""
        self.test_endpoint("GET", "/payment/orders/status/{orderNo}", "查询订单状态")
    
    def test_9(self):
        """创建支付配置"""
        self.test_endpoint("POST", "/payment/configs", "创建支付配置")
    
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
