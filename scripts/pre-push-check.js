const fs = require("fs");
const { getCurrentBranch } = require("./getCurrentBranch");
const path = require("path");

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

function isBypassUser(bypassUsers) {
  try {
    const email = execSync("git config user.email", {
      encoding: "utf8",
    }).trim();
    return bypassUsers && bypassUsers.includes(email);
  } catch {
    return false;
  }
}

// read stdin lines (pre-push provides lines like: "local_ref local_sha remote_ref remote_sha")
const stdin = fs.readFileSync(0, "utf8").trim();
const lines = stdin ? stdin.split("\n") : [];

const cfg = loadConfig();
const forbidDirectPush = cfg.forbidDirectPush || [];
const allowedPrefixes = cfg.allowedBranchPrefixes || [];
const bypassUsers = cfg.bypassUsers || [];
const msgPrefix = cfg.messagePrefix || "";

if (isBypassUser(bypassUsers)) {
  process.exit(0); // 允许特定用户绕过
}

const currentBranch = getCurrentBranch();

function branchFromRef(ref) {
  const m = ref.match(/^refs\/heads\/(.+)$/);
  return m ? m[1] : ref;
}

// check branch name prefix rules
if (allowedPrefixes && allowedPrefixes.length > 0) {
  const ok = allowedPrefixes.some((p) => currentBranch.startsWith(p));
  // allow environment branches themselves (like release, uat, sit) to be pushed/update?
  const envExemptions = (cfg.forbidDirectPush || []).concat(
    cfg.forbidBranchFromEnv || []
  );
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

// iterate pushed refs and check targets
for (const line of lines) {
  if (!line.trim()) continue;
  const parts = line.split(/\s+/);
  // parts: local_ref local_sha remote_ref remote_sha
  const remoteRef = parts[2] || "";
  const remoteBranch = branchFromRef(remoteRef);
  if (!remoteBranch) continue;

  // if pushing to forbidden target branch -> block
  if (
    forbidDirectPush.some((b) => remoteBranch === b || remoteBranch.includes(b))
  ) {
    console.error(
      `${msgPrefix}拒绝推送：禁止直接 push 到受保护分支 '${remoteBranch}'。请使用 PR/MR 流程。`
    );
    process.exit(1);
  }
}

process.exit(0);
