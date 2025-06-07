import * as fs from 'fs-extra'
import * as path from 'path'
import axios from 'axios'

export interface FileSystemOperations {
  createDirectory(dirPath: string): Promise<void>
  downloadImage(url: string, filePath: string): Promise<void>
  writeMarkdown(filePath: string, content: string): Promise<void>
  ensureDirectoryExists(dirPath: string): Promise<void>
  generateUniqueFileName(baseName: string, extension: string): string
}

// 创建目录
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath)
    console.log(`Directory created: ${dirPath}`)
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 确保目录存在
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath)
  } catch (error) {
    throw new Error(`Failed to ensure directory exists ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 下载图片
export async function downloadImage(url: string, filePath: string): Promise<void> {
  try {
    // 确保目标目录存在
    const dir = path.dirname(filePath)
    await ensureDirectoryExists(dir)

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30秒超时
    })

    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Image downloaded: ${filePath}`)
        resolve()
      })
      writer.on('error', reject)
    })
  } catch (error) {
    throw new Error(`Failed to download image from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 写入Markdown文件
export async function writeMarkdown(filePath: string, content: string): Promise<void> {
  try {
    // 确保目标目录存在
    const dir = path.dirname(filePath)
    await ensureDirectoryExists(dir)

    await fs.writeFile(filePath, content, 'utf8')
    console.log(`Markdown file written: ${filePath}`)
  } catch (error) {
    throw new Error(`Failed to write markdown file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 生成唯一文件名
export function generateUniqueFileName(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
  return `${cleanBaseName}_${timestamp}.${extension}`
}

// 创建安全的文件名（移除非法字符）
export function sanitizeFileName(fileName: string): string {
  // 移除或替换文件名中的非法字符
  let result = fileName;
  
  // 特殊处理路径遍历的情况
  if (fileName.includes('../')) {
    // 将 '../' 替换为 '_'，但保留后面可能的路径分隔符
    result = result.replace(/\.\.\//g, '_');
    // 如果在遍历字符后直接跟着一个文件名（没有路径分隔符），则添加一个 /
    // 这是为了处理 ../../../etc/passwd -> ___/etc/passwd 的情况
    if (result.match(/^_+[a-zA-Z]/)) {
      result = result.replace(/^(_+)([a-zA-Z])/, '$1/$2');
    }
    // 替换其他 Windows 非法字符，但保留 /
    result = result.replace(/[<>:"\\|?*]/g, '_');
  } else {
    // 没有路径遍历，替换所有非法字符
    result = result.replace(/[<>:"/\\|?*]/g, '_');
  }
  
  result = result.trim().substring(0, 255); // 限制文件名长度
  
  return result;
}

// 获取文件扩展名
export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase()
}

// 提取视频主题关键词的辅助函数
function extractVideoTheme(title: string): string {
  // 移除常见的YouTube标题格式标记
  let theme = title
    .replace(/【.*?】/g, '') // 移除中文括号内容
    .replace(/\[.*?\]/g, '') // 移除英文括号内容
    .replace(/\(.*?\)/g, '') // 移除圆括号内容
    .replace(/第\d+期/g, '') // 移除期数
    .replace(/EP\d+/gi, '') // 移除英文期数
    .replace(/S\d+E\d+/gi, '') // 移除季集数
    .replace(/\d{4}年\d{1,2}月\d{1,2}日/g, '') // 移除日期
    .replace(/\d{4}-\d{1,2}-\d{1,2}/g, '') // 移除日期
    .replace(/\d{1,2}:\d{2}:\d{2}/g, '') // 移除时间
    .replace(/[|｜]/g, ' ') // 替换分隔符
    .replace(/[：:]/g, ' ') // 替换冒号
    .replace(/[，,]/g, ' ') // 替换逗号
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim()

  // 如果处理后太短，使用原标题
  if (theme.length < 5) {
    theme = title
  }

  // 取前30个字符作为主题
  if (theme.length > 30) {
    // 尝试在词边界截断
    const words = theme.substring(0, 30).split(' ')
    if (words.length > 1) {
      words.pop() // 移除可能被截断的最后一个词
      theme = words.join(' ')
    } else {
      theme = theme.substring(0, 30)
    }
  }

  return theme.trim()
}

// 生成输出目录结构
export async function createOutputStructure(baseDir: string, videoTitle: string, videoId?: string): Promise<{
  outputDir: string
  markdownPath: string
}> {
  // 提取视频主题作为文件夹名称
  const theme = extractVideoTheme(videoTitle)
  let folderName = sanitizeFileName(theme)
  
  // 如果主题提取后为空，使用视频ID
  if (!folderName || folderName.length < 3) {
    folderName = videoId || 'video'
  }
  
  const outputDir = path.join(baseDir, folderName)
  const markdownPath = path.join(outputDir, `${sanitizeFileName(videoTitle)}_summary.md`)

  // 创建目录结构
  await ensureDirectoryExists(outputDir)

  return {
    outputDir,
    markdownPath,
  }
}

// 复制文件
export async function copyFile(source: string, destination: string): Promise<void> {
  try {
    const dir = path.dirname(destination)
    await ensureDirectoryExists(dir)
    await fs.copy(source, destination)
    console.log(`File copied: ${source} -> ${destination}`)
  } catch (error) {
    throw new Error(`Failed to copy file from ${source} to ${destination}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 检查文件是否存在
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
} 