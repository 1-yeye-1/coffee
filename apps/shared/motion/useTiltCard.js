import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

const MAX_CARDS = 20
const DESKTOP_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 64rem)'
const LAYER_SELECTOR = '[data-tilt-layer]'

function resolveScope(root) {
  return root?.value || root || (typeof document !== 'undefined' ? document : null)
}

function resolveCards(root, target) {
  const scope = resolveScope(root)
  if (!scope || !target) return []
  if (typeof target === 'string') return [...scope.querySelectorAll(target)].slice(0, MAX_CARDS)
  if (target instanceof Element) return [target]
  return [...target].filter(Boolean).slice(0, MAX_CARDS)
}

export function useTiltCard(root = null, options = {}) {
  const bindings = new Map()
  const desktopMedia = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY) : null
  const reducedMedia = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const maximum = Math.min(Math.max(Number(options.maximum) || 4, 3), 5)
  let lastTarget = '[data-tilt-card]'

  function canAnimate() {
    if (!isMotionEnabled() || !desktopMedia?.matches || reducedMedia?.matches) return false
    const cores = Number(navigator.hardwareConcurrency || 4)
    const memory = Number(navigator.deviceMemory || 4)
    return cores > 2 && memory > 2
  }

  function resetCard(card, immediate = false) {
    const state = bindings.get(card)
    if (state?.frame) cancelAnimationFrame(state.frame)
    if (state) state.frame = 0
    card.classList.remove('is-tilting')
    const targets = [card, ...card.querySelectorAll(LAYER_SELECTOR)]
    if (immediate || reducedMedia?.matches) gsap.set(targets, { clearProps: 'transform,willChange' })
    else gsap.to(targets, { x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.48, ease: 'power3.out', overwrite: true, clearProps: 'transform,willChange' })
    card.style.removeProperty('--tilt-shadow-x')
    card.style.removeProperty('--tilt-shadow-y')
  }

  function bindCard(card) {
    if (bindings.has(card)) return
    const state = { frame: 0, event: null }
    const onMove = (event) => {
      state.event = event
      if (state.frame) return
      state.frame = requestAnimationFrame(() => {
        state.frame = 0
        const bounds = card.getBoundingClientRect()
        if (!bounds.width || !bounds.height) return
        const x = Math.max(-0.5, Math.min(0.5, (state.event.clientX - bounds.left) / bounds.width - 0.5))
        const y = Math.max(-0.5, Math.min(0.5, (state.event.clientY - bounds.top) / bounds.height - 0.5))
        const rotateX = y * maximum * -2
        const rotateY = x * maximum * 2
        card.classList.add('is-tilting')
        card.style.setProperty('--tilt-shadow-x', `${(-rotateY * 0.7).toFixed(2)}px`)
        card.style.setProperty('--tilt-shadow-y', `${(rotateX * 0.7 + 10).toFixed(2)}px`)
        gsap.to(card, { rotateX, rotateY, y: -4, duration: 0.22, ease: 'power2.out', overwrite: true, transformPerspective: 900 })
        card.querySelectorAll(LAYER_SELECTOR).forEach((layer) => {
          const depth = Math.min(Math.max(Number(layer.dataset.tiltLayer) || 1, 0.5), 2)
          gsap.to(layer, { x: x * 5 * depth, y: y * 4 * depth, duration: 0.28, ease: 'power2.out', overwrite: true })
        })
      })
    }
    const onLeave = () => resetCard(card)
    card.addEventListener('pointermove', onMove, { passive: true })
    card.addEventListener('pointerleave', onLeave, { passive: true })
    state.onMove = onMove
    state.onLeave = onLeave
    bindings.set(card, state)
  }

  function unbindTiltCards() {
    bindings.forEach((state, card) => {
      if (state.frame) cancelAnimationFrame(state.frame)
      card.removeEventListener('pointermove', state.onMove)
      card.removeEventListener('pointerleave', state.onLeave)
      gsap.killTweensOf([card, ...card.querySelectorAll(LAYER_SELECTOR)])
      resetCard(card, true)
    })
    bindings.clear()
  }

  function bindTiltCards(target = '[data-tilt-card]') {
    lastTarget = target
    unbindTiltCards()
    if (!canAnimate()) return []
    const cards = resolveCards(root, target)
    cards.forEach(bindCard)
    return cards
  }

  const unregister = registerMotionController({ disable: unbindTiltCards, enable: () => bindTiltCards(lastTarget) })
  onBeforeUnmount(() => { unbindTiltCards(); unregister() })
  return { bindTiltCards, unbindTiltCards, cleanup: unbindTiltCards, prefersReducedMotion: () => Boolean(reducedMedia?.matches) }
}
