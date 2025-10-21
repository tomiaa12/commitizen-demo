const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadConfig() {
  const p = path.resolve(process.cwd(), 'gz-commit.config.js');
  if (fs.existsSync(p)) return require(p);
  return {};
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

const cfg = loadConfig();
const forbidFrom = cfg.forbidBranchFromEnv || []; // e.g. ['sit','uat']
const msgPrefix = cfg.messagePrefix || '[git-policy] ';
const autoRollback = cfg.autoRollbackOnForbiddenBranchCreation === true; // false: 仅警告并阻止
const allowedPrefixes = cfg.allowedBranchPrefixes || []; // 若配置命名规范

// args: oldRef newRef flag
const args = process.argv.slice(2);
const oldRef = args[0] || '';
const newRef = args[1] || '';
const flag = args[2] || ''; // '1' 表示分支切换

// 只处理分支切换场景（flag === '1'）
if (flag !== '1') process.exit(0);

// 获取当前分支名
const current = safeExec('git rev-parse --abbrev-ref HEAD') || '';

// 获取上一个分支名（@{-1} 优先）
let previous = safeExec('git rev-parse --abbrev-ref @{-1}');
if (!previous) previous = safeExec('git rev-parse --abbrev-ref HEAD@{1}');

// 如果无法解析 previous，保守放行
if (!previous) process.exit(0);

// 如果上一个分支不包含受限关键词，放行
const fromEnv = forbidFrom.some(env => previous === env || previous.includes(env));
if (!fromEnv) process.exit(0);

// 如果当前分支本身也是环境分支（例如直接 checkout sit/uat 等），放行
const isCurrentEnv = forbidFrom.some(env => current === env || current.includes(env));
if (isCurrentEnv) process.exit(0);

// ---------- 新增判断：检测目标分支是否在此次操作之前就已存在 ----------
// 方法：检查本地分支 reflog 条目数。
// 如果 reflog entry 数 >= 2，则说明该分支之前存在（切换到已有分支）
// 如果 reflog entry 数 === 1，则很可能是新建分支（此次创建），需要拦截或回滚

function branchHasHistory(branchName) {
  if (!branchName) return false;
  try {
    // 使用 --pretty=format:%h 可以避免某些 locale 输出干扰，直接统计行数
    const out = execSync(`git reflog show --format=%h refs/heads/${branchName}`, { encoding: 'utf8' });
    const lines = out.trim() ? out.trim().split('\n').filter(Boolean).length : 0;
    return lines >= 2;
  } catch (e) {
    // 如果命令失败（例如 refs/heads/<branch> 不存在），则视为无历史
    return false;
  }
}

const existedBefore = branchHasHistory(current);

// 如果分支之前存在，则这是一次“切换到已存在分支”，允许（不阻止）
if (existedBefore) {
  // 直接放行
  process.exit(0);
}

// 下面逻辑只在“分支很可能是新建的”场景生效（existedBefore === false）

// 若配置了命名前缀限制，则先校验命名
if (allowedPrefixes.length > 0) {
  const okPrefix = allowedPrefixes.some(p => current.startsWith(p));
  if (!okPrefix) {
    const msg = `${msgPrefix}拒绝：新分支 "${current}" 命名不符合规范（必须以 ${allowedPrefixes.join(', ')} 开头），且它来自受限环境分支 "${previous}"。`;
    console.error(msg);
    if (autoRollback) {
      try {
        console.error(`${msgPrefix}正在回退到 "${previous}" 并删除本地分支 "${current}"...`);
        safeExec(`git checkout ${previous}`);
        safeExec(`git branch -D ${current}`);
        console.error(`${msgPrefix}已回退并删除分支。`);
      } catch (e) {
        console.error(`${msgPrefix}回退失败: ${e.message || e}`);
      }
    }
    process.exit(1);
  }
}

// 默认策略：阻止从受限环境分支派生新分支
const warnMsg = `${msgPrefix}禁止从受限环境分支 "${previous}" 派生新分支 "${current}"。请在 feature 分支上创建新分支，或先切换到正确的源分支。`;
console.error(warnMsg);

if (autoRollback) {
  try {
    console.error(`${msgPrefix}正在回退到 "${previous}" 并删除本地分支 "${current}"...`);
    safeExec(`git checkout ${previous}`);
    safeExec(`git branch -D ${current}`);
    console.error(`${msgPrefix}已回退并删除分支。`);
  } catch (e) {
    console.error(`${msgPrefix}回退失败: ${e.message || e}`);
  }
}

process.exit(1);
