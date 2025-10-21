const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const cfg = loadConfig();
const msgPrefix = cfg.messagePrefix || "[git-gz] ";
const forbidMerges = cfg.forbidMerges || [];

function getCurrentBranch() {
  return safeExec("git rev-parse --abbrev-ref HEAD") || "";
}

// 获取合并的源分支
function getSourceBranch() {
  // 从 reflog 中获取最近的 merge 操作信息
  const reflogEntry = safeExec("git reflog -1 --grep-reflog=merge");
  
  if (reflogEntry) {
    // 格式类似: abc1234 HEAD@{0}: merge sit: Fast-forward
    // 或: abc1234 HEAD@{0}: merge sit: Merge made by the 'recursive' strategy.
    const match = reflogEntry.match(/merge\s+([^:]+):/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // 备用方案：尝试从 MERGE_HEAD 获取（非 fast-forward 合并）
  const mergeHeadPath = path.resolve(process.cwd(), ".git", "MERGE_HEAD");
  if (fs.existsSync(mergeHeadPath)) {
    const sha = fs.readFileSync(mergeHeadPath, "utf8").trim().split(/\s+/)[0];
    if (sha) {
      // 找出包含这个提交的分支
      const branches = branchesContainingCommit(sha);
      if (branches.length > 0) {
        return branches[0];
      }
    }
  }
  
  return "";
}

function branchesContainingCommit(sha) {
  try {
    const out = execSync(`git branch --all --contains ${sha}`, {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((l) => l.replace(/^[\s\*\u2022]+/, "").trim())
      .filter(Boolean)
      .map((b) =>
        b.replace(/^remotes\/origin\//, "").replace(/^remotes\//, "")
      );
  } catch {
    return [];
  }
}

// 匹配 toPattern：支持 RegExp 实例或字符串（字符串按精确或包含匹配）
function matchToPattern(target, pattern) {
  if (!pattern) return false;
  // RegExp instance
  if (Object.prototype.toString.call(pattern) === "[object RegExp]") {
    try {
      return pattern.test(target);
    } catch {
      return false;
    }
  }
  // string: 精确或包含
  if (typeof pattern === "string") {
    if (target === pattern) return true;
    return target.includes(pattern);
  }
  return false;
}

// 匹配 fromPattern（保持原来行为：精确或包含）
function matchFromPattern(source, pattern) {
  if (!pattern) return false;
  if (typeof pattern === "string") {
    if (source === pattern) return true;
    return source.includes(pattern);
  }
  // 若传入 RegExp 意外处理一把
  if (Object.prototype.toString.call(pattern) === "[object RegExp]") {
    try {
      return pattern.test(source);
    } catch {
      return false;
    }
  }
  return false;
}

// 主流程
(function main() {
  const target = getCurrentBranch();
  if (!target) return process.exit(0);

  const source = getSourceBranch();
  if (!source) return process.exit(0);

  // 遍历规则
  for (const rule of forbidMerges) {
    const fromPatterns = rule.from || [];
    const toPatterns = rule.to || [];
    const msg = rule.msg || "";

    // 如果 toPatterns 为空，则不匹配任何目标
    if (!toPatterns || toPatterns.length === 0) continue;

    // 如果当前 target 匹配任一 toPattern，则继续检查来源
    const toMatch = toPatterns.some((tp) => matchToPattern(target, tp));
    if (!toMatch) continue;

    // 如果 to 匹配，则检查来源是否匹配任一 fromPattern
    const fromMatch = fromPatterns.some((fp) => matchFromPattern(source, fp));
    if (fromMatch) {
      console.error(`${msgPrefix}拒绝合并：${msg}`);
      console.error(`${msgPrefix}正在回滚合并操作...`);
      
      try {
        // 回滚到合并前的状态
        execSync("git reset --hard ORIG_HEAD", { stdio: "inherit" });
        console.error(`${msgPrefix}已回滚到合并前的状态`);
      } catch (e) {
        console.error(`${msgPrefix}回滚失败: ${e.message || e}`);
      }
      
      process.exit(1);
    }
  }

  // 通过所有检查
  process.exit(0);
})();

