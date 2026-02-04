#!/usr/bin/env python3
"""SERVICE_TEAMS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ServiceTeamsTest(TestBase):
    """service_teams 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "service_teams"
    
    def test_0(self):
        """添加服务团队成员"""
        self.test_endpoint("POST", "/service-teams", "添加服务团队成员")
    
    def test_1(self):
        """获取服务团队列表"""
        self.test_endpoint("GET", "/service-teams", "获取服务团队列表")
    
    def test_2(self):
        """获取客户的服务团队(按角色分组)"""
        self.test_endpoint("GET", "/service-teams/customer/{customerId}/grouped", "获取客户的服务团队(按角色分组)")
    
    def test_3(self):
        """获取服务团队成员详情"""
        self.test_endpoint("GET", "/service-teams/test-id", "获取服务团队成员详情")
    
    def test_4(self):
        """更新服务团队成员"""
        self.test_endpoint("PATCH", "/service-teams/test-id", "更新服务团队成员")
    
    def test_5(self):
        """删除服务团队成员"""
        self.test_endpoint("DELETE", "/service-teams/test-id", "删除服务团队成员")
    
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
