import * as fs from 'fs'
import * as path from 'path'
import { formatTimestamp } from './getScreenshot'
import { ProcessedSegment, OverallSummary } from '../types'
import { VideoSummaryData } from './markdownGenerator'

// Obsidian特定的标签和格式
export interface ObsidianConfig {
  vaultPath: string
  folderName?: string // 默认为 "YouTube笔记"
  tags?: string[] // 默认为 ['youtube', 'video-summary']
  templateType?: 'standard' | 'minimal' | 'timeline' // 模板类型
}

// 生成Obsidian格式的Markdown
export function generateObsidianMarkdown(data: VideoSummaryData, config: ObsidianConfig): string {
  const { videoTitle, videoId, youtubeUrl, segments, overallSummary, totalDuration, generatedAt } = data
  const tags = config.tags || ['youtube', 'video-summary']
  
  let markdown = ''

  // Obsidian frontmatter（YAML front matter）
  markdown += '---\n'
  markdown += `title: "${videoTitle}"\n`
  markdown += `type: video-summary\n`
  markdown += `video_id: ${videoId}\n`
  markdown += `source: ${youtubeUrl}\n`
  markdown += `created: ${generatedAt.toISOString().split('T')[0]}\n`
  if (totalDuration) {
    markdown += `duration: ${Math.floor(totalDuration/60)}:${String(Math.floor(totalDuration%60)).padStart(2, '0')}\n`
  }
  markdown += `tags: [${tags.join(', ')}]\n`
  markdown += '---\n\n'

  // 模板选择
  switch (config.templateType) {
    case 'minimal':
      return markdown + generateMinimalTemplate(data, youtubeUrl)
    case 'timeline':
      return markdown + generateTimelineTemplate(data, youtubeUrl)
    default:
      return markdown + generateStandardTemplate(data, youtubeUrl)
  }
}

// 标准模板
function generateStandardTemplate(data: VideoSummaryData, youtubeUrl: string): string {
  const { videoTitle, segments, overallSummary, totalDuration } = data
  
  let content = ''
  
  // 视频链接
  content += `# ${videoTitle}\n\n`
  content += `🔗 **[观看视频](${youtubeUrl})**\n\n`
  
  if (totalDuration) {
    content += `⏱️ **时长**: ${Math.floor(totalDuration/60)}分${Math.floor(totalDuration%60)}秒\n\n`
  }

  // 主要内容
  content += `## 📝 核心总结\n\n`
  content += `### 主题\n${overallSummary.mainTheme}\n\n`
  
  content += `### 关键要点\n`
  overallSummary.keyPoints.forEach((point, index) => {
    content += `- ${point}\n`
  })
  content += '\n'

  content += `### 完整总结\n${overallSummary.fullSummary}\n\n`
  
  if (overallSummary.conclusion) {
    content += `### 结论\n${overallSummary.conclusion}\n\n`
  }

  // 时间线
  content += `## ⏰ 时间线\n\n`
  segments.forEach((segment, index) => {
    const timeLink = generateObsidianTimeLink(youtubeUrl, segment.startTime)
    content += `### ${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}\n`
    content += `${timeLink}\n\n`
    content += `${segment.detailedSummary}\n\n`
    content += `---\n\n`
  })

  return content
}

// 极简模板
function generateMinimalTemplate(data: VideoSummaryData, youtubeUrl: string): string {
  const { videoTitle, segments, overallSummary } = data
  
  let content = ''
  content += `# ${videoTitle}\n\n`
  content += `🔗 [观看视频](${youtubeUrl})\n\n`
  
  content += `## 总结\n${overallSummary.fullSummary}\n\n`
  
  content += `## 要点\n`
  overallSummary.keyPoints.forEach(point => {
    content += `- ${point}\n`
  })
  content += '\n'

  return content
}

// 时间轴模板
function generateTimelineTemplate(data: VideoSummaryData, youtubeUrl: string): string {
  const { videoTitle, segments, overallSummary } = data
  
  let content = ''
  content += `# ${videoTitle}\n\n`
  content += `🔗 [观看视频](${youtubeUrl})\n\n`
  
  content += `## 概述\n${overallSummary.fullSummary}\n\n`
  
  content += `## 时间轴\n\n`
  segments.forEach(segment => {
    const timeLink = generateObsidianTimeLink(youtubeUrl, segment.startTime)
    content += `**${formatTimestamp(segment.startTime)}** ${timeLink} - ${segment.detailedSummary}\n\n`
  })

  return content
}

// 生成Obsidian时间戳链接
function generateObsidianTimeLink(youtubeUrl: string, startTime: number): string {
  const normalizedTime = Math.floor(startTime)
  const timeUrl = `${youtubeUrl}&t=${normalizedTime}s`
  return `[⏯️](${timeUrl})`
}

// 导出到Obsidian
export async function exportToObsidian(data: VideoSummaryData, config: ObsidianConfig): Promise<string> {
  // 验证Obsidian路径
  if (!fs.existsSync(config.vaultPath)) {
    throw new Error(`Obsidian仓库路径不存在: ${config.vaultPath}`)
  }

  // 创建文件夹
  const folderName = config.folderName || 'YouTube笔记'
  const targetFolder = path.join(config.vaultPath, folderName)
  
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true })
  }

  // 生成文件名（清理特殊字符）
  const cleanTitle = data.videoTitle
    .replace(/[<>:"/\\|?*]/g, '') // 移除Windows/Mac不支持的字符
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim()
    .substring(0, 100) // 限制长度

  const timestamp = data.generatedAt.toISOString().split('T')[0]
  const fileName = `${cleanTitle} - ${timestamp}.md`
  const filePath = path.join(targetFolder, fileName)

  // 生成Markdown内容
  const markdown = generateObsidianMarkdown(data, config)

  // 写入文件
  fs.writeFileSync(filePath, markdown, 'utf-8')

  return filePath
}

// 获取用户的Obsidian仓库路径
export function detectObsidianVault(): string[] {
  const possiblePaths: string[] = []
  const homeDir = require('os').homedir()

  // 常见的Obsidian仓库位置
  const commonLocations = [
    path.join(homeDir, 'Documents', 'Obsidian'),
    path.join(homeDir, 'ObsidianVault'),
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'iCloud Drive (Archive)', 'Documents'),
    path.join(homeDir, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents')
  ]

  for (const location of commonLocations) {
    if (fs.existsSync(location)) {
      try {
        const items = fs.readdirSync(location, { withFileTypes: true })
        items.forEach(item => {
          if (item.isDirectory()) {
            const vaultPath = path.join(location, item.name)
            // 检查是否是Obsidian仓库（包含.obsidian文件夹）
            const obsidianConfigPath = path.join(vaultPath, '.obsidian')
            if (fs.existsSync(obsidianConfigPath)) {
              possiblePaths.push(vaultPath)
            }
          }
        })
      } catch (error) {
        // 忽略权限错误等
      }
    }
  }

  return possiblePaths
}

// 验证Obsidian仓库
export function validateObsidianVault(vaultPath: string): boolean {
  if (!fs.existsSync(vaultPath)) {
    return false
  }

  const obsidianConfig = path.join(vaultPath, '.obsidian')
  return fs.existsSync(obsidianConfig)
} 