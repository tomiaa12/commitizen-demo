const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadConfig() {
  const p = path.resolve(process.cwd(), "gz-commit.config.js");
  if (fs.existsSync(p)) return require(p);
  return {};
}

const cfg = loadConfig();
const forbidFrom = cfg.forbidBranchFromEnv || [];
const msgPrefix = cfg.messagePrefix || "";

// args: oldRef newRef flag
const args = process.argv.slice(2);
const oldRef = args[0] || "";
const newRef = args[1] || "";
const flag = args[2] || ""; // '1' 表示分支切换

if (flag !== "1") {
  process.exit(0); // 非分支切换（如文件 checkout），忽略
}

// 获取分支名（new）
let current = "";
try {
  current = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
} catch {
  current = "";
}

// 尝试获取上一个分支名（oldRef）
let previous = "";
try {
  previous = execSync("git name-rev --name-only " + oldRef, {
    encoding: "utf8",
  }).trim();
} catch {
  previous = "";
}

// 简单判断：如果 previous 含 forbidFrom 的关键词，则认为是从 env 分支派生
for (const env of forbidFrom) {
  if (previous && (previous === env || previous.includes(env))) {
    console.error(
      `${msgPrefix}禁止从环境分支 "${previous}" 派生新分支。已自动切回到 "${previous}"，并请删除刚创建的分支 "${current}"。`
    );
    try {
      // 切回
      execSync(`git checkout ${previous}`, { stdio: "inherit" });
      // 删除刚创建的分支（本地）
      execSync(`git branch -D ${current}`, { stdio: "inherit" });
    } catch (e) {
      console.error(`${msgPrefix}回滚过程出错：`, e.message || e);
    }
    process.exit(1);
  }
}

process.exit(0);
