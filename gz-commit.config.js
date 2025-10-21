// gz-commit.config.js
module.exports = {
  // 不能被直接 push 的目标分支（不能把本地改动直接 push 到这些远端分支）
  forbidDirectPush: ["release"],
  // 允许的分支名前缀（如果 branch 名不以这些前缀开始，则禁止 push）
  allowedBranchPrefixes: ["feat/", "hotfix/", "bugfix/", "fix/"],

  // 禁止合并规则：数组项每项是 { from: [srcPatterns], to: [dstPatterns] }
  // 当本地试图把源分支 from 合并到目标分支 to 时会被阻止
  forbidMerges: [
    // { from: ["uat"], to: ["develop","main"] } // 示例

    { from: ["sit"], to: [/.*/], msg: "不允许从 sit 分支合并到当前分支" }, // sit 禁合并到所有分支
    { from: ["uat", "gray"], to: [/^((?!.*(uat|gray)$).*)$/], msg: "从 uat/gray 分支合并到当前分支时，当前分支必须以 uat/gray 结尾" }, // uat/gray 只能合并到以 uat/gray 结尾的分支，这里示例为“非以 uat/gray 结尾则禁止”
  ],

  // 环境分支列表（这些分支本身不受规则限制，可以直接切换）
  envBranches: ["sit", "uat", "gray", "release"],

  // 提示前缀
  messagePrefix: "[git gz] ",
};
