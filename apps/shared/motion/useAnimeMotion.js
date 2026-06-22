import { onBeforeUnmount } from 'vue'
import { animate } from 'animejs'
import { isMotionEnabled, registerMotionController } from './runtime.js'

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
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
    if (!targets.length || reduced()) return null
    instances.get(key)?.cancel?.()
    const instance = animate(targets, parameters)
    instances.set(key, instance)
    return instance
  }

  const popLike = (target, countTarget) => {
    run('like', target, { scale: [1, 1.32, 1], rotate: [0, -7, 0], duration: 480, ease: 'out(4)' })
    return run('like-count', countTarget, { translateY: [0, -6, 0], scale: [1, 1.12, 1], duration: 420, ease: 'out(3)' })
  }
  const bounceCart = (target) => run('cart', target, { translateY: [0, -7, 0], scale: [1, 1.16, 1], duration: 520, ease: 'out(4)' })
  const successCheck = (target) => run('success', target, { opacity: [0.45, 1], scale: [0.55, 1.18, 1], rotate: [-18, 0], duration: 600, ease: 'out(4)' })
  const wiggleIcon = (target) => run(`wiggle:${targetsOf(target)[0]?.className || 'icon'}`, target, { rotate: [0, -8, 8, -4, 0], duration: 520, ease: 'inOut(2)' })
  const pulseBadge = (target) => run('badge', target, { scale: [1, 1.09, 1], opacity: [1, 0.82, 1], duration: 540, ease: 'out(3)' })
  const floatEmpty = (target) => run('empty', target, { translateY: [0, -7, 0], duration: 600, ease: 'inOutSine' })
  const pulseSeat = (target) => run('seat', target, { scale: [1, 1.14, 1], duration: 460, ease: 'out(4)' })
  const shakeError = (target) => run('error', target, { translateX: [0, -6, 6, -4, 4, 0], duration: 460, ease: 'inOut(2)' })
  const flashRow = (target) => run('row', target, { opacity: [1, 0.58, 1], translateX: [0, 3, 0], duration: 600, ease: 'out(3)' })

  function cleanup() {
    instances.forEach((instance) => { instance.revert?.(); instance.cancel?.() })
    instances.clear()
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { popLike, bounceCart, successCheck, wiggleIcon, pulseBadge, floatEmpty, pulseSeat, shakeError, flashRow, cleanup, prefersReducedMotion: reduced }
}
