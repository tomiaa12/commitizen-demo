// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // commit type 限制
    'type-enum': [2, 'always', ['feat','fix','perf','style','docs','refactor','test','build','ci','chore','revert',]],

    // commit subject 不能为空
    'subject-empty': [2, 'never'],

    // commit header 的最大长度
    'header-max-length': [2, 'always', 250]
  }
};