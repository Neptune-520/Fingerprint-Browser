import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const customMsg = process.argv[2];
const commitMsg = customMsg || `release: publish v${version}`;
const tagName = `v${version}`;

console.log(`🚀 正在上传代码到 GitHub 仓库 (当前版本: v${version})...\n`);

try {
  console.log('1. 添加更改到 Git 暂存区 (git add .)');
  execSync('git add .', { cwd: rootDir, stdio: 'inherit' });

  console.log(`2. 提交更改 (git commit -m "${commitMsg}")`);
  try {
    execSync(`git commit -m "${commitMsg}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.log('💡 提示: 没有新更改需要 commit，继续进行后续推送步骤...');
  }

  console.log(`3. 创建/更新本地版本 Tag: ${tagName}`);
  try {
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.log(`💡 提示: 本地已存在 Tag ${tagName}，将强制更新 Tag 指针...`);
    try {
      execSync(`git tag -fa ${tagName} -m "Release ${tagName}"`, { cwd: rootDir, stdio: 'inherit' });
    } catch (errTag) {
      console.log('跳过 Tag 本地覆写');
    }
  }

  console.log('4. 推送到远程 GitHub 仓库 (git push origin main)');
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });

  console.log(`5. 推送 Tag ${tagName} 到远程 GitHub (git push origin ${tagName} --force)`);
  try {
    execSync(`git push origin ${tagName} --force`, { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.log('推到远程 Tag 提示 Warning，继续尝试 push --tags...');
    execSync('git push origin --tags', { cwd: rootDir, stdio: 'inherit' });
  }

  console.log(`\n🎉 成功将代码及 Tag ${tagName} 推送到 GitHub！`);
  console.log('💡 GitHub Actions 将自动接收到推送并开始跨平台构建流程！');
} catch (err) {
  console.error('\n❌ 推送到 GitHub 失败，请检查网络或 Git 配置！');
  process.exit(1);
}
