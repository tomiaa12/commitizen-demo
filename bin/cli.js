#!/usr/bin/env node
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
git-gz - Git 分支与提交管理工具

用法:
  npx git-gz init      初始化 Git hooks 和配置文件
  npx git-gz --help    查看帮助
  npx git-gz --version 查看版本
`);
}

if (command === 'init') {
  try {
    // 更稳健地定位并执行安装脚本
    const installPath = path.join(__dirname, '..', 'scripts', 'install.js');
    require(installPath);
    process.exit(0);
  } catch (err) {
    console.error('[git-gz] init 失败：', err && err.message || err);
    process.exit(1);
  }
} else if (command === '--help' || command === 'help' || !command) {
  printHelp();
  process.exit(0);
} else if (command === '--version' || command === '-v') {
  try {
    // 读取包的 version
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    console.log(pkg.version || 'unknown');
  } catch {
    console.log('unknown');
  }
  process.exit(0);
} else {
  console.error(`未知命令: ${command}`);
  printHelp();
  process.exit(1);
}
