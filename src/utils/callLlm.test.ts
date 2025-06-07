import { describe, it, expect, beforeEach } from 'vitest'
import { callLlm } from './callLlm'

// 注意：这些测试需要真实的OpenAI API密钥
// 在CI/CD环境中应该使用mock
describe('callLlm', () => {
  beforeEach(() => {
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
}) 