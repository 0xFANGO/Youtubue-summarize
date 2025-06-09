import { platformRegistry } from './platformRegistry'
import { VideoData, PlatformDetectionResult } from '../types'

/**
 * 统一的视频数据获取接口
 * 支持多平台视频数据获取
 */
export async function getVideoData(platformInfo: PlatformDetectionResult): Promise<VideoData> {
  try {
    const adapter = platformRegistry.getAdapter(platformInfo.platform)
    const videoData = await adapter.getVideoData(platformInfo.videoId)
    
    console.log(`✅ 成功获取${platformInfo.platform}视频数据: ${videoData.title}`)
    console.log(`   视频时长: ${Math.floor(videoData.duration / 60)}分${videoData.duration % 60}秒`)
    console.log(`   字幕段数: ${videoData.subtitles.length}`)
    
    return videoData
  } catch (error) {
    console.error(`❌ 获取视频数据失败:`, error)
    throw new Error(`Failed to get video data for ${platformInfo.platform}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 直接从URL获取视频数据（便捷方法）
 */
export async function getVideoDataFromUrl(url: string): Promise<VideoData & { platform: string; videoId: string }> {
  const platformInfo = platformRegistry.getPlatformInfo(url)
  const videoData = await getVideoData(platformInfo)
  
  return {
    ...videoData,
    platform: platformInfo.platform,
    videoId: platformInfo.videoId
  }
}

/**
 * 获取视频截图URL
 */
export function getVideoScreenshot(platform: string, videoId: string, timestamp: number): string {
  try {
    const adapter = platformRegistry.getAdapter(platform)
    return adapter.getScreenshotUrl(videoId, timestamp)
  } catch (error) {
    console.warn(`警告: 无法获取${platform}平台的截图:`, error)
    return '' // 返回空字符串作为fallback
  }
}

/**
 * 生成带时间戳的视频链接
 */
export function generateVideoTimestampUrl(platform: string, videoId: string, timestamp: number): string {
  try {
    const adapter = platformRegistry.getAdapter(platform)
    return adapter.generateTimestampUrl(videoId, timestamp)
  } catch (error) {
    console.warn(`警告: 无法生成${platform}平台的时间戳链接:`, error)
    return '' // 返回空字符串作为fallback
  }
} 