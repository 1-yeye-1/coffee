import { pool } from '../db/mysql.js'
import { parsePagination } from '../utils/pagination.js'
import { writeAudit } from './admin.service.js'
import { maskPhone } from './account.service.js'
import { createNotification } from './notifications.service.js'

const postColumns = `
  id, slug, user_id AS userId, title, author, avatar, topic, excerpt, content,
  media_url AS mediaUrl, media_type AS mediaType,
  status AS reviewStatus, featured, likes_count AS likes, comments_count AS commentsCount,
  created_at AS createdAt, updated_at AS updatedAt
`

const commentColumns = `
  id, post_id AS postId, user_id AS userId, author, content, status, is_anonymous AS isAnonymous,
  created_at AS createdAt, updated_at AS updatedAt
`

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `post-${Date.now()}`
}

async function getComments(postId, publishedOnly = true) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.author, c.content, c.status,
      c.is_anonymous AS isAnonymous,
      c.created_at AS createdAt, c.updated_at AS updatedAt,
      u.nickname, u.username, u.avatar AS userAvatar, u.phone, u.profile_public AS profilePublic
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ${publishedOnly ? "AND c.status = 'published'" : ''}
     ORDER BY c.created_at ASC, c.id ASC`,
    [postId],
  )
  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    userId: row.userId,
    author: row.isAnonymous && publishedOnly ? '匿名用户' : row.author,
    isAnonymous: Boolean(row.isAnonymous),
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.userId && !(row.isAnonymous && publishedOnly) ? {
      id: row.userId,
      nickname: row.nickname || row.username || row.author,
      avatar: row.userAvatar,
      phoneMasked: maskPhone(row.phone),
      profilePublic: row.profilePublic === undefined ? true : Boolean(row.profilePublic),
    } : null,
  }))
}

async function getReports(postId) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.post_id AS postId, r.comment_id AS commentId,
      r.reporter_id AS reporterId, r.reason, r.description, r.status,
      r.target_previous_status AS targetPreviousStatus, r.resolution,
      r.handled_by AS handledBy, r.handled_at AS handledAt,
      r.created_at AS createdAt, r.updated_at AS updatedAt,
      u.nickname, u.username, u.phone
     FROM content_reports r
     INNER JOIN users u ON u.id = r.reporter_id
     WHERE r.post_id = ?
     ORDER BY FIELD(r.status, 'pending', 'resolved', 'dismissed'), r.created_at DESC`,
    [postId],
  )
  return rows.map((row) => ({
    ...row,
    reporter: {
      id: row.reporterId,
      nickname: row.nickname || row.username || `用户${String(row.reporterId).slice(-4)}`,
      phoneMasked: maskPhone(row.phone),
    },
  }))
}

async function attachComments(posts, publishedOnly = true) {
  return Promise.all(posts.map(async (post) => ({
    ...post,
    status: post.reviewStatus,
    featured: Boolean(post.featured),
    comments: await getComments(post.id, publishedOnly),
    ...(publishedOnly ? {} : { reports: await getReports(post.id) }),
  })))
}

export async function listPosts(query = {}, admin = false) {
  const { page, pageSize, offset } = parsePagination(query)
  const clauses = []
  const params = []
  if (!admin) clauses.push("status = 'published'")
  if (query.status) {
    clauses.push('status = ?')
    params.push(query.status)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = query.sort === 'latest' ? 'created_at DESC, id DESC' : 'likes_count DESC, created_at DESC'
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM posts ${where}`, params)
  const [rows] = await pool.query(
    `SELECT ${postColumns} FROM posts ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  return { items: await attachComments(rows, !admin), meta: { page, pageSize, total: Number(countRows[0].total) } }
}

export async function findPost(idOrSlug, admin = false) {
  const clauses = ['(id = ? OR slug = ?)']
  const params = [idOrSlug, idOrSlug]
  if (!admin) clauses.push("status = 'published'")
  const [rows] = await pool.execute(
    `SELECT ${postColumns} FROM posts WHERE ${clauses.join(' AND ')} LIMIT 1`,
    params,
  )
  const [post] = await attachComments(rows, !admin)
  return post || null
}

export async function createPost(payload, user) {
  const title = String(payload.title || '').trim()
  const content = String(payload.content || '').trim()
  const slug = `${slugify(payload.slug || title)}-${Date.now()}`
  const author = user?.username || 'Coffee Reader'
  const avatar = author.slice(0, 1).toUpperCase()
  const mediaUrl = String(payload.mediaUrl || payload.media_url || '').trim() || null
  const mediaType = String(payload.mediaType || payload.media_type || '').trim() || null
  if (mediaType && !['image', 'video'].includes(mediaType)) {
    throw Object.assign(new Error('媒体类型不正确'), { statusCode: 400 })
  }
  const [result] = await pool.execute(
    `INSERT INTO posts (slug, user_id, title, author, avatar, topic, excerpt, content, media_url, media_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      user?.id || null,
      title,
      author,
      avatar,
      payload.topic || '生活分享',
      content.slice(0, 72),
      content,
      mediaUrl,
      mediaType,
      'pending',
    ],
  )
  await writeAudit(user?.id, 'post.create', 'community', { id: result.insertId, slug })
  return findPost(result.insertId, true)
}

export async function createComment(postId, payload, user) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const author = user?.username || 'Coffee Reader'
    const [result] = await connection.execute(
      `INSERT INTO comments (post_id, user_id, author, content, status, is_anonymous)
       VALUES (?, ?, ?, ?, 'published', ?)`,
      [postId, user?.id || null, author, String(payload.content || '').trim(), payload.isAnonymous || payload.is_anonymous ? 1 : 0],
    )
    await connection.execute(
      `UPDATE posts SET comments_count = (
        SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'published'
      ) WHERE id = ?`,
      [postId, postId],
    )
    await writeAudit(user?.id, 'comment.create', 'community', { postId, commentId: result.insertId }, connection)
    await connection.commit()
    return findPost(postId, true)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function deleteComment(postId, commentId, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute('DELETE FROM comments WHERE id = ? AND post_id = ? AND user_id = ?', [commentId, postId, userId])
    if (!result.affectedRows) {
      await connection.rollback()
      return false
    }
    await connection.execute(`UPDATE posts SET comments_count = (
      SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'published'
    ) WHERE id = ?`, [postId, postId])
    await writeAudit(userId, 'comment.delete', 'community', { postId, commentId }, connection)
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function togglePostLike(postId, userId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.execute(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, userId],
    )
    let liked = true
    if (existing.length) {
      liked = false
      await connection.execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId])
    } else {
      await connection.execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId])
    }
    await connection.execute(
      `UPDATE posts SET likes_count = (
        SELECT COUNT(*) FROM post_likes WHERE post_id = ?
      ) WHERE id = ?`,
      [postId, postId],
    )
    await writeAudit(userId, liked ? 'post.like' : 'post.unlike', 'community', { postId }, connection)
    await connection.commit()
    const post = await findPost(postId, true)
    return { liked, likes: post?.likes || 0, post }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function listPostLikes(postId) {
  const [rows] = await pool.execute(
    `SELECT pl.user_id AS userId, pl.created_at AS likedAt,
      u.nickname, u.username, u.avatar, u.phone, u.profile_public AS profilePublic
     FROM post_likes pl
     INNER JOIN users u ON u.id = pl.user_id
     WHERE pl.post_id = ?
     ORDER BY pl.created_at DESC, pl.id DESC`,
    [postId],
  )
  return rows.map((row) => ({
    userId: row.userId,
    nickname: row.nickname || row.username || `用户${String(row.userId).slice(-4)}`,
    avatar: row.avatar,
    phoneMasked: maskPhone(row.phone),
    profilePublic: Boolean(row.profilePublic),
    likedAt: row.likedAt,
  }))
}

export async function createContentReport(postId, payload, userId) {
  const commentId = payload.commentId ? Number(payload.commentId) : null
  const reason = String(payload.reason || '').trim()
  const description = String(payload.description || '').trim()
  if (!reason) throw Object.assign(new Error('请选择举报原因'), { statusCode: 400 })
  if (reason.length > 120 || description.length > 1000) {
    throw Object.assign(new Error('举报内容长度超出限制'), { statusCode: 400 })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[post]] = await connection.execute('SELECT id, status FROM posts WHERE id = ? LIMIT 1 FOR UPDATE', [postId])
    if (!post) throw Object.assign(new Error('帖子不存在'), { statusCode: 404 })
    let previousStatus = post.status
    if (commentId) {
      const [[comment]] = await connection.execute(
        'SELECT id, status FROM comments WHERE id = ? AND post_id = ? LIMIT 1 FOR UPDATE',
        [commentId, postId],
      )
      if (!comment) throw Object.assign(new Error('评论不存在'), { statusCode: 404 })
      previousStatus = comment.status
    }
    const [[duplicate]] = await connection.execute(
      `SELECT id FROM content_reports
       WHERE post_id = ? AND reporter_id = ? AND status = 'pending'
         AND ((comment_id IS NULL AND ? IS NULL) OR comment_id = ?) LIMIT 1`,
      [postId, userId, commentId, commentId],
    )
    if (duplicate) throw Object.assign(new Error('该内容已提交举报，请等待处理'), { statusCode: 409 })
    const [result] = await connection.execute(
      `INSERT INTO content_reports
       (post_id, comment_id, reporter_id, reason, description, status, target_previous_status)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [postId, commentId, userId, reason, description || null, previousStatus],
    )
    if (commentId) {
      await connection.execute("UPDATE comments SET status = 'pending' WHERE id = ?", [commentId])
    } else if (!['hidden', 'rejected'].includes(post.status)) {
      await connection.execute("UPDATE posts SET status = 'reported' WHERE id = ?", [postId])
    }
    await writeAudit(userId, 'content.report.create', 'community', { reportId: result.insertId, postId, commentId }, connection)
    await connection.commit()
    return { id: result.insertId, postId: Number(postId), commentId, status: 'pending' }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function updateCommentStatus(postId, commentId, status, operatorId, reason = '') {
  if (!['published', 'pending', 'hidden', 'deleted'].includes(status)) {
    throw Object.assign(new Error('评论状态无效'), { statusCode: 400 })
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      'UPDATE comments SET status = ? WHERE id = ? AND post_id = ?',
      [status, commentId, postId],
    )
    if (!result.affectedRows) throw Object.assign(new Error('评论不存在'), { statusCode: 404 })
    await connection.execute(`UPDATE posts SET comments_count = (
      SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'published'
    ) WHERE id = ?`, [postId, postId])
    await writeAudit(operatorId, 'comment.status.update', 'community', { postId, commentId, status, reason }, connection)
    await connection.commit()
    return findPost(postId, true)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function processContentReport(reportId, action, operatorId, note = '') {
  if (!['dismiss', 'hide', 'delete'].includes(action)) {
    throw Object.assign(new Error('举报处理动作无效'), { statusCode: 400 })
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [[report]] = await connection.execute(
      `SELECT id, post_id AS postId, comment_id AS commentId, status,
        target_previous_status AS previousStatus
       FROM content_reports WHERE id = ? LIMIT 1 FOR UPDATE`,
      [reportId],
    )
    if (!report) throw Object.assign(new Error('举报记录不存在'), { statusCode: 404 })
    if (report.status !== 'pending') throw Object.assign(new Error('举报记录已经处理'), { statusCode: 409 })

    const reportStatus = action === 'dismiss' ? 'dismissed' : 'resolved'
    await connection.execute(
      `UPDATE content_reports SET status = ?, resolution = ?, handled_by = ?, handled_at = NOW()
       WHERE id = ?`,
      [reportStatus, action, operatorId, reportId],
    )
    if (report.commentId) {
      const nextStatus = action === 'dismiss' ? (report.previousStatus || 'published') : action === 'delete' ? 'deleted' : 'hidden'
      await connection.execute('UPDATE comments SET status = ? WHERE id = ?', [nextStatus, report.commentId])
    } else {
      const nextStatus = action === 'dismiss' ? (report.previousStatus || 'published') : 'hidden'
      await connection.execute('UPDATE posts SET status = ? WHERE id = ?', [nextStatus, report.postId])
    }
    await connection.execute(`UPDATE posts SET comments_count = (
      SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'published'
    ) WHERE id = ?`, [report.postId, report.postId])
    await writeAudit(operatorId, 'content.report.process', 'community', { reportId, action, note }, connection)
    await connection.commit()
    return findPost(report.postId, true)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function updatePostStatus(id, status, operatorId, reason = '') {
  const normalizedStatus = status === 'approved' ? 'published' : status === 'review' ? 'reported' : status
  if (!['pending', 'published', 'rejected', 'reported', 'hidden'].includes(normalizedStatus)) {
    throw Object.assign(new Error('社区内容状态无效'), { statusCode: 400 })
  }
  const [[post]] = await pool.execute('SELECT user_id AS userId, title FROM posts WHERE id = ? LIMIT 1', [id])
  await pool.execute('UPDATE posts SET status = ? WHERE id = ?', [normalizedStatus, id])
  if (['published', 'rejected', 'hidden'].includes(normalizedStatus)) {
    await pool.execute(
      `UPDATE content_reports SET status = 'resolved', resolution = ?, handled_by = ?, handled_at = NOW()
       WHERE post_id = ? AND comment_id IS NULL AND status = 'pending'`,
      [normalizedStatus === 'published' ? 'dismiss' : 'hide', operatorId, id],
    )
  }
  await writeAudit(operatorId, 'post.status.update', 'community', { id, status: normalizedStatus, reason })
  if (post?.userId) {
    await createNotification({
      userId: post.userId,
      title: normalizedStatus === 'published' ? '帖子审核通过' : '帖子状态已更新',
      content: normalizedStatus === 'published'
        ? `你的帖子《${post.title}》已审核通过并发布。`
        : `你的帖子《${post.title}》未通过审核，请调整内容后再试。`,
      type: 'audit',
      relatedId: id,
      relatedType: 'post',
    })
  }
  return findPost(id, true)
}
