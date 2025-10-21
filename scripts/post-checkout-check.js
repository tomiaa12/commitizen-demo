#!/usr/bin/env node
// scripts/post-checkout-check.js
// 阻止从受限分支派生不符合规则的新分支（仅在新分支创建时校验）
// 读取配置文件 gz-commit.config.js 中的 forbidBranchCreation 配置

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// parse hook args: oldRef newRef flag
const args = process.argv.slice(2);
const oldRef = args[0] || '';
const newRef = args[1] || '';
const flag = args[2] || ''; // '1' 表示分支切换

// 只在分支切换场景生效
if (flag !== '1') process.exit(0);

const cfg = loadConfig();
const forbidRules = cfg.forbidBranchCreation || [];
const prefix = cfg.messagePrefix || '[git-policy] ';

// 当前分支名（目标）
const current = safeExec('git rev-parse --abbrev-ref HEAD') || '';

// 获取上一个分支名（尽量使用 @{-1}，回退到 HEAD@{1}）
let previous = safeExec('git rev-parse --abbrev-ref @{-1}');
if (!previous) previous = safeExec('git rev-parse --abbrev-ref HEAD@{1}');

// 辅助：检测本地是否已有该分支（在 checkout 前是否已存在）
// 我们使用 reflog 检查分支历史条数；如果有 >=1 条（且不是仅刚创建的一条），或者 branch 存在于 refs/heads，则视为存在
function localBranchExistsBefore(branch) {
  if (!branch) return false;
  try {
    // 如果 refs/heads/<branch> 存在则认为存在（注意：在刚创建之后也存在，所以我们结合 reflog 行数判断）
    const refCheck = execSync(`git show-ref --verify --quiet refs/heads/${branch} && echo "yes" || echo ""`, { shell: true, encoding: 'utf8' }).trim();
    if (!refCheck) return false;
    // 查看 reflog 条数
    const out = execSync(`git reflog show --format=%h refs/heads/${branch} 2>/dev/null || true`, { shell: true, encoding: 'utf8' }).trim();
    const lines = out ? out.split('\n').filter(Boolean).length : 0;
    // 如果 reflog lines >= 2，说明该分支在此次操作之前就已经有活动历史（更可靠）
    if (lines >= 2) return true;
    // 如果 reflog lines === 1, 有可能是刚创建；不过如果 show-ref 存在且 lines===1，仍不能断定是否“之前存在”
    // 我们保守返回 false（表示可能是新建），以便进一步检查远端存在性
    return false;
  } catch (e) {
    return false;
  }
}

// 辅助：检测远端是否存在该分支（origin）
function remoteBranchExists(branch) {
  if (!branch) return false;
  try {
    // git ls-remote --heads origin <branch>
    const out = execSync(`git ls-remote --heads origin ${branch}`, { shell: true, encoding: 'utf8' }).trim();
    return !!out;
  } catch (e) {
    return false;
  }
}

// 判断是否在 checkout 前分支已存在（本地或远端）
const existedLocallyBefore = localBranchExistsBefore(current);
const existedOnRemote = remoteBranchExists(current);
const existedBefore = existedLocallyBefore || existedOnRemote;

// 调试（在需要时取消注释）
// console.error('[post-checkout-debug] previous=', previous, 'current=', current, 'flag=', flag, 'existedLocallyBefore=', existedLocallyBefore, 'existedOnRemote=', existedOnRemote);

if (existedBefore) {
  // 切换到已有分支（本地或远端存在），不做 forbidBranchCreation 校验
  process.exit(0);
}

// 到这里：很可能是“新建分支”场景 -> 需要校验 forbidBranchCreation 规则
if (!previous) {
  // 无法得知来源分支，保守放行（避免误拦）
  process.exit(0);
}

// 匹配辅助：pattern 支持 RegExp 或 字符串（字符串按包含或等于匹配）
function matchPattern(val, pattern) {
  if (!pattern) return false;
  if (Object.prototype.toString.call(pattern) === '[object RegExp]') {
    try {
      return pattern.test(val);
    } catch {
      return false;
    }
  }
  if (typeof pattern === 'string') {
    if (val === pattern) return true;
    return val.includes(pattern);
  }
  return false;
}

// 现在遍历规则：若 previous 匹配 rule.from 中任一值，并且 current 匹配 rule.newBranch 中任一值 -> 阻止
for (const rule of forbidRules) {
  const fromArr = rule.from || [];
  const newArr = rule.newBranch || [];
  const msg = rule.msg || `${prefix}禁止从 ${fromArr.join(',')} 派生新分支`;

  const fromMatched = fromArr.some(p => matchPattern(previous, p));
  if (!fromMatched) continue;

  const newMatched = newArr.some(p => matchPattern(current, p));
  if (!newMatched) continue;

  // 匹配到一条禁止规则 -> 输出消息并退出 1
  console.error(`${prefix}${msg}（来源: ${previous} -> 新分支: ${current}）`);
  safeExec(`git checkout ${previous}`);

  process.exit(1);
}

// 未匹配任何禁止规则，允许
process.exit(0);
