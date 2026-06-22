<script setup>
import AppFooter from '@/components/common/AppFooter.vue'
import AppHeader from '@/components/common/AppHeader.vue'
</script>

<template>
  <div class="public-layout cb-page">
    <AppHeader />
    <main class="public-layout__main cb-main">
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
