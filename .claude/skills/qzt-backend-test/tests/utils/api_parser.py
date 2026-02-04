#!/usr/bin/env python3
"""
API文档解析工具
从Swagger文档中提取API端点信息并生成测试代码
"""

import json
import sys
import os
from typing import Dict, List, Any
from collections import defaultdict
from test_data_generator import TestDataGenerator


class APIParser:
    """API文档解析器"""

    def __init__(self, api_doc_path: str):
        self.api_doc_path = api_doc_path
        self.api_doc = None
        self.endpoints = defaultdict(list)
        self.data_generator = TestDataGenerator(api_doc_path)

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

    def run_crud_tests(self):
        """运行完整的 CRUD 测试流程"""
        print("\\n" + "="*60)
        print(f"{self._to_pascal_case(module)} 模块 CRUD 测试")
        print("="*60 + "\\n")

        # 1. 查询列表
        {self._get_list_test_index(endpoints)}
        if "test_get" in str(dir(self)):
            try:
                list_method = getattr(self, "test_get_0", None)
                if list_method:
                    list_method()
            except:
                pass

        # 2. 创建资源
        {self._get_create_test_index(endpoints)}
        if "test_post" in str(dir(self)):
            try:
                create_method = getattr(self, "test_post_0", None)
                if create_method:
                    create_method()
            except:
                pass

        # 3. 查询详情（使用创建的 ID）
        {self._get_detail_test_index(endpoints)}
        if hasattr(self, 'test_get_1'):
            try:
                detail_method = getattr(self, "test_get_1", None)
                if detail_method:
                    # 替换路径中的 ID
                    resource_id = self.get_resource_id('{module}')
                    if resource_id:
                        detail_method()
            except:
                pass

        # 4. 更新资源（使用创建的 ID）
        {self._get_update_test_index(endpoints)}
        if hasattr(self, 'test_patch_0'):
            try:
                update_method = getattr(self, "test_patch_0", None)
                if update_method:
                    resource_id = self.get_resource_id('{module}')
                    if resource_id:
                        update_method()
            except:
                pass

        # 5. 删除资源（使用创建的 ID）
        {self._get_delete_test_index(endpoints)}
        if hasattr(self, 'test_delete_0'):
            try:
                delete_method = getattr(self, "test_delete_0", None)
                if delete_method:
                    resource_id = self.get_resource_id('{module}')
                    if resource_id:
                        delete_method()
            except:
                pass

        self.print_summary()

        # 清理资源
        # self.cleanup_resources()

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

    def _get_list_test_index(self, endpoints: List[Dict]) -> str:
        """获取列表测试的索引"""
        for idx, ep in enumerate(endpoints):
            if ep['method'] == 'GET' and '{id}' not in ep['path'] and 'test-id' not in ep['path']:
                return f"# 列表测试在索引 {idx}"
        return "# 无列表测试"

    def _get_create_test_index(self, endpoints: List[Dict]) -> str:
        """获取创建测试的索引"""
        for idx, ep in enumerate(endpoints):
            if ep['method'] == 'POST':
                path = ep['path'].replace('/{id}', '').replace('/test-id', '')
                if '/' in path and path.count('/') <= 2:  # 简单判断是否为创建操作
                    return f"# 创建测试在索引 {idx}"
        return "# 无创建测试"

    def _get_detail_test_index(self, endpoints: List[Dict]) -> str:
        """获取详情测试的索引"""
        for idx, ep in enumerate(endpoints):
            if ep['method'] == 'GET' and ('{id}' in ep['path'] or 'test-id' in ep['path']):
                return f"# 详情测试在索引 {idx}"
        return "# 无详情测试"

    def _get_update_test_index(self, endpoints: List[Dict]) -> str:
        """获取更新测试的索引"""
        for idx, ep in enumerate(endpoints):
            if ep['method'] in ['PATCH', 'PUT']:
                return f"# 更新测试在索引 {idx}"
        return "# 无更新测试"

    def _get_delete_test_index(self, endpoints: List[Dict]) -> str:
        """获取删除测试的索引"""
        for idx, ep in enumerate(endpoints):
            if ep['method'] == 'DELETE':
                return f"# 删除测试在索引 {idx}"
        return "# 无删除测试"

    def _generate_test_method(self, endpoint: Dict, idx: int) -> str:
        """生成单个测试方法的代码"""
        path = endpoint['path']
        method = endpoint['method']
        summary = endpoint.get('summary', f'{method} {path}')

        # 检查是否需要认证
        auth_required = not path.startswith('/auth/login') and not path == '/health'

        # 判断是否为创建操作
        is_create = (
            method == 'POST' and
            '{id}' not in path and
            'test-id' not in path and
            not any(p in path for p in ['/contacts', '/link', '/assign', '/batch'])
        )

        # 替换路径参数
        test_path = path
        path_params = []
        for param in endpoint.get('parameters', []):
            if param.get('in') == 'path':
                param_name = param['name']
                path_params.append(param_name)
                test_path = test_path.replace(f'{{{param_name}}}', 'test-id')

        # 根据请求类型生成不同的测试代码
        if method in ['POST', 'PUT', 'PATCH']:
            # 需要 request body 的请求
            if is_create:
                # 创建操作 - 需要保存资源 ID
                code = f'''data = self.get_test_data("{method.lower()}_{idx}")
        if data and data.get("request_body"):
            success, response = self.create_with_data(
                "{method}", "{test_path}",
                "{summary}",
                data=data.get("request_body", {{}}),
                expect_status={self._get_expected_status(method)},
                require_auth={str(auth_required)},
                resource_type=self.module
            )
        else:
            self.log("⚠️  跳过测试: {summary} (缺少测试数据)", "WARN")'''
            else:
                # 其他 POST/PUT/PATCH 操作
                code = f'''data = self.get_test_data("{method.lower()}_{idx}")
        if data and data.get("request_body"):
            self.test_endpoint(
                "{method}", "{test_path}",
                "{summary}",
                data=data.get("request_body", {{}}),
                expect_status={self._get_expected_status(method)},
                require_auth={str(auth_required)}
            )
        else:
            self.log("⚠️  跳过测试: {summary} (缺少测试数据)", "WARN")'''
        else:
            # GET/DELETE 请求
            has_id_param = '{id}' in test_path or 'test-id' in test_path
            if has_id_param:
                # 需要替换 ID 的请求
                code = f'''resource_id = self.get_resource_id(self.module)
        if resource_id:
            actual_path = "{test_path}".replace("test-id", resource_id).replace("{{id}}", resource_id)
            self.test_endpoint(
                "{method}", actual_path,
                "{summary}",
                expect_status=200,
                require_auth={str(auth_required)}
            )
        else:
            self.log("⚠️  跳过测试: {summary} (没有可用的资源 ID)", "WARN")'''
            else:
                # 普通请求
                code = f'''self.test_endpoint(
        "{method}", "{test_path}",
        "{summary}",
        expect_status=200,
        require_auth={str(auth_required)}
    )'''

        return code

    def _get_expected_status(self, method: str) -> str:
        """根据方法返回期望的状态码"""
        if method == 'POST':
            return '201'
        else:
            return '200'

    def _to_pascal_case(self, text: str) -> str:
        """转换为帕斯卡命名法"""
        # 处理特殊字符
        text = text.replace('_', ' ').replace('-', ' ')
        # 首字母大写每个单词
        return ''.join(word.capitalize() for word in text.split())

    def generate_test_data_file(self, module: str, endpoints: List[Dict]) -> Dict:
        """为模块生成测试数据"""
        self.data_generator.load_api_doc()
        test_data = {}

        for idx, endpoint in enumerate(endpoints):
            method = endpoint['method']
            path = endpoint['path']
            summary = endpoint.get('summary', f'{method} {path}')

            # 只为需要请求体的端点生成数据
            if method in ['POST', 'PUT', 'PATCH']:
                data = self.data_generator.generate_test_data_for_endpoint(endpoint)
                if data:
                    test_data[f"{method.lower()}_{idx}"] = {
                        'method': method,
                        'path': path,
                        'summary': summary,
                        'request_body': data
                    }

        return test_data

    def save_test_data(self, module: str, test_data: Dict, output_dir: str):
        """保存测试数据到 JSON 文件"""
        if not test_data:
            return

        # 创建 data 目录
        data_dir = os.path.join(output_dir, '../data')
        os.makedirs(data_dir, exist_ok=True)

        filename = f"{data_dir}/test_{module}_data.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(test_data, f, ensure_ascii=False, indent=2)

        print(f"✅ 生成测试数据: test_{module}_data.json ({len(test_data)} 个数据集)")

    def generate_all_test_files(self, output_dir: str):
        """为所有模块生成测试文件"""
        self.parse_endpoints()

        print(f"为 {len(self.endpoints)} 个模块生成测试文件...")

        for module, endpoints in self.endpoints.items():
            if not endpoints:
                continue

            # 生成测试代码
            test_code = self.generate_test_file(module, endpoints)
            filename = f"test_{module}.py"
            filepath = f"{output_dir}/{filename}"

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(test_code)

            print(f"✅ 生成: {filename} ({len(endpoints)} 个端点)")

            # 生成测试数据
            test_data = self.generate_test_data_file(module, endpoints)
            if test_data:
                self.save_test_data(module, test_data, output_dir)

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
