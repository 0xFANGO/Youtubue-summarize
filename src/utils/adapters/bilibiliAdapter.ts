import { VideoSupport } from './videoSupport'
import { VideoData, VideoPlatform, SubtitleSegment } from '../../types'
import axios from 'axios'

/**
 * B站平台适配器
 * 提供真实的B站视频信息和字幕获取功能
 */
export class BilibiliAdapter implements VideoSupport {
  readonly platform: VideoPlatform = 'bilibili'

  canHandle(url: string): boolean {
    // 支持多种B站URL格式
    const patterns = [
      /bilibili\.com/,
      /b23\.tv/,
      /^BV[0-9A-Za-z]+$/,  // 直接BV号
      /^AV\d+$/i           // 直接AV号
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }

  extractVideoId(url: string): string {
    // 直接是BV号
    if (/^BV[0-9A-Za-z]+$/.test(url)) {
      return url
    }
    
    // 直接是AV号
    if (/^AV\d+$/i.test(url)) {
      return url.toUpperCase()
    }
    
    // 处理b23.tv短链接 - 这里需要实际解析重定向
    if (/b23\.tv/.test(url)) {
      // TODO: 实现短链接解析
      throw new Error('B站短链接支持正在开发中，请使用完整链接或BV号')
    }
    
    // 标准B站链接
    const bvMatch = url.match(/\/video\/(BV[0-9A-Za-z]+)/)
    if (bvMatch) {
      return bvMatch[1]
    }
    
    const avMatch = url.match(/\/video\/(av\d+)/i)
    if (avMatch) {
      return avMatch[1].toUpperCase()
    }
    
    throw new Error(`Invalid Bilibili URL: ${url}`)
  }

  async getVideoData(videoId: string): Promise<VideoData> {
    try {
      console.log(`🔍 正在获取B站视频信息: ${videoId}`)
      
      // 获取视频基本信息
      const videoInfo = await this.getVideoInfo(videoId)
      
      // 获取字幕信息
      const subtitles = await this.getSubtitles(videoId, videoInfo.aid, videoInfo.cid)
      
      console.log(`✅ 成功获取B站视频: ${videoInfo.title}`)
      console.log(`   UP主: ${videoInfo.uploader}`)
      console.log(`   时长: ${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒`)
      console.log(`   字幕段数: ${subtitles.length}`)
      
      const videoData: VideoData = {
        title: videoInfo.title,
        duration: videoInfo.duration,
        subtitles: subtitles,
        metadata: {
          bvid: videoInfo.bvid,
          aid: videoInfo.aid.toString(),
          cid: videoInfo.cid.toString(),
          uploader: videoInfo.uploader,
          tags: videoInfo.tags
        }
      }
      
      return videoData
    } catch (error) {
      console.error(`❌ 获取B站视频数据失败:`, error)
      throw new Error(`Failed to get Bilibili video data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取视频基本信息
   */
  private async getVideoInfo(videoId: string): Promise<{
    title: string
    duration: number
    bvid: string
    aid: number
    cid: number
    uploader: string
    tags: string[]
    description: string
    uploadDate: string
    viewCount: number
    likeCount: number
    coinCount: number
  }> {
    try {
      // 构建API URL，支持BV号和AV号
      let apiUrl: string
      if (videoId.startsWith('BV')) {
        apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`
      } else if (videoId.startsWith('AV')) {
        const aid = videoId.slice(2) // 去掉AV前缀
        apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`
      } else {
        throw new Error(`不支持的视频ID格式: ${videoId}`)
      }

      console.log(`📡 调用B站API: ${apiUrl}`)
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com/'
        },
        timeout: 10000
      })

      if (response.data.code !== 0) {
        throw new Error(`B站API返回错误: ${response.data.message || '未知错误'}`)
      }

      const data = response.data.data
      
      // 获取第一个分P的CID（用于获取字幕）
      const firstPage = data.pages?.[0]
      if (!firstPage) {
        throw new Error('无法获取视频分P信息')
      }

      return {
        title: data.title || `B站视频 ${videoId}`,
        duration: data.duration || 0,
        bvid: data.bvid,
        aid: data.aid,
        cid: firstPage.cid,
        uploader: data.owner?.name || '未知UP主',
        tags: (data.tag || []).map((tag: any) => tag.tag_name),
        description: data.desc || '',
        uploadDate: new Date(data.pubdate * 1000).toISOString(),
        viewCount: data.stat?.view || 0,
        likeCount: data.stat?.like || 0,
        coinCount: data.stat?.coin || 0
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`视频不存在或已被删除: ${videoId}`)
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接')
        }
      }
      throw error
    }
  }

  /**
   * 获取字幕信息
   */
  private async getSubtitles(videoId: string, aid: number, cid: number): Promise<SubtitleSegment[]> {
    try {
      console.log(`🎬 正在获取字幕信息 aid=${aid}, cid=${cid}`)
      
      // 第一步：获取字幕列表
      const subtitleListUrl = `https://api.bilibili.com/x/player/v2`
      const subtitleListResponse = await axios.get(subtitleListUrl, {
        params: {
          aid: aid,
          cid: cid
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com/'
        },
        timeout: 10000
      })

      console.log(`📊 字幕列表API响应码: ${subtitleListResponse.data.code}`)
      
      if (subtitleListResponse.data.code !== 0) {
        console.warn(`无法获取字幕列表: ${subtitleListResponse.data.message}`)
        console.log(`💡 提示: B站视频可能没有字幕，将创建基于时间的分段`)
        return []
      }

      const subtitleData = subtitleListResponse.data.data?.subtitle
      console.log(`📝 字幕数据结构:`, JSON.stringify(subtitleData, null, 2))
      
      if (!subtitleData?.subtitles || subtitleData.subtitles.length === 0) {
        console.log('📝 该视频没有可用的字幕')
        console.log('💡 提示: 这很常见，系统会自动创建基于时间的分段')
        return []
      }

      // 选择第一个可用的字幕（通常是中文）
      const firstSubtitle = subtitleData.subtitles[0]
      console.log(`📝 找到字幕: ${firstSubtitle.lan_doc} (${firstSubtitle.lan})`)

      // 第二步：获取具体的字幕内容
      const subtitleContentUrl = `https:${firstSubtitle.subtitle_url}`
      console.log(`📡 获取字幕内容: ${subtitleContentUrl}`)
      
      const subtitleContentResponse = await axios.get(subtitleContentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com/'
        },
        timeout: 10000
      })

      const subtitleContent = subtitleContentResponse.data
      if (!subtitleContent?.body || !Array.isArray(subtitleContent.body)) {
        console.warn('字幕内容格式不正确')
        console.log('💡 提示: 字幕数据损坏，将创建基于时间的分段')
        return []
      }

      // 转换字幕格式
      const segments: SubtitleSegment[] = subtitleContent.body.map((item: any) => ({
        start: parseFloat(item.from) || 0,
        end: parseFloat(item.to) || 0,
        text: item.content || ''
      }))

      // 过滤无效字幕段
      const validSegments = segments.filter(segment => 
        segment.text && 
        segment.text.trim().length > 0 &&
        segment.end > segment.start
      )

      console.log(`✅ 成功获取 ${segments.length} 条字幕，其中 ${validSegments.length} 条有效`)
      
      if (validSegments.length === 0) {
        console.log('⚠️ 没有有效的字幕内容，将创建基于时间的分段')
      }
      
      return validSegments

    } catch (error) {
      console.warn(`⚠️ 获取字幕失败，将返回空字幕:`, error)
      console.log('💡 提示: 这是正常情况，系统会自动创建基于时间的分段')
      return []
    }
  }

  getScreenshotUrl(videoId: string, timestamp: number): string {
    // B站没有直接的视频截图API，这里返回视频封面
    // 实际使用中可能需要第三方服务或本地截图方案
    return `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`
  }

  generateTimestampUrl(videoId: string, timestamp: number): string {
    const timeInSeconds = Math.floor(timestamp)
    return `https://www.bilibili.com/video/${videoId}?t=${timeInSeconds}`
  }
} 