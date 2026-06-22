import { requireAdmin, requireUser } from '../middlewares/auth.js'
import fs from 'node:fs/promises'
import { logAdminAction } from '../services/admin-log.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  deleteUploadFile,
  listUploadFiles,
  saveAvatarUpload,
  saveCommunityUpload,
  saveProductUpload,
  saveReviewUpload,
  saveBookUpload,
  saveEventUpload,
} from '../services/upload.service.js'
import { createUploadMiddleware, assertUploadedFileSignature, assertUploadedFileSize, buildUploadedFileMeta } from '../utils/upload.js'
import { failure, paginated, success } from '../utils/response.js'

const uploadAvatar = createUploadMiddleware('avatar')
const uploadCommunity = createUploadMiddleware('community')
const uploadProduct = createUploadMiddleware('product')
const uploadReview = createUploadMiddleware('review')
const uploadBook = createUploadMiddleware('book')
const uploadEvent = createUploadMiddleware('event')

function requireFile(req, res) {
  if (req.file) return true
  failure(res, 400, '请选择要上传的文件')
  return false
}

async function validateUploadedFile(req) {
  try {
    assertUploadedFileSize(req.file)
    await assertUploadedFileSignature(req.file)
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    throw error
  }
}

async function persistUploadedFile(req, userId, save) {
  try {
    return await save(userId, buildUploadedFileMeta(req.file))
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {})
    throw error
  }
}

export function registerUploadRoutes(router) {
  router.post('/api/upload/avatar', requireUser, uploadAvatar, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    const result = await persistUploadedFile(req, req.user.id, saveAvatarUpload)
    await recordAudit({ operatorId: req.user.id, actor: req.user, action: 'user.avatar.upload', module: 'account', targetType: 'upload', targetId: result.file.id, description: '用户上传头像', payload: { fileId: result.file.id, mimeType: result.file.mimeType, size: result.file.size }, req })
    return success(res, result, '头像上传成功', 201)
  })

  router.post('/api/upload/community', requireUser, uploadCommunity, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    const result = await persistUploadedFile(req, req.user.id, saveCommunityUpload)
    return success(res, result, '社区媒体上传成功', 201)
  })

  router.post('/api/upload/product', requireAdmin, uploadProduct, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    const result = await persistUploadedFile(req, req.user.id, saveProductUpload)
    return success(res, result, '商品示例图上传成功', 201)
  })

  router.post('/api/upload/review', requireUser, uploadReview, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    const result = await persistUploadedFile(req, req.user.id, saveReviewUpload)
    return success(res, result, '评价媒体上传成功', 201)
  })

  router.post('/api/upload/book', requireAdmin, uploadBook, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    return success(res, await persistUploadedFile(req, req.user.id, saveBookUpload), '图书封面上传成功', 201)
  })

  router.post('/api/upload/event', requireAdmin, uploadEvent, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    return success(res, await persistUploadedFile(req, req.user.id, saveEventUpload), '活动海报上传成功', 201)
  })

  router.get('/api/upload/files', requireAdmin, async (req, res) => {
    const result = await listUploadFiles(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.delete('/api/upload/files/:id', requireAdmin, async (req, res) => {
    const deleted = await deleteUploadFile(req.params.id)
    if (!deleted) return failure(res, 404, '上传文件不存在', 404)
    await logAdminAction({ admin: req.user, action: 'delete', module: 'upload', targetType: 'file', targetId: req.params.id, description: '删除上传文件', req })
    return success(res, {}, '上传文件已删除')
  })
}
