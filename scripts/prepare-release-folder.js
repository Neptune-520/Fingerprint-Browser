import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. 读取 package.json 获取版本号
const pkgPath = path.join(rootDir, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('❌ 找不到 package.json 文件！');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;

console.log(`========================================================`);
console.log(`📦 按 package.json 版本号 (v${version}) 整理 GitHub Release 文件`);
console.log(`========================================================\n`);

const releaseDir = path.join(rootDir, 'release');
const versionFolder = path.join(releaseDir, version);

if (!fs.existsSync(releaseDir)) {
  console.error(`❌ 找不到 release 目录，请先运行打包脚本 (npm run pack:exe)！`);
  process.exit(1);
}

// 清空旧的版本归档文件夹（如果存在），确保干净
if (fs.existsSync(versionFolder)) {
  fs.rmSync(versionFolder, { recursive: true, force: true });
}
fs.mkdirSync(versionFolder, { recursive: true });
console.log(`📁 已新建/重置版本文件夹: release/${version}/\n`);

// 3. 收集当前版本的发布文件
const items = fs.readdirSync(releaseDir);
let copyCount = 0;

for (const item of items) {
  const itemPath = path.join(releaseDir, item);
  const stat = fs.statSync(itemPath);

  // 跳过子文件夹
  if (stat.isDirectory()) continue;

  // 匹配规则：属于当前版本号的文件，或者全局更新清单 latest.yml
  const isCurrentVersionFile = item.includes(version) || item.startsWith('latest') || item === 'builder-debug.yml';

  if (isCurrentVersionFile) {
    const destPath = path.join(versionFolder, item);
    fs.copyFileSync(itemPath, destPath);
    console.log(`  ├─ 复制发布文件: ${item} -> release/${version}/${item}`);
    copyCount++;
  }
}

console.log('');
if (copyCount === 0) {
  console.warn(`⚠️ 警告: release/ 根目录下未发现 v${version} 版本的发布文件。`);
  console.warn(`请确保已先执行本地打包脚本！`);
} else {
  console.log(`✅ 整理完成！共计 ${copyCount} 个 GitHub Release 发布文件已归档至目录: release/${version}/`);
}
