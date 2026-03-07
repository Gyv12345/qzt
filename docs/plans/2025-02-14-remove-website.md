# 移除 Website 项目实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从 monorepo 中完全移除 website 项目及相关引用，集中精力于核心业务系统。

**Architecture:** 清理操作 - 删除目录、更新配置文件、清理文档引用。无代码变更，纯配置和文档维护。

**Tech Stack:** pnpm monorepo, git

---

## 前置检查

**当前状态（已部分完成）：**
- ✅ website 下的源码文件已在 git 中删除（上次提交）
- ⚠️ `website/.next` 缓存目录仍存在（未跟踪）
- ❌ `pnpm-workspace.yaml` 仍有 website 引用
- ❌ 文档中仍有 website 引用

---

### Task 1: 删除 website 目录残留

**Files:**
- Delete: `website/` （整个目录，含 .next 缓存）

**Step 1: 确认目录内容**

Run: `ls -la website/`
Expected: 只有 `.next` 目录

**Step 2: 删除整个 website 目录**

Run: `rm -rf website/`
Expected: 目录不存在

**Step 3: 验证删除成功**

Run: `ls website/ 2>/dev/null || echo "已删除"`
Expected: 输出 "已删除"

---

### Task 2: 更新 pnpm-workspace.yaml

**Files:**
- Modify: `pnpm-workspace.yaml`

**Step 1: 读取当前内容**

Run: `cat pnpm-workspace.yaml`
Expected: 包含 `- 'website'` 行

**Step 2: 移除 website 行**

将文件内容修改为：

```yaml
packages:
  - 'packages/*'
  - 'backend'
  - 'frontend'
```

**Step 3: 验证修改**

Run: `cat pnpm-workspace.yaml`
Expected: 无 website 引用

---

### Task 3: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: 删除 Website 章节（约第 283-291 行）**

删除以下内容：
```markdown
## Website（公司网站）

- Next.js 15 + Tailwind v4 + shadcn/ui
- 端口 5180
- 使用 `fetch` + ISR（不用 Orval）
- 路由：`/`, `/articles`, `/articles/[slug]`, `/cases`, `/cases/[slug]`

```bash
cd website && pnpm dev/build
```
```

**Step 2: 更新清理命令（约第 80 行）**

将：
```markdown
rm -rf website/.next frontend/node_modules/.vite frontend/node_modules/.cache logs/*
```
改为：
```markdown
rm -rf frontend/node_modules/.vite frontend/node_modules/.cache logs/*
```

**Step 3: 更新可删除文件表格（约第 87 行）**

删除 `| `website/.next/` | 构建产物 |` 这一行

**Step 4: 更新依赖版本示例（约第 101 行）**

将：
```markdown
pnpm add -F backend|shadcn-admin|website|shared-types <package>@<version>
```
改为：
```markdown
pnpm add -F backend|shadcn-admin|shared-types <package>@<version>
```

---

### Task 4: 同步更新 glm-monorepo skill

**Files:**
- Modify: `.claude/skills/glm-monorepo/SKILL.md`

**Step 1: 复制 CLAUDE.md 的相同修改**

在 `.claude/skills/glm-monorepo/SKILL.md` 中执行与 Task 3 相同的修改：
1. 删除 Website 章节
2. 更新清理命令
3. 更新可删除文件表格
4. 更新依赖版本示例

---

### Task 5: 更新 README.md

**Files:**
- Modify: `README.md`

**Step 1: 移除项目结构中的 website 行**

找到项目结构表格，删除类似这样的行：
```markdown
| [website](./website/) | Next.js 官方网站 | [中文](./website/README.md) · [English](./website/README.en.md) |
```

**Step 2: 移除 PM2 日志相关（如有）**

删除包含 `qzt-website` 的日志路径说明

---

### Task 6: 更新 README.en.md

**Files:**
- Modify: `README.en.md`

**Step 1: 同步 README.md 的修改**

执行与 Task 5 相同的修改（英文版）

---

### Task 7: 更新 docs/DEPLOYMENT.md

**Files:**
- Modify: `docs/DEPLOYMENT.md`

**Step 1: 移除 qzt-website 进程引用**

查找并删除/修改包含 `qzt-website` 的 PM2 进程表行

---

### Task 8: 更新 docs/GIT_FLOW.md

**Files:**
- Modify: `docs/GIT_FLOW.md`

**Step 1: 移除 website 分支约定**

删除类似这样的行：
```markdown
| `website` | 网站相关 |
```

---

### Task 9: 删除过时的计划文件

**Files:**
- Delete: `.claude/plans/fuzzy-moseying-wozniak.md`

**Step 1: 删除文件**

Run: `rm .claude/plans/fuzzy-moseying-wozniak.md`
Expected: 文件不存在

---

### Task 10: 更新 pnpm lock 文件

**Files:**
- Modify: `pnpm-lock.yaml` (自动)

**Step 1: 运行 pnpm install**

Run: `pnpm install`
Expected: 无错误，lock 文件更新

**Step 2: 验证 lock 文件无 website 引用**

Run: `grep -c "website:" pnpm-lock.yaml || echo "0"`
Expected: 输出 "0"

---

### Task 11: 验证并提交

**Step 1: 检查所有 website 引用已清理**

Run: `grep -r "website" --include="*.{md,yaml,yml,json}" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" | grep -v "translation.json" | head -20`

Expected: 无输出或仅有业务字段引用（非项目引用）

**Step 2: 查看变更状态**

Run: `git status`
Expected: 显示所有修改的文件

**Step 3: 提交变更**

```bash
git add -A
git commit -m "chore: 移除 website 项目，集中精力于核心业务"
```

---

## 成功标准

- [ ] `website/` 目录不存在
- [ ] `pnpm-workspace.yaml` 无 website 引用
- [ ] 所有文档无 website 项目引用（业务字段除外）
- [ ] `pnpm install` 正常执行
- [ ] 提交完成
