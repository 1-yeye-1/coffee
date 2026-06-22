import { onBeforeUnmount, onMounted } from 'vue'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

const SELECTOR = '[data-motion="magnetic"], [data-magnetic-group] > .base-button, .admin-quick-action'
const ENABLE_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 64rem)'

export function useMagnetic(root = null, options = {}) {
  const maximum = Math.min(Math.max(options.maximum || 8, 1), 8)
  let host = null
  let active = null
  let enabled = false
  let frame = 0
  let pendingEvent = null
  const desktopMedia = typeof window !== 'undefined' ? window.matchMedia(ENABLE_QUERY) : null
  const reducedMedia = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

  const reduced = () => reducedMedia?.matches
  const desktop = () => desktopMedia?.matches
  const scope = () => root?.value || root || document

  function reset(element = active) {
    if (!element) return
    gsap.to(element, { x: 0, y: 0, duration: 0.42, ease: 'elastic.out(1, 0.55)', overwrite: true, clearProps: 'transform' })
    if (element === active) active = null
  }

  function updatePosition() {
    frame = 0
    const event = pendingEvent
    const target = event.target.closest?.(SELECTOR)
    if (!target || target.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]')) {
      if (active && !active.contains(event.target)) reset()
      return
    }
    if (active && active !== target) reset(active)
    active = target
    const bounds = target.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * maximum * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * maximum * 2
    gsap.to(target, { x, y, duration: 0.24, ease: 'power2.out', overwrite: true })
  }

  function onMove(event) {
    pendingEvent = event
    if (!frame) frame = requestAnimationFrame(updatePosition)
  }

  function onOut(event) {
    if (active && !active.contains(event.relatedTarget)) reset()
  }

  function enable() {
    if (enabled || !isMotionEnabled() || reduced() || !desktop()) return
    host = scope()
    if (!host) return
    enabled = true
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerout', onOut, { passive: true })
  }

  function disable() {
    if (!enabled) return
    enabled = false
    host?.removeEventListener('pointermove', onMove)
    host?.removeEventListener('pointerout', onOut)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    reset()
    host = null
  }

  function sync() {
    disable()
    enable()
  }

  const unregister = registerMotionController({ disable, enable })
  onMounted(() => {
    enable()
    desktopMedia?.addEventListener('change', sync)
    reducedMedia?.addEventListener('change', sync)
  })
  onBeforeUnmount(() => {
    desktopMedia?.removeEventListener('change', sync)
    reducedMedia?.removeEventListener('change', sync)
    disable()
    unregister()
  })

  return { reset, sync, cleanup: disable }
}
