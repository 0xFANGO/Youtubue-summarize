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
  }
): SegmentGroup[] {
  if (!subtitles || subtitles.length === 0) {
    return []
  }

  const minSegmentSeconds = options.minSegmentMinutes * 60
  const maxSegmentSeconds = options.maxSegmentMinutes * 60
  const maxWordsPerSegment = options.maxWordsPerSegment || 800 // 默认最大800词

  const segments: SegmentGroup[] = []
  let currentSegment: SegmentGroup = {
    start: subtitles[0].start,
    end: subtitles[0].end,
    text: subtitles[0].text,
    subtitleCount: 1
  }

  for (let i = 1; i < subtitles.length; i++) {
    const subtitle = subtitles[i]
    const currentDuration = currentSegment.end - currentSegment.start
    const currentWordCount = currentSegment.text.split(/\s+/).length

    // 检查是否应该开始新段落
    const shouldStartNewSegment = 
      currentDuration >= maxSegmentSeconds || // 超过最大时长
      currentWordCount >= maxWordsPerSegment || // 超过最大词数
      (currentDuration >= minSegmentSeconds && detectTopicChange(currentSegment.text, subtitle.text)) // 超过最小时长且检测到话题变化

    if (shouldStartNewSegment) {
      // 保存当前段落
      segments.push({ ...currentSegment })
      
      // 开始新段落
      currentSegment = {
        start: subtitle.start,
        end: subtitle.end,
        text: subtitle.text,
        subtitleCount: 1
      }
    } else {
      // 继续当前段落
      currentSegment.text += ' ' + subtitle.text
      currentSegment.end = subtitle.end
      currentSegment.subtitleCount += 1
    }
  }

  // 添加最后一个段落
  if (currentSegment.text.trim()) {
    segments.push(currentSegment)
  }

  return segments
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