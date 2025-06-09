import { VideoSupport } from './videoSupport'
import { VideoData, VideoPlatform } from '../../types'
import { getSubtitles } from '../getSubtitles'

/**
 * YouTube平台适配器
 * 重构现有的YouTube功能以符合新的架构
 */
export class YouTubeAdapter implements VideoSupport {
  readonly platform: VideoPlatform = 'youtube'

  canHandle(url: string): boolean {
    // 支持多种YouTube URL格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=)/,
      /(?:youtu\.be\/)/,
      /(?:youtube\.com\/embed\/)/,
      /(?:youtube\.com\/v\/)/,
      /(?:youtube\.com\/watch\?.*&v=)/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }

  extractVideoId(url: string): string {
    // 支持多种YouTube URL格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    throw new Error(`Invalid YouTube URL: ${url}`)
  }

  async getVideoData(videoId: string): Promise<VideoData> {
    try {
      // 重用现有的getSubtitles函数
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
      const videoInfo = await getSubtitles(videoUrl)
      
      return {
        title: videoInfo.title,
        duration: videoInfo.actualDuration || 0,
        subtitles: videoInfo.subtitles,
        metadata: {
          channelName: undefined // TODO: 从videoInfo中提取频道信息
        }
      }
    } catch (error) {
      throw new Error(`Failed to get YouTube video data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  getScreenshotUrl(videoId: string, timestamp: number): string {
    // YouTube提供的缩略图API
    // 注意：YouTube的缩略图是静态的，不是特定时间戳的截图
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  generateTimestampUrl(videoId: string, timestamp: number): string {
    const timeInSeconds = Math.floor(timestamp)
    return `https://www.youtube.com/watch?v=${videoId}&t=${timeInSeconds}s`
  }
} 