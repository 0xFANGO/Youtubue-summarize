import { SubtitleSegment } from '../types'

export interface SegmentGroup {
  start: number
  end: number
  text: string
  subtitleCount: number
}

/**
 * 智能分段函数：基于内容相关性和时间长度进行分段
 */
export function smartSegmentation(
  subtitles: SubtitleSegment[],
  options: {
    minSegmentMinutes: number
    maxSegmentMinutes: number
    maxWordsPerSegment?: number
    videoDuration?: number  // 添加视频总时长参数
  }
): SegmentGroup[] {
  console.log(`🔍 分段函数调用 - 字幕数量: ${subtitles?.length || 0}`)
  
  // 🚀 修复：即使没有字幕，也要基于时间创建分段
  if (!subtitles || subtitles.length === 0) {
    console.log('⚠️ 字幕为空，使用时间基分段策略')
    
    // 如果有视频时长信息，创建基于时间的分段
    if (options.videoDuration && options.videoDuration > 0) {
      const avgSegmentMinutes = (options.minSegmentMinutes + options.maxSegmentMinutes) / 2
      const segmentSeconds = avgSegmentMinutes * 60
      const segments: SegmentGroup[] = []
      
      let currentStart = 0
      while (currentStart < options.videoDuration) {
        const currentEnd = Math.min(currentStart + segmentSeconds, options.videoDuration)
        
        segments.push({
          start: currentStart,
          end: currentEnd,
          text: `视频片段 ${Math.floor(currentStart/60)}:${String(Math.floor(currentStart%60)).padStart(2, '0')} - ${Math.floor(currentEnd/60)}:${String(Math.floor(currentEnd%60)).padStart(2, '0')} (无字幕)`,
          subtitleCount: 0
        })
        
        currentStart = currentEnd
      }
      
      console.log(`✅ 基于时间创建了 ${segments.length} 个分段`)
      return segments
    }
    
    return []
  }

  const minSegmentSeconds = options.minSegmentMinutes * 60
  const maxSegmentSeconds = options.maxSegmentMinutes * 60
  const maxWordsPerSegment = options.maxWordsPerSegment || 800 // 默认最大800词

  console.log(`📋 分段参数 - 最小: ${minSegmentSeconds}s, 最大: ${maxSegmentSeconds}s, 最大词数: ${maxWordsPerSegment}`)

  const segments: SegmentGroup[] = []
  
  // 🚀 修复：确保第一个字幕有有效文本
  let firstValidSubtitle = subtitles.find(subtitle => subtitle.text && subtitle.text.trim().length > 0)
  if (!firstValidSubtitle) {
    console.log('⚠️ 没有找到有效字幕文本')
    
    // 创建一个基于整个视频的分段
    const totalDuration = Math.max(
      ...subtitles.map(s => s.end),
      options.videoDuration || 0
    )
    
    if (totalDuration > 0) {
      return [{
        start: 0,
        end: totalDuration,
        text: '视频内容 (字幕无效)',
        subtitleCount: subtitles.length
      }]
    }
    
    return []
  }

  let currentSegment: SegmentGroup = {
    start: firstValidSubtitle.start,
    end: firstValidSubtitle.end,
    text: firstValidSubtitle.text.trim(),
    subtitleCount: 1
  }

  const firstValidIndex = subtitles.indexOf(firstValidSubtitle)
  
  for (let i = firstValidIndex + 1; i < subtitles.length; i++) {
    const subtitle = subtitles[i]
    
    // 跳过空字幕
    if (!subtitle.text || subtitle.text.trim().length === 0) {
      continue
    }
    
    const currentDuration = currentSegment.end - currentSegment.start
    const currentWordCount = currentSegment.text.split(/\s+/).filter(word => word.length > 0).length

    console.log(`📊 当前段落状态: ${currentDuration.toFixed(1)}s, ${currentWordCount}词, ${currentSegment.subtitleCount}条字幕`)

    // 检查是否应该开始新段落
    const shouldStartNewSegment = 
      currentDuration >= maxSegmentSeconds || // 超过最大时长
      currentWordCount >= maxWordsPerSegment || // 超过最大词数
      (currentDuration >= minSegmentSeconds && detectTopicChange(currentSegment.text, subtitle.text)) // 超过最小时长且检测到话题变化

    if (shouldStartNewSegment) {
      // 保存当前段落
      console.log(`🔄 创建新段落: ${formatTime(currentSegment.start)} - ${formatTime(currentSegment.end)} (${currentDuration.toFixed(1)}s, ${currentWordCount}词)`)
      segments.push({ ...currentSegment })
      
      // 开始新段落
      currentSegment = {
        start: subtitle.start,
        end: subtitle.end,
        text: subtitle.text.trim(),
        subtitleCount: 1
      }
    } else {
      // 继续当前段落
      currentSegment.text += ' ' + subtitle.text.trim()
      currentSegment.end = subtitle.end
      currentSegment.subtitleCount += 1
    }
  }

  // 🚀 修复：确保总是添加最后一个段落
  if (currentSegment.text.trim().length > 0) {
    console.log(`🔄 添加最后段落: ${formatTime(currentSegment.start)} - ${formatTime(currentSegment.end)}`)
    segments.push(currentSegment)
  }

  // 🚀 修复：如果还是没有分段，强制创建一个包含所有内容的分段
  if (segments.length === 0 && subtitles.length > 0) {
    console.log('⚠️ 分段结果为空，强制创建单一分段')
    
    const allText = subtitles
      .filter(s => s.text && s.text.trim().length > 0)
      .map(s => s.text.trim())
      .join(' ')
    
    if (allText.length > 0) {
      segments.push({
        start: subtitles[0].start,
        end: subtitles[subtitles.length - 1].end,
        text: allText,
        subtitleCount: subtitles.length
      })
    }
  }

  console.log(`✅ 智能分段完成，创建了 ${segments.length} 个分段`)
  return segments
}

/**
 * 格式化时间显示
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 检测话题变化的简单启发式方法
 */
function detectTopicChange(currentText: string, newText: string): boolean {
  // 获取最近的文本用于比较（最后200个字符）
  const recentText = currentText.slice(-200).toLowerCase()
  const newTextLower = newText.toLowerCase()

  // 话题变化的信号词
  const transitionSignals = [
    'now', 'next', 'let me', 'moving on', 'another', 'also', 'furthermore',
    'however', 'but', 'on the other hand', 'meanwhile', 'in contrast',
    'so', 'therefore', 'as a result', 'consequently',
    'first', 'second', 'third', 'finally', 'lastly',
    '现在', '接下来', '然后', '另外', '此外', '但是', '然而', '同时', '因此', '所以',
    '首先', '其次', '第一', '第二', '第三', '最后', '总之'
  ]

  // 检查是否包含话题转换信号
  const hasTransitionSignal = transitionSignals.some(signal => 
    newTextLower.includes(signal)
  )

  if (hasTransitionSignal) {
    return true
  }

  // 简单的关键词重叠检测
  const recentWords = new Set(recentText.split(/\s+/).filter(word => word.length > 3))
  const newWords = new Set(newTextLower.split(/\s+/).filter(word => word.length > 3))
  
  // 计算重叠率
  const intersection = new Set([...recentWords].filter(word => newWords.has(word)))
  const overlapRatio = intersection.size / Math.max(recentWords.size, 1)

  // 如果重叠率低于30%，可能是话题变化
  return overlapRatio < 0.3
}

/**
 * 基于时间的简单分段（备用方法）
 */
export function timeBasedSegmentation(
  subtitles: SubtitleSegment[],
  segmentMinutes: number
): SegmentGroup[] {
  if (!subtitles || subtitles.length === 0) {
    return []
  }

  const segmentSeconds = segmentMinutes * 60
  const segments: SegmentGroup[] = []
  
  let currentSegment: SegmentGroup = {
    start: subtitles[0].start,
    end: subtitles[0].end,
    text: subtitles[0].text,
    subtitleCount: 1
  }

  for (let i = 1; i < subtitles.length; i++) {
    const subtitle = subtitles[i]
    
    // 如果当前字幕的开始时间超过了当前段的开始时间 + 段长度，开始新段
    if (subtitle.start >= currentSegment.start + segmentSeconds) {
      segments.push({ ...currentSegment })
      
      currentSegment = {
        start: subtitle.start,
        end: subtitle.end,
        text: subtitle.text,
        subtitleCount: 1
      }
    } else {
      currentSegment.text += ' ' + subtitle.text
      currentSegment.end = subtitle.end
      currentSegment.subtitleCount += 1
    }
  }

  if (currentSegment.text.trim()) {
    segments.push(currentSegment)
  }

  return segments
}

/**
 * 验证分段结果
 */
export function validateSegments(segments: SegmentGroup[]): string[] {
  const errors: string[] = []

  segments.forEach((segment, index) => {
    if (segment.start < 0) {
      errors.push(`段落 ${index + 1}: 开始时间不能为负数`)
    }
    if (segment.end <= segment.start) {
      errors.push(`段落 ${index + 1}: 结束时间必须大于开始时间`)
    }
    if (!segment.text || segment.text.trim().length === 0) {
      errors.push(`段落 ${index + 1}: 文本内容不能为空`)
    }
    if (segment.subtitleCount <= 0) {
      errors.push(`段落 ${index + 1}: 字幕数量必须大于0`)
    }
  })

  // 检查时间段重叠
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].end > segments[i + 1].start) {
      errors.push(`段落 ${i + 1} 和 ${i + 2}: 时间段重叠`)
    }
  }

  return errors
} 