import { Flow } from 'pocketflow'
import { 
  GetQuestionNode, 
  AnswerNode,
  FetchSubtitlesNode,
  ProcessSegmentsControlledParallelNode,
  GenerateOverallSummaryNode,
  GenerateOutputNode
} from './nodes'
import { QASharedStore, YouTubeSummarizerSharedStore } from './types'
import { 
  TokenResetNode, 
  TokenMonitorNode, 
  TokenSummaryNode,
  printTokenEfficiencyAnalysis 
} from './utils/tokenMonitor'

// YouTube 总结器工作流 (带Token监控)
export function createYouTubeSummarizerFlow(
  enableTokenMonitoring: boolean = true, 
  saveTokenFiles: boolean = false
): Flow {
  // 创建节点
  const fetchSubtitlesNode = new FetchSubtitlesNode()
  const processSegmentsNode = new ProcessSegmentsControlledParallelNode()
  const generateOverallSummaryNode = new GenerateOverallSummaryNode()
  const generateOutputNode = new GenerateOutputNode()

  if (enableTokenMonitoring) {
    // 创建token监控节点
    const tokenResetNode = new TokenResetNode()
    const tokenMonitor1 = new TokenMonitorNode(true, false) // 段落处理后监控
    const tokenMonitor2 = new TokenMonitorNode(true, false) // 整体总结后监控
    const tokenSummaryNode = new TokenSummaryNode(saveTokenFiles) // 最终总结

    // 连接节点：重置统计 → 获取字幕 → 分段总结 → 监控1 → 整体总结 → 监控2 → 生成输出 → 最终统计
    tokenResetNode
      .next(fetchSubtitlesNode)
      .next(processSegmentsNode)
      .next(tokenMonitor1)
      .next(generateOverallSummaryNode)
      .next(tokenMonitor2)
      .next(generateOutputNode)
      .next(tokenSummaryNode)

    return new Flow<YouTubeSummarizerSharedStore>(tokenResetNode)
  } else {
    // 原始流程（无token监控）
    fetchSubtitlesNode
      .next(processSegmentsNode)
      .next(generateOverallSummaryNode)
      .next(generateOutputNode)

    return new Flow<YouTubeSummarizerSharedStore>(fetchSubtitlesNode)
  }
}

// 创建完整的YouTube总结任务
export async function runYouTubeSummarizer(
  youtubeUrl: string,
  options: {
    outputDir?: string
    segmentMinutesMin?: number
    segmentMinutesMax?: number
    enableTokenMonitoring?: boolean
    saveTokenFiles?: boolean
    obsidianPath?: string
    obsidianTemplate?: 'standard' | 'minimal' | 'timeline'
    obsidianFolder?: string
  } = {}
): Promise<YouTubeSummarizerSharedStore> {
  const shared: YouTubeSummarizerSharedStore = {
    youtubeUrl,
    segmentMinutesMin: options.segmentMinutesMin || 4,  // 优化：增加到4分钟
    segmentMinutesMax: options.segmentMinutesMax || 15,  // 优化：增加到15分钟
    outputDir: options.outputDir || './output',
    obsidianPath: options.obsidianPath,
    obsidianTemplate: options.obsidianTemplate || 'standard',
    obsidianFolder: options.obsidianFolder
  }

  const enableTokenMonitoring = options.enableTokenMonitoring !== false // 默认开启
  const saveTokenFiles = options.saveTokenFiles || false // 默认不保存文件

  console.log(`🚀 开始YouTube视频总结任务`)
  console.log(`📺 视频URL: ${youtubeUrl}`)
  console.log(`📁 输出目录: ${shared.outputDir}`)
  console.log(`⏱️  分段设置: ${shared.segmentMinutesMin}-${shared.segmentMinutesMax}分钟 (已优化)`)
  console.log(`📊 Token监控: ${enableTokenMonitoring ? '已启用' : '已禁用'}`)
  console.log(`💾 Token文件保存: ${saveTokenFiles ? '已启用' : '已禁用'}`)
  console.log('')

  const flow = createYouTubeSummarizerFlow(enableTokenMonitoring, saveTokenFiles)
  await flow.run(shared)
  
  // 在任务完成后显示效率分析
  if (enableTokenMonitoring) {
    console.log('\n🎉 YouTube总结任务完成！')
    printTokenEfficiencyAnalysis()
  }
  
  return shared
}

// 保留原有的QA工作流以保持向后兼容
export function createQaFlow(): Flow {
  // Create nodes
  const getQuestionNode = new GetQuestionNode()
  const answerNode = new AnswerNode()

  // Connect nodes in sequence
  getQuestionNode.next(answerNode)

  // Create flow starting with input node
  return new Flow<QASharedStore>(getQuestionNode)
}
