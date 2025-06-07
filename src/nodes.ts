import { Node, BatchNode } from 'pocketflow'
import { callLlm } from './utils/callLlm'
import { getSubtitles } from './utils/getSubtitles'
import { formatTimestamp } from './utils/getScreenshot'
import { createOutputStructure } from './utils/fileSystem'
import { generateVideoSummary } from './utils/markdownGenerator'
import { writeMarkdown } from './utils/fileSystem'
import { smartSegmentation, validateSegments, SegmentGroup } from './utils/segmentation'
import { RateLimiter, callLlmWithRetry, RATE_LIMIT_CONFIGS } from './utils/rateLimiter'
import { YouTubeSummarizerSharedStore, ProcessedSegment, QASharedStore, OverallSummary } from './types'
import * as path from 'path'
import PromptSync from 'prompt-sync'

const prompt = PromptSync()

// YouTube 总结器节点

export class FetchSubtitlesNode extends Node<YouTubeSummarizerSharedStore> {
  async prep(shared: YouTubeSummarizerSharedStore): Promise<string> {
    return shared.youtubeUrl
  }

  async exec(youtubeUrl: string): Promise<{ title: string; videoId: string; subtitles: any[]; duration?: number }> {
    console.log(`正在获取视频字幕: ${youtubeUrl}`)
    const videoInfo = await getSubtitles(youtubeUrl)
    console.log(`成功获取字幕，视频标题: ${videoInfo.title}`)
    
    // 计算总时长
    const totalDuration = videoInfo.subtitles.length > 0 
      ? videoInfo.subtitles[videoInfo.subtitles.length - 1].end
      : 0
    
    return {
      ...videoInfo,
      duration: totalDuration
    }
  }

  async post(
    shared: YouTubeSummarizerSharedStore,
    _: string,
    execRes: { title: string; videoId: string; subtitles: any[]; duration?: number }
  ): Promise<string | undefined> {
    // 写入视频信息到共享存储
    shared.videoTitle = execRes.title
    shared.videoId = execRes.videoId
    shared.subtitles = execRes.subtitles
    shared.totalDuration = execRes.duration

    // 创建输出目录结构，使用视频标题作为主题命名
    const outputStructure = await createOutputStructure(
      shared.outputDir || './output',
      execRes.title,
      execRes.videoId
    )
    shared.outputDir = outputStructure.outputDir
    shared.markdownPath = outputStructure.markdownPath

    console.log(`输出目录已创建: ${shared.outputDir}`)
    console.log(`视频总时长: ${Math.floor((execRes.duration || 0) / 60)}分${Math.floor((execRes.duration || 0) % 60)}秒`)
    return 'default'
  }
}

/**
 * 带速率限制的并行处理段落节点
 * 使用分批并行处理策略避免API速率限制
 */
export class ProcessSegmentsControlledParallelNode extends Node<YouTubeSummarizerSharedStore> {
  private readonly batchSize = 3; // 每批处理3个段落
  private readonly delayBetweenBatches = 2000; // 批次间延迟2秒
  private readonly rateLimiter: RateLimiter;

  constructor() {
    super();
    // 使用默认配置创建速率限制器
    const config = RATE_LIMIT_CONFIGS.default;
    this.rateLimiter = new RateLimiter(config.maxConcurrent, config.delayMs);
  }

  async prep(shared: YouTubeSummarizerSharedStore): Promise<SegmentGroup[]> {
    const subtitles = shared.subtitles || []
    const minSegmentMinutes = shared.segmentMinutesMin || 2  // 最小2分钟
    const maxSegmentMinutes = shared.segmentMinutesMax || 8  // 最大8分钟

    console.log(`开始智能分段，最小时长: ${minSegmentMinutes}分钟，最大时长: ${maxSegmentMinutes}分钟`)

    // 使用智能分段算法
    const segments = smartSegmentation(subtitles, {
      minSegmentMinutes,
      maxSegmentMinutes,
      maxWordsPerSegment: 1000
    })

    // 验证分段结果
    const errors = validateSegments(segments)
    if (errors.length > 0) {
      console.warn('分段验证发现问题:', errors)
    }

    console.log(`智能分段完成，共分成 ${segments.length} 个段落`)
    segments.forEach((segment, index) => {
      const duration = segment.end - segment.start
      console.log(`段落 ${index + 1}: ${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)} (${Math.floor(duration/60)}分${Math.floor(duration%60)}秒, ${segment.subtitleCount}条字幕)`)
    })

    return segments
  }

  async exec(segments: SegmentGroup[]): Promise<ProcessedSegment[]> {
    console.log(`开始分批并行处理 ${segments.length} 个段落 (每批 ${this.batchSize} 个)`)
    const results: ProcessedSegment[] = []
    
    // 分批处理
    for (let i = 0; i < segments.length; i += this.batchSize) {
      const batch = segments.slice(i, i + this.batchSize)
      const batchNumber = Math.floor(i / this.batchSize) + 1
      const totalBatches = Math.ceil(segments.length / this.batchSize)
      
      console.log(`正在处理批次 ${batchNumber}/${totalBatches} (${batch.length} 个段落)`)
      
      // 并行处理当前批次
      const batchResults = await Promise.all(
        batch.map(async (segment, batchIndex) => {
          const globalIndex = i + batchIndex + 1
          console.log(`  处理段落 ${globalIndex}/${segments.length}: ${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}`)
          
          // 使用速率限制器调用LLM
          const detailedSummary = await this.rateLimiter.execute(() =>
            callLlmWithRetry(
              callLlm,
              `请用中文对以下视频片段进行详细总结，要求：

1. 总结要详细而完整，突出这一段的核心内容和要点
2. 使用清晰易懂的中文表达
3. 总结长度控制在200-400字之间
4. 如果内容是英文，请先理解后用中文总结
5. 保持客观准确，不要添加个人观点
6. 如果有具体的数据、名称、时间等，请准确记录

视频片段内容：
${segment.text}

请直接返回详细总结，不要包含其他格式或说明：`
            )
          );
          
          console.log(`  段落 ${globalIndex} 总结完成 (${detailedSummary.length} 字符)`)
          
          return {
            startTime: segment.start,
            endTime: segment.end,
            originalText: segment.text.trim(),
            detailedSummary: detailedSummary.trim()
          }
        })
      )
      
      results.push(...batchResults)
      console.log(`批次 ${batchNumber} 完成`)
      
      // 批次间延迟（除了最后一批）
      if (i + this.batchSize < segments.length) {
        console.log(`等待 ${this.delayBetweenBatches/1000} 秒后处理下一批...`)
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches))
      }
    }
    
    console.log(`所有段落总结完成，共处理 ${results.length} 个段落`)
    return results
  }

  async post(
    shared: YouTubeSummarizerSharedStore,
    segments: SegmentGroup[],
    processedSegments: ProcessedSegment[]
  ): Promise<string | undefined> {
    shared.segments = processedSegments
    console.log(`${processedSegments.length} 个段落处理完成，开始生成整体总结`)
    return 'default'
  }
}

export class GenerateOverallSummaryNode extends Node<YouTubeSummarizerSharedStore> {
  async prep(shared: YouTubeSummarizerSharedStore): Promise<{
    videoTitle: string
    segments: ProcessedSegment[]
    totalDuration: number
  }> {
    return {
      videoTitle: shared.videoTitle!,
      segments: shared.segments!,
      totalDuration: shared.totalDuration || 0
    }
  }

  async exec(data: {
    videoTitle: string
    segments: ProcessedSegment[]
    totalDuration: number
  }): Promise<OverallSummary> {
    console.log('正在生成整体总结...')
    
    // 准备所有分段总结
    const allSegmentSummaries = data.segments.map((segment, index) => {
      const timeRange = `${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}`
      return `段落${index + 1} (${timeRange}): ${segment.detailedSummary}`
    }).join('\n\n')

    // 生成主要观点
    const keyPointsPrompt = `基于以下视频的分段总结，提取3-5个主要观点，要求：
1. 每个观点简洁明了，1-2句话
2. 涵盖视频的核心内容
3. 按重要性排序
4. 用中文表达

视频标题：${data.videoTitle}

分段总结：
${allSegmentSummaries}

请只返回观点列表，每行一个观点，以"- "开头：`

    const keyPointsResponse = await callLlm(keyPointsPrompt)
    const keyPoints = keyPointsResponse
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim())

    // 生成主题
    const themePrompt = `基于以下视频的分段总结，用一句话概括视频的主要主题：

视频标题：${data.videoTitle}

分段总结：
${allSegmentSummaries}

请只返回主题描述，不要包含其他内容：`

    const mainTheme = await callLlm(themePrompt)

    // 生成结论
    const conclusionPrompt = `基于以下视频的分段总结，写一个简洁的结论，总结视频的核心价值和意义：

视频标题：${data.videoTitle}

分段总结：
${allSegmentSummaries}

请用2-3句话总结，不要包含其他内容：`

    const conclusion = await callLlm(conclusionPrompt)

    // 生成完整总结
    const fullSummaryPrompt = `基于以下视频的分段总结，写一个完整的视频总结，要求：
1. 总结要全面而简洁，涵盖视频的主要内容
2. 长度控制在300-500字
3. 结构清晰，逻辑连贯
4. 用中文表达

视频标题：${data.videoTitle}
视频时长：${Math.floor(data.totalDuration/60)}分${Math.floor(data.totalDuration%60)}秒

分段总结：
${allSegmentSummaries}

请直接返回完整总结，不要包含其他格式：`

    const fullSummary = await callLlm(fullSummaryPrompt)

    return {
      keyPoints: keyPoints.length > 0 ? keyPoints : ['总结生成失败'],
      mainTheme: mainTheme.trim() || '主题生成失败',
      conclusion: conclusion.trim() || '结论生成失败',
      fullSummary: fullSummary.trim() || '完整总结生成失败'
    }
  }

  async post(
    shared: YouTubeSummarizerSharedStore,
    _: any,
    overallSummary: OverallSummary
  ): Promise<string | undefined> {
    shared.overallSummary = overallSummary
    console.log('整体总结生成完成')
    console.log(`主题: ${overallSummary.mainTheme}`)
    console.log(`主要观点: ${overallSummary.keyPoints.length}个`)
    return 'default'
  }
}

export class GenerateOutputNode extends Node<YouTubeSummarizerSharedStore> {
  async prep(shared: YouTubeSummarizerSharedStore): Promise<{
    videoTitle: string
    videoId: string
    youtubeUrl: string
    segments: ProcessedSegment[]
    overallSummary: OverallSummary
    totalDuration: number
    markdownPath: string
  }> {
    return {
      videoTitle: shared.videoTitle!,
      videoId: shared.videoId!,
      youtubeUrl: shared.youtubeUrl,
      segments: shared.segments!,
      overallSummary: shared.overallSummary!,
      totalDuration: shared.totalDuration || 0,
      markdownPath: shared.markdownPath!
    }
  }

  async exec(data: {
    videoTitle: string
    videoId: string
    youtubeUrl: string
    segments: ProcessedSegment[]
    overallSummary: OverallSummary
    totalDuration: number
    markdownPath: string
  }): Promise<string> {
    console.log('正在生成Markdown总结...')
    
    // 生成Markdown内容
    const markdownContent = generateVideoSummary({
      videoTitle: data.videoTitle,
      videoId: data.videoId,
      youtubeUrl: data.youtubeUrl,
      segments: data.segments,
      overallSummary: data.overallSummary,
      totalDuration: data.totalDuration,
      generatedAt: new Date()
    })

    return markdownContent
  }

  async post(
    shared: YouTubeSummarizerSharedStore,
    _: any,
    markdownContent: string
  ): Promise<string | undefined> {
    // 写入Markdown文件
    await writeMarkdown(shared.markdownPath!, markdownContent)
    shared.markdownContent = markdownContent

    console.log('✅ YouTube视频总结完成！')
    console.log(`📁 输出目录: ${shared.outputDir}`)
    console.log(`📄 总结文件: ${shared.markdownPath}`)
    console.log(`📊 分段数量: ${shared.segments?.length || 0}`)
    console.log(`⏱️  视频时长: ${Math.floor((shared.totalDuration || 0)/60)}分${Math.floor((shared.totalDuration || 0)%60)}秒`)

    return undefined // 流程结束
  }
}

// 保留原有的QA节点以保持向后兼容
export class GetQuestionNode extends Node<QASharedStore> {
  async exec(): Promise<string> {
    const userQuestion = prompt('Enter your question: ') || ''
    return userQuestion
  }

  async post(
    shared: QASharedStore,
    _: unknown,
    execRes: string,
  ): Promise<string | undefined> {
    shared.question = execRes
    return 'default'
  }
}

export class AnswerNode extends Node<QASharedStore> {
  async prep(shared: QASharedStore): Promise<string> {
    return shared.question || ''
  }

  async exec(question: string): Promise<string> {
    return await callLlm(question)
  }

  async post(
    shared: QASharedStore,
    _: unknown,
    execRes: string,
  ): Promise<string | undefined> {
    shared.answer = execRes
    return undefined
  }
}
