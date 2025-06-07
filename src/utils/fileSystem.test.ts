import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import {
  createDirectory,
  ensureDirectoryExists,
  writeMarkdown,
  generateUniqueFileName,
  sanitizeFileName,
  createOutputStructure,
  fileExists,
} from './fileSystem'

const TEST_DIR = path.join(__dirname, '../..', 'test-output')

describe('fileSystem utilities', () => {
  beforeEach(async () => {
    // 清理测试目录
    await fs.remove(TEST_DIR)
  })

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(TEST_DIR)
  })

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      const testPath = path.join(TEST_DIR, 'test-create')
      
      await createDirectory(testPath)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
    })

    it('should create nested directories', async () => {
      const testPath = path.join(TEST_DIR, 'nested', 'deep', 'structure')
      
      await createDirectory(testPath)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
    })
  })

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const testPath = path.join(TEST_DIR, 'test-ensure')
      
      await ensureDirectoryExists(testPath)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
    })

    it('should not fail if directory already exists', async () => {
      const testPath = path.join(TEST_DIR, 'test-ensure-existing')
      
      await fs.ensureDir(testPath)
      await ensureDirectoryExists(testPath)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
    })
  })

  describe('writeMarkdown', () => {
    it('should write markdown file successfully', async () => {
      const testPath = path.join(TEST_DIR, 'test.md')
      const content = '# Test Markdown\n\nThis is a test.'
      
      await writeMarkdown(testPath, content)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
      
      const writtenContent = await fs.readFile(testPath, 'utf8')
      expect(writtenContent).toBe(content)
    })

    it('should create parent directories if they do not exist', async () => {
      const testPath = path.join(TEST_DIR, 'nested', 'path', 'test.md')
      const content = '# Nested Test'
      
      await writeMarkdown(testPath, content)
      
      const exists = await fs.pathExists(testPath)
      expect(exists).toBe(true)
    })
  })

  describe('generateUniqueFileName', () => {
    it('should generate unique file name with timestamp', () => {
      const baseName = 'test-video'
      const extension = 'md'
      
      const fileName = generateUniqueFileName(baseName, extension)
      
      expect(fileName).toMatch(/^test_video_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.\d+Z\.md$/)
    })

    it('should handle special characters in base name', () => {
      const baseName = 'test video: with/special\\chars<>|?*'
      const extension = 'md'
      
      const fileName = generateUniqueFileName(baseName, extension)
      
      expect(fileName).toMatch(/^test_video__with_special_chars______/)
      expect(fileName).toMatch(/\.md$/)
    })
  })

  describe('sanitizeFileName', () => {
    it('should remove illegal characters', () => {
      const fileName = 'test<>:"/\\|?*file.txt'
      const sanitized = sanitizeFileName(fileName)
      
      expect(sanitized).toBe('test_________file.txt')
    })

    it('should handle path traversal attempts', () => {
      const fileName = '../../../etc/passwd'
      const sanitized = sanitizeFileName(fileName)
      
      expect(sanitized).toBe('___/etc/passwd')
    })

    it('should limit file name length', () => {
      const longName = 'a'.repeat(300)
      const sanitized = sanitizeFileName(longName)
      
      expect(sanitized.length).toBeLessThanOrEqual(255)
    })
  })

  describe('createOutputStructure', () => {
    it('should create proper output structure', async () => {
      const videoTitle = 'Test Video: Amazing Content!'
      
      const structure = await createOutputStructure(TEST_DIR, videoTitle)
      
      expect(structure).toHaveProperty('outputDir')
      expect(structure).toHaveProperty('screenshotsDir')
      expect(structure).toHaveProperty('markdownPath')
      
      // Check if directories were created
      const outputExists = await fs.pathExists(structure.outputDir)
      const screenshotsExists = await fs.pathExists(structure.screenshotsDir)
      
      expect(outputExists).toBe(true)
      expect(screenshotsExists).toBe(true)
      
      // Check path structure
      expect(structure.screenshotsDir).toMatch(/screenshots$/)
      expect(structure.markdownPath).toMatch(/\.md$/)
    })
  })

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testPath = path.join(TEST_DIR, 'existing.txt')
      
      await fs.ensureDir(TEST_DIR)
      await fs.writeFile(testPath, 'test content')
      
      const exists = await fileExists(testPath)
      expect(exists).toBe(true)
    })

    it('should return false for non-existing file', async () => {
      const testPath = path.join(TEST_DIR, 'non-existing.txt')
      
      const exists = await fileExists(testPath)
      expect(exists).toBe(false)
    })
  })
}) 