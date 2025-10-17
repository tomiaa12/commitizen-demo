module.exports = {
  types: [
    { value: "feat", name: "feat:     ✨ 新功能" },
    { value: "fix", name: "fix:      🐛 修复Bug" },
    { value: "docs", name: "docs:     📚 文档变更" },
    { value: "style", name: "style:    💅 代码格式调整" },
    { value: "refactor", name: "refactor: ♻️ 重构" },
    { value: "test", name: "test:     ✅ 添加测试" },
    { value: "chore", name: "chore:    🧹 其他改动" },
    { value: "revert", name: "revert:   ⏪ 回退" },
  ],
  scopes: [],
  // allowCustomScopes: false,
  // allowBreakingChanges: ["feat", "fix"],
  messages: {
    type: "选择提交类型（上下键选择，回车确认）：",
    issues: "填写 issue id（只填数字，例如 17288）：",
    subject: "填写简短描述（不要带句号）：",
    confirmCommit: "下面是将要提交的信息，确认吗？",
  },
  // 跳过 body 等不必要的项
  skipQuestions: ["scope", "body", "breaking"],
};
