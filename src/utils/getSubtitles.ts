import { Innertube } from 'youtubei.js'

export interface SubtitleSegment {
  start: number
  end: number
  text: string
}

export interface VideoInfo {
  title: string
  videoId: string
  subtitles: SubtitleSegment[]
  actualDuration?: number // 添加真实视频时长
}

// Helper function to parse time string formats like "1:23.456" or "0:01:23"
function parseTimeString(timeStr: string): number {
  if (typeof timeStr !== 'string') return 0
  
  // Remove any non-numeric characters except : and .
  const cleaned = timeStr.replace(/[^\d:.]/g, '')
  const parts = cleaned.split(':')
  
  if (parts.length === 1) {
    // Just seconds with possible decimal
    return parseFloat(parts[0]) || 0
  } else if (parts.length === 2) {
    // MM:SS.sss format
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseFloat(parts[1]) || 0
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    // HH:MM:SS.sss format
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseFloat(parts[2]) || 0
    return hours * 3600 + minutes * 60 + seconds
  }
  
  return 0
}

// Enhanced function to extract timestamp from segment
function extractTimestamp(segment: any): { start: number; end?: number; duration?: number } {
  let start = 0
  let end: number | undefined
  let duration: number | undefined

  // Try various possible timestamp formats
  const possibleStartFields = [
    'start_ms', 'startMs', 'start_time_ms', 'startTimeMs',
    'start', 'startTime', 'start_offset_ms', 'startOffsetMs',
    'begin_time_ms', 'beginTimeMs', 'offset', 'time'
  ]
  
  const possibleEndFields = [
    'end_ms', 'endMs', 'end_time_ms', 'endTimeMs', 
    'end', 'endTime', 'end_offset_ms', 'endOffsetMs'
  ]
  
  const possibleDurationFields = [
    'duration_ms', 'durationMs', 'duration', 'dur'
  ]

  // Try to get start time
  for (const field of possibleStartFields) {
    if (segment[field] !== undefined && segment[field] !== null) {
      const value = segment[field]
      if (typeof value === 'number') {
        // If field name contains 'ms', treat as milliseconds
        start = field.includes('ms') || field.includes('Ms') ? value / 1000 : value
        break
      } else if (typeof value === 'string') {
        start = parseTimeString(value)
        if (start > 0) break
      }
    }
  }

  // Try to get end time
  for (const field of possibleEndFields) {
    if (segment[field] !== undefined && segment[field] !== null) {
      const value = segment[field]
      if (typeof value === 'number') {
        end = field.includes('ms') || field.includes('Ms') ? value / 1000 : value
        break
      } else if (typeof value === 'string') {
        end = parseTimeString(value)
        if (end > 0) break
      }
    }
  }

  // Try to get duration
  for (const field of possibleDurationFields) {
    if (segment[field] !== undefined && segment[field] !== null) {
      const value = segment[field]
      if (typeof value === 'number') {
        duration = field.includes('ms') || field.includes('Ms') ? value / 1000 : value
        break
      }
    }
  }

  return { start, end, duration }
}

export async function getSubtitles(youtubeUrl: string): Promise<VideoInfo> {
  // 从URL中提取视频ID
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL: Could not extract video ID')
  }

  try {
    // 创建 Innertube 实例
    const youtube = await Innertube.create({
      lang: 'zh',
      location: 'CN',
      retrieve_player: false,
    })

    // 获取视频信息
    const info = await youtube.getInfo(videoId)
    
    // 🚀 修复：获取真实视频时长
    let actualDuration: number | undefined
    try {
      const basicInfo = info.basic_info as any
      
      // 方法1: 优先尝试从 end_timestamp 计算视频时长
      if (basicInfo?.end_timestamp && basicInfo?.start_timestamp) {
        const endTime = new Date(basicInfo.end_timestamp)
        const startTime = new Date(basicInfo.start_timestamp)
        if (!isNaN(endTime.getTime()) && !isNaN(startTime.getTime())) {
          actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
          console.log(`✅ 通过时间戳计算视频时长: ${actualDuration}秒 (${Math.floor(actualDuration/60)}分${actualDuration%60}秒)`)
        }
      }
      
      // 方法2: 如果没有start_timestamp，但有end_timestamp和发布时间，尝试估算
      if (!actualDuration && basicInfo?.end_timestamp) {
        const endTime = new Date(basicInfo.end_timestamp)
        if (!isNaN(endTime.getTime()) && basicInfo?.publish_date) {
          const publishTime = new Date(basicInfo.publish_date)
          if (!isNaN(publishTime.getTime())) {
            const diffInSeconds = Math.round((endTime.getTime() - publishTime.getTime()) / 1000)
            // 只有当差值在合理范围内（小于24小时）才使用
            if (diffInSeconds > 0 && diffInSeconds < 86400) {
              actualDuration = diffInSeconds
              console.log(`✅ 通过end_timestamp和发布时间估算视频时长: ${actualDuration}秒`)
            }
          }
        }
      }
      
      // 方法3: 尝试从视频基本信息中的duration字段获取时长
      if (!actualDuration) {
        const duration = basicInfo?.duration
        if (duration) {
          if (typeof duration === 'number') {
            actualDuration = duration
            console.log(`✅ 获取到真实视频时长: ${duration}秒 (${Math.floor(duration/60)}分${duration%60}秒)`)
          } else if (duration.seconds && typeof duration.seconds === 'number') {
            actualDuration = duration.seconds
            console.log(`✅ 获取到真实视频时长: ${duration.seconds}秒 (${Math.floor(duration.seconds/60)}分${duration.seconds%60}秒)`)
          } else if (duration.text && typeof duration.text === 'string') {
            // 解析时长文本格式如 "5:23" 或 "1:23:45"
            const parsedDuration = parseTimeString(duration.text)
            if (parsedDuration > 0) {
              actualDuration = parsedDuration
              console.log(`✅ 解析视频时长文本: ${duration.text} -> ${parsedDuration}秒`)
            }
          }
        }
      }
      
      // 方法4: 如果上面都没获取到，尝试其他可能的字段
      if (!actualDuration) {
        const lengthSeconds = basicInfo?.length_seconds
        if (lengthSeconds && typeof lengthSeconds === 'number') {
          actualDuration = lengthSeconds
          console.log(`✅ 从length_seconds获取视频时长: ${lengthSeconds}秒`)
        }
      }
    } catch (error) {
      console.warn('⚠️ 无法获取真实视频时长，将使用字幕估算:', error)
    }
    
    // 获取字幕数据
    const transcriptData = await info.getTranscript()
    
    // 调试：打印完整的transcript数据结构 (仅在详细模式下)
    if (process.env.DEBUG_SUBTITLES === 'true') {
      console.log('Transcript data structure:', JSON.stringify(transcriptData, null, 2))
    }
    
    if (!transcriptData) {
      throw new Error('No transcript available for this video')
    }

    // 尝试多种可能的数据路径
    let segments: any[] = []
    const data = transcriptData as any // 类型断言以避免编译错误
    
    // 路径1: 原始尝试
    if (data.transcript?.content?.body?.initial_segments) {
      segments = data.transcript.content.body.initial_segments
      if (process.env.DEBUG_SUBTITLES === 'true') {
        console.log('Found segments in path 1:', segments.length)
      }
    }
    // 路径2: 直接在content中
    else if (data.content?.body?.initial_segments) {
      segments = data.content.body.initial_segments
      if (process.env.DEBUG_SUBTITLES === 'true') {
        console.log('Found segments in path 2:', segments.length)
      }
    }
    // 路径3: 在actions中
    else if (data.actions) {
      segments = data.actions
      if (process.env.DEBUG_SUBTITLES === 'true') {
        console.log('Found segments in path 3:', segments.length)
      }
    }
    // 路径4: 直接是数组
    else if (Array.isArray(data)) {
      segments = data
      if (process.env.DEBUG_SUBTITLES === 'true') {
        console.log('Found segments in path 4:', segments.length)
      }
    }
    
    if (segments.length === 0) {
      if (process.env.DEBUG_SUBTITLES === 'true') {
        console.log('Available keys in transcriptData:', Object.keys(data))
      }
      throw new Error('No transcript segments found in any expected location')
    }

    // 调试：查看前几个segment的结构（仅在详细模式下）
    if (process.env.DEBUG_SUBTITLES === 'true') {
      console.log('=== Analyzing segment structures ===')
      for (let i = 0; i < Math.min(3, segments.length); i++) {
        console.log(`Segment ${i} structure:`, JSON.stringify(segments[i], null, 2))
        console.log(`Segment ${i} keys:`, Object.keys(segments[i]))
      }
    }

    // 转换为我们的格式 - 使用增强的时间戳解析
    let cumulativeTime = 0
    const defaultSegmentDuration = 2 // 默认段落持续时间（秒）
    
    const subtitles: SubtitleSegment[] = segments
      .map((segment: any, index: number) => {
        let text = ''
        
        // 尝试获取文本内容
        if (segment.snippet?.text) {
          text = segment.snippet.text
        } else if (segment.text) {
          text = segment.text
        } else if (segment.content) {
          text = segment.content
        } else if (typeof segment === 'string') {
          text = segment
        } else if (segment.transcript_segment?.snippet?.text) {
          text = segment.transcript_segment.snippet.text
        }

        // 使用增强的时间戳提取
        const timing = extractTimestamp(segment)
        let startTime = timing.start
        let endTime = timing.end

        // 如果没有有效的开始时间，使用累积时间
        if (startTime === 0 && index > 0) {
          startTime = cumulativeTime
        }

        // 计算结束时间
        if (!endTime) {
          if (timing.duration) {
            endTime = startTime + timing.duration
          } else {
            // 使用默认持续时间或根据文本长度估算
            const estimatedDuration = Math.max(
              defaultSegmentDuration, 
              Math.min(text.length * 0.05, 10) // 每个字符约50ms，但最多10秒
            )
            endTime = startTime + estimatedDuration
          }
        }

        // 更新累积时间，但限制在合理范围内
        cumulativeTime = Math.max(cumulativeTime, endTime)
        
        // 🚀 修复：更严格的异常时间检测和修复
        const maxReasonableDuration = actualDuration ? actualDuration * 1.5 : 7200 // 如果有真实时长，允许1.5倍误差；否则限制在2小时
        if (cumulativeTime > maxReasonableDuration) {
          if (process.env.DEBUG_SUBTITLES === 'true') {
            console.warn(`⚠️ 异常累积时间检测: ${cumulativeTime}秒，超过合理范围${maxReasonableDuration}秒。重置为基于索引的估算。`)
          }
          // 如果有真实时长，按比例分配；否则每段3秒
          if (actualDuration && segments.length > 0) {
            const averageSegmentDuration = actualDuration / segments.length
            startTime = index * averageSegmentDuration
            endTime = startTime + averageSegmentDuration
          } else {
            startTime = index * 3 // 每个段落3秒
            endTime = startTime + defaultSegmentDuration
          }
          cumulativeTime = endTime
        }

        if (text && startTime !== undefined) {
          return {
            start: startTime,
            end: endTime,
            text: text.trim()
          }
        }

        // 调试：打印无法解析的segment（仅在详细模式下）
        if (process.env.DEBUG_SUBTITLES === 'true' && index < 5) { // 只打印前5个避免日志过多
          console.log(`Could not parse segment ${index}:`, {
            availableKeys: Object.keys(segment),
            timing: timing,
            text: text || 'NO_TEXT_FOUND'
          })
        }
        
        return null
      })
      .filter((item): item is SubtitleSegment => item !== null)

    // 🚀 修复：如果有真实时长，调整字幕时间戳使其不超过视频时长
    if (actualDuration && subtitles.length > 0) {
      const lastSubtitle = subtitles[subtitles.length - 1]
      if (lastSubtitle.end > actualDuration) {
        if (process.env.DEBUG_SUBTITLES === 'true') {
          console.warn(`⚠️ 字幕时长 ${lastSubtitle.end}s 超过视频真实时长 ${actualDuration}s，正在调整...`)
        }
        
        // 按比例缩放所有字幕时间戳
        const scaleFactor = actualDuration / lastSubtitle.end
        subtitles.forEach(subtitle => {
          subtitle.start *= scaleFactor
          subtitle.end *= scaleFactor
        })
        
        if (process.env.DEBUG_SUBTITLES === 'true') {
          console.log(`✅ 已按比例 ${scaleFactor.toFixed(3)} 调整字幕时间戳`)
        }
      }
    }

    // 验证和修复时间重叠问题
    for (let i = 1; i < subtitles.length; i++) {
      if (subtitles[i].start < subtitles[i-1].end) {
        // 修复重叠：将当前段落的开始时间设置为前一段落的结束时间
        subtitles[i].start = subtitles[i-1].end
        // 确保结束时间至少比开始时间晚1秒
        if (subtitles[i].end <= subtitles[i].start) {
          subtitles[i].end = subtitles[i].start + 1
        }
      }
    }

    // 调试：打印时间统计信息（仅在详细模式下）
    if (process.env.DEBUG_SUBTITLES === 'true' && subtitles.length > 0) {
      const estimatedDuration = subtitles[subtitles.length - 1].end
      const finalDuration = actualDuration || estimatedDuration
      
      console.log(`=== 时间分析结果 ===`)
      console.log(`字幕段落总数: ${subtitles.length}`)
      console.log(`真实视频时长: ${actualDuration ? `${actualDuration.toFixed(2)}秒 (${(actualDuration/60).toFixed(2)}分钟)` : '未知'}`)
      console.log(`字幕估算时长: ${estimatedDuration.toFixed(2)}秒 (${(estimatedDuration/60).toFixed(2)}分钟)`)
      console.log(`最终使用时长: ${finalDuration.toFixed(2)}秒 (${(finalDuration/60).toFixed(2)}分钟)`)
      console.log(`第一段: ${subtitles[0].start.toFixed(2)}s - ${subtitles[0].end.toFixed(2)}s`)
      console.log(`最后一段: ${subtitles[subtitles.length-1].start.toFixed(2)}s - ${subtitles[subtitles.length-1].end.toFixed(2)}s`)
      
      // 检查是否所有时间戳都是默认值
      const uniqueStartTimes = new Set(subtitles.map(s => s.start))
      if (uniqueStartTimes.size < subtitles.length * 0.1) {
        console.warn('⚠️ 警告: 大部分段落时间戳相似，时间数据可能不完整')
      }
    }

    // 获取视频标题
    const title = info.basic_info?.title || `Video ${videoId}`

    return {
      title,
      videoId,
      subtitles,
      actualDuration
    }
  } catch (error) {
    throw new Error(`Failed to fetch subtitles: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function extractVideoId(url: string): string | null {
  // 支持多种YouTube URL格式
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}