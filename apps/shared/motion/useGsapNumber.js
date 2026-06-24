import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function allowsRichMotion() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/' || Boolean(document.querySelector('.hero'))
}

function isWritableElement(value) {
  return value instanceof HTMLElement || value?.nodeType === 1
}

function targetsOf(target, limit = 20) {
  if (!target || typeof document === 'undefined') return []
  if (typeof target === 'string') return [...document.querySelectorAll(target)].slice(0, limit)
  if (isWritableElement(target)) return [target]
  if (typeof target[Symbol.iterator] !== 'function') return []
  return [...target].filter(isWritableElement).slice(0, limit)
}

export function useGsapNumber() {
  const tweens = new Map()

  function animateCount(element, endValue, options = {}) {
    if (!isWritableElement(element)) return null
    const numeric = Number(String(endValue ?? 0).replace(/[^\d.-]/g, '')) || 0
    const prefix = options.prefix ?? (String(endValue).trim().startsWith('¥') ? '¥' : '')
    const suffix = options.suffix ?? ''
    const format = options.format || ((value) => Math.round(value).toLocaleString('zh-CN'))
    tweens.get(element)?.kill()
    if (reduced() || !allowsRichMotion()) {
      element.textContent = `${prefix}${format(numeric)}${suffix}`
      return null
    }
    const state = { value: options.from ?? 0 }
    const tween = gsap.to(state, {
      value: numeric,
      duration: Math.min(options.duration ?? 0.26, 0.3),
      ease: 'power2.out',
      onUpdate: () => { element.textContent = `${prefix}${format(state.value)}${suffix}` },
      onComplete: () => tweens.delete(element),
    })
    tweens.set(element, tween)
    return tween
  }

  function animateCounts(elements, values, options = {}) {
    return targetsOf(elements).map((element, index) => animateCount(element, values[index], options))
  }

  function cleanup() {
    tweens.forEach((tween) => tween.kill())
    tweens.clear()
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { animateCount, animateCounts, cleanup }
}
