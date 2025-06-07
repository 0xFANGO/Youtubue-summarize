# YouTube Summarizer - 工具函数

本目录包含YouTube Summarizer项目的所有工具函数。这些函数专门设计用于处理YouTube视频分析和总结任务。

## 工具函数概览

### 1. LLM调用 (`callLlm.ts`)

**用途**: 调用OpenAI GPT模型进行中文总结任务

**主要函数**:
- `callLlm(prompt: string): Promise<string>` - 发送提示到GPT模型并返回响应

**环境要求**:
- 设置环境变量 `OPENAI_API_KEY`

**使用示例**:
```typescript
import { callLlm } from './utils/callLlm'

const summary = await callLlm('请总结以下内容: ...')
```

### 2. YouTube字幕获取 (`getSubtitles.ts`)

**用途**: 从YouTube视频URL获取字幕数据

**主要函数**:
- `getSubtitles(youtubeUrl: string): Promise<VideoInfo>` - 获取视频字幕信息

**返回数据格式**:
```typescript
interface VideoInfo {
  title: string
  videoId: string
  subtitles: SubtitleSegment[]
}

interface SubtitleSegment {
  start: number  // 开始时间（秒）
  end: number    // 结束时间（秒）
  text: string   // 字幕文本
}
```

**支持的URL格式**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

**使用示例**:
```typescript
import { getSubtitles } from './utils/getSubtitles'

const videoInfo = await getSubtitles('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
console.log(`视频标题: ${videoInfo.title}`)
console.log(`字幕段数: ${videoInfo.subtitles.length}`)
```

### 3. YouTube截图获取 (`getScreenshot.ts`)

**用途**: 获取YouTube视频的缩略图

**主要函数**:
- `getScreenshot(options: ScreenshotOptions): Promise<string>` - 获取视频截图URL
- `getVideoThumbnails(videoId: string): Promise<Record<string, string>>` - 获取多种质量的缩略图
- `formatTimestamp(seconds: number): string` - 格式化时间戳

**使用示例**:
```typescript
import { getScreenshot, formatTimestamp } from './utils/getScreenshot'

const screenshotUrl = await getScreenshot({
  videoId: 'dQw4w9WgXcQ',
  timestamp: 120
})

const timeText = formatTimestamp(120) // "2:00"
```

### 4. 文件系统操作 (`fileSystem.ts`)

**用途**: 处理文件和目录操作

**主要函数**:
- `createDirectory(dirPath: string): Promise<void>` - 创建目录
- `ensureDirectoryExists(dirPath: string): Promise<void>` - 确保目录存在
- `downloadImage(url: string, filePath: string): Promise<void>` - 下载图片
- `writeMarkdown(filePath: string, content: string): Promise<void>` - 写入Markdown文件
- `createOutputStructure(baseDir: string, videoTitle: string)` - 创建输出目录结构
- `sanitizeFileName(fileName: string): string` - 清理文件名中的非法字符

**使用示例**:
```typescript
import { createOutputStructure, writeMarkdown } from './utils/fileSystem'

// 创建输出目录结构
const structure = await createOutputStructure('./output', '我的视频标题')

// 写入Markdown文件
await writeMarkdown(structure.markdownPath, '# 视频总结\n\n...')
```

### 5. Markdown生成 (`markdownGenerator.ts`)

**用途**: 生成格式化的视频总结Markdown内容

**主要函数**:
- `generateVideoSummary(data: VideoSummaryData): string` - 生成完整的视频总结
- `generateSimpleSummary(data: VideoSummaryData): string` - 生成简化版总结
- `generateSummaryTable(segments: SegmentData[]): string` - 生成总结表格
- `generateTimeline(segments: SegmentData[]): string` - 生成时间轴格式
- `validateSegmentData(segments: SegmentData[]): string[]` - 验证段落数据

**数据格式**:
```typescript
interface VideoSummaryData {
  videoTitle: string
  videoId: string
  youtubeUrl: string
  totalDuration?: number
  segments: SegmentData[]
  generatedAt: Date
}

interface SegmentData {
  startTime: number
  endTime: number
  originalText: string
  summary: string
  screenshotUrl?: string
  screenshotPath?: string
}
```

**使用示例**:
```typescript
import { generateVideoSummary } from './utils/markdownGenerator'

const markdownContent = generateVideoSummary({
  videoTitle: '示例视频',
  videoId: 'abc123',
  youtubeUrl: 'https://youtube.com/watch?v=abc123',
  segments: [...],
  generatedAt: new Date()
})
```

## 测试

每个工具函数都有对应的测试文件：

- `callLlm.test.ts` - LLM调用测试
- `getSubtitles.test.ts` - 字幕获取测试
- `fileSystem.test.ts` - 文件系统操作测试

运行测试：
```bash
npm test
```

**注意**: 
- LLM测试需要有效的OpenAI API密钥
- 字幕测试需要网络连接
- 某些测试可能因为YouTube API限制而偶尔失败

## 依赖项

这些工具函数依赖以下npm包：

```json
{
  "dependencies": {
    "openai": "^4.90.0",
    "youtube-transcript": "^1.2.1",
    "axios": "^1.9.0",
    "fs-extra": "^11.3.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4"
  }
}
```

## 错误处理

所有工具函数都包含适当的错误处理：

- **网络错误**: 超时和重试机制
- **文件系统错误**: 权限和路径验证
- **数据验证**: 输入参数验证
- **API错误**: 友好的错误消息

### 6. 智能分段 (`segmentation.ts`)

**用途**: 对视频字幕进行智能分段，基于内容相关性和时间长度

**主要函数**:
- `smartSegmentation(subtitles: SubtitleSegment[], options: SegmentationOptions): SegmentGroup[]` - 智能分段算法
- `validateSegments(segments: SegmentGroup[]): string[]` - 验证分段结果

### 7. 速率限制器 (`rateLimiter.ts`) ⭐ 新增

**用途**: 控制API请求的并发数量和频率，避免触发速率限制

**主要功能**:
- **并发控制**: 限制同时进行的API请求数量
- **智能延迟**: 在请求间添加适当延迟
- **重试机制**: 当遇到速率限制时自动重试
- **多种配置**: 针对不同LLM服务的预设配置

**主要类和函数**:
- `RateLimiter` - 核心速率限制器类
- `callLlmWithRetry(callLlmFn, prompt, maxRetries)` - 带重试机制的LLM调用
- `RATE_LIMIT_CONFIGS` - 常见LLM服务的推荐配置

**使用示例**:
```typescript
import { RateLimiter, callLlmWithRetry, RATE_LIMIT_CONFIGS } from './utils/rateLimiter'

// 创建速率限制器（最多3个并发，间隔1秒）
const rateLimiter = new RateLimiter(3, 1000)

// 使用速率限制器执行LLM调用
const result = await rateLimiter.execute(() => 
  callLlmWithRetry(callLlm, 'your prompt', 3)
)

// 获取当前状态
const status = rateLimiter.getStatus()
console.log(`活跃请求: ${status.activeRequests}/${status.maxConcurrent}`)
console.log(`队列长度: ${status.queueLength}`)
```

**预设配置**:
```typescript
// OpenAI: 3个并发，间隔1秒
// Claude: 2个并发，间隔1.5秒
// Gemini: 5个并发，间隔0.5秒
const config = RATE_LIMIT_CONFIGS.openai
const rateLimiter = new RateLimiter(config.maxConcurrent, config.delayMs)
```

**重试策略**:
- 自动检测速率限制错误（包含 'rate limit' 的错误消息）
- 指数退避策略：1秒 → 2秒 → 4秒
- 其他错误立即抛出，不进行重试

## 最佳实践

1. **环境变量**: 将敏感信息（如API密钥）存储在环境变量中
2. **错误处理**: 总是捕获和处理异常
3. **文件路径**: 使用 `path.join()` 来构建跨平台兼容的路径
4. **异步操作**: 合理使用 `async/await` 和 `Promise`
5. **日志记录**: 在重要操作点添加日志输出
6. **速率限制**: 使用 `RateLimiter` 避免API限制，特别是在批量处理时 