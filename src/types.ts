export interface SubtitleSegment {
  start: number
  end: number
  text: string
}

export interface ProcessedSegment {
  startTime: number
  endTime: number
  originalText: string
  detailedSummary: string  // 详细分段总结
}

export interface OverallSummary {
  keyPoints: string[]      // 主要观点
  mainTheme: string        // 主题
  conclusion: string       // 结论
  fullSummary: string      // 完整总结
}

// Token使用统计接口
export interface TokenStats {
  totalCalls: number
  totalTokens: number
  totalCost: number
  averageTokensPerCall: number
  callHistory: Array<{
    timestamp: Date
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
    promptPreview: string
  }>
}

// 平台类型定义
export type VideoPlatform = 'youtube' | 'bilibili'

// 平台检测结果
export interface PlatformDetectionResult {
  platform: VideoPlatform
  videoId: string
  originalUrl: string
}

// 平台特定元数据
export interface PlatformMetadata {
  // YouTube特有字段
  channelName?: string
  
  // B站特有字段
  bvid?: string
  aid?: string
  cid?: string
  uploader?: string
  tags?: string[]
}

// 统一的视频数据接口
export interface VideoData {
  title: string
  duration: number
  subtitles: SubtitleSegment[]
  metadata: PlatformMetadata
}

export interface YouTubeSummarizerSharedStore {
  // 用户输入和平台信息
  inputUrl: string                    // 原始输入URL
  platform?: VideoPlatform            // 检测到的平台
  videoId?: string                    // 平台特定的视频ID
  videoTitle?: string
  totalDuration?: number
  
  // 平台特定元数据
  platformMetadata?: PlatformMetadata
  
  // 字幕数据（标准化格式）
  subtitles?: SubtitleSegment[]
  
  // 处理后的分段数据
  segments?: ProcessedSegment[]
  
  // 整体总结
  overallSummary?: OverallSummary
  
  // 输出配置
  outputDir?: string
  markdownPath?: string
  segmentMinutesMin: number // 最小分段时长（分钟）
  segmentMinutesMax: number // 最大分段时长（分钟）
  
  // Obsidian导出配置
  obsidianPath?: string
  obsidianTemplate?: 'standard' | 'minimal' | 'timeline'
  obsidianFolder?: string
  obsidianExportPath?: string // 实际导出的文件路径
  
  // 最终结果
  markdownContent?: string
  
  // Token使用统计
  finalTokenStats?: TokenStats
}

// 为了保持向后兼容，保留原有的QA接口
export interface QASharedStore {
  question?: string
  answer?: string
}
