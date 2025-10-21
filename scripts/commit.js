const inquirer = require("inquirer");
const { getCurrentBranch } = require("./getBranch");
const { runCmdCapture, runCmd } = require("./run");

// 根据分支名推断 type 默认值（只映射常见的几类）
function inferTypeFromBranch(branch) {
  if (!branch) return "feat";
  // 取第一个 segment（按 / - _ 切分）
  const first = branch.split(/[\/\-_]/)[0].toLowerCase();

  const map = {
    feat: "feat",
    feature: "feat",
    fix: "fix",
    bugfix: "fix",
    hotfix: "fix",
    perf: "perf",
    performance: "perf",
    style: "style",
    docs: "docs",
    doc: "docs",
    refactor: "refactor",
    test: "test",
    build: "build",
    ci: "ci",
    chore: "chore",
    revert: "revert",
  };

  if (map[first]) return map[first];
  for (const key of Object.keys(map)) {
    if (first.startsWith(key)) return map[key];
  }
  return "feat";
}

// 从分支名中提取第一个数字序列作为 ticket（如果有）
function inferTicketFromBranch(branch) {
  if (!branch) return "";
  const m = branch.match(/(\d{1,10})/);
  return m ? m[1] : "";
}

(async () => {
  try {
    const branch = getCurrentBranch();
    const inferredType = inferTypeFromBranch(branch);
    const inferredTicket = inferTicketFromBranch(branch);

    if (branch) {
      console.log(`当前分支: ${branch}`);
      console.log(
        `已推断默认 type: ${inferredType}${
          inferredTicket ? `，默认 issue id: ${inferredTicket}` : ""
        }`
      );
    } else {
      console.log("未能检测到当前分支，type 默认将使用 feat，issue id 为空");
    }

    const { type } = await inquirer.prompt([
      {
        name: "type",
        type: "list",
        message: "请选择提交（type）类型：",
        choices: [
          { name: "feat:     ✨ 新功能", value: "feat" },
          { name: "fix:      🐛 修复Bug", value: "fix" },
          { name: "perf:     ⚡️ 性能优化", value: "perf" },
          { name: "style:    💄 样式调整", value: "style" },
          { name: "docs:     📚 文档变更", value: "docs" },
          { name: "refactor: ♻️ 重构", value: "refactor" },
          { name: "test:     ✅ 添加测试", value: "test" },
          { name: "build:    👷 构建", value: "build" },
          { name: "ci:       🔧 配置", value: "ci" },
          { name: "chore:    🧹 其他改动", value: "chore" },
          { name: "revert:   ⏪ 回退", value: "revert" },
        ],
        default: inferredType, // 默认由分支推断
      },
    ]);

    // ticket 可选（只允许数字或回车跳过），默认值来自分支
    const { ticket } = await inquirer.prompt([
      {
        name: "ticket",
        type: "input",
        message: "填写 feat/bug id（只填数字，直接回车跳过）：",
        default: inferredTicket || "",
        validate: (input) => {
          if (!input) return true;
          return /^\d{1,10}$/.test(input) || "仅支持数字，或留空跳过";
        },
        filter: (v) => v.trim(),
      },
    ]);

    // subject 必填
    const { subject } = await inquirer.prompt([
      {
        name: "subject",
        type: "input",
        message: "提交说明（subject，必填）：",
        validate: (input) => {
          if (!input || !input.trim()) return "描述不能为空";
          if (input.trim().length > 100) return "描述不能超过 100 字符";
          return true;
        },
        filter: (v) => v.trim(),
      },
    ]);

    const ticketPrefix = ticket ? `#${ticket} ` : "";
    const commitMessage = `${type}: ${ticketPrefix}${subject}`;

    console.log("\n------- 提交预览 -------");
    console.log(commitMessage);
    console.log("------------------------\n");

    const { confirm } = await inquirer.prompt([
      {
        name: "confirm",
        type: "confirm",
        message: "确认要使用上面的提交信息并提交吗？",
        default: true,
      },
    ]);

    if (!confirm) {
      console.log("已取消提交。");
      process.exit(0);
    }

    // 检查是否有暂存（staged）变更
    const staged = runCmdCapture("git", ["diff", "--cached", "--name-only"]);

    if (!staged) {
      console.log("检测到没有暂存（staged）变更，正在自动执行: git add -A");
      const addRes = runCmd("git", ["add", "-A"]);
      if (addRes.status !== 0) {
        console.error("git add 失败，退出。");
        process.exit(1);
      }
    }

    // 执行 git commit
    const commitRes = runCmd("git", ["commit", "-m", commitMessage]);
    if (commitRes.status === 0) {
      console.log("提交成功 ✅");
    } else {
      console.error("提交可能未成功，查看上面 git 输出获取更多信息。");
      process.exit(commitRes.status || 1);
    }
  } catch (err) {
    console.error(
      "提交过程中出现错误：",
      err && err.message ? err.message : err
    );
    process.exit(1);
  }
})();
