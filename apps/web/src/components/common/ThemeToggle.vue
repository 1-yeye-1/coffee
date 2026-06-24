<script setup>
import { onMounted, ref } from 'vue'

const STORAGE_KEY = 'coffee-book-theme'
const themes = ['light', 'dark']
const labels = {
  light: '浅色模式',
  dark: '深色模式',
}

const theme = ref('light')

function applyTheme(value) {
  document.documentElement.dataset.theme = value
  document.documentElement.dataset.themePreference = value
}

function setTheme(value) {
  theme.value = themes.includes(value) ? value : 'light'
  localStorage.setItem(STORAGE_KEY, theme.value)
  applyTheme(theme.value)
}

function cycleTheme() {
  setTheme(theme.value === 'light' ? 'dark' : 'light')
}

onMounted(() => {
  const savedTheme = localStorage.getItem(STORAGE_KEY)
  setTheme(themes.includes(savedTheme) ? savedTheme : 'light')
})
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="`${labels[theme]}，点击切换`"
    :title="labels[theme]"
    @click="cycleTheme"
  >
    <svg v-if="theme === 'light'" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
    </svg>
    <span class="theme-toggle__label">{{ labels[theme] }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  color: var(--cb-text-secondary);
  background: transparent;
  border: 0.0625rem solid transparent;
  border-radius: var(--cb-radius-pill);
  transition:
    color var(--cb-duration-fast) var(--cb-ease-standard),
    background-color var(--cb-duration-fast) var(--cb-ease-standard);
}

.theme-toggle:hover {
  color: var(--cb-text-primary);
  background: var(--cb-bg-soft);
}

.theme-toggle svg {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.theme-toggle__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
