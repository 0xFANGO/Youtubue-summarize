import 'dotenv/config'
import { 
  createQaFlow, 
  createYouTubeSummarizerFlow, 
  runYouTubeSummarizer,
  createVideoSummarizerFlow,
  runVideoSummarizer 
} from './flow'
import { QASharedStore, YouTubeSummarizerSharedStore } from './types'

// 导出主要功能
export { 
  // 新版多平台支持
  runVideoSummarizer,
  createVideoSummarizerFlow,
  // 旧版YouTube专用（保持向后兼容）
  runYouTubeSummarizer,
  createYouTubeSummarizerFlow,
  // QA功能
  createQaFlow 
}

// 导出类型
export type {
  YouTubeSummarizerSharedStore,
  QASharedStore
}

// 导出所有节点
export * from './nodes'

// YouTube总结器主函数示例
async function main(): Promise<void> {
  // 示例YouTube URL（可以替换为实际的视频链接）
  const testUrl = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  
  console.log('🎬 YouTube视频总结器启动')
  console.log(`📹 视频链接: ${testUrl}`)
  console.log()

  try {
    const result = await runYouTubeSummarizer(testUrl, {
      outputDir: './output',
      segmentMinutesMin: 2, // 最小2分钟一段
      segmentMinutesMax: 6  // 最大6分钟一段
    })

    console.log()
    console.log('🎉 总结完成！')
    console.log(`📂 输出目录: ${result.outputDir}`)
    console.log(`📄 总结文件: ${result.markdownPath}`)
    console.log(`🖼️  截图数量: ${result.segments?.length || 0}`)
    
  } catch (error) {
    console.error('❌ 处理失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// QA示例（保持向后兼容）
async function qaExample(): Promise<void> {
  const shared: QASharedStore = {
    question: undefined,
    answer: undefined,
  }

  const qaFlow = createQaFlow()
  await qaFlow.run(shared)
  console.log(`Question: ${shared.question}`)
  console.log(`Answer: ${shared.answer}`)
}

// 如果直接运行此文件（且不是CLI），执行主函数
// 更严格的检查：只有当文件名是index.js/index.ts且不是通过CLI调用时才执行
if (require.main === module && 
    (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) &&
    !process.argv[1]?.includes('cli')) {
  main().catch(console.error)
}
