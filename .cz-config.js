module.exports = {
  types: [
    { name: "feat:     ✨ 新功能", value: "feat" },
    { name: "fix:      🐛 修复Bug", value: "fix" },
    { name: "perf:     ⚡️ 性能优化", value: "perf" },
    { name: "docs:     📚 文档变更", value: "docs" },
    { name: "style:    💄 样式调整", value: "style" },
    { name: "refactor: ♻️ 重构", value: "refactor" },
    { name: "test:     ✅ 添加测试", value: "test" },
    { name: "build:    👷 构建", value: "build" },
    { name: "ci:       🔧 配置", value: "ci" },
    { name: "chore:    🧹 其他改动", value: "chore" },
    { name: "revert:   ⏪ 回退", value: "revert" },
  ],
  scopes: [],
  allowTicketNumber: true,
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
