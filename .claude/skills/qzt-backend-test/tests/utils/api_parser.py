#!/usr/bin/env python3
"""
API文档解析工具
从Swagger文档中提取API端点信息并生成测试代码
"""

import json
import sys
from typing import Dict, List, Any
from collections import defaultdict


class APIParser:
    """API文档解析器"""

    def __init__(self, api_doc_path: str):
        self.api_doc_path = api_doc_path
        self.api_doc = None
        self.endpoints = defaultdict(list)

    def load_api_doc(self):
        """加载API文档"""
        with open(self.api_doc_path, 'r', encoding='utf-8') as f:
            self.api_doc = json.load(f)

    def parse_endpoints(self):
        """解析所有API端点"""
        if not self.api_doc:
            self.load_api_doc()

        paths = self.api_doc.get('paths', {})

        for path, methods in paths.items():
            for method, details in methods.items():
                if method.lower() in ['get', 'post', 'put', 'patch', 'delete']:
                    # 提取模块名
                    module = self._extract_module(path)
                    endpoint_info = {
                        'path': path,
                        'method': method.upper(),
                        'summary': details.get('summary', ''),
                        'description': details.get('description', ''),
                        'tags': details.get('tags', []),
                        'parameters': details.get('parameters', []),
                        'requestBody': details.get('requestBody', {}),
                        'responses': details.get('responses', {})
                    }
                    self.endpoints[module].append(endpoint_info)

        return self.endpoints

    def _extract_module(self, path: str) -> str:
        """从路径中提取模块名"""
        # 移除开头的斜杠
        path = path.lstrip('/')

        # 获取第一段路径作为模块名
        parts = path.split('/')
        if parts:
            module = parts[0]
            # 处理特殊路径
            if module in ['auth', 'users']:
                return 'auth'
            elif module in ['contracts']:
                return 'contract'
            elif module in ['invoices']:
                return 'invoice'
            elif module in ['payments']:
                return 'payment'
            elif module in ['follow-records']:
                return 'follow_record'
            elif module in ['service-teams']:
                return 'service_team'
            elif module in ['pricing', 'products']:
                return 'product'
            elif module in ['permissions', 'roles']:
                return 'permission'
            elif module in ['departments']:
                return 'department'
            elif module in ['contacts']:
                return 'contact'
            elif module in ['customers']:
                return 'customer'
            elif module in ['automation']:
                return 'automation'
            elif module in ['rules']:
                return 'rule_engine'
            elif module in ['statistics']:
                return 'statistics'
            elif module in ['system']:
                return 'system'
            elif module in ['logs']:
                return 'logs'
            elif module in ['oss']:
                return 'oss'
            elif module in ['webhook', 'webhooks']:
                return 'webhook'
            elif module in ['social-media']:
                return 'social_media'
            elif module in ['payment-orders', 'payment']:
                return 'payment_order'
            elif module in ['product-flows', 'product-packages']:
                return 'product'
            elif module in ['contract-templates']:
                return 'contract'
            else:
                return module

        return 'other'

    def generate_test_file(self, module: str, endpoints: List[Dict]) -> str:
        """为指定模块生成测试代码"""
        test_code = f'''#!/usr/bin/env python3
"""
{module.upper()} 模块 API 测试
自动生成于: {__import__('datetime').datetime.now().isoformat()}
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_base import TestBase


class {self._to_pascal_case(module)}Test(TestBase):
    """{module} 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "{module}"

'''

        # 为每个端点生成测试方法
        for idx, endpoint in enumerate(endpoints):
            method = endpoint['method']
            path = endpoint['path']
            summary = endpoint.get('summary', f'{method} {path}')
            description = endpoint.get('description', '')

            test_code += f'''
    def test_{method.lower()}_{idx}(self):
        """测试: {summary}"""
        {self._generate_test_method(endpoint, idx)}
'''

        test_code += f'''

    def run_all_tests(self):
        """运行所有测试"""
        print("\\n" + "="*60)
        print(f"{self._to_pascal_case(module)} 模块测试")
        print("="*60 + "\\n")

'''

        # 添加测试调用
        for idx, endpoint in enumerate(endpoints):
            test_code += f'        self.test_{endpoint["method"].lower()}_{idx}()\n'

        test_code += '''
        self.print_summary()
'''

        return test_code

    def _generate_test_method(self, endpoint: Dict, idx: int) -> str:
        """生成单个测试方法的代码"""
        path = endpoint['path']
        method = endpoint['method']
        summary = endpoint.get('summary', f'{method} {path}')

        # 检查是否需要认证
        auth_required = not path.startswith('/auth/login') and not path == '/health'

        # 替换路径参数
        test_path = path
        path_params = []
        for param in endpoint.get('parameters', []):
            if param.get('in') == 'path':
                param_name = param['name']
                path_params.append(param_name)
                test_path = test_path.replace(f'{{{param_name}}}', 'test-id')

        # 生成测试代码
        code = f'''self.test_endpoint(
            "{method}", "{test_path}",
            "{summary}",
            expect_status=200,
            require_auth={str(auth_required).lower()}
        )'''

        return code

    def _to_pascal_case(self, text: str) -> str:
        """转换为帕斯卡命名法"""
        # 处理特殊字符
        text = text.replace('_', ' ').replace('-', ' ')
        # 首字母大写每个单词
        return ''.join(word.capitalize() for word in text.split())

    def generate_all_test_files(self, output_dir: str):
        """为所有模块生成测试文件"""
        self.parse_endpoints()

        print(f"为 {len(self.endpoints)} 个模块生成测试文件...")

        for module, endpoints in self.endpoints.items():
            if not endpoints:
                continue

            test_code = self.generate_test_file(module, endpoints)
            filename = f"test_{module}.py"
            filepath = f"{output_dir}/{filename}"

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(test_code)

            print(f"✅ 生成: {filename} ({len(endpoints)} 个端点)")

        print(f"\\n📁 测试文件已保存到: {output_dir}")


def main():
    """主函数"""
    if len(sys.argv) < 3:
        print("用法: python api_parser.py <api-docs.json> <output-dir>")
        sys.exit(1)

    api_doc_path = sys.argv[1]
    output_dir = sys.argv[2]

    parser = APIParser(api_doc_path)
    parser.generate_all_test_files(output_dir)


if __name__ == "__main__":
    main()
