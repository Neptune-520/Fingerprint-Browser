# 🌐 Fingerprint Browser (多隔离环境指纹浏览器)

基于 Electron 31 + Vue 3 + Tailwind CSS 打造的独立多环境指纹浏览器系统。

---

## ✨ 核心特性
- 🔒 **环境隔离**：支持独立的 Session、Cookie、LocalStorage 及代理 IP 设置。
- ⚡ **现代化 UI**：界面精致流畅，支持卡片模式、表格模式与极简工作台。
- 🖥️ **多模式运行**：支持应用内 WebContentsView 标签页模式与独立外置窗口模式。
- 🚀 **基于 GitHub 的在线更新**：集成自动更新与在线升级防护快照。
- 🛡️ **数据快照安全备份**：升级或配置迁移时自动快照，保障账号凭据与环境配置零风险。

---

## 📖 相关文档
- 🛠️ **[开发与发布完整指南 (DEVELOPMENT_GUIDE.md)](DEVELOPMENT_GUIDE.md)**：包含调试、EXE 打包（安装版/便携版）、手动发布及 GitHub Actions 自动构建部署。
- 📝 **[版本更新日志 (CHANGELOG.md)](CHANGELOG.md)**：记录各版本的迭代记录与更新细节。

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动热重载本地开发
npm run dev

# 本地打包 EXE (安装版与免安装版)
npm run pack:win
```
