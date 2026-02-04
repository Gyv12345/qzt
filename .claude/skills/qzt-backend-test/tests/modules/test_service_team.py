#!/usr/bin/env python3
"""
SERVICE_TEAM 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988134
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class ServiceTeamTest(TestBase):
    """service_team 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "service_team"


    def test_post_0(self):
        """测试: 添加服务团队成员"""
        self.test_endpoint(
            "POST", "/service-teams",
            "添加服务团队成员",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取服务团队列表"""
        self.test_endpoint(
            "GET", "/service-teams",
            "获取服务团队列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取客户的服务团队(按角色分组)"""
        self.test_endpoint(
            "GET", "/service-teams/customer/test-id/grouped",
            "获取客户的服务团队(按角色分组)",
            expect_status=200,
            require_auth=true
        )

    def test_get_3(self):
        """测试: 获取服务团队成员详情"""
        self.test_endpoint(
            "GET", "/service-teams/test-id",
            "获取服务团队成员详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_4(self):
        """测试: 更新服务团队成员"""
        self.test_endpoint(
            "PATCH", "/service-teams/test-id",
            "更新服务团队成员",
            expect_status=200,
            require_auth=true
        )

    def test_delete_5(self):
        """测试: 删除服务团队成员"""
        self.test_endpoint(
            "DELETE", "/service-teams/test-id",
            "删除服务团队成员",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"ServiceTeam 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_get_3()
        self.test_patch_4()
        self.test_delete_5()

        self.print_summary()
