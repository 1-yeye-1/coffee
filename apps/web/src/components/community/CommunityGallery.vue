<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { resolveUploadUrl } from '@/api/upload'
import { BaseModal } from '@/components/base'
import { useCommunityMotion } from '@/composables/useCommunityMotion'

const props = defineProps({ modelValue: Boolean, images: { type: Array, default: () => [] }, startIndex: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const index = ref(props.startIndex)
const imageRef = ref(null)
const current = computed(() => props.images[index.value])
const { switchGallery } = useCommunityMotion()

watch(() => props.startIndex, (value) => { index.value = value })
watch(index, async () => { await nextTick(); switchGallery(imageRef.value) })
const move = (direction) => { if (props.images.length) index.value = (index.value + direction + props.images.length) % props.images.length }
</script>

<template>
  <BaseModal :model-value="modelValue" title="社区图片" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="current" class="community-gallery">
      <button type="button" aria-label="上一张" :disabled="images.length < 2" @click="move(-1)">←</button>
      <figure><img ref="imageRef" :src="resolveUploadUrl(current.mediaUrl)" :alt="current.title || '社区图片'" /><figcaption>{{ index + 1 }} / {{ images.length }} · {{ current.title }}</figcaption></figure>
      <button type="button" aria-label="下一张" :disabled="images.length < 2" @click="move(1)">→</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.community-gallery{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:var(--cb-space-3);align-items:center}.community-gallery figure{display:grid;margin:0;gap:var(--cb-space-2)}.community-gallery img{display:block;width:100%;max-height:70vh;object-fit:contain;border-radius:var(--cb-radius-lg)}.community-gallery figcaption{text-align:center;color:var(--cb-text-muted);font-size:var(--cb-font-size-sm)}.community-gallery button{display:grid;width:2.75rem;height:2.75rem;place-items:center;color:var(--cb-text-primary);background:var(--cb-bg-soft);border:.0625rem solid var(--cb-border-soft);border-radius:var(--cb-radius-pill)}.community-gallery button:disabled{opacity:.35}
</style>
