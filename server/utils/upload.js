import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const uploadRoot = path.resolve(__dirname, '../public/uploads')

const dangerousExtensions = new Set([
  'js',
  'html',
  'htm',
  'php',
  'exe',
  'bat',
  'sh',
  'cmd',
  'msi',
  'dll',
  'jsp',
  'asp',
  'aspx',
])

const avatarRules = {
  extensions: new Set(['jpg', 'jpeg', 'png', 'webp']),
  mimes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  maxSize: 2 * 1024 * 1024,
}

const communityImageRules = {
  extensions: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']),
  mimes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  maxSize: 5 * 1024 * 1024,
}

const contentImageRules = {
  extensions: new Set(['jpg', 'jpeg', 'png', 'webp']),
  mimes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  maxSize: 5 * 1024 * 1024,
}

const communityVideoRules = {
  extensions: new Set(['mp4', 'webm', 'mov']),
  mimes: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
  maxSize: 50 * 1024 * 1024,
}

function createUploadError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function safeExtension(filename) {
  const normalized = String(filename || '').replace(/\\/g, '/').split('/').pop().toLowerCase()
  const segments = normalized.split('.').filter(Boolean)
  if (segments.some((segment, index) => index < segments.length - 1 && dangerousExtensions.has(segment))) return ''
  const ext = path.extname(normalized).slice(1).toLowerCase()
  if (!ext || dangerousExtensions.has(ext)) return ''
  return ext
}

function randomName(ext) {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`
}

function decodeOriginalName(name) {
  const value = String(name || '')
  if (!value) return value
  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8')
    return decoded.includes('\uFFFD') ? value : decoded
  } catch {
    return value
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function matchRules(file, rules) {
  file.originalname = decodeOriginalName(file.originalname)
  const ext = safeExtension(file.originalname)
  if (!ext) return { ok: false, message: '不允许上传该文件类型' }
  if (!rules.extensions.has(ext) || !rules.mimes.has(file.mimetype)) {
    return { ok: false, message: '文件扩展名或 MIME 类型不符合要求' }
  }
  return { ok: true, ext }
}

function resolveCommunityTarget(file) {
  const imageMatch = matchRules(file, communityImageRules)
  if (imageMatch.ok) {
    return {
      ...imageMatch,
      fileType: 'image',
      maxSize: communityImageRules.maxSize,
      directory: path.join(uploadRoot, 'community/images'),
      urlBase: '/uploads/community/images',
    }
  }

  const videoMatch = matchRules(file, communityVideoRules)
  if (videoMatch.ok) {
    return {
      ...videoMatch,
      fileType: 'video',
      maxSize: communityVideoRules.maxSize,
      directory: path.join(uploadRoot, 'community/videos'),
      urlBase: '/uploads/community/videos',
    }
  }

  return { ok: false, message: '社区媒体仅支持 jpg、jpeg、png、webp、gif、mp4、webm、mov 文件' }
}

function resolveProductTarget(file) {
  const imageMatch = matchRules(file, communityImageRules)
  if (!imageMatch.ok) return { ok: false, message: '商品示例图仅支持 jpg、jpeg、png、webp、gif 文件' }
  return {
    ...imageMatch,
    fileType: 'image',
    maxSize: communityImageRules.maxSize,
    directory: path.join(uploadRoot, 'products'),
    urlBase: '/uploads/products',
  }
}

function resolveContentImageTarget(scene, file) {
  const imageMatch = matchRules(file, contentImageRules)
  if (!imageMatch.ok) return { ok: false, message: '封面图片仅支持 jpg、jpeg、png、webp 文件' }
  return {
    ...imageMatch,
    fileType: 'image',
    maxSize: contentImageRules.maxSize,
    directory: path.join(uploadRoot, `${scene}s`),
    urlBase: `/uploads/${scene}s`,
  }
}

function resolveReviewTarget(file) {
  const imageMatch = matchRules(file, communityImageRules)
  if (imageMatch.ok) {
    return {
      ...imageMatch,
      fileType: 'image',
      maxSize: communityImageRules.maxSize,
      directory: path.join(uploadRoot, 'reviews/images'),
      urlBase: '/uploads/reviews/images',
    }
  }
  const videoMatch = matchRules(file, communityVideoRules)
  if (videoMatch.ok) {
    return {
      ...videoMatch,
      fileType: 'video',
      maxSize: communityVideoRules.maxSize,
      directory: path.join(uploadRoot, 'reviews/videos'),
      urlBase: '/uploads/reviews/videos',
    }
  }
  return { ok: false, message: '评价媒体仅支持图片或 mp4、webm、mov 视频' }
}

function resolveTarget(scene, file) {
  if (scene === 'avatar') {
    const match = matchRules(file, avatarRules)
    if (!match.ok) return match
    return {
      ...match,
      fileType: 'image',
      maxSize: avatarRules.maxSize,
      directory: path.join(uploadRoot, 'avatar'),
      urlBase: '/uploads/avatar',
    }
  }
  if (scene === 'product') return resolveProductTarget(file)
  if (scene === 'book' || scene === 'event') return resolveContentImageTarget(scene, file)
  if (scene === 'review') return resolveReviewTarget(file)
  return resolveCommunityTarget(file)
}

export function createUploadMiddleware(scene) {
  const storage = multer.diskStorage({
    destination(_req, file, callback) {
      const target = resolveTarget(scene, file)
      if (!target.ok) {
        callback(createUploadError(target.message))
        return
      }
      ensureDir(target.directory)
      file.uploadTarget = target
      callback(null, target.directory)
    },
    filename(_req, file, callback) {
      const target = file.uploadTarget || resolveTarget(scene, file)
      if (!target.ok) {
        callback(createUploadError(target.message))
        return
      }
      const storedName = randomName(target.ext)
      file.storedName = storedName
      callback(null, storedName)
    },
  })

  return multer({
    storage,
    limits: {
      fileSize: scene === 'avatar'
        ? avatarRules.maxSize
        : ['book', 'event', 'product'].includes(scene)
          ? communityImageRules.maxSize
          : communityVideoRules.maxSize,
    },
    fileFilter(_req, file, callback) {
      const target = resolveTarget(scene, file)
      if (!target.ok) {
        callback(createUploadError(target.message))
        return
      }
      file.uploadTarget = target
      callback(null, true)
    },
  }).single('file')
}

export function buildUploadedFileMeta(file) {
  const target = file.uploadTarget
  return {
    scene: target.urlBase.includes('/avatar')
      ? 'avatar'
      : target.urlBase.includes('/products')
        ? 'product'
        : target.urlBase.includes('/books')
          ? 'book'
          : target.urlBase.includes('/events')
            ? 'event'
        : target.urlBase.includes('/reviews')
          ? 'review'
          : 'community',
    fileType: target.fileType,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    url: `${target.urlBase}/${file.filename}`,
    storagePath: file.path,
  }
}

export async function assertUploadedFileSignature(file) {
  const handle = await fs.promises.open(file.path, 'r')
  const header = Buffer.alloc(16)
  try { await handle.read(header, 0, header.length, 0) } finally { await handle.close() }
  const hex = header.toString('hex')
  const ascii = header.toString('ascii')
  const signatures = {
    'image/jpeg': hex.startsWith('ffd8ff'),
    'image/png': hex.startsWith('89504e470d0a1a0a'),
    'image/gif': ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a'),
    'image/webp': ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP',
    'video/mp4': ascii.slice(4, 8) === 'ftyp',
    'video/quicktime': ascii.slice(4, 8) === 'ftyp',
    'video/webm': hex.startsWith('1a45dfa3'),
  }
  if (!signatures[file.mimetype]) throw createUploadError('文件内容与声明类型不匹配')
}

export function assertUploadedFileSize(file) {
  const target = file.uploadTarget
  if (file.size > target.maxSize) {
    throw createUploadError(target.fileType === 'video' ? '视频文件不能超过 50MB' : target.urlBase.includes('/avatar') ? '头像文件不能超过 2MB' : '图片文件不能超过 5MB')
  }
}

export function assertPathInsideUploads(targetPath) {
  const resolvedRoot = path.resolve(uploadRoot)
  const resolvedTarget = path.resolve(targetPath)
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw createUploadError('文件路径不安全，已拒绝删除', 400)
  }
  return resolvedTarget
}
