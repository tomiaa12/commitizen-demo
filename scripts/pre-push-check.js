const fs = require("fs");
const { getCurrentBranch } = require("./getBranch");
const path = require("path");

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

const stdin = fs.readFileSync(0, "utf8").trim();
const lines = stdin ? stdin.split("\n") : [];

const cfg = loadConfig();
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
