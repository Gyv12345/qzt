/**
 * 记账通项目综合测试脚本
 *
 * 测试所有核心功能API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:7890';
let token = '';
let testResults = [];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
  testResults.push({ name: message, status: 'success' });
}

function logError(message, error) {
  log(`❌ ${message}: ${error.message || error}`, 'red');
  testResults.push({ name: message, status: 'error', error });
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'yellow');
  console.log('='.repeat(60));
}

// 辅助函数: 延迟
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1. 测试基础功能
async function testBasicFeatures() {
  logSection('测试基础功能');

  try {
    // 1.1 初始化超级管理员
    logInfo('初始化超级管理员...');
    const initResult = await axios.post(`${API_BASE}/permissions/initialize-super-admin`);
    logSuccess('超级管理员初始化成功');

    // 1.2 登录
    logInfo('登录测试...');
    const loginResult = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    token = loginResult.data.access_token;
    logSuccess('登录成功');

    // 1.3 查询用户信息
    logInfo('查询当前用户信息...');
    const userResult = await axios.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取用户信息: ${userResult.data.name}`);

    // 1.4 查询客户列表
    logInfo('查询客户列表...');
    const customersResult = await axios.get(`${API_BASE}/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`查询到 ${customersResult.data.total || 0} 个客户`);

    // 1.5 创建测试客户
    logInfo('创建测试客户...');
    const createCustomerResult = await axios.post(
      `${API_BASE}/customers`,
      {
        name: '测试公司A',
        contactName: '张三',
        contactPhone: '13800138000',
        contactEmail: 'test@example.com',
        companyName: '测试公司A',
        customerLevel: 2,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logSuccess(`创建客户成功: ${createCustomerResult.data.name}`);
    return createCustomerResult.data;
  } catch (error) {
    if (error.response?.status === 401) {
      logError('登录失败', '用户名或密码错误');
    } else {
      logError('基础功能测试失败', error);
    }
    return null;
  }
}

// 2. 测试阶梯定价功能
async function testPricingFeatures(customer) {
  logSection('测试阶梯定价功能');

  try {
    // 2.1 创建测试产品
    logInfo('创建测试产品...');
    const productResult = await axios.post(
      `${API_BASE}/products`,
      {
        name: '年度代理记账',
        code: 'ANNUAL_2025',
        description: '2025年度代理记账服务',
        price: 1200,
        pricingType: 'TIER_AMOUNT',
        invoiceLimit: 200000,
        invoiceCount: 20,
        overLimitPrice: 300,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const product = productResult.data;
    logSuccess(`创建产品成功: ${product.name}`);

    // 2.2 创建定价规则
    logInfo('创建阶梯定价规则...');
    const ruleResult = await axios.post(
      `${API_BASE}/pricing/rules`,
      {
        productId: product.id,
        name: '按金额阶梯定价',
        ruleType: 'AMOUNT_TIER',
        tiers: [
          {
            minThreshold: 0,
            maxThreshold: 200000,
            price: 1200,
            additionalPrice: 0,
            description: '0-20万:1200元',
            order: 1,
          },
          {
            minThreshold: 200000,
            maxThreshold: 500000,
            price: 1500,
            additionalPrice: 300,
            description: '20-50万:1500元',
            order: 2,
          },
          {
            minThreshold: 500000,
            price: 2000,
            additionalPrice: 800,
            description: '50万以上:2000元',
            order: 3,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logSuccess('创建定价规则成功');

    // 2.3 创建合同
    logInfo('创建测试合同...');
    const contractResult = await axios.post(
      `${API_BASE}/contracts`,
      {
        customerId: customer.id,
        productId: product.id,
        amount: 1200,
        serviceStart: new Date().toISOString(),
        serviceEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const contract = contractResult.data;
    logSuccess(`创建合同成功: ${contract.contractNo}`);

    // 2.4 测试价格计算
    logInfo('测试价格计算(开票25万)...');
    const calculateResult = await axios.post(
      `${API_BASE}/pricing/calculate`,
      {
        contractId: contract.id,
        invoiceAmount: 250000,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const pricing = calculateResult.data;
    logSuccess(
      `价格计算成功: 基础价格¥${pricing.basePrice}, 最终价格¥${pricing.finalPrice}, 加价¥${pricing.additionalPrice}`,
    );

    return { product, contract };
  } catch (error) {
    logError('阶梯定价测试失败', error);
    return null;
  }
}

// 3. 测试自动化任务
async function testAutomationFeatures() {
  logSection('测试自动化任务功能');

  try {
    // 3.1 查询自动化规则
    logInfo('查询自动化规则...');
    const rulesResult = await axios.get(`${API_BASE}/automation/rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`查询到 ${rulesResult.data.length} 个自动化规则`);

    // 3.2 查询通知
    logInfo('查询用户通知...');
    const notificationsResult = await axios.get(`${API_BASE}/automation/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`查询到 ${notificationsResult.data.length} 条通知`);

    // 3.3 查询任务历史
    logInfo('查询任务执行历史...');
    const historyResult = await axios.get(`${API_BASE}/automation/tasks/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`查询到 ${historyResult.data.total} 条任务历史`);
  } catch (error) {
    logError('自动化任务测试失败', error);
  }
}

// 4. 测试统计分析功能
async function testStatisticsFeatures() {
  logSection('测试统计分析功能');

  try {
    // 4.1 获取Dashboard数据
    logInfo('获取Dashboard统计数据...');
    const dashboardResult = await axios.get(`${API_BASE}/statistics/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats = dashboardResult.data;
    logSuccess(
      `总客户: ${stats.overview.totalCustomers}, 总合同: ${stats.overview.totalContracts}`,
    );

    // 4.2 获取客户增长趋势
    logInfo('获取客户增长趋势...');
    const growthResult = await axios.get(`${API_BASE}/statistics/customer-growth?months=6`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取到 ${growthResult.data.length} 个月的增长趋势`);

    // 4.3 获取销售业绩排行
    logInfo('获取销售业绩排行...');
    const performanceResult = await axios.get(`${API_BASE}/statistics/sales-performance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取到 ${performanceResult.data.length} 个销售人员的业绩数据`);
  } catch (error) {
    logError('统计分析测试失败', error);
  }
}

// 5. 测试权限系统
async function testPermissionFeatures() {
  logSection('测试权限系统功能');

  try {
    // 5.1 同步菜单
    logInfo('同步菜单...');
    const syncResult = await axios.post(
      `${API_BASE}/permissions/sync-menus`,
      [
        { path: '/dashboard', name: '仪表盘', icon: 'DashboardOutlined', order: 1 },
        { path: '/customers', name: '客户管理', icon: 'UserOutlined', order: 2 },
        { path: '/contracts', name: '合同管理', icon: 'FileTextOutlined', order: 3 },
      ],
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logSuccess(`同步了 ${syncResult.data.length} 个菜单`);

    // 5.2 获取菜单树
    logInfo('获取菜单树...');
    const menuResult = await axios.get(`${API_BASE}/permissions/menus`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取到 ${menuResult.data.length} 个菜单`);

    // 5.3 查询所有权限
    logInfo('查询所有权限...');
    const permissionsResult = await axios.get(`${API_BASE}/permissions/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取到 ${permissionsResult.data.length} 个权限`);

    // 5.4 查询所有角色
    logInfo('查询所有角色...');
    const rolesResult = await axios.get(`${API_BASE}/permissions/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logSuccess(`获取到 ${rolesResult.data.length} 个角色`);

    // 5.5 获取当前用户权限
    logInfo('获取当前用户权限...');
    const userPermissionsResult = await axios.get(
      `${API_BASE}/permissions/users/current/permissions`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logSuccess(`当前用户拥有 ${userPermissionsResult.data.length} 个权限`);
  } catch (error) {
    if (error.response?.status === 404) {
      logInfo('某些API端点可能尚未实现');
    } else {
      logError('权限系统测试失败', error);
    }
  }
}

// 6. 输出测试总结
function printSummary() {
  logSection('测试总结');

  const success = testResults.filter((r) => r.status === 'success').length;
  const failed = testResults.filter((r) => r.status === 'error').length;
  const total = testResults.length;

  console.log(`\n总计: ${total} 个测试`);
  log(`  成功: ${success}`, 'green');
  log(`  失败: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed > 0) {
    console.log('\n失败的测试:');
    testResults
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        log(`  - ${r.name}`, 'red');
      });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    log('🎉 所有测试通过!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查日志', 'yellow');
  }
}

// 主测试流程
async function main() {
  log('记账通项目综合测试', 'blue');
  log(`API地址: ${API_BASE}`, 'blue');
  log(`开始时间: ${new Date().toLocaleString()}`, 'blue');

  try {
    // 1. 测试基础功能
    const customer = await testBasicFeatures();
    await delay(1000);

    // 2. 测试阶梯定价
    if (customer) {
      await testPricingFeatures(customer);
      await delay(1000);
    }

    // 3. 测试自动化任务
    await testAutomationFeatures();
    await delay(1000);

    // 4. 测试统计分析
    await testStatisticsFeatures();
    await delay(1000);

    // 5. 测试权限系统
    await testPermissionFeatures();

    // 6. 输出总结
    printSummary();
  } catch (error) {
    logError('测试过程出错', error);
  }

  log(`\n结束时间: ${new Date().toLocaleString()}`, 'blue');
}

// 运行测试
main().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
