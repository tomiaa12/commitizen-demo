module.exports = {
  types: [
    { value: 'feat', name: 'feat:    新功能' },
    { value: 'fix', name: 'fix:     修复 bug' },
    { value: 'docs', name: 'docs:    文档变更' },
    { value: 'style', name: 'style:   代码格式（不影响逻辑）' },
    { value: 'refactor', name: 'refactor: 重构（既不是新增也不是修复）' },
    { value: 'perf', name: 'perf:    性能优化' },
    { value: 'test', name: 'test:    添加/修改测试' },
    { value: 'chore', name: 'chore:   构建/脚手架/工具变动' },
    { value: 'revert', name: 'revert:  回退到之前的提交' }
  ],
  scopes: [],
  allowCustomScopes: true,
  allowBreakingChanges: ['feat','fix'],
  messages: {
    type: '请选择提交类型：',
    scope: '请输入影响范围（可选）：',
    customScope: '请输入自定义范围：',
    subject: '请简要描述（必填）：\n',
    body: '详细描述（可选），使用 "|" 换行：\n',
    breaking: '列举 BREAKING CHANGES（可选）：\n',
    footer: '关联的 issue（可选，例如：#31）：\n',
    confirmCommit: '确认提交？(y/n)'
  },
};
