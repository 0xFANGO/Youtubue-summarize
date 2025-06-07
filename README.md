# YouTube 视频总结器

基于 PocketFlow 框架开发的 YouTube 视频智能总结工具，能够自动获取视频字幕，生成中文总结，并提供关键时刻截图。

## ✨ 特性

- 🎬 支持多种 YouTube URL 格式
- 📝 自动获取视频字幕（支持中文/英文）
- 🤖 AI 智能中文总结
- 🖼️ 关键时刻截图获取
- 📋 结构化 Markdown 输出
- ⏱️ 可配置分段时长
- 🔗 支持视频时间戳跳转链接

## 🚀 快速开始

### 环境配置

1. 安装依赖：
```bash
yarn install
# 或
npm install
```

2. 配置 OpenAI API Key：
```bash
export OPENAI_API_KEY="your-api-key-here"
```

或创建 `.env` 文件：
```env
OPENAI_API_KEY=your-api-key-here
```

### 使用方法

#### 命令行使用（推荐）

```bash
# 基本用法
yarn cli "https://www.youtube.com/watch?v=VIDEO_ID"

# 自定义输出目录和分段时长
yarn cli "https://www.youtube.com/watch?v=VIDEO_ID" --output ./my-summaries --segment 3

# 查看帮助
yarn cli --help
```

#### 编程接口

```typescript
import { runYouTubeSummarizer } from './src/index'

async function example() {
  const result = await runYouTubeSummarizer(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    {
      outputDir: './output',
      segmentMinutes: 5
    }
  )
  
  console.log('总结完成！', result.markdownPath)
}
```

## 📊 输出结构

程序会在指定目录下创建以下文件结构：

```
output/
├── 视频标题_时间戳/
│   ├── 视频标题_时间戳_summary.md  # 主要总结文件
│   └── screenshots/               # 截图目录
│       ├── screenshot_0.jpg
│       ├── screenshot_300.jpg
│       └── ...
```

### Markdown 输出格式

- 📋 视频基本信息
- 🗂️ 内容目录（可点击跳转）
- 📝 分段详细总结
- 🖼️ 关键时刻截图
- 🔗 原视频时间戳链接
- 📄 原始字幕内容（折叠显示）

## ⚙️ 配置选项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `outputDir` | 输出目录 | `./output` |
| `segmentMinutes` | 每段时长（分钟） | `5` |

## 🛠️ 开发

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
    └── markdownGenerator.ts # Markdown 生成
```

### 工作流程

1. **FetchSubtitlesNode**: 获取 YouTube 视频字幕和基本信息
2. **ProcessSegmentsBatchNode**: 分段处理字幕，进行 AI 总结
3. **GenerateOutputNode**: 生成 Markdown 文件和组织文件结构

### 运行测试

```bash
yarn test
```

### 代码检查

```bash
yarn lint
```

## 📚 依赖说明

- **pocketflow**: 轻量级 LLM 工作流框架
- **youtube-transcript**: YouTube 字幕获取
- **openai**: OpenAI API 客户端
- **fs-extra**: 增强的文件系统操作
- **axios**: HTTP 请求库

## ⚠️ 注意事项

1. **API Key**: 需要有效的 OpenAI API Key
2. **字幕可用性**: 仅支持有字幕的 YouTube 视频
3. **截图限制**: YouTube 截图为预设缩略图，非实时生成
4. **速率限制**: 请注意 OpenAI API 调用频率限制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License
