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
const msgPrefix = cfg.messagePrefix || "[git-gz] ";
const allowedPrefixes = cfg.allowedBranchPrefixes || []; // 若配置命名规范

const args = process.argv.slice(2);
const oldRef = args[0] || "";
const newRef = args[1] || "";
const flag = args[2] || ""; // '1' 表示分支切换

if (flag !== "1") process.exit(0); // 非分支切换，放行

// 当前分支（目标）
const current = safeExec("git rev-parse --abbrev-ref HEAD") || "";

// 获取上一个分支名（@{-1} 优先）
let previous = safeExec("git rev-parse --abbrev-ref @{-1}");
if (!previous) previous = safeExec("git rev-parse --abbrev-ref HEAD@{1}");

// 如果无法解析 previous，保守放行（避免误杀）
if (!previous) process.exit(0);

// 判断分支在此操作之前是否已存在（有 reflog 历史）
function branchHasHistory(branchName) {
  if (!branchName) return false;
  try {
    const out = execSync(
      `git reflog show --format=%h refs/heads/${branchName}`,
      { encoding: "utf8" }
    );
    const lines = out.trim()
      ? out.trim().split("\n").filter(Boolean).length
      : 0;
    return lines >= 2;
  } catch (e) {
    return false;
  }
}

const existedBefore = branchHasHistory(current);

// 如果分支之前存在 -> 是“切换已存在分支”，允许（不阻止）
if (existedBefore) {
  process.exit(0);
}

// 到这里：很可能是“新建分支然后切换”场景 —— 我们需要校验命名与来源

// 1) 校验命名前缀（如果配置了 allowedPrefixes）
if (allowedPrefixes.length > 0) {
  const okPrefix = allowedPrefixes.some((p) => current.startsWith(p));
  if (!okPrefix) {
    const msg = `${msgPrefix}拒绝：新分支 "${current}" 命名不符合规范（必须以 ${allowedPrefixes.join(
      ", "
    )} 开头）。`;
    console.error(msg);
    try {
      console.error(`${msgPrefix}正在回退到 "${previous}"`);
      safeExec(`git checkout ${previous}`);
    } catch (e) {
      console.error(`${msgPrefix}回退失败: ${e.message || e}`);
    }
    process.exit(1);
  }
}

// 2) 校验来源分支（如果来源是受限环境则阻止）
const fromEnv = forbidFrom.some(
  (env) => previous === env || previous.includes(env)
);
if (fromEnv) {
  const msg = `${msgPrefix}拒绝：新分支 "${current}" 来自受限环境分支 "${previous}"（不允许从环境分支派生新分支）。`;
  console.error(msg);
  try {
    console.error(`${msgPrefix}正在回退到 "${previous}"`);
    safeExec(`git checkout ${previous}`);
  } catch (e) {
    console.error(`${msgPrefix}回退失败: ${e.message || e}`);
  }
  process.exit(1);
}

// 如果通过了所有检查，允许创建分支
process.exit(0);
