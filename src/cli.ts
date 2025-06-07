#!/usr/bin/env node

import 'dotenv/config'
import { runYouTubeSummarizer } from './index'

// 帮助信息
function showHelpMessage(): void {
  console.log(`
🎬 YouTube视频总结器

用法:
  yarn cli <YouTube链接> [选项]
  npm run cli <YouTube链接> [选项]

选项:
  --output, -o <目录>     输出目录 (默认: ./output)
  --segment, -s <分钟>    每段时长分钟数 (默认: 5)
  --help, -h             显示帮助信息

示例:
  yarn cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  yarn cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --output ./my-summaries --segment 3
`)
}

// 解析命令行参数
function parseArgs(): {
  url?: string
  outputDir?: string
  segmentMinutes?: number
  showHelp: boolean
} {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { showHelp: true }
  }

  const url = args[0]
  let outputDir: string | undefined
  let segmentMinutes: number | undefined

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i]
    const value = args[i + 1]

    switch (flag) {
      case '--output':
      case '-o':
        outputDir = value
        break
      case '--segment':
      case '-s':
        segmentMinutes = parseInt(value, 10)
        if (isNaN(segmentMinutes) || segmentMinutes <= 0) {
          console.error('❌ 段落时长必须是正整数')
          process.exit(1)
        }
        break
      default:
        console.error(`❌ 未知选项: ${flag}`)
        console.log('使用 --help 查看帮助信息')
        process.exit(1)
    }
  }

  return {
    url,
    outputDir,
    segmentMinutes,
    showHelp: false
  }
}

// 验证YouTube URL
function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
  ]
  
  return patterns.some(pattern => pattern.test(url))
}

// 主函数
async function main(): Promise<void> {
  const { url, outputDir, segmentMinutes, showHelp } = parseArgs()

  if (showHelp) {
    showHelpMessage()
    return
  }

  if (!url) {
    console.error('❌ 请提供YouTube视频链接')
    showHelpMessage()
    process.exit(1)
  }

  if (!isValidYouTubeUrl(url)) {
    console.error('❌ 请提供有效的YouTube视频链接')
    console.error('支持的格式:')
    console.error('  - https://www.youtube.com/watch?v=VIDEO_ID')
    console.error('  - https://youtu.be/VIDEO_ID')
    console.error('  - https://www.youtube.com/embed/VIDEO_ID')
    process.exit(1)
  }

  console.log('🎬 YouTube视频总结器')
  console.log(`📹 视频链接: ${url}`)
  if (outputDir) console.log(`📂 输出目录: ${outputDir}`)
  if (segmentMinutes) console.log(`⏱️  段落时长: ${segmentMinutes}分钟`)
  console.log()

  try {
    const startTime = Date.now()
    
    const result = await runYouTubeSummarizer(url, {
      outputDir,
      ...(segmentMinutes && {
        segmentMinutesMin: Math.max(1, segmentMinutes - 1),
        segmentMinutesMax: segmentMinutes + 1
      })
    })

    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log()
    console.log('🎉 总结完成！')
    console.log(`⏱️  耗时: ${duration}秒`)
    console.log(`📂 输出目录: ${result.outputDir}`)
    console.log(`📄 总结文件: ${result.markdownPath}`)
    console.log(`🖼️  截图数量: ${result.segments?.length || 0}`)
    
  } catch (error) {
    console.error()
    console.error('❌ 处理失败:', error instanceof Error ? error.message : error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.error()
      console.error('💡 提示: 请确保已设置 OPENAI_API_KEY 环境变量')
      console.error('   例如: export OPENAI_API_KEY="your-api-key-here"')
    }
    
    process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error)
}

export { main as runCLI } 