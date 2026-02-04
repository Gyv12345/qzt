#!/usr/bin/env python3
"""
PAYMENT_ORDER 模块 API 测试
自动生成于: 2026-02-04T10:25:51.754821
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class PaymentOrderTest(TestBase):
    """payment_order 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "payment_order"


    def test_post_0(self):
        """测试: 创建支付订单"""
        data = self.get_test_data("post_0")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/orders",
                "创建支付订单",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建支付订单 (缺少测试数据)", "WARN")

    def test_get_1(self):
        """测试: 获取支付订单列表"""
        self.test_endpoint(
        "GET", "/payment/orders",
        "获取支付订单列表",
        expect_status=200,
        require_auth=True
    )

    def test_put_2(self):
        """测试: 更新支付订单"""
        data = self.get_test_data("put_2")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/payment/orders/test-id",
                "更新支付订单",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新支付订单 (缺少测试数据)", "WARN")

    def test_delete_3(self):
        """测试: 删除支付订单"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/orders/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除支付订单",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除支付订单 (没有可用的资源 ID)", "WARN")

    def test_get_4(self):
        """测试: 获取支付订单详情"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/orders/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取支付订单详情",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取支付订单详情 (没有可用的资源 ID)", "WARN")

    def test_post_5(self):
        """测试: 生成支付二维码"""
        data = self.get_test_data("post_5")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/orders/qrcode",
                "生成支付二维码",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 生成支付二维码 (缺少测试数据)", "WARN")

    def test_post_6(self):
        """测试: 申请退款"""
        data = self.get_test_data("post_6")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/orders/refund",
                "申请退款",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 申请退款 (缺少测试数据)", "WARN")

    def test_post_7(self):
        """测试: 取消订单"""
        data = self.get_test_data("post_7")
        if data and data.get("request_body"):
            self.test_endpoint(
                "POST", "/payment/orders/cancel/test-id",
                "取消订单",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 取消订单 (缺少测试数据)", "WARN")

    def test_get_8(self):
        """测试: 查询订单状态"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/orders/status/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "查询订单状态",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 查询订单状态 (没有可用的资源 ID)", "WARN")

    def test_post_9(self):
        """测试: 创建支付配置"""
        data = self.get_test_data("post_9")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/configs",
                "创建支付配置",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 创建支付配置 (缺少测试数据)", "WARN")

    def test_get_10(self):
        """测试: 获取支付配置列表"""
        self.test_endpoint(
        "GET", "/payment/configs",
        "获取支付配置列表",
        expect_status=200,
        require_auth=True
    )

    def test_put_11(self):
        """测试: 更新支付配置"""
        data = self.get_test_data("put_11")
        if data and data.get("request_body"):
            self.test_endpoint(
                "PUT", "/payment/configs/test-id",
                "更新支付配置",
                data=data.get("request_body", {}),
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 更新支付配置 (缺少测试数据)", "WARN")

    def test_delete_12(self):
        """测试: 删除支付配置"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/configs/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "DELETE", actual_path,
                "删除支付配置",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 删除支付配置 (没有可用的资源 ID)", "WARN")

    def test_get_13(self):
        """测试: 获取支付配置详情"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/configs/test-id".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "获取支付配置详情",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 获取支付配置详情 (没有可用的资源 ID)", "WARN")

    def test_post_14(self):
        """测试: 微信支付回调"""
        data = self.get_test_data("post_14")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/wechat",
                "微信支付回调",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 微信支付回调 (缺少测试数据)", "WARN")

    def test_post_15(self):
        """测试: 支付宝支付回调"""
        data = self.get_test_data("post_15")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "POST", "/payment/alipay",
                "支付宝支付回调",
                data=data.get("request_body", {}),
                expect_status=201,
                require_auth=True,
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: 支付宝支付回调 (缺少测试数据)", "WARN")

    def test_get_16(self):
        """测试: 查询支付订单的回调日志"""
        resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "/payment/orders/test-id/callback-logs".replace("test-id", resource_id).replace("{id}", resource_id)
            self.test_endpoint(
                "GET", actual_path,
                "查询支付订单的回调日志",
                expect_status=200,
                require_auth=True
            )
        else:
            self.log("⚠️  跳过测试: 查询支付订单的回调日志 (没有可用的资源 ID)", "WARN")

    def test_get_17(self):
        """测试: 查询所有支付回调日志"""
        self.test_endpoint(
        "GET", "/payment/callback-logs",
        "查询所有支付回调日志",
        expect_status=200,
        require_auth=True
    )


    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\n" + "="*60)
        print(f"PaymentOrder 模块 CRUD 测试")
        print("="*60 + "\n")

        # 1. 查询列表
        # 列表测试在索引 1
        if "test_get" in str(dir(self)):
            try:
                list_method = getattr(self, "test_get_0", None)
                if list_method:
                    list_method()
            except:
                pass

        # 2. 创建资源
        # 创建测试在索引 0
        if "test_post" in str(dir(self)):
            try:
                create_method = getattr(self, "test_post_0", None)
                if create_method:
                    create_method()
            except:
                pass

        # 3. 查询详情（使用创建的 ID）
        # 详情测试在索引 4
        if hasattr(self, 'test_get_1'):
            try:
                detail_method = getattr(self, "test_get_1", None)
                if detail_method:
                    # 替换路径中的 ID
                    resource_id = self.get_resource_id('payment_order')
                    if resource_id:
                        detail_method()
            except:
                pass

        # 4. 更新资源（使用创建的 ID）
        # 更新测试在索引 2
        if hasattr(self, 'test_patch_0'):
            try:
                update_method = getattr(self, "test_patch_0", None)
                if update_method:
                    resource_id = self.get_resource_id('payment_order')
                    if resource_id:
                        update_method()
            except:
                pass

        # 5. 删除资源（使用创建的 ID）
        # 删除测试在索引 3
        if hasattr(self, 'test_delete_0'):
            try:
                delete_method = getattr(self, "test_delete_0", None)
                if delete_method:
                    resource_id = self.get_resource_id('payment_order')
                    if resource_id:
                        delete_method()
            except:
                pass

        self.print_summary()

        # 清理资源
        # self.cleanup_resources()

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
