# 发布前检查清单

## 功能测试

- [x] `video-summary --help` - 显示帮助信息
- [x] `vs --help` - 简短命令工作正常
- [x] `video-summary` - 无参数时显示帮助
- [x] `video-summary --token-stats` - Token统计功能
- [x] `video-summary --reset-token-stats` - 重置统计功能
- [x] `video-summary --unknown-option` - 错误处理正常
- [ ] `video-summary "https://www.youtube.com/watch?v=dQw4w9WgXcQ"` - 实际视频处理（需要API Key）

## 构建检查

- [x] `npm run build` - 构建成功
- [x] `dist/cli.js` - CLI文件存在且有正确的shebang
- [x] `dist/index.js` - 库文件存在
- [x] `dist/index.mjs` - ESM版本存在
- [x] `dist/index.d.ts` - TypeScript声明文件存在

## 包配置检查

- [x] `package.json` - 包名改为 `video-summary`
- [x] `package.json` - bin 配置正确（video-summary 和 vs）
- [x] `package.json` - files 字段包含必要文件
- [x] `package.json` - 版本号合适
- [x] `package.json` - 描述信息准确
- [x] `package.json` - keywords 相关
- [x] `package.json` - engines 指定 Node.js >= 16

## 文档检查

- [x] `README.md` - 更新为全局CLI工具说明
- [x] `INSTALL.md` - 安装指南完整
- [x] 帮助信息 - 命令行帮助信息准确

## 本地测试

- [x] `npm link` - 本地链接成功
- [x] 全局命令可用
- [x] 参数解析正确
- [x] 错误处理正常

## 发布准备

- [ ] 更新版本号：`npm version patch/minor/major`
- [ ] 确认 Git 仓库干净：`git status`
- [ ] 推送到远程仓库：`git push && git push --tags`
- [ ] 发布到 npm：`npm publish`

## 发布后验证

- [ ] 从 npm 安装：`npm install -g video-summary`
- [ ] 验证命令可用：`video-summary --help`
- [ ] 测试实际功能
- [ ] 检查 npm 页面信息正确

## 发布命令

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: convert to global CLI tool"

# 2. 更新版本（选择一个）
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0

# 3. 推送到远程
git push && git push --tags

# 4. 发布到 npm
npm publish

# 5. 验证安装
npm install -g video-summary
video-summary --help
```

## 注意事项

1. 确保有有效的 npm 账户并已登录：`npm whoami`
2. 如果是第一次发布，可能需要验证邮箱
3. 包名 `video-summary` 需要在 npm 上可用
4. 确保 OpenAI API Key 环境变量已设置用于测试
5. 考虑先发布为 beta 版本：`npm publish --tag beta` 