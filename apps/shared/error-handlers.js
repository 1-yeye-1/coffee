const DEFAULT_MESSAGE = '页面遇到异常，已进入安全模式。请刷新或返回上一页后重试。'

function messageOf(error) {
  if (!error) return DEFAULT_MESSAGE
  if (typeof error === 'string') return error
  return error.message || error.reason?.message || DEFAULT_MESSAGE
}

function notifyGlobalError(source, error) {
  if (typeof window === 'undefined') return
  if (error?.name === 'ApiError' || error?.status || error?.code) return
  window.dispatchEvent(new CustomEvent('coffee-book:global-error', {
    detail: { source, message: messageOf(error), error },
  }))
}

export function installGlobalErrorHandlers(app, router, appName = 'app') {
  app.config.errorHandler = (error, instance, info) => {
    console.error(`[${appName}] Vue runtime error`, info, error)
    notifyGlobalError('vue', error)
  }

  router?.onError?.((error) => {
    console.error(`[${appName}] Router navigation error`, error)
    notifyGlobalError('router', error)
  })

  window.addEventListener('error', (event) => {
    console.error(`[${appName}] Window error`, event.error || event.message)
    notifyGlobalError('window', event.error || event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error(`[${appName}] Unhandled promise rejection`, event.reason)
    notifyGlobalError('promise', event.reason)
  })
}
