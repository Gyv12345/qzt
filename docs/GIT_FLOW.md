# Git Flow 分支管理

企智通项目采用 Git Flow 工作流进行分支管理。

## 分支结构

```
main          ───────●────────────────●─────>
                     ↑                ↑
                     │                │
                  release        hotfix
                     │                │
develop ────●────────●─────────●──────●───>
            │        │         │      │
          feature    │       feature  │
                     │
                release
```

## 分支说明

### main（主分支）

- **用途**：生产环境代码，始终保持稳定可发布状态
- **保护**：启用分支保护，禁止直接推送
- **合并来源**：仅接受来自 `develop` 或 `hotfix/*` 的合并
- **命名**：`main`

```bash
git checkout main
git pull origin main
```

### develop（开发分支）

- **用途**：开发环境代码，集成最新功能
- **合并来源**：接受来自 `feature/*`、`release/*`、`hotfix/*` 的合并
- **命名**：`develop`

```bash
git checkout develop
git pull origin develop
```

### feature/*（功能分支）

- **用途**：开发新功能
- **创建自**：`develop`
- **合并到**：`develop`
- **命名规范**：`feature/功能名称` 或 `feature/模块-功能`
- **生命周期**：功能完成后合并到 `develop` 并删除

```bash
# 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/user-management

# 开发完成后
git checkout develop
git merge --no-ff feature/user-management
git branch -d feature/user-management
git push origin develop
```

### release/*（发布分支）

- **用途**：准备发布版本，修复 Bug、更新版本号、完善文档
- **创建自**：`develop`
- **合并到**：`develop` 和 `main`
- **命名规范**：`release/x.x.x`
- **生命周期**：发布完成后合并到 `main`（打标签）和 `develop`，然后删除

```bash
# 创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 发布完成后
# 1. 合并到 main 并打标签
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"

# 2. 合并回 develop
git checkout develop
git merge --no-ff release/1.0.0

# 3. 删除发布分支
git branch -d release/1.0.0

# 4. 推送
git push origin main develop --tags
```

### hotfix/*（热修复分支）

- **用途**：紧急修复生产环境问题
- **创建自**：`main`
- **合并到**：`develop` 和 `main`
- **命名规范**：`hotfix/问题描述`
- **生命周期**：修复完成后合并到 `main`（打标签）和 `develop`，然后删除

```bash
# 创建热修复分支
git checkout main
git pull origin main
git checkout -b hotfix/login-bug

# 修复完成后
# 1. 合并到 main 并打标签
git checkout main
git merge --no-ff hotfix/login-bug
git tag -a v1.0.1 -m "Hotfix: login bug"

# 2. 合并回 develop
git checkout develop
git merge --no-ff hotfix/login-bug

# 3. 删除热修复分支
git branch -d hotfix/login-bug

# 4. 推送
git push origin main develop --tags
```

## 开发工作流程

### 1. 开始新功能

```bash
# 1. 切换到 develop 并更新
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/your-feature-name

# 3. 开发并提交
git add .
git commit -m "feat(module): add feature description"

# 4. 推送到远程（用于 PR 或备份）
git push -u origin feature/your-feature-name
```

### 2. 提交 PR（Pull Request）

1. 在 GitHub 上创建 PR：`feature/xxx` → `develop`
2. 使用 [PR 模板](../.github/pull_request_template.md) 填写 PR 信息
3. 等待 Code Review
4. 通过后合并到 `develop`，删除功能分支

### 3. 发布版本

```bash
# 1. 从 develop 创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. 更新版本号（自动）
# bump-version 脚本会自动处理

# 3. 测试并修复 Bug
# ...

# 4. 合并到 main 和 develop
#（见上文 release/* 说明）
```

### 4. 紧急修复

```bash
# 1. 从 main 创建热修复分支
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. 修复并测试
# ...

# 3. 合并到 main 和 develop
#（见上文 hotfix/* 说明）
```

## 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链相关 |

### Scope 范围

| Scope | 说明 |
|-------|------|
| `backend` | 后端相关 |
| `frontend` | 前端相关 |
| `website` | 网站相关 |
| `shared-types` | 共享类型 |
| `deploy` | 部署相关 |
| `docs` | 文档 |

### 示例

```bash
feat(backend): add user authentication API
fix(frontend): resolve login page redirect issue
docs: update Git Flow documentation
refactor(shared-types): rename UserDto fields
chore(deploy): update GitHub Actions workflow
```

## 分支保护规则

### main 分支

- ✅ 需要 PR 审查才能合并
- ✅ 需要 CI 检查通过才能合并
- ✅ 禁止直接推送
- ✅ 合并使用 Squash and Merge

### develop 分支

- ✅ 需要 CI 检查通过才能合并
- ✅ 建议 PR 审查
- ⚠️ 允许直接推送（开发者自行判断）

## 常用命令

```bash
# 查看所有分支
git branch -a

# 删除本地分支
git branch -d branch-name

# 删除远程分支
git push origin --delete branch-name

# 重命名本地分支
git branch -m old-name new-name

# 查看分支关系
git log --graph --oneline --all

# 同步远程分支
git fetch --prune
```

## 注意事项

1. **永远不要**直接在 `main` 或 `develop` 上开发
2. **功能分支**保持小而精，及时合并避免冲突
3. **提交前**确保代码通过 ESLint 检查
4. **PR 描述**要清晰，说明做了什么、为什么这么做
5. **及时同步**上游分支更新，减少合并冲突
