# 🛠️ 指纹浏览器全套开发、调试、打包与 GitHub 自动化发布指南

本文档详细说明了本项目的本地调试、EXE 打包（安装版与免安装版）、GitHub Releases 手动发布以及 GitHub Actions 自动化 CI/CD 构建的全流程。

---

## 目录
1. [本地开发与调试 (Debugging)](#1-本地开发与调试-debugging)
2. [本地打包 EXE（安装版与免安装版）](#2-本地打包-exe安装版与免安装版)
3. [手动发布到 GitHub Releases](#3-手动发布到-github-releases)
4. [配置 GitHub Actions 自动构建与发布](#4-配置-github-actions-自动构建与发布)
5. [常见问题与排错 (Troubleshooting)](#5-常见问题与排错-troubleshooting)

---

## 1. 本地开发与调试 (Debugging)

### 1.1 环境准备
- **Node.js**: v18.0.0 或更高版本
- **包管理器**: npm (随 Node.js 一起安装)

### 1.2 启动开发调试
在项目根目录下打开终端，执行：

```bash
# 启动热重载开发服务器 (Vite 前端 + Electron 主进程)
npm run dev
```

### 1.3 调试技巧
- **渲染进程 (Vue / UI) 调试**：
  - 在应用窗口中按下 `F12` 或 `Ctrl + Shift + I`（Mac 上为 `Cmd + Option + I`）调出 Chrome DevTools。
  - 支持 Vue DevTools 与样式实时修改。
- **内置网页视图 (WebContentsView) 调试**：
  - 在顶部控制导航栏中，点击右侧的 **DevTools (F12)** 按钮，可单独调出当前打开的独立指纹网页的底层 DevTools。
- **主进程 (Electron / Node.js) 调试**：
  - 主进程控制台日志（`console.log('[DEBUG Main] ...')`）直接输出在运行 `npm run dev` 的终端窗口中。

---

## 2. 本地打包 EXE（安装版与免安装版）

项目使用 `electron-builder` 进行封装打包，支持在一键编译中同时生成 **NSIS 自定义路径安装版** 与 **Portable 免安装绿色便携版**。

### 2.1 执行打包命令

```bash
# 前端 Vite 编译 + Electron 自动化打包
npm run pack:win
```

### 2.2 打包产物说明
打包完成后，编译文件将输出至根目录下的 `release/` 文件夹中：

| 产物文件名 | 说明 | 使用场景 |
| :--- | :--- | :--- |
| `FingerprintBrowser-2.0.1-x64.exe` | **NSIS 安装包** | 适合普通用户安装，支持选择安装路径、创建桌面快捷方式 |
| `FingerprintBrowser-2.0.1-x64.exe` (Portable) | **免安装绿色便携版** | 双击直接运行，数据保存在软件同级目录，适合随身 U 盘运行 |
| `latest.yml` | **在线更新元数据文件** | **在线更新核心**，记录版本号、文件哈希 (sha512) 与下载文件名 |
| `FingerprintBrowser-2.0.1-x64.exe.blockmap` | **增量更新块映射表** | 用于静默增量更新下载 |

---

## 3. 手动发布到 GitHub Releases

当您没有配置 GitHub Actions 自动化流程时，可以通过手动上传打包产物完成在线更新部署：

### 3.1 检查 `package.json` 配置
确保 `package.json` 中的 `publish` 信息为您真实的 GitHub 账号与仓库：

```json
"publish": [
  {
    "provider": "github",
    "owner": "Nep_tune520",
    "repo": "Fingerprint_Browser"
  }
]
```

### 3.2 手动上传步骤
1. 打开您的 GitHub 仓库页面：`https://github.com/Nep_tune520/Fingerprint_Browser`
2. 点击右侧栏的 **Releases** -> **Draft a new release**。
3. **Choose a tag**: 输入对应的版本号 Tag（如 `v2.0.1`，需与 `package.json` 中的 `version` 保持一致）。
4. **Release title**: 输入版本标题（例如 `v2.0.1 - 更新底层架构与在线更新功能`）。
5. **Describe this release**: 填写版本更新说明（Release Notes）。
6. **Binaries 文件上传（关键）**：
   将本地 `release/` 目录下的以下文件拖拽上传到附件区：
   - 📄 `latest.yml` *(在线更新必需索引文件)*
   - 📦 `FingerprintBrowser-2.0.1-x64.exe` *(安装包)*
   - 📦 `FingerprintBrowser-2.0.1-x64.exe` *(便携包，可选)*
7. 点击 **Publish release** 正式发布。

发布成功后，已安装旧版本（如 v2.0.0）的客户端点击“检查在线更新”即可自动检索并完成在线升级。

---

## 4. 配置 GitHub Actions 自动构建与发布

通过配置 GitHub Actions，每次推送 git tag（如 `v2.0.1`）时，GitHub 云端服务器会自动帮您编译 Vue、打包 Windows/macOS 可执行文件并自动创建 GitHub Release！

### 4.1 工作流文件结构
项目在 `.github/workflows/build.yml` 中已配置好了多平台 CI/CD 工作流：

```yaml
name: Build & Release Multiplatform

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Vue Front-end
        run: npm run build

      - name: Build & Publish Release to GitHub
        run: npx electron-builder --win nsis portable --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 GitHub 仓库权限配置（只需设置一次）
为了让 GitHub Actions 有权限自动创建 Release：
1. 进入 GitHub 仓库 -> **Settings** -> **Actions** -> **General**。
2. 找到 **Workflow permissions**，勾选 **Read and write permissions**。
3. 点击 **Save** 保存。

### 4.3 自动化触发流程
以后每次准备发布新版本时，只需在本地依次执行命令：

```bash
# 1. 修改 package.json 中的 version 为新版本号（如 2.0.2）
# 2. 提交代码并打上版本号 Tag
git add .
git commit -m "chore: bump version to v2.0.2"
git tag v2.0.2
git push origin main --tags
```

推送成功后，GitHub Actions 会自动触发构建，并在几分钟内完成编译、创建 GitHub Release 及上传 `latest.yml` 与全套 EXE 安装包！

---

## 5. 常见问题与排错 (Troubleshooting)

### Q1: 在线更新报 `404 Not Found` 错误？
- **原因**：GitHub 上尚未发布对应 Tag 的 Release，或者没有上传 `latest.yml`。
- **解决方法**：确保按照 [第3节](#3-手动发布到-github-releases) 或 [第4节](#4-配置-github-actions-自动构建与发布) 发布 Release 并包含 `latest.yml`。

### Q2: 本地打包时提示 `EPERM: operation not permitted` 错误？
- **原因**：Windows 杀毒软件（如 Windows Defender）或已运行的应用进程锁定了 `release/win-unpacked` 目录。
- **解决方法**：关闭正在运行的 `FingerprintBrowser.exe` 进程，删除 `release/` 文件夹后重新运行 `npm run pack:win`。项目中已针对此情况在构建引擎中加入了自动延迟重试机制。

### Q3: 升级时用户数据会丢失吗？
- **回答**：**绝对不会！** 用户的环境、Cookie 及凭据存储在系统的 `%APPDATA%\Fingerprint Browser\` 中。软件在升级覆盖安装前还会自动创建增量快照备份（位于 `backups/update_backup_时间戳/` 目录），确保数据安全无忧。
