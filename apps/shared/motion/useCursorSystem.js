import { onBeforeUnmount, onMounted } from 'vue'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

const DESKTOP_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 64rem)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const INTERACTIVE_SELECTOR = '[data-cursor], .map-seat, .post-card--clickable'
const NATIVE_CURSOR_SELECTOR = 'input, textarea, select, option, [contenteditable="true"]'

export function useCursorSystem({ root, dot, ring, label }) {
  let enabled = false
  let activeTarget = null
  let moveDotX
  let moveDotY
  let moveRingX
  let moveRingY
  const media = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY) : null
  const reduced = typeof window !== 'undefined' ? window.matchMedia(REDUCED_QUERY) : null

  const valueOf = (source) => source?.value || source

  function setState(target) {
    const ringElement = valueOf(ring)
    const labelElement = valueOf(label)
    if (!ringElement || !labelElement) return
    const unavailable = target?.matches?.(':disabled, [aria-disabled="true"], [aria-busy="true"]')
    const fallback = target?.matches?.('.map-seat') ? 'BOOK' : target?.matches?.('.post-card--clickable') ? 'VIEW' : ''
    const text = unavailable ? '' : target?.dataset?.cursor || fallback
    labelElement.textContent = text
    ringElement.classList.toggle('is-labelled', Boolean(text))
    ringElement.classList.toggle('is-warning', text === 'WARN')
  }

  function onPointerMove(event) {
    valueOf(root)?.classList.add('is-visible')
    moveDotX?.(event.clientX)
    moveDotY?.(event.clientY)
    moveRingX?.(event.clientX)
    moveRingY?.(event.clientY)
    const nextTarget = event.target.closest?.(INTERACTIVE_SELECTOR)
    if (nextTarget !== activeTarget) {
      activeTarget = nextTarget
      setState(activeTarget)
    }
    valueOf(root)?.classList.toggle('is-native-area', Boolean(event.target.closest?.(NATIVE_CURSOR_SELECTOR)))
  }

  function onPointerLeave() {
    valueOf(root)?.classList.remove('is-visible')
  }

  function onPointerEnter() {
    valueOf(root)?.classList.add('is-visible')
  }

  function enable() {
    if (enabled || !isMotionEnabled() || !media?.matches || reduced?.matches) return
    const dotElement = valueOf(dot)
    const ringElement = valueOf(ring)
    if (!dotElement || !ringElement) return
    enabled = true
    document.documentElement.classList.add('has-app-cursor')
    moveDotX = gsap.quickTo(dotElement, 'x', { duration: 0.08, ease: 'none' })
    moveDotY = gsap.quickTo(dotElement, 'y', { duration: 0.08, ease: 'none' })
    moveRingX = gsap.quickTo(ringElement, 'x', { duration: 0.28, ease: 'power3.out' })
    moveRingY = gsap.quickTo(ringElement, 'y', { duration: 0.28, ease: 'power3.out' })
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('pointerenter', onPointerEnter)
  }

  function disable() {
    if (!enabled) return
    enabled = false
    document.documentElement.classList.remove('has-app-cursor')
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerleave', onPointerLeave)
    document.removeEventListener('pointerenter', onPointerEnter)
    gsap.killTweensOf([valueOf(dot), valueOf(ring)].filter(Boolean))
    valueOf(root)?.classList.remove('is-visible', 'is-native-area')
    activeTarget = null
    setState(null)
  }

  function sync() {
    if (isMotionEnabled() && media?.matches && !reduced?.matches) enable()
    else disable()
  }

  function reset() {
    activeTarget = null
    setState(null)
  }

  const unregister = registerMotionController({ disable, enable: sync })
  onMounted(() => {
    media?.addEventListener('change', sync)
    reduced?.addEventListener('change', sync)
    sync()
  })
  onBeforeUnmount(() => {
    media?.removeEventListener('change', sync)
    reduced?.removeEventListener('change', sync)
    disable()
    unregister()
  })

  return { reset, sync }
}
