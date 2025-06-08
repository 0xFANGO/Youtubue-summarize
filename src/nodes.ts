import { Node, BatchNode } from 'pocketflow'
import { callLlm } from './utils/callLlm'
import { getSubtitles } from './utils/getSubtitles'
import { formatTimestamp } from './utils/getScreenshot'
import { createOutputStructure } from './utils/fileSystem'
import { generateVideoSummary } from './utils/markdownGenerator'
import { writeMarkdown } from './utils/fileSystem'
import { exportToObsidian, ObsidianConfig } from './utils/obsidianExporter'
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
    
    // 🚀 修复：优先使用真实视频时长，而不是字幕计算的时长
    let totalDuration: number
    if (videoInfo.actualDuration) {
      // 使用从YouTube API获取的真实时长
      totalDuration = videoInfo.actualDuration
      console.log(`✅ 使用真实视频时长: ${totalDuration}秒`)
    } else {
      // 后备方案：使用字幕计算的时长
      totalDuration = videoInfo.subtitles.length > 0 
        ? videoInfo.subtitles[videoInfo.subtitles.length - 1].end
        : 0
      console.log(`⚠️ 使用字幕估算时长: ${totalDuration}秒 (可能不准确)`)
      
      // 如果字幕时长异常大，进行修正
      if (totalDuration > 7200) { // 超过2小时很可能有问题
        console.warn(`⚠️ 字幕估算时长异常: ${totalDuration}秒，重置为合理值`)
        totalDuration = Math.min(totalDuration, 3600) // 限制在1小时以内
      }
    }
    
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
    const minSegmentMinutes = shared.segmentMinutesMin || 4  // 增加最小时长到4分钟
    const maxSegmentMinutes = shared.segmentMinutesMax || 15  // 增加最大时长到15分钟

    console.log(`开始智能分段，最小时长: ${minSegmentMinutes}分钟，最大时长: ${maxSegmentMinutes}分钟`)

    // 使用智能分段算法，增加每段最大词数以减少段落数量
    const segments = smartSegmentation(subtitles, {
      minSegmentMinutes,
      maxSegmentMinutes,
      maxWordsPerSegment: 2000  // 增加到2000词
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
      
      // 并行处理当前批次，使用更便宜的模型
      const batchResults = await Promise.all(
        batch.map(async (segment, batchIndex) => {
          const globalIndex = i + batchIndex + 1
          console.log(`  处理段落 ${globalIndex}/${segments.length}: ${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}`)
          
          // 使用速率限制器调用LLM，改用更便宜的gpt-4o-mini模型
          const detailedSummary = await this.rateLimiter.execute(() =>
            callLlmWithRetry(
              (prompt) => callLlm(prompt, 'gpt-4o-mini'), // 使用更便宜的模型
              `请用中文对以下视频片段进行详细总结，要求：

1. 总结要详细而完整，突出这一段的核心内容和要点
2. 使用清晰易懂的中文表达
3. 总结长度控制在300-500字之间，比例保持与原文相当
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

    // 🚀 优化：将4次LLM调用合并为1次，使用更便宜的模型
    const combinedPrompt = `基于以下视频的分段总结，请生成一个完整的视频总结报告，包含以下四个部分：

视频标题：${data.videoTitle}
视频时长：${Math.floor(data.totalDuration/60)}分${Math.floor(data.totalDuration%60)}秒

分段总结：
${allSegmentSummaries}

请按以下格式返回结果：

【主要主题】
用一句话概括视频的主要主题

【关键要点】
- 要点1
- 要点2
- 要点3
- 要点4
- 要点5

【完整总结】
写一个300-500字的完整总结，涵盖视频的主要内容，结构清晰，逻辑连贯

【核心结论】
用2-3句话总结视频的核心价值和意义

请严格按照上述格式返回，不要包含其他说明或格式：`

    // 使用更便宜的gpt-4o-mini模型进行整体总结
    const response = await callLlm(combinedPrompt, 'gpt-4o-mini')

    // 解析响应结果
    const lines = response.split('\n').filter(line => line.trim())
    
    let mainTheme = '主题生成失败'
    let keyPoints: string[] = []
    let fullSummary = '完整总结生成失败'
    let conclusion = '结论生成失败'
    
    let currentSection = ''
    let summaryLines: string[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.includes('【主要主题】')) {
        currentSection = 'theme'
        continue
      } else if (trimmed.includes('【关键要点】')) {
        currentSection = 'points'
        continue
      } else if (trimmed.includes('【完整总结】')) {
        currentSection = 'summary'
        continue
      } else if (trimmed.includes('【核心结论】')) {
        currentSection = 'conclusion'
        continue
      }
      
      if (currentSection === 'theme' && trimmed) {
        mainTheme = trimmed
      } else if (currentSection === 'points' && trimmed.startsWith('-')) {
        keyPoints.push(trimmed.substring(1).trim())
      } else if (currentSection === 'summary' && trimmed) {
        summaryLines.push(trimmed)
      } else if (currentSection === 'conclusion' && trimmed) {
        conclusion = trimmed
      }
    }
    
    // 组合完整总结
    if (summaryLines.length > 0) {
      fullSummary = summaryLines.join(' ')
    }
    
    // 确保至少有一些关键要点
    if (keyPoints.length === 0) {
      keyPoints = ['无法提取关键要点']
    }

    console.log('整体总结生成完成')
    console.log(`主题: ${mainTheme}`)
    console.log(`主要观点: ${keyPoints.length}个`)
    console.log(`完整总结: ${fullSummary.length}字符`)

    return {
      keyPoints,
      mainTheme,
      conclusion,
      fullSummary
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
    prepRes: any,
    markdownContent: string
  ): Promise<string | undefined> {
    // 写入Markdown文件
    await writeMarkdown(shared.markdownPath!, markdownContent)
    shared.markdownContent = markdownContent

    // 如果配置了Obsidian导出，则导出到Obsidian
    if (shared.obsidianPath) {
      try {
        console.log('📝 正在导出到Obsidian...')
        
        const obsidianConfig: ObsidianConfig = {
          vaultPath: shared.obsidianPath,
          folderName: shared.obsidianFolder || 'YouTube笔记',
          templateType: shared.obsidianTemplate || 'standard',
          tags: ['youtube', 'video-summary']
        }

        const obsidianPath = await exportToObsidian({
          videoTitle: prepRes.videoTitle,
          videoId: prepRes.videoId,
          youtubeUrl: prepRes.youtubeUrl,
          segments: prepRes.segments,
          overallSummary: prepRes.overallSummary,
          totalDuration: prepRes.totalDuration,
          generatedAt: new Date()
        }, obsidianConfig)

        shared.obsidianExportPath = obsidianPath
        console.log(`✅ 已导出到Obsidian: ${obsidianPath}`)
      } catch (error) {
        console.error(`❌ Obsidian导出失败: ${error instanceof Error ? error.message : error}`)
        console.error('💡 请检查Obsidian仓库路径是否正确')
      }
    }

    console.log('✅ YouTube视频总结完成！')
    console.log(`📁 输出目录: ${shared.outputDir}`)
    console.log(`📄 总结文件: ${shared.markdownPath}`)
    if (shared.obsidianExportPath) {
      console.log(`📝 Obsidian文件: ${shared.obsidianExportPath}`)
    }
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
