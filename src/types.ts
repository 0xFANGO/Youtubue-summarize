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
  screenshotUrl?: string
  screenshotPath?: string
}

export interface OverallSummary {
  keyPoints: string[]      // 主要观点
  mainTheme: string        // 主题
  conclusion: string       // 结论
  fullSummary: string      // 完整总结
}

export interface YouTubeSummarizerSharedStore {
  // 用户输入和视频基本信息
  youtubeUrl: string
  videoId?: string
  videoTitle?: string
  totalDuration?: number
  
  // 字幕数据
  subtitles?: SubtitleSegment[]
  
  // 处理后的分段数据
  segments?: ProcessedSegment[]
  
  // 整体总结
  overallSummary?: OverallSummary
  
  // 输出配置
  outputDir?: string
  screenshotsDir?: string
  markdownPath?: string
  segmentMinutesMin: number // 最小分段时长（分钟）
  segmentMinutesMax: number // 最大分段时长（分钟）
  
  // 最终结果
  markdownContent?: string
}

// 为了保持向后兼容，保留原有的QA接口
export interface QASharedStore {
  question?: string
  answer?: string
}
