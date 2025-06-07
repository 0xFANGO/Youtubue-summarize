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

// YouTube 总结器工作流
export function createYouTubeSummarizerFlow(): Flow {
  // 创建节点
  const fetchSubtitlesNode = new FetchSubtitlesNode()
  const processSegmentsNode = new ProcessSegmentsControlledParallelNode()
  const generateOverallSummaryNode = new GenerateOverallSummaryNode()
  const generateOutputNode = new GenerateOutputNode()

  // 连接节点按顺序执行：获取字幕 → 分段总结 → 整体总结 → 生成输出
  fetchSubtitlesNode
    .next(processSegmentsNode)
    .next(generateOverallSummaryNode)
    .next(generateOutputNode)

  // 创建以第一个节点开始的工作流
  return new Flow<YouTubeSummarizerSharedStore>(fetchSubtitlesNode)
}

// 创建完整的YouTube总结任务
export async function runYouTubeSummarizer(
  youtubeUrl: string,
  options: {
    outputDir?: string
    segmentMinutesMin?: number
    segmentMinutesMax?: number
  } = {}
): Promise<YouTubeSummarizerSharedStore> {
  const shared: YouTubeSummarizerSharedStore = {
    youtubeUrl,
    segmentMinutesMin: options.segmentMinutesMin || 2,  // 最小2分钟
    segmentMinutesMax: options.segmentMinutesMax || 8,  // 最大8分钟
    outputDir: options.outputDir || './output'
  }

  const flow = createYouTubeSummarizerFlow()
  await flow.run(shared)
  
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
