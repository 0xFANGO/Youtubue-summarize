import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

interface GlobalConfig {
  openai_api_key?: string
  // 未来可以添加其他配置项
  default_output_dir?: string
  default_segment_minutes?: number
}

// 全局配置文件路径
const CONFIG_DIR = path.join(os.homedir(), '.video-summary')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/**
 * 读取全局配置
 */
export function readGlobalConfig(): GlobalConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {}
    }
    
    const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return JSON.parse(configContent) as GlobalConfig
  } catch (error) {
    console.warn(`⚠️  读取配置文件失败: ${error instanceof Error ? error.message : error}`)
    return {}
  }
}

/**
 * 写入全局配置
 */
export function writeGlobalConfig(config: GlobalConfig): void {
  try {
    ensureConfigDir()
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    throw new Error(`写入配置文件失败: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * 设置API密钥
 */
export function setApiKey(apiKey: string): void {
  const config = readGlobalConfig()
  config.openai_api_key = apiKey
  writeGlobalConfig(config)
  console.log('✅ API密钥已保存到全局配置')
}

/**
 * 获取API密钥
 * 优先级：环境变量 > 全局配置
 */
export function getApiKey(): string | undefined {
  // 1. 首先检查环境变量
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }
  
  // 2. 然后检查全局配置
  const config = readGlobalConfig()
  return config.openai_api_key
}

/**
 * 移除API密钥
 */
export function removeApiKey(): void {
  const config = readGlobalConfig()
  delete config.openai_api_key
  writeGlobalConfig(config)
  console.log('✅ API密钥已从全局配置中移除')
}

/**
 * 显示当前配置
 */
export function showConfig(): void {
  const config = readGlobalConfig()
  const hasEnvKey = !!process.env.OPENAI_API_KEY
  const hasConfigKey = !!config.openai_api_key
  
  console.log('📋 当前配置信息:')
  console.log('='.repeat(40))
  
  console.log(`配置文件位置: ${CONFIG_FILE}`)
  console.log(`环境变量 OPENAI_API_KEY: ${hasEnvKey ? '✅ 已设置' : '❌ 未设置'}`)
  console.log(`全局配置 API密钥: ${hasConfigKey ? '✅ 已设置' : '❌ 未设置'}`)
  
  if (hasEnvKey && hasConfigKey) {
    console.log('💡 注意: 环境变量优先级更高，将使用环境变量中的API密钥')
  } else if (!hasEnvKey && !hasConfigKey) {
    console.log('❌ 错误: 未找到API密钥，请使用以下命令之一设置:')
    console.log('   vs config set-key <your-api-key>')
    console.log('   export OPENAI_API_KEY="your-api-key"')
  }
  
  // 显示其他配置项
  if (config.default_output_dir) {
    console.log(`默认输出目录: ${config.default_output_dir}`)
  }
  if (config.default_segment_minutes) {
    console.log(`默认分段时长: ${config.default_segment_minutes}分钟`)
  }
}

/**
 * 设置默认输出目录
 */
export function setDefaultOutputDir(outputDir: string): void {
  const config = readGlobalConfig()
  config.default_output_dir = outputDir
  writeGlobalConfig(config)
  console.log(`✅ 默认输出目录已设置为: ${outputDir}`)
}

/**
 * 获取默认输出目录
 */
export function getDefaultOutputDir(): string | undefined {
  const config = readGlobalConfig()
  return config.default_output_dir
}

/**
 * 设置默认分段时长
 */
export function setDefaultSegmentMinutes(minutes: number): void {
  const config = readGlobalConfig()
  config.default_segment_minutes = minutes
  writeGlobalConfig(config)
  console.log(`✅ 默认分段时长已设置为: ${minutes}分钟`)
}

/**
 * 获取默认分段时长
 */
export function getDefaultSegmentMinutes(): number | undefined {
  const config = readGlobalConfig()
  return config.default_segment_minutes
}

/**
 * 重置所有配置
 */
export function resetConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE)
    }
    console.log('✅ 全局配置已重置')
  } catch (error) {
    throw new Error(`重置配置失败: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * 获取配置文件路径（用于调试）
 */
export function getConfigPath(): string {
  return CONFIG_FILE
} 