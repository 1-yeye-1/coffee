import { requireAdmin, requireUser } from '../middlewares/auth.js'
import fs from 'node:fs/promises'
import { logAdminAction } from '../services/admin-log.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  batchDeleteUploadFiles,
  deleteUploadFile,
<<<<<<< HEAD
  getUploadFileDetail,
=======
>>>>>>> origin/master
  getUploadFileReferences,
  getUploadFileStats,
  listUploadFiles,
  saveAvatarUpload,
  saveCommunityUpload,
  saveProductUpload,
  saveReviewUpload,
  saveBookUpload,
  saveEventUpload,
} from '../services/upload.service.js'
import { createUploadMiddleware, assertUploadedFileSignature, assertUploadedFileSize, buildUploadedFileMeta } from '../utils/upload.js'
import { rateLimit } from '../middlewares/security.js'
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

function sendUploadSaveError(res, error) {
  if (error.statusCode && error.statusCode < 500) {
    return failure(res, error.statusCode, error.message, error.statusCode)
  }
  console.error(error)
  return failure(res, 500, '上传保存失败', 500)
}

export function registerUploadRoutes(router) {
  const uploadRateLimit = rateLimit({ key: 'upload', limit: 30 })

  router.post('/api/upload/avatar', uploadRateLimit, requireUser, uploadAvatar, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    let result
    try {
      result = await persistUploadedFile(req, req.user.id, saveAvatarUpload)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
    await recordAudit({ operatorId: req.user.id, actor: req.user, action: 'user.avatar.upload', module: 'account', targetType: 'upload', targetId: result.file.id, description: '用户上传头像', payload: { fileId: result.file.id, mimeType: result.file.mimeType, size: result.file.size }, req })
    return success(res, result, '头像上传成功', 201)
  })

  router.post('/api/upload/community', uploadRateLimit, requireUser, uploadCommunity, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    let result
    try {
      result = await persistUploadedFile(req, req.user.id, saveCommunityUpload)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
    return success(res, result, '社区媒体上传成功', 201)
  })

  router.post('/api/upload/product', uploadRateLimit, requireAdmin, uploadProduct, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    let result
    try {
      result = await persistUploadedFile(req, null, saveProductUpload)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
    return success(res, result, '商品示例图上传成功', 201)
  })

  router.post('/api/upload/review', uploadRateLimit, requireUser, uploadReview, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    let result
    try {
      result = await persistUploadedFile(req, req.user.id, saveReviewUpload)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
    return success(res, result, '评价媒体上传成功', 201)
  })

  router.post('/api/upload/book', uploadRateLimit, requireAdmin, uploadBook, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    try {
      return success(res, await persistUploadedFile(req, null, saveBookUpload), '图书封面上传成功', 201)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
  })

  router.post('/api/upload/event', uploadRateLimit, requireAdmin, uploadEvent, async (req, res) => {
    if (!requireFile(req, res)) return false
    await validateUploadedFile(req)
    try {
      return success(res, await persistUploadedFile(req, null, saveEventUpload), '活动海报上传成功', 201)
    } catch (error) {
      return sendUploadSaveError(res, error)
    }
  })

  router.get('/api/upload/files/stats', requireAdmin, async (_req, res) => success(res, await getUploadFileStats()))

<<<<<<< HEAD
  router.get('/api/upload/files/:id/detail', requireAdmin, async (req, res) => {
    const detail = await getUploadFileDetail(req.params.id)
    if (!detail) return failure(res, 404, '上传文件不存在', 404)
    await logAdminAction({ admin: req.user, action: 'view_detail', module: 'upload', targetType: 'file', targetId: req.params.id, description: '查看上传文件详情', req })
    return success(res, detail)
  })

=======
>>>>>>> origin/master
  router.get('/api/upload/files/:id/references', requireAdmin, async (req, res) => {
    const result = await listUploadFiles({ page: 1, pageSize: 1, id: req.params.id })
    const file = result.items.find((item) => Number(item.id) === Number(req.params.id))
    if (!file) return failure(res, 404, '?????', 404)
    await logAdminAction({ admin: req.user, action: 'view_sensitive', module: 'upload', targetType: 'file', targetId: req.params.id, description: '????????', req })
    return success(res, await getUploadFileReferences(file.url))
  })

  router.get('/api/upload/files', requireAdmin, async (req, res) => {
    const result = await listUploadFiles(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.post('/api/upload/files/batch-delete', requireAdmin, async (req, res) => {
    const result = await batchDeleteUploadFiles(req.body.ids, { force: Boolean(req.body.force) })
    await logAdminAction({ admin: req.user, action: 'batch_delete', module: 'upload', targetType: 'file', description: '????????', req, payload: result })
    return success(res, result, result.errors.length ? '????????' : '?????')
  })

  router.delete('/api/upload/files/:id', requireAdmin, async (req, res) => {
    const deleted = await deleteUploadFile(req.params.id, { force: req.query.force === '1' })
    if (!deleted) return failure(res, 404, '上传文件不存在', 404)
    await logAdminAction({ admin: req.user, action: 'delete', module: 'upload', targetType: 'file', targetId: req.params.id, description: '删除上传文件', req })
    return success(res, {}, '上传文件已删除')
  })
}
