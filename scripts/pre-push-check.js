const fs = require("fs");
const { execSync } = require("child_process");
const { getCurrentBranch } = require("./getBranch");
const path = require("path");

function repoRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  } catch {
    return process.cwd();
  }
}

const root = repoRoot();
const cfgPath = path.join(root, "gz-commit.config.js");

let cfg = {};
if (fs.existsSync(cfgPath)) {
  try {
    cfg = require(cfgPath);
  } catch (e) {
    console.error("[git-gz] 读取 gz-commit.config.js 出错：", e.message);
  }
} else {
  console.warn(
    "[git-gz] 未找到 gz-commit.config.js，将使用默认或跳过特定检查。"
  );
}

const stdin = fs.readFileSync(0, "utf8").trim();
const lines = stdin ? stdin.split("\n") : [];

const forbidDirectPush = cfg.forbidDirectPush || [];
const allowedPrefixes = cfg.allowedBranchPrefixes || [];
const msgPrefix = cfg.messagePrefix || '[git-gz] ';

const currentBranch = getCurrentBranch();

function branchFromRef(ref) {
  const m = ref.match(/^refs\/heads\/(.+)$/);
  return m ? m[1] : ref;
}

if (allowedPrefixes && allowedPrefixes.length > 0) {
  const ok = allowedPrefixes.some((p) => currentBranch.startsWith(p));
  const envBranches = cfg.envBranches || [];
  const envExemptions = (cfg.forbidDirectPush || []).concat(envBranches);
  const isEnv = envExemptions.some((k) => currentBranch.includes(k));
  if (!ok && !isEnv) {
    console.error(
      `${msgPrefix}拒绝推送：当前分支 "${currentBranch}" 不符合命名规范，必须以 ${allowedPrefixes.join(
        ", "
      )} 开头`
    );
    process.exit(1);
  }
}

for (const line of lines) {
  if (!line.trim()) continue;
  const parts = line.split(/\s+/);
  const remoteRef = parts[2] || "";
  const remoteBranch = branchFromRef(remoteRef);
  if (!remoteBranch) continue;

  if (
    forbidDirectPush.some((b) => remoteBranch === b || remoteBranch.includes(b))
  ) {
    console.error(
      `${msgPrefix}拒绝推送：禁止直接 push 到受保护分支 '${remoteBranch}'。请使用 PR 流程。`
    );
    process.exit(1);
  }
}

process.exit(0);
