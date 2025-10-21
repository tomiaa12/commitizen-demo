const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

const cfg = loadConfig();
const forbidFrom = cfg.forbidBranchFromEnv || []; // e.g. ['sit','uat']
const msgPrefix = cfg.messagePrefix || "[git-policy] ";
const autoRollback = cfg.autoRollbackOnForbiddenBranchCreation === true; // 可配置，默认 false (只警告)
const allowedPrefixes = cfg.allowedBranchPrefixes || []; // 若配置命名规范

// args: oldRef newRef flag
const args = process.argv.slice(2);
const oldRef = args[0] || "";
const newRef = args[1] || "";
const flag = args[2] || ""; // '1' 表示分支切换

// 只处理分支切换场景（flag === '1'）
if (flag !== "1") {
  // 非分支切换（可能是文件 checkout），忽略
  process.exit(0);
}

// 获取当前分支名
const current = safeExec("git rev-parse --abbrev-ref HEAD") || "";

// 获取上一个分支名：使用 git rev-parse --abbrev-ref @{-1}
let previous = safeExec("git rev-parse --abbrev-ref @{-1}");
if (!previous) {
  // 退而求其次：try HEAD@{1}
  previous = safeExec("git rev-parse --abbrev-ref HEAD@{1}");
}

// 调试输出（可注释掉）
// console.log('[post-checkout] previous:', previous, 'current:', current, 'oldRef:', oldRef, 'newRef:', newRef);

if (!previous) {
  // 无法解析上一个分支名，保守放行（避免误杀）
  process.exit(0);
}

// 如果上一个分支包含 forbidFrom 的关键词，则视为从环境分支派生
const fromEnv = forbidFrom.some((env) => previous === env || previous.includes(env));
if (!fromEnv) {
  process.exit(0); // 非从受限环境分支派生，放行
}

// 如果当前分支本身也是环境分支（比如直接 checkout sit），则不处理
const isCurrentEnv = forbidFrom.some((env) => current === env || current.includes(env));
if (isCurrentEnv) {
  process.exit(0);
}

// 可选：如果配置了 allowedPrefixes，则要求新分支以某些前缀开头，否则视为不规范
if (allowedPrefixes.length > 0) {
  const okPrefix = allowedPrefixes.some((p) => current.startsWith(p));
  if (!okPrefix) {
    const msg = `${msgPrefix}拒绝：新分支 "${current}" 命名不符合规范（必须以 ${allowedPrefixes.join(
      ", "
    )} 开头），且它来自受限环境分支 "${previous}"。`;
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

// 如果到这里说明：确实是从受限环境分支派生，但新分支命名又合规（或未配置命名规范）
// 常见策略：仍建议阻止创建（因为不允许在环境分支上派生）
// 我把默认策略设为“警告并阻止”（退出非 0），并根据 autoRollback 决定是否自动回退删除
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
