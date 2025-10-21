const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const oldRef = args[0] || "";
const newRef = args[1] || "";
const flag = args[2] || "";

console.log("[post-checkout] args:", { oldRef, newRef, flag });

// 你的后续逻辑：只有 flag === '1' 表示切换分支，按此前逻辑处理
if (flag !== "1") {
  // 非分支切换，直接退出
  process.exit(0);
}

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

const cfg = loadConfig();
const forbidMerges = cfg.forbidMerges || [];
const msgPrefix = cfg.messagePrefix || "";

function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function getMergeHeads() {
  const mergeHead = path.resolve(process.cwd(), ".git", "MERGE_HEAD");
  if (!fs.existsSync(mergeHead)) return [];
  const raw = fs.readFileSync(mergeHead, "utf8").trim();
  return raw ? raw.split(/\s+/) : [];
}

function branchesContainingCommit(sha) {
  try {
    const out = execSync(`git branch --all --contains ${sha}`, {
      encoding: "utf8",
    });
    // lines like: "  remotes/origin/feature/xxx" or "* main"
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

const current = getCurrentBranch();
const mergeHeads = getMergeHeads();

if (mergeHeads.length === 0) {
  // 没有检测到 MERGE_HEAD，直接通过（非合并情形）
  process.exit(0);
}

// 对每个被合并的 commit，尝试找到其分支名（首个匹配即用）
let sourceBranches = new Set();
for (const sha of mergeHeads) {
  const bs = branchesContainingCommit(sha);
  bs.forEach((b) => sourceBranches.add(b));
}

if (sourceBranches.size === 0) {
  // 备选：尝试从 reflog 或 MERGE_MSG 解析
  // 若无法识别来源，保守放行
  process.exit(0);
}

const srcList = Array.from(sourceBranches);

for (const rule of forbidMerges) {
  const fromPatterns = rule.from || [];
  const toPatterns = rule.to || [];
  const toMatch = toPatterns.some((t) => current === t || current.includes(t));
  if (!toMatch) continue;

  // 若目标匹配，再看来源是否包含 fromPatterns
  for (const s of srcList) {
    if (fromPatterns.some((f) => s === f || s.includes(f))) {
      console.error(
        `${msgPrefix}拒绝合并：检测到试图将环境分支 '${s}' 合并到 '${current}'，此操作被策略禁止。请使用 PR/MR 并通过审批/CI。`
      );
      process.exit(1);
    }
  }
}

process.exit(0);
