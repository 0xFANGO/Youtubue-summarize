import 'dotenv/config'
import { runYouTubeSummarizer, runVideoSummarizer } from './index'
import { getTokenStatsReport, resetTokenStats } from './utils/callLlm'
import { detectObsidianVault, validateObsidianVault } from './utils/obsidianExporter'
import { isPlatformSupported, getSupportedPlatforms } from './utils/platformDetector'
import { 
  setApiKey, 
  removeApiKey, 
  showConfig, 
  setDefaultOutputDir, 
  setDefaultSegmentMinutes, 
  resetConfig,
  getDefaultOutputDir,
  getDefaultSegmentMinutes
} from './utils/globalConfig'

// 帮助信息
function showHelpMessage(): void {
  console.log(`
🎬 Video Summary - AI-powered Multi-Platform Video Summarizer

支持平台:
  • YouTube (youtube.com, youtu.be)
  • Bilibili (bilibili.com, b23.tv, BV号, AV号)

用法:
  video-summary <视频链接> [选项]
  vs <视频链接> [选项]                # 简短命令

配置管理:
  vs config show                    显示当前配置
  vs config set-key <API密钥>       设置OpenAI API密钥
  vs config remove-key              移除API密钥
  vs config set-output <目录>       设置默认输出目录
  vs config set-segment <分钟>      设置默认分段时长
  vs config reset                   重置所有配置

选项:
  --output, -o <目录>      输出目录 (默认: ./output 或全局配置)
  --segment, -s <分钟>     每段时长分钟数 (默认: 5 或全局配置)
  --obsidian <路径>        导出到Obsidian仓库路径
  --obsidian-detect        自动检测Obsidian仓库
  --obsidian-template <模板> Obsidian模板类型 (standard/minimal/timeline, 默认: standard)
  --obsidian-folder <文件夹> Obsidian文件夹名称 (默认: 视频笔记)
  --no-token-monitor      禁用Token使用监控
  --save-token-files      保存Token统计文件到输出目录
  --token-stats           显示当前Token使用统计
  --reset-token-stats     重置Token使用统计
  --debug                 启用详细调试输出
  --help, -h              显示帮助信息

调试说明:
  --debug 启用一般调试输出，不包含字幕解析详情
  如需查看字幕解析的详细JSON结构，请设置环境变量:
    DEBUG_SUBTITLES=true video-summary <URL>

Token监控说明:
  默认启用Token使用监控，可以帮助您:
  • 实时查看每次LLM调用的Token消耗
  • 分析Token使用效率和成本
  • 获得优化建议以降低使用成本
  • 使用 --save-token-files 可保存详细报告文件

安装:
  npm install -g video-summary
  # 或
  yarn global add video-summary

示例:
  # YouTube视频
  video-summary "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  vs "https://youtu.be/dQw4w9WgXcQ" --output ./my-summaries --segment 3
  
  # B站视频
  video-summary "https://www.bilibili.com/video/BV1234567890"
  video-summary "BV1234567890" --obsidian-detect
  video-summary "https://b23.tv/abcdefg" --obsidian /path/to/vault --obsidian-template minimal
  
  # 配置管理
  vs config set-key "sk-1234567890abcdef"    # 设置API密钥（一次设置，全局使用）
  vs config show                            # 查看当前配置
  vs config set-output ~/Videos             # 设置默认输出目录
  vs config set-segment 8                   # 设置默认分段时长
  
  # 其他选项
  video-summary "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --debug  # 启用详细输出
  video-summary --token-stats    # 仅查看统计信息
  video-summary --reset-token-stats    # 重置统计信息
`)
}

// 解析命令行参数
function parseArgs(): {
  url?: string
  outputDir?: string
  segmentMinutes?: number
  enableTokenMonitoring?: boolean
  saveTokenFiles?: boolean
  showTokenStats?: boolean
  resetTokenStats?: boolean
  obsidianPath?: string
  obsidianDetect?: boolean
  obsidianTemplate?: 'standard' | 'minimal' | 'timeline'
  obsidianFolder?: string
  enableDebug?: boolean
  showHelp: boolean
  configCommand?: string
  configValue?: string
} {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { showHelp: true }
  }

  // 处理config命令
  if (args[0] === 'config') {
    if (args.length < 2) {
      return { configCommand: 'show', showHelp: false }
    }
    
    const command = args[1]
    const validCommands = ['show', 'set-key', 'remove-key', 'set-output', 'set-segment', 'reset']
    
    if (!validCommands.includes(command)) {
      console.error(`❌ 无效的配置命令: ${command}`)
      console.error(`可用命令: ${validCommands.join(', ')}`)
      process.exit(1)
    }
    
    const needsValue = ['set-key', 'set-output', 'set-segment']
    if (needsValue.includes(command) && args.length < 3) {
      console.error(`❌ 命令 ${command} 需要提供值`)
      process.exit(1)
    }
    
    return { 
      configCommand: command, 
      configValue: args[2],
      showHelp: false 
    }
  }

  // 特殊命令（不需要URL）
  if (args.includes('--token-stats')) {
    return { showTokenStats: true, showHelp: false }
  }

  if (args.includes('--reset-token-stats')) {
    return { resetTokenStats: true, showHelp: false }
  }

  let url: string | undefined
  let outputDir: string | undefined = getDefaultOutputDir() // 使用全局配置默认值
  let segmentMinutes: number | undefined = getDefaultSegmentMinutes() // 使用全局配置默认值
  let enableTokenMonitoring = true
  let saveTokenFiles = false
  let obsidianPath: string | undefined
  let obsidianDetect = false
  let obsidianTemplate: 'standard' | 'minimal' | 'timeline' = 'standard'
  let obsidianFolder: string | undefined
  let enableDebug = false

  // 过滤掉config命令参数，避免将config误认为URL
  const filteredArgs = args.filter((_, index) => {
    // 如果第一个参数是config，过滤掉config和其后的子命令/值
    if (args[0] === 'config') {
      return false
    }
    return true
  })

  for (let i = 0; i < filteredArgs.length; i++) {
    const arg = filteredArgs[i]

    if (arg === '--no-token-monitor') {
      enableTokenMonitoring = false
      continue
    }

    if (arg === '--save-token-files') {
      saveTokenFiles = true
      continue
    }

    if (arg === '--debug') {
      enableDebug = true
      continue
    }

    if (arg === '--obsidian-detect') {
      obsidianDetect = true
      continue
    }

    if (arg === '--obsidian') {
      obsidianPath = filteredArgs[i + 1]
      if (!obsidianPath) {
        console.error('❌ --obsidian 需要指定仓库路径')
        process.exit(1)
      }
      i++ // 跳过下一个参数（值）
      continue
    }

    if (arg === '--obsidian-template') {
      const template = filteredArgs[i + 1] as 'standard' | 'minimal' | 'timeline'
      if (!['standard', 'minimal', 'timeline'].includes(template)) {
        console.error('❌ --obsidian-template 必须是: standard, minimal, timeline')
        process.exit(1)
      }
      obsidianTemplate = template
      i++ // 跳过下一个参数（值）
      continue
    }

    if (arg === '--obsidian-folder') {
      obsidianFolder = filteredArgs[i + 1]
      if (!obsidianFolder) {
        console.error('❌ --obsidian-folder 需要指定文件夹名称')
        process.exit(1)
      }
      i++ // 跳过下一个参数（值）
      continue
    }

    if (arg === '--output' || arg === '-o') {
      outputDir = filteredArgs[i + 1]
      i++ // 跳过下一个参数（值）
      continue
    }

    if (arg === '--segment' || arg === '-s') {
      segmentMinutes = parseInt(filteredArgs[i + 1], 10)
      if (isNaN(segmentMinutes) || segmentMinutes <= 0) {
        console.error('❌ 段落时长必须是正整数')
        process.exit(1)
      }
      i++ // 跳过下一个参数（值）
      continue
    }

    // 未知选项
    if (arg.startsWith('-')) {
      console.error(`❌ 未知选项: ${arg}`)
      console.log('使用 --help 查看帮助信息')
      process.exit(1)
    }

    // 如果不是选项，则认为是URL
    if (!url) {
      url = arg
    } else {
      console.error(`❌ 未知参数: ${arg}`)
      console.log('使用 --help 查看帮助信息')
      process.exit(1)
    }
  }

  return {
    url,
    outputDir,
    segmentMinutes,
    enableTokenMonitoring,
    saveTokenFiles,
    obsidianPath,
    obsidianDetect,
    obsidianTemplate,
    obsidianFolder,
    enableDebug,
    showHelp: false
  }
}

// 验证视频URL（支持多平台）
function isValidVideoUrl(url: string): boolean {
  try {
    return isPlatformSupported(url)
  } catch {
    return false
  }
}

// 主函数
async function main(): Promise<void> {
  const { 
    url, 
    outputDir, 
    segmentMinutes, 
    enableTokenMonitoring, 
    saveTokenFiles,
    showTokenStats, 
    resetTokenStats: shouldResetTokenStats,
    obsidianPath,
    obsidianDetect,
    obsidianTemplate,
    obsidianFolder,
    enableDebug,
    showHelp,
    configCommand,
    configValue
  } = parseArgs()

  // 设置调试模式
  if (enableDebug) {
    console.log('🐛 已启用详细调试模式')
    // 注意：字幕详细调试需要单独的 DEBUG_SUBTITLES 环境变量
    // 如需查看字幕解析详情，请设置: DEBUG_SUBTITLES=true
  }

  if (showHelp) {
    showHelpMessage()
    return
  }

  // 处理配置命令
  if (configCommand) {
    try {
      switch (configCommand) {
        case 'show':
          showConfig()
          break
        case 'set-key':
          if (!configValue) {
            console.error('❌ 请提供API密钥')
            process.exit(1)
          }
          setApiKey(configValue)
          break
        case 'remove-key':
          removeApiKey()
          break
        case 'set-output':
          if (!configValue) {
            console.error('❌ 请提供输出目录路径')
            process.exit(1)
          }
          setDefaultOutputDir(configValue)
          break
        case 'set-segment':
          if (!configValue) {
            console.error('❌ 请提供分段时长（分钟）')
            process.exit(1)
          }
          const minutes = parseInt(configValue, 10)
          if (isNaN(minutes) || minutes <= 0) {
            console.error('❌ 分段时长必须是正整数')
            process.exit(1)
          }
          setDefaultSegmentMinutes(minutes)
          break
        case 'reset':
          resetConfig()
          break
        default:
          console.error(`❌ 未知的配置命令: ${configCommand}`)
          process.exit(1)
      }
      return
    } catch (error) {
      console.error('❌ 配置操作失败:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  }

  // 处理特殊命令
  if (obsidianDetect) {
    console.log('🔍 正在检测Obsidian仓库...')
    const vaults = detectObsidianVault()
    if (vaults.length === 0) {
      console.log('❌ 未找到Obsidian仓库')
      console.log('💡 请确保:')
      console.log('   1. 已安装Obsidian应用')
      console.log('   2. 至少创建过一个仓库')
      console.log('   3. 仓库位于常见位置（Documents、Desktop等）')
      return
    }
    
    console.log(`✅ 找到 ${vaults.length} 个Obsidian仓库:`)
    vaults.forEach((vault, index) => {
      console.log(`   ${index + 1}. ${vault}`)
    })
    console.log()
    console.log('💡 使用方法:')
    console.log(`   video-summary "URL" --obsidian "${vaults[0]}"`)
    return
  }

  if (showTokenStats) {
    console.log('📊 当前Token使用统计:')
    console.log('='.repeat(50))
    console.log(getTokenStatsReport())
    return
  }

  if (shouldResetTokenStats) {
    resetTokenStats()
    console.log('✅ Token使用统计已重置')
    return
  }

  if (!url) {
    console.error('❌ 请提供视频链接')
    showHelpMessage()
    process.exit(1)
  }

  if (!isValidVideoUrl(url)) {
    console.error('❌ 请提供有效的视频链接')
    console.error('支持的平台:')
    const platforms = getSupportedPlatforms()
    platforms.forEach(platform => {
      if (platform === 'youtube') {
        console.error('  YouTube:')
        console.error('    - https://www.youtube.com/watch?v=VIDEO_ID')
        console.error('    - https://youtu.be/VIDEO_ID')
        console.error('    - https://www.youtube.com/embed/VIDEO_ID')
      } else if (platform === 'bilibili') {
        console.error('  Bilibili:')
        console.error('    - https://www.bilibili.com/video/BV...')
        console.error('    - https://b23.tv/...')
        console.error('    - BV号直接输入')
        console.error('    - AV号直接输入')
      }
    })
    process.exit(1)
  }

  // 验证Obsidian配置
  if (obsidianPath && !validateObsidianVault(obsidianPath)) {
    console.error(`❌ 无效的Obsidian仓库路径: ${obsidianPath}`)
    console.error('💡 请确保路径存在且包含.obsidian文件夹')
    console.error('💡 或使用 --obsidian-detect 自动检测仓库')
    process.exit(1)
  }

  console.log('🎬 Video Summary - AI Multi-Platform Video Summarizer')
  console.log(`📹 视频链接: ${url}`)
  if (outputDir) console.log(`📂 输出目录: ${outputDir}`)
  if (segmentMinutes) console.log(`⏱️  段落时长: ${segmentMinutes}分钟`)
  if (obsidianPath) {
    console.log(`📝 Obsidian导出: ${obsidianPath}`)
    console.log(`📁 Obsidian文件夹: ${obsidianFolder || '视频笔记'}`)
    console.log(`📋 Obsidian模板: ${obsidianTemplate}`)
  }
  console.log(`📊 Token监控: ${enableTokenMonitoring ? '已启用' : '已禁用'}`)
  if (enableTokenMonitoring) {
    console.log(`💾 Token文件保存: ${saveTokenFiles ? '已启用' : '已禁用'}`)
  }
  if (enableDebug) {
    console.log(`🐛 调试模式: 已启用`)
  }
  console.log()

  try {
    const startTime = Date.now()
    
    // 使用新的多平台函数
    const result = await runVideoSummarizer(url, {
      outputDir,
      enableTokenMonitoring,
      saveTokenFiles,
      obsidianPath,
      obsidianTemplate,
      obsidianFolder,
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

    if (enableTokenMonitoring && result.finalTokenStats) {
      console.log()
      console.log('💰 本次任务Token使用汇总:')
      console.log(`   总调用: ${result.finalTokenStats.totalCalls} 次`)
      console.log(`   总Token: ${result.finalTokenStats.totalTokens.toLocaleString()}`)
      console.log(`   总成本: $${result.finalTokenStats.totalCost.toFixed(4)} USD`)
      console.log(`   平均每次: ${Math.round(result.finalTokenStats.averageTokensPerCall)} tokens`)
    }
    
  } catch (error) {
    console.error()
    console.error('❌ 处理失败:', error instanceof Error ? error.message : error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.error()
      console.error('💡 提示: 请使用以下方式之一设置API密钥:')
      console.error('   1. vs config set-key "your-api-key-here"  # 推荐：全局配置')
      console.error('   2. export OPENAI_API_KEY="your-api-key-here"  # 环境变量')
    }
    
    process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error)
}

export { main as runCLI } 