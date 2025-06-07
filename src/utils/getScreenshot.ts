export interface ScreenshotOptions {
  videoId: string
  timestamp: number // 时间戳（秒）
}

export async function getScreenshot(options: ScreenshotOptions): Promise<string> {
  const { videoId, timestamp } = options

  // YouTube缩略图URL模式
  // 注意：YouTube不直接支持任意时间戳的缩略图，这里提供几种可用的缩略图选项
  
  // 对于特定时间戳，我们可以使用YouTube的img.youtube.com服务
  // 但这个服务通常只提供预设的缩略图（开始、中间、结束等）
  
  // 这里我们提供几种不同质量的缩略图URL
  const thumbnailUrls = {
    // 高质量缩略图
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    // 标准质量缩略图
    hq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    // 中等质量缩略图
    mq: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    // 默认缩略图
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
  }

  // 尝试获取最高质量的缩略图
  for (const [quality, url] of Object.entries(thumbnailUrls)) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) {
        console.log(`Using ${quality} quality thumbnail for video ${videoId} at ${timestamp}s`)
        return url
      }
    } catch (error) {
      console.warn(`Failed to check ${quality} quality thumbnail:`, error)
    }
  }

  // 如果所有尝试都失败，返回默认缩略图
  return thumbnailUrls.default
}

// 获取视频的多个预设截图
export async function getVideoThumbnails(videoId: string): Promise<Record<string, string>> {
  const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default']
  const thumbnails: Record<string, string> = {}

  for (const quality of qualities) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) {
        thumbnails[quality] = url
      }
    } catch (error) {
      console.warn(`Failed to get ${quality} thumbnail:`, error)
    }
  }

  return thumbnails
}

// 格式化时间戳为人类可读格式
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
} 