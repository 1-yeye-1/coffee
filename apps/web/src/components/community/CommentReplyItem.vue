<script setup>
import { BaseButton, BaseTextarea } from '@/components/base'
import { resolveUploadUrl } from '@/api/upload'

const props = defineProps({
  reply: { type: Object, required: true },
  activeReplyId: { type: [Number, String], default: null },
  replyContent: { type: String, default: '' },
  authUserId: { type: [Number, String], default: null },
  formatDate: { type: Function, default: (v) => v },
})

const emit = defineEmits([
  'update:replyContent',
  'toggle-like',
  'set-reply',
  'delete',
  'submit-reply',
  'visit-user',
])

function onInput(e) {
  const value = typeof e === 'string' ? e : (e?.target?.value ?? '')
  emit('update:replyContent', value)
}
</script>

<template>
  <article class="comment-reply">
    <img
      v-if="reply.user?.avatar"
      class="comment-reply__avatar"
      :src="resolveUploadUrl(reply.user.avatar)"
      alt=""
      loading="lazy"
      decoding="async"
    />
    <span v-else class="avatar comment-reply__avatar">{{ (reply.user?.nickname || reply.author || '用').slice(0, 1) }}</span>
    <div>
      <div class="comment-reply__meta">
        <button class="comment__name" type="button" @click="emit('visit-user', reply.user?.id)">{{ reply.user?.nickname || reply.author }}</button>
        <small>{{ formatDate(reply.createdAt) }}</small>
      </div>
      <p>{{ reply.content }}</p>
      <div class="comment-reply__actions">
        <button type="button" @click="emit('toggle-like', reply)">{{ reply.liked ? '取消点赞' : '点赞' }} {{ reply.likeCount || 0 }}</button>
        <button type="button" @click="emit('set-reply', reply.id)">回复</button>
        <button v-if="props.authUserId === reply.user?.id" type="button" class="comment-action--danger" @click="emit('delete', reply)">删除</button>
      </div>
      <div v-if="activeReplyId === reply.id" class="comment-reply-form" style="margin-top:var(--cb-space-2)">
        <BaseTextarea :model-value="replyContent" label="回复内容" placeholder="写下你的回复..." :maxlength="300" show-count @update:model-value="onInput" />
        <BaseButton size="sm" :disabled="!replyContent.trim()" @click="emit('submit-reply', reply)">发布回复</BaseButton>
      </div>
    </div>
    <!-- Recursively render deeper replies -->
    <template v-if="reply.children?.length">
      <CommentReplyItem
        v-for="child in reply.children"
        :key="child.id"
        :reply="child"
        :active-reply-id="activeReplyId"
        :reply-content="replyContent"
        :auth-user-id="authUserId"
        :format-date="formatDate"
        @update:reply-content="onInput"
        @toggle-like="emit('toggle-like', $event)"
        @set-reply="emit('set-reply', $event)"
        @delete="emit('delete', $event)"
        @submit-reply="emit('submit-reply', $event)"
        @visit-user="emit('visit-user', $event)"
      />
    </template>
  </article>
</template>

<style scoped>
.comment-reply {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--cb-space-2);
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-sm);
  padding-top: var(--cb-space-2);
}
.comment-reply__avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--cb-radius-pill);
  object-fit: cover;
  align-self: flex-start;
}
.comment-reply__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  align-items: baseline;
}
.comment-reply__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cb-space-2);
  margin-top: var(--cb-space-1);
}
.comment-reply__actions button,
.comment-reply__actions .comment-action--danger {
  padding: 0;
  color: var(--cb-color-coffee);
  font-size: var(--cb-font-size-xs);
  background: none;
  border: 0;
}
.comment-reply__actions .comment-action--danger {
  color: var(--cb-danger);
}
.comment-reply-form {
  display: grid;
  gap: var(--cb-space-2);
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
</style>
