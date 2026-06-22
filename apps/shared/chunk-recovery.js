const chunkErrorPattern = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module/i

export function installChunkRecovery(router, storageKey) {
  const retryKey = `coffee-book:chunk-retry:${storageKey}`
  const preloadRetryKey = `${retryKey}:preload`

  router.onError((error, to) => {
    if (!chunkErrorPattern.test(String(error?.message || error))) return
    const target = to?.fullPath || window.location.pathname
    if (sessionStorage.getItem(retryKey) === target) {
      sessionStorage.removeItem(retryKey)
      return
    }
    sessionStorage.setItem(retryKey, target)
    window.location.assign(target)
  })

  router.afterEach(() => {
    sessionStorage.removeItem(retryKey)
    sessionStorage.removeItem(preloadRetryKey)
  })
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    if (sessionStorage.getItem(preloadRetryKey)) return
    sessionStorage.setItem(preloadRetryKey, '1')
    window.location.reload()
  })
}
