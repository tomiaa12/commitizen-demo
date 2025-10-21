// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 限制 type，必选
    'type-enum': [2, 'always', ['feat','fix','docs','chore','refactor','perf','test','revert']],
    // subject 不能为空
    'subject-empty': [2, 'never'],
    // header 的最大长度（可选）
    'header-max-length': [2, 'always', 250]
  }
  
};
