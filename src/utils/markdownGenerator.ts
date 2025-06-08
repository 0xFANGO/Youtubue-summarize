import { formatTimestamp } from './getScreenshot'
import { ProcessedSegment, OverallSummary } from '../types'

export interface VideoSummaryData {
  videoTitle: string
  videoId: string
  youtubeUrl: string
  totalDuration?: number
  segments: ProcessedSegment[]
  overallSummary: OverallSummary
  generatedAt: Date
}

// 修复时间戳转换问题的辅助函数
function normalizeTimestamp(timestamp: number): number {
  // 检查时间戳是否异常大（超过合理的视频长度）
  if (timestamp > 14400) { // 超过4小时，对大多数YouTube视频来说不合理
    console.warn(`Abnormal timestamp detected: ${timestamp}s, normalizing by dividing by 60`)
    // 很可能是被错误地乘以了60，直接除以60
    return Math.floor(timestamp / 60)
  }
  
  return Math.floor(timestamp)
}

// 生成完整的Markdown总结内容
export function generateVideoSummary(data: VideoSummaryData): string {
  const { videoTitle, videoId, youtubeUrl, segments, overallSummary, totalDuration, generatedAt } = data

  let markdown = ''

  // 标题和基本信息
  markdown += `# ${videoTitle}\n\n`
  markdown += `**视频链接**: [${youtubeUrl}](${youtubeUrl})\n\n`
  markdown += `**视频ID**: \`${videoId}\`\n\n`
  markdown += `**生成时间**: ${generatedAt.toLocaleString('zh-CN')}\n\n`
  if (totalDuration) {
    markdown += `**视频时长**: ${Math.floor(totalDuration/60)}分${Math.floor(totalDuration%60)}秒\n\n`
  }
  markdown += `**总段数**: ${segments.length}\n\n`

  // 整体总结
  markdown += `## 🎯 视频总结\n\n`
  markdown += `### 主题\n${overallSummary.mainTheme}\n\n`
  
  markdown += `### 主要观点\n`
  overallSummary.keyPoints.forEach((point, index) => {
    markdown += `${index + 1}. ${point}\n`
  })
  markdown += '\n'

  markdown += `### 完整总结\n${overallSummary.fullSummary}\n\n`
  markdown += `### 结论\n${overallSummary.conclusion}\n\n`

  // 目录
  markdown += `## 📋 详细内容目录\n\n`
  segments.forEach((segment, index) => {
    const timeRange = `${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}`
    markdown += `${index + 1}. [${timeRange}](#段落-${index + 1})\n`
  })
  markdown += '\n'

  // 详细内容
  markdown += `## 📝 分段详细总结\n\n`

  segments.forEach((segment, index) => {
    const timeRange = `${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}`
    const normalizedStartTime = normalizeTimestamp(segment.startTime)
    const youtubeTimeLink = `${youtubeUrl}&t=${normalizedStartTime}s`

    markdown += `### 段落 ${index + 1}\n\n`
    markdown += `**时间**: [${timeRange}](${youtubeTimeLink})\n\n`

    // 详细总结内容
    markdown += `**详细总结**:\n\n${segment.detailedSummary}\n\n`

    markdown += `---\n\n`
  })


  return markdown
}

// 生成简化版本的总结
export function generateSimpleSummary(data: VideoSummaryData): string {
  const { videoTitle, youtubeUrl, segments, overallSummary } = data

  let markdown = ''
  markdown += `# ${videoTitle}\n\n`
  markdown += `[观看原视频](${youtubeUrl})\n\n`

  // 简化的整体总结
  markdown += `## 总结\n${overallSummary.fullSummary}\n\n`
  
  markdown += `## 主要观点\n`
  overallSummary.keyPoints.forEach((point, index) => {
    markdown += `${index + 1}. ${point}\n`
  })
  markdown += '\n'

  markdown += `## 分段内容\n\n`
  segments.forEach((segment, index) => {
    const timeRange = `${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}`
    const normalizedStartTime = normalizeTimestamp(segment.startTime)
    const youtubeTimeLink = `${youtubeUrl}&t=${normalizedStartTime}s`

    markdown += `### ${index + 1}. [${timeRange}](${youtubeTimeLink})\n\n`
    markdown += `${segment.detailedSummary}\n\n`
  })

  return markdown
}

// 生成段落总结表格
export function generateSummaryTable(segments: ProcessedSegment[]): string {
  let table = '| 时间段 | 总结 |\n'
  table += '|--------|------|\n'

  segments.forEach((segment) => {
    const timeRange = `${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}`
    // 清理总结中的换行符和表格特殊字符
    const cleanSummary = segment.detailedSummary
      .replace(/\n/g, ' ')
      .replace(/\|/g, '\\|')
      .trim()

    table += `| ${timeRange} | ${cleanSummary} |\n`
  })

  return table
}

// 生成时间轴格式
export function generateTimeline(segments: ProcessedSegment[]): string {
  let timeline = '## 时间轴\n\n'

  segments.forEach((segment) => {
    const startTime = formatTimestamp(segment.startTime)
    timeline += `**${startTime}** - ${segment.detailedSummary}\n\n`
  })

  return timeline
}

// 验证段落数据
export function validateSegmentData(segments: ProcessedSegment[]): string[] {
  const errors: string[] = []

  segments.forEach((segment, index) => {
    if (segment.startTime < 0) {
      errors.push(`段落 ${index + 1}: 开始时间不能为负数`)
    }
    if (segment.endTime <= segment.startTime) {
      errors.push(`段落 ${index + 1}: 结束时间必须大于开始时间`)
    }
    if (!segment.detailedSummary || segment.detailedSummary.trim().length === 0) {
      errors.push(`段落 ${index + 1}: 总结内容不能为空`)
    }
  })

  // 检查时间段重叠
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].endTime > segments[i + 1].startTime) {
      errors.push(`段落 ${i + 1} 和 ${i + 2}: 时间段重叠`)
    }
  }

  return errors
} 