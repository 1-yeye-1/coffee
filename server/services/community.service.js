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
  id, post_id AS postId, user_id AS userId, author, content, status,
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
    author: row.author,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.userId ? {
      id: row.userId,
      nickname: row.nickname || row.username || row.author,
      avatar: row.userAvatar,
      phoneMasked: maskPhone(row.phone),
      profilePublic: row.profilePublic === undefined ? true : Boolean(row.profilePublic),
    } : null,
  }))
}

async function attachComments(posts, publishedOnly = true) {
  return Promise.all(posts.map(async (post) => ({
    ...post,
    status: post.reviewStatus,
    featured: Boolean(post.featured),
    comments: await getComments(post.id, publishedOnly),
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
      `INSERT INTO comments (post_id, user_id, author, content, status)
       VALUES (?, ?, ?, ?, 'published')`,
      [postId, user?.id || null, author, String(payload.content || '').trim()],
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

export async function updatePostStatus(id, status, operatorId) {
  if (!['pending', 'published', 'rejected', 'hidden'].includes(status)) {
    throw Object.assign(new Error('社区内容状态无效'), { statusCode: 400 })
  }
  const [[post]] = await pool.execute('SELECT user_id AS userId, title FROM posts WHERE id = ? LIMIT 1', [id])
  await pool.execute('UPDATE posts SET status = ? WHERE id = ?', [status, id])
  await writeAudit(operatorId, 'post.status.update', 'community', { id, status })
  if (post?.userId) {
    await createNotification({
      userId: post.userId,
      title: status === 'published' ? '帖子审核通过' : '帖子审核未通过',
      content: status === 'published'
        ? `你的帖子《${post.title}》已审核通过并发布。`
        : `你的帖子《${post.title}》未通过审核，请调整内容后再试。`,
      type: 'audit',
      relatedId: id,
      relatedType: 'post',
    })
  }
  return findPost(id, true)
}
