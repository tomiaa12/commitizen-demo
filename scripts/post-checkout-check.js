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
const forbidCreation = cfg.forbidBranchCreation || [];
const envBranches = cfg.envBranches || [];
const msgPrefix = cfg.messagePrefix || "[git-gz] ";

const args = process.argv.slice(2);
const oldRef = args[0] || "";
const newRef = args[1] || "";
const flag = args[2] || "";

// 只处理分支切换场景（flag === '1'）
if (flag !== "1") process.exit(0);

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

// 如果分支之前存在 -> 是"切换已存在分支"，允许（不阻止）
if (existedBefore) {
  process.exit(0);
}

// 如果当前分支本身是环境分支（如 sit、uat、release 等），直接放行
// 环境分支不受规则限制
const isCurrentEnv = envBranches.some(
  (env) => current === env || current.includes(env)
);
if (isCurrentEnv) {
  process.exit(0);
}

// 到这里：很可能是"新建分支然后切换"场景 —— 我们需要校验命名与来源

// 2) 检查 forbidBranchCreation 规则
// 遍历规则，检查是否有匹配的禁止规则
for (const rule of forbidCreation) {
  const fromPatterns = rule.from || [];
  const newBranchPatterns = rule.newBranch || [];
  const msg = rule.msg || "";
  
  // 检查来源分支是否匹配 from 模式
  const fromMatch = fromPatterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(previous);
    }
    return previous === pattern || previous.includes(pattern);
  });
  
  if (!fromMatch) continue; // 来源分支不匹配，跳过此规则
  
  // 检查新分支名是否匹配 newBranch 模式
  const newBranchMatch = newBranchPatterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(current);
    }
    return current === pattern || current.includes(pattern);
  });
  
  if (newBranchMatch) {
    // 匹配到禁止规则，拒绝创建
    console.error(`${msgPrefix}拒绝：${msg}`);
    try {
      safeExec(`git checkout ${previous}`);
    } catch (e) {
      console.error(`${msgPrefix}回退失败: ${e.message || e}`);
    }
    process.exit(1);
  }
}

// 如果通过了所有检查，允许创建分支
process.exit(0);
