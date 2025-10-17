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
  allowCustomScopes: false,
  allowBreakingChanges: ["feat", "fix"],
  messages: {
    type: "请选择提交类型：",
    // 把 ID 放到 footer（我们会在 prepare 钩子里处理）
    footer: "请输入飞书的 需求/bug ID（可选，只填写数字，直接回车跳过）：\n",
    subject: "请填写提交标题（必填）：\n",
    confirmCommit: "确认提交？(y/n)",
  },
  // 跳过 body 等不必要的项
  skipQuestions: ["scope","body", "breaking"],
};
