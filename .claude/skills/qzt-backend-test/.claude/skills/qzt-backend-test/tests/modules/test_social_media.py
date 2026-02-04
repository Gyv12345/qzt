#!/usr/bin/env python3
"""SOCIAL_MEDIA 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class SocialMediaTest(TestBase):
    """social_media 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "social_media"
    
    def test_0(self):
        """创建新媒体账号"""
        self.test_endpoint("POST", "/social-media/accounts", "创建新媒体账号")
    
    def test_1(self):
        """获取新媒体账号列表"""
        self.test_endpoint("GET", "/social-media/accounts", "获取新媒体账号列表")
    
    def test_2(self):
        """更新新媒体账号"""
        self.test_endpoint("PUT", "/social-media/accounts/test-id", "更新新媒体账号")
    
    def test_3(self):
        """删除新媒体账号"""
        self.test_endpoint("DELETE", "/social-media/accounts/test-id", "删除新媒体账号")
    
    def test_4(self):
        """获取新媒体账号详情"""
        self.test_endpoint("GET", "/social-media/accounts/test-id", "获取新媒体账号详情")
    
    def test_5(self):
        """刷新访问令牌"""
        self.test_endpoint("POST", "/social-media/accounts/refresh-token", "刷新访问令牌")
    
    def test_6(self):
        """验证账号有效性"""
        self.test_endpoint("GET", "/social-media/accounts/test-id/validate", "验证账号有效性")
    
    def test_7(self):
        """创建新媒体内容"""
        self.test_endpoint("POST", "/social-media/posts", "创建新媒体内容")
    
    def test_8(self):
        """获取新媒体内容列表"""
        self.test_endpoint("GET", "/social-media/posts", "获取新媒体内容列表")
    
    def test_9(self):
        """更新新媒体内容"""
        self.test_endpoint("PUT", "/social-media/posts/test-id", "更新新媒体内容")
    
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
