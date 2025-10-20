#!/usr/bin/env node
// scripts/commitlint-zh.js
// 用法: node ./scripts/commitlint-zh.js .git/COMMIT_EDITMSG

const { spawnSync } = require('child_process');
const path = process.argv[2] || '.git/COMMIT_EDITMSG';

// 用 npx 调用本地的 commitlint，兼容性强
const res = spawnSync('npx', ['commitlint', '--edit', path], { encoding: 'utf8' });

// 合并 stdout/stderr 以便翻译全部信息
const raw = (res.stdout || '') + (res.stderr || '');

if (res.status === 0) {
  // 校验通过，直接退出成功
  process.exit(0);
}

// 翻译表：按需扩展
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
  [/✖/g, '✖'], // 保持符号（根据需要可改）
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
