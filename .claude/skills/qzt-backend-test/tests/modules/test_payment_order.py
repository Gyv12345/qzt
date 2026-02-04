#!/usr/bin/env python3
"""
PAYMENT_ORDER 模块 API 测试
自动生成于: 2026-02-04T09:59:12.989191
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class PaymentOrderTest(TestBase):
    """payment_order 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "payment_order"


    def test_post_0(self):
        """测试: 创建支付订单"""
        self.test_endpoint(
            "POST", "/payment/orders",
            "创建支付订单",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取支付订单列表"""
        self.test_endpoint(
            "GET", "/payment/orders",
            "获取支付订单列表",
            expect_status=200,
            require_auth=true
        )

    def test_put_2(self):
        """测试: 更新支付订单"""
        self.test_endpoint(
            "PUT", "/payment/orders/test-id",
            "更新支付订单",
            expect_status=200,
            require_auth=true
        )

    def test_delete_3(self):
        """测试: 删除支付订单"""
        self.test_endpoint(
            "DELETE", "/payment/orders/test-id",
            "删除支付订单",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 获取支付订单详情"""
        self.test_endpoint(
            "GET", "/payment/orders/test-id",
            "获取支付订单详情",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 生成支付二维码"""
        self.test_endpoint(
            "POST", "/payment/orders/qrcode",
            "生成支付二维码",
            expect_status=200,
            require_auth=true
        )

    def test_post_6(self):
        """测试: 申请退款"""
        self.test_endpoint(
            "POST", "/payment/orders/refund",
            "申请退款",
            expect_status=200,
            require_auth=true
        )

    def test_post_7(self):
        """测试: 取消订单"""
        self.test_endpoint(
            "POST", "/payment/orders/cancel/test-id",
            "取消订单",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 查询订单状态"""
        self.test_endpoint(
            "GET", "/payment/orders/status/test-id",
            "查询订单状态",
            expect_status=200,
            require_auth=true
        )

    def test_post_9(self):
        """测试: 创建支付配置"""
        self.test_endpoint(
            "POST", "/payment/configs",
            "创建支付配置",
            expect_status=200,
            require_auth=true
        )

    def test_get_10(self):
        """测试: 获取支付配置列表"""
        self.test_endpoint(
            "GET", "/payment/configs",
            "获取支付配置列表",
            expect_status=200,
            require_auth=true
        )

    def test_put_11(self):
        """测试: 更新支付配置"""
        self.test_endpoint(
            "PUT", "/payment/configs/test-id",
            "更新支付配置",
            expect_status=200,
            require_auth=true
        )

    def test_delete_12(self):
        """测试: 删除支付配置"""
        self.test_endpoint(
            "DELETE", "/payment/configs/test-id",
            "删除支付配置",
            expect_status=200,
            require_auth=true
        )

    def test_get_13(self):
        """测试: 获取支付配置详情"""
        self.test_endpoint(
            "GET", "/payment/configs/test-id",
            "获取支付配置详情",
            expect_status=200,
            require_auth=true
        )

    def test_post_14(self):
        """测试: 微信支付回调"""
        self.test_endpoint(
            "POST", "/payment/wechat",
            "微信支付回调",
            expect_status=200,
            require_auth=true
        )

    def test_post_15(self):
        """测试: 支付宝支付回调"""
        self.test_endpoint(
            "POST", "/payment/alipay",
            "支付宝支付回调",
            expect_status=200,
            require_auth=true
        )

    def test_get_16(self):
        """测试: 查询支付订单的回调日志"""
        self.test_endpoint(
            "GET", "/payment/orders/test-id/callback-logs",
            "查询支付订单的回调日志",
            expect_status=200,
            require_auth=true
        )

    def test_get_17(self):
        """测试: 查询所有支付回调日志"""
        self.test_endpoint(
            "GET", "/payment/callback-logs",
            "查询所有支付回调日志",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"PaymentOrder 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_put_2()
        self.test_delete_3()
        self.test_get_4()
        self.test_post_5()
        self.test_post_6()
        self.test_post_7()
        self.test_get_8()
        self.test_post_9()
        self.test_get_10()
        self.test_put_11()
        self.test_delete_12()
        self.test_get_13()
        self.test_post_14()
        self.test_post_15()
        self.test_get_16()
        self.test_get_17()

        self.print_summary()
