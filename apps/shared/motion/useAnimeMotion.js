import { onBeforeUnmount } from 'vue'
import { animate } from 'animejs'
import { isMotionEnabled, registerMotionController } from './runtime.js'

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function allowsRichMotion() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/' || Boolean(document.querySelector('.hero'))
}

function targetsOf(target, limit = 20) {
  if (!target) return []
  if (typeof target === 'string') return [...document.querySelectorAll(target)].slice(0, limit)
  if (target instanceof Element) return [target]
  return [...target].filter(Boolean).slice(0, limit)
}

// Anime.js owns short micro-interactions only; structural motion stays in GSAP.
export function useAnimeMotion() {
  const instances = new Map()

  function run(key, target, parameters) {
    const targets = targetsOf(target)
    if (!targets.length || reduced() || !allowsRichMotion()) return null
    instances.get(key)?.cancel?.()
    const instance = animate(targets, parameters)
    instances.set(key, instance)
    return instance
  }

  const popLike = (target, countTarget) => {
    run('like', target, { scale: [1, 1.08, 1], opacity: [1, 0.88, 1], duration: 240, ease: 'out(3)' })
    return run('like-count', countTarget, { translateY: [0, -3, 0], opacity: [1, 0.9, 1], duration: 220, ease: 'out(3)' })
  }
  const bounceCart = (target) => run('cart', target, { translateY: [0, -3, 0], scale: [1, 1.06, 1], duration: 240, ease: 'out(3)' })
  const successCheck = (target) => run('success', target, { opacity: [0.65, 1], scale: [0.92, 1.04, 1], duration: 260, ease: 'out(3)' })
  const wiggleIcon = (target) => run(`wiggle:${targetsOf(target)[0]?.className || 'icon'}`, target, { opacity: [1, 0.78, 1], duration: 220, ease: 'inOut(2)' })
  const pulseBadge = (target) => run('badge', target, { scale: [1, 1.04, 1], opacity: [1, 0.88, 1], duration: 220, ease: 'out(3)' })
  const floatEmpty = (target) => run('empty', target, { opacity: [0.8, 1], duration: 200, ease: 'inOutSine' })
  const pulseSeat = (target) => run('seat', target, { scale: [1, 1.05, 1], duration: 220, ease: 'out(3)' })
  const shakeError = (target) => run('error', target, { opacity: [1, 0.72, 1], duration: 200, ease: 'inOut(2)' })
  const flashRow = (target) => run('row', target, { opacity: [1, 0.78, 1], duration: 220, ease: 'out(3)' })

  function cleanup() {
    instances.forEach((instance) => { instance.revert?.(); instance.cancel?.() })
    instances.clear()
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { popLike, bounceCart, successCheck, wiggleIcon, pulseBadge, floatEmpty, pulseSeat, shakeError, flashRow, cleanup, prefersReducedMotion: reduced }
}
