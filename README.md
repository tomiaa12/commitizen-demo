# @tomiaa/git-gz

Git 分支与提交管理工具，提供分支合并、推送规则校验，以及中文化的 commitlint 提示。

## 功能特性

- ✅ **合并规则校验**：阻止不允许的分支合并操作（支持 Fast-forward 和非 Fast-forward）
- ✅ **推送规则校验**：保护特定分支不被直接推送、校验分支命名规范
- ✅ **中文化提示**：commitlint 错误信息自动翻译为中文
- ✅ **灵活配置**：通过 `gz-commit.config.js` 自定义规则

## 快速开始

### 1. 安装依赖

首先，确保项目中安装了必要的依赖：

```bash
npm install --save-dev husky@^8.0.0 commitlint@^17 @commitlint/config-conventional@^17 @tomiaa/git-gz
```

或者使用 yarn：

```bash
yarn add --dev husky@^8.0.0 commitlint@^17 @commitlint/config-conventional@^17 @tomiaa/git-gz
```

### 2. 自动初始化

安装后会自动执行初始化，包括：
- 初始化 husky（如果尚未初始化）
- 创建 Git hooks（post-merge、pre-push、commit-msg）
- 生成配置文件模板 `gz-commit.config.js`（如果不存在）

### 3. 配置

根据项目需求修改 `gz-commit.config.js` 和 `commitlint.config.js`。

### 4. 使用 CLI 命令

安装后可以使用以下命令：

```bash
# 初始化（通常自动完成，手动执行用于 npm link 场景）
npx git-gz init

# 查看帮助
npx git-gz --help

# 查看版本
npx git-gz --version
```

如果希望使用 `git gz` 格式的命令，可以全局安装：

```bash
npm install -g @tomiaa/git-gz@beta
git gz --help
```

## 安装

### 正常安装

```bash
npm install @tomiaa/git-gz --save-dev
# 或
yarn add @tomiaa/git-gz --dev
```

### 使用 npm link 开发

如果使用 `npm link` 进行本地开发，需要手动运行初始化命令：

```bash
npm link @tomiaa/git-gz
npx git-gz init
```

## 配置文件

初始化后会在项目根目录生成 `gz-commit.config.js`（如果不存在）：

```javascript
// gz-commit.config.js
module.exports = {
  // 不能被直接 push 的目标分支
  forbidDirectPush: ["release", "main"],
  
  // 允许的分支名前缀
  allowedBranchPrefixes: ["feat/", "hotfix/", "bugfix/", "fix/"],
  
  // 禁止合并规则
  forbidMerges: [
    { 
      from: ["sit"], 
      to: [/.*/], 
      msg: "不允许从 sit 分支合并到任何分支" 
    },
    { 
      from: ["uat", "gray"], 
      to: [/^((?!.*(uat|gray)$).*)$/], 
      msg: "从 uat/gray 分支合并时，目标分支必须以 uat/gray 结尾" 
    },
  ],
  
  // 环境分支列表（这些分支本身不受限制）
  envBranches: ["sit", "uat", "gray", "release"],
  
  // 提示信息前缀
  messagePrefix: "[git gz] ",
};
```

## 使用说明

### 合并规则

```bash
# 当前在 release 分支
git merge sit
# ❌ [git gz] 拒绝合并：不允许从 sit 分支合并到当前分支
# 自动回滚合并操作
```

### 推送规则

```bash
# 当前在 feat/new-feature 分支
git push origin release
# ❌ [git gz] 拒绝推送：禁止直接 push 到受保护分支 'release'。请使用 PR 流程。

# 推送不符合命名规范的分支
git checkout -b test
git push origin test
# ❌ [git gz] 拒绝推送：当前分支 "test" 不符合命名规范，必须以 feat/, hotfix/, bugfix/, fix/ 开头
```

### Commit 信息校验

使用 commitlint 校验 commit 信息，错误提示自动翻译为中文：

```bash
git commit -m "test"
# ❌ 提交类型（type）不能为空

git commit -m "feat: 添加新功能"
# ✅ 成功提交
```

## 环境变量

### 跳过自动初始化

```bash
# 设置此环境变量可跳过 postinstall 自动初始化
export GZ_COMMIT_SKIP_SETUP=1
npm install @tomiaa/git-gz --save-dev
```

## CLI 命令

安装后可以通过以下方式使用：

```bash
# 方式 1: 使用 npx（推荐，适用于本地安装）
npx git-gz init
npx git-gz --help
npx git-gz --version

# 方式 2: 使用 git 子命令（需要全局安装或在 npm scripts 中）
git gz init
git gz --help
git gz --version
```

### 全局安装（可选）

如果想在任何地方直接使用 `git gz` 命令，可以全局安装：

```bash
npm install -g @tomiaa/git-gz@beta

# 然后可以在任何目录使用
git gz --help
```

## Git Hooks

该工具会自动创建以下 Git hooks：

- **post-merge**：检查合并操作是否违反规则，违反则自动回滚
- **pre-push**：检查推送操作是否违反规则
- **commit-msg**：校验 commit 信息格式，并提供中文错误提示

## 注意事项

1. **Fast-forward 合并**：使用 `post-merge` hook 来处理，因为 `pre-merge-commit` 无法拦截 Fast-forward 合并
2. **备份机制**：初始化时如果 hook 已存在，会自动备份为 `.bak-timestamp` 文件

## 依赖要求

需要在项目中安装以下 peer dependencies：

```json
{
  "commitlint": ">=17",
  "@commitlint/config-conventional": "^17.0.0",
  "commitizen": "^4.3.1",
  "husky": ">=8.0.0"
}
```

**注意**：
- 同时支持 husky v8 和 v9+，安装脚本会自动检测版本并生成对应格式的 hook 文件
- 如果项目中尚未安装 husky，安装脚本会自动执行 `npx husky install` 进行初始化

## 卸载

删除生成的 hooks 文件即可：

```bash
rm .husky/post-merge .husky/pre-push .husky/commit-msg
```

如果有备份文件，可以恢复：

```bash
mv .husky/post-merge.bak-* .husky/post-merge
```

## 常见问题

### 为什么无法使用 `git gz` 命令？

**本地安装（推荐）**：
- 使用 `npx git-gz` 命令
- 这是最可靠的方式，适用于所有场景

**全局安装**：
- 如果全局安装了包（`npm install -g @tomiaa/git-gz@beta`）
- 可以直接使用 `git gz` 或 `git-gz` 命令
- Git 会自动识别 PATH 中的 `git-gz` 命令作为 `git gz` 子命令

**在 npm scripts 中**：
- 可以直接使用 `git-gz`，因为 npm scripts 会自动将 `node_modules/.bin` 添加到 PATH

```json
{
  "scripts": {
    "setup": "git-gz init"
  }
}
```

### husky 初始化失败怎么办？

如果自动初始化失败，请手动执行：

```bash
npx husky install
```

然后重新运行：

```bash
npx git-gz init
```

### 如何确认 husky 版本兼容性？

本工具同时支持 husky v8 和 v9+：

- **husky v8**：hook 文件包含 shebang 和 `husky.sh` 引用
- **husky v9+**：hook 文件只包含命令本身，不需要 shebang

安装时会自动检测 husky 版本并生成对应格式的 hook 文件。如果遇到 "DEPRECATED" 警告，重新运行 `npx git-gz init` 即可更新为正确格式。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

