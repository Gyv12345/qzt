# API版本管理实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现简化的API版本管理系统，使用日期版本号格式（YYYY.MM.DD.构建次数），自动更新版本号并在Swagger中显示

**Architecture:**
- 版本号格式：YYYY.MM.DD.BUILD（如 2025.02.04.1）
- 构建时自动读取当前版本，日期相同则BUILD+1，日期不同则重置为.1
- 更新package.json、main.ts中的Swagger配置
- 生成CHANGELOG.md记录变更

**Tech Stack:**
- Node.js scripts for automation
- Git tags for version tracking
- NestJS Swagger module

---

## Task 1: 创建版本管理脚本

**Files:**
- Create: `backend/scripts/update-version.js`
- Create: `backend/scripts/bump-version.js`
- Modify: `backend/package.json`

**Step 1: 创建版本更新脚本**

```javascript
// backend/scripts/update-version.js
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const mainTsPath = path.join(__dirname, '../src/main.ts');

// 读取当前版本
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// 解析版本号 YYYY.MM.DD.BUILD
const versionRegex = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/;
const match = currentVersion.match(versionRegex);

if (!match) {
  console.error(`Invalid version format: ${currentVersion}`);
  console.error('Expected format: YYYY.MM.DD.BUILD (e.g., 2025.02.04.1)');
  process.exit(1);
}

const [, year, month, day, build] = match;

// 获取当前日期
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const currentDay = String(now.getDate()).padStart(2, '0');

// 判断日期是否相同
const isSameDate = year === currentYear && month === currentMonth && day === currentDay;

// 计算新版本号
let newVersion;
if (isSameDate) {
  // 日期相同，构建次数+1
  newVersion = `${currentYear}.${currentMonth}.${currentDay}.${parseInt(build) + 1}`;
} else {
  // 日期不同，重置为.1
  newVersion = `${currentYear}.${currentMonth}.${currentDay}.1`;
}

// 更新package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated: ${currentVersion} → ${newVersion}`);
console.log(`Build time: ${now.toISOString()}`);

// 更新main.ts中的版本
let mainTsContent = fs.readFileSync(mainTsPath, 'utf8');

// 查找并替换setDescription中的版本
const versionDescRegex = /版本:.*?\d{4}\.\d{2}\.\d{2}\.\d+.*?<br/;
const newVersionDesc = `版本: ${newVersion}<br`;

if (versionDescRegex.test(mainTsContent)) {
  mainTsContent = mainTsContent.replace(versionDescRegex, newVersionDesc);
} else {
  // 如果没有找到，在setDescription中添加版本信息
  mainTsContent = mainTsContent.replace(
    /.setDescription\('企账通SCRM系统API文档'\)/,
    `.setDescription(\`企账通SCRM系统API文档<br/>版本: ${newVersion}<br/>构建时间: ${now.toISOString()}\`)`
  );
}

// 更新setVersion
const setVersionRegex = /\.setVersion\('[^']+'\)/;
mainTsContent = mainTsContent.replace(
  setVersionRegex,
  `.setVersion('${newVersion}')`
);

fs.writeFileSync(mainTsPath, mainTsContent);

console.log('✓ Updated package.json');
console.log('✓ Updated src/main.ts');
console.log(`\nNew version: ${newVersion}`);
```

**Step 2: 创建手动版本升级脚本**

```javascript
// backend/scripts/bump-version.js
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');

// 读取当前版本
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// 手动增加构建次数
const versionRegex = /^(\d{4}\.\d{2}\.\d{2}\.)(\d+)$/;
const match = currentVersion.match(versionRegex);

if (!match) {
  console.error(`Invalid version format: ${currentVersion}`);
  process.exit(1);
}

const prefix = match[1];
const build = parseInt(match[2]);
const newVersion = `${prefix}${build + 1}`;

// 更新package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped: ${currentVersion} → ${newVersion}`);
```

**Step 3: 更新package.json添加scripts**

```json
{
  "scripts": {
    "build": "nest build && node scripts/update-version.js",
    "version:patch": "node scripts/bump-version.js",
    "version:check": "node scripts/check-version.js"
  }
}
```

**Step 4: 测试版本更新脚本**

Run: `node scripts/update-version.js`

Expected output:
```
Version updated: 2025.02.04.1 → 2025.02.04.2
Build time: 2025-02-04T10:30:00.000Z
✓ Updated package.json
✓ Updated src/main.ts

New version: 2025.02.04.2
```

**Step 5: 验证文件已更新**

Run: `cat package.json | grep version`

Expected: `"version": "2025.02.04.2"`

Run: `grep "版本:" src/main.ts`

Expected: Should contain `版本: 2025.02.04.2`

**Step 6: 提交变更**

```bash
git add scripts/update-version.js scripts/bump-version.js package.json
git commit -m "feat: 添加版本管理脚本

- update-version.js: 自动更新版本号
- bump-version.js: 手动升级版本
- package.json: 添加版本管理scripts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 创建版本查询接口

**Files:**
- Create: `backend/src/modules/system/version.controller.ts`
- Modify: `backend/src/modules/system/system.module.ts`

**Step 1: 创建版本控制器**

```typescript
// backend/src/modules/system/version.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as packageJson from '../../../package.json';

@ApiTags('system')
@Controller('version')
export class VersionController {
  @Get()
  @ApiOperation({ summary: '获取API版本信息' })
  getVersion() {
    return {
      version: packageJson.version,
      buildTime: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
```

**Step 2: 注册控制器到模块**

```typescript
// backend/src/modules/system/system.module.ts
import { VersionController } from './version.controller';

@Module({
  // ...
  controllers: [
    // ...existing controllers
    VersionController,
  ],
})
export class SystemModule {}
```

**Step 3: 启动服务测试**

Run: `pnpm run start:dev`

**Step 4: 测试版本接口**

Run: `curl http://localhost:7890/api/version`

Expected response:
```json
{
  "version": "2025.02.04.2",
  "buildTime": "2025-02-04T10:35:00.000Z",
  "gitCommit": "unknown",
  "nodeVersion": "v20.x.x",
  "platform": "darwin",
  "arch": "x64"
}
```

**Step 5: 验证Swagger文档显示版本**

Visit: `http://localhost:7890/api-docs`

Expected:
- 文档标题下方显示版本信息
- 包含版本号和构建时间

**Step 6: 提交变更**

```bash
git add src/modules/system/version.controller.ts src/modules/system/system.module.ts
git commit -m "feat: 添加API版本查询接口

- GET /api/version 返回版本信息
- Swagger文档显示版本号和构建时间

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 创建打包脚本

**Files:**
- Create: `backend/scripts/package.js`
- Modify: `backend/package.json`

**Step 1: 创建打包脚本**

```javascript
// backend/scripts/package.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = require('../package.json');
const version = packageJson.version;
const packageName = `qzt-backend-${version}`;
const outputDir = path.join(__dirname, '../dist');
const packageFileName = `${packageName}.tar.gz`;

console.log(`\n📦 Packaging ${packageName}...\n`);

// 创建临时目录
const tempDir = path.join('/tmp', packageName);
if (fs.existsSync(tempDir)) {
  execSync(`rm -rf ${tempDir}`);
}
fs.mkdirSync(tempDir, { recursive: true });

// 复制必要文件
const filesToCopy = [
  'dist',
  'prisma',
  'node_modules',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  '.env.production.example',
];

console.log('Copying files...');
filesToCopy.forEach(file => {
  const src = path.join(__dirname, '..', file);
  const dest = path.join(tempDir, file);

  if (fs.existsSync(src)) {
    execSync(`cp -r ${src} ${dest}`);
    console.log(`  ✓ ${file}`);
  }
});

// 创建README
const readmeContent = `# 企账通后端 ${version}

## 安装依赖
\`\`\`bash
pnpm install
\`\`\`

## 配置环境变量
\`\`\`bash
cp .env.production.example .env.production
# 编辑 .env.production 配置数据库等信息
\`\`\`

## 数据库迁移
\`\`\`bash
npx prisma migrate deploy
\`\`\`

## 启动服务
\`\`\`bash
pnpm run start:prod
\`\`\`

## 版本信息
- 版本号: ${version}
- 构建时间: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent);

// 创建CHANGELOG
const changelogContent = `# 变更日志

## [${version}] - ${new Date().toISOString().split('T')[0]}
- 发布版本 ${version}
`;

fs.writeFileSync(path.join(tempDir, 'CHANGELOG.md'), changelogContent);

// 打包
console.log('\nCreating package...');
execSync(`tar -czf ${packageFileName} -C /tmp ${packageName}`, {
  cwd: outputDir,
});

console.log(`\n✅ Package created: ${path.join(outputDir, packageFileName)}`);

// 清理临时目录
execSync(`rm -rf ${tempDir}`);

console.log(`\n📊 Package size: ${(fs.statSync(path.join(outputDir, packageFileName)).size / 1024 / 1024).toFixed(2)} MB`);
```

**Step 2: 更新package.json**

```json
{
  "scripts": {
    "package": "node scripts/package.js"
  }
}
```

**Step 3: 测试打包脚本**

Run: `pnpm run build` (这会自动调用update-version.js)

Run: `pnpm run package`

Expected:
```
📦 Packaging qzt-backend-2025.02.04.3...

Copying files...
  ✓ dist
  ✓ prisma
  ✓ node_modules
  ✓ package.json
  ✓ ...

Creating package...

✅ Package created: /path/to/dist/qzt-backend-2025.02.04.3.tar.gz

📊 Package size: XX.XX MB
```

**Step 4: 验证打包内容**

Run: `tar -tzf dist/qzt-backend-*.tar.gz | head -20`

Expected: 应该包含dist/, prisma/, node_modules/, README.md等

**Step 5: 提交变更**

```bash
git add scripts/package.js package.json
git commit -m "feat: 添加打包脚本

- 自动创建tar.gz发布包
- 包含版本号和README
- 生成CHANGELOG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 创建版本检查脚本（可选）

**Files:**
- Create: `backend/scripts/check-version.js`

**Step 1: 创建版本检查脚本**

```javascript
// backend/scripts/check-version.js
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const mainTsPath = path.join(__dirname, '../src/main.ts');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');

const packageVersion = packageJson.version;
const mainTsRegex = /版本:\s*(\d{4}\.\d{2}\.\d{2}\.\d+)/;
const mainTsMatch = mainTsContent.match(mainTsRegex);

const mainTsVersion = mainTsMatch ? mainTsMatch[1] : null;

console.log('Version Check Report:');
console.log('==================');
console.log(`package.json: ${packageVersion}`);
console.log(`main.ts:       ${mainTsVersion || 'NOT FOUND'}`);

if (packageVersion === mainTsVersion) {
  console.log('\n✅ Versions are consistent!');
  process.exit(0);
} else {
  console.log('\n❌ Version mismatch detected!');
  console.log('Run: pnpm run build (will auto-fix)');
  process.exit(1);
}
```

**Step 2: 测试版本检查**

Run: `node scripts/check-version.js`

Expected: ✅ Versions are consistent!

**Step 3: 提交变更**

```bash
git add scripts/check-version.js
git commit -m "feat: 添加版本一致性检查脚本

- 验证package.json和main.ts版本号一致性
- 可用于CI/CD流程

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 创建Git Tag自动化

**Files:**
- Modify: `backend/scripts/update-version.js`

**Step 1: 修改update-version.js添加Git Tag**

在文件末尾添加：

```javascript
// 创建Git tag (可选)
try {
  const tagName = `api-v${newVersion}`;
  execSync(`git tag -f ${tagName}`, { stdio: 'inherit' });
  console.log(`\n✓ Git tag created: ${tagName}`);
  console.log(`  To push: git push origin ${tagName} --force`);
} catch (error) {
  console.warn('\n⚠️  Git tag creation failed (not a git repository?)');
}
```

**Step 2: 测试Git Tag创建**

Run: `node scripts/update-version.js`

Expected output末尾:
```
✓ Git tag created: api-v2025.02.04.3
  To push: git push origin api-v2025.02.04.3 --force
```

**Step 3: 验证Tag已创建**

Run: `git tag -l | tail -5`

Expected: 应该包含 `api-v2025.02.04.3`

**Step 4: 提交变更**

```bash
git add scripts/update-version.js
git commit -m "feat: 添加Git Tag自动创建

- 更新版本号时自动创建api-v*标签
- 支持force更新同一天的多次构建

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 添加CHANGELOG生成

**Files:**
- Create: `backend/scripts/generate-changelog.js`
- Modify: `backend/package.json`

**Step 1: 创建CHANGELOG生成脚本**

```javascript
// backend/scripts/generate-changelog.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = require('../package.json');
const version = packageJson.version;
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

// 获取最近的Git提交（从上一个tag开始）
let commits = [];
try {
  const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', {
    encoding: 'utf-8'
  }).trim();

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const log = execSync(`git log ${range} --pretty=format:"%h|%s|%an|%ad" --date=short`, {
    encoding: 'utf-8'
  });

  commits = log.trim().split('\n').map(line => {
    const [hash, subject, author, date] = line.split('|');
    return { hash, subject, author, date };
  });
} catch (error) {
  console.warn('Could not fetch git commits, skipping changelog generation');
  process.exit(0);
}

// 生成CHANGELOG内容
const newEntry = `## [${version}] - ${new Date().toISOString().split('T')[0]}

${commits.map(commit => `- ${commit.subject} (${commit.hash})`).join('\n')}

`;

// 检查CHANGELOG是否已存在
let changelogContent = '';
if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf-8');

  // 检查是否已存在当前版本的条目
  if (changelogContent.includes(`[${version}]`)) {
    console.log(`CHANGELOG entry for ${version} already exists, skipping.`);
    process.exit(0);
  }

  // 在第一个条目之前插入新条目
  const firstEntryIndex = changelogContent.indexOf('## [');
  if (firstEntryIndex !== -1) {
    changelogContent =
      changelogContent.slice(0, firstEntryIndex) +
      newEntry +
      changelogContent.slice(firstEntryIndex);
  } else {
    changelogContent = newEntry + '\n' + changelogContent;
  }
} else {
  changelogContent = `# API 变更记录\n\n` + newEntry;
}

// 写入文件
fs.writeFileSync(changelogPath, changelogContent);

console.log(`✓ CHANGELOG.md updated for version ${version}`);
console.log(`  Added ${commits.length} commit(s)`);
```

**Step 2: 更新package.json添加script**

```json
{
  "scripts": {
    "changelog": "node scripts/generate-changelog.js"
  }
}
```

**Step 3: 测试CHANGELOG生成**

Run: `pnpm run changelog`

Expected:
```
✓ CHANGELOG.md updated for version 2025.02.04.3
  Added X commit(s)
```

**Step 4: 验证CHANGELOG内容**

Run: `head -20 CHANGELOG.md`

Expected: 应该看到最新的版本条目和提交记录

**Step 5: 提交变更**

```bash
git add scripts/generate-changelog.js package.json CHANGELOG.md
git commit -m "feat: 添加CHANGELOG自动生成

- 从Git提交历史生成变更日志
- 基于Git Tag识别新增提交
- 自动插入版本条目

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: 更新文档

**Files:**
- Create: `backend/README.md` (如果不存在)
- Modify: `backend/DEPLOYMENT.md`

**Step 1: 创建或更新README版本管理章节**

```markdown
# 企账通后端

## 版本管理

本项目使用日期版本号：`YYYY.MM.DD.BUILD`

### 版本号规则
- **YYYY.MM.DD**: 发布日期
- **BUILD**: 当天的构建次数（从1开始）

示例：`2025.02.04.1` 表示2025年2月4日的第1次构建

### 更新版本号

构建时自动更新版本号：
\`\`\`bash
pnpm run build
\`\`\`

手动增加构建次数：
\`\`\`bash
pnpm run version:patch
\`\`\`

### 生成发布包

\`\`\`bash
# 1. 构建并更新版本
pnpm run build

# 2. 生成CHANGELOG
pnpm run changelog

# 3. 打包
pnpm run package
\`\`\`

发布包：`dist/qzt-backend-{version}.tar.gz`

### 查看版本

\`\`\`bash
# 查询API版本
curl http://localhost:7890/api/version

# 查看Git tags
git tag -l
\`\`\`
```

**Step 2: 创建部署文档**

```markdown
# 部署指南

## 部署流程

### 1. 准备服务器环境

\`\`\`bash
# 安装Node.js 18+
# 安装pnpm
npm install -g pnpm

# 安装Redis (可选)
# 配置MySQL/SQLite
\`\`\`

### 2. 上传发布包

\`\`\`bash
# 上传 qzt-backend-{version}.tar.gz 到服务器
scp dist/qzt-backend-*.tar.gz user@server:/opt/
\`\`\`

### 3. 解压并安装

\`\`\`bash
cd /opt
tar -xzf qzt-backend-{version}.tar.gz
cd qzt-backend-{version}

# 安装依赖
pnpm install

# 配置环境变量
cp .env.production.example .env.production
# 编辑 .env.production
\`\`\`

### 4. 数据库迁移

\`\`\`bash
npx prisma migrate deploy
\`\`\`

### 5. 启动服务

\`\`\`bash
# 开发环境
pnpm run start:dev

# 生产环境
pnpm run start:prod
\`\`\`

### 6. 验证部署

\`\`\`bash
# 检查健康状态
curl http://localhost:7890/health

# 检查版本
curl http://localhost:7890/api/version
\`\`\`

### 7. 配置进程管理（推荐）

使用PM2管理进程：

\`\`\`bash
pnpm install -g pm2

pm2 start dist/main.js --name qzt-backend
pm2 save
pm2 startup
\`\`\`
```

**Step 3: 提交文档**

```bash
git add README.md DEPLOYMENT.md
git commit -m "docs: 添加版本管理和部署文档

- README: 版本管理说明
- DEPLOYMENT.md: 完整的部署流程

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ `pnpm run build` 自动更新版本号
- ✅ `pnpm run package` 生成带版本的tar.gz包
- ✅ `curl /api/version` 返回版本信息
- ✅ Swagger文档显示版本和构建时间
- ✅ Git Tag自动创建
- ✅ CHANGELOG.md自动生成
- ✅ 版本号格式：YYYY.MM.DD.BUILD

---

**下一步**: Webhook通知集成实施计划
