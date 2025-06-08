import { Node } from 'pocketflow'
import { getTokenStats, getTokenStatsReport, resetTokenStats, exportTokenStats } from './callLlm'
import { writeFileSync } from 'fs'
import * as path from 'path'

interface TokenMonitorSharedStore {
  outputDir?: string
  [key: string]: any
}

/**
 * Token监控节点 - 可以插入到流程中的任何位置进行监控
 */
export class TokenMonitorNode extends Node<TokenMonitorSharedStore> {
  private readonly generateReport: boolean
  private readonly saveToFile: boolean

  constructor(generateReport: boolean = true, saveToFile: boolean = false) {
    super()
    this.generateReport = generateReport
    this.saveToFile = saveToFile
  }

  async prep(_: TokenMonitorSharedStore): Promise<void> {
    // 不需要准备数据
    return
  }

  async exec(_: void): Promise<string> {
    const stats = getTokenStats()
    
    if (this.generateReport) {
      console.log('\n' + '='.repeat(60))
      console.log('📊 Token使用监控检查点')
      console.log('='.repeat(60))
      console.log(getTokenStatsReport())
      console.log('='.repeat(60) + '\n')
    }

    return JSON.stringify(stats)
  }

  async post(
    shared: TokenMonitorSharedStore,
    _: void,
    execRes: string
  ): Promise<string | undefined> {
    if (this.saveToFile && shared.outputDir) {
      const stats = JSON.parse(execRes)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `token-stats-${timestamp}.json`
      const filepath = path.join(shared.outputDir, filename)
      
      try {
        writeFileSync(filepath, JSON.stringify(stats, null, 2))
        console.log(`📁 Token统计已保存到: ${filepath}`)
      } catch (error) {
        console.error('❌ 保存Token统计失败:', error)
      }
    }

    return 'default'
  }
}

/**
 * Token重置节点 - 在流程开始前重置统计
 */
export class TokenResetNode extends Node<any> {
  async prep(_: any): Promise<void> {
    return
  }

  async exec(_: void): Promise<void> {
    resetTokenStats()
    console.log('🔄 Token统计已重置')
    return
  }

  async post(_: any, __: void, ___: void): Promise<string | undefined> {
    return 'default'
  }
}

/**
 * Token汇总节点 - 在流程结束时生成完整报告
 */
export class TokenSummaryNode extends Node<TokenMonitorSharedStore> {
  private readonly saveDetailedReport: boolean

  constructor(saveDetailedReport: boolean = false) {
    super()
    this.saveDetailedReport = saveDetailedReport
  }

  async prep(shared: TokenMonitorSharedStore): Promise<{ outputDir?: string }> {
    return { outputDir: shared.outputDir }
  }

  async exec(data: { outputDir?: string }): Promise<{
    report: string
    stats: any
    outputDir?: string
  }> {
    const stats = getTokenStats()
    const report = getTokenStatsReport()

    console.log('\n' + '🎯'.repeat(20))
    console.log('🎯 最终Token使用统计报告')
    console.log('🎯'.repeat(20))
    console.log(report)
    console.log('🎯'.repeat(20) + '\n')

    return {
      report,
      stats,
      outputDir: data.outputDir
    }
  }

  async post(
    shared: TokenMonitorSharedStore,
    _: { outputDir?: string },
    execRes: { report: string; stats: any; outputDir?: string }
  ): Promise<string | undefined> {
    if (this.saveDetailedReport && execRes.outputDir) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      
      // 保存详细报告
      const reportPath = path.join(execRes.outputDir, `token-report-${timestamp}.txt`)
      try {
        writeFileSync(reportPath, execRes.report)
        console.log(`📄 详细报告已保存到: ${reportPath}`)
      } catch (error) {
        console.error('❌ 保存报告失败:', error)
      }

      // 保存JSON数据
      const dataPath = path.join(execRes.outputDir, `token-data-${timestamp}.json`)
      try {
        writeFileSync(dataPath, JSON.stringify(execRes.stats, null, 2))
        console.log(`📊 详细数据已保存到: ${dataPath}`)
      } catch (error) {
        console.error('❌ 保存数据失败:', error)
      }
    }

    // 将最终统计添加到共享存储
    shared.finalTokenStats = execRes.stats

    return 'default'
  }
}

/**
 * 获取Token使用效率分析
 */
export function getTokenEfficiencyAnalysis(): {
  efficiency: string
  recommendations: string[]
  warnings: string[]
} {
  const stats = getTokenStats()
  const recommendations: string[] = []
  const warnings: string[] = []
  let efficiency = '良好'

  if (stats.totalCalls === 0) {
    return {
      efficiency: '无数据',
      recommendations: ['开始使用LLM功能后将显示分析结果'],
      warnings: []
    }
  }

  // 分析平均Token使用
  const avgTokens = stats.averageTokensPerCall
  if (avgTokens > 8000) {
    efficiency = '需要优化'
    warnings.push('平均Token使用量过高，建议优化Prompt长度')
    recommendations.push('考虑分段处理长文本')
    recommendations.push('使用更高效的模型如gpt-4o-mini处理简单任务')
  } else if (avgTokens > 4000) {
    efficiency = '一般'
    recommendations.push('可以考虑优化Prompt，减少不必要的输入')
  }

  // 分析成本效率
  const avgCost = stats.totalCost / stats.totalCalls
  if (avgCost > 0.1) {
    warnings.push('平均每次调用成本较高，建议使用更经济的模型')
    recommendations.push('对于简单任务使用gpt-4o-mini')
  }

  // 分析调用频率
  if (stats.callHistory.length >= 10) {
    const recent10 = stats.callHistory.slice(-10)
    const timeSpan = recent10[recent10.length - 1].timestamp.getTime() - recent10[0].timestamp.getTime()
    const callsPerMinute = (recent10.length / (timeSpan / 60000))
    
    if (callsPerMinute > 10) {
      warnings.push('调用频率较高，请注意API速率限制')
      recommendations.push('考虑实现本地缓存减少重复调用')
    }
  }

  // 分析模型使用分布
  const modelUsage = stats.callHistory.reduce((acc, call) => {
    acc[call.model] = (acc[call.model] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const expensiveModels = ['gpt-4', 'gpt-4o']
  const cheapModels = ['gpt-4o-mini', 'gpt-3.5-turbo']
  
  const expensiveCallsCount = Object.entries(modelUsage)
    .filter(([model]) => expensiveModels.includes(model))
    .reduce((sum, [, count]) => sum + count, 0)
  
  const cheapCallsCount = Object.entries(modelUsage)
    .filter(([model]) => cheapModels.includes(model))
    .reduce((sum, [, count]) => sum + count, 0)

  if (expensiveCallsCount > cheapCallsCount * 2) {
    recommendations.push('考虑将更多简单任务分配给经济模型')
  }

  return {
    efficiency,
    recommendations,
    warnings
  }
}

/**
 * 打印Token使用效率分析
 */
export function printTokenEfficiencyAnalysis(): void {
  const analysis = getTokenEfficiencyAnalysis()
  
  console.log('\n' + '🔍'.repeat(20))
  console.log('🔍 Token使用效率分析')
  console.log('🔍'.repeat(20))
  console.log(`效率评级: ${analysis.efficiency}`)
  
  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  警告:')
    analysis.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 建议:')
    analysis.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })
  }
  
  console.log('🔍'.repeat(20) + '\n')
} 