# 测试数据补充方案

## 问题背景

当前从 Swagger 自动生成的测试代码存在以下问题：

1. **缺少测试数据**：POST/PUT/PATCH 请求没有 request body
2. **路径参数硬编码**：所有路径参数都使用 `test-id`
3. **测试无法通过**：缺少必填字段导致 API 返回 400/500 错误

## 解决方案

### 方案架构

```
┌─────────────────┐
│ Swagger API 文档 │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   api_parser.py         │
│   (解析 Swagger)        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  test_data_generator.py │
│  (生成测试数据)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  test_data.json         │
│  (测试数据文件)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  test_*.py              │
│  (测试代码)             │
└─────────────────────────┘
```

### 实施步骤

#### 第一步：增强 Swagger 解析器

修改 `api_parser.py`，提取更多有用信息：

1. **提取 Schema 定义**
   ```python
   def extract_schemas(self):
       """提取所有 DTO schema 定义"""
       return self.api_doc.get('components', {}).get('schemas', {})
   ```

2. **解析请求体 Schema**
   ```python
   def get_request_schema(self, endpoint):
       """获取请求体的 schema 定义"""
       request_body = endpoint.get('requestBody', {})
       content = request_body.get('content', {})
       json_schema = content.get('application/json', {}).get('schema', {})
       return json_schema
   ```

3. **提取字段示例值**
   ```python
   def extract_field_examples(self, schema_name):
       """从 schema 中提取字段的 example 值"""
       schema = self.schemas.get(schema_name, {})
       examples = {}
       for prop_name, prop_schema in schema.get('properties', {}).items():
           if 'example' in prop_schema:
               examples[prop_name] = prop_schema['example']
       return examples
   ```

#### 第二步：完善测试数据生成器

`test_data_generator.py` 已经实现，功能包括：

1. **智能类型推断**
   - 根据字段类型生成合适的数据（string/number/boolean/array/object）
   - 根据 format 生成特殊格式（email/date-time/uri）

2. **语义识别**
   - 根据字段描述识别语义（姓名/电话/地址/公司等）
   - 生成符合语义的真实测试数据

3. **必填字段处理**
   - 优先生成 required 字段
   - 对于有 example 的字段，优先使用 example 值

4. **复杂数据结构**
   - 支持嵌套对象（object）
   - 支持数组（array）
   - 支持 $ref 引用

#### 第三步：生成测试数据文件

在生成测试代码时，同时生成测试数据文件：

```python
# api_parser.py 增加功能

def generate_test_data_file(self, module: str, endpoints: List[Dict]) -> Dict:
    """为模块生成测试数据"""

    generator = TestDataGenerator(self.api_doc_path)
    generator.load_api_doc()

    test_data = {}

    for idx, endpoint in enumerate(endpoints):
        method = endpoint['method']
        path = endpoint['path']

        # 为需要请求体的端点生成数据
        if method in ['POST', 'PUT', 'PATCH']:
            data = generator.generate_test_data_for_endpoint(endpoint)
            if data:
                test_data[f"{method.lower()}_{idx}"] = {
                    'method': method,
                    'path': path,
                    'summary': endpoint.get('summary', ''),
                    'request_body': data
                }

    return test_data

def save_test_data(self, module: str, test_data: Dict, output_dir: str):
    """保存测试数据到 JSON 文件"""
    filename = f"{output_dir}/data/test_{module}_data.json"
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)

    print(f"✅ 生成测试数据: {filename}")
```

#### 第四步：修改测试基类

修改 `test_base.py`，支持加载测试数据：

```python
class TestBase:
    def __init__(self, base_url: str = "http://localhost:7890"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.test_data = self._load_test_data()

    def _load_test_data(self) -> Dict:
        """加载测试数据文件"""
        module = self.__class__.__name__.replace('Test', '').lower()
        data_file = os.path.join(
            os.path.dirname(__file__),
            f'../data/test_{module}_data.json'
        )

        if os.path.exists(data_file):
            with open(data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def get_test_data(self, test_name: str) -> Dict:
        """获取指定测试的数据"""
        return self.test_data.get(test_name, {})
```

#### 第五步：增强测试代码生成

修改 `api_parser.py` 的 `_generate_test_method`，使用测试数据：

```python
def _generate_test_method(self, endpoint: Dict, idx: int) -> str:
    """生成单个测试方法的代码"""

    # ... 原有代码 ...

    # 检查是否需要请求体
    if method in ['POST', 'PUT', 'PATCH']:
        code = f'''data = self.get_test_data("{method.lower()}_{idx}")
if data:
    self.test_endpoint(
        "{method}", "{test_path}",
        "{summary}",
        json=data.get("request_body", {{}}),
        expect_status=200 if "{method}" == "POST" else 201,
        require_auth={str(auth_required)}
    )
else:
    # 跳过没有测试数据的接口
    self.log("⚠️  跳过测试: {summary} (缺少测试数据)", "WARN")'''
    else:
        # GET/DELETE 请求
        code = f'''self.test_endpoint(
            "{method}", "{test_path}",
            "{summary}",
            expect_status=200,
            require_auth={str(auth_required)}
        )'''

    return code
```

## 优势

1. **自动化**：完全基于 Swagger 自动生成，无需手动编写
2. **可维护**：API 变更后重新生成即可
3. **真实数据**：生成的数据符合业务语义，测试更可靠
4. **可扩展**：可以继续优化生成规则，提高数据质量
5. **分离关注点**：测试代码和测试数据分离，便于管理

## 实施优先级

### 阶段一：核心功能（已完成）
- ✅ 创建 `test_data_generator.py`
- ✅ 实现基础的类型和语义识别
- ✅ 验证数据生成功能

### 阶段二：集成到生成流程（待实施）
1. 修改 `api_parser.py`，生成测试数据文件
2. 修改 `test_base.py`，支持加载测试数据
3. 增强测试代码生成逻辑

### 阶段三：优化和完善（待实施）
1. 添加更多语义识别规则
2. 支持自定义测试数据模板
3. 添加数据验证逻辑
4. 生成更复杂的关系数据（如关联 ID）

## 使用方式

### 生成测试和数据

```bash
cd tests/utils
python3 api_parser.py /tmp/qzt-api-docs.json ../modules/
# 输出:
#   modules/test_*.py (测试代码)
#   data/test_*_data.json (测试数据)
```

### 运行测试

```bash
python3 run_all_tests.py
```

## 示例

### 生成的测试数据 (data/test_customer_data.json)

```json
{
  "post_7": {
    "method": "POST",
    "path": "/customers",
    "summary": "创建客户",
    "request_body": {
      "name": "测试北京科技有限公司",
      "code": "TEST001",
      "industry": "互联网",
      "scale": "11-50人",
      "address": "北京市朝阳区测试路123号",
      "website": "https://www.test1234.com",
      "customerLevel": 1
    }
  }
}
```

### 生成的测试代码 (modules/test_customer.py)

```python
def test_post_7(self):
    """测试: 创建客户"""
    data = self.get_test_data("post_7")
    if data:
        self.test_endpoint(
            "POST", "/customers",
            "创建客户",
            json=data.get("request_body", {}),
            expect_status=201,
            require_auth=True
        )
    else:
        self.log("⚠️  跳过测试: 创建客户 (缺少测试数据)", "WARN")
```

## 后续优化方向

1. **关系数据管理**
   - 自动保存创建的资源 ID
   - 在后续测试中复用这些 ID
   - 实现测试数据的依赖管理

2. **数据清理**
   - 测试结束后自动清理创建的数据
   - 支持清理策略配置

3. **数据变体**
   - 为同一个接口生成多组测试数据
   - 测试边界条件和异常情况

4. **智能推断**
   - 从现有数据库中提取真实数据作为模板
   - 学习常用字段的组合模式
