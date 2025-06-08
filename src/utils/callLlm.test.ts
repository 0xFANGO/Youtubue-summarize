import { describe, it, expect, beforeEach } from 'vitest'
import { callLlm, getTokenStats, resetTokenStats, getTokenStatsReport } from './callLlm'

// 注意：这些测试需要真实的OpenAI API密钥
// 在CI/CD环境中应该使用mock
describe('callLlm', () => {
  beforeEach(() => {
    // 重置统计信息
    resetTokenStats()
    
    // 确保有API密钥用于测试
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, skipping OpenAI integration tests')
    }
  })

  it('should return a response for a simple prompt', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    const prompt = 'Say "Hello, World!" and nothing else.'
    const response = await callLlm(prompt)
    
    expect(response).toBeTruthy()
    expect(typeof response).toBe('string')
    expect(response.length).toBeGreaterThan(0)
    
    // 检查token统计
    const stats = getTokenStats()
    expect(stats.totalCalls).toBe(1)
    expect(stats.totalTokens).toBeGreaterThan(0)
    expect(stats.totalCost).toBeGreaterThan(0)
  }, 10000) // 10秒超时

  it('should handle Chinese summarization task', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    const prompt = `
请将以下英文内容总结为中文，控制在50字以内：
"This is a test video about artificial intelligence and machine learning. 
The video covers basic concepts, applications, and future trends in AI technology."
`
    const response = await callLlm(prompt)
    
    expect(response).toBeTruthy()
    expect(typeof response).toBe('string')
    expect(response.length).toBeLessThan(200) // 应该是中文总结
  }, 15000)

  it('should work with different models', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    const prompt = 'Count to 3 in Chinese'
    const response = await callLlm(prompt, 'gpt-4o-mini')
    
    expect(response).toBeTruthy()
    expect(typeof response).toBe('string')
    
    // 检查token统计
    const stats = getTokenStats()
    expect(stats.callHistory[0].model).toBe('gpt-4o-mini')
  }, 10000)

  it('should track token statistics correctly', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    // 第一次调用
    await callLlm('Hello')
    let stats = getTokenStats()
    expect(stats.totalCalls).toBe(1)
    expect(stats.callHistory).toHaveLength(1)
    
    // 第二次调用
    await callLlm('World')
    stats = getTokenStats()
    expect(stats.totalCalls).toBe(2)
    expect(stats.callHistory).toHaveLength(2)
    expect(stats.averageTokensPerCall).toBeGreaterThan(0)
  }, 20000)

  it('should generate proper stats report', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    // 先调用一次
    await callLlm('Generate a short test response')
    
    const report = getTokenStatsReport()
    expect(report).toContain('Token使用统计报告')
    expect(report).toContain('总调用次数: 1')
    expect(report).toContain('总Token数')
    expect(report).toContain('总成本')
  }, 10000)

  it('should throw error when API key is missing', async () => {
    // 临时移除API密钥
    const originalKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    await expect(callLlm('test prompt')).rejects.toThrow('OPENAI_API_KEY environment variable is not set')

    // 恢复API密钥
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey
    }
  })

  it('should handle empty prompt', async () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true) // 跳过测试
      return
    }

    const response = await callLlm('')
    expect(response).toBeTruthy()
    expect(typeof response).toBe('string')
  }, 10000)

  it('should reset statistics correctly', () => {
    resetTokenStats()
    const stats = getTokenStats()
    expect(stats.totalCalls).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(stats.totalCost).toBe(0)
    expect(stats.callHistory).toHaveLength(0)
  })
}) 