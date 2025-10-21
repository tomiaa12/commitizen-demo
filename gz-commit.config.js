// gz-commit.config.js
module.exports = {
  // 不能被直接 push 的目标分支（不能把本地改动直接 push 到这些远端分支）
  forbidDirectPush: ["release"],

  // 禁止合并规则：数组项每项是 { from: [srcPatterns], to: [dstPatterns] }
  // 当本地试图把源分支 from 合并到目标分支 to 时会被阻止
  // 支持在数组中放多个源或目标关键字（精确匹配或包含匹配）
  forbidMerges: [
    { from: ["uat", "sit", "gray"], to: ["release"] },
    // { from: ["uat"], to: ["develop","main"] } // 示例
  ],

  // 禁止从哪些分支直接被 checkout -b（派生新分支）
  forbidBranchFromEnv: ["sit", "uat"],
  autoRollbackOnForbiddenBranchCreation: false, // true = 自动回退并删除新分支；false = 仅警告并阻止

  // 允许的分支名前缀（如果 branch 名不以这些前缀开始，则禁止 push）
  // 空则表示不强制命名规范
  allowedBranchPrefixes: ["feat/", "hotfix/", "bugfix/", "fix/"],

  // 可选：允许绕过检测的用户名或邮箱（例如 CI 账号或管理员）
  bypassUsers: ["ci-bot@example.com"],

  // 其他提示
  messagePrefix: "[git gz] ",
};
