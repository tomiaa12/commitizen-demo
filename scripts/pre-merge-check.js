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
function getMergeHeads() {
  const mergeHeadPath = path.resolve(process.cwd(), ".git", "MERGE_HEAD");
  if (!fs.existsSync(mergeHeadPath)) return [];
  const raw = fs.readFileSync(mergeHeadPath, "utf8").trim();
  return raw ? raw.split(/\s+/) : [];
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

  const mergeHeads = getMergeHeads();
  if (mergeHeads.length === 0) return process.exit(0);

  // 收集来源分支
  const srcSet = new Set();
  for (const sha of mergeHeads) {
    const bs = branchesContainingCommit(sha);
    bs.forEach((b) => srcSet.add(b));
  }
  const srcList = Array.from(srcSet);
  if (srcList.length === 0) return process.exit(0);

  // 遍历规则
  for (const rule of forbidMerges) {
    const fromPatterns = rule.from || [];
    const toPatterns = rule.to || [];

    // 如果 toPatterns 为空，则不匹配任何目标（可改为匹配全部）
    if (!toPatterns || toPatterns.length === 0) continue;

    // 如果当前 target 匹配任一 toPattern，则继续检查来源
    const toMatch = toPatterns.some((tp) => matchToPattern(target, tp));
    if (!toMatch) continue;

    // 如果 to 匹配，则检查来源是否匹配任一 fromPattern
    for (const src of srcList) {
      const fromMatch = fromPatterns.some((fp) => matchFromPattern(src, fp));
      if (fromMatch) {
        console.error(
          `${msgPrefix}拒绝合并：检测到试图将来源分支 '${src}' 合并到目标分支 '${target}'。此操作被策略禁止。请使用 PR/MR 并通过审批/CI。`
        );
        process.exit(1);
      }
    }
  }

  // 通过所有检查
  process.exit(0);
})();
