#!/usr/bin/env node
// scripts/commit.js (使用 child_process，兼容 CommonJS，不依赖 execa)
const inquirer = require('inquirer');
const { execSync, spawnSync } = require('child_process');

function runCmd(cmd, args = [], options = {}) {
  // 使用 spawnSync 保留子进程输出到控制台（更接近 execa 的行为）
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  return res;
}


function runCmdCapture(cmd, args = []) {
  // 捕获输出，不抛出（用于判断）
  try {
    return execSync([cmd, ...args].join(' '), { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return '';
  }
}

(async () => {
  try {
    const { type } = await inquirer.prompt([
      {
        name: 'type',
        type: 'list',
        message: '请选择提交类型：',
        choices: [
          { name: 'feat: 新增功能', value: 'feat' },
          { name: 'fix: 修复 Bug', value: 'fix' },
        ],
        default: 'feat',
      },
    ]);

    // 2. ticket 可选（只允许数字或回车跳过）
    const { ticket } = await inquirer.prompt([
      {
        name: 'ticket',
        type: 'input',
        message: '填写 issue id（只填数字，直接回车跳过）：',
        validate: (input) => {
          if (!input) return true;
          return /^\d{1,10}$/.test(input) || '仅支持数字，或留空跳过';
        },
        filter: (v) => v.trim(),
      },
    ]);

    // 3. subject 必填
    const { subject } = await inquirer.prompt([
      {
        name: 'subject',
        type: 'input',
        message: '填写简短描述（命令式，必填）：',
        validate: (input) => {
          if (!input || !input.trim()) return '描述不能为空';
          if (input.trim().length > 100) return '描述不能超过 100 字符';
          return true;
        },
        filter: (v) => v.trim(),
      },
    ]);

    const ticketPrefix = ticket ? `#${ticket} ` : '';
    const commitMessage = `${type}: ${ticketPrefix}${subject}`;

    console.log('\n------- 提交预览 -------');
    console.log(commitMessage);
    console.log('------------------------\n');

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: '确认要使用上面的提交信息并提交吗？',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log('已取消提交。');
      process.exit(0);
    }

    // 检查是否有暂存（staged）变更
    const staged = runCmdCapture('git', ['diff', '--cached', '--name-only']);

    if (!staged) {
      console.log('检测到没有暂存（staged）变更，正在自动执行: git add -A');
      const addRes = runCmd('git', ['add', '-A']);
      if (addRes.status !== 0) {
        console.error('git add 失败，退出。');
        process.exit(1);
      }
    }

    // 执行 git commit
    const commitRes = runCmd('git', ['commit', '-m', commitMessage]);
    if (commitRes.status === 0) {
      console.log('提交成功 ✅');
    } else {
      console.error('提交可能未成功，查看上面 git 输出获取更多信息。');
      process.exit(commitRes.status || 1);
    }
  } catch (err) {
    console.error('提交过程中出现错误：', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
