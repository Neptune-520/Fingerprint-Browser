import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 开始打包 Windows EXE 程序...');
console.log('正在编译前端 Vite 资源并调用 electron-builder 打包...\n');

try {
  execSync('npm run pack:win', { cwd: rootDir, stdio: 'inherit' });
  console.log('\n✅ EXE 打包成功！生成的可执行文件与安装包已放入 release/ 目录。');
} catch (err) {
  console.error('\n❌ 打包过程出现错误，请检查日志！');
  process.exit(1);
}
