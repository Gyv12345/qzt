#!/usr/bin/env python3
"""
测试数据生成器
从 Swagger schema 生成测试数据
"""

import json
import random
import string
from typing import Dict, Any, List
from datetime import datetime, timedelta


class TestDataGenerator:
    """测试数据生成器"""

    def __init__(self, api_doc_path: str):
        self.api_doc_path = api_doc_path
        self.api_doc = None
        self.schemas = None

    def load_api_doc(self):
        """加载 API 文档"""
        with open(self.api_doc_path, 'r', encoding='utf-8') as f:
            self.api_doc = json.load(f)
        self.schemas = self.api_doc.get('components', {}).get('schemas', {})

    def generate_test_data_by_schema(self, schema_name: str) -> Dict[str, Any]:
        """根据 schema 名称生成测试数据"""
        if not self.schemas:
            self.load_api_doc()

        if schema_name not in self.schemas:
            print(f"⚠️  Schema {schema_name} 不存在")
            return {}

        schema = self.schemas[schema_name]
        return self._generate_data_from_schema(schema)

    def _generate_data_from_schema(self, schema: Dict[str, Any]) -> Any:
        """递归生成测试数据"""
        # 处理 $ref
        if '$ref' in schema:
            ref_path = schema['$ref']
            # 从 #/components/schemas/SchemaName 中提取 schema 名称
            schema_name = ref_path.split('/')[-1]
            return self.generate_test_data_by_schema(schema_name)

        # 处理类型
        schema_type = schema.get('type')

        if schema_type == 'object':
            return self._generate_object(schema)
        elif schema_type == 'array':
            return self._generate_array(schema)
        elif schema_type == 'string':
            return self._generate_string(schema)
        elif schema_type == 'number' or schema_type == 'integer':
            return self._generate_number(schema)
        elif schema_type == 'boolean':
            return self._generate_boolean(schema)
        else:
            return None

    def _generate_object(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """生成对象"""
        properties = schema.get('properties', {})
        required = schema.get('required', [])

        result = {}
        for prop_name, prop_schema in properties.items():
            # 只生成必填字段，或者有 example 的字段
            is_required = prop_name in required
            has_example = 'example' in prop_schema

            if is_required or has_example or random.random() > 0.5:
                # 如果有 example，优先使用
                if 'example' in prop_schema:
                    result[prop_name] = prop_schema['example']
                elif 'default' in prop_schema:
                    result[prop_name] = prop_schema['default']
                else:
                    result[prop_name] = self._generate_data_from_schema(prop_schema)

        return result

    def _generate_array(self, schema: Dict[str, Any]) -> List[Any]:
        """生成数组"""
        items_schema = schema.get('items', {})
        # 生成 1-3 个元素
        count = random.randint(1, 3)
        return [self._generate_data_from_schema(items_schema) for _ in range(count)]

    def _generate_string(self, schema: Dict[str, Any]) -> str:
        """生成字符串"""
        # 如果有 format，根据 format 生成
        format_type = schema.get('format', '')

        if format_type == 'email':
            return f"test{random.randint(1000, 9999)}@example.com"
        elif format_type == 'date-time':
            return (datetime.now() + timedelta(days=random.randint(-30, 30))).isoformat()
        elif format_type == 'date':
            return (datetime.now() + timedelta(days=random.randint(-30, 30))).strftime('%Y-%m-%d')
        elif format_type == 'uri':
            return f"https://example.com/{random.randint(1000, 9999)}"

        # 如果有枚举值
        if 'enum' in schema:
            return random.choice(schema['enum'])

        # 根据字段名和描述生成合适的值
        field_name = schema.get('x-field-name', '')  # 有些规范会包含字段名
        description = schema.get('description', '').lower()

        if '电话' in description or '手机' in description or 'phone' in description or 'tel' in description:
            return f"138{random.randint(10000000, 99999999)}"
        elif '邮箱' in description or 'email' in description:
            return f"test{random.randint(1000, 9999)}@example.com"
        elif '姓名' in description or 'name' in description:
            return random.choice(['张三', '李四', '王五', '赵六', '测试用户'])
        elif '公司' in description or 'company' in description:
            suffixes = ['科技有限公司', '网络科技有限公司', '信息技术有限公司', '商贸有限公司']
            return f"测试{random.choice(['北京', '上海', '深圳', '广州'])}{random.choice(suffixes)}"
        elif '地址' in description or 'address' in description:
            return f"北京市朝阳区测试路{random.randint(1, 999)}号"
        elif '网站' in description or 'website' in description or 'url' in description:
            return f"https://www.test{random.randint(1000, 9999)}.com"
        elif '编码' in description or 'code' in description:
            return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        elif '行业' in description or 'industry' in description:
            industries = ['互联网', '金融', '教育', '医疗', '制造业', '服务业', '零售']
            return random.choice(industries)
        elif '部门' in description or 'department' in description:
            return '测试部门'
        elif '职位' in description or 'position' in description:
            positions = ['经理', '主管', '总监', '专员', '助理']
            return random.choice(positions)

        # 默认生成随机字符串
        max_length = schema.get('maxLength', 20)
        min_length = schema.get('minLength', 5)
        length = random.randint(min_length, min(max_length, 20))
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

    def _generate_number(self, schema: Dict[str, Any]) -> int | float:
        """生成数字"""
        # 如果有枚举值
        if 'enum' in schema:
            return random.choice(schema['enum'])

        # 如果有默认值
        if 'default' in schema:
            return schema['default']

        # 根据描述生成合适的值
        description = schema.get('description', '').lower()

        if '等级' in description or 'level' in description:
            return random.randint(0, 3)
        elif '金额' in description or 'price' in description or 'amount' in description:
            return round(random.uniform(100, 10000), 2)
        elif '数量' in description or 'quantity' in description or 'count' in description:
            return random.randint(1, 100)

        # 根据类型生成
        if schema.get('type') == 'integer':
            minimum = schema.get('minimum', 0)
            maximum = schema.get('maximum', 100)
            return random.randint(minimum, maximum)
        else:
            minimum = schema.get('minimum', 0)
            maximum = schema.get('maximum', 100)
            return round(random.uniform(minimum, maximum), 2)

    def _generate_boolean(self, schema: Dict[str, Any]) -> bool:
        """生成布尔值"""
        if 'default' in schema:
            return schema['default']
        return random.choice([True, False])

    def generate_test_data_for_endpoint(self, endpoint: Dict[str, Any]) -> Dict[str, Any]:
        """为端点生成测试数据"""
        method = endpoint.get('method', '')
        request_body = endpoint.get('requestBody', {})

        # 只有 POST、PUT、PATCH 需要请求体
        if method not in ['POST', 'PUT', 'PATCH']:
            return {}

        if not request_body:
            return {}

        # 获取 content
        content = request_body.get('content', {})
        json_content = content.get('application/json', {})
        schema = json_content.get('schema', {})

        if not schema:
            return {}

        # 生成测试数据
        return self._generate_data_from_schema(schema)


# 测试代码
if __name__ == "__main__":
    generator = TestDataGenerator("/tmp/qzt-api-docs.json")
    generator.load_api_doc()

    # 测试生成客户数据
    print("=" * 60)
    print("测试：生成客户创建数据")
    print("=" * 60)
    customer_data = generator.generate_test_data_by_schema("CreateCustomerDto")
    print(json.dumps(customer_data, ensure_ascii=False, indent=2))

    print("\n" + "=" * 60)
    print("测试：生成联系人创建数据")
    print("=" * 60)
    contact_data = generator.generate_test_data_by_schema("CreateContactDto")
    print(json.dumps(contact_data, ensure_ascii=False, indent=2))

    print("\n" + "=" * 60)
    print("测试：生成产品创建数据")
    print("=" * 60)
    product_data = generator.generate_test_data_by_schema("CreateProductDto")
    print(json.dumps(product_data, ensure_ascii=False, indent=2))
