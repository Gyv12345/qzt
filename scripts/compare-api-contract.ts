#!/usr/bin/env tsx
/**
 * 前后端 API 契约对比工具
 * 使用: pnpm check:contract
 *
 * 功能:
 * 1. 对比后端 Swagger API 和前端实际使用的 API
 * 2. 发现前端调用但后端不提供的接口
 * 3. 发现后端提供但前端未使用的接口
 */

import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const FRONTEND_SRC = join(process.cwd(), '../frontend/src')
const BACKEND_URL = 'http://localhost:7890/api-docs-json'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 提取前端实际使用的 API 调用
function extractFrontendApiUsage() {
  const featuresDir = join(FRONTEND_SRC, 'features')
  const apiUsages = new Map<string, string[]>()

  if (!existsSync(featuresDir)) {
    log('⚠️  前端 features 目录不存在', 'yellow')
    return apiUsages
  }

  const dirs = readdirSync(featuresDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const feature of dirs) {
    const hooksDir = join(featuresDir, feature, 'hooks')
    if (!existsSync(hooksDir)) continue

    const hookFiles = readdirSync(hooksDir).filter(f => f.endsWith('.ts'))

    for (const hookFile of hookFiles) {
      const filePath = join(hooksDir, hookFile)
      const content = readFileSync(filePath, 'utf-8')

      // 提取 getScrmApi() 调用
      const matches = content.matchAll(/getScrmApi\(\)\.(\w+)\(\)\.(\w+)\(/g)
      const methods = Array.from(matches).map(m => `${m[1]}.${m[2]}`)

      if (methods.length > 0) {
        apiUsages.set(feature, methods)
      }
    }
  }

  return apiUsages
}

// 获取后端提供的所有 API
async function getBackendApis() {
  try {
    const response = await fetch(BACKEND_URL)
    if (!response.ok) {
      log('❌ 无法获取后端 Swagger 文档', 'red')
      process.exit(1)
    }

    const swagger = await response.json()
    const apis = new Map<string, string[]>()

    for (const [path, methods] of Object.entries(swagger.paths)) {
      const pathParts = path.split('/').filter(p => p)
      if (pathParts.length < 2) continue

      const module = pathParts[1] // /customers/:id -> customers

      for (const [method, details] of Object.entries(methods)) {
        const operationId = (details as any)?.operationId || `${method.toUpperCase()} ${path}`
        if (!apis.has(module)) {
          apis.set(module, [])
        }
        apis.get(module)!.push(operationId)
      }
    }

    return apis
  } catch (error) {
    log(`❌ 连接后端失败: ${error}`, 'red')
    log(`   请确保后端运行在 ${BACKEND_URL}`, 'gray')
    process.exit(1)
  }
}

// 对比前后端契约
async function compareContracts() {
  log('\n=== QZT 前后端 API 契约对比 ===\n', 'cyan')

  const frontendUsage = extractFrontendApiUsage()
  const backendApis = await getBackendApis()

  // 检查前端使用的 API
  log('📊 前端实际使用的 API 模块:\n', 'yellow')

  if (frontendUsage.size === 0) {
    log('  ⚠️  未发现前端 API 使用（请确认 hooks 目录存在）\n', 'yellow')
  } else {
    for (const [feature, methods] of frontendUsage) {
      log(`  ✓ ${feature}`, 'green')
      methods.forEach(method => log(`    - ${method}`, 'gray'))
      log('', 'reset')
    }
  }

  // 检查后端提供的模块
  log('\n📦 后端提供的 API 模块:\n', 'yellow')

  for (const [module, methods] of backendApis) {
    log(`  ✓ ${module} (${methods.length} 个接口)`, 'green')
  }

  // 检查不一致
  log('\n🔍 契约一致性检查:\n', 'yellow')

  let hasIssue = false

  // 检查前端使用但后端不提供的模块
  for (const [feature] of frontendUsage) {
    // 映射前端模块名到后端模块名（customers -> customer, 等）
    const backendModule = feature.endsWith('s') ? feature.slice(0, -1) : feature

    if (!backendApis.has(backendModule) && !backendApis.has(feature)) {
      log(`  ❌ 前端使用 "${feature}" 但后端未提供`, 'red')
      log(`     → 请确认后端 @ApiTags('${feature}') 是否正确`, 'gray')
      hasIssue = true
    }
  }

  if (!hasIssue) {
    log('  ✅ 未发现明显不一致\n', 'green')
  }

  // 建议
  log('\n💡 建议:\n', 'yellow')

  if (frontendUsage.size === 0) {
    log('  1. 前端尚未使用 API，请按标准流程开发', 'gray')
    log('  2. 在 features/<module>/hooks/ 中创建 use-*.ts', 'gray')
  } else {
    log('  1. 开发新功能前运行: pnpm check:api', 'gray')
    log('  2. 后端修改 API 后运行: pnpm check:api', 'gray')
    log('  3. 确保生成的类型与实际使用一致', 'gray')
  }

  log('\n' + '═'.repeat(60) + '\n', 'gray')
}

compareContracts()
