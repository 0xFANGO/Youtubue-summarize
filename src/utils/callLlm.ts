import { OpenAI } from 'openai'
import { getApiKey } from './globalConfig'

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
}

interface CallStats {
  totalCalls: number
  totalTokens: number
  totalCost: number
  averageTokensPerCall: number
  callHistory: Array<{
    timestamp: Date
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
    promptPreview: string
  }>
}

// Token pricing for different models (USD per 1000 tokens)
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.00250, output: 0.01000 },
  'gpt-4o-mini': { input: 0.000150, output: 0.000600 },
  'gpt-4': { input: 0.03000, output: 0.06000 },
  'gpt-3.5-turbo': { input: 0.001000, output: 0.002000 },
}

// Global statistics tracker
let globalStats: CallStats = {
  totalCalls: 0,
  totalTokens: 0,
  totalCost: 0,
  averageTokensPerCall: 0,
  callHistory: []
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = TOKEN_PRICING[model]
  if (!pricing) {
    console.warn(`未知模型 ${model}，无法计算成本`)
    return 0
  }
  
  const inputCost = (promptTokens / 1000) * pricing.input
  const outputCost = (completionTokens / 1000) * pricing.output
  return inputCost + outputCost
}

function updateGlobalStats(model: string, usage: TokenUsage, prompt: string): void {
  const cost = calculateCost(model, usage.promptTokens, usage.completionTokens)
  
  globalStats.totalCalls++
  globalStats.totalTokens += usage.totalTokens
  globalStats.totalCost += cost
  globalStats.averageTokensPerCall = globalStats.totalTokens / globalStats.totalCalls
  
  // Add to call history (keep last 100 calls)
  globalStats.callHistory.push({
    timestamp: new Date(),
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    cost,
    promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
  })
  
  // Keep only last 100 calls to prevent memory issues
  if (globalStats.callHistory.length > 100) {
    globalStats.callHistory = globalStats.callHistory.slice(-100)
  }
}

export async function callLlm(prompt: string, model: string = 'gpt-4o'): Promise<string> {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('OpenAI API key is not set. Please use "vs config set-key <your-api-key>" to configure it, or set the OPENAI_API_KEY environment variable.')
  }

  const client = new OpenAI({ apiKey })
  
  try {
    const startTime = Date.now()
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    })
    const endTime = Date.now()
    
    const usage = response.usage
    if (usage) {
      const tokenUsage: TokenUsage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      }
      
      // Update global statistics
      updateGlobalStats(model, tokenUsage, prompt)
      
      // Log token usage details
      const duration = endTime - startTime
      console.log(`🤖 LLM调用完成 [${model}]`)
      console.log(`📊 Token使用: ${usage.prompt_tokens}(输入) + ${usage.completion_tokens}(输出) = ${usage.total_tokens}(总计)`)
      console.log(`💰 本次成本: $${tokenUsage.cost?.toFixed(6)} USD`)
      console.log(`⏱️  响应时间: ${duration}ms`)
      console.log(`📈 累计统计: ${globalStats.totalCalls}次调用, ${globalStats.totalTokens}总tokens, $${globalStats.totalCost.toFixed(4)} USD`)
    }
    
    return response.choices[0].message.content || ''
  } catch (error) {
    console.error('❌ LLM调用失败:', error)
    throw error
  }
}

// 获取详细统计信息
export function getTokenStats(): CallStats {
  return { ...globalStats }
}

// 获取格式化的统计报告
export function getTokenStatsReport(): string {
  const stats = globalStats
  
  if (stats.totalCalls === 0) {
    return '📊 暂无Token使用统计'
  }
  
  const report = [
    '📊 Token使用统计报告',
    '='.repeat(50),
    `总调用次数: ${stats.totalCalls}`,
    `总Token数: ${stats.totalTokens.toLocaleString()}`,
    `总成本: $${stats.totalCost.toFixed(4)} USD`,
    `平均每次调用: ${Math.round(stats.averageTokensPerCall)} tokens`,
    '',
    '🔥 最近调用记录:',
    '---'
  ]
  
  const recentCalls = stats.callHistory.slice(-5).reverse()
  recentCalls.forEach((call, index) => {
    const timeStr = call.timestamp.toLocaleTimeString()
    report.push(`${index + 1}. [${timeStr}] ${call.model}`)
    report.push(`   Tokens: ${call.promptTokens}+${call.completionTokens}=${call.totalTokens}`)
    report.push(`   成本: $${call.cost.toFixed(6)}`)
    report.push(`   提示: ${call.promptPreview}`)
    report.push('')
  })
  
  return report.join('\n')
}

// 重置统计信息
export function resetTokenStats(): void {
  globalStats = {
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    averageTokensPerCall: 0,
    callHistory: []
  }
  console.log('📊 Token统计已重置')
}

// 导出详细统计到JSON
export function exportTokenStats(): string {
  return JSON.stringify(globalStats, null, 2)
}