import { VideoData, VideoPlatform } from '../../types'

/**
 * 视频平台支持接口
 * 所有平台适配器都必须实现这个接口
 */
export interface VideoSupport {
  // 平台标识
  readonly platform: VideoPlatform
  
  // 检测是否支持该URL
  canHandle(url: string): boolean
  
  // 提取视频ID
  extractVideoId(url: string): string
  
  // 获取视频基本信息和字幕
  getVideoData(videoId: string): Promise<VideoData>
  
  // 获取截图URL
  getScreenshotUrl(videoId: string, timestamp: number): string
  
  // 生成视频跳转链接（带时间戳）
  generateTimestampUrl(videoId: string, timestamp: number): string
} 