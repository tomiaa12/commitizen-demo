module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat','fix','docs','style','refactor','perf','test','chore','revert']],
    // 你可以根据团队习惯启用更多规则，比如 subject 长度、subject-case 等
    'subject-case': [0, 'never'] // 这里允许任意大小写的 subject
  }
};
