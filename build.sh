#!/bin/bash
# 如果还没有安装依赖
npm install

# 编译 TypeScript 代码
npm run compile

# 打包插件（会生成 .vsix 文件）
npx vsce package

