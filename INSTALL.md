# Video Summary 安装指南

## 全局安装

### 方式一：通过 npm 安装

```bash
npm install -g video-summary
```

### 方式二：通过 yarn 安装

```bash
yarn global add video-summary
```

## 环境配置

安装完成后，需要设置 OpenAI API Key：

### 临时设置（当前会话有效）

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### 永久设置（推荐）

将以下内容添加到你的 shell 配置文件中：

**对于 bash 用户** (`~/.bashrc` 或 `~/.bash_profile`)：
```bash
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**对于 zsh 用户** (`~/.zshrc`)：
```bash
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

## 验证安装

安装完成后，运行以下命令验证：

```bash
# 检查命令是否可用
which video-summary
which vs

# 查看帮助信息
video-summary --help

# 查看版本信息
video-summary --token-stats
```

## 快速开始

```bash
# 基本用法
video-summary "https://www.youtube.com/watch?v=VIDEO_ID"

# 使用简短命令
vs "https://www.youtube.com/watch?v=VIDEO_ID"

# 自定义输出目录
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --output ./my-summaries

# 调整分段时长（更长分段 = 更低成本）
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --segment 10
```

## 故障排除

### 1. 命令找不到

如果安装后提示命令找不到，请检查：

```bash
# 检查 npm 全局 bin 目录是否在 PATH 中
npm config get prefix
echo $PATH
```

如果 npm 全局 bin 目录不在 PATH 中，添加到你的 shell 配置文件：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export PATH="$(npm config get prefix)/bin:$PATH"
```

### 2. 权限错误

如果遇到权限错误，可以：

**方式一：使用 npx（推荐）**
```bash
npx video-summary "https://www.youtube.com/watch?v=VIDEO_ID"
```

**方式二：修复 npm 权限**
```bash
# 设置 npm 全局目录到用户目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 3. API Key 错误

确保 OpenAI API Key 正确设置：

```bash
# 检查环境变量
echo $OPENAI_API_KEY

# 如果为空，重新设置
export OPENAI_API_KEY="your-api-key-here"
```

### 4. Node.js 版本

确保 Node.js 版本 >= 16.0.0：

```bash
node --version
```

如果版本过低，请升级 Node.js。

## 卸载

如果需要卸载：

```bash
# npm 卸载
npm uninstall -g video-summary

# yarn 卸载
yarn global remove video-summary
```

## 从源码安装（开发者）

```bash
# 克隆仓库
git clone https://github.com/your-username/video-summary.git
cd video-summary

# 安装依赖
npm install

# 构建
npm run build

# 本地链接
npm link

# 测试
video-summary --help
```

## 获取帮助

- 查看帮助：`video-summary --help`
- 查看 Token 统计：`video-summary --token-stats`
- 重置统计：`video-summary --reset-token-stats`
- 项目主页：https://github.com/your-username/video-summary
- 问题反馈：https://github.com/your-username/video-summary/issues 