# Video Summary - AI-powered YouTube Video Summarizer

一个基于 AI 的 YouTube 视频智能总结命令行工具，能够自动获取视频字幕，生成中文总结，并提供关键时刻截图。

## ✨ 特性

- 🎬 支持多种 YouTube URL 格式
- 📝 自动获取视频字幕（支持中文/英文）
- 🤖 AI 智能中文总结 (已优化成本)
- 🖼️ 关键时刻截图获取
- 📋 结构化 Markdown 输出
- ⏱️ 智能分段算法 (优化后减少60-70%成本)
- 🔗 支持视频时间戳跳转链接
- 💰 成本优化：每次总结约$0.03-0.05 USD
- 🌍 全局命令行工具，可在任何目录使用
- 📝 **新增**: Obsidian 笔记直接导出
- 🐛 **新增**: 可选的详细调试模式

## 🚀 快速开始

### 安装

通过 npm 或 yarn 全局安装：

```bash
# 使用 npm
npm install -g video-summary

# 使用 yarn  
yarn global add video-summary
```

### 环境配置

#### 方式一：全局配置（推荐）

使用内置的配置管理功能，一次设置，全局使用：

```bash
# 设置API密钥（推荐方式）
vs config set-key "your-api-key-here"

# 查看当前配置
vs config show

# 设置默认输出目录（可选）
vs config set-output ~/Downloads/video-summaries

# 设置默认分段时长（可选）
vs config set-segment 8
```

#### 方式二：环境变量

```bash
export OPENAI_API_KEY="your-api-key-here"
```

或在你的 shell 配置文件中添加（`~/.bashrc`, `~/.zshrc`）：
```bash
export OPENAI_API_KEY="your-api-key-here"
```

> **注意**: 环境变量的优先级高于全局配置。如果两者都设置了，将使用环境变量中的API密钥。

### 使用方法

安装完成后，你可以在任何目录下使用以下命令：

#### 配置管理

```bash
# 🆕 一次性设置API密钥，全局使用
vs config set-key "your-api-key-here"

# 查看当前配置状态
vs config show

# 设置默认配置（可选）
vs config set-output ~/Downloads/video-summaries  # 默认输出目录
vs config set-segment 8                          # 默认分段时长

# 重置所有配置
vs config reset
```

#### 视频总结

```bash
# 基本用法（已优化，成本约$0.03-0.05）
video-summary "https://www.youtube.com/watch?v=VIDEO_ID"

# 或使用简短命令
vs "https://www.youtube.com/watch?v=VIDEO_ID"

# 自定义输出目录和分段时长（会覆盖全局配置）
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --output ./my-summaries --segment 5

# 极致省钱模式（更长分段，更低成本）
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --segment 10

# 🆕 导出到 Obsidian（自动检测仓库）
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --obsidian-detect

# 🆕 导出到指定 Obsidian 仓库
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --obsidian "/path/to/your/vault"

# 🆕 使用不同的 Obsidian 模板
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --obsidian-detect --obsidian-template minimal

# 🆕 启用详细调试输出
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --debug

# 禁用Token监控
video-summary "https://www.youtube.com/watch?v=VIDEO_ID" --no-token-monitor

# 查看Token使用统计
video-summary --token-stats

# 重置Token统计
video-summary --reset-token-stats

# 查看帮助
video-summary --help
```

## 📝 Obsidian 集成

### 自动检测 Obsidian 仓库

```bash
# 自动检测并显示所有可用的 Obsidian 仓库
video-summary --obsidian-detect
```

### 导出选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--obsidian <路径>` | 指定 Obsidian 仓库路径 | - |
| `--obsidian-detect` | 自动检测 Obsidian 仓库 | - |
| `--obsidian-template <模板>` | 模板类型：standard/minimal/timeline | standard |
| `--obsidian-folder <文件夹>` | 目标文件夹名称 | YouTube笔记 |

### 模板类型

- **standard**: 完整格式，包含时间轴和详细总结
- **minimal**: 极简格式，只包含核心要点
- **timeline**: 时间轴格式，适合快速浏览

### Obsidian 文件特性

- 📋 YAML front matter 元数据
- 🏷️ 自动标签（youtube, video-summary）
- 🔗 可点击的时间戳链接
- 📁 自动创建文件夹结构
- 🎯 智能文件命名（避免特殊字符）

## 💰 成本优化说明

**最新优化**：系统已进行重大成本优化，具体包括：
- ✅ 使用`gpt-4o-mini`模型，成本降低85%
- ✅ 智能分段算法，减少60%的LLM调用
- ✅ 合并整体总结调用，减少75%的重复上下文
- ✅ 总体成本从 **$0.11** 降低到 **$0.03-0.05** (节省60-70%)

## 📊 输出结构

程序会在指定目录下创建以下文件结构：

```
output/
├── 视频标题_时间戳/
│   ├── 视频标题_时间戳_summary.md  # 主要总结文件
│   ├── token_usage_report.md       # Token使用报告（如果启用监控）
│   └── screenshots/                # 截图目录
│       ├── screenshot_0.jpg
│       ├── screenshot_300.jpg
│       └── ...
```

### Markdown 输出格式

- 📋 视频基本信息
- 🎯 主要主题和关键要点
- 🗂️ 内容目录（可点击跳转）
- 📝 分段详细总结
- 🖼️ 关键时刻截图
- 🔗 原视频时间戳链接
- 📄 原始字幕内容（折叠显示）

## ⚙️ 命令行选项

| 选项 | 简写 | 说明 | 默认值 | 成本影响 |
|------|------|------|--------|---------| 
| `--output` | `-o` | 输出目录 | `./output` | - |
| `--segment` | `-s` | 分段时长（分钟）| `5` | 更大=更省钱 |
| `--obsidian` | - | Obsidian仓库路径 | - | - |
| `--obsidian-detect` | - | 自动检测Obsidian仓库 | - | - |
| `--obsidian-template` | - | Obsidian模板类型 | `standard` | - |
| `--obsidian-folder` | - | Obsidian文件夹名称 | `YouTube笔记` | - |
| `--no-token-monitor` | - | 禁用Token监控 | `false` | - |
| `--save-token-files` | - | 保存Token统计文件 | `false` | - |
| `--debug` | - | 启用详细调试输出 | `false` | - |
| `--token-stats` | - | 显示Token统计 | - | - |
| `--reset-token-stats` | - | 重置Token统计 | - | - |
| `--help` | `-h` | 显示帮助信息 | - | - |

### 成本控制建议

- **极致省钱**: `--segment 10` (约$0.02-0.03)
- **平衡模式**: `--segment 5` (约$0.03-0.05) **推荐**
- **高质量**: `--segment 3` (约$0.05-0.08)

## 🐛 调试模式

启用详细调试输出以排查问题：

```bash
video-summary "URL" --debug
```

调试模式会显示：
- 字幕解析详细过程
- 时间戳修复信息
- 段落结构分析
- 异常检测和修复过程

## 🔧 开发者使用

如果你想将此工具作为库使用：

```bash
npm install video-summary
```

```typescript
import { runYouTubeSummarizer } from 'video-summary'

async function example() {
  const result = await runYouTubeSummarizer(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    {
      outputDir: './output',
      segmentMinutesMin: 4,
      segmentMinutesMax: 6,
      enableTokenMonitoring: true,
      // 🆕 Obsidian 导出选项
      obsidianPath: '/path/to/your/vault',
      obsidianTemplate: 'minimal',
      obsidianFolder: 'AI笔记'
    }
  )
  
  console.log('总结完成！', result.markdownPath)
  if (result.obsidianExportPath) {
    console.log('Obsidian文件：', result.obsidianExportPath)
  }
}
```

## 📈 性能对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| LLM调用次数 | 20次 | 6-8次 | ↓60-65% |
| Token使用 | 28,833 | 10,000-15,000 | ↓45-65% |
| 总成本 | $0.1125 | $0.03-0.05 | ↓60-70% |
| 处理时间 | 78秒 | 35-45秒 | ↓40-50% |
| 调试输出 | 大量无用信息 | 可选详细模式 | ↓90% |

## 🛠️ 从源码构建

如果你想从源码构建或开发：

```bash
# 克隆仓库
git clone https://github.com/your-username/video-summary.git
cd video-summary

# 安装依赖
npm install

# 构建
npm run build

# 本地链接（用于开发测试）
npm link
```

### 项目结构

```
src/
├── index.ts           # 主入口文件
├── cli.ts            # 命令行接口
├── flow.ts           # 工作流定义
├── nodes.ts          # 处理节点实现
├── types.ts          # 类型定义
└── utils/            # 工具函数
    ├── callLlm.ts          # LLM 调用
    ├── getSubtitles.ts     # 字幕获取
    ├── getScreenshot.ts    # 截图获取
    ├── fileSystem.ts       # 文件操作
    ├── tokenMonitor.ts     # Token监控
    ├── segmentation.ts     # 智能分段
    ├── markdownGenerator.ts # Markdown 生成
    └── obsidianExporter.ts  # 🆕 Obsidian 导出
```

## ⚠️ 注意事项

1. **Node.js 版本**: 需要 Node.js 16.0.0 或更高版本
2. **API Key**: 需要有效的 OpenAI API Key
3. **Obsidian 集成**: 需要安装 Obsidian 应用并创建至少一个仓库
4. **调试模式**: 仅在遇到问题时启用，会产生大量输出

## 🆕 更新日志

### v0.3.0 (最新)
- 🎉 **新增全局配置管理系统**
  - ✅ 一次性设置API密钥，全局使用 (`vs config set-key`)
  - ✅ 支持默认输出目录和分段时长配置
  - ✅ 配置状态查看和管理 (`vs config show`)
  - ✅ 智能优先级：环境变量 > 全局配置
- ✅ 优化错误提示，指导用户使用配置命令
- ✅ 改善用户体验，减少重复配置工作

### v0.2.0
- ✅ 新增 Obsidian 笔记直接导出功能
- ✅ 新增自动检测 Obsidian 仓库功能
- ✅ 新增三种 Obsidian 模板（标准/极简/时间轴）
- ✅ 新增可选的详细调试模式
- ✅ 大幅减少无用的调试输出
- ✅ 优化用户体验和错误提示

### v0.1.0
- ✅ 基础 YouTube 视频总结功能
- ✅ Token 使用监控和成本优化
- ✅ 智能分段算法
- ✅ Markdown 输出格式

## 📞 支持

如果遇到问题或有功能建议，请：

1. 首先尝试使用 `--debug` 模式查看详细信息
2. 检查 Obsidian 仓库路径是否正确（使用 `--obsidian-detect`）
3. 确认 OpenAI API Key 设置正确
4. 提交 Issue 到 GitHub 仓库

## 📄 许可证

MIT License - 详见 LICENSE 文件
3. **字幕可用性**: 仅支持有字幕的 YouTube 视频
4. **截图限制**: YouTube 截图为预设缩略图，非实时生成
5. **速率限制**: 已内置速率限制和重试机制
6. **成本监控**: 建议启用token监控查看实际成本

## 🐛 故障排除

### 常见问题

1. **命令找不到**: 确保已全局安装且 npm 全局 bin 目录在 PATH 中
2. **API Key 错误**: 
   - 推荐使用 `vs config set-key "your-api-key"` 设置全局配置
   - 或检查环境变量 OPENAI_API_KEY 是否正确设置
   - 使用 `vs config show` 查看当前配置状态
3. **字幕获取失败**: 确认视频有可用字幕（中文或英文）
4. **权限错误**: 确保对输出目录有写入权限

### 调试命令

```bash
# 检查安装
which video-summary
which vs

# 查看版本和帮助
video-summary --help

# 🆕 检查配置状态
vs config show

# 测试Token统计
video-summary --token-stats
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 此仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript) - 轻量级 LLM 工作流框架
- [OpenAI](https://openai.com/) - GPT-4o-mini API
- [youtubei.js](https://github.com/LuanRT/YouTube.js) - YouTube 数据获取
