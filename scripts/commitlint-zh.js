const { spawnSync } = require('child_process');
const pathLib = require('path');
const path = process.argv[2] || '.git/COMMIT_EDITMSG';

const commitlintPath = process.platform === 'win32'
  ? pathLib.join('node_modules', '.bin', 'commitlint.cmd')
  : pathLib.join('node_modules', '.bin', 'commitlint');

const res = spawnSync(commitlintPath, ['--edit', path], { encoding: 'utf8' });

const raw = (res.stdout || '') + (res.stderr || '');

if (res.status === 0) {
  process.exit(0);
}

const translations = [
  [/input:/gi, '输入：'],
  [/subject may not be empty/gi, '提交说明（subject）不能为空'],
  [/type may not be empty/gi, '提交类型（type）不能为空'],
  [/body may not be empty/gi, '正文（body）不能为空'],
  [/footer may not be empty/gi, '页脚（footer）不能为空'],
  [/header may not be empty/gi, '头部（header）不能为空'],
  [/found (\d+) problems, (\d+) warnings/gi, '发现 $1 个问题，$2 个警告'],
  [/found (\d+) problems/gi, '发现 $1 个问题'],
  [/found (\d+) warnings/gi, '发现 $1 个警告'],
  [/.*Get help:.*\n?/gi, (m) => m.replace(/Get help:/i, '获取帮助：')],
  [/✖/g, '✖'], 
  [/⧗\s+input:/g, '⧗ 输入：'],
];

// 逐个替换
let zh = raw;
translations.forEach(([re, repl]) => {
  zh = zh.replace(re, repl);
});

// 如果翻译后为空，回退到原始输出（保险）
if (!zh.trim()) {
  console.error(raw);
  process.exit(res.status || 1);
}

// 输出中文信息（到 stderr，使 Husky 识别为失败信息）
console.error(zh);
process.exit(res.status || 1);
