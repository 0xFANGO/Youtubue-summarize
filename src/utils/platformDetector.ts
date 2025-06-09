import { platformRegistry } from './platformRegistry'
import { PlatformDetectionResult } from '../types'

/**
 * 检测视频URL的平台信息
 * 这是一个简单的工具函数，供节点使用
 */
export function detectVideoPlatform(url: string): PlatformDetectionResult {
  try {
    return platformRegistry.getPlatformInfo(url)
  } catch (error) {
    throw new Error(`Platform detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 检查URL是否被支持
 */
export function isPlatformSupported(url: string): boolean {
  try {
    platformRegistry.detectPlatform(url)
    return true
  } catch {
    return false
  }
}

/**
 * 获取支持的平台列表
 */
export function getSupportedPlatforms(): string[] {
  return platformRegistry.getSupportedPlatforms()
} 