# Token监控和优化指南

## 概述

Token监控系统可以帮助您：
- 📊 实时跟踪每次LLM调用的Token使用情况
- 💰 精确计算API调用成本
- 🔍 分析Token使用效率并获得优化建议
- 📈 保存详细的使用报告和历史数据

## 功能特性

### 1. 实时Token统计

每次LLM调用都会显示详细信息：
```
🤖 LLM调用完成 [gpt-4o]
📊 Token使用: 150(输入) + 300(输出) = 450(总计)
💰 本次成本: $0.001875 USD
⏱️  响应时间: 1250ms
📈 累计统计: 5次调用, 2250总tokens, $0.0094 USD
```

### 2. 自动成本计算

支持主流模型的最新定价：
- **gpt-4o**: 输入 $0.0025/1K, 输出 $0.01/1K tokens
- **gpt-4o-mini**: 输入 $0.00015/1K, 输出 $0.0006/1K tokens
- **gpt-4**: 输入 $0.03/1K, 输出 $0.06/1K tokens
- **gpt-3.5-turbo**: 输入 $0.001/1K, 输出 $0.002/1K tokens

### 3. 效率分析

智能分析您的Token使用模式：
```
🔍 Token使用效率分析
🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍
效率评级: 良好

💡 建议:
  1. 考虑将更多简单任务分配给经济模型
  2. 可以考虑优化Prompt，减少不必要的输入
```

## 使用方法

### 1. 在命令行中使用

#### 默认启用监控（推荐）
```bash
yarn cli "https://www.youtube.com/watch?v=VIDEO_ID"
```

#### 启用监控并保存统计文件
```bash
yarn cli "https://www.youtube.com/watch?v=VIDEO_ID" --save-token-files
```

#### 禁用监控
```bash
yarn cli "https://www.youtube.com/watch?v=VIDEO_ID" --no-token-monitor
```

#### 查看当前统计
```bash
yarn cli --token-stats
```

#### 重置统计数据
```bash
yarn cli --reset-token-stats
```

### 2. 在代码中使用

#### 基本使用
```typescript
import { callLlm, getTokenStats, getTokenStatsReport } from './utils/callLlm'

// 调用LLM（自动记录统计）
const response = await callLlm('您的提示词')

// 获取统计数据
const stats = getTokenStats()
console.log(`总调用次数: ${stats.totalCalls}`)
console.log(`总成本: $${stats.totalCost.toFixed(4)}`)

// 获取格式化报告
console.log(getTokenStatsReport())
```

#### 使用监控节点
```typescript
import { TokenResetNode, TokenMonitorNode, TokenSummaryNode } from './utils/tokenMonitor'
import { Flow } from 'pocketflow'

// 创建带监控的流程
const resetNode = new TokenResetNode()
const monitorNode = new TokenMonitorNode(true, true) // 生成报告并保存文件
const summaryNode = new TokenSummaryNode(true) // 显式启用文件保存

// 将监控节点插入到您的流程中
yourMainFlow
  .next(monitorNode)  // 在关键步骤后插入监控
  .next(summaryNode)  // 在流程结束时生成汇总

const flow = new Flow(resetNode)
flow.next(yourMainFlow)
```

### 3. 效率分析

```typescript
import { getTokenEfficiencyAnalysis, printTokenEfficiencyAnalysis } from './utils/tokenMonitor'

// 获取分析结果
const analysis = getTokenEfficiencyAnalysis()
console.log(`效率评级: ${analysis.efficiency}`)
analysis.warnings.forEach(warning => console.log(`⚠️ ${warning}`))
analysis.recommendations.forEach(rec => console.log(`💡 ${rec}`))

// 或者直接打印格式化分析
printTokenEfficiencyAnalysis()
```

## 优化建议

### 1. 选择合适的模型

根据任务复杂度选择模型：
- **简单任务**（分类、简短总结）：使用 `gpt-4o-mini`
- **复杂任务**（长文档分析、创意写作）：使用 `gpt-4o`
- **最高质量要求**：使用 `gpt-4`

```typescript
// 示例：根据任务选择模型
const simpleTask = await callLlm('将这个标题分类', 'gpt-4o-mini')
const complexTask = await callLlm('详细分析这篇论文', 'gpt-4o')
```

### 2. 优化Prompt长度

- ✅ **好的做法**：精简提示，只包含必要信息
- ❌ **避免**：重复说明、冗长示例

```typescript
// ❌ 冗长的Prompt
const badPrompt = `
请您作为一个专业的总结专家，仔细阅读以下内容，
然后用中文进行总结，总结要详细，要包含所有要点，
要保持原文的意思，不要遗漏任何重要信息...
内容如下：${content}
`

// ✅ 精简的Prompt
const goodPrompt = `请用中文总结以下内容，突出主要观点：\n${content}`
```

### 3. 使用分段处理

对于大文档，建议分段处理：

```typescript
// 将大文档分成小段
const chunks = splitIntoChunks(largeDocument, 1000) // 每段1000字符

// 并行处理各段（注意速率限制）
const summaries = await Promise.all(
  chunks.map(chunk => callLlm(`总结：${chunk}`, 'gpt-4o-mini'))
)

// 最后合并总结
const finalSummary = await callLlm(`合并以下总结：${summaries.join('\n')}`)
```

### 4. 实施缓存策略

```typescript
import { memoize } from 'lodash'

// 对相同输入进行缓存
const cachedCallLlm = memoize(callLlm)

// 在重试时禁用缓存
const result = await callLlm(prompt, model, this.currentRetry === 0)
```

## 报告文件

当使用 `--save-token-files` 选项时，系统会在输出目录生成：

1. **token-report-TIMESTAMP.txt** - 人类可读的详细报告
2. **token-data-TIMESTAMP.json** - 机器可读的原始数据

注意：默认情况下不会保存这些文件，只会显示控制台输出。

## 故障排除

### 1. 统计数据不准确

- 确保所有LLM调用都使用统一的 `callLlm` 函数
- 检查是否有直接调用OpenAI API的代码绕过了统计

### 2. 成本计算不准确

- 检查模型名称是否正确
- 更新 `TOKEN_PRICING` 对象中的最新定价

### 3. 文件保存失败

- 确保输出目录有写入权限
- 检查磁盘空间是否充足

## API参考

### callLlm()
```typescript
callLlm(prompt: string, model?: string): Promise<string>
```

### getTokenStats()
```typescript
getTokenStats(): TokenStats
```

### getTokenStatsReport()
```typescript
getTokenStatsReport(): string
```

### resetTokenStats()
```typescript
resetTokenStats(): void
```

### TokenMonitorNode
```typescript
new TokenMonitorNode(generateReport?: boolean, saveToFile?: boolean)
```

### TokenSummaryNode
```typescript
new TokenSummaryNode(saveDetailedReport?: boolean)
``` 