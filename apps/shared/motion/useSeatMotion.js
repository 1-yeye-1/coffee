import { onBeforeUnmount } from 'vue'
import { animate } from 'animejs'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

const MAX_SEATS = 20

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function scopeOf(root) {
  return root?.value || root || document
}

function targetsOf(root, target, limit = MAX_SEATS) {
  const scope = scopeOf(root)
  if (!target) return []
  if (typeof target === 'string') return typeof scope?.querySelectorAll === 'function' ? [...scope.querySelectorAll(target)].slice(0, limit) : []
  if (target instanceof Element) return [target]
  return typeof target?.[Symbol.iterator] === 'function' ? [...target].filter(Boolean).slice(0, limit) : []
}

export function useSeatMotion(root = null) {
  let context = null
  const animations = new Set()
  const animeInstances = new Set()
  const temporaryNodes = new Set()
  const timers = new Set()

  function ctx() {
    if (!context) context = gsap.context(() => {}, scopeOf(root))
    return context
  }

  function run(factory) {
    let instance
    ctx().add(() => { instance = factory() })
    if (instance) animations.add(instance)
    return instance
  }

  function revealSeatMap(target = '.map-seat') {
    const seats = targetsOf(root, target)
    if (!seats.length || reduced()) return null
    const contents = seats.map((seat) => seat.querySelector('.map-seat__content')).filter(Boolean)
    return run(() => gsap.timeline()
      .fromTo(seats, { opacity: 0 }, { opacity: 1, duration: 0.42, stagger: 0.035, ease: 'power3.out', clearProps: 'opacity' })
      .fromTo(contents, { scale: 0.88 }, { scale: 1, duration: 0.34, stagger: 0.035, ease: 'power3.out', clearProps: 'transform' }, 0))
  }

  function revealProgress(targets) {
    const elements = targetsOf(root, targets, 6)
    if (!elements.length || reduced()) return null
    return run(() => gsap.timeline().fromTo(elements, { opacity: 0, x: 24 }, {
      opacity: 1, x: 0, duration: 0.46, stagger: 0.06, ease: 'power3.out', clearProps: 'opacity,transform',
    }))
  }

  function showTooltip(target) {
    const element = targetsOf(root, target, 1)[0]
    if (!element) return null
    if (reduced()) {
      gsap.set(element, { opacity: 1 })
      return null
    }
    return run(() => gsap.fromTo(element, { opacity: 0, y: 8 }, {
      opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', overwrite: true,
    }))
  }

  function hideTooltip(target) {
    const element = targetsOf(root, target, 1)[0]
    if (!element) return null
    if (reduced()) {
      gsap.set(element, { opacity: 0 })
      return null
    }
    return run(() => gsap.to(element, { opacity: 0, y: 5, duration: 0.16, ease: 'power1.in', overwrite: true }))
  }

  function focusSeat(selected, allSeats) {
    const selectedElement = targetsOf(root, selected, 1)[0]
    const seats = targetsOf(root, allSeats)
    if (!selectedElement || !seats.length) return null
    if (reduced()) {
      seats.forEach((seat) => { seat.style.opacity = seat === selectedElement ? '1' : '.68' })
      return null
    }
    run(() => gsap.to(seats.filter((seat) => seat !== selectedElement), { opacity: 0.58, duration: 0.3, ease: 'power2.out', overwrite: true }))
    return run(() => gsap.fromTo(selectedElement.querySelector('.map-seat__content') || selectedElement, { scale: 1 }, {
      scale: 1.12, duration: 0.18, repeat: 1, yoyo: true, ease: 'power2.out', overwrite: true, clearProps: 'scale',
    }))
  }

  function clearSeatFocus(allSeats) {
    const seats = targetsOf(root, allSeats)
    if (!seats.length) return null
    return run(() => gsap.to(seats, { opacity: 1, duration: reduced() ? 0 : 0.24, clearProps: 'opacity', overwrite: true }))
  }

  function pulseSeat(target) {
    const element = targetsOf(root, target, 1)[0]
    if (!element || reduced()) return null
    const ring = document.createElement('span')
    ring.className = 'seat-motion-ring'
    ring.setAttribute('aria-hidden', 'true')
    element.appendChild(ring)
    temporaryNodes.add(ring)
    const instance = animate(ring, { scale: [0.65, 1.55], opacity: [0.9, 0], duration: 460, ease: 'out(3)' })
    animeInstances.add(instance)
    const timer = window.setTimeout(() => {
      ring.remove()
      temporaryNodes.delete(ring)
      animeInstances.delete(instance)
      timers.delete(timer)
    }, 520)
    timers.add(timer)
    return instance
  }

  function showReservationCard(target) {
    const element = targetsOf(root, target, 1)[0]
    if (!element) return null
    if (reduced()) {
      gsap.set(element, { opacity: 1, scale: 1 })
      return null
    }
    return run(() => gsap.fromTo(element, { opacity: 0, scale: 0.97, y: 16 }, {
      opacity: 1, scale: 1, y: 0, duration: 0.56, ease: 'power3.out', clearProps: 'transform,opacity',
    }))
  }

  function cleanup() {
    animations.forEach((animation) => animation?.kill?.())
    animeInstances.forEach((instance) => { instance?.revert?.(); instance?.cancel?.() })
    temporaryNodes.forEach((node) => node.remove())
    timers.forEach((timer) => window.clearTimeout(timer))
    animations.clear()
    animeInstances.clear()
    temporaryNodes.clear()
    timers.clear()
    context?.revert()
    context = null
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { revealSeatMap, revealProgress, showTooltip, hideTooltip, focusSeat, clearSeatFocus, pulseSeat, showReservationCard, cleanup, prefersReducedMotion: reduced }
}
