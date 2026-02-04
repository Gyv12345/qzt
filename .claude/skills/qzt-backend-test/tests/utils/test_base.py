#!/usr/bin/env python3
"""
测试基类
提供通用的测试方法和工具
"""

import requests
import json
import random
import string
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import sys
import os


class TestBase:
    """测试基类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.test_results: List[Dict[str, Any]] = []
        self.passed = 0
        self.failed = 0
        self.module = "test"

        # 存储测试创建的资源ID
        self.created_resource_ids: Dict[str, List[str]] = {}

        # 加载测试数据
        self.test_data = self._load_test_data()

    def log(self, message: str, status: str = "INFO"):
        """记录测试日志"""
        icons = {
            "PASS": "✅",
            "FAIL": "❌",
            "INFO": "ℹ️",
            "WARN": "⚠️",
            "START": "🚀"
        }
        icon = icons.get(status, "•")
        print(f"{icon} {message}")

        if status in ["PASS", "FAIL"]:
            self.test_results.append({
                "test": message,
                "status": status,
                "timestamp": datetime.now().isoformat()
            })
            if status == "PASS":
                self.passed += 1
            else:
                self.failed += 1

    def check_server(self) -> bool:
        """检查后端服务是否运行"""
        self.log("检查后端服务状态", "START")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log(f"后端服务运行正常: {self.base_url}", "PASS")
                return True
            else:
                self.log(f"后端服务响应异常: HTTP {response.status_code}", "FAIL")
                return False
        except requests.exceptions.ConnectionError:
            self.log(f"无法连接到后端服务: {self.base_url}", "FAIL")
            return False
        except Exception as e:
            self.log(f"后端服务检查失败: {str(e)}", "FAIL")
            return False

    def login(self, username: str = "admin", password: str = "admin123") -> bool:
        """用户登录"""
        self.log(f"测试用户登录: {username}", "START")
        try:
            payload = {"username": username, "password": password}
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                timeout=10
            )

            if response.status_code in [200, 201]:
                result = response.json()
                data = result.get('data', {})
                self.token = data.get('access_token')
                if self.token:
                    self.log("登录成功，已获取 token", "PASS")
                    return True
                else:
                    self.log("登录响应中缺少 token", "FAIL")
                    return False
            else:
                self.log(f"登录失败: HTTP {response.status_code}", "FAIL")
                return False
        except Exception as e:
            self.log(f"登录测试异常: {str(e)}", "FAIL")
            return False

    def test_endpoint(
        self,
        method: str,
        path: str,
        description: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        expect_status: int = 200,
        require_auth: bool = True,
        return_response: bool = False
    ) -> Tuple[bool, Optional[Dict]]:
        """测试单个 API 端点"""
        self.log(f"测试: {description}", "START")

        if require_auth and not self.token:
            self.log("需要认证但未登录，跳过测试", "WARN")
            return False, None

        try:
            headers = {}
            if require_auth:
                headers["Authorization"] = f"Bearer {self.token}"

            url = f"{self.base_url}{path}"
            response = requests.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=10
            )

            if response.status_code == expect_status:
                self.log(f"{description} - 成功", "PASS")
                if return_response:
                    try:
                        return True, response.json()
                    except:
                        return True, {"data": response.text}
                return True, None
            else:
                self.log(
                    f"{description} - 失败: 期望 {expect_status}, 实际 {response.status_code}",
                    "FAIL"
                )
                return False, None

        except Exception as e:
            self.log(f"{description} - 异常: {str(e)}", "FAIL")
            return False, None

    def generate_random_string(self, length: int = 8) -> str:
        """生成随机字符串"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def _load_test_data(self) -> Dict:
        """加载测试数据文件"""
        # 获取模块名（从类名中提取）
        class_name = self.__class__.__name__
        # 将 CustomerTest 转换为 customer
        module = class_name.replace('Test', '').lower().replace('crud', '')
        if module == 'test':
            module = self.module

        # 查找测试数据文件 - 使用绝对路径
        # 获取 tests 目录的绝对路径
        current_file = os.path.abspath(__file__)
        utils_dir = os.path.dirname(current_file)
        tests_dir = os.path.dirname(utils_dir)
        data_file = os.path.join(tests_dir, f'data/test_{module}_data.json')

        if os.path.exists(data_file):
            try:
                with open(data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    print(f"ℹ️  已加载测试数据: {os.path.basename(data_file)}")
                    return data
            except Exception as e:
                print(f"⚠️  加载测试数据失败: {e}")

        return {}

    def get_test_data(self, test_name: str) -> Dict:
        """获取指定测试的数据"""
        return self.test_data.get(test_name, {})

    def save_resource_id(self, resource_type: str, resource_id: str):
        """保存创建的资源 ID"""
        if resource_type not in self.created_resource_ids:
            self.created_resource_ids[resource_type] = []
        self.created_resource_ids[resource_type].append(resource_id)
        self.log(f"保存资源 ID: {resource_type} = {resource_id}", "INFO")

    def get_resource_id(self, resource_type: str, index: int = 0) -> Optional[str]:
        """获取保存的资源 ID"""
        if resource_type in self.created_resource_ids:
            ids = self.created_resource_ids[resource_type]
            if 0 <= index < len(ids):
                return ids[index]
        return None

    def replace_path_ids(self, path: str, resource_type: str) -> str:
        """替换路径中的 ID 占位符"""
        resource_id = self.get_resource_id(resource_type)
        if resource_id:
            return path.replace('{id}', resource_id).replace('test-id', resource_id)
        return path

    def create_with_data(self, method: str, path: str, description: str,
                        data: Dict, expect_status: int = 201,
                        require_auth: bool = True, resource_type: str = None) -> Tuple[bool, Optional[str]]:
        """创建资源并保存 ID"""
        success, response = self.test_endpoint(
            method, path, description,
            data=data,
            expect_status=expect_status,
            require_auth=require_auth,
            return_response=True
        )

        if success and response and resource_type:
            # 尝试从响应中提取 ID
            if 'data' in response:
                resource_data = response['data']
                if isinstance(resource_data, dict):
                    resource_id = resource_data.get('id')
                    if resource_id:
                        self.save_resource_id(resource_type, resource_id)

        if not success and response:
            # 打印错误响应
            if isinstance(response, dict):
                error_msg = response.get('message', str(response))
                self.log(f"服务器响应: {error_msg}", "WARN")

        return success, response

    def cleanup_resources(self):
        """清理测试创建的所有资源"""
        self.log("开始清理测试资源...", "START")

        for resource_type, ids in self.created_resource_ids.items():
            for resource_id in ids:
                try:
                    # 根据资源类型构造删除路径
                    if resource_type == 'customer':
                        delete_path = f"/customers/{resource_id}"
                    elif resource_type == 'contact':
                        delete_path = f"/contacts/{resource_id}"
                    elif resource_type == 'product':
                        delete_path = f"/products/{resource_id}"
                    elif resource_type == 'department':
                        delete_path = f"/departments/{resource_id}"
                    elif resource_type == 'contract':
                        delete_path = f"/contracts/{resource_id}"
                    else:
                        delete_path = f"/{resource_type}s/{resource_id}"

                    self.test_endpoint(
                        "DELETE", delete_path,
                        f"清理 {resource_type}: {resource_id}",
                        expect_status=200,
                        require_auth=True
                    )
                except Exception as e:
                    self.log(f"清理资源失败: {e}", "WARN")

        self.log("资源清理完成", "INFO")

    def generate_random_phone(self) -> str:
        """生成有效的中国手机号"""
        return f"1{random.randint(3, 9)}{random.randint(100000000, 999999999)}"

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print(f"{self.module.upper()} 模块测试摘要")
        print("="*60)
        total = self.passed + self.failed
        print(f"总计: {total} 个测试")
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        if total > 0:
            print(f"通过率: {self.passed / total * 100:.1f}%")
        print("="*60 + "\n")
