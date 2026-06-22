import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export function useGsapNumber() {
  const tweens = new Map()

  function animateCount(element, endValue, options = {}) {
    if (!element) return null
    const numeric = Number(String(endValue ?? 0).replace(/[^\d.-]/g, '')) || 0
    const prefix = options.prefix ?? (String(endValue).trim().startsWith('¥') ? '¥' : '')
    const suffix = options.suffix ?? ''
    const format = options.format || ((value) => Math.round(value).toLocaleString('zh-CN'))
    tweens.get(element)?.kill()
    if (reduced()) {
      element.textContent = `${prefix}${format(numeric)}${suffix}`
      return null
    }
    const state = { value: options.from ?? 0 }
    const tween = gsap.to(state, {
      value: numeric,
      duration: Math.min(options.duration ?? 0.6, 0.6),
      ease: 'power2.out',
      onUpdate: () => { element.textContent = `${prefix}${format(state.value)}${suffix}` },
      onComplete: () => tweens.delete(element),
    })
    tweens.set(element, tween)
    return tween
  }

  function animateCounts(elements, values, options = {}) {
    return [...elements].slice(0, 20).map((element, index) => animateCount(element, values[index], options))
  }

  function cleanup() {
    tweens.forEach((tween) => tween.kill())
    tweens.clear()
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { animateCount, animateCounts, cleanup }
}
