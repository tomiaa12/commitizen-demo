#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(...a){ console.log('[git-gz]', ...a); }
function warn(...a){ console.warn('[git-gz]', ...a); }
function safeExec(cmd){
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

// allow skipping automatic setup
if (process.env.GZ_COMMIT_SKIP_SETUP) {
  log('自动初始化被跳过（GZ_COMMIT_SKIP_SETUP=1）。');
  process.exit(0);
}

// find repo root
const repoRoot = safeExec('git rev-parse --show-toplevel');
if (!repoRoot) {
  log('未检测到 git 仓库，跳过 .husky 自动写入。');
  log('如果使用 npm link 或在 git 仓库中安装失败，请手动运行：');
  log('npx git-gz init');
  process.exit(0);
}

// package info
const pkgRoot = path.resolve(__dirname, '..');
let pkgName = '@tomiaa/git-gz';
let pkgJson = {}
try {
  pkgJson = require(path.join(pkgRoot, 'package.json'));
  if (pkgJson && pkgJson.name) pkgName = pkgJson.name;
} catch(e) { /* ignore */ }

const templatesDir = path.join(pkgRoot);
const huskyDir = path.join(repoRoot, '.husky');

// 确保 .husky 目录存在
if (!fs.existsSync(huskyDir)) {
  fs.mkdirSync(huskyDir, { recursive: true });
  log('.husky 目录已创建');
}

// 检测 husky 版本
function getHuskyVersion() {
  try {
    const huskyPkgPath = path.join(repoRoot, 'node_modules', 'husky', 'package.json');
    if (fs.existsSync(huskyPkgPath)) {
      const huskyPkg = require(huskyPkgPath);
      const version = huskyPkg.version || '';
      const major = parseInt(version.split('.')[0], 10);
      return { version, major };
    }
  } catch (e) {
    // ignore
  }
  return { version: 'unknown', major: 8 }; // 默认使用 v8 格式
}

const huskyInfo = getHuskyVersion();
log(`检测到 husky 版本: ${huskyInfo.version}`);

// 检查并初始化 husky
const huskyShPath = path.join(huskyDir, '_', 'husky.sh');
const needInit = huskyInfo.major < 9 && !fs.existsSync(huskyShPath);

if (needInit) {
  log('检测到 husky 未初始化，正在执行初始化...');
  try {
    // 尝试运行 husky install
    execSync('npx husky install', { 
      cwd: repoRoot, 
      stdio: 'pipe'
    });
    log('✓ husky 初始化成功');
  } catch (e) {
    warn('⚠ husky 初始化失败，Git hooks 可能无法正常工作');
    warn('  请确保项目中已安装 husky，或手动运行: npx husky install');
    warn('  错误信息:', e.message || e);
  }
} else {
  log('✓ husky 已初始化');
}

// 定义需要安装的 hooks 配置
const hooks = [
  {
    name: 'post-merge',
    script: 'post-merge-check.js',
    args: '"$@"'
  },
  {
    name: 'pre-push',
    script: 'pre-push-check.js',
    args: ''
  },
  {
    name: 'commit-msg',
    script: 'commitlint-zh.js',
    args: '"$1"'
  }
];


const isDev = path.basename(path.dirname(path.dirname(pkgRoot))) !== 'node_modules'
// 写入所有 hooks
function writeHook(hookName, scriptName, args) {
  const hookPath = path.join(huskyDir, hookName);
  const argsStr = args ? ' ' + args : '';
  
  // 根据 husky 版本生成不同格式的命令行
  let commandLine = `node "$(git rev-parse --show-toplevel)/node_modules/${pkgName}/scripts/${scriptName}"${argsStr}`;

  if(isDev) {
    commandLine = `node "$(git rev-parse --show-toplevel)/scripts/${scriptName}"${argsStr}`;
  }
  // 如果文件已存在，检查是否需要追加
  if (fs.existsSync(hookPath)) {
    const existingContent = fs.readFileSync(hookPath, 'utf8');
    
    // 检查命令是否已存在
    if (existingContent.includes(commandLine)) {
      log(`${hookName} hook 已包含该命令，跳过`);
      return;
    }
    
    // 追加到文件末尾
    const appendContent = existingContent.endsWith('\n') ? `${commandLine}\n` : `\n${commandLine}\n`;
    fs.appendFileSync(hookPath, appendContent, { encoding: 'utf8' });
    log(`${hookName} hook 已追加命令到现有文件 .husky/${hookName}`);
  } else {
    // 文件不存在，创建新文件
    let hookContent;
    
    if (huskyInfo.major >= 9) {
      // husky v9+ 格式：直接写命令，不需要 shebang 和 husky.sh
      hookContent = `${commandLine}\n`;
    } else {
      // husky v8 格式：需要 shebang 和 husky.sh
      hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${commandLine}
`;
    }
    
    fs.writeFileSync(hookPath, hookContent, { encoding: 'utf8' });
    try { fs.chmodSync(hookPath, 0o755); } catch(e) { /* windows may ignore */ }
    log(`${hookName} hook 已写入 .husky/${hookName} (husky v${huskyInfo.major} 格式)`);
  }
}

// 写入所有配置的 hooks
hooks.forEach(hook => {
  writeHook(hook.name, hook.script, hook.args);
});

function copyIfNotExist(srcName, dstName) {
  const src = path.join(templatesDir, srcName);
  const dst = path.join(repoRoot, dstName);
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    log(`${dstName} 已写入到项目根（来自模板）`);
  } else {
    log(`${dstName} 已存在，跳过覆盖`);
  }
}

// copy templates
copyIfNotExist('gz-commit.config.js', 'gz-commit.config.js');
copyIfNotExist('commitlint.config.js', 'commitlint.config.js');

const hookNames = hooks.map(h => h.name).join(', ');
log('');
log('✓ 安装完成！');
log(`  已写入 Git hooks: ${hookNames}`);
log('');
log('提示：');
log('  1. 确保已安装 peer dependencies: husky, commitlint, @commitlint/config-conventional');
log('  2. 在项目根目录配置 gz-commit.config.js 和 commitlint.config.js');
log('  3. 若需回滚：删除 .husky/* 中的 hook 文件，或恢复备份');
log('');


// 设置 git alias，让用户能直接用 `git gz`
const aliasName = 'gz';
const aliasCmd = `!node ./node_modules/${pkgName}/scripts/commit.js`;

const existingAlias = safeExec(`git config --local alias.${aliasName}`);
if (existingAlias !== aliasCmd) {
  try {
    execSync(`git config --local alias.${aliasName} "${aliasCmd}"`, {
      cwd: repoRoot,
      stdio: 'pipe'
    });
    log(`✓ 已配置 Git 命令别名: git ${aliasName}`);
  } catch (e) {
    warn('⚠ 无法设置 git alias，请手动运行以下命令:');
    warn(`  git config --local alias.${aliasName} "${aliasCmd}"`);
  }
} else {
  log(`✓ Git 命令别名已存在: git ${aliasName}`);
}
