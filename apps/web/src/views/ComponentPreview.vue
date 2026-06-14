<script setup>
import { onMounted, ref } from 'vue'

import {
  BaseBadge,
  BaseButton,
  BaseCard,
  BaseDrawer,
  BaseInput,
  BaseModal,
  BasePagination,
  BaseSelect,
  BaseSkeleton,
  BaseTable,
  BaseTabs,
  BaseTextarea,
  BaseToast,
  EmptyState,
} from '@/components/base'

const inputValue = ref('')
const passwordValue = ref('')
const searchValue = ref('')
const textareaValue = ref('Coffee Book component library')
const selectValue = ref('')
const currentPage = ref(3)
const activeTab = ref('overview')
const modalOpen = ref(false)
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)
const theme = ref('light')

const selectOptions = [
  { label: 'Default option', value: 'default' },
  { label: 'Premium option', value: 'premium' },
  { label: 'Disabled option', value: 'disabled', disabled: true },
]

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Details', value: 'details' },
  { label: 'Disabled', value: 'disabled', disabled: true },
]

const tableColumns = [
  { key: 'component', label: 'Component' },
  { key: 'state', label: 'State' },
  { key: 'status', label: 'Status' },
]

const tableItems = [
  { id: 1, component: 'BaseButton', state: 'Interactive', status: 'Ready' },
  { id: 2, component: 'BaseInput', state: 'Validated', status: 'Ready' },
  { id: 3, component: 'BaseModal', state: 'Accessible', status: 'Ready' },
]

function setTheme(value) {
  theme.value = value
  document.documentElement.dataset.theme = value
}

onMounted(() => {
  setTheme(document.documentElement.dataset.theme || 'light')
})
</script>

<template>
  <div class="component-preview cb-page">
    <header class="component-preview__hero cb-container cb-stack">
      <span class="section-eyebrow">Phase 3</span>
      <h1 class="page-title">Component Library</h1>
      <p class="page-subtitle">
        Coffee Book 基础组件的状态、响应式、键盘访问与主题适配验收页。
      </p>
      <div class="cb-cluster" aria-label="主题切换">
        <BaseButton
          size="sm"
          :variant="theme === 'light' ? 'primary' : 'outline'"
          @click="setTheme('light')"
        >
          Light
        </BaseButton>
        <BaseButton
          size="sm"
          :variant="theme === 'dark' ? 'primary' : 'outline'"
          @click="setTheme('dark')"
        >
          Dark
        </BaseButton>
      </div>
    </header>

    <div class="cb-container cb-stack component-preview__main">
      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Actions</span>
          <h2 class="section-title">Buttons</h2>
        </div>
        <BaseCard>
          <div class="cb-stack">
            <div class="cb-cluster">
              <BaseButton variant="primary">Primary</BaseButton>
              <BaseButton variant="secondary">Secondary</BaseButton>
              <BaseButton variant="outline">Outline</BaseButton>
              <BaseButton variant="ghost">Ghost</BaseButton>
              <BaseButton variant="danger">Danger</BaseButton>
            </div>
            <div class="cb-cluster">
              <BaseButton size="sm">Small</BaseButton>
              <BaseButton size="md">
                <template #icon-left>←</template>
                Icon Left
              </BaseButton>
              <BaseButton size="lg">
                Icon Right
                <template #icon-right>→</template>
              </BaseButton>
              <BaseButton disabled>Disabled</BaseButton>
              <BaseButton loading>Loading</BaseButton>
            </div>
          </div>
        </BaseCard>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Form controls</span>
          <h2 class="section-title">Inputs</h2>
        </div>
        <BaseCard>
          <div class="cb-grid-2">
            <BaseInput
              v-model="inputValue"
              label="Standard input"
              placeholder="Enter text"
              hint="Helpful supporting text"
            />
            <BaseInput
              v-model="passwordValue"
              label="Password"
              placeholder="Password"
              password
              success="Password format is valid"
            >
              <template #prefix>●</template>
            </BaseInput>
            <BaseInput
              v-model="searchValue"
              label="Search"
              placeholder="Search components"
              search
            >
              <template #prefix>⌕</template>
              <template #suffix>⌘K</template>
            </BaseInput>
            <BaseInput label="Error state" error="Please provide a valid value" />
            <BaseInput label="Disabled input" disabled placeholder="Unavailable" />
            <BaseSelect
              v-model="selectValue"
              label="Select"
              placeholder="Choose an option"
              :options="selectOptions"
              success="Selection is available"
            />
            <BaseSelect
              label="Select error"
              placeholder="Required option"
              :options="selectOptions"
              error="Please select an option"
            />
            <BaseTextarea
              v-model="textareaValue"
              label="Textarea"
              hint="A restrained multiline field"
              :maxlength="120"
              show-count
            />
          </div>
        </BaseCard>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Surfaces</span>
          <h2 class="section-title">Cards and Badges</h2>
        </div>
        <div class="cb-grid-4">
          <BaseCard><h3>Default</h3><p>Standard content surface.</p></BaseCard>
          <BaseCard variant="hover"><h3>Hover</h3><p>Elevates on pointer hover.</p></BaseCard>
          <BaseCard variant="interactive"><h3>Interactive</h3><p>Keyboard focusable card.</p></BaseCard>
          <BaseCard variant="elevated"><h3>Elevated</h3><p>Higher visual hierarchy.</p></BaseCard>
        </div>
        <div class="cb-cluster">
          <BaseBadge variant="success">Success</BaseBadge>
          <BaseBadge variant="warning">Warning</BaseBadge>
          <BaseBadge variant="danger">Danger</BaseBadge>
          <BaseBadge variant="info">Info</BaseBadge>
          <BaseBadge variant="neutral">Neutral</BaseBadge>
          <BaseBadge variant="premium">Premium</BaseBadge>
        </div>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Navigation</span>
          <h2 class="section-title">Tabs and Pagination</h2>
        </div>
        <BaseCard>
          <BaseTabs v-model="activeTab" :tabs="tabs">
            <template #overview><p>Overview panel with animated switching.</p></template>
            <template #details><p>Details panel supports keyboard navigation.</p></template>
          </BaseTabs>
          <BasePagination v-model="currentPage" :total-pages="9" />
        </BaseCard>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Data</span>
          <h2 class="section-title">Tables</h2>
        </div>
        <BaseTable
          caption="Component readiness"
          :columns="tableColumns"
          :items="tableItems"
        >
          <template #cell-status="{ value }">
            <BaseBadge variant="success">{{ value }}</BaseBadge>
          </template>
        </BaseTable>
        <div class="cb-grid-2">
          <BaseTable :columns="tableColumns" :items="[]" empty-text="No component records" />
          <BaseTable :columns="tableColumns" :items="[]" loading />
        </div>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Feedback</span>
          <h2 class="section-title">Toast, Skeleton and Empty State</h2>
        </div>
        <div class="cb-grid-2">
          <div class="cb-stack">
            <BaseToast variant="success" title="Success" :duration="0">
              The operation completed successfully.
            </BaseToast>
            <BaseToast variant="error" title="Error" :duration="0">
              Something needs your attention.
            </BaseToast>
            <BaseToast variant="warning" title="Warning" :duration="0">
              Review this information before continuing.
            </BaseToast>
            <BaseToast variant="info" title="Information" :duration="0">
              A concise informational message.
            </BaseToast>
          </div>
          <div class="cb-stack">
            <BaseSkeleton variant="text" />
            <BaseSkeleton variant="avatar" />
            <BaseSkeleton variant="card" />
            <BaseSkeleton variant="table" :lines="2" />
          </div>
        </div>
        <EmptyState
          title="No items yet"
          description="This reusable state can represent books, orders, events, or bookings."
          action-label="Primary Action"
        >
          <template #icon>◇</template>
        </EmptyState>
      </section>

      <section class="preview-section cb-stack">
        <div>
          <span class="section-eyebrow">Overlays</span>
          <h2 class="section-title">Modal and Drawer</h2>
        </div>
        <BaseCard>
          <div class="cb-cluster">
            <BaseButton @click="modalOpen = true">Open Modal</BaseButton>
            <BaseButton variant="outline" @click="leftDrawerOpen = true">
              Left Drawer
            </BaseButton>
            <BaseButton variant="outline" @click="rightDrawerOpen = true">
              Right Drawer
            </BaseButton>
          </div>
        </BaseCard>
      </section>
    </div>

    <BaseModal v-model="modalOpen" title="Accessible Modal">
      <p>Supports Escape, overlay close, focus restoration and responsive sizing.</p>
      <template #footer>
        <BaseButton variant="ghost" @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton @click="modalOpen = false">Confirm</BaseButton>
      </template>
    </BaseModal>

    <BaseDrawer v-model="leftDrawerOpen" title="Left Drawer" side="left">
      <p>A reusable left-side overlay surface.</p>
    </BaseDrawer>

    <BaseDrawer v-model="rightDrawerOpen" title="Right Drawer" side="right">
      <p>A reusable right-side overlay surface.</p>
    </BaseDrawer>
  </div>
</template>

<style scoped>
.component-preview {
  padding-bottom: var(--cb-space-24);
}

.component-preview__hero {
  padding-block: var(--cb-space-16) var(--cb-space-10);
}

.component-preview__main {
  gap: var(--cb-space-20);
}

.preview-section {
  gap: var(--cb-space-6);
}

.preview-section :deep(.base-card) {
  display: grid;
  gap: var(--cb-space-3);
}
</style>
