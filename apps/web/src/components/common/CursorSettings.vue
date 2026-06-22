<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CURSOR_EVENT, CURSOR_THEMES, readCursorPreferences, saveCursorPreferences } from '../../../../shared/motion/useCursorMotion.js'

const open = ref(false)
const enabled = ref(false)
const theme = ref('system')

function load() { ({ enabled: enabled.value, theme: theme.value } = readCursorPreferences()) }
function save() {
  if (theme.value === 'system') enabled.value = false
  saveCursorPreferences(theme.value, enabled.value)
}
function choose(value) { theme.value = value; enabled.value = value !== 'system'; save() }
onMounted(() => { load(); window.addEventListener(CURSOR_EVENT, load) })
onBeforeUnmount(() => window.removeEventListener(CURSOR_EVENT, load))
</script>

<template>
  <div class="cursor-settings">
    <button class="cursor-settings__trigger" type="button" aria-label="鼠标样式设置" :aria-expanded="open" @click="open = !open">◎</button>
    <section v-if="open" class="cursor-settings__panel" aria-label="鼠标样式">
      <header><strong>鼠标样式</strong><button type="button" data-cursor="close" aria-label="关闭鼠标设置" @click="open = false">×</button></header>
      <label class="cursor-settings__toggle"><input v-model="enabled" type="checkbox" :disabled="theme === 'system'" @change="save" /><span>启用自定义鼠标效果</span></label>
      <div class="cursor-settings__options">
        <button v-for="item in CURSOR_THEMES" :key="item.value" type="button" :class="{ 'is-active': theme === item.value }" @click="choose(item.value)"><i :data-preview="item.value" />{{ item.label }}</button>
      </div>
      <small>仅支持鼠标的桌面设备显示；触屏或减少动态效果时自动使用系统鼠标。</small>
    </section>
  </div>
</template>

<style scoped>
.cursor-settings{position:relative}.cursor-settings__trigger{display:grid;width:2.75rem;height:2.75rem;padding:0;place-items:center;color:var(--cb-text-secondary);font-size:1.35rem;background:transparent;border:0;border-radius:var(--cb-radius-pill)}.cursor-settings__trigger:hover{color:var(--cb-color-coffee);background:var(--cb-bg-soft)}
.cursor-settings__panel{position:absolute;z-index:var(--cb-z-dropdown);top:calc(100% + .65rem);right:0;display:grid;width:min(22rem,calc(100vw - 2rem));padding:var(--cb-space-4);gap:var(--cb-space-3);color:var(--cb-text-primary);background:color-mix(in srgb,var(--cb-bg-elevated) 92%,transparent);border:1px solid var(--cb-border-soft);border-radius:var(--cb-radius-xl);box-shadow:var(--cb-shadow-lg);backdrop-filter:blur(.8rem)}
.cursor-settings__panel header,.cursor-settings__toggle{display:flex;align-items:center;justify-content:space-between;gap:var(--cb-space-3)}.cursor-settings__panel header button{padding:.25rem .5rem;color:inherit;font-size:1.25rem;background:transparent;border:0;border-radius:50%}.cursor-settings__toggle{justify-content:flex-start;font-size:var(--cb-font-size-sm)}.cursor-settings__toggle input{accent-color:var(--cb-color-coffee)}
.cursor-settings__options{display:grid;gap:var(--cb-space-1)}.cursor-settings__options button{display:flex;padding:.6rem .7rem;align-items:center;gap:.65rem;color:var(--cb-text-secondary);text-align:left;background:transparent;border:1px solid transparent;border-radius:var(--cb-radius-md)}.cursor-settings__options button:hover,.cursor-settings__options button.is-active{color:var(--cb-color-coffee);background:var(--cb-bg-soft);border-color:var(--cb-border-soft)}.cursor-settings__options i{width:.72rem;height:.72rem;background:var(--cb-color-coffee);border:2px solid var(--cb-color-gold);border-radius:50%}.cursor-settings__panel small{color:var(--cb-text-muted);line-height:1.5}
@media (hover:none),(pointer:coarse){.cursor-settings{display:none}}
</style>
