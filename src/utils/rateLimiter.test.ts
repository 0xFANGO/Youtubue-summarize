import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RateLimiter, callLlmWithRetry, RATE_LIMIT_CONFIGS } from './rateLimiter'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter
  
  beforeEach(() => {
    rateLimiter = new RateLimiter(2, 100) // 最多2个并发，间隔100ms
  })

  it('should limit concurrent executions', async () => {
    const startTimes: number[] = []
    const endTimes: number[] = []
    
    // 创建5个任务，每个任务耗时200ms
    const tasks = Array.from({ length: 5 }, (_, i) => 
      rateLimiter.execute(async () => {
        startTimes.push(Date.now())
        await new Promise(resolve => setTimeout(resolve, 200))
        endTimes.push(Date.now())
        return i
      })
    )
    
    const results = await Promise.all(tasks)
    
    // 验证所有任务都完成了
    expect(results).toEqual([0, 1, 2, 3, 4])
    
    // 验证并发限制：前两个任务应该几乎同时开始
    expect(startTimes[1] - startTimes[0]).toBeLessThan(50)
    
    // 第三个任务应该在前面任务完成后才开始（考虑延迟）
    expect(startTimes[2] - startTimes[0]).toBeGreaterThan(250) // 200ms任务时间 + 100ms延迟 - 一些容差
  })

  it('should provide status information', async () => {
    const task1 = rateLimiter.execute(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'task1'
    })
    
    const task2 = rateLimiter.execute(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'task2'
    })
    
    const task3 = rateLimiter.execute(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'task3'
    })
    
    // 等待一小段时间让任务开始
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const status = rateLimiter.getStatus()
    expect(status.maxConcurrent).toBe(2)
    expect(status.activeRequests).toBeLessThanOrEqual(2)
    expect(status.queueLength).toBeGreaterThanOrEqual(0)
    
    await Promise.all([task1, task2, task3])
  })
})

describe('callLlmWithRetry', () => {
  it('should retry on rate limit errors', async () => {
    let callCount = 0
    const mockCallLlm = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount < 3) {
        throw new Error('rate limit exceeded')
      }
      return 'success'
    })
    
    const result = await callLlmWithRetry(mockCallLlm, 'test prompt', 3)
    
    expect(result).toBe('success')
    expect(mockCallLlm).toHaveBeenCalledTimes(3)
  })

  it('should throw error if max retries exceeded', async () => {
    const mockCallLlm = vi.fn().mockRejectedValue(new Error('rate limit exceeded'))
    
    await expect(callLlmWithRetry(mockCallLlm, 'test prompt', 2))
      .rejects.toThrow('Max retries exceeded')
    
    expect(mockCallLlm).toHaveBeenCalledTimes(2)
  })

  it('should not retry on non-rate-limit errors', async () => {
    const mockCallLlm = vi.fn().mockRejectedValue(new Error('invalid api key'))
    
    await expect(callLlmWithRetry(mockCallLlm, 'test prompt', 3))
      .rejects.toThrow('invalid api key')
    
    expect(mockCallLlm).toHaveBeenCalledTimes(1)
  })
})

describe('RATE_LIMIT_CONFIGS', () => {
  it('should have configs for common providers', () => {
    expect(RATE_LIMIT_CONFIGS.openai).toBeDefined()
    expect(RATE_LIMIT_CONFIGS.claude).toBeDefined()
    expect(RATE_LIMIT_CONFIGS.gemini).toBeDefined()
    expect(RATE_LIMIT_CONFIGS.default).toBeDefined()
    
    // 验证配置结构
    expect(RATE_LIMIT_CONFIGS.openai.maxConcurrent).toBeGreaterThan(0)
    expect(RATE_LIMIT_CONFIGS.openai.delayMs).toBeGreaterThan(0)
  })
}) 