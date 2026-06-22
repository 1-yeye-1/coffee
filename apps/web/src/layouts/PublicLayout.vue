<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppFooter from '@/components/common/AppFooter.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useGsapReveal } from '@/composables/useGsapReveal'

const route = useRoute()
const mainRef = ref(null)
const { revealPage } = useGsapReveal(mainRef)
watch(() => route.fullPath, async () => {
  await nextTick()
  revealPage(':scope > *')
}, { flush: 'post', immediate: true })
</script>

<template>
  <div class="public-layout cb-page">
    <AppHeader />
    <main ref="mainRef" class="public-layout__main cb-main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="route-page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.public-layout {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.public-layout__main {
  display: flex;
  flex: 1;
  flex-direction: column;
}
</style>
