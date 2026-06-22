import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isMotionEnabled, registerMotionController } from './runtime.js'

gsap.registerPlugin(ScrollTrigger)

const MAX_ITEMS = 20
const MOTION = Object.freeze({
  duration: 0.56,
  durationFast: 0.38,
  stagger: 0.065,
  staggerList: 0.045,
  distance: 22,
  ease: 'power3.out',
})

function prefersReducedMotion() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function scopeOf(root) {
  return root?.value || root || (typeof document !== 'undefined' ? document : null)
}

function resolveTargets(root, target, limit = MAX_ITEMS) {
  const scope = scopeOf(root)
  if (!scope || !target) return []
  if (typeof target === 'string') return [...scope.querySelectorAll(target)].slice(0, limit)
  if (target instanceof Element) return [target]
  return [...target].filter(Boolean).slice(0, limit)
}

// GSAP owns structural motion: page, section, list and complex overlay transitions.
export function useGsapReveal(root = null) {
  let context = null
  let contextScope = null
  const animations = new Set()
  const keyed = new Map()
  const disposers = new Set()

  function ensureContext() {
    const scope = scopeOf(root)
    if (!scope) return null
    if (context && contextScope === scope) return context
    context?.revert()
    contextScope = scope
    context = gsap.context(() => {}, scope)
    return context
  }

  function inContext(factory) {
    const activeContext = ensureContext()
    let result = null
    if (activeContext) activeContext.add(() => { result = factory() })
    else result = factory()
    return result
  }

  function disposeAnimation(animation) {
    animation?.scrollTrigger?.kill()
    animation?.kill?.()
    animations.delete(animation)
  }

  function track(animation, key) {
    if (!animation) return animation
    if (key && keyed.has(key)) disposeAnimation(keyed.get(key))
    animations.add(animation)
    if (key) keyed.set(key, animation)
    return animation
  }

  function finish(targets) {
    // Preserve component-owned transforms such as absolute seat positioning.
    gsap.set(targets, { clearProps: 'transform,opacity,visibility' })
  }

  function reveal(target, options = {}) {
    const targets = resolveTargets(root, target, options.limit ?? MAX_ITEMS)
    if (!targets.length) return null
    if (prefersReducedMotion()) return finish(targets)
    return track(inContext(() => gsap.fromTo(targets,
      { opacity: 0, y: options.y ?? MOTION.distance },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? MOTION.duration,
        stagger: options.stagger ?? MOTION.stagger,
        ease: MOTION.ease,
        clearProps: 'transform,opacity',
      },
    )), options.key || `reveal:${String(target)}`)
  }

  const revealPage = (target = ':scope > *', options = {}) => reveal(target, {
    key: 'page', y: 16, duration: 0.48, stagger: 0.04, ...options,
  })
  const revealSection = (target, options = {}) => reveal(target, {
    key: options.key || `section:${String(target)}`, y: 26, duration: 0.64, stagger: 0, ...options,
  })
  const revealCards = (target, options = {}) => reveal(target, {
    key: options.key || `cards:${String(target)}`, ...options,
  })
  const revealList = (target, options = {}) => reveal(target, {
    key: options.key || `list:${String(target)}`, stagger: MOTION.staggerList, ...options,
  })

  function revealOnScroll(target, options = {}) {
    const targets = resolveTargets(root, target, options.limit ?? MAX_ITEMS)
    if (!targets.length) return []
    if (prefersReducedMotion()) {
      finish(targets)
      return []
    }
    return targets.map((element, index) => track(inContext(() => gsap.fromTo(element,
      { opacity: 0, y: options.y ?? 28 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.64,
        delay: Math.min(index, 4) * 0.025,
        ease: MOTION.ease,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      },
    )), `scroll:${index}:${String(target)}`))
  }

  function slideStep(target, direction = 1) {
    const targets = resolveTargets(root, target, 1)
    if (!targets.length) return null
    if (prefersReducedMotion()) return finish(targets)
    return track(inContext(() => gsap.fromTo(targets, { opacity: 0, x: 34 * direction }, {
      opacity: 1, x: 0, duration: 0.45, ease: MOTION.ease, clearProps: 'transform,opacity',
    })), 'step')
  }

  const revealSeatMap = (target, options = {}) => reveal(target, {
    key: 'seats', y: 14, duration: 0.42, stagger: 0.035, limit: MAX_ITEMS, ...options,
  })
  const revealTab = (target, options = {}) => reveal(target, {
    key: 'tab', y: 12, duration: MOTION.durationFast, stagger: 0.035, ...options,
  })

  function zoomIn(target) {
    const targets = resolveTargets(root, target, 1)
    if (!targets.length) return null
    if (prefersReducedMotion()) return finish(targets)
    return track(inContext(() => gsap.fromTo(targets, { opacity: 0, scale: 0.94 }, {
      opacity: 1, scale: 1, duration: 0.42, ease: MOTION.ease, clearProps: 'transform,opacity',
    })), 'zoom')
  }

  function animateProgress(target, options = {}) {
    const targets = resolveTargets(root, target)
    if (!targets.length) return null
    if (prefersReducedMotion()) return finish(targets)
    const horizontal = options.axis === 'x'
    const property = horizontal ? 'scaleX' : 'scaleY'
    return track(inContext(() => gsap.fromTo(targets,
      { [property]: 0, transformOrigin: horizontal ? 'left' : 'bottom' },
      { [property]: 1, duration: 0.72, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' },
    )), `progress:${String(target)}`)
  }

  function revealModal(element, done, leaving = false) {
    if (!element || prefersReducedMotion()) {
      if (element) finish([element, element.querySelector('.base-modal__dialog')].filter(Boolean))
      done?.()
      return null
    }
    const dialog = element.querySelector('.base-modal__dialog')
    return track(inContext(() => {
      const timeline = gsap.timeline({ onComplete: done })
      if (leaving) timeline.to(dialog, { opacity: 0, scale: 0.96, y: 8, duration: 0.18 }).to(element, { opacity: 0, duration: 0.16 }, '<')
      else timeline.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.2 }).fromTo(dialog, { opacity: 0, scale: 0.96, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.34, ease: MOTION.ease }, '<')
      return timeline
    }), 'modal')
  }

  function revealDrawer(element, done, leaving = false, side = 'right') {
    if (!element || prefersReducedMotion()) {
      if (element) finish([element, element.querySelector('.base-drawer__panel')].filter(Boolean))
      done?.()
      return null
    }
    const panel = element.querySelector('.base-drawer__panel')
    const offset = side === 'left' ? -42 : 42
    return track(inContext(() => {
      const timeline = gsap.timeline({ onComplete: done })
      if (leaving) timeline.to(panel, { opacity: 0, x: offset, duration: 0.22 }).to(element, { opacity: 0, duration: 0.18 }, '<')
      else timeline.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.2 }).fromTo(panel, { opacity: 0, x: offset }, { opacity: 1, x: 0, duration: 0.38, ease: MOTION.ease }, '<')
      return timeline
    }), 'drawer')
  }

  function floatVisual(target) {
    const targets = resolveTargets(root, target, 1)
    if (!targets.length || prefersReducedMotion()) return null
    return track(inContext(() => gsap.to(targets, { y: -7, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })), 'float')
  }

  function bindParallax(surface, target) {
    const host = resolveTargets(root, surface, 1)[0]
    const visual = resolveTargets(root, target, 1)[0]
    if (!host || !visual || prefersReducedMotion()) return () => {}
    let frame = 0
    let pendingEvent = null
    const update = () => {
      frame = 0
      const event = pendingEvent
      const bounds = host.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width - 0.5
      const y = (event.clientY - bounds.top) / bounds.height - 0.5
      gsap.to(visual, { x: x * 18, y: y * 12, rotateX: y * -3, rotateY: x * 4, duration: 0.45, overwrite: true, ease: 'power2.out' })
    }
    const move = (event) => {
      pendingEvent = event
      if (!frame) frame = requestAnimationFrame(update)
    }
    const reset = () => gsap.to(visual, { x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.5, overwrite: true })
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', reset)
    const dispose = () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', reset)
      if (frame) cancelAnimationFrame(frame)
      gsap.killTweensOf(visual)
    }
    disposers.add(dispose)
    return dispose
  }

  function cleanup() {
    animations.forEach(disposeAnimation)
    animations.clear()
    keyed.clear()
    disposers.forEach((dispose) => dispose())
    disposers.clear()
    context?.revert()
    context = null
    contextScope = null
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return {
    revealPage, revealSection, revealCards, revealList, revealModal, revealDrawer, revealSeatMap,
    revealOnScroll, revealTab, slideStep, zoomIn, animateProgress,
    animateModal: revealModal, animateDrawer: revealDrawer,
    floatVisual, bindParallax, cleanup, prefersReducedMotion,
  }
}
