// scripts/format-commit.js
const fs = require('fs');
const path = require('path');

const msgFile = process.argv[2];
console.log(msgFile,'msgFile')
return
if (!msgFile) process.exit(0);

let content = fs.readFileSync(msgFile, 'utf8').split(/\r?\n/);
if (!content || content.length === 0) process.exit(0);

const header = content[0].trim();
if (!header) process.exit(0);

// 从剩余行中倒序寻找第一处包含数字的行，提取第一个连续数字串作为 id
let idLineIndex = -1;
let id = null;
for (let i = content.length - 1; i >= 1; i--) {
  const line = (content[i] || '').trim();
  if (!line) continue;
  // 尝试匹配任意连续数字串（至少1位），例如： "ISSUES CLOSED: 6419042544", "id 293013"
  const m = line.match(/(\d{1,})/);
  if (m) { id = m[1]; idLineIndex = i; break; }
}

// 没找到数字 ID 就不改
if (!id) process.exit(0);

// 解析 header: 可能是 "feat: subject" 或 "feat(scope): subject"
const hdrMatch = header.match(/^([a-zA-Z0-9\-]+(?:\([^\)]+\))?):\s*(.*)$/);
if (!hdrMatch) process.exit(0);

const left = hdrMatch[1];
const right = hdrMatch[2] || '';

// 如果 header 已经包含 #id，就不重复插入
if (right.startsWith(`#${id} `) || right === `#${id}`) process.exit(0);

// 构造新 header
const newHeader = `${left}: #${id} ${right}`.trim();

// 移除找到的 ID 行
content.splice(idLineIndex, 1);
// 替换 header
content[0] = newHeader;

// 写回文件
fs.writeFileSync(msgFile, content.join('\n'), 'utf8');
process.exit(0);
