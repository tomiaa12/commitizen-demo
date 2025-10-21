const { execSync, spawnSync } = require("child_process");

exports.runCmdCapture = function (cmd, args = []) {
  try {
    // 简单拼接命令（注意参数不会包含空格）
    return execSync([cmd, ...args].join(" "), {
      stdio: ["pipe", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch (e) {
    return "";
  }
};

exports.runCmd = (cmd, args = [], options = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", ...options });
