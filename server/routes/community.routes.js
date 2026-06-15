import { requireUser } from '../middlewares/auth.js'
import {
  createComment,
  createPost,
  findPost,
  listPosts,
  togglePostLike,
} from '../services/community.service.js'
import { failure, paginated, success } from '../utils/response.js'

function requireBodyFields(res, payload, fields) {
  const missing = fields.find((field) => !String(payload[field] || '').trim())
  if (missing) {
    failure(res, 400, `${missing} 必填`)
    return false
  }
  return true
}

export function registerCommunityRoutes(router) {
  router.get('/api/posts', async (req, res) => {
    const result = await listPosts(req.query)
    return paginated(res, result.items, result.meta)
  })

  router.get('/api/posts/:id', async (req, res) => {
    const post = await findPost(req.params.id)
    if (!post) return failure(res, 404, '帖子不存在', 404)
    return success(res, post)
  })

  router.post('/api/posts', requireUser, async (req, res) => {
    if (!requireBodyFields(res, req.body, ['title', 'content'])) return false
    return success(res, await createPost(req.body, req.user), '发布成功，等待审核', 201)
  })

  router.post('/api/posts/:id/comments', requireUser, async (req, res) => {
    if (!requireBodyFields(res, req.body, ['content'])) return false
    if (!await findPost(req.params.id, true)) return failure(res, 404, '帖子不存在', 404)
    return success(res, await createComment(req.params.id, req.body, req.user), '评论成功', 201)
  })

  router.post('/api/posts/:id/like', requireUser, async (req, res) => {
    if (!await findPost(req.params.id, true)) return failure(res, 404, '帖子不存在', 404)
    return success(res, await togglePostLike(req.params.id, req.user.id))
  })
}
