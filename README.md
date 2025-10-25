# Script Executor

一个方便快捷的 VSCode 插件，让你在编辑器中快速执行自定义脚本命令。

## 核心特性

### ✨ 开箱即用

插件内置了 **NPM** 和 **Git** 最常用的命令，安装后无需配置即可使用：

**NPM 命令**：
- 安装依赖 (`npm install`)
- 启动项目 (`npm start`)
- 构建项目 (`npm run build`)
- 运行测试 (`npm test`)
- 开发模式 (`npm run dev`)
- 代码检查 (`npm run lint`)

**Git 命令**：
- 查看状态 (`git status`)
- 拉取代码 (`git pull`)
- 推送代码 (`git push`)
- 提交更改 (`git commit`)
- 添加文件 (`git add .`)
- 查看日志 (`git log`)

### 🔍 快速搜索

在脚本列表中直接输入关键词，即时搜索匹配的脚本：
- 支持搜索脚本名称、描述和命令
- 模糊匹配，快速定位
- 大量脚本也能轻松管理

### 🎯 参数化脚本（新功能）

支持为脚本定义可选参数，执行时动态选择：
- **参数定义**：为命令定义多个参数选项
- **交互式选择**：点击脚本后弹出选择框，选择参数值
- **占位符替换**：使用 `{参数名}` 在命令中作为占位符
- **多参数支持**：一个脚本可以定义多个参数

示例配置：
```json
{
  "label": "$(rocket) 启动服务",
  "command": "npm run dev -- --port {port} --mode {mode}",
  "params": [
    {
      "name": "port",
      "label": "端口号",
      "options": [
        { "label": "3000", "value": "3000" },
        { "label": "8080", "value": "8080" }
      ]
    },
    {
      "name": "mode",
      "label": "运行模式",
      "options": [
        { "label": "开发", "value": "development" },
        { "label": "生产", "value": "production" }
      ]
    }
  ]
}
```

### ⚙️ 灵活配置

支持多层配置系统：
- **项目配置文件**：在 `.vscode/scripts.json` 中定义项目专属脚本
- **项目设置**：在 `.vscode/settings.json` 中配置
- **全局配置**：所有项目通用的脚本（如通用的 Git、Docker 命令）
- **智能合并**：自动去重，优先级：项目配置文件 > 项目设置 > 全局配置 > 内置命令

### 🎯 简单易用

- 点击编辑器右上角的终端图标即可打开
- 或使用命令面板搜索"打开脚本执行器"
- 选择脚本，自动在终端中执行

## 快速开始

### 安装

1. 下载 `script-executor-0.0.1.vsix` 文件
2. 在 VSCode 中按 `Cmd/Ctrl + Shift + P`
3. 输入 "Install from VSIX"
4. 选择下载的 `.vsix` 文件
5. 重新加载 VSCode

或者使用命令行安装：

```bash
code --install-extension script-executor-0.0.1.vsix
```

### 使用

1. **使用内置命令**（安装即用）
   - 点击编辑器右上角的终端图标
   - 搜索并选择要执行的命令（如输入 "install"）
   - 命令会在终端中执行

2. **添加自定义脚本**（可选）

   **方式一：使用项目配置文件**（推荐）

   在项目根目录创建 `.vscode/scripts.json`：

   ```json
   {
     "scripts": [
       {
         "label": "$(rocket) 部署到生产",
         "description": "部署到生产环境",
         "command": "./deploy.sh production"
       }
     ]
   }
   ```

   **方式二：使用设置文件**

   在全局设置或项目的 `.vscode/settings.json` 中添加：

   ```json
   {
     "scriptExecutor.scripts": [
       {
         "label": "$(rocket) 部署到生产",
         "description": "部署到生产环境",
         "command": "./deploy.sh production"
       }
     ]
   }
   ```

3. **禁用内置命令**（可选）

   如果只想使用自定义脚本：

   ```json
   {
     "scriptExecutor.enableBuiltinScripts": false
   }
   ```

## 配置示例

### 前端项目

```json
{
  "scriptExecutor.scripts": [
    {
      "label": "$(rocket) 启动开发服务器",
      "description": "运行 Vite 开发服务器",
      "command": "npm run dev"
    },
    {
      "label": "$(tools) 构建生产版本",
      "description": "构建用于生产环境的代码",
      "command": "npm run build"
    },
    {
      "label": "$(eye) 预览生产版本",
      "description": "预览构建后的生产版本",
      "command": "npm run preview"
    }
  ]
}
```

### Docker 项目

```json
{
  "scriptExecutor.scripts": [
    {
      "label": "$(vm) 启动容器",
      "description": "使用 docker-compose 启动所有服务",
      "command": "docker-compose up -d"
    },
    {
      "label": "$(debug-stop) 停止容器",
      "description": "停止所有运行的容器",
      "command": "docker-compose down"
    },
    {
      "label": "$(refresh) 重建容器",
      "description": "重新构建并启动容器",
      "command": "docker-compose up -d --build"
    }
  ]
}
```

## 使用技巧

### 链式命令

```json
{
  "label": "$(rocket) 完整部署",
  "description": "测试、构建并部署",
  "command": "npm test && npm run build && npm run deploy"
}
```

### 环境变量

```json
{
  "label": "$(server) 生产环境启动",
  "description": "在生产模式启动",
  "command": "NODE_ENV=production npm start"
}
```

### 交互式命令

```json
{
  "label": "$(git-commit) Git 提交",
  "description": "交互式 Git 提交",
  "command": "git add . && git commit"
}
```

## 常见问题

### 看不到右上角图标？

完全退出 VSCode（`Cmd/Ctrl + Q`）并重新打开。或者使用命令面板（`Cmd/Ctrl + Shift + P`）搜索"打开脚本执行器"。

### 如何禁用内置命令？

在设置中添加：
```json
{
  "scriptExecutor.enableBuiltinScripts": false
}
```

### 自定义脚本和内置命令的优先级？

优先级顺序：`.vscode/scripts.json` > `.vscode/settings.json` > 全局配置 > 内置命令

如果项目配置中有相同的命令，会覆盖全局配置和内置命令。

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
npx vsce package

# 安装
code --install-extension script-executor-0.0.1.vsix
```

## 更新日志

### v0.0.1

- ✅ 初始版本发布
- ✅ 支持全局配置和项目配置
- ✅ 支持 `.vscode/scripts.json` 项目配置文件
- ✅ 内置 NPM 和 Git 常用命令
- ✅ 支持快速搜索功能
- ✅ 自动去重和智能合并
- ✅ 更换为 shell 脚本主题图标

## License

MIT

---

**祝你使用愉快！** 🎉
