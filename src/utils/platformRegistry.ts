import { VideoSupport } from './adapters/videoSupport'
import { YouTubeAdapter } from './adapters/youtubeAdapter'
import { BilibiliAdapter } from './adapters/bilibiliAdapter'
import { PlatformDetectionResult } from '../types'

/**
 * 平台注册表
 * 管理所有平台适配器，提供统一的平台检测功能
 */
export class PlatformRegistry {
  private adapters: VideoSupport[] = [
    new YouTubeAdapter(),
    new BilibiliAdapter(),
  ]

  /**
   * 检测URL对应的平台并返回适配器
   */
  detectPlatform(url: string): VideoSupport {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        return adapter
      }
    }
    
    throw new Error(`Unsupported platform for URL: ${url}\n` +
      'Supported platforms:\n' +
      '- YouTube: youtube.com, youtu.be\n' +
      '- Bilibili: bilibili.com, b23.tv, BV号, AV号')
  }

  /**
   * 获取平台检测结果
   */
  getPlatformInfo(url: string): PlatformDetectionResult {
    const adapter = this.detectPlatform(url)
    const videoId = adapter.extractVideoId(url)
    
    return {
      platform: adapter.platform,
      videoId,
      originalUrl: url
    }
  }

  /**
   * 根据平台名称获取适配器
   */
  getAdapter(platform: string): VideoSupport {
    const adapter = this.adapters.find(a => a.platform === platform)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`)
    }
    return adapter
  }

  /**
   * 获取所有支持的平台列表
   */
  getSupportedPlatforms(): string[] {
    return this.adapters.map(adapter => adapter.platform)
  }
}

// 导出单例实例
export const platformRegistry = new PlatformRegistry() 