// changelog.config.js
module.exports = {
  writerOpts: {
    transform: function (commit, context) {
      // commit.subject 例如: "#293013 添加登录功能" 或 "#293013xxx" 等
      if (!commit.subject) return commit;

      // 寻找 #123456 的 pattern
      commit.subject = commit.subject.replace(/#(\d+)/g, function (m, id) {
        // 根据 commit.type 确定跳转到 story 还是 issue
        if (commit.type === 'feat') {
          return `[#${id}](https://project.feishu.cn/fosunwealth/story/detail/${id})`;
        } else if (commit.type === 'fix') {
          return `[#${id}](https://project.feishu.cn/fosunwealth/issue/detail/${id})`;
        } else {
          // 其他类型默认跳到 issue 页面（可按需修改）
          return `[#${id}](https://project.feishu.cn/fosunwealth/issue/detail/${id})`;
        }
      });

      return commit;
    }
  }
};
