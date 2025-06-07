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

// 生成输出目录结构
export async function createOutputStructure(baseDir: string, videoTitle: string): Promise<{
  outputDir: string
  screenshotsDir: string
  markdownPath: string
}> {
  const safeName = sanitizeFileName(videoTitle)
  const outputDir = path.join(baseDir, safeName)
  const screenshotsDir = path.join(outputDir, 'screenshots')
  const markdownPath = path.join(outputDir, `${safeName}_summary.md`)

  // 创建目录结构
  await ensureDirectoryExists(outputDir)
  await ensureDirectoryExists(screenshotsDir)

  return {
    outputDir,
    screenshotsDir,
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