const { runCmdCapture } = require("./run");

// 获取当前分支名
exports.getCurrentBranch = function () {
  // 优先用 rev-parse
  const b = runCmdCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (b && b !== "HEAD") return b;
  // 备用：尝试 symbolic-ref
  const b2 = runCmdCapture("git", ["symbolic-ref", "--short", "HEAD"]);
  if (b2) return b2;
  return "";
};
