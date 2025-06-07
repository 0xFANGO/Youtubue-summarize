/**
 * 智能速率限制器
 * 控制API请求的并发数量和频率，避免触发速率限制
 */
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxConcurrent: number;
  private readonly delayBetweenRequests: number;
  private activeRequests = 0;

  constructor(maxConcurrent = 3, delayMs = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayMs;
  }

  /**
   * 执行一个异步函数，受速率限制控制
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * 处理队列中的任务
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const task = this.queue.shift()!;
      this.activeRequests++;

      task().finally(() => {
        this.activeRequests--;
        setTimeout(() => this.processQueue(), this.delayBetweenRequests);
      });
    }

    this.processing = false;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent
    };
  }
}

/**
 * 带重试机制的LLM调用
 */
export async function callLlmWithRetry(
  callLlmFn: (prompt: string) => Promise<string>,
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callLlmFn(prompt);
    } catch (error: any) {
      if (error.message?.includes('rate limit') && i < maxRetries - 1) {
        // 指数退避策略
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * 常见LLM服务的推荐配置
 */
export const RATE_LIMIT_CONFIGS = {
  openai: { maxConcurrent: 3, delayMs: 1000 },
  claude: { maxConcurrent: 2, delayMs: 1500 },
  gemini: { maxConcurrent: 5, delayMs: 500 },
  default: { maxConcurrent: 3, delayMs: 1000 }
} as const; 